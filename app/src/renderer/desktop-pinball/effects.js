import {TYPES,OPEN_MS} from './model.mjs';
import {drawRewardCards,rewardCardPose,COLLECT_MS} from './reward-cards.js';
const tau=Math.PI*2;
export class PinballEffects{
 constructor(){this.trails=new Map();this.launches=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.trailFrames=0;this.landingFrames=0;this.openingFrames=0;this.active=false;this.recentBanks=new Map();}
 launch(points,now,origin){this.launches.push({points,at:now,origin});this.launches=this.launches.slice(-12);}
 draw(ctx,frame,width,height,now,presenting=false){
  const reduced=this.reduced.matches;
  for(const event of frame.events.filter(e=>e.type==='bank'))this.recentBanks.set(event.roundId+':'+event.t+':'+event.bin,{...event});
  for(const [id,event] of this.recentBanks){event.age=(now-event.at)/1000;if(event.age>=1.15)this.recentBanks.delete(id);}
  this.cardsVisible=presenting||this.recentBanks.size>0||this.launches.some(e=>now-e.at<OPEN_MS);
  if(this.cardsVisible)this.landingFrames+=drawRewardCards(ctx,{...frame,events:[...this.recentBanks.values()]},width,height,reduced,now);
  for(const event of this.recentBanks.values()){
   const t=Math.min(1,event.age*1000/COLLECT_MS);if(t>=1)continue;
   const p=rewardCardPose(event.bin??2,width,height,now,reduced),u=t*t*(3-2*t);
   const x=Math.max(p.x-p.w/2+4,Math.min(p.x+p.w/2-4,event.x)),y=reduced?p.y+p.h/2:event.y+(p.y+p.h/2-event.y)*u;
   ctx.save();ctx.globalAlpha=1-t*.5;ctx.fillStyle='#fff3c6';ctx.shadowColor='#f4cf7d';ctx.shadowBlur=reduced?0:12;ctx.beginPath();ctx.arc(x,y,8*(1-t*.7),0,tau);ctx.fill();ctx.restore();
  }
  const live=new Set(frame.balls.map(b=>b.id));for(const id of this.trails.keys())if(!live.has(id))this.trails.delete(id);
  for(const ball of frame.balls){
   const history=(this.trails.get(ball.id)||[]).filter(p=>now-p.at<90);
   if(!reduced&&history.length>1){
    ctx.save();ctx.lineCap='round';
    for(let i=1;i<history.length;i++){ctx.lineWidth=2+4*i/history.length;ctx.strokeStyle=`rgba(255,226,155,${i/history.length*.28})`;ctx.beginPath();ctx.moveTo(history[i-1].x,history[i-1].y);ctx.lineTo(history[i].x,history[i].y);ctx.stroke();}
    ctx.restore();this.trailFrames++;
   }
   if(!history.length||now-history.at(-1).at>=10)history.push({x:ball.x,y:ball.y,at:now});this.trails.set(ball.id,history.slice(-7));
   ctx.save();const gradient=ctx.createRadialGradient(ball.x-2,ball.y-3,0,ball.x,ball.y,9);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.45,'#fff3b7');gradient.addColorStop(1,'#ca953e');ctx.fillStyle=gradient;ctx.shadowColor='#ffe29a';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(ball.x,ball.y,8,0,tau);ctx.fill();ctx.restore();
  }
  this.launches=this.launches.filter(e=>now-e.at<OPEN_MS);
  this.active=this.launches.length>0||frame.events.length>0||this.recentBanks.size>0;
  for(const launch of this.launches){
   if(!launch.origin)continue;
   const t=Math.max(0,Math.min(1,(now-launch.at)/OPEN_MS)),u=reduced?1:1-(1-t)**2;
   this.openingFrames++;
   for(const p of launch.points){
    const x=launch.origin.x+(p.x-launch.origin.x)*u,y=launch.origin.y+(p.y-launch.origin.y)*u;
    ctx.save();ctx.strokeStyle='#ffe39aaa';ctx.lineWidth=4;ctx.lineCap='round';
    if(!reduced){const v=Math.max(0,u-.06);ctx.beginPath();ctx.moveTo(launch.origin.x+(p.x-launch.origin.x)*v,launch.origin.y+(p.y-launch.origin.y)*v);ctx.lineTo(x,y);ctx.stroke();}
    ctx.fillStyle='#fff6d2';ctx.shadowColor='#ffd879';ctx.shadowBlur=reduced?0:18;ctx.beginPath();ctx.arc(x,y,8,0,tau);ctx.fill();ctx.restore();
   }
  }
  // Local impact sparks only: no persistent icon badges or screen-wide confetti.
  if(!reduced)for(const event of frame.events.filter(e=>e.type==='hit'&&e.age<.28).slice(-16)){
   ctx.save();ctx.fillStyle=TYPES[event.role]?.color||'#ffe4aa';ctx.globalAlpha=(1-event.age/.28)*.8;
   for(let j=0;j<5;j++){const angle=j*tau/5+event.t*3,d=4+event.age*(35+j*8),x=event.contactX??event.x,y=event.contactY??event.y;ctx.beginPath();ctx.arc(x+Math.cos(angle)*d,y+Math.sin(angle)*d,1.6*(1-event.age/.35),0,tau);ctx.fill();}ctx.restore();
  }
  for(const event of frame.events){
   if(!event.text||['coin','hit','jackpot'].includes(event.type))continue;
   if(event.type==='bank'){if(event.jackpot&&!reduced){ctx.save();ctx.globalAlpha=(1-event.age/.9)*.8;ctx.fillStyle='#ffde87';for(let j=0;j<18;j++){const angle=Math.PI+j*Math.PI/17,d=20+event.age*(90+j%3*28);ctx.beginPath();ctx.arc(event.x+Math.cos(angle)*d,event.y+Math.sin(angle)*d+event.age*event.age*60,2,0,tau);ctx.fill();}ctx.restore();}continue;}
   const win=event.type==='bank'&&event.jackpot,age=event.age,offset=reduced?0:age*(win?55:30);
   ctx.save();ctx.globalAlpha=Math.min(1,(.9-age)/.25);ctx.fillStyle=win?'#ffe39a':TYPES[event.type]?.color||'#fff0c0';ctx.strokeStyle='#43342b';ctx.lineWidth=win?4:3;ctx.font='bold '+(win?34:18)+'px Segoe UI';ctx.textAlign='center';
   const text=event.type==='bank'?'+'+event.amount.toLocaleString('en-US'):event.text;
   const half=ctx.measureText(text).width/2+8,x=Math.max(half,Math.min(width-half,event.x));ctx.strokeText(text,x,event.y-28-offset);ctx.fillText(text,x,event.y-28-offset);ctx.restore();
   if(win&&!reduced){ctx.save();ctx.globalAlpha=(1-age/.9)*.8;ctx.fillStyle='#ffde87';for(let j=0;j<18;j++){const angle=Math.PI+j*Math.PI/17,d=20+age*(90+j%3*28);ctx.beginPath();ctx.arc(event.x+Math.cos(angle)*d,event.y+Math.sin(angle)*d+age*age*60,2,0,tau);ctx.fill();}ctx.restore();}
  }
 }
}
