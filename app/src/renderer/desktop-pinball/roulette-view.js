import {SPIN_MS,wheelAngle,wheelRevealed} from './roulette.mjs';
const tau=Math.PI*2,step=tau/8;
export class RouletteView{
 constructor(host,audio,onReveal){
  this.host=host;this.audio=audio;this.onReveal=onReveal;this.seen=new Set();this.active=false;this.phase='idle';this.id=null;this.angle=0;this.notch=null;
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.element=document.createElement('div');this.element.id='roulette';
  this.element.innerHTML='<canvas id="wheel-face" width="400" height="400" aria-label="加奖转盘"></canvas><i class="wheel-pointer"></i><div id="wheel-center">✦</div><span id="wheel-queue"></span><div id="wheel-result" aria-live="polite"></div>';
  host.append(this.element);this.canvas=this.element.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
 }
 draw(tickets,now,canSound){
  const ticket=tickets.find(t=>t.startedAt!=null);this.active=!!ticket;this.host.classList.toggle('roulette-active',this.active);
  if(!ticket){this.phase='idle';this.id=null;return;}
  const elapsed=Math.max(0,now-ticket.startedAt),reveal=wheelRevealed(ticket,now),wheel=ticket.wheel;
  if(ticket.id!==this.id){this.id=ticket.id;this.notch=null;}
  this.phase=reveal?'revealed':'spinning';this.element.dataset.phase=this.phase;this.element.dataset.ticket=ticket.id;
  this.angle=this.reduced.matches?(reveal?wheelAngle(wheel.index,SPIN_MS):0):wheelAngle(wheel.index,elapsed);
  const notch=Math.floor((this.angle+step/2)/step);
  if(notch!==this.notch&&this.notch!=null&&!reveal&&!this.reduced.matches&&canSound)this.audio.play('wheelTick');this.notch=notch;
  const queued=tickets.filter(t=>t.id!==ticket.id&&t.triggerAt<=now).length;
  this.element.querySelector('#wheel-queue').textContent=queued?'+'+queued:'';
  this.element.querySelector('#wheel-center').textContent=reveal?(wheel.prize==='petals'?'✿':wheel.prize==='orbit'?'✧':'◈'):'✦';
  this.element.querySelector('#wheel-result').textContent=reveal?((ticket.preview?'测试 · ':'')+(wheel.prize?wheel.label:'+'+wheel.label)):(ticket.preview?'测试':'加奖');
  const ctx=this.ctx;ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,200,200);ctx.save();ctx.translate(100,100);
  ctx.shadowColor='#c29d6250';ctx.shadowBlur=7;ctx.fillStyle='#c79548';ctx.beginPath();ctx.arc(0,0,96,0,tau);ctx.fill();ctx.shadowBlur=0;
  for(let i=0;i<8;i++){
   const sector=wheel.segments[i],center=-Math.PI/2+i*step+this.angle,a=center-step/2,b=center+step/2;
   ctx.fillStyle=sector.prize==='petals'?'#f2c3cf':sector.prize==='orbit'?'#d7c6ef':i===7?'#eab45c':i%2?'#f3d498':'#fff1ce';
   ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,89,a,b);ctx.closePath();ctx.fill();ctx.strokeStyle='#d2ad715c';ctx.lineWidth=1;ctx.stroke();
   if(reveal&&i===wheel.index){ctx.fillStyle='#ffffff66';ctx.fill();ctx.strokeStyle='#fff8dc';ctx.lineWidth=3;ctx.stroke();}
   ctx.save();ctx.rotate(center+Math.PI/2);ctx.fillStyle=sector.prize?'#7b547d':'#785325';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 10px "Microsoft YaHei",sans-serif';ctx.fillText(sector.label,0,-63);ctx.font='15px "Segoe UI Symbol"';ctx.fillText(sector.prize==='petals'?'✿':sector.prize==='orbit'?'✧':'◈',0,-42);ctx.restore();
  }
  for(let i=0;i<24;i++){const a=i*tau/24;ctx.fillStyle=reveal?'#fff9d2':i%2?'#fff4cf':'#e6bc75';ctx.beginPath();ctx.arc(Math.cos(a)*93,Math.sin(a)*93,1.5,0,tau);ctx.fill();}
  ctx.restore();
  if(reveal&&!this.seen.has(ticket.id)){this.seen.add(ticket.id);if(this.seen.size>128)this.seen.delete(this.seen.values().next().value);if(elapsed<SPIN_MS+150&&canSound)this.audio.play('jackpot');this.onReveal(ticket);}
 }
 stats(){return{id:this.id,phase:this.phase,angle:this.angle,active:this.active};}
}
