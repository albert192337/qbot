// Explicitly authorized, bounded to 3 paid text calls. No credentials written to disk.
if(process.env.QBOT_ALLOW_PAID_PERSONA_TEST!=='1')throw Error('Requires explicit approval for 3 paid text calls, then QBOT_ALLOW_PAID_PERSONA_TEST=1');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.superpowers/persona-live');fs.mkdirSync(out,{recursive:true});
const esbuild=require(require.resolve('esbuild',{paths:[fs.realpathSync(path.join(root,'app/node_modules/electron-vite'))]}));
const ready=esbuild.build({stdin:{contents:`export {writePairLine} from './app/src/main/pair-dialogue';export {weatherMessages,writeWeatherLine} from './app/src/main/weather-dialogue';export {chatComplete} from './app/src/main/llm-client';`,resolveDir:root,loader:'ts'},outfile:path.join(out,'writer.cjs'),bundle:true,platform:'node',format:'cjs',plugins:[{name:'diagnostic-log-only',setup(build){build.onResolve({filter:/brain-log$/},()=>({path:'brain-log',namespace:'verification'}));build.onLoad({filter:/.*/,namespace:'verification'},()=>({contents:`export async function beginBrainCall(trigger){return trigger} export async function updateBrainCall(id,stage,patch,detail){globalThis.personaVerificationTrace?.push({id,stage,raw:patch?.raw,detail});}`,loader:'js'}));}}]});
let writePairLine,weatherMessages,writeWeatherLine,chatComplete;
globalThis.personaVerificationTrace=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let calls=0,ws;const result={startedAt:new Date().toISOString(),calls:0,weather:null,pair:[],verified:false};
const complete=opts=>{if(++calls>3)throw Error('Authorized 3-call limit exceeded');return chatComplete(opts);};
(async()=>{
 await ready;({writePairLine,weatherMessages,writeWeatherLine,chatComplete}=require(path.join(out,'writer.cjs')));
 const userData=path.join(process.env.APPDATA,'@qbot','app');const settings=JSON.parse(fs.readFileSync(path.join(userData,'config.json'),'utf8'));
 const local=fs.existsSync(path.join(root,'config.local.json'))?JSON.parse(fs.readFileSync(path.join(root,'config.local.json'),'utf8')):{};
 const apiKey=settings.arkApiKey||local.arkApiKey;if(!apiKey)throw Error('No LLM key configured');
 const manifest=JSON.parse(fs.readFileSync(path.join(userData,'characters',settings.activeCharacter,'manifest.json'),'utf8'));
 const voice={name:manifest.name,persona:manifest.persona};result.character=voice.name;result.personaLength=voice.persona?.length??0;
 result.weather=await writeWeatherLine(apiKey,weatherMessages('aurora',voice),complete);
 const pending=new Map(),frames=[],answered=new Set();let n=0;
 ws=new WebSocket('wss://albertbeta.cn/rooms');
 const request=frame=>new Promise((resolve,reject)=>{const requestId=String(++n),timer=setTimeout(()=>reject(Error('Room request timeout')),10000);pending.set(requestId,value=>{clearTimeout(timer);pending.delete(requestId);resolve(value);});ws.send(JSON.stringify({...frame,requestId}));});
 ws.addEventListener('message',async e=>{
  const f=JSON.parse(e.data);frames.push(f);pending.get(f.requestId)?.(f);
  if(f.t!=='garden:pair-line'||answered.has(f.request))return;answered.add(f.request);
  try{
   assert.equal(f.kind,'tea');assert.equal(f.actor,'persona-verification');assert.ok(f.step===0||f.step===1);
   const line=await writePairLine(apiKey,{kind:f.kind,step:f.step,voice:f.companion||voice,partner:f.partner,history:f.history,intent:f.intent},complete);
   result.pair.push({step:f.step,name:f.companion?.name||voice.name,line,source:line?'llm':'fallback'});
   await request({t:'garden:request',action:'pair:line',request:f.request,line});
  }catch(error){result.error=error.message;}
 });
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
 await request({t:'hello',protoVer:2,nickname:'人设部署验收',pairDialogue:1});
 const joined=await request({t:'join',roomId:'CMPSTUDY'});const peer=joined.room.members.find(m=>m.companion&&m.nickname==='翻到第七页');assert.ok(peer);
 await request({t:'garden:request',action:'get',actor:'persona-verification'});
 const invited=await request({t:'garden:request',action:'pair:invite',target:peer.memberId,kind:'tea',actor:'persona-verification'});assert.equal(invited.ok,true,JSON.stringify(invited));
 const end=Date.now()+45000;while(!frames.some(f=>f.t==='garden:interaction')){if(Date.now()>end)throw Error('No synchronized interaction received');await delay(100);}
 const playback=frames.find(f=>f.t==='garden:interaction');result.pair.sort((a,b)=>a.step-b.step);
 assert.equal(result.pair.length,2);assert.ok(result.pair.every(p=>p.source==='llm'));assert.equal(calls,3);
 assert.deepEqual(playback.lines,result.pair.map(p=>p.line));result.verified=true;
 console.log(JSON.stringify({ok:true,character:result.character,weather:result.weather,pair:result.pair,calls},null,2));
})().catch(error=>{result.error=error.message;console.error(error.message);process.exitCode=1;}).finally(()=>{
 result.calls=calls;result.trace=globalThis.personaVerificationTrace;fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
 if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({t:'leave'}));ws?.close();
});
