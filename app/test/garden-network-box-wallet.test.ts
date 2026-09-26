import {it,expect,vi} from 'vitest';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const mock=vi.hoisted(()=>({dir:'',request:vi.fn()}));
vi.mock('electron',()=>({app:{getPath:()=>mock.dir},BrowserWindow:{getAllWindows:()=>[]}}));
vi.mock('../src/main/windows',()=>({sendToWindows:vi.fn()}));
vi.mock('../src/main/rooms/rooms',()=>({gardenRealm:()=> 'loopback/A',gardenRequest:(p:unknown)=>mock.request(p)}));
it('desktop openBox debits the real persisted wallet and recovers delivery through garden refresh after restart',async()=>{
 mock.dir=await mkdtemp(path.join(os.tmpdir(),'qbot-box-wallet-'));
 try{
  await writeFile(path.join(mock.dir,'config.json'),JSON.stringify({gardenOnline:true}));
  const {emptyProgress}=await import('../src/main/progress-rules');
  await writeFile(path.join(mock.dir,'progress.json'),JSON.stringify({...emptyProgress(),welcomeGrantVersion:1,points:1000,boxes:2}));
  // @ts-expect-error Standalone server module.
  const {Gardens}=await import('../../rooms/garden.mjs');
  const db=new Gardens(path.join(mock.dir,'server.json'),{people:{A:{nickname:'A'}},areFriends:()=>false});let lost=false;
  mock.request.mockImplementation(async p=>{const r=db.handle('A',p);if(p.action==='box:commit'&&!lost){lost=true;throw Error('lost reply');}return r;});
  let progress=await import('../src/main/progress');
  expect((await progress.openBox()).ok).toBe(false);
  let wallet=JSON.parse(await readFile(path.join(mock.dir,'progress.json'),'utf8'));
  expect(wallet.points).toBe(500);expect(wallet.boxes).toBe(1);expect(wallet.boxesOpened).toBe(1);
  const rewardCount=db.data.people.A.state.seeds.length;
  await progress.flushProgress(true);vi.resetModules();
  const service=await import('../src/main/garden/service');expect((await service.getGarden()).online).toBe(true);
  progress=await import('../src/main/progress');await progress.flushProgress(true);
  wallet=JSON.parse(await readFile(path.join(mock.dir,'progress.json'),'utf8'));
  expect(wallet.points).toBe(500);expect(wallet.boxesOpened).toBe(1);expect(db.data.people.A.state.seeds.length).toBe(rewardCount);
  const second=await progress.openBox();expect(second.ok).toBe(true);
  if(second.ok){expect(second.progress.points).toBe(0);expect(second.progress.boxes).toBe(0);expect(second.gardenItems?.length).toBe(2);}
  expect((await progress.openBox()).ok).toBe(false);
  await expect(readFile(path.join(mock.dir,'garden-demo.json'))).rejects.toMatchObject({code:'ENOENT'});
  await progress.flushProgress(true);
 }finally{await rm(mock.dir,{recursive:true,force:true});}
});
