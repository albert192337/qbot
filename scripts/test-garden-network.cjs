// Isolated, real WebSocket clients; fixtures are only written to a new temporary directory.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{mkdtemp,rm,writeFile,readFile}=require('node:fs/promises');
const path=require('node:path'),os=require('node:os'),net=require('node:net'),{randomUUID}=require('node:crypto');
const core=require('../rooms/generated/garden-core.cjs');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-garden-network-')),sockets=[];let proc;
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 async function start(){let log='';proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:data},windowsHide:true,stdio:['ignore','pipe','pipe']});proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);await new Promise((resolve,reject)=>{const end=Date.now()+8000,t=setInterval(()=>{if(log.includes('listening')){clearInterval(t);resolve();}else if(proc.exitCode!==null||Date.now()>end){clearInterval(t);reject(Error(log));}},20);});}
 async function stop(){sockets.splice(0).forEach(s=>s.close());const exit=new Promise(r=>proc.once('exit',r));proc.kill();await exit;}
 async function client(name,identity={}){const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);let n=0;const frames=[],pending=new Map();ws.onmessage=e=>{const f=JSON.parse(e.data),p=pending.get(f.requestId);frames.push(f);if(p){clearTimeout(p.timer);pending.delete(f.requestId);p.resolve(f);}};await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 const req=f=>new Promise((resolve,reject)=>{const requestId=String(++n),timer=setTimeout(()=>reject(Error('timeout '+f.t)),5000);pending.set(requestId,{resolve,timer});ws.send(JSON.stringify({...f,requestId}));});const hello=await req({t:'hello',protoVer:2,nickname:name,...identity});return {req,frames,ws,id:hello.memberId,token:hello.contactToken};}
 const get=c=>c.req({t:'garden:request',action:'get',actor:'pet-a'});
 const act=(c,command,operation=`${Date.now()}-${randomUUID()}`)=>c.req({t:'garden:request',action:'act',actor:'pet-a',command,operation});
 try{
  await start();let a=await client('甲'),b=await client('乙');const identities=[{memberId:a.id,contactToken:a.token},{memberId:b.id,contactToken:b.token}];
  let sa=(await get(a)).state,sb=(await get(b)).state;assert.equal(sa.life.owner,a.id);assert.notEqual(sa.life.owner,sb.life.owner);
  assert.equal((await b.req({t:'garden:request',action:'visit',owner:a.id})).ok,false);
  await act(a,{type:'gardenVisibility',visibility:'public'});
  const visit=await b.req({t:'garden:request',action:'visit',owner:a.id});assert.equal(visit.ok,true);assert.equal(visit.visit.owner,a.id);assert.equal(visit.visit.coins,undefined);
  assert.equal((await act(a,{type:'mature'})).ok,false);
  const room=await a.req({t:'create',name:'花园互动测试'});
  await a.req({t:'join',roomId:room.roomId});await b.req({t:'join',roomId:room.roomId});await a.req({t:'contacts:change',id:b.id,action:'request'});await b.req({t:'contacts:change',id:a.id,action:'accept'});
  assert.equal((await a.req({t:'garden:request',action:'pair:invite',target:b.id,kind:'flower',actor:'pet-a'})).ok,false);
  await stop();
  const file=path.join(data,'gardens.json'),fixture=JSON.parse(await readFile(file,'utf8'));
  fixture.people[b.id].state.coins=2000;
  fixture.people[a.id].state.plots[0]={id:'network-rainbow',species:'pineapple',traits:['rainbow','moon'],kg:2,value:100,bred:false,growthVersion:2,plantedAt:Date.now()-60000,readyAt:Date.now()-1,baseTraits:['rainbow'],fertilizers:[],harvestsLeft:1,harvestIndex:0};
  // A persisted near-complete task makes the protocol test fast; exact 600/300-second work
  // accumulation is separately checked by the controlled-clock cooperation test.
  fixture.tasks['network-rainbow']={id:'network-rainbow',plant:'network-rainbow',owner:a.id,plot:0,remaining:2160,updatedAt:Date.now(),members:{[a.id]:{work:106920,seconds:297,seenAt:0},[b.id]:{work:106920,seconds:297,seenAt:0}},done:false,claimed:[]};
  fixture.people[a.id].state.produce=[{id:'meal',species:'strawberry',traits:['honey'],kg:.2,value:20,bred:false,growthVersion:2,revealed:true}];
  const wish=fixture.people[a.id].state.life.characters['pet-a'].wishes[0];wish.species='strawberry';wish.traits=['honey'];
  fixture.people[b.id].state.life.characters['pet-a'].xp=60;
  await writeFile(file,JSON.stringify(fixture));
  await start();a=await client('甲',identities[0]);b=await client('乙',identities[1]);
  const offer=(await b.req({t:'garden:request',action:'visit',owner:a.id})).visit.offers[0];
  const op=`${Date.now()}-${randomUUID()}`,command={type:'buyDaily',owner:a.id,offer:offer.id};
  const bought=await act(b,command,op),replayed=await act(b,command,op);assert.equal(bought.ok,true);assert.equal(replayed.state.coins,bought.state.coins);assert.equal(replayed.state.life.sprays[offer.item],1);
  assert.equal((await act(b,{...command,offer:'fake'},op)).ok,false);
  const fed=await act(a,{type:'feed',wish:wish.id,produce:'meal'});assert.equal(fed.ok,true);assert.equal(fed.state.produce.length,0);assert.equal(fed.state.life.characters['pet-a'].xp,10);
  const stale=`${Date.now()-8*86400000}-${randomUUID()}`;assert.equal((await act(b,command,stale)).ok,false);
  await a.req({t:'world:subscribe',subscribe:true});await b.req({t:'world:subscribe',subscribe:true});
  await act(a,{type:'gardenVisibility',scope:'land',visibility:'private'});await act(a,{type:'gardenVisibility',scope:'shop',visibility:'public'});
  assert.equal((await a.req({t:'garden:request',action:'coop',owner:a.id,plot:0,command:'share'})).ok,true);
  await new Promise(r=>setTimeout(r,3100));assert.equal((await a.req({t:'garden:request',action:'coop',owner:a.id,plot:0,command:'invite',target:b.id})).ok,true);
  assert.ok((await b.req({t:'contacts:get'})).invitations.some(i=>i.garden?.plant==='network-rainbow'));
  assert.equal((await a.req({t:'garden:request',action:'coop',owner:a.id,plot:0,command:'join'})).ok,true);assert.equal((await b.req({t:'garden:request',action:'coop',owner:a.id,plot:0,command:'join'})).ok,true);
  a.ws.close();await new Promise(r=>setTimeout(r,7100));await get(b);
  const cards=b.frames.filter(f=>f.t==='world:chat'&&f.msg.garden?.plant==='network-rainbow');assert.equal(new Set(cards.map(f=>f.msg.id)).size,1);assert.equal(cards.at(-1).msg.garden.done,true);assert.ok(cards.at(-1).msg.garden.traits.some(t=>t.quality));
  a=await client('甲',identities[0]);assert.equal((await act(a,{type:'harvest',plot:0})).ok,true);const rewardRequest={t:'garden:request',action:'coop',owner:a.id,plot:0,command:'claim',task:'network-rainbow'};assert.equal((await b.req(rewardRequest)).ok,true);const rewarded=(await get(b)).state;assert.equal((await b.req(rewardRequest)).ok,true);const again=(await get(b)).state;assert.deepEqual(again.life.sprays,rewarded.life.sprays);assert.deepEqual(again.seeds,rewarded.seeds);
  assert.ok((await b.req({t:'garden:request',action:'visit',owner:a.id,task:'network-rainbow'})).visit.tasks[0].done);
  const pairRoom=await a.req({t:'create',name:'一起送花'});await a.req({t:'join',roomId:pairRoom.roomId});await b.req({t:'join',roomId:pairRoom.roomId});
  const invited=await b.req({t:'garden:request',action:'pair:invite',target:a.id,kind:'flower',actor:'pet-a'});assert.equal(invited.ok,true);
  assert.equal(b.frames.some(f=>f.t==='garden:interaction'),false,'Must not play before acceptance');
  assert.equal((await b.req({t:'garden:request',action:'pair:answer',id:invited.invitation,accept:true,actor:'pet-a'})).ok,false,'Only invitee accepts');
  const snapshot=await a.req({t:'contacts:get'});assert.equal(snapshot.invitations.find(i=>i.id===invited.invitation).pair.kind,'flower');
  assert.equal((await a.req({t:'garden:request',action:'pair:answer',id:invited.invitation,accept:true,actor:'pet-a'})).ok,true);
  await b.req({t:'list'});assert.equal(a.frames.find(f=>f.t==='garden:interaction').effect,'flower');assert.equal(b.frames.find(f=>f.t==='garden:interaction').intent,'wave');
  assert.equal((await a.req({t:'garden:request',action:'pair:answer',id:invited.invitation,accept:true,actor:'pet-a'})).ok,false,'Invitation consumed once');
  await stop();await start();b=await client('乙',identities[1]);assert.equal((await get(b)).state.life.sprays[offer.item],again.life.sprays[offer.item]);
  console.log('PASS: authoritative inventories, privacy, cross-shop purchase, replay, correct food, role-gated consensual interactions, restart');
 }finally{if(proc&&proc.exitCode===null)await stop();const resolved=path.resolve(data);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('qbot-garden-network-'));await rm(resolved,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
