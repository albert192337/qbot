// Actual rooms protocol, disposable data and simulated LLM sentences only.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{const end=Date.now()+7000;while(!fn()){if(Date.now()>end)throw Error('timed out');await delay(20);}};
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const dir=await mkdtemp(path.join(tmpdir(),'qbot-pair-dialogue-'));
const proc=spawn(process.execPath,[process.env.QBOT_PAIR_SERVER || 'rooms/server.mjs'],{windowsHide:true,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,QBOT_COMPANIONS:'0'},stdio:['ignore','pipe','pipe']});
let logs='';proc.stdout.on('data',b=>logs+=b);proc.stderr.on('data',b=>logs+=b);
const clients=[];
async function client(name){
  const ws=new WebSocket(`ws://127.0.0.1:${port}`),frames=[],pending=new Map();let n=0;
  ws.addEventListener('message',e=>{const f=JSON.parse(e.data);frames.push(f);pending.get(f.requestId)?.(f);});
  await new Promise((r,j)=>{ws.addEventListener('open',r);ws.addEventListener('error',j);});
  const req=f=>new Promise((resolve,reject)=>{const requestId=String(++n),timer=setTimeout(()=>reject(Error('request timeout')),4000);pending.set(requestId,v=>{clearTimeout(timer);pending.delete(requestId);resolve(v);});ws.send(JSON.stringify({...f,requestId}));});
  const hello=await req({t:'hello',protoVer:2,nickname:name,pairDialogue:1});
  const c={ws,frames,req,id:hello.memberId};clients.push(c);return c;
}
try{
  await until(()=>logs.includes('listening'));const a=await client('甲'),b=await client('乙');
  const room=await a.req({t:'create',name:'对话测试',kind:'idle',capacity:3,listed:false});
  for(const c of clients){await c.req({t:'join',roomId:room.roomId});await c.req({t:'garden:request',action:'get',actor:c.id});}
  for(const [index,c] of clients.entries()){
    const manifest=Buffer.from(JSON.stringify({name:index?'角色乙':'角色甲',persona:index?'活泼热情':'寡言克制'}));
    const header=Buffer.from(JSON.stringify({files:[{path:'manifest.json',size:manifest.length}]}));const length=Buffer.alloc(4);length.writeUInt32BE(header.length);
    const buffer=Buffer.concat([length,header,manifest]),hash=createHash('sha256').update(buffer).digest('hex').slice(0,16);
    c.ws.send(JSON.stringify({t:'pack:put',hash,seq:0,total:1,data:buffer.toString('base64')}));
    await until(()=>c.frames.some(f=>f.t==='pack:put:ok'&&f.hash===hash));
    c.ws.send(JSON.stringify({t:'pack:announce',hash}));
  }
  const invite=await a.req({t:'garden:request',action:'pair:invite',target:b.id,kind:'tea',actor:a.id});assert.equal(invite.ok,true);
  assert.equal((await b.req({t:'garden:request',action:'pair:answer',id:invite.invitation,accept:true,actor:b.id})).ok,true);
  await until(()=>a.frames.some(f=>f.t==='garden:pair-line'));
  const first=a.frames.find(f=>f.t==='garden:pair-line');assert.equal(first.actor,a.id);assert.equal(first.companion,undefined);
  assert.equal(first.partner,'角色乙');assert.equal(first.partnerPersona,'活泼热情');
  assert.equal((await b.req({t:'garden:request',action:'pair:line',request:first.request,line:'冒名'})).ok,false);
  assert.equal((await a.req({t:'garden:request',action:'pair:line',request:first.request,line:'读完这页，一起喝茶。'})).ok,true);
  await until(()=>b.frames.some(f=>f.t==='garden:pair-line'));const second=b.frames.find(f=>f.t==='garden:pair-line');
  assert.deepEqual(second.history,['读完这页，一起喝茶。']);
  await b.req({t:'garden:request',action:'pair:line',request:second.request,line:'我正好泡了一壶。'});
  await until(()=>clients.every(c=>c.frames.some(f=>f.t==='garden:interaction')));
  const frames=clients.map(c=>c.frames.find(f=>f.t==='garden:interaction'));
  assert.deepEqual(frames[0].lines,['读完这页，一起喝茶。','我正好泡了一壶。']);assert.deepEqual(frames[0].lines,frames[1].lines);
  assert.equal(frames[0].recipient,false);assert.equal(frames[1].recipient,true);assert.equal(frames[0].session,invite.invitation);
  const speech=a.frames.find(f=>f.t==='chat'&&f.msg.speaker==='character').msg;
  assert.equal(speech.characterName,'角色甲');assert.equal(speech.nickname,'甲');assert.equal(speech.pairSession,invite.invitation);
  // Leaving invalidates already scheduled later beats, including a quick rejoin.
  a.ws.send(JSON.stringify({t:'leave'}));await a.req({t:'join',roomId:room.roomId});await delay(4700);
  assert.equal(a.frames.filter(f=>f.t==='garden:interaction').length,1);
  assert.equal(b.frames.filter(f=>f.t==='garden:interaction').length,1);
  console.log('PASS: accepted invite, separate persona owners, forged response rejected, coherent dialogue shared to both roles, leave/rejoin cancels late beats');
}catch(e){console.error(logs);throw e;}finally{
  for(const c of clients)c.ws.close();proc.kill();await new Promise(r=>proc.once('exit',r));
  assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));assert.ok(path.basename(dir).startsWith('qbot-pair-dialogue-'));await rm(dir,{recursive:true,force:true});
}
