// Isolated loopback service using disposable market assets, never the live account.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
const dir=mkdtempSync(path.join(tmpdir(),'qbot-companion-server-'));
const market=path.join(dir,'market');mkdirSync(market);
for(let i=0;i<6;i++){
  const manifest=Buffer.from(JSON.stringify({name:'角色'+i,actions:{idle:{webm:'actions/idle.webm',status:'done'}}}));
  const header=Buffer.from(JSON.stringify({files:[{path:'manifest.json',size:manifest.length},{path:'actions/idle.webm',size:1}]}));
  const size=Buffer.alloc(4);size.writeUInt32BE(header.length);const buffer=Buffer.concat([size,header,manifest,Buffer.from([i])]);
  const hash=createHash('sha256').update(buffer).digest('hex').slice(0,16);mkdirSync(path.join(market,hash));writeFileSync(path.join(market,hash,'pack.bin'),buffer);
}
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const proc=spawn(process.execPath,['rooms/server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,QBOT_COMPANIONS:'1',QBOT_COMPANION_MARKET_DIR:market},windowsHide:true,stdio:['ignore','pipe','pipe']});
let logs='';proc.stdout.on('data',b=>logs+=b);proc.stderr.on('data',b=>logs+=b);
const delay=ms=>new Promise(r=>setTimeout(r,ms));let ws;const frames=[],pending=new Map();let n=0;
const until=async(predicate,timeout=5000)=>{const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw Error('Timed out: '+logs);await delay(50);}};
try{
  await until(()=>logs.includes('listening'));assert.match(logs,/residents=6 rooms=3/);
  ws=new WebSocket(`ws://127.0.0.1:${port}`);ws.addEventListener('message',e=>{const f=JSON.parse(e.data);frames.push(f);const resolve=pending.get(f.requestId);if(resolve){pending.delete(f.requestId);resolve(f);}});
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
  const req=f=>new Promise((resolve,reject)=>{const requestId=String(++n),timer=setTimeout(()=>reject(Error('request timed out '+f.t)),4000);pending.set(requestId,v=>{clearTimeout(timer);resolve(v);});ws.send(JSON.stringify({...f,requestId}));});
  const hello=await req({t:'hello',protoVer:2,nickname:'访客'});assert.ok(hello.memberId);
  const list=await req({t:'list'});assert.equal(list.rooms.length,3);assert.ok(list.rooms.every(r=>r.online===2&&r.companion));
  const joined=await req({t:'join',roomId:list.rooms[0].roomId});assert.equal(joined.room.members.length,3);
  const bots=joined.room.members.filter(m=>m.companion);assert.equal(bots.length,2);assert.notEqual(bots[0].packHash,bots[1].packHash);
  ws.send(JSON.stringify({t:'pack:have',hash:bots[0].packHash}));await until(()=>frames.some(f=>f.t==='pack:have:ack'));assert.equal(frames.find(f=>f.t==='pack:have:ack').cached,true);
  ws.send(JSON.stringify({t:'pack:get',hash:bots[0].packHash}));await until(()=>frames.some(f=>f.t==='pack:chunk'));assert.ok(frames.some(f=>f.t==='pack:begin'));
  const visit=await req({t:'garden:request',action:'visit',owner:bots[0].memberId});assert.equal(visit.ok,true);assert.ok(visit.visit.landOpen);assert.ok(visit.visit.plots.some(Boolean));
  await req({t:'garden:request',action:'get',actor:'visitor'});await req({t:'contacts:get'});await req({t:'world:subscribe',subscribe:true});
  await req({t:'chat',text:'大家好'});await until(()=>frames.some(f=>f.t==='chat'&&f.msg.companion),14000);
  const invite=await req({t:'garden:request',action:'pair:invite',target:bots[0].memberId,actor:'visitor',kind:'tea'});assert.equal(invite.ok,true);
  await until(()=>frames.some(f=>f.t==='garden:interaction'),12000);assert.ok(frames.find(f=>f.t==='garden:interaction').partner===bots[0].memberId);
  await until(()=>frames.some(f=>f.t==='world:chat'&&f.msg.companion),18000);
  await until(()=>frames.some(f=>f.t==='contacts:snapshot'&&f.invitations.some(i=>i.pair)),50000);
  const incoming=frames.filter(f=>f.t==='contacts:snapshot').flatMap(f=>f.invitations).find(i=>i.pair);
  const answer=await req({t:'garden:request',action:'pair:answer',id:incoming.id,accept:false,actor:'visitor'});assert.equal(answer.ok,true);
  ws.send(JSON.stringify({t:'leave'}));await delay(100);assert.ok(!logs.includes('tick failed'));
  console.log('PASS: real WS room list/join, distinct market packs, download, garden visit, delayed chat, world broadcast, bot acceptance, proactive invitation and rejection');
}catch(error){console.error(logs);throw error;}finally{
  ws?.close();proc.kill();await new Promise(r=>proc.once('exit',r));
  if(existsSync(path.join(dir,'rooms.json')))assert.ok(!readFileSync(path.join(dir,'rooms.json'),'utf8').includes('CMPGARDN'));
  assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));assert.ok(path.basename(dir).startsWith('qbot-companion-server-'));rmSync(dir,{recursive:true,force:true});
}
