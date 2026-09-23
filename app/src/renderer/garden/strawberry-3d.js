import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// One GPU context per garden window; each card receives a composited transparent image.
// This keeps ordinary DOM stacking, plot clicks, and modal clipping intact.
let renderer,environment,frame=0,last=0,time=0,failed=false;
const entries=new Set();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function gpu(){
 if(renderer)return renderer;
 renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
 environment=pm.fromScene(room,.04);room.dispose();pm.dispose();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
 return renderer;
}
function fallback(){failed=true;cancelAnimationFrame(frame);frame=0;for(const e of entries){e.canvas.remove();e.host.classList.remove('art-3d');e.host.dataset.renderError='true';e.dispose();}entries.clear();}
function mesh(g,m,parent,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
function material(color,extra={}){return new T.MeshStandardMaterial({color,roughness:.8,envMapIntensity:.2,...extra});}
function stem(parent,points,r=.024){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),18,r,6,false),material('#6b8650'),parent);}
function leaf(parent,x,y,z,angle,size){
 const shape=new T.Shape();shape.moveTo(0,0);
 // A gently toothed strawberry leaflet, with a visible central vein.
 for(let i=0;i<=12;i++){const t=i/12;shape.lineTo(Math.sin(t*Math.PI)*.38*(i%2?.87:1),t);}
 for(let i=12;i>=0;i--){const t=i/12;shape.lineTo(-Math.sin(t*Math.PI)*.38*(i%2?.87:1),t);}shape.closePath();
 const geo=new T.ShapeGeometry(shape,10),p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getY(i)*Math.PI)*.14+Math.abs(p.getX(i))*.2);geo.computeVertexNormals();
 const group=new T.Group();group.position.set(x,y,z);group.rotation.set(-.75,.1,angle);group.scale.setScalar(size);parent.add(group);
 mesh(geo,material('#416b3b',{side:T.DoubleSide}),group);
 stem(group,[[0,0,.01],[0,.45,.155],[0,.93,.035]],.009);
}
function flower(parent,x,y,z,size=.19){
 const g=new T.Group();g.position.set(x,y,z);g.rotation.x=-.5;parent.add(g);
 const petal=material('#fff9e1',{side:T.DoubleSide});
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const p=mesh(new T.SphereGeometry(size,12,8),petal,g,Math.sin(a)*size*.85,Math.cos(a)*size*.85,0);p.scale.set(.66,1,.23);p.rotation.z=-a;}
 mesh(new T.SphereGeometry(size*.43,12,8),material('#edbe4d'),g,0,0,.07);
}
function berry(parent,traits,ripe,x,y,z,scale){
 const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
 const has=t=>traits.includes(t),glass=has('crystal')||has('frost')||has('dew'),jade=has('jade'),prism=has('rainbow')||has('prism')||has('nebula');
 const color=!ripe?'#91b559':glass?'#bdebf0':jade?'#97d3ab':prism?'#c5a4e5':has('golden')?'#efc458':has('purple')?'#a883cb':has('mint')?'#9ed7b5':has('amber')||has('honey')?'#e6ad55':has('coral')?'#ee947c':'#bd2447';
 const mat=new T.MeshPhysicalMaterial({color,roughness:glass||jade||prism?.16:.55,metalness:has('golden')?.5:0,clearcoat:.45,transmission:ripe&&(glass||jade||prism)?.82:0,thickness:.8,ior:1.45,iridescence:prism?1:0,envMapIntensity:.85});
 const pts=[];for(let i=0;i<=36;i++){const t=i/36;pts.push(new T.Vector2(Math.pow(Math.sin(Math.PI*t),.72)*(.38+.4*t),t*1.7-.85));}
 const geo=new T.LatheGeometry(pts,48);geo.scale(1,1,.86);mesh(geo,mat,g);
 const seedGeo=new T.SphereGeometry(1,7,5),seedMat=material('#f7d99d',{roughness:.5});
 for(let row=0;row<6;row++){const t=.15+row*.125,r=Math.pow(Math.sin(Math.PI*t),.72)*(.38+.4*t);for(let j=0;j<10;j++){const a=j/10*Math.PI*2+(row%2)*.23;const seed=mesh(seedGeo,seedMat,g,Math.sin(a)*r*1.018,t*1.7-.85,Math.cos(a)*r*.876);seed.scale.set(.022,.043,.021);}}
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;leaf(g,0,.72,0,a,.37);}
 if(ripe&&(glass||jade||prism)){mesh(new T.IcosahedronGeometry(.22,1),new T.MeshStandardMaterial({color:'#d4efff',emissive:'#7facd7',emissiveIntensity:.25,roughness:.2}),g,0,0,0);}
 return g;
}
function createScene(mode,ratio,traits,regrowing){
 const scene=new T.Scene();scene.environment=environment.texture;
 scene.add(new T.HemisphereLight('#fff8df','#869b89',1.1));
 const sun=new T.DirectionalLight('#fff5e5',1.7);sun.position.set(-3,6,5);scene.add(sun);
 const rim=new T.DirectionalLight('#cbeaf2',.7);rim.position.set(3,3,-2);scene.add(rim);
 const model=new T.Group();scene.add(model);const moving=[];
 const plant=mode==='plant'||mode==='soil';
 if(plant){
  const soil=mesh(new T.SphereGeometry(1,40,16),material('#805a38'),model,0,-.015,0);soil.scale.set(1.08,.14,.73);
  for(let i=0;i<14;i++){const a=i*2.4,r=.35+(i%4)*.17;const clod=mesh(new T.DodecahedronGeometry(.037+(i%3)*.014),material(i%2?'#caa579':'#886448'),model,Math.sin(a)*r,.115,Math.cos(a)*r*.64);clod.scale.y=.5;}
 }
 if(mode==='plant'){
  const grown=regrowing||ratio>=.22,leafSize=grown?.8:.42;
  const bush=new T.Group();model.add(bush);moving.push({node:bush,type:'bush'});
  for(let i=0;i<(grown?3:2);i++){const a=i*2.4;const x=Math.sin(a)*.26,z=Math.cos(a)*.2,h=grown?.48+(i%2)*.16:.3;stem(bush,[[0,.1,0],[x*.4,h*.6,z*.6],[x,h,z]]);leaf(bush,x,h,z,a*.8,leafSize);if(grown){leaf(bush,x,h,z,a*.8+.8,.57);leaf(bush,x,h,z,a*.8-.8,.57);}}
  if(grown){
   stem(bush,[[0,.13,0],[.22,.85,-.06],[.48,1.05,.05]]);flower(bush,.48,1.06,.06,.14);
   if(ratio<.55){stem(bush,[[0,.13,0],[-.26,.75,.15],[-.42,.8,.23]]);flower(bush,-.42,.82,.23,.13);}
   if(ratio>=.55){for(let i=0;i<(traits.includes('twin')?3:2);i++){const x=i===0?-.48:i===1?.46:0,y=i===0?.55:.44,z=.46+i*.055;stem(bush,[[0,.18,0],[x*.6,1.03,z*.6],[x,y+.3,z]]);const b=berry(bush,traits,ratio>=.8,x,y,z,(traits.includes('giant')?.56:.39)*(ratio<.8?.75:1));b.rotation.z=i%2?-.16:.14;}}
  }
 }else if(mode==='fruit'){
  const b=berry(model,traits,true,0,.8,0,traits.includes('giant')?1.04:.86);moving.push({node:b,type:'fruit'});
  if(traits.includes('twin')){b.position.x=-.4;b.scale.multiplyScalar(.72);berry(model,traits,true,.43,.78,.04,.62);}
 }
 if(mode!=='soil'&&ratio>=.8){
  const glowy=traits.some(t=>['shiny','firefly','stardust','moon','halo','rainbow','prism','nebula','thunder'].includes(t));
  if(glowy)for(let i=0;i<6;i++){const p=mesh(new T.OctahedronGeometry(.035),new T.MeshBasicMaterial({color:i%2?'#ffe7a3':'#c9f5fc'}),model);moving.push({node:p,type:'spark',index:i});}
  if(traits.includes('classical')||traits.includes('breezy')){const bow=mesh(new T.TorusGeometry(.17,.035,8,24),material('#e7bb73'),model,0,.48,.76);bow.scale.x=1.4;}
  if(traits.includes('punk'))for(let i=0;i<3;i++)mesh(new T.ConeGeometry(.04,.12,5),material('#cbbaca',{metalness:.5}),model,-.24+i*.24,.9,.66);
  if(traits.includes('petals'))for(let i=0;i<3;i++)flower(model,-.7+i*.65,.4+(i%2)*.5,.15,.08);
 }
 model.rotation.y=-.18;
 const camera=new T.PerspectiveCamera(34,1,.1,30);camera.position.set(0,2.5,4.8);camera.lookAt(0,.62,0);
 return {scene,camera,moving,dispose(){const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());scene.clear();}};
}
function start(){if(!frame&&!failed&&!document.hidden)frame=requestAnimationFrame(draw);}
function draw(now){
 frame=0;if(document.hidden||failed)return;
 if(now-last<50){start();return;}const dt=Math.min((now-last)/1000,.1);last=now;if(!reduced.matches)time+=dt;
 for(const e of entries){
  if(!e.host.isConnected){if(e.mounted||now-e.created>1000){e.dispose();entries.delete(e);}continue;}e.mounted=true;
  const rect=e.canvas.getBoundingClientRect();if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth)continue;
  if(reduced.matches&&e.painted&&e.w===rect.width&&e.h===rect.height)continue;
  const width=Math.max(1,Math.ceil(rect.width*Math.min(devicePixelRatio,1.5))),height=Math.max(1,Math.ceil(rect.height*Math.min(devicePixelRatio,1.5)));
  if(e.canvas.width!==width||e.canvas.height!==height){e.canvas.width=width;e.canvas.height=height;}
  renderer.setSize(width,height,false);e.camera.aspect=width/height;e.camera.position.z=e.camera.aspect<.8?4.8*.8/e.camera.aspect:4.8;e.camera.updateProjectionMatrix();
  if(e.animate)e.animate(time);
  for(const m of e.moving){if(m.type==='bush')m.node.rotation.z=Math.sin(time*1.3)*.018;else if(m.type==='fruit')m.node.rotation.y=Math.sin(time*.7)*.08;else{const a=time*.4+m.index*1.05;m.node.position.set(Math.cos(a)*.9,.8+Math.sin(time+m.index)*.4,Math.sin(a)*.6);}}
  renderer.render(e.scene,e.camera);e.ctx.clearRect(0,0,width,height);e.ctx.drawImage(renderer.domElement,0,0);e.canvas.dataset.ready='true';e.painted=true;e.w=rect.width;e.h=rect.height;
 }
 if(entries.size)start();
}
export function mountStrawberry3D(host,{mode='fruit',ratio=1,traits=[],regrowing=false}={}){
 const stage=mode==='soil'?'soil':mode==='fruit'?'fruit':ratio<.22&&!regrowing?'sprout':ratio<.55?'flower':ratio<.8?'green':'ripe';
 return mountGardenModel3D(host,()=>createScene(mode,ratio,traits,regrowing),stage);
}
// Imported models use the same renderer, scheduling, fallback and DOM composition.
export function mountGardenModel3D(host,create,stage){
 if(failed)return false;
 try{gpu();const canvas=document.createElement('canvas');canvas.className='strawberry-canvas';canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
  const entry={host,canvas,ctx,...create(environment.texture),mounted:false,created:performance.now()};host.append(canvas);host.classList.add('art-3d');host.dataset.stage=stage;entries.add(entry);start();return true;
 }catch(error){console.warn('3D 草莓不可用，保留原画',error);fallback();return false;}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else start();});
reduced.addEventListener('change',()=>{for(const e of entries)e.painted=false;start();});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);for(const e of entries)e.dispose();entries.clear();environment?.dispose();renderer?.dispose();},{once:true});
