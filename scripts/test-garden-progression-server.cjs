const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const core=require('../rooms/generated/garden-core.cjs');
(async()=>{
 const {Gardens}=await import('../rooms/garden.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qbot-progression-')),file=path.join(dir,'gardens.json');
 let now=Date.now(),op=0;const contacts={people:{A:{nickname:'主人'},B:{nickname:'朋友'}},areFriends:()=>true};
 let db=new Gardens(file,contacts,()=>now);
 const act=(command,actor='low')=>db.handle('A',{action:'act',actor,command,operation:`${now}-${randomUUID()}`});
 db.handle('A',{action:'get',actor:'low'});db.handle('B',{action:'get',actor:'friend'});
 let s=db.data.people.A.state;assert.equal(core.unlockedPlots(s),3);
 assert.throws(()=>act({type:'plant',plot:3,seed:s.seeds[0].id}),/尚未解锁/);
 db.handle('A',{action:'get',actor:'high'});s=db.data.people.A.state;s.life.characters.high.xp=200;s.coins=1000;
 act({type:'plant',plot:6,seed:s.seeds.find(x=>x.species==='strawberry').id},'high');
 act({type:'upgradeSoil',plot:6},'high');s=db.data.people.A.state;assert.equal(s.v3.soil[6],2);
 assert.equal(db.view('B','A').plotCount,7);
 // An existing crop on the seventh plot survives a switch to a new character.
 db.handle('A',{action:'get',actor:'low'});s=db.data.people.A.state;assert.equal(core.unlockedPlots(s),3);assert.ok(s.plots[6]);
 assert.equal(db.view('B','A').plotCount,3);assert.ok(db.view('B','A').plots[6]);
 // The last plot must support cooperative tasks, sharing addresses and persisted rewards.
 const p=s.plots[6];p.readyAt=now;p.batch.settled=true;p.traits=['starcore','rainbow','halo'];p.slots=core.geneSlots(p.traits);p.revealed=false;
 db.handle('B',{action:'coop',owner:'A',plot:6,command:'join'});
 assert.ok(Object.values(db.data.tasks).some(t=>t.plot===6));
 db=new Gardens(file,contacts,()=>now);assert.ok(db.data.people.A.state.plots[6]);assert.equal(db.data.people.A.state.v3.soil[6],2);
 assert.equal(db.view('B','A').plots.length,7);
 console.log('PASS: authoritative 3–7 plot gating, seventh plot planting/soil/cooperation, lower-level switching, friend view and persisted reload.');
})().catch(e=>{console.error(e);process.exitCode=1;});
