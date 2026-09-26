import { test, mock, after } from 'node:test';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createGenerationService } from '../service.mjs';
import { atomicJson, digest } from '../store.mjs';

// These tiny mock jobs do not need the production 2 GiB disk reserve.
// Keep generation/routing tests independent of the developer machine's free space.
mock.method(fsPromises, 'statfs', async () => ({ bavail: 1024 ** 2, bsize: 4096 }));
syncBuiltinESMExports();
after(() => { mock.restoreAll(); syncBuiltinESMExports(); });

const token = 'test-invite-abcdefghijklmnopqrstuvwxyz';
const other = 'test-other-abcdefghijklmnopqrstuvwxyz';
const actions = ['idle','drag','sleep','tea','talk_happy','talk_annoyed','wave','stretch'];
function fakePipeline() {
  const wrap = (outDir, state) => ({ outDir, state, save: () => atomicJson(path.join(outDir,'.job/state.json'),state) });
  return {
    ACTION_IDS: [...actions, 'perch'],
    Job: {
      async create(outDir, opts) {
        await writeFile(path.join(outDir,'source.png'),await readFile(opts.refImagePath));
        const j=wrap(outDir,{ stage:'turnaround', persona:opts.persona, imageProvider:opts.imageProvider,turnaround:{candidates:[],picked:null},actions:Object.fromEntries(actions.map(x=>[x,{status:'pending'}])) });
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
test('authenticated, idempotent creation; unlimited invites including exhausted legacy accounts; restart and ownership; candidate and asset delivery',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qbot-cloud-'));let app;
 try{
  await atomicJson(path.join(dir,'registry.json'), {accounts:{[digest(token)]:{credits:0}},jobs:Object.fromEntries(Array.from({length:100},()=>{const id=randomUUID();return [id,{id,owner:digest(other),phase:'done'}];}))});
  const launch=async()=>{app=await createGenerationService({dataDir:dir,pipeline:fakePipeline(),config:{apiKey:'secret'},invites:[{token,credits:0},{token:other,credits:1}]});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${app.server.address().port}`;};
  let base=await launch();
  const request=(p,method='GET',data,t=token)=>fetch(base+p,{method,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  assert.equal((await request('/account','GET',null,'bad')).status,401);
  const id=randomUUID();const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(64,16);png.writeUInt32BE(64,20);
  const input={id,image:png.toString('base64'),characterForm:'humanoid',characterStyle:'chibi',persona:'冷淡寡言'};
  const responses=await Promise.all([request('/jobs','POST',input),request('/jobs','POST',input)]);
  assert.deepEqual(responses.map(r=>r.status),[202,202]);
  assert.equal((await request('/jobs','POST',{...input,persona:'活泼'})).status,409);
  assert.equal((await request('/jobs','POST',{...input,id:randomUUID(),persona:42})).status,400);
  assert.equal((await(await request('/account')).json()).unlimited,true);
  assert.ok((await(await request('/account')).json()).credits > 0);
  assert.equal((await request('/jobs','POST',{...input,id:randomUUID()})).status,202);
  const persisted=JSON.parse(await readFile(path.join(dir,'registry.json'),'utf8'));
  assert.equal(Object.keys(persisted.jobs).length,102);
  assert.equal(persisted.accounts[digest(token)].credits,0);
  assert.equal((await request(`/jobs/${id}`,'GET',null,other)).status,404);
  await until(async()=> (await(await request(`/jobs/${id}`)).json()).phase==='awaiting_pick');
  const snapshot=await(await request(`/jobs/${id}`)).json();assert.equal(snapshot.state.persona,'冷淡寡言');assert.ok(!JSON.stringify(snapshot).includes('secret'));
  assert.equal((await request(`/jobs/${id}/files/registry.json`)).status,404);
  assert.equal((await request(`/jobs/${id}/pick`,'POST',{index:3})).status,400);
  app.stop();base=await launch();
  assert.equal((await(await request('/account')).json()).unlimited,true);
  assert.ok((await(await request('/account')).json()).credits > 0);
  assert.equal((await request(`/jobs/${id}/pick`,'POST',{index:0,persona:'沉稳克制'})).status,202);
  await until(async()=> (await(await request(`/jobs/${id}`)).json()).phase==='done');
  assert.equal(await(await request(`/jobs/${id}/files/actions/idle.webm`)).text(),'video');
  assert.equal((await(await request(`/jobs/${id}`)).json()).state.persona,'沉稳克制');
  await request(`/jobs/${id}/resume`,'POST',{});
  assert.equal((await(await request(`/jobs/${id}`)).json()).attempts,1);
 }finally{app?.stop();await rm(dir,{recursive:true,force:true});}
});

test('candidate retries and failure retries exceed former limits; responses redact upstream secrets', async()=>{
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
  for(let i=0;i<5;i++){assert.equal((await request(`/jobs/${id}/pick`,'POST',{index:-1})).status,202);await phase('awaiting_pick');}
  await request(`/jobs/${id}/pick`,'POST',{index:0,persona:'沉稳克制'});await phase('failed');
  assert.ok(!(await(await request(`/jobs/${id}`)).text()).includes('secret-key-token'));
  for(let i=0;i<5;i++){const persona=i===0?'温柔慢热':'';assert.equal((await request(`/jobs/${id}/resume`,'POST',{persona})).status,202);await phase('failed');assert.equal((await(await request(`/jobs/${id}`)).json()).state.persona,persona);}
 }finally{app?.stop();await rm(dir,{recursive:true,force:true});}
});


test('merged perch is accepted by targeted cloud failure retry', async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qbot-perch-'));let app;
 try {
  const pipeline=fakePipeline();let selected;
  pipeline.runActions=async(j,_ark,_ff,_hooks,_limit,ids)=>{
   if(!ids){j.state.actions.perch={status:'failed'};await j.save();throw new Error('temporary generation failure');}
   selected=ids;j.state.actions.perch.status='done';await j.save();
  };
  app=await createGenerationService({dataDir:dir,pipeline,config:{},invites:[{token}]});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;
  const request=(p,method='GET',data)=>fetch(base+p,{method,headers:{Authorization:'Bearer '+token},body:data?JSON.stringify(data):undefined});
  const id=randomUUID(),png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(64,16);png.writeUInt32BE(64,20);
  assert.equal((await request('/jobs','POST',{id,image:png.toString('base64'),characterForm:'humanoid',characterStyle:'chibi'})).status,202);
  const phase=async expected=>until(async()=>(await(await request('/jobs/'+id)).json()).phase===expected);
  await phase('awaiting_pick');await request('/jobs/'+id+'/pick','POST',{index:0});await phase('failed');
  assert.equal((await request('/jobs/'+id+'/resume','POST',{actions:['perch']})).status,202);
  await phase('done');assert.deepEqual(selected,['perch']);
 }finally{app?.stop();await rm(dir,{recursive:true,force:true});}
});

test('old completed cloud jobs add only explicitly requested perch and reject regenerating completed clips', async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qbot-perch-add-'));let app;
 try {
  const pipeline=fakePipeline(), original=pipeline.runActions;const selections=[];
  pipeline.runActions=async(j,...args)=>{
   const ids=args[4];selections.push(ids);
   if(!ids)return original(j);
   assert.deepEqual(ids,['perch']);assert.ok(j.state.baseActionIds.includes('perch'));
   j.state.actions.perch.status='done';await j.save();
  };
  app=await createGenerationService({dataDir:dir,pipeline,config:{},invites:[{token}]});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;
  const request=(p,method='GET',data)=>fetch(base+p,{method,headers:{Authorization:'Bearer '+token},body:data?JSON.stringify(data):undefined});
  const id=randomUUID(),png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(64,16);png.writeUInt32BE(64,20);
  await request('/jobs','POST',{id,image:png.toString('base64'),characterForm:'humanoid',characterStyle:'chibi'});
  const phase=expected=>until(async()=>(await(await request('/jobs/'+id)).json()).phase===expected);
  await phase('awaiting_pick');await request('/jobs/'+id+'/pick','POST',{index:0});await phase('done');
  await request('/jobs/'+id+'/resume','POST',{});assert.equal(selections.length,1);
  assert.equal((await request('/jobs/'+id+'/resume','POST',{actions:['idle']})).status,400);
  assert.equal((await request('/jobs/'+id+'/resume','POST',{actions:['unknown']})).status,400);
  assert.equal((await request('/jobs/'+id+'/resume','POST',{actions:['perch']})).status,202);
  await phase('done');assert.deepEqual(selections,[undefined,['perch']]);
  assert.equal((await request('/jobs/'+id+'/resume','POST',{actions:['perch']})).status,400);
  const state=(await(await request('/jobs/'+id)).json()).state;
  assert.equal(state.actions.idle.status,'done');assert.equal(state.actions.perch.status,'done');
 }finally{app?.stop();await rm(dir,{recursive:true,force:true});}
});
