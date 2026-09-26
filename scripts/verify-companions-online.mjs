// Deployment probe: no player chat, invites, trades or changes to existing accounts.
import assert from 'node:assert/strict';
const url=process.argv[2];if(!url)throw Error('Provide the room WebSocket URL');
const ws=new WebSocket(url),frames=[],pending=new Map();let seq=0;
ws.addEventListener('message',e=>{const f=JSON.parse(e.data);frames.push(f);const item=pending.get(f.requestId);if(item){pending.delete(f.requestId);clearTimeout(item.timer);item.resolve(f);}});
const request=f=>new Promise((resolve,reject)=>{const requestId='deploy-'+(++seq),timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Timeout '+f.t));},15000);pending.set(requestId,{resolve,timer});ws.send(JSON.stringify({...f,requestId}));});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Connection timeout')),15000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Connection failed'));},{once:true});});
 const hello=await request({t:'hello',protoVer:2,nickname:'部署巡检',character:'运维验证'});assert.equal(hello.garden,1);
 const list=await request({t:'list'}),rooms=list.rooms.filter(r=>r.companion);assert.equal(rooms.length,3);assert.ok(rooms.every(r=>r.online>=2));
 const joined=await request({t:'join',roomId:rooms[0].roomId}),bots=joined.room.members.filter(m=>m.companion);assert.equal(bots.length,2);assert.notEqual(bots[0].packHash,bots[1].packHash);
 const gardens=[];for(const bot of bots){const result=await request({t:'garden:request',action:'preview',owner:bot.memberId});assert.equal(result.ok,true);assert.ok(result.visit.plots.some(Boolean));gardens.push({name:bot.nickname,level:result.visit.actorLevel,planted:result.visit.plots.filter(Boolean).length});}
 ws.send(JSON.stringify({t:'leave'}));
 console.log(JSON.stringify({ok:true,url,rooms:rooms.map(r=>({id:r.roomId,name:r.name,online:r.online})),gardens,capabilities:{social:hello.social,garden:hello.garden,petting:hello.petting}},null,2));
}finally{for(const item of pending.values())clearTimeout(item.timer);ws.close();}
