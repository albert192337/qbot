// Loopback only; uses the real room WebSocket handler and a temporary database.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{mkdtemp,rm}=require('node:fs/promises');
const path=require('node:path'),os=require('node:os'),net=require('node:net'),{randomUUID}=require('node:crypto');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-box-ws-'));let proc,ws;
 try{
  const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
  let log='';proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:data,QBOT_COMPANIONS:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);
  for(let i=0;i<100&&!log.includes('listening');i++)await new Promise(r=>setTimeout(r,50));assert.ok(log.includes('listening'),log);
  ws=new WebSocket(`ws://127.0.0.1:${port}`);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let seq=0;const waiting=new Map();ws.onmessage=e=>{const f=JSON.parse(e.data),p=waiting.get(f.requestId);if(p){waiting.delete(f.requestId);clearTimeout(p.timer);p.resolve(f);}};
  const request=frame=>new Promise((resolve,reject)=>{const requestId=String(++seq),timer=setTimeout(()=>reject(Error('timeout')),4000);waiting.set(requestId,{resolve,timer});ws.send(JSON.stringify({...frame,requestId}));});
  const hello=await request({t:'hello',protoVer:2,nickname:'开箱验收',character:'验收角色'});assert.equal(hello.t,'hello:ack');const owner=hello.memberId;
  const garden=frame=>request({t:'garden:request',...frame});const initial=await garden({action:'get'});assert.equal(initial.boxProtocol,1);
  const operation=`${Date.now()}-${randomUUID()}`;
  const prepared=await garden({action:'box:prepare',owner,operation});assert.equal(prepared.ok,true);assert.equal(prepared.points,500);assert.equal(prepared.boxes,1);
  assert.equal((await garden({action:'box:commit',owner,operation,token:'wrong',payment:operation})).ok,false);
  const frame={action:'box:commit',owner,operation,token:prepared.token,payment:operation};
  const once=await garden(frame),again=await garden(frame);assert.equal(once.ok,true);assert.deepEqual(again.state.seeds,once.state.seeds);assert.deepEqual(again.reveal,once.reveal);assert.equal(once.reveal.items.length,2);
  const raw=await garden({action:'act',operation:`${Date.now()}-${randomUUID()}`,command:{type:'box'}});assert.equal(raw.ok,false);
  const cancelledOp=`${Date.now()}-${randomUUID()}`,ticket=await garden({action:'box:prepare',owner,operation:cancelledOp});
  assert.equal((await garden({action:'box:cancel',owner,operation:cancelledOp,token:ticket.token})).ok,true);
  assert.equal((await garden({action:'box:commit',owner,operation:cancelledOp,token:ticket.token,payment:cancelledOp})).ok,false);
  console.log('PASS: real WebSocket box capability, prepare/commit/replay, ticket rejection, raw box rejection and cancellation');
 }finally{
  ws?.close();if(proc){const stopped=new Promise(r=>proc.once('exit',r));proc.kill();await stopped;}
  assert.ok(path.resolve(data).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(data).startsWith('qbot-box-ws-'));await rm(data,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
