import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const mock=vi.hoisted(()=>({dir:'',realm:'server/A',owner:'A',points:1000,boxes:2,receipts:new Set<string>(),request:vi.fn(),failSave:false}));
vi.mock('electron',()=>({app:{getPath:()=>mock.dir},BrowserWindow:{getAllWindows:()=>[]}}));
vi.mock('../src/main/rooms/rooms',()=>({gardenRealm:()=>mock.realm,gardenRequest:(p:unknown)=>mock.request(p)}));
vi.mock('../src/main/progress',()=>({applyGardenTransaction:async(id:string,points:number,boxes:number)=>{
 if(mock.receipts.has(id))return true;
 if(mock.points+points<0||mock.boxes+boxes<0)return false;
 mock.points+=points;mock.boxes+=boxes;mock.receipts.add(id);return true;
}}));
vi.mock('node:fs/promises',async original=>{
 const real=await original<typeof import('node:fs/promises')>();
 return {...real,rename:async(a:string,b:string)=>{if(mock.failSave&&a.endsWith('garden-box-pending.json.tmp')){const p=JSON.parse(await real.readFile(a,'utf8'));if(p.phase==='commit'){mock.failSave=false;throw Error('disk full');}}return real.rename(a,b);}};
});
let db:any,contacts:any,clock:number;
beforeEach(async()=>{
 vi.resetModules();mock.request.mockReset();mock.dir=await mkdtemp(path.join(os.tmpdir(),'qbot-box-'));mock.realm='server/A';mock.owner='A';mock.points=1000;mock.boxes=2;mock.receipts.clear();mock.failSave=false;
 // @ts-expect-error The standalone room service is intentionally JavaScript.
 const {Gardens}=await import('../../rooms/garden.mjs');
 contacts={people:{A:{nickname:'A'},B:{nickname:'B'}},areFriends:()=>false};clock=Date.now();
 db=new Gardens(path.join(mock.dir,'server.json'),contacts,()=>clock);
 mock.request.mockImplementation(async p=>{try{return db.handle(mock.owner,p);}catch(e){return {ok:false,error:String(e)};}});
 db.handle('A',{action:'get'});
});
afterEach(async()=>{await rm(mock.dir,{recursive:true,force:true});});
const inventory=()=>({seeds:db.data.people.A.state.seeds.length,fertilizers:Object.values(db.data.people.A.state.fertilizers).reduce((a:any,b:any)=>a+b,0)});
describe('online box journal with real server transactions',()=>{
 it('charges exactly once and delivers only to the online inventory',async()=>{
  const before=inventory();const {onlineBox}=await import('../src/main/garden/network-box');const r=await onlineBox();
  expect(r?.ok).toBe(true);expect(mock.points).toBe(500);expect(mock.boxes).toBe(1);
  expect(inventory().seeds).toBeGreaterThan(before.seeds);expect(inventory().fertilizers).toBe(Number(before.fertilizers)+1);
  expect(await onlineBox(false)).toBeUndefined();expect(mock.receipts.size).toBe(1);
  expect(()=>db.handle('A',{action:'act',operation:`${clock}-00000000-0000-0000-0000-000000000000`,command:{type:'box'}})).toThrow('不支持');
 });
 it('does not debit unsupported servers or insufficient balances',async()=>{
  const real=mock.request.getMockImplementation()!;mock.request.mockImplementation(async p=>{const r=await real(p);delete r.boxProtocol;return r;});
  const {onlineBox}=await import('../src/main/garden/network-box');await expect(onlineBox()).rejects.toThrow('尚未更新');expect(mock.points).toBe(1000);
  mock.request.mockImplementation(real);mock.points=499;const before=inventory();expect((await onlineBox())?.ok).toBe(false);expect(inventory()).toEqual(before);expect(mock.boxes).toBe(2);
  expect(Object.values(db.data.people.A.boxReceipts).every((r:any)=>r.status==='cancelled')).toBe(true);
 });
 it.each(['box:prepare','box:commit'])('recovers a lost %s response across restart without duplicate spending or rewards',async action=>{
  const real=mock.request.getMockImplementation()!;let lost=false;
  mock.request.mockImplementation(async p=>{const r=await real(p);if(p.action===action&&!lost){lost=true;throw Error('timeout');}return r;});
  let api=await import('../src/main/garden/network-box');await expect(api.onlineBox()).rejects.toThrow('timeout');
  const pending=JSON.parse(await readFile(path.join(mock.dir,'garden-box-pending.json'),'utf8'));
  const paid=mock.receipts.size,after=inventory();clock+=8*86400000;
  db=new db.constructor(path.join(mock.dir,'server.json'),contacts,()=>clock);
  vi.resetModules();api=await import('../src/main/garden/network-box');expect((await api.onlineBox(false))?.ok).toBe(true);
  expect(mock.points).toBe(500);expect(mock.boxes).toBe(1);expect(mock.receipts.size).toBe(1);
  if(paid){expect(inventory().fertilizers).toBe(after.fertilizers);/* Daily safety seed may be added after eight days. */}
  expect(db.data.people.A.boxReceipts[pending.operation].status).toBe('committed');
 });
 it('reuses the wallet receipt when saving the paid phase fails',async()=>{
  const {onlineBox}=await import('../src/main/garden/network-box');mock.failSave=true;
  await expect(onlineBox()).rejects.toThrow('disk full');expect(mock.points).toBe(500);
  expect((await onlineBox())?.ok).toBe(true);expect(mock.points).toBe(500);expect(mock.receipts.size).toBe(1);
 });
 it('blocks account changes while retaining the original paid transaction',async()=>{
  const real=mock.request.getMockImplementation()!;mock.request.mockImplementation(async p=>{if(p.action==='box:commit')throw Error('offline');return real(p);});
  const {onlineBox}=await import('../src/main/garden/network-box');await expect(onlineBox()).rejects.toThrow('offline');
  mock.owner='B';mock.realm='server/B';await expect(onlineBox()).rejects.toThrow('原账号');expect(mock.points).toBe(500);
  mock.owner='A';mock.realm='server/A';mock.request.mockImplementation(real);expect((await onlineBox())?.ok).toBe(true);expect(mock.points).toBe(500);
 });
 it('retains a paid ticket when the server cannot save and grants once after recovery',async()=>{
  const real=mock.request.getMockImplementation()!,file=db.file;
  mock.request.mockImplementation(async p=>{if(p.action==='box:commit')db.file=mock.dir;try{return await real(p);}finally{db.file=file;}});
  const {onlineBox}=await import('../src/main/garden/network-box');const before=inventory();
  await expect(onlineBox()).rejects.toThrow('待领取');expect(mock.points).toBe(500);expect(inventory()).toEqual(before);
  mock.request.mockImplementation(real);expect((await onlineBox())?.ok).toBe(true);expect(mock.points).toBe(500);expect(mock.receipts.size).toBe(1);
 });
 it('serializes two clicks and refuses a third box when resources run out',async()=>{
  const {onlineBox}=await import('../src/main/garden/network-box');const results=await Promise.all([onlineBox(),onlineBox(),onlineBox()]);
  expect(results.map(r=>r?.ok)).toEqual([true,true,false]);expect(mock.points).toBe(0);expect(mock.boxes).toBe(0);expect(mock.receipts.size).toBe(2);
 });
 it('requires the owning account and valid ticket; rejects reuse of a cancelled ticket',()=>{
  const operation=`${clock}-00000000-0000-0000-0000-000000000001`,owner='A';
  const prepared=db.handle(owner,{action:'box:prepare',operation,owner});const before=inventory();
  expect(()=>db.handle('B',{action:'box:commit',operation,owner,token:prepared.token,payment:operation})).toThrow('账号');
  expect(()=>db.handle(owner,{action:'box:commit',operation,owner,token:'fake',payment:operation})).toThrow('凭据');
  db.handle(owner,{action:'box:cancel',operation,owner,token:prepared.token});
  expect(()=>db.handle(owner,{action:'box:commit',operation,owner,token:prepared.token,payment:operation})).toThrow('取消');expect(inventory()).toEqual(before);
 });
});
