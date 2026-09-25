// Real room service, three people, private temporary data; no production accounts.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtemp,rm}=require('node:fs/promises');
const path=require('node:path'),os=require('node:os'),net=require('node:net');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-petting-'));
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 let proc;const clients=[];
 async function start(){let log='';proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:data},stdio:['ignore','pipe','pipe'],windowsHide:true});proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>{log+=b;process.stderr.write(b);});await new Promise((resolve,reject)=>{const end=Date.now()+5000;const t=setInterval(()=>{if(log.includes('listening')){clearInterval(t);resolve();}else if(Date.now()>end){clearInterval(t);reject(Error(log));}},20);});}
 async function client(name, identity={}){
  const ws=new WebSocket(`ws://127.0.0.1:${port}`);clients.push(ws);let seq=0;const pending=new Map();
  ws.addEventListener('message',e=>{const f=JSON.parse(e.data);const p=pending.get(f.requestId);if(p){clearTimeout(p.timer);pending.delete(f.requestId);p.resolve(f);}});
  await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',()=>j(Error('connection failed: '+name)),{once:true});});
  const req=f=>new Promise((resolve,reject)=>{const requestId=String(++seq);const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('timeout '+f.t));},4000);pending.set(requestId,{resolve,timer});ws.send(JSON.stringify({...f,requestId}));});
  const hello=await req({t:'hello',protoVer:2,nickname:name,character:'角色-'+name,...identity});
  return {ws,req,hello,id:hello.memberId,token:hello.contactToken};
 }
 async function snapshot(c){const result=await c.req({t:'contacts:get'});assert.equal(result.t,'contacts:snapshot');return result;}
 const change=(c,id,action)=>c.req({t:'contacts:change',id,action});
 const stop=async()=>{for(const ws of clients.splice(0))ws.close();const ended=new Promise(r=>proc.once('exit',r));proc.kill();await ended;};
 try{
  await start();const a=await client('甲'),b=await client('乙'),c=await client('丙');
  assert.equal(a.hello.petting,2);
  const room=await a.req({t:'create',name:'摸摸小屋',capacity:6});
  await a.req({t:'join',roomId:room.roomId});await b.req({t:'join',roomId:room.roomId});
  const frames=[];b.ws.addEventListener('message',e=>frames.push(JSON.parse(e.data)));
  assert.equal((await a.req({t:'petting',roomId:'WRONG',target:b.id})).t,'error');
  assert.equal((await a.req({t:'petting',roomId:room.roomId,target:c.id})).t,'error');
  assert.equal((await a.req({t:'petting',roomId:room.roomId,target:b.id,nickname:'伪造昵称',text:'伪造正文'})).t,'social:ack');
  await new Promise(r=>setTimeout(r,100));
  assert.ok(frames.some(f=>f.t==='petting'&&f.target===b.id));
  const msg=frames.find(f=>f.t==='chat').msg;
  assert.equal(msg.text,'甲轻轻摸了摸乙，乙开心地蹭了蹭小手。');assert.equal(msg.interaction,'petting');
  for(let i=0;i<6;i++){await new Promise(r=>setTimeout(r,500));assert.equal((await a.req({t:'petting',roomId:room.roomId,target:b.id,phase:'keep'})).t,'social:ack');}
  assert.equal((await a.req({t:'join',roomId:room.roomId})).chat.length,1);
  assert.equal((await a.req({t:'petting',roomId:room.roomId,target:b.id,phase:'end'})).t,'social:ack');
  assert.equal((await a.req({t:'petting',roomId:room.roomId,target:b.id,phase:'keep'})).t,'error');
  assert.equal((await a.req({t:'petting',roomId:room.roomId,target:a.id})).code,'rate_limited');
  assert.equal((await b.req({t:'petting',roomId:room.roomId,target:b.id})).t,'social:ack');
  const history=await b.req({t:'join',roomId:room.roomId});assert.equal(history.chat.length,2);
  assert.equal(history.chat[1].text,'乙摸了摸自己的桌宠。');
  const a2=await client('甲',{memberId:a.id,contactToken:a.token});await a2.req({t:'join',roomId:room.roomId});
  assert.equal((await a2.req({t:'petting',roomId:room.roomId,target:b.id})).code,'rate_limited');
  const closed=await c.req({t:'create',name:'安静小屋',chatEnabled:false});await c.req({t:'join',roomId:closed.roomId});
  assert.equal((await c.req({t:'petting',roomId:closed.roomId,target:c.id})).code,'chat_disabled');
  await new Promise(r=>setTimeout(r,31000));
  await stop();await start();const again=await client('甲',{memberId:a.id,contactToken:a.token});
  const saved=await again.req({t:'join',roomId:room.roomId});assert.equal(saved.chat.length,2);assert.equal(saved.chat[0].interaction,'petting');
  assert.equal((await again.req({t:'petting',roomId:room.roomId,target:b.id})).t,'error');
  console.log('PASS: self/peer petting, authoritative names, current room, offline target, cooldown across sockets, disabled chat, live broadcast and persisted history.');
 } finally {if(proc?.exitCode===null)await stop();await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
