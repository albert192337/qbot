/* Original eye-only animation study. No head geometry or third-party paths. */
(function (root) {
'use strict';
const catalog = [
 ['neutral',1,'平静'],['attentive',2,'倾听'],['thinking',3,'思考'],
 ['focused',5,'集中'],['happy',6,'开心'],['excited',7,'兴奋'],
 ['laughing',8,'大笑'],['proud',9,'得意'],['shy',10,'害羞'],
 ['confused',12,'困惑'],['suspicious',13,'怀疑'],['angry',14,'生气'],
 ['annoyed',15,'不耐烦'],['sad',16,'难过'],['scared',17,'害怕'],
 ['surprised',18,'惊讶'],['bored',19,'无聊'],['drowsy',20,'困倦'],
 ['sleeping',21,'睡眠'],['waking',22,'醒来'],['wink_left',23,'左眼眨眼'],
 ['wink_right',24,'右眼眨眼'],['playful',25,'调皮'],
].map(([id,number,label])=>({id,number,label}));
const ids=new Set(catalog.map(x=>x.id));
const disabled=['searching','curious'];
// [relative width, relative height, arch in texture pixels, slope]
const presets={
 neutral:[[1,1,0,0],[1,1,0,0]], attentive:[[.93,1.07,0,0],[.93,1.07,0,0]],
 thinking:[[1,.65,0,-.08],[1,.8,0,-.08]], focused:[[.88,.8,0,0],[.88,.8,0,0]],
 happy:[[1.12,.18,5,0],[1.12,.18,5,0]], excited:[[1.05,1.12,0,0],[1.05,1.12,0,0]],
 laughing:[[1.16,.2,6,0],[1.16,.2,6,0]], proud:[[1,.5,1,.12],[1,.55,1,-.12]],
 shy:[[.82,.55,1,0],[.82,.55,1,0]], confused:[[.92,.8,0,-.2],[.92,.72,0,.15]],
 suspicious:[[1.08,.3,0,0],[1.08,.3,0,0]], angry:[[1,.5,0,-.55],[1,.5,0,.55]],
 annoyed:[[1,.38,0,-.16],[1,.38,0,.16]], sad:[[.92,.5,-2,.35],[.92,.5,-2,-.35]],
 scared:[[.72,.8,0,0],[.72,.8,0,0]], surprised:[[1.15,1.18,0,0],[1.15,1.18,0,0]],
 bored:[[1,.45,0,0],[1,.45,0,0]], drowsy:[[1,.22,-1,0],[1,.22,-1,0]],
 sleeping:[[1,.1,-1,0],[1,.1,-1,0]], waking:[[1,1,0,0],[1,1,0,0]],
 wink_left:[[1,1,0,0],[1,1,0,0]], wink_right:[[1,1,0,0],[1,1,0,0]],
 playful:[[1,.85,1,-.12],[1,.65,2,.12]],
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function pulse(t,start,duration){const x=(t-start)/duration;return x>0&&x<1?Math.sin(Math.PI*x)**2:0;}
function contour(box,p){
 const [x1,y1,x2,y2]=box,cx=(x1+x2)/2,cy=(y1+y2)/2,w=(x2-x1)*p[0],h=Math.max(1.3,(y2-y1)*p[1]);
 return Array.from({length:48},(_,i)=>{
  const t=i*Math.PI/24,c=Math.cos(t),s=Math.sin(t),r=Math.min(w,h)/2;
  const x=p[2] ? w/2*c : (w/2-r)*Math.sign(c)+r*c;
  const y=(p[2] ? h/2*s : (h/2-r)*Math.sign(s)+r*s)+p[2]*(c*c-.5)+p[3]*x;
  return [cx+x,cy+y];
 });
}
function create(api,gl,boxes){
 const canvases=boxes.map(()=>{const c=document.createElement('canvas');c.width=c.height=516;return c;});
 const textures=canvases.map(c=>new api.GLTexture(gl,c,false));
 const regions=textures.map(texture=>({renderObject:{page:{texture}},u:0,v:0,u2:1,v2:1}));
 let selected='neutral',time=0,total=0,transition=1,revision=0,lastPaint='',disposed=false;
 let points=boxes.map((b,i)=>contour(b,presets.neutral[i]));
 let from=points.map(p=>p.map(x=>x.slice()));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function select(id){
  if(!ids.has(id))throw Error('Unsupported expression: '+id);
  from=points.map(p=>p.map(x=>x.slice()));selected=id;time=0;total=0;transition=0;revision++;lastPaint='';
 }
 function update(dt,forceSleep=false){
  if(disposed)return;
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid expression time');
  time+=dt;total+=dt;transition+=dt;
  const id=forceSleep?'sleeping':selected,cycle=time%3.6;
  let values=presets[id].map(p=>p.slice());
  if(!reduced.matches){
   const wave=Math.sin(time*2.6);
   if(!['neutral','focused','bored'].includes(id))for(const p of values)p[1]*=1+.012*wave;
   if(id==='attentive'||id==='excited'||id==='surprised')for(const p of values)p[1]*=1+.04*Math.sin(time*4)*Math.exp(-cycle*.7);
   if(id==='happy'||id==='laughing')for(const p of values)p[2]+=(id==='laughing'?.7:.35)*Math.sin(time*(id==='laughing'?7:3));
   if(id==='thinking'||id==='confused'){values[0][1]+=.09*Math.sin(time*2);values[1][1]-=.07*Math.sin(time*2);}
   if(id==='angry'||id==='annoyed')for(const p of values)p[3]*=1+.12*Math.sin(time*3);
   if(id==='sad'||id==='drowsy')for(const p of values)p[1]*=1-.25*pulse(cycle,1.2,1.6);
   if(id==='scared')for(const p of values)p[0]*=1+.035*Math.sin(time*9);
   if(id==='waking')for(const p of values)p[1]=.1+.9*clamp(time/1.3,0,1);
   if(id==='sleeping')for(const p of values)p[2]+=.25*Math.sin(time*1.8);
   // Calibrated boxes are character L/R; visual left is the second eye.
   if(id==='wink_left'||id==='wink_right'){
    const i=id==='wink_left'?1:0,amount=pulse(cycle,.35,.85);
    values[i][1]=1-.88*amount;values[i][2]=3*amount;
   }
   if(id==='playful'){values[0][1]=.85-.6*pulse(cycle,.5,.8);values[1][2]+=Math.sin(time*3)*.6;}
   // Blink belongs to the same simulation clock as body playback/pause.
   if(!['sleeping','drowsy','waking','wink_left','wink_right','happy','laughing'].includes(id)){
    const blink=pulse(total%4.7,2.8,.28);for(const p of values)p[1]*=1-.92*blink;
   }
  }
  const mix=forceSleep||reduced.matches?1:clamp(1-Math.exp(-transition*10)*Math.cos(transition*12),0,1.04);
  points=boxes.map((b,i)=>contour(b,values[i]).map((p,j)=>p.map((v,k)=>from[i][j][k]+(v-from[i][j][k])*mix)));
  const signature=JSON.stringify(points.map(p=>p.map(v=>v.map(x=>Math.round(x*100)))));
  if(signature===lastPaint)return;lastPaint=signature;
  for(let i=0;i<2;i++){
   const c=canvases[i].getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,516,516);c.scale(4,4);c.fillStyle='#171719';
   c.beginPath();points[i].forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();textures[i].update(false);
  }
 }
 function apply(sk){
  ['eye_LA0','eye_RA0'].forEach((name,i)=>{const a=sk.findSlot(name).getAttachment();a.region=regions[i];a.updateUVs();sk.findSlot(name).color.set(1,1,1,1);});
  sk.findSlot('mouth_A0').color.a=0;
 }
 function snapshot(){return {selected,time,revision,points:points.map(p=>p.map(x=>x.slice())),reducedMotion:reduced.matches};}
 update(0);
 return {select,update,apply,snapshot,dispose(){if(!disposed){textures.forEach(t=>t.dispose());disposed=true;}}};
}
root.QBotExpressions={catalog,disabled,create};
})(globalThis);
