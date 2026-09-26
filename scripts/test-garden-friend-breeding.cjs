const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto');
const core=require('../rooms/generated/garden-core.cjs');
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'qbot-friend-breeding-'));
 try{
  const {Gardens}=await import('../rooms/garden.mjs');let now=Date.now(),friends=true;
  const contacts={people:{A:{nickname:'甲'},B:{nickname:'乙'},C:{nickname:'丙'}},areFriends:(a,b)=>friends&&a!==b&&a!=='C'&&b!=='C'};
  let db=new Gardens(path.join(dir,'garden.json'),contacts,()=>now,{random:()=>0,id:randomUUID});
  const act=(who,command,operation=`${now}-${randomUUID()}`)=>db.handle(who,{action:'act',command,operation});
  for(const id of ['A','B','C'])db.handle(id,{action:'get'});
  const crop=(id,traits=['golden'])=>({id,species:'carrot',traits,kg:.2,value:100,bred:false,growthVersion:2,revealed:true,readyAt:now-1,plantedAt:now-100000,fertilizers:[]});
  const setup=()=>{db.data.people.A.state.plots[0]=crop(randomUUID());db.data.people.B.state.produce=[crop(randomUUID())];};
  const request=()=>({type:'friendBreedRequest',owner:'A',plant:db.data.people.A.state.plots[0].id,parent:db.data.people.B.state.produce[0].id,oil:'normal'});
  const pending=who=>db.handle(who,{action:'get'}).state.friendBreeding;
  setup();const a0=structuredClone(db.data.people.A.state),b0=structuredClone(db.data.people.B.state),cmd=request(),op=`${now}-${randomUUID()}`;
  act('B',cmd,op);act('B',cmd,op);assert.equal(pending('A').length,1);assert.equal(pending('B').length,1);assert.equal(pending('C').length,0);
  assert.equal(db.data.people.B.state.v3.oils.normal,b0.v3.oils.normal);assert.equal(db.data.people.A.state.plots[0].bred,false);
  let r=pending('A')[0];assert.throws(()=>act('C',{type:'friendBreedAnswer',request:r.id,accept:true}),/只能回应/);
  // Reload pending request, accept once and replay after reload without duplicating either reward.
  db=new Gardens(path.join(dir,'garden.json'),contacts,()=>now,{random:()=>0,id:randomUUID});
  const accept={type:'friendBreedAnswer',request:r.id,accept:true},receipt=`${now}-${randomUUID()}`;act('A',accept,receipt);
  let a=db.data.people.A.state,b=db.data.people.B.state;
  assert.equal(a.seeds.length,a0.seeds.length+1);assert.equal(b.seeds.length,b0.seeds.length+1);assert.equal(a.plots[0].bred,true);assert.equal(b.produce[0].bred,true);
  assert.equal(a.v3.oils.normal,a0.v3.oils.normal);assert.equal(b.v3.oils.normal,b0.v3.oils.normal-1);assert.equal(a.v3.breeds,1);assert.equal(b.v3.breeds,1);
  assert.deepEqual(a.seeds.at(-1).genes,b.seeds.at(-1).genes);assert.notEqual(a.seeds.at(-1).id,b.seeds.at(-1).id);
  core.validateGarden(a);core.validateGarden(b);const savedA=JSON.parse(JSON.stringify(a)),savedB=JSON.parse(JSON.stringify(b));
  db=new Gardens(path.join(dir,'garden.json'),contacts,()=>now);act('A',accept,receipt);assert.deepEqual(db.data.people.A.state,savedA);assert.deepEqual(db.data.people.B.state,savedB);
  // Revoked friendship, exhausted/changed parents, missing oil and privacy are rechecked at acceptance.
  setup();act('B',request());r=pending('A')[0];friends=false;assert.throws(()=>act('A',{type:'friendBreedAnswer',request:r.id,accept:true}),/好友/);friends=true;
  db.data.people.A.state.plots[0].bred=true;assert.throws(()=>act('A',{type:'friendBreedAnswer',request:r.id,accept:true}),/繁育次数/);db.data.people.A.state.plots[0].bred=false;
  db.data.people.A.state.plots[0].traits=['obsidian'];assert.throws(()=>act('A',{type:'friendBreedAnswer',request:r.id,accept:true}),/发生变化/);db.data.people.A.state.plots[0].traits=['golden'];
  db.data.people.B.state.v3.oils.normal=0;assert.throws(()=>act('A',{type:'friendBreedAnswer',request:r.id,accept:true}),/精油/);db.data.people.B.state.v3.oils.normal=2;
  db.data.people.A.state.life.visibility='private';assert.throws(()=>act('A',{type:'friendBreedAnswer',request:r.id,accept:true}),/土地/);db.data.people.A.state.life.visibility='friends';
  act('A',{type:'friendBreedAnswer',request:r.id,accept:false});assert.equal(pending('A').length,0);
  act('B',request());r=pending('A')[0];act('B',{type:'friendBreedCancel',request:r.id});assert.equal(pending('A').length,0);
  act('B',request());r=pending('A')[0];now+=86400001;assert.equal(pending('A').length,0);assert.throws(()=>act('A',{type:'friendBreedAnswer',request:r.id,accept:true}),/过期/);
  setup();db.data.people.A.state.plots[0].traits=['sugar'];assert.throws(()=>act('B',request()),/金色/);
  setup();db.data.people.A.state.plots[0].readyAt=now+10000;assert.throws(()=>act('B',request()),/金色/);
  setup();db.data.people.A.state.plots[0].locked=true;assert.throws(()=>act('B',request()),/金色/);
  setup();db.data.people.B.state.produce[0].traits=['golden','mini'];assert.throws(()=>act('B',request()),/非迷你/);
  setup();db.data.people.A.state.v3.breeds=90;assert.throws(()=>act('B',request()),/本周/);db.data.people.A.state.v3.breeds=0;
  // Helpers need no sunflower binding or invite. Both seed branches preserve the revealed species.
  const fruit=crop('reveal',['rainbow','moon']);fruit.revealed=false;db.data.people.A.state.plots[0]=fruit;
  const coop=(command,task)=>db.handle('B',{action:'coop',owner:'A',plot:0,command,task});coop('join');for(let i=0;i<19;i++){now+=10000;coop('join');}
  assert.equal(db.data.tasks.reveal.done,true);assert.deepEqual(db.data.people.B.state.v3.sunPartners,[]);
  db.rng={random:()=>0,id:randomUUID};const before=db.data.people.B.state.seeds.length;coop('claim');let seed=db.data.people.B.state.seeds.at(-1);assert.equal(seed.species,'carrot');assert.deepEqual(seed.genes,['rainbow']);
  coop('claim');assert.equal(db.data.people.B.state.seeds.length,before+1);
  seed=core.cultivationSeed({...fruit,revealed:true},1,{random:()=>.99,id:randomUUID});assert.equal(seed.species,'carrot');assert.deepEqual(seed.genes,[]);
  const refresh={type:'companionGardenRefresh',owner:'A'};
  assert.throws(()=>act('B',refresh),/只能刷新/);
  contacts.people.A.companion=true;friends=false;assert.throws(()=>act('B',refresh),/只能刷新/);friends=true;
  const beforeRefresh=structuredClone(db.data.people.B.state),refreshOp=`${now}-${randomUUID()}`;
  act('B',refresh,refreshOp);const fresh=structuredClone(db.data.people.A.state.plots);act('B',refresh,refreshOp);assert.deepEqual(db.data.people.A.state.plots,fresh);
  assert.equal(core.fruitQuality(fresh[0].traits,fresh[0]),'gold');assert.ok(core.canBreed(fresh[0]));assert.ok(core.needsReveal(fresh[1]));assert.ok(fresh[0].keep&&fresh[1].keep);assert.deepEqual(db.data.people.B.state,beforeRefresh);core.validateGarden(db.data.people.A.state);
  assert.throws(()=>act('B',refresh),/10秒/);
  now+=10001;db.handle('B',{action:'coop',owner:'A',plot:1,command:'join'});const busyId=db.data.people.A.state.plots[1].id;
  act('B',refresh);assert.equal(db.data.people.A.state.plots[1].id,busyId,'refresh must preserve active collaboration');
  db.data.people.B.state.produce=[crop(randomUUID())];db.data.people.B.state.v3.oils.normal=2;
  const answer=act('B',request());assert.equal(answer.reveal.title,'陪伴好友同意了繁育');assert.equal(db.data.people.A.state.plots[0].bred,true);assert.equal(pending('B').length,0);
  console.log('PASS: friend breeding/rewards, companion-only refresh, guaranteed gold/mystery crops, cooldown/replay, active collaboration preserved and test request auto-accept');
 }finally{const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('qbot-friend-breeding-'));await fs.rm(resolved,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
