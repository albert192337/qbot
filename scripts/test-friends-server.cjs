// Real room service, three people, private temporary data; no production accounts.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtemp,rm}=require('node:fs/promises');
const path=require('node:path'),os=require('node:os'),net=require('node:net');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-friends-'));
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
  assert.equal(a.hello.contacts,1);assert.equal((await change(a,b.id,'request')).code,'contact_not_seen');
  const room=await a.req({t:'create',name:'会客小屋',capacity:6});await a.req({t:'join',roomId:room.roomId});await b.req({t:'join',roomId:room.roomId});
  let seen=(await snapshot(a)).people.find(p=>p.id===b.id);assert.ok(seen.seenAt);assert.equal(seen.interactedAt,undefined);
  a.ws.send(JSON.stringify({t:'wave',targetMemberId:b.id}));seen=(await snapshot(a)).people.find(p=>p.id===b.id);assert.ok(seen.interactedAt);
  await c.req({t:'join',roomId:room.roomId});await a.req({t:'chat',text:'大家好'});assert.equal((await snapshot(c)).people.find(p=>p.id===a.id).interactedAt,undefined);await c.req({t:'chat',text:'一起坐坐'});assert.ok((await snapshot(a)).people.find(p=>p.id===c.id).interactedAt);
  await change(a,b.id,'request');assert.equal((await snapshot(b)).people.find(p=>p.id===a.id).relation,'incoming');
  assert.equal((await change(c,a.id,'accept')).code,'request_missing');
  await change(b,a.id,'reject');assert.equal((await snapshot(a)).people.find(p=>p.id===b.id).relation,'none');
  await change(a,b.id,'request');await change(a,b.id,'cancel');assert.equal((await snapshot(b)).people.find(p=>p.id===a.id).relation,'none');
  await change(a,b.id,'request');await change(b,a.id,'accept');
  assert.equal((await snapshot(a)).people.find(p=>p.id===b.id).relation,'friend');assert.equal((await snapshot(b)).people.find(p=>p.id===a.id).relation,'friend');
  assert.equal(JSON.stringify(await snapshot(a)).includes(a.token),false);
  const fake=await client('假甲',{memberId:a.id});assert.notEqual(fake.id,a.id);assert.equal((await snapshot(fake)).people.length,0);
  const bad=await client('坏甲',{memberId:a.id,contactToken:'bad'});assert.equal(bad.hello.code,'identity_invalid');
  await b.req({t:'create',name:'别的小屋'});b.ws.send(JSON.stringify({t:'leave'}));await snapshot(b);
  assert.equal((await a.req({t:'contacts:invite',id:b.id})).t,'contacts:ack');let invite=(await snapshot(b)).invitations[0];assert.ok(invite);
  assert.equal((await c.req({t:'contacts:invitation',id:invite.id,action:'accept'})).code,'invite_expired');
  assert.equal((await b.req({t:'contacts:invitation',id:invite.id,action:'accept'})).roomId,room.roomId);
  await change(a,b.id,'remove');assert.equal((await b.req({t:'contacts:invitation',id:invite.id,action:'accept'})).code,'invite_expired');
  await change(a,b.id,'request');await change(b,a.id,'accept');
  await a.req({t:'contacts:invite',id:b.id});invite=(await snapshot(b)).invitations[0];a.ws.send(JSON.stringify({t:'leave'}));await snapshot(a);
  assert.equal((await b.req({t:'contacts:invitation',id:invite.id,action:'accept'})).code,'invite_expired');
  await a.req({t:'join',roomId:room.roomId});await new Promise(r=>{b.ws.addEventListener('close',r,{once:true});b.ws.close();});
  assert.equal((await a.req({t:'contacts:invite',id:b.id})).code,'contact_offline');
  assert.equal((await snapshot(a)).people.find(p=>p.id===b.id).online,false);
  await stop();await start();
  const again=await client('甲换装',{memberId:a.id,contactToken:a.token});assert.equal(again.id,a.id);
  const saved=(await snapshot(again)).people.find(p=>p.id===b.id);assert.equal(saved.relation,'friend');assert.ok(saved.interactedAt);assert.equal(saved.online,false);
  const bAgain=await client('乙换装',{memberId:b.id,contactToken:b.token});assert.equal((await snapshot(bAgain)).people.find(p=>p.id===a.id).character,'角色-甲换装');
  console.log('PASS: seen vs interacted, requests/reject/cancel/accept/remove, identity protection, invitations, offline state, server restart, role-independent identity');
 } finally {if(proc?.exitCode===null)await stop();await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
