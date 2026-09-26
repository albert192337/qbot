// Use an isolated service/data copy: creates a synthetic identity and one friendship.
import assert from 'node:assert/strict';
const url=process.argv[2];if(!url)throw Error('Provide an isolated room WebSocket URL');
const ws=new WebSocket(url),frames=[],pending=new Map();let seq=0;
ws.addEventListener('message',e=>{const f=JSON.parse(e.data);frames.push(f);const p=pending.get(f.requestId);if(p){pending.delete(f.requestId);clearTimeout(p.timer);p.resolve(f);}});
const req=f=>new Promise((resolve,reject)=>{const requestId=String(++seq),timer=setTimeout(()=>reject(Error('request timeout')),5000);pending.set(requestId,{resolve,timer});ws.send(JSON.stringify({...f,requestId}));});
const until=async predicate=>{const end=Date.now()+25000;while(!predicate()){if(Date.now()>end)throw Error('friend acceptance timed out');await new Promise(r=>setTimeout(r,100));}};
try{
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 const hello=await req({t:'hello',protoVer:2,nickname:'好友预演验收',character:'临时验证'});assert.ok(hello.memberId);
 const room=await req({t:'join',roomId:'CMPGARDN'}),bot=room.room.members.find(m=>m.companion);assert.ok(bot);
 await req({t:'contacts:get'});assert.equal((await req({t:'contacts:change',id:bot.memberId,action:'request'})).t,'contacts:ack');
 assert.equal((await req({t:'contacts:get'})).people.find(p=>p.id===bot.memberId).relation,'outgoing');
 await until(()=>frames.some(f=>f.t==='contacts:snapshot'&&f.people.some(p=>p.id===bot.memberId&&p.relation==='friend')));
 assert.equal((await req({t:'contacts:get'})).people.find(p=>p.id===bot.memberId).relation,'friend');
 const privateRoom=await req({t:'create',name:'来访预演',listed:false,capacity:6});await req({t:'join',roomId:privateRoom.roomId});const start=frames.length;
 assert.equal((await req({t:'contacts:invite',id:bot.memberId})).t,'contacts:ack');
 await until(()=>frames.slice(start).some(f=>f.t==='member:in'&&f.member.memberId===bot.memberId&&f.member.companion));
 assert.equal((await req({t:'list'})).rooms.find(r=>r.roomId==='CMPGARDN').online,1);
 ws.send(JSON.stringify({t:'leave'}));await new Promise(r=>setTimeout(r,1600));
 assert.equal((await req({t:'list'})).rooms.find(r=>r.roomId==='CMPGARDN').online,2);
 console.log('PASS: deployed-runtime copy delays friendship, visits private room as a single identity and returns home');
}finally{for(const p of pending.values())clearTimeout(p.timer);ws.close();}
