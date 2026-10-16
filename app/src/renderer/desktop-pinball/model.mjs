// Shared deterministic simulation. Only the isolated preview main process owns its wallet.
import {chooseWheel,wheelRevealed,roundReceipt} from './roulette.mjs';
export {advanceWheels} from './roulette.mjs';
export const TYPES = {
 coin: { label: '金币', mark: '+', color: '#efb84d' },
 multi: { label: '倍率', mark: '×', color: '#af8ce7' },
 split: { label: '分裂', mark: 'Ⅱ', color: '#55bcca' },
 star: { label: '大奖灯', mark: '★', color: '#f18c64' },
 save: { label: '救球', mark: '↥', color: '#82b890' },
};
export const CAP = 30, REFILL_MS = 60_000, KEYS_PER_BALL = 100;
export const FLOOR_INSET = 28, OPEN_MS = 420;
export const LAUNCH_COUNTS = Object.freeze([1,3,5]);
export function launchPoints(width,launchX,launchCount=1){
 if(!LAUNCH_COUNTS.includes(launchCount)||!Number.isFinite(launchX))throw Error('Invalid launch');
 const half=(launchCount-1)*10,center=Math.max(18+half,Math.min(width-18-half,launchX));
 return Array.from({length:launchCount},(_,i)=>({x:center+i*20-half,y:54}));
}
// Each launch keeps its own clock and immutable trajectory. Adding a later shot
// never rewinds an earlier one, even when the later shot reaches a slot first.
export function playback(rounds,wallet,now){
 let coins=wallet.coins,stars=wallet.stars;const balls=[],events=[],completed=[];
 for(const ticket of wallet.pendingWheels??[])if(!wheelRevealed(ticket,now))coins-=ticket.wheel.coins;
 for(const round of rounds){
  if(!round.cancelled&&now<round.started){coins-=round.result.coins;stars-=round.result.stars-(round.before?.stars??round.result.frames[0].stars);continue;}
  const result=round.result,frames=result.frames,time=round.cancelled?result.duration+.3:Math.max(0,(now-round.started)/1000);
  let at=Math.min(frames.length-1,Math.floor(time*40));while(at>0&&frames[at].t>time)at--;
  while(at+1<frames.length&&frames[at+1].t<=time)at++;
  const frame=frames[at],next=frames[at+1];coins-=result.coins-frame.coins;stars-=result.stars-frame.stars;
  // Only interpolate adjacent physics samples, never rewards, spawns or drains.
  const blend=next&&next.t-frame.t<=.04?Math.max(0,Math.min(1,(time-frame.t)/(next.t-frame.t))):0;
  for(const ball of frame.balls){const target=blend&&next.balls.find(b=>b.id===ball.id);balls.push({...ball,x:target?ball.x+(target.x-ball.x)*blend:ball.x,y:target?ball.y+(target.y-ball.y)*blend:ball.y,id:result.id+':'+ball.id});}
  if(!round.cancelled)for(const event of result.events){const age=time-event.t;if(age>=0&&age<.9)events.push({...event,age,roundId:result.id,at:round.started+event.t*1000});}
  const ticket=wallet.pendingWheels?.find(t=>t.id===result.id);
  if(time>=result.duration+.25&&(!ticket||wheelRevealed(ticket,now)))completed.push(result.id);
 }
 events.sort((a,b)=>a.at-b.at);
 return{coins:Math.max(0,coins),stars:Math.max(0,Math.min(3,stars)),balls,events,completed};
}
// IFolderView positions are physical pixels; GetViewModeAndIconSize is already DIP.
export function placeIcon(left,top,size){return{x:left+size/2,y:top+size/2,size,r:size*.47};}
export function iconContact(ball,pin,ballRadius=7){
 if(!pin.size){const dx=ball.x-pin.x,dy=ball.y-pin.y,d=Math.hypot(dx,dy),reach=pin.r+ballRadius;return d>=reach?null:{nx:d?dx/d:0,ny:d?dy/d:1,depth:reach-d+.1};}
 const half=pin.size*.47,corner=pin.size*.15,core=half-corner,dx=ball.x-pin.x,dy=ball.y-pin.y;
 const nearX=Math.max(-core,Math.min(core,dx)),nearY=Math.max(-core,Math.min(core,dy)),vx=dx-nearX,vy=dy-nearY,d=Math.hypot(vx,vy),reach=corner+ballRadius;
 if(d>=reach)return null;
 if(d>1e-6)return{nx:vx/d,ny:vy/d,depth:reach-d+.1};
 return Math.abs(dx)>Math.abs(dy)?{nx:dx<0?-1:1,ny:0,depth:half+ballRadius-Math.abs(dx)+.1}:{nx:0,ny:dy<0?-1:1,depth:half+ballRadius-Math.abs(dy)+.1};
}
export function classify(icon) {
 const name=icon.name.toLowerCase();
 if (/回收站|recycle/.test(name)) return 'save';
 if (/chrome|edge|firefox|浏览器|opera|safari/.test(name)) return 'split';
 if (/steam|游戏|星布谷|逆水寒|原神|崩坏|鸣潮|明日方舟|王者|英雄联盟|云顶|minecraft|wegame|battlenet|战网|燕云|绝区零/.test(name)) return 'star';
 if (icon.kind==='folder') return 'coin';
 if (/office|excel|word|powerpoint|文档|表格|笔记|notion|obsidian|\.pdf$|\.docx?$|\.xlsx?$|\.pptx?$|\.md$|\.txt$/.test(name)) return 'multi';
 return 'coin';
}
export function newWallet(now=Date.now()) {return {version:1,balls:20,coins:0,stars:0,keys:0,refillAt:now,rounds:0,unlocked:[],equipped:null,overrides:{},last:null};}
export function replenish(wallet,now,keys=0) {
 const w=structuredClone(wallet),elapsed=Math.max(0,now-w.refillAt),ticks=Math.floor(elapsed/REFILL_MS);
 if(w.balls>=CAP){w.refillAt=now;w.keys=0;return w;}
 w.refillAt+=ticks*REFILL_MS;
 w.keys+=Math.max(0,Math.min(20,Number.isFinite(keys)?Math.floor(keys):0));
 const earned=Math.floor(w.keys/KEYS_PER_BALL);w.keys%=KEYS_PER_BALL;
 w.balls=Math.min(CAP,w.balls+ticks+earned);
 if(w.balls===CAP){w.refillAt=now;w.keys=0;}
 return w;
}
export function settle(wallet,round,now) {
 if(wallet.last?.id===round.id)return wallet;
 const cost=round.launchCount===undefined?1:round.launchCount;
 if(!LAUNCH_COUNTS.includes(cost))throw Error('Invalid launch count');
 if(wallet.balls<cost)throw Error('弹珠不足');
 const w=structuredClone(wallet);if(w.balls===CAP)w.refillAt=now;
 const receipt=roundReceipt({...round,launchCount:cost});
 w.balls-=cost;w.coins+=receipt.coins;w.stars=round.stars;w.rounds++;
 if(receipt.prize&&!w.unlocked.includes(receipt.prize)){w.unlocked.push(receipt.prize);w.equipped=receipt.prize;}
 if(round.wheel){const hit=round.events.find(e=>e.type==='jackpot');w.pendingWheels=[...(w.pendingWheels??[]),{id:round.id,triggerAt:now+hit.t*1000,startedAt:null,wheel:round.wheel,receipt}];}
 w.last={...receipt,settledAt:now};return w;
}
export function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function simulate({width,height,icons,launchX,launchCount=1,seed=1,stars=0,id=String(seed),unlocked=[]}) {
 if(!Number.isFinite(width)||width<320||!Number.isFinite(height)||height<300)throw Error('Invalid board');
 const rand=random(seed),floor=height-FLOOR_INSET,r=7,dt=1/120,frames=[],events=[];
 const pins=icons.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.r)&&p.r>0&&p.y>65&&p.y<floor-45);
 let balls=launchPoints(width,launchX,launchCount).map((p,i)=>({id:i,...p,vx:(rand()-.5)*160+(i-(launchCount-1)/2)*30,vy:120,cool:new Map()}));
 let created=launchCount,multiplier=1,coins=0,saved=false,saveUsed=false,splitUsed=false,starUsed=false,jackpot=false,prize=null,wheel=null;
 let time=0;stars=Math.max(0,Math.min(3,stars));
 const emit=(type,x,y,text,pin,detail={})=>events.push({t:time,type,x,y,text,pin,...detail});
 for(let tick=0;tick<1800&&balls.length;tick++){
  time=tick*dt;
  for(const b of [...balls]){
   b.vy+=420*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.x<r||b.x>width-r){b.x=Math.max(r,Math.min(width-r,b.x));b.vx*=-.9;}
   if(b.y<48){b.y=48;b.vy=Math.abs(b.vy);}
   if(time<9)for(const pin of pins){
    const contact=iconContact(b,pin,r);if(!contact)continue;const {nx,ny,depth}=contact;
    b.x+=nx*depth;b.y+=ny*depth;
    const dot=b.vx*nx+b.vy*ny;
    if(dot<0){b.vx-=1.55*dot*nx;b.vy-=1.55*dot*ny;}
    b.vx+=nx*70+(rand()-.5)*65;b.vy+=ny*30;
    b.vx=Math.max(-350,Math.min(350,b.vx));b.vy=Math.max(-280,Math.min(600,b.vy));
    if(time-(b.cool.get(pin.id)??-10)<.65)continue;b.cool.set(pin.id,time);
    emit('hit',pin.x,pin.y,'',pin.id,{contactX:b.x,contactY:b.y,role:pin.type});
    switch(pin.type){
     case 'multi':if(multiplier<5){multiplier++;emit('multi',pin.x,pin.y,'×'+multiplier,pin.id,{value:multiplier});}break;
     case 'split':if(!splitUsed){splitUsed=true;for(const sign of [-1,1]){balls.push({id:created++,x:b.x+sign*12,y:b.y-12,vx:sign*210,vy:-150,cool:new Map([[pin.id,time]])});}emit('split',pin.x,pin.y,'分裂 +2',pin.id);}break;
     case 'star':if(!starUsed){starUsed=true;if(stars<3){stars++;emit('star',pin.x,pin.y,'★',pin.id,{value:stars});}}break;
     case 'save':if(!saveUsed&&!saved){saved=true;emit('save',pin.x,pin.y,'救球 +1',pin.id);}break;
     default:coins+=20*multiplier;emit('coin',pin.x,pin.y,'+'+20*multiplier,pin.id,{amount:20*multiplier});
    }
   }
   if(b.y>=floor){
    const bin=Math.max(0,Math.min(4,Math.floor(b.x/width*5)));
    if(saved&&!saveUsed&&time<10){saved=false;saveUsed=true;b.y=floor-12;b.vy=-600;b.vx=(rand()-.5)*400;emit('save',b.x,b.y,'再来一次');continue;}
    let amount=[100,300,80,500,200][bin]*multiplier;
    if(bin===2&&stars<3){stars++;emit('star',b.x,floor,'★',undefined,{value:stars});}
    const winsJackpot=bin===4&&stars>=3&&!jackpot;
    if(winsJackpot){stars=0;jackpot=true;amount+=10000;wheel=chooseWheel(seed,unlocked);emit('jackpot',b.x,floor,'10,000');}
    coins+=amount;emit('bank',b.x,floor,'+'+amount,undefined,{amount,bin,jackpot:winsJackpot});balls=balls.filter(other=>other!==b);
   }
  }
  if(tick%3===0||!balls.length)frames.push({t:time,balls:balls.map(b=>({id:b.id,x:b.x,y:b.y})),coins,multiplier,stars});
 }
 // The final drain prevents a dense real desktop from trapping a ball indefinitely.
 if(balls.length){const amount=100*balls.length*multiplier;coins+=amount;emit('bank',width/2,floor,'+'+amount,undefined,{amount});frames.push({t:time+dt,balls:[],coins,multiplier,stars});}
 const summary={collisionCoins:events.filter(e=>e.type==='coin').reduce((n,e)=>n+e.amount,0),landingCoins:events.filter(e=>e.type==='bank').reduce((n,e)=>n+e.amount,0)-(jackpot?10000:0),bonusCoins:jackpot?10000:0,maxMultiplier:multiplier,extraBalls:created-launchCount,starsEarned:events.filter(e=>e.type==='star').length};
 return {id,frames,events,duration:time+dt,coins,stars,jackpot,prize,wheel,launchCount,ballCount:created,summary};
}
