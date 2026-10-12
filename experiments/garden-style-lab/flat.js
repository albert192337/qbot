import {specimens,heightFor} from './plants.js';
export class FlatGarden{
 constructor(canvas,art){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.art=art;this.pulses=new Map();this.time=0;this.resize()}
 resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;const d=Math.min(devicePixelRatio,1.5);this.canvas.width=r.width*d;this.canvas.height=r.height*d;this.ctx.setTransform(d,0,0,d,0,0)}
 click(id){this.pulses.set(id,this.time)}
 ground(x){return this.height-38-8*Math.sin(x/150)-4*Math.cos(x/79)}
 ellipse(x,y,rx,ry,color,angle=0){const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill()}
 leaf(x,y,size,angle){const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#a8c873';c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-size*.8,-size*.5,-size*.6,-size*1.4,0,-size);c.bezierCurveTo(size*.7,-size*1.1,size*.6,-size*.3,0,0);c.fill();c.restore()}
 bunny(x,y,t){const c=this.ctx;const pulse=Math.max(0,1-(t-(this.pulses.get('pet')??-10)));c.save();c.translate(x,y-Math.sin(pulse*Math.PI)*23);const sz=Math.min(1.2,this.width/1250);c.scale(sz,sz);this.ellipse(0,-4,27,5,'#6e8d5526');this.ellipse(0,-20,20,19,'#fff0d7');this.ellipse(0,-41,18,17,'#fff3de');this.ellipse(-10,-61,6,17,'#fff3de',-.2);this.ellipse(10,-61,6,17,'#fff3de',.2);this.ellipse(-10,-62,2.7,10,'#efc7be',-.2);this.ellipse(10,-62,2.7,10,'#efc7be',.2);this.ellipse(-11,-5,10,6,'#fff5e2');this.ellipse(11,-5,10,6,'#fff5e2');this.ellipse(-7,-43,2,2.9,'#655444');this.ellipse(7,-43,2,2.9,'#655444');this.ellipse(0,-37,1.9,1.2,'#cd9a92');this.ellipse(-12,-37,3.5,2,'#efc4b6');this.ellipse(12,-37,3.5,2,'#efc4b6');c.restore();return {id:'pet',type:'pet',x:x-24,y:y-82*sz,w:48,h:82*sz}}
 render(time,state,growth=1){this.time=time;const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);const start=state.stage==='new'?w*.49:0;
  const grad=c.createLinearGradient(0,h-80,0,h);grad.addColorStop(0,'#bad887');grad.addColorStop(1,'#a4c574');c.fillStyle=grad;c.beginPath();c.moveTo(start,h);for(let x=start;x<=w+8;x+=8)c.lineTo(x,this.ground(x)+(state.stage==='new'?Math.max(0,1-(x-start)/80)*36:0));c.lineTo(w,h);c.closePath();c.fill();
  c.fillStyle='#95b970';c.globalAlpha=.32;c.beginPath();c.moveTo(start,h);for(let x=start;x<=w+8;x+=10)c.lineTo(x,h-7-6*Math.sin(x/160));c.lineTo(w,h);c.fill();c.globalAlpha=1;
  const hits=[];const unit=Math.min(w/20,h/4.6);
  for(const [i,p] of specimens(state.stage,state.harvested).entries()){
   const x=w*(.5+p.x*.44),y=this.ground(x)+10+p.z*6,pulse=Math.max(0,1-(time-(this.pulses.get(p.id)??-10))/1.25);const sway=(state.wind?Math.sin(time*1.5+i*1.7)*.024:0)+Math.sin(pulse*15)*pulse*.09;const ph=(p.seed?.7:heightFor[p.type]*(p.size||1))*unit*growth,pw=ph*this.art[p.type].ratio;
   this.ellipse(x,y+2,p.seed?9:pw*.25,4,'#66844e20');c.save();c.translate(x,y);c.rotate(sway);
   if(p.seed){c.strokeStyle='#83a959';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-3,-ph*.5,1,-ph*.8);c.stroke();this.leaf(-1,-ph*.43,ph*.38,-.9);this.leaf(1,-ph*.69,ph*.34,.85)}else{
    if(state.mutate)c.filter=p.type==='bell'?'hue-rotate(290deg) saturate(.8)':p.type==='mushroom'?'hue-rotate(285deg) saturate(.75)':'hue-rotate(315deg) saturate(.7)';c.drawImage(this.art[p.type].image,-pw/2,-ph,pw,ph);c.filter='none';
   }c.restore();
   if(pulse>0){for(let j=0;j<5;j++){const a=j*1.256+time;this.ellipse(x+Math.cos(a)*(1-pulse)*50,y-ph*.55+Math.sin(a)*(1-pulse)*35,(2+pulse)*pulse,(2+pulse)*pulse,'#fff5bb')}}
   hits.push({id:p.id,type:p.type,seed:p.seed,x:x-pw*.45,y:y-ph,w:pw*.9,h:ph});
  }
  for(let i=0;i<(state.stage==='new'?5:14);i++){const x=start+23+i*(w-start)/(state.stage==='new'?5:14);const y=this.ground(x)+22;this.leaf(x,y,8,-.8);this.leaf(x+2,y,10,.2);this.leaf(x+3,y,7,.9)}
  const petX=w*(state.stage==='new'?.71:.38);hits.push(this.bunny(petX,this.ground(petX)+16,time));return hits;
 }
}
