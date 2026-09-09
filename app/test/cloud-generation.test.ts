import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
const env=vi.hoisted(()=>({dir:'',png:Buffer.from('fixture-image')}));
vi.mock('electron',()=>({app:{getPath:()=>env.dir},nativeImage:{createFromPath:()=>({isEmpty:()=>false,getSize:()=>({width:64,height:64}),toPNG:()=>env.png})},webContents:{getAllWebContents:()=>[]}}));
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
let api:typeof import('../src/main/cloud-generation');let remoteId='';let completed=false;let malformed=false;let submissions=0;let loseReply=false;
const token='qbot-test-invite-with-sufficient-entropy';
const manifest={id:'generated',name:'未命名',actions:{idle:{status:'done',webm:'actions/idle.webm',gif:'actions/idle.gif'}}};
const files:Record<string,Buffer>={'source.png':env.png,'actions/idle.webm':Buffer.from('webm'),'manifest.json':Buffer.from(JSON.stringify(manifest))};
beforeEach(async()=>{
 vi.resetModules();vi.useFakeTimers();env.dir=await mkdtemp(path.join(os.tmpdir(),'qbot-cloud-client-'));remoteId='';completed=false;malformed=false;submissions=0;loseReply=false;
 vi.stubGlobal('fetch',vi.fn(async(input:string,init:RequestInit)=>{
  expect((init.headers as Record<string,string>).Authorization).toBe(`Bearer ${token}`);
  const url=new URL(input);const route=url.pathname.replace('/qbot-generation','');
  if(route==='/account')return Response.json({unlimited:true,credits:Number.MAX_SAFE_INTEGER,providers:['seedream']});
  if(route==='/jobs' && init.method==='GET')return Response.json({jobs:remoteId?[{id:remoteId,name:'恢复的小龙'}]:[]});
  if(route==='/jobs'){submissions++;remoteId=JSON.parse(init.body as string).id;if(loseReply){loseReply=false;throw new Error('fetch failed');}return Response.json({id:remoteId});}
  if(route.includes('/files/'))return new Response(new Uint8Array(files[route.split('/files/')[1]]));
  if(route.endsWith('/resume'))return Response.json({id:remoteId});
  return Response.json({id:remoteId,phase:completed?'done':'queued',queuePosition:1,state:{jobId:remoteId,stage:completed?'done':'turnaround',turnaround:{candidates:[],picked:null},actions:{}},files:malformed?[{path:'../../config.json',size:1,hash:'bad'}]:completed?Object.entries(files).map(([p,b])=>({path:p,size:b.length,hash:hash(b)})):[]});
 }));
 api=await import('../src/main/cloud-generation');
});
afterEach(async()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();await rm(env.dir,{recursive:true,force:true});});
async function start(){await api.cloudAccount(token);const src=path.join(env.dir,'source.png');await writeFile(src,env.png);return api.startCloudHatch(src,undefined,undefined,undefined,'我的小龙');}
describe('hosted desktop recovery',()=>{
 it('keeps bearer token outside character files and renders queued jobs without keys',async()=>{
  const id=await start();const status=await api.syncCloudJob(id);
  expect((await api.cloudAccount()).unlimited).toBe(true);
  expect(status.cloudPhase).toBe('queued');expect(status.queuePosition).toBe(1);
  const marker=await readFile(path.join(env.dir,'characters',id,'.cloud-job.json'),'utf8');expect(marker).not.toContain(token);
  if(process.platform!=='win32')expect((await stat(path.join(env.dir,'cloud-accounts.json'))).mode&0o777).toBe(0o600);
 });
 it('lost create response reconciles the same task without creating a duplicate task',async()=>{
  loseReply=true;const id=await start();await api.cloudOperation(id,'resume');
  expect(submissions).toBe(2); // Same UUID is re-submitted; service idempotency prevents duplicate generation.
  expect(remoteId).toBe(id);expect((await api.syncCloudJob(id)).running).toBe(true);
 });
 it('downloads and verifies assets before delivering the named character; repeat polls preserve edits',async()=>{
  const id=await start();completed=true;expect((await api.syncCloudJob(id)).stage).toBe('done');
  const file=path.join(env.dir,'characters',id,'manifest.json');const saved=JSON.parse(await readFile(file,'utf8'));expect(saved.name).toBe('我的小龙');
  saved.name='后来改的名字';await writeFile(file,JSON.stringify(saved));await api.syncCloudJob(id);
  expect(JSON.parse(await readFile(file,'utf8')).name).toBe('后来改的名字');
 });
 it('reconnecting the same invite restores owned jobs after local data loss',async()=>{
  const id=await start();vi.clearAllTimers();await rm(path.join(env.dir,'characters',id),{recursive:true});
  await api.cloudAccount(token);completed=true;await api.syncCloudJob(id);
  expect(JSON.parse(await readFile(path.join(env.dir,'characters',id,'manifest.json'),'utf8')).name).toBe('恢复的小龙');
 });
 it('explicitly deleted characters are not resurrected by account discovery',async()=>{
  const id=await start();await api.forgetCloudJob(id);await rm(path.join(env.dir,'characters',id),{recursive:true});
  await api.cloudAccount(token);await expect(stat(path.join(env.dir,'characters',id))).rejects.toThrow();
 });
 it('refuses server asset path traversal and leaves a recoverable error',async()=>{
  const id=await start();malformed=true;const result=await api.syncCloudJob(id);expect(result.error).toContain('资源格式无效');expect(result.running).toBe(false);
 });
});
