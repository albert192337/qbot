import {FLOOR_INSET} from './model.mjs';
export const COLLECT_MS=180;
const tiers=[['#476c739c','#a7d7d7'],['#385f939f','#a8d0ff'],['#725c939f','#d5b9f5'],['#397a689f','#a6e4c6'],['#987031ad','#ffe0a0']];
export function rewardCardPose(bin,width,height){
 return {x:(bin+.5)*width/5,y:height-FLOOR_INSET,w:width/5,h:24};
}
// One unobtrusive edge strip; adjacent targets share edges and never float.
export function drawRewardCards(ctx,frame,width,height,reduced,now){
 let flashes=0;
 for(let i=0;i<5;i++){
  const landing=frame.events.findLast(e=>e.type==='bank'&&(e.bin??2)===i&&e.age>=COLLECT_MS/1000);
  const age=landing?landing.age-COLLECT_MS/1000:10,flash=Math.max(0,1-age/.65);
  const {x,y,w,h}=rewardCardPose(i,width,height),left=x-w/2;
  const [tint,accent]=tiers[i];
  ctx.save();ctx.fillStyle=tint;ctx.fillRect(left,y,w,h);ctx.fillStyle=accent+'aa';ctx.fillRect(left,y,w,1.5);
  if(flash){flashes++;ctx.fillStyle=`rgba(210,222,224,${flash*.12})`;ctx.fillRect(left,y,w,h);}
  ctx.strokeStyle='#d7e1e523';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(left,y+.5);ctx.lineTo(left+w,y+.5);
  if(i){ctx.moveTo(left,y+5);ctx.lineTo(left,y+h-5);}ctx.stroke();
  const amount=landing?'+'+landing.amount.toLocaleString('en-US'):i===4&&frame.stars===3?'10,000':['100','300','80','500','200'][i];
  const label=(i===2?'☆ ':'')+amount+(i===4?'  '+ '•'.repeat(frame.stars)+'·'.repeat(3-frame.stars):'');
  ctx.font='600 11px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=flash?'#ffffff':accent;ctx.fillText(label,x,y+h/2,w-12);ctx.restore();
 }
 return flashes;
}
