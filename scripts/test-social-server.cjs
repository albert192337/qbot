// Actual rooms process + three WS clients, isolated data and loopback only.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');const net=require('node:net');
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function client(port,name){
 const ws=new WebSocket(`ws://127.0.0.1:${port}`);const frames=[];const pending=new Map();let n=0;
 ws.addEventListener('message',e=>{const f=JSON.parse(e.data);frames.push(f);const p=pending.get(f.requestId);if(p){pending.delete(f.requestId);clearTimeout(p.timer);p.resolve(f);}});
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 const req=f=>new Promise((resolve,reject)=>{const requestId=String(++n);const timer=setTimeout(()=>reject(Error(`timeout ${f.t}`)),3000);pending.set(requestId,{resolve,timer});ws.send(JSON.stringify({...f,requestId}));});
 const hello=await req({t:'hello',protoVer:2,nickname:name});assert.equal(hello.social,1);
 return {ws,frames,req,id:hello.memberId};
}
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-social-server-'));const port=await freePort();
 const proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:data},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let log='';proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);
 const clients=[];
 try{
  await new Promise((resolve,reject)=>{const end=Date.now()+5000;const t=setInterval(()=>{if(log.includes('listening')){clearInterval(t);resolve();}else if(Date.now()>end){clearInterval(t);reject(Error(log));}},30);});
  const a=await client(port,'甲'),b=await client(port,'乙'),c=await client(port,'丙');clients.push(a,b,c);
  const room=await a.req({t:'create',name:'午后的书房',kind:'study',capacity:2,listed:false,description:'一起赶稿',language:'zh',chatEnabled:true});
  assert.match(room.roomId,/^[A-Z0-9]{8}$/);await a.req({t:'join',roomId:room.roomId});
  assert.equal((await b.req({t:'list'})).rooms.length,0);
  const joined=await b.req({t:'join',roomId:room.roomId});assert.equal(joined.room.description,'一起赶稿');assert.equal(joined.room.capacity,2);
  const other=await c.req({t:'create',name:'原房',capacity:3,listed:true});await c.req({t:'join',roomId:other.roomId});
  assert.equal((await c.req({t:'join',roomId:room.roomId})).code,'room_full');
  assert.equal((await c.req({t:'chat',text:'仍在原房',roomId:other.roomId})).t,'social:ack');
  assert.equal((await b.req({t:'room:update',token:'wrong',listed:true})).code,'not_owner');
  assert.equal((await a.req({t:'room:update',token:room.ownerToken,listed:true,capacity:1})).code,'bad_capacity');
  await a.req({t:'room:update',token:room.ownerToken,listed:true,description:'更新的介绍',capacity:3,chatEnabled:false,language:'en'});
  const listed=(await c.req({t:'list'})).rooms.find(r=>r.roomId===room.roomId);assert.equal(listed.description,'更新的介绍');assert.equal(listed.language,'en');
  assert.equal((await b.req({t:'chat',text:'不应发送'})).code,'chat_disabled');
  await a.req({t:'world:subscribe',subscribe:true});await b.req({t:'world:subscribe',subscribe:true});
  await a.req({t:'world:send',text:'世界 <img onerror=alert(1)>'});
  await b.req({t:'list'});
  const msg=b.frames.find(f=>f.t==='world:chat').msg;
  assert.equal(b.frames.some(f=>f.t==='chat'&&f.msg.id===msg.id),false);
  assert.equal(c.frames.some(f=>f.t==='world:chat'),false);
  assert.equal((await b.req({t:'world:delete',id:msg.id})).code,'not_yours');
  assert.equal((await b.req({t:'world:report',id:msg.id})).t,'social:ack');
  await a.req({t:'world:delete',id:msg.id});
  assert.equal((await b.req({t:'world:subscribe',subscribe:true})).messages.length,0);
  await b.req({t:'world:subscribe',subscribe:false});
  assert.equal((await b.req({t:'world:send',text:'已退订'})).code,'not_subscribed');
  await a.req({t:'room:update',token:room.ownerToken,chatEnabled:true});
  await b.req({t:'chat',text:'只在房内',roomId:room.roomId});
  const history=(await a.req({t:'join',roomId:room.roomId})).chat;
  assert.deepEqual(history.map(m=>m.text),['只在房内']);
  const chat=history[0];assert.equal((await a.req({t:'chat:delete',id:chat.id})).code,'not_yours');
  await b.req({t:'chat:delete',id:chat.id});
  assert.equal((await a.req({t:'join',roomId:room.roomId})).chat.length,0);
  assert.equal((await a.req({t:'constructor'})).code,'bad_frame');
  console.log('PASS: metadata, visibility, owner checks, full-room atomic join, disabled chat, channel isolation, history, withdrawal, reports, subscriptions, request correlation');
 }finally{for(const c of clients)c.ws.close();proc.kill();await new Promise(r=>proc.once('exit',r));await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
