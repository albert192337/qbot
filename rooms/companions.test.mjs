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

test('friend requests are delayed, cancellation wins and pending requests resume after restart',()=>{
  const f=setup();try{
    let m=f.module;const peer=m.peers[0],user=f.contacts.login(undefined,undefined,'来客','角色');
    f.contacts.transaction(()=>f.contacts.meet(user.id,peer.memberId));
    f.contacts.change(user.id,peer.memberId,'request');
    assert.equal(m.friendsTick(),false);f.advance(7000);assert.equal(m.friendsTick(),false);
    f.contacts.change(user.id,peer.memberId,'cancel');m.contactChanged(user.id,peer.memberId,'cancel');f.advance(20000);m.friendsTick();assert.equal(f.contacts.areFriends(user.id,peer.memberId),false);
    f.contacts.change(user.id,peer.memberId,'request');m.friendsTick();
    m=new Companions(f.options);m.start();m.friendsTick();f.advance(19000);assert.equal(m.friendsTick(),true);
    assert.equal(f.contacts.snapshot(user.id,new Set([peer.memberId])).find(p=>p.id===peer.memberId).relation,'friend');
    assert.equal(new Contacts(f.contacts.file).areFriends(user.id,peer.memberId),true);
    assert.equal(m.friendsTick(),false);
  }finally{f.close();}
});

test('one proactive friend request per day, no auto-consent, quiet/left/busy guards and rejection cooldown survive restart',()=>{
  const f=setup();try{
    let m=f.module;const peers=m.peers.slice(0,2),identity=f.contacts.login(undefined,undefined,'来客','角色');
    const user={memberId:identity.id,roomId:peers[0].roomId,readyState:1,OPEN:1,mode:'idle'};
    f.contacts.transaction(()=>peers.forEach(p=>f.contacts.meet(user.memberId,p.memberId)));
    m.joined(user);f.advance(160000);m.visits.get(user).quiet=true;assert.equal(m.friendsTick(),false);
    m.visits.get(user).quiet=false;user.mode='working';assert.equal(m.friendsTick(),false);user.mode='idle';
    assert.equal(m.friendsTick(),true);const from=f.contacts.people[user.memberId].incoming[0];assert.ok(from);assert.equal(f.contacts.areFriends(from,user.memberId),false);
    assert.equal(m.friendsTick(),false);assert.equal(f.contacts.people[user.memberId].incoming.length,1);
    f.contacts.change(user.memberId,from,'reject');m.contactChanged(user.memberId,from,'reject');
    m=new Companions(f.options);m.start();m.joined(user);f.advance(160000);assert.equal(m.friendsTick(),false);
    // Tomorrow another room companion may ask, but the rejected one cannot.
    f.advance(86400000);assert.equal(m.friendsTick(),true);const second=f.contacts.people[user.memberId].incoming[0];assert.notEqual(second,from);
    f.contacts.change(user.memberId,second,'accept');assert.equal(f.contacts.areFriends(second,user.memberId),true);
    f.contacts.change(user.memberId,second,'remove');m.contactChanged(user.memberId,second,'remove');
    f.advance(86400000);assert.equal(m.friendsTick(),false);
    f.advance(8*86400000);m.left(user);assert.equal(m.friendsTick(),false);
  }finally{f.close();}
});
test('friend visits delay arrival, move one identity, cancel stale invitations and return home',()=>{
  const f=setup();try{
    const m=f.module,p=m.peers[0],home=p.roomId,id=f.contacts.login(undefined,undefined,'朋友','角色').id;
    f.contacts.transaction(()=>f.contacts.meet(id,p.memberId));f.contacts.change(id,p.memberId,'request');f.contacts.change(p.memberId,id,'accept');
    const user={memberId:id,roomId:'PRIVATE',readyState:1,OPEN:1},moves=[];m.say=()=>{};
    const move=(peer,room)=>{moves.push(room);peer.roomId=room;return true;};
    m.inviteToRoom(p,user);assert.throws(()=>m.inviteToRoom(p,user),/busy/);
    f.advance(3000);m.travelTick(move);assert.equal(p.roomId,home);
    f.advance(6000);m.travelTick(move);assert.equal(p.roomId,'PRIVATE');assert.equal(m.peers.filter(x=>x.memberId===p.memberId).length,1);
    assert.throws(()=>m.inviteToRoom(p,user),/same_room/);
    user.roomId=null;m.travelTick(move);assert.equal(p.roomId,home);
    user.roomId='PRIVATE';m.inviteToRoom(p,user);user.roomId=null;f.advance(9000);m.travelTick(move);assert.equal(moves.length,2);
    user.roomId='PRIVATE';m.inviteToRoom(p,user);f.advance(9000);m.travelTick(move);f.advance(15*60000);m.travelTick(move);assert.equal(p.roomId,home);
    m.inviteToRoom(p,user);f.advance(9000);m.travelTick(move);f.contacts.change(id,p.memberId,'remove');m.travelTick(move);assert.equal(p.roomId,home);
  }finally{f.close();}
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
