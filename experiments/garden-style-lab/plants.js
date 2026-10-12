import * as T from 'three';

export const names={bell:'蜜桃铃铛花',berry:'奶油草莓',mushroom:'绵云蘑菇花'};
export function specimens(stage,harvested=[]){return (stage==='new'?[{id:'p0',type:'bell',x:.12,z:.2,seed:true},{id:'p1',type:'mushroom',x:.34,z:-.35,seed:true},{id:'p2',type:'berry',x:.56,z:.3,seed:true},{id:'p3',type:'berry',x:.83,z:-.2,size:.68}]:[{id:'p0',type:'bell',x:-.81,z:-.1,size:1},{id:'p1',type:'berry',x:-.45,z:.3,size:.9},{id:'p2',type:'mushroom',x:-.03,z:-.45,size:.88},{id:'p3',type:'berry',x:.43,z:.2,size:1.04},{id:'p4',type:'bell',x:.81,z:-.3,size:1.07}]).map(p=>harvested.includes(p.id)?{...p,seed:true,size:undefined}:p);}
export const heightFor={bell:3.45,berry:2.8,mushroom:2.7};
export async function loadArt(){
 const out={};
 await Promise.all(Object.keys(names).map(async k=>{
  const im=new Image();im.src=`/plants/${k}.png`;await im.decode();
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
  const data=ctx.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0,transparent=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=data[(y*c.width+x)*4+3];if(a<10)transparent++;if(a>35){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}}
  const cut=document.createElement('canvas');cut.width=x1-x0+1;cut.height=y1-y0+1;cut.getContext('2d').drawImage(im,x0,y0,cut.width,cut.height,0,0,cut.width,cut.height);
  const tex=new T.CanvasTexture(cut);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=2;
  out[k]={image:cut,texture:tex,ratio:cut.width/cut.height,alpha:transparent/(c.width*c.height)};
 }));
 const sprout=document.createElement('canvas');sprout.width=180;sprout.height=220;const ctx=sprout.getContext('2d');ctx.strokeStyle='#86a657';ctx.lineWidth=11;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(88,208);ctx.quadraticCurveTo(76,140,92,63);ctx.stroke();ctx.fillStyle='#a9ca73';for(const [x,y,rx,ry,a]of [[59,110,36,17,.64],[118,64,35,19,-.65]]){ctx.beginPath();ctx.ellipse(x,y,rx,ry,a,0,Math.PI*2);ctx.fill()}const tex=new T.CanvasTexture(sprout);tex.colorSpace=T.SRGBColorSpace;const sd=ctx.getImageData(0,0,180,220).data;let transparent=0;for(let i=3;i<sd.length;i+=4)if(sd[i]<10)transparent++;out.sprout={image:sprout,texture:tex,ratio:180/220,alpha:transparent/(180*220)};
 return out;
}
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.7,...extra});
function ball(parent,m,x,y,z,sx,sy=sx,sz=sx){const o=new T.Mesh(new T.SphereGeometry(1,20,14),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o}
function tube(parent,m,points,r=.045){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const o=new T.Mesh(new T.TubeGeometry(curve,40,r,8,false),m);parent.add(o);return o}
function leaf(parent,m,x,y,z,angle,size=1){const o=ball(parent,m,x,y,z,.19*size,.48*size,.085*size);o.rotation.z=angle;o.rotation.x=.15;return o}
function flower(parent,m,x,y,z,size=.25){const g=new T.Group();g.position.set(x,y,z);parent.add(g);for(let i=0;i<5;i++){let a=i*Math.PI*2/5;const p=ball(g,m,Math.sin(a)*size*.8,Math.cos(a)*size*.8,0,size*.62,size*.8,size*.32);p.rotation.z=-a}ball(g,mat('#efc455'),0,0,.07,size*.46);return g}
export function makePlant(type,mutated=false,seed=false){
 const g=new T.Group();const green=mat('#92b85d'),dark=mat('#719951'),stem=mat('#8aaf63');
 if(seed){tube(g,stem,[[0,0,0],[0,.3,0],[.04,.61,0]],.038);leaf(g,green,-.14,.46,0,.9,.55);leaf(g,green,.18,.61,0,-.8,.57);return g}
 const glow=mutated?{emissive:'#c6c7ed',emissiveIntensity:.1,roughness:.25}:{};
 if(type==='bell'){
  tube(g,stem,[[0,0,0],[-.08,1.3,0],[.14,2.5,0],[.39,3.15,0],[.82,3.2,0],[1,2.93,0]],.055);
  tube(g,stem,[[0,1.25,0],[-.3,2.1,0],[-.8,2.35,0],[-1.05,2.05,0]],.04);
  tube(g,stem,[[0,.7,0],[.35,1.44,.1],[.7,1.5,.1],[.86,1.3,.1]],.04);
  const petal=mat(mutated?'#b5b7ef':'#ffd499',glow),inner=mat(mutated?'#ded5fa':'#ffeac4');
  for(const [x,y,z,s] of [[1,2.8,0,1],[-1.05,1.96,0,.76],[.86,1.24,.1,.62]]){
   const f=new T.Group();f.position.set(x,y,z);f.scale.setScalar(s);g.add(f);
   const profile=[new T.Vector2(.02,.18),new T.Vector2(.15,.13),new T.Vector2(.24,-.08),new T.Vector2(.31,-.35),new T.Vector2(.48,-.6),new T.Vector2(.42,-.67),new T.Vector2(.26,-.58),new T.Vector2(.17,-.28),new T.Vector2(.03,.1)];
   const bell=new T.Mesh(new T.LatheGeometry(profile,28),petal);f.add(bell);
   for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ball(f,petal,Math.cos(a)*.31,-.55,Math.sin(a)*.31,.19,.13,.19)}
   ball(f,inner,0,-.52,0,.22,.1,.22);ball(f,green,0,.14,0,.17,.08,.17);
  }
  leaf(g,green,-.42,.68,.1,.95,1.35);leaf(g,dark,.37,.91,-.04,-.85,1.25);leaf(g,green,-.24,1.49,0,.8,.95);
 }else if(type==='berry'){
  tube(g,stem,[[0,0,0],[.1,1.7,0],[.14,2.5,0]],.06);
  tube(g,stem,[[0,.35,0],[-.24,1.85,0],[-.72,1.96,0],[-.89,1.7,0]],.048);
  tube(g,stem,[[.03,.6,0],[.41,1.5,.1],[.86,1.57,.1],[1.02,1.36,.1]],.05);
  const fruit=mat(mutated?'#e9bfe2':'#f38c8b',glow),seedmat=mat('#fff1c1');
  for(const [x,y,z,s] of [[-.89,1.4,0,.49],[1.02,1.04,.1,.53]]){
   const f=new T.Group();f.position.set(x,y,z);g.add(f);
   const profile=[new T.Vector2(.015,-.65),new T.Vector2(.18,-.48),new T.Vector2(.4,-.15),new T.Vector2(.49,.15),new T.Vector2(.42,.4),new T.Vector2(.19,.51),new T.Vector2(.01,.48)];const mesh=new T.Mesh(new T.LatheGeometry(profile,24),fruit);mesh.scale.setScalar(s*1.6);f.add(mesh);
   for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const l=leaf(f,green,Math.sin(a)*.19,.38,Math.cos(a)*.19,0,.44);l.rotation.set(Math.cos(a)*.9,0,Math.sin(a)*.9)}
   for(let row=0;row<3;row++)for(let j=0;j<5;j++){const a=(j/5)*Math.PI*2+row*.45;const radius=[.19,.33,.3][row];const dot=ball(f,seedmat,Math.sin(a)*radius,(-.27+row*.2),Math.cos(a)*radius,.027,.044,.027);dot.rotation.z=.1}
  }
  flower(g,mat('#fff5d9'),.14,2.4,.08,.35);
  for(const [x,y,a,s,z] of [[-.39,.48,.9,1.25,.1],[.39,.43,-.9,1.3,.14],[-.41,1.02,.8,1.12,-.1],[.46,1.6,-.9,1.14,-.05]])leaf(g,green,x,y,z,a,s);
 }else{
  const stalk=mat('#f8e5b6'),cap=mat(mutated?'#a7d7e5':'#d5ade4',glow),capLight=mat(mutated?'#c4e5e7':'#edc5e6');
  for(const [x,y,z,s] of [[0,2.18,0,.79],[-.77,1.13,.04,.55],[.82,.93,.12,.49]]){
   tube(g,stalk,[[0,0,0],[x*.55,y*.55,z],[x,y,z]],.1*s+.03);
   ball(g,cap,x,y,z,s,.37*s,s*.77);
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,capLight,x+Math.sin(a)*s*.55,y-.07,z+Math.cos(a)*s*.4,s*.39,s*.2,s*.36)}
  }
  leaf(g,green,-.29,.41,.13,.9,1.05);leaf(g,green,.35,.37,.2,-.8,1.1);leaf(g,dark,.21,1.35,0,-.8,.7);
 }
 return g;
}
export function makeBunny(){const g=new T.Group(),cream=mat('#fff0d7'),eye=mat('#54483c'),pink=mat('#ecc6bc');ball(g,cream,0,.35,0,.36,.34,.29);ball(g,cream,0,.67,.08,.3,.28,.26);for(const x of [-.16,.16]){const ear=ball(g,cream,x,.98,.03,.1,.29,.085);ear.rotation.z=x>0?-.22:.22;ball(g,pink,x,1,.095,.045,.16,.025);ball(g,cream,x,.11,.2,.16,.1,.18);ball(g,eye,x*.77,.72,.311,.028,.038,.018);ball(g,pink,x*1.34,.63,.288,.046,.025,.016)}ball(g,pink,0,.64,.342,.027,.019,.015);ball(g,cream,.34,.31,-.14,.14);return g}
