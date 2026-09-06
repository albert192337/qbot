import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createGenerationService } from '../service.mjs';
import { atomicJson } from '../store.mjs';

const token = 'test-invite-abcdefghijklmnopqrstuvwxyz';
const other = 'test-other-abcdefghijklmnopqrstuvwxyz';
const actions = ['idle','drag','sleep','tea','talk_happy','talk_annoyed','wave','stretch'];
function fakePipeline() {
  const wrap = (outDir, state) => ({ outDir, state, save: () => atomicJson(path.join(outDir,'.job/state.json'),state) });
  return {
    Job: {
      async create(outDir, opts) {
        await writeFile(path.join(outDir,'source.png'),await readFile(opts.refImagePath));
        const j=wrap(outDir,{ stage:'turnaround', imageProvider:opts.imageProvider,turnaround:{candidates:[],picked:null},actions:Object.fromEntries(actions.map(x=>[x,{status:'pending'}])) });
        await j.save(); return j;
      },
      async load(outDir) { return wrap(outDir, JSON.parse(await readFile(path.join(outDir,'.job/state.json'),'utf8'))); },
    },
    createArkClient: () => ({}),
    async runTurnaround(j) { await writeFile(path.join(j.outDir,'.job/turnaround_cand_0.png'),'preview');j.state.stage='awaiting_pick';j.state.turnaround.candidates=['turnaround_cand_0.png'];await j.save(); },
    async pickTurnaround(j, i) {j.state.turnaround.picked=i;await j.save();},
    async runActions(j) { j.state.stage='actions';await mkdir(path.join(j.outDir,'actions'),{recursive:true});for(const a of actions){j.state.actions[a].status='done';await writeFile(path.join(j.outDir,`actions/${a}.webm`),'video');}await j.save();},
    async runPackage(j){await writeFile(path.join(j.outDir,'manifest.json'),JSON.stringify({name:'generated'}));j.state.stage='done';await j.save();},
  };
}
async function until(fn) {for(let n=0;n<100;n++){if(await fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');}
test('authenticated, idempotent creation; bounded credits; restart and ownership; candidate and asset delivery',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qbot-cloud-'));let app;
 try{
  const launch=async()=>{app=await createGenerationService({dataDir:dir,pipeline:fakePipeline(),config:{apiKey:'secret'},invites:[{token,credits:1},{token:other,credits:1}]});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${app.server.address().port}`;};
  let base=await launch();
  const request=(p,method='GET',data,t=token)=>fetch(base+p,{method,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  assert.equal((await request('/account','GET',null,'bad')).status,401);
  const id=randomUUID();const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(64,16);png.writeUInt32BE(64,20);
  const input={id,image:png.toString('base64'),characterForm:'humanoid',characterStyle:'chibi'};
  const responses=await Promise.all([request('/jobs','POST',input),request('/jobs','POST',input)]);
  assert.deepEqual(responses.map(r=>r.status),[202,202]);
  assert.equal((await(await request('/account')).json()).credits,0);
  assert.equal((await request('/jobs','POST',{...input,id:randomUUID()})).status,402);
  assert.equal((await request(`/jobs/${id}`,'GET',null,other)).status,404);
  await until(async()=> (await(await request(`/jobs/${id}`)).json()).phase==='awaiting_pick');
  const snapshot=await(await request(`/jobs/${id}`)).json();assert.ok(!JSON.stringify(snapshot).includes('secret'));
  assert.equal((await request(`/jobs/${id}/files/registry.json`)).status,404);
  assert.equal((await request(`/jobs/${id}/pick`,'POST',{index:3})).status,400);
  app.stop();base=await launch();
  assert.equal((await(await request('/account')).json()).credits,0);
  assert.equal((await request(`/jobs/${id}/pick`,'POST',{index:0})).status,202);
  await until(async()=> (await(await request(`/jobs/${id}`)).json()).phase==='done');
  assert.equal(await(await request(`/jobs/${id}/files/actions/idle.webm`)).text(),'video');
  await request(`/jobs/${id}/resume`,'POST',{});
  assert.equal((await(await request(`/jobs/${id}`)).json()).attempts,1);
 }finally{app?.stop();await rm(dir,{recursive:true,force:true});}
});

test('candidate retries and failure retries are bounded; responses redact upstream secrets', async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qbot-budget-'));let app;
 try{
  const pipeline=fakePipeline();pipeline.runActions=async()=>{throw new Error('API key secret-key-token rejected 401');};
  app=await createGenerationService({dataDir:dir,pipeline,config:{apiKey:'secret-key-token'},invites:[{token,credits:1}]});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
  const request=(p,method='GET',data)=>fetch(base+p,{method,headers:{Authorization:`Bearer ${token}`},body:data?JSON.stringify(data):undefined});
  const id=randomUUID();const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(64,16);png.writeUInt32BE(64,20);
  assert.equal((await request('/jobs','POST',{id,image:png.toString('base64'),characterForm:'humanoid',characterStyle:'chibi',imageProvider:'bad'})).status,400);
  await request('/jobs','POST',{id,image:png.toString('base64'),characterForm:'humanoid',characterStyle:'chibi'});
  const phase=async expected=>until(async()=> (await(await request(`/jobs/${id}`)).json()).phase===expected);
  await phase('awaiting_pick');
  for(let i=0;i<2;i++){assert.equal((await request(`/jobs/${id}/pick`,'POST',{index:-1})).status,202);await phase('awaiting_pick');}
  assert.equal((await request(`/jobs/${id}/pick`,'POST',{index:-1})).status,402);
  await request(`/jobs/${id}/pick`,'POST',{index:0});await phase('failed');
  assert.ok(!(await(await request(`/jobs/${id}`)).text()).includes('secret-key-token'));
  for(let i=0;i<2;i++){assert.equal((await request(`/jobs/${id}/resume`,'POST',{})).status,202);await phase('failed');}
  assert.equal((await request(`/jobs/${id}/resume`,'POST',{})).status,402);
 }finally{app?.stop();await rm(dir,{recursive:true,force:true});}
});
