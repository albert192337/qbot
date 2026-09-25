import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Companions,readMarketPack} from './companions.mjs';
import {Contacts} from './contacts.mjs';
import {Gardens} from './garden.mjs';

export function fixtureMarket(dir){
  for(let i=0;i<6;i++){
    const manifest=Buffer.from(JSON.stringify({name:'市场角色'+i,actions:{idle:{webm:'actions/idle.webm',status:'done'},wave:{webm:'actions/wave.webm',status:'done'}}}));
    const header=Buffer.from(JSON.stringify({files:[{path:'manifest.json',size:manifest.length},{path:'actions/idle.webm',size:1},{path:'actions/wave.webm',size:1}]}));
    const length=Buffer.alloc(4);length.writeUInt32BE(header.length);const buffer=Buffer.concat([length,header,manifest,Buffer.from([i,i])]);
    const hash=createHash('sha256').update(buffer).digest('hex').slice(0,16);mkdirSync(path.join(dir,hash),{recursive:true});writeFileSync(path.join(dir,hash,'pack.bin'),buffer);
  }
}
function setup(){
  const dir=mkdtempSync(path.join(tmpdir(),'qbot-companions-'));fixtureMarket(path.join(dir,'market'));
  let clock=1800000000000;const contacts=new Contacts(path.join(dir,'contacts.json')),gardens=new Gardens(path.join(dir,'gardens.json'),contacts,()=>clock);
  const options={file:path.join(dir,'companions.json'),marketDir:path.join(dir,'market'),contacts,gardens,installPack(){},now:()=>clock,random:()=>.3};
  const module=new Companions(options);module.start();
  return {dir,contacts,gardens,module,options,advance:n=>clock+=n,close:()=>{assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));assert.ok(path.basename(dir).startsWith('qbot-companions-'));rmSync(dir,{recursive:true,force:true});}};
}
test('market bindings, IDs and garden diversity survive restart; public IDs cannot reclaim bots',()=>{
  const f=setup();try{
    assert.equal(f.module.peers.length,6);assert.equal(f.module.rooms.length,3);
    assert.equal(new Set(f.module.peers.map(p=>p.packHash)).size,6);
    assert.equal(new Set(f.module.peers.map(p=>p.memberId)).size,6);
    const states=f.module.peers.map(p=>f.gardens.view(p.memberId,p.memberId));
    assert.ok(new Set(states.map(s=>s.actorLevel)).size>3);
    assert.ok(new Set(states.map(s=>JSON.stringify(s.plots.map(p=>p?.species)))).size>3);
    const before=JSON.stringify(f.gardens.data);const again=new Companions(f.options);again.start();assert.equal(JSON.stringify(f.gardens.data),before);
    assert.deepEqual(again.peers.map(p=>p.memberId),f.module.peers.map(p=>p.memberId));
    const id=f.module.peers[0].memberId;assert.notEqual(f.contacts.login(id,undefined,'imposter','').id,id);
    const hash=f.module.peers[0].packHash,buf=readFileSync(path.join(f.dir,'market',hash,'pack.bin'));assert.equal(readMarketPack(buf,hash).actions.length,2);buf[buf.length-1]^=1;assert.throws(()=>readMarketPack(buf,hash));
  }finally{f.close();}
});
test('delayed welcome, room conversation, reply cooldown, persistent invitation cap and leaving',()=>{
  const f=setup();try{
    const m=f.module,peer=m.peers[0],user={memberId:'USER00000001',roomId:peer.roomId,readyState:1,OPEN:1,mode:'idle'};
    const messages=[],invites=[],answers=[];const pending=new Map();m.say=(...args)=>messages.push(args);m.hasHumans=()=>!!user.roomId;
    const tick=()=>m.tick({humans:[user],worldActive:true,say:m.say,invite:(...args)=>invites.push(args),answer:(...args)=>answers.push(args),pending});
    m.joined(user);tick();assert.equal(messages.length,0);f.advance(12000);tick();assert.equal(messages.filter(x=>!x[2]).length,1);
    m.heard(user,'你好');m.heard(user,'你好');f.advance(12000);tick();assert.equal(messages.filter(x=>x[1].includes('想聊就聊')).length,1);
    f.advance(26000);tick();assert.equal(invites.length,1);f.advance(200000);tick();assert.equal(invites.length,1);
    const again=new Companions(f.options);again.start();assert.equal(again.saved.invited[user.memberId],m.saved.invited[user.memberId]);
    pending.set('test',{to:peer.memberId,roomId:peer.roomId,expiresAt:f.options.now()+20000});tick();f.advance(9000);tick();assert.equal(answers.length,1);
    m.heard(user,'很累');m.left(user);user.roomId=null;const before=messages.length;f.advance(12000);tick();assert.equal(messages.length,before);
  }finally{f.close();}
});
test('latest message wins, spontaneous dialogue yields, and asking for quiet suppresses invitations',()=>{
  const f=setup();try{
    const m=f.module,peer=m.peers[0],user={memberId:'USER00000001',roomId:peer.roomId,readyState:1,OPEN:1,mode:'idle'};
    const messages=[],invites=[];m.say=(...a)=>messages.push(a);m.hasHumans=()=>true;
    const tick=()=>m.tick({humans:[user],worldActive:false,say:m.say,invite:(...a)=>invites.push(a),answer(){},pending:new Map()});
    m.joined(user);m.heard(user,'你好');f.advance(3000);m.heard(user,'今天有点累');f.advance(6000);tick();
    assert.equal(messages.length,1);assert.match(messages[0][1],/辛苦/);assert.ok(!messages.some(x=>x[1]===peer.profile.welcome));
    f.advance(60000);tick();const before=messages.length;
    m.heard(user,'想安静一会儿');f.advance(12000);tick();assert.equal(messages.length,before+1);assert.match(messages.at(-1)[1],/安静陪你/);
    const count=invites.length;f.advance(240000);tick();assert.equal(messages.length,before+1);assert.equal(invites.length,count);
    m.heard(user,'现在好多了，谢谢');f.advance(8000);tick();assert.match(messages.at(-1)[1],/不用客气|好心情/);
    m.heard(user,'再聊聊');m.left(user);m.joined(user);const responses=messages.length;f.advance(10000);tick();assert.equal(messages.length,responses+1);assert.equal(messages.at(-1)[1],peer.profile.welcome);
  }finally{f.close();}
});
test('missing market does not advertise empty actors',()=>{
  const f=setup();try{const m=new Companions({...f.options,marketDir:path.join(f.dir,'missing')});m.start();assert.equal(m.peers.length,0);assert.equal(m.rooms.length,0);}finally{f.close();}
});
test('tending uses harvest/sale rules, preserves showcase plot and does not touch human assets',()=>{
  const f=setup();try{
    const human=f.contacts.login(undefined,undefined,'真人','角色');f.gardens.transaction(()=>f.gardens.ensure(human.id,'human'));
    const humanBefore=JSON.stringify(f.gardens.data.people[human.id]);const peer=f.module.peers[0];f.advance(86400000);
    const before=structuredClone(f.gardens.ensure(peer.memberId).state);f.module.tend(peer);
    const after=f.gardens.data.people[peer.memberId].state;
    assert.equal(after.plots[0].id,before.plots[0].id);assert.ok(after.coins>=before.coins);
    assert.ok(after.plots[1]===null||after.plots[1].id!==before.plots[1].id||after.plots[1].readyAt>before.plots[1].readyAt);
    assert.equal(JSON.stringify(f.gardens.data.people[human.id]),humanBefore);
  }finally{f.close();}
});
