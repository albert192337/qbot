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
  for(const room of list.rooms){
    const joined=await req({t:'join',roomId:room.roomId});const bot=joined.room.members.find(m=>m.companion);assert.ok(bot);
    if(room.roomId==='CMPSTUDY')assert.equal(bot.mode,'working');
    const offset=frames.length;
    const result=await req({t:'petting',roomId:room.roomId,target:bot.memberId});assert.equal(result.t,'social:ack');
    await until(()=>frames.slice(offset).some(f=>f.t==='petting'&&f.target===bot.memberId));
    assert.ok(frames.slice(offset).some(f=>f.t==='chat'&&f.msg.interaction==='petting'));
    assert.equal(frames.slice(offset).some(f=>f.t==='garden:interaction'),false);
    await delay(500);assert.equal((await req({t:'petting',roomId:room.roomId,target:bot.memberId,phase:'keep'})).t,'social:ack');
    assert.equal((await req({t:'petting',roomId:room.roomId,target:bot.memberId,phase:'end'})).t,'social:ack');
  }
  console.log('PASS: all three companion rooms accept direct petting, including working residents; no invitation or acceptance required.');
}catch(error){console.error(logs);throw error;}finally{
  ws?.close();proc.kill();await new Promise(r=>proc.once('exit',r));
  if(existsSync(path.join(dir,'rooms.json')))assert.ok(!readFileSync(path.join(dir,'rooms.json'),'utf8').includes('CMPGARDN'));
  assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));assert.ok(path.basename(dir).startsWith('qbot-companion-server-'));rmSync(dir,{recursive:true,force:true});
}
