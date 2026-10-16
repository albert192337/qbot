import './style.css';
import {TYPES,CAP,REFILL_MS,FLOOR_INSET,OPEN_MS,playback} from './model.mjs';
import {PinballAudio,auditAudio} from './audio.mjs';
import {PinballEffects} from './effects.js';
import {SPIN_MS,HOLD_MS,chooseWheel,wheelRevealed,roundReceipt} from './roulette.mjs';
import {RouletteView} from './roulette-view.js';
const $=s=>document.querySelector(s),api=window.pinball,canvas=$('#field'),ctx=canvas.getContext('2d');
let state,editing=false,animation=0,lastDraw=0,completedCoins=0;
let sound=true;try{sound=localStorage.getItem('pinball-sound')!=='off';}catch{}
const audio=new PinballAudio(sound),effects=new PinballEffects();
const prizeNames={petals:'✿ 花瓣足迹',orbit:'✧ 星环'};
let harvest,numberTween=null,displayedCoins=0;
const running=new Map(),finishedIds=new Set();
let previewWheel=null;
const roulette=new RouletteView($('.treasure'),audio,ticket=>{if(ticket.preview)return;if(!running.has(ticket.id)&&!finishedIds.has(ticket.id))showResult(ticket.receipt,true);update(state);});
let launchCount=1,launching=false,activeBalls=0;
const iconImages=new Map(),requestedImages=new Map();let jitterFrames=0;
const types=Object.keys(TYPES),format=n=>n.toLocaleString('en-US');
function fixtureIcon(type){const symbol={coin:'📁',multi:'📄',split:'🌐',star:'🎮',save:'🗑'}[type],tile=document.createElement('canvas');tile.width=tile.height=96;const c=tile.getContext('2d');c.font='80px Segoe UI Emoji';c.textAlign='center';c.textBaseline='middle';c.fillText(symbol,48,49);return tile.toDataURL();}
async function warmImages(){
 const revision=p=>p.imageRevision??'fixture',ids=new Set(state.icons.map(p=>p.id));
 for(const id of requestedImages.keys())if(!ids.has(id)){requestedImages.delete(id);iconImages.delete(id);}
 const queue=state.icons.filter(p=>requestedImages.get(p.id)!==revision(p));
 for(const p of queue){requestedImages.set(p.id,revision(p));iconImages.delete(p.id);}
 await Promise.all(Array.from({length:4},async()=>{while(queue.length){const p=queue.shift();try{
  const asset=state.verify&&!p.imageRevision?{image:fixtureIcon(p.type),revision:revision(p)}:await api.icon(p.id);
  if(!asset.image||asset.revision!==revision(p))continue;
  const image=new Image();image.src=asset.image;await image.decode();
  if(requestedImages.get(p.id)===asset.revision){iconImages.set(p.id,image);if(state.verify){const fixture=$(`[data-fixture-id="${p.id}"] img`);if(fixture)fixture.src=asset.image;}}
 }catch{}}}));
}
function error(e){$('#error').textContent=String(e.message||e).replace(/^Error invoking remote method '[^']+': Error: /,'');$('#error').style.display='block';setTimeout(()=>$('#error').style.display='none',4000);}
function hitRects(){api.rects([...document.querySelectorAll('.interactive,.pin-edit')].filter(e=>!e.disabled&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));}
function updateHitAreas(){hitRects();}
function openChest(round){
 const openedAt=round.openedAt??round.started,elapsed=Date.now()-openedAt;
 if(elapsed<0||elapsed>OPEN_MS)return;
 const rect=$('#fire svg').getBoundingClientRect();
 effects.launch(round.result.frames[0].balls,openedAt,round.origin??{x:rect.x+rect.width/2,y:rect.y+rect.height/2});
 if(state.formal)audio.unlock();
 if(!document.hidden&&(state.active||state.verify))audio.play('launch');
 if(!effects.reduced.matches){
  const lid=$('.chest-lid');lid.getAnimations().forEach(a=>a.cancel());
  const a=lid.animate([{transform:'translateY(0) rotate(0deg)'},{transform:'translateY(2px) rotate(-3deg)',offset:.22},{transform:'translateY(-16px) rotate(-12deg)',offset:.55},{transform:'translateY(0) rotate(0deg)'}],{duration:OPEN_MS,easing:'ease-out'});a.currentTime=elapsed;
 }
}
function update(data){
 const geometryChanged=!state||JSON.stringify(data.icons)!==JSON.stringify(state.icons);state={...state,...data};
 for(const id of data.cancelledRoundIds||[]){const round=running.get(id);if(round)round.cancelled=true;}
 for(const round of data.rounds||[])begin(round);
 if(geometryChanged){if(!running.size)updateHitAreas();if(editing)editor();void warmImages();}
 const w=playback([...running.values()],state.wallet,Date.now());
 $('#balance').textContent='◈ '+format(w.coins);$('#balls').textContent='● '+state.wallet.balls+' / '+CAP;
 $('#fire').disabled=launching||!state.ready||state.wallet.balls<launchCount||editing;$('#edit').disabled=!editing&&(!!running.size||launching);$('#aim').disabled=editing;
 $('#test-wheel').disabled=!!state.wallet.pendingWheels?.length;
 $('#fire-label').textContent=state.wallet.balls<launchCount?'弹珠不足':'开宝箱';$('#fire').setAttribute('aria-label','打开宝箱，发射'+launchCount+'颗弹珠');
 for(const button of document.querySelectorAll('#volley button')){const count=Number(button.dataset.count);button.disabled=editing||state.wallet.balls<count;button.setAttribute('aria-pressed',String(count===launchCount));}
 document.body.classList.toggle('paused',!state.active&&!state.verify);if(!state.active&&!state.verify)audio.stop();hitRects();schedule();
}
function resize(){const ratio=Math.min(devicePixelRatio,2);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);if(state)updateHitAreas();draw();}
function editor(){
 $('#editor').replaceChildren();if(!editing){hitRects();return;}
 for(const p of state.icons){const b=document.createElement('button');b.className='pin-edit';b.style.left=p.x-28+'px';b.style.top=p.y-28+'px';b.title=p.name+' · '+TYPES[p.type].label;
  b.onclick=async()=>{try{await api.assign(p.id,types[(types.indexOf(p.type)+1)%types.length]);}catch(e){error(e);}};
  const text=document.createElement('span');text.textContent=TYPES[p.type].label;b.append(text);$('#editor').append(b);
 }hitRects();
}
function setEditing(value){editing=value;$('#edit').classList.toggle('selected',editing);$('#edit').textContent=editing?'退出编辑':'机关';$('#edit').setAttribute('aria-pressed',String(editing));editor();update(state);}
function begin(round){
 if(running.has(round.result.id)||finishedIds.has(round.result.id))return;
 if(!running.size){completedCoins=0;harvest={coins:0,cost:0,prizes:[],jackpot:false,summary:{collisionCoins:0,landingCoins:0,bonusCoins:0,maxMultiplier:1,extraBalls:0}};}
 const elapsed=Math.max(0,(Date.now()-round.started)/1000);
 const nextEvent=round.result.events.findIndex(event=>event.t>=elapsed);
 running.set(round.result.id,{...round,lastEvent:nextEvent<0?round.result.events.length:nextEvent});
 openChest(round);schedule();
}
function finish(id){
 const round=running.get(id);if(!round)return;
 running.delete(id);finishedIds.add(id);if(finishedIds.size>512)finishedIds.delete(finishedIds.values().next().value);
 const result=roundReceipt(round.result);if(harvest.cost===0)displayedCoins=0;completedCoins+=result.coins;harvest.coins=completedCoins;harvest.cost+=result.launchCount;harvest.jackpot||=result.jackpot;
 if(result.prize&&!harvest.prizes.includes(result.prize))harvest.prizes.push(result.prize);
 if(result.summary)for(const key of Object.keys(harvest.summary))harvest.summary[key]=key==='maxMultiplier'?Math.max(harvest.summary[key],result.summary[key]):harvest.summary[key]+result.summary[key];
 showResult(harvest,true);
 if(!running.size)updateHitAreas();
}
function showResult(result,animate=false){
 const summary=result.summary??{},prizes=result.prizes??(result.prize?[result.prize]:[]),tier=result.jackpot?'jackpot':result.coins/Math.max(1,result.cost??result.launchCount??1)>=1000?'big':'normal';
 const reward=$('#reward');reward.dataset.tier=tier;reward.dataset.coins=result.coins;reward.classList.add('has-result');
 $('#reward-kind').textContent=({normal:'收获',big:'丰收',jackpot:'大奖'})[tier];
 $('#reward-extra').textContent=[summary.maxMultiplier>1?'×'+summary.maxMultiplier:'',summary.extraBalls?'+'+summary.extraBalls+'球':''].filter(Boolean).join(' · ');
 reward.title=summary.collisionCoins===undefined?'':`碰撞 ${format(summary.collisionCoins)} · 落槽 ${format(summary.landingCoins)} · 大奖 ${format(summary.bonusCoins)}`;
 $('#reward-prizes').textContent=prizes.map(id=>prizeNames[id]).join(' · ');$('#reward-prizes').classList.toggle('new-prize',!!prizes.length);
 if(animate&&!effects.reduced.matches){numberTween={from:displayedCoins,to:result.coins,start:Date.now(),duration:tier==='jackpot'?800:420};reward.getAnimations().forEach(a=>a.cancel());reward.animate([{transform:'translateX(-50%) translateY(5px)',filter:'brightness(1.12)'},{transform:'translateX(-50%) translateY(0)',filter:'brightness(1)'}],{duration:380,easing:'ease-out'});}
 else{displayedCoins=result.coins;numberTween=null;$('#reward-amount').textContent='+'+format(result.coins);}
 schedule();
}
function soundControl(){const button=$('#sound');button.classList.toggle('selected',sound);button.setAttribute('aria-pressed',String(sound));button.title=sound?'关闭音效':'开启音效';button.setAttribute('aria-label',button.title);button.textContent=sound?'♪':'♪̸';}
function draw(){
 if(!state)return;ctx.clearRect(0,0,innerWidth,innerHeight);const floor=innerHeight-FLOOR_INSET;
 const now=Date.now(),frame=playback([...running.values()],state.wallet,now),events=frame.events;
 for(const round of running.values()){const time=(now-round.started)/1000;while(round.lastEvent<round.result.events.length&&round.result.events[round.lastEvent].t<=time){const e=round.result.events[round.lastEvent++];if(!round.cancelled&&time-e.t<.12&&!document.hidden&&(state.active||state.verify)&&!(e.type==='bank'&&e.jackpot))audio.play(e.type==='jackpot'?'wheelStart':e.type,{value:e.value??e.amount,variant:(e.pin?.charCodeAt(0)??0)});}}
 const tickets=state.wallet.pendingWheels??[];
 if(previewWheel&&(tickets.length||now>=previewWheel.startedAt+SPIN_MS+HOLD_MS))previewWheel=null;
 const anchor=state.petAnchor??{x:innerWidth/2,y:innerHeight/2};
 roulette.host.style.left=Math.max(4,Math.min(innerWidth-124,anchor.x-60))+'px';roulette.host.style.top=Math.max(4,Math.min(innerHeight-124,anchor.y-128))+'px';
 roulette.draw(previewWheel?[previewWheel]:tickets,now,!document.hidden&&(state.active||state.verify));
 $('#balance').textContent='◈ '+format(frame.coins);
 if(numberTween){const t=Math.min(1,(now-numberTween.start)/numberTween.duration);displayedCoins=Math.round(numberTween.from+(numberTween.to-numberTween.from)*(1-(1-t)**3));$('#reward-amount').textContent='+'+format(displayedCoins);if(t===1)numberTween=null;}
 for(const p of state.icons){
  if(p.y<72||p.y>floor-45)continue;const meta=TYPES[p.type],hit=events.findLast(e=>e.pin===p.id&&e.type==='hit'),age=hit?.age??1;
  const kick=Math.max(0,1-age/.42),radius=p.size*(kick?.92:.78);
  // No permanent rings or glyph badges. Keep the icon face unobscured.
  if(kick||p.type!=='coin'){
   ctx.save();ctx.beginPath();ctx.rect(p.x-radius,p.y-radius,radius*2,radius*2);ctx.roundRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size,p.size*.15);ctx.clip('evenodd');
   const glow=ctx.createRadialGradient(p.x,p.y,p.size*.2,p.x,p.y,radius);glow.addColorStop(0,meta.color);glow.addColorStop(.46,meta.color);glow.addColorStop(1,meta.color+'00');ctx.fillStyle=glow;ctx.globalAlpha=kick?.52*kick:.065;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);ctx.restore();
  }
  const icon=iconImages.get(p.id);
  if(kick&&icon){
   const scale=1+.14*Math.sin(Math.PI*(1-kick)),shift=Math.sin(age*70)*2.5*kick;
   ctx.save();ctx.translate(p.x+shift,p.y-2*Math.sin(Math.PI*(1-kick)));ctx.rotate(Math.sin(age*58)*.065*kick);ctx.globalAlpha=Math.min(1,kick*8);ctx.drawImage(icon,-p.size*scale/2,-p.size*scale/2,p.size*scale,p.size*scale);ctx.restore();jitterFrames++;
  }
 }
 activeBalls=frame.balls.length;effects.draw(ctx,frame,innerWidth,innerHeight,now,running.size>0||roulette.active);
 if(frame.completed.length){for(const id of frame.completed)finish(id);update(state);}
}
function schedule(){if(!animation)animation=requestAnimationFrame(tick);}
function tick(now){animation=0;draw();if(running.size||numberTween||roulette.active||effects.active)schedule();lastDraw=now;}
$('#fire').onclick=async()=>{if(launching||editing)return;audio.unlock();launching=true;update(state);try{const r=await api.launch(Number($('#aim').value)/100*innerWidth,launchCount);begin(r);}catch(e){error(e);}finally{launching=false;update(state);}};
for(const button of document.querySelectorAll('#volley button'))button.onclick=()=>{if(editing)return;launchCount=Number(button.dataset.count);update(state);};
$('#aim').oninput=()=>schedule();$('#close').onclick=()=>api.close();$('#sound').onclick=()=>{sound=!sound;try{localStorage.setItem('pinball-sound',sound?'on':'off');}catch{}audio.setEnabled(sound);soundControl();};
$('#edit').onclick=()=>setEditing(!editing);
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(editing)setEditing(false);else api.close();}});
$('#test-wheel').onclick=()=>{
 if(!state||state.wallet.pendingWheels?.length)return;
 if(editing)setEditing(false);
 audio.unlock();const now=Date.now(),seed=crypto.getRandomValues(new Uint32Array(1))[0];
 // Presentation only: use the same wheel renderer without settlement or wallet IPC.
 previewWheel={id:'preview-'+crypto.randomUUID(),preview:true,startedAt:now,triggerAt:now,wheel:chooseWheel(seed,state.wallet.unlocked)};
 audio.play('wheelStart');schedule();
};
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();});
window.addEventListener('beforeunload',()=>{cancelAnimationFrame(animation);audio.dispose();});
api.subscribe(update);
api.get().then(data=>{
 state=data;if(data.verify){document.body.classList.add('fixture');$('#test-wheel').hidden=false;for(const p of data.icons){const e=document.createElement('div');e.className='fake-icon';e.dataset.fixtureId=p.id;e.style.left=p.x-46+'px';e.style.top=p.y-24+'px';const icon=document.createElement('img');if(!p.imageRevision)icon.src=fixtureIcon(p.type);icon.width=icon.height=p.size;e.append(icon);const label=document.createElement('small');label.textContent=p.name;e.append(label);$('#fixture').append(e);}}
 launchCount=data.rounds?.at(-1)?.result.launchCount??1;resize();update(data);soundControl();if(!running.size&&data.wallet.last&&!data.wallet.pendingWheels?.some(t=>t.id===data.wallet.last.id&&!wheelRevealed(t,Date.now())))showResult(data.wallet.last);void warmImages();document.body.dataset.ready='true';
 if(data.verify)window.pinballPreview.auditAudio=auditAudio;
 setInterval(()=>{const left=REFILL_MS-Math.max(0,Date.now()-state.wallet.refillAt)%REFILL_MS;$('#refill').textContent=state.wallet.balls>=CAP?'已满':Math.ceil(left/1000)+'秒 +1 · '+state.wallet.keys+'/100';if(!running.size)schedule();},1000);
}).catch(error);
window.pinballPreview={stats:()=>({ready:document.body.dataset.ready,running:!!running.size,activeRounds:running.size,roundIds:[...running.keys()],editing,launchCount,activeBalls,icons:state?.icons.length,iconImages:iconImages.size,jitterFrames,trailFrames:effects.trailFrames,landingFrames:effects.landingFrames,result:harvest,audio:audio.stats(),wheel:roulette.stats(),wallet:state?.wallet,frame:lastDraw,openingFrames:effects.openingFrames}),state:()=>state};
