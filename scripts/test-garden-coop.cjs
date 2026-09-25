const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const core=require('../rooms/generated/garden-core.cjs');
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'qbot-coop-'));
 try{
  const {Gardens}=await import('../rooms/garden.mjs');let now=Date.now();
  const contacts={people:{A:{nickname:'甲'},B:{nickname:'乙'},C:{nickname:'丙'}},areFriends:()=>true};
  const db=new Gardens(path.join(dir,'gardens.json'),contacts,()=>now);
  for(const id of ['A','B','C'])db.handle(id,{action:'get',actor:'pet-a'});
  const s=db.data.people.A.state;s.plots[0]={id:'rainbow-test',species:'pineapple',traits:['rainbow','moon'],kg:2,value:100,bred:false,growthVersion:2,plantedAt:now-30000,readyAt:now,baseTraits:['rainbow'],fertilizers:[],harvestsLeft:1,harvestIndex:0};
  const coop=(id,command,task)=>db.handle(id,{action:'coop',owner:'A',plot:0,command,task});
  coop('A','join');assert.equal(s.plots[0].cultivation.remainingMs,180000);coop('B','join');
  core.validateGarden(structuredClone(s));
  const ongoing=new Gardens(path.join(dir,'gardens.json'),contacts,()=>now);assert.equal(ongoing.data.tasks['rainbow-test'].remaining,core.COOP_RULES.work,'Active cultivation must survive a service restart');
  for(let i=0;i<30;i++){now+=10000;coop('A','join');coop('B','join');}
  let task=db.data.tasks['rainbow-test'];assert.equal(task.done,true);assert.equal(task.remaining,0);assert.equal(s.plots[0].revealed,true);assert.equal(task.members.A.work,core.COOP_RULES.work/2);assert.equal(task.members.B.work,core.COOP_RULES.work/2);
  // Harvest/owner privacy change must not erase earned helper rewards.
  db.data.people.A.state.plots[0]=null;db.data.people.A.state.life.visibility='private';
  coop('B','claim','rainbow-test');const saved=JSON.stringify(db.data.people.B.state);coop('B','claim','rainbow-test');assert.equal(JSON.stringify(db.data.people.B.state),saved);
  assert.throws(()=>coop('C','claim','rainbow-test'),/不属于你/);
  const reload=new Gardens(path.join(dir,'gardens.json'),contacts,()=>now);assert.ok(reload.data.tasks['rainbow-test'].claimed.includes('B'));
  // No heartbeat means work stops after the finite participation lease.
  const p={id:'single',species:'pineapple',traits:['rainbow'],kg:1,value:100,bred:false,growthVersion:2,plantedAt:now-30000,readyAt:now,baseTraits:['rainbow'],fertilizers:[],harvestsLeft:1,harvestIndex:0};
  reload.data.people.A.state.plots[0]=p;reload.handle('A',{action:'coop',owner:'A',plot:0,command:'join'});now+=3600000;reload.handle('A',{action:'get',actor:'pet-a'});
  assert.equal(reload.data.tasks.single.remaining,core.COOP_RULES.work-15*360);assert.equal(p.revealed,undefined);
  // An old ten-minute task migrates once and retains contributions and completion state.
  const legacy=reload.data.tasks.single;delete legacy.workBudget;legacy.remaining=180000;legacy.members.A.work=36000;legacy.members.A.seconds=100;legacy.updatedAt=now;legacy.members.A.seenAt=0;
  reload.handle('A',{action:'get',actor:'pet-a'});assert.equal(legacy.remaining,54000);assert.equal(legacy.members.A.work,10800);assert.equal(legacy.members.A.seconds,100);
  reload.handle('A',{action:'get',actor:'pet-a'});assert.equal(legacy.remaining,54000);
  console.log('PASS: two-person ninety-second completion, exact contribution, disconnect lease, post-harvest/private rewards and restart idempotency');
 }finally{const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('qbot-coop-'));await fs.rm(resolved,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
