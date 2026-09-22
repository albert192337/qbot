import './style.css';
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const desktop=new URLSearchParams(location.search).has('desktop');
const companion=new URLSearchParams(location.search).has('companion');
if(companion)document.body.classList.add('companion');
if(desktop){document.body.classList.add('desktop');const handle=document.createElement('div');handle.className='desktop-handle';handle.textContent='拖动位置 · 右键换装 · Esc 关闭';document.body.append(handle);}
const groups = {
 fruit: {name:'果实', en:'FORM', values:[
  ['normal','原生','饱满的草莓轮廓','#ee768b','●'],
  ['giant','巨大','放大果实体积，保留完整挂饰','#efb7a1','◉'],
  ['twin','双生','两颗相依的小草莓','#dfa1b5','∞'],
  ['heart','心形','更宽的双肩与柔软尖端','#e8bdcd','♡'],
 ]},
 skin: {name:'果皮', en:'MATERIAL', values:[
  ['natural','原色','柔润红色果皮与金色籽点','linear-gradient(135deg,#ffb2ac,#d62355)',''],
  ['crystal','水晶','通透晶体、清晰折射与切面高光','linear-gradient(135deg,#fff,#91dcea,#dca7ff)',''],
  ['jade','玉石','温润半透，内部微光缓缓流动','linear-gradient(135deg,#f0ffdd,#53ae8c)',''],
  ['prism','虹彩','随角度变色的虹膜与流动星光','conic-gradient(#f6aaca,#9bdcff,#d3b9ff,#f4daac,#f6aaca)',''],
 ]},
 ornament: {name:'挂饰', en:'ORNAMENT', values:[
  ['none','无挂饰','专注欣赏果实本身','#f0f0e7','—'],
  ['butterfly','金蝶','金色蝴蝶振翅，绕果实起落','#f8edc9','⋈'],
  ['stars','星环','倾斜星环与环绕的星形挂坠','#e5ddf5','✧'],
  ['pearls','珠冠','珍珠冠、金链与水滴晶坠','#e0eee9','♧'],
 ]},
};
const presets = [
 {name:'田园初熟', sub:'原生 · 原色 · 无挂饰', fruit:'normal',skin:'natural',ornament:'none',icon:'♧',color:'#f9d8d4'},
 {name:'霜晶蝶梦', sub:'原生 · 水晶 · 金蝶',fruit:'normal',skin:'crystal',ornament:'butterfly',icon:'◇',color:'linear-gradient(135deg,#d3f8f3,#ddd4f8)'},
 {name:'翡翠双生',sub:'双生 · 玉石 · 珠冠',fruit:'twin',skin:'jade',ornament:'pearls',icon:'∞',color:'#d3e9d7'},
 {name:'星河之心',sub:'心形 · 虹彩 · 星环',fruit:'heart',skin:'prism',ornament:'stars',icon:'✧',color:'linear-gradient(135deg,#f4d3eb,#bfdaf7)'},
];
let state={fruit:'normal',skin:'crystal',ornament:'butterfly'}, strength=.7;
if(companion){state.skin=new URLSearchParams(location.search).get('skin')==='natural'?'natural':'crystal';state.ornament=state.skin==='natural'?'none':'butterfly';strength=.25;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let motion=!reduced.matches, rotating=!reduced.matches, dark=true, dragging=false, yaw=-.25, pitch=.06, zoom=5.7;
if(companion)rotating=false;
let renderer, scene, camera, fruitRoot, ornaments, sparkles, pedestal, environment;
let dynamic=[], seedMaterial, leafMaterial, skinMaterial, frame=0, last=0, elapsed=0, disposed=false;
let latestSize={width:1,height:1};
const canvas=$('scene');

function buildUI(){
 $('slots').innerHTML=Object.entries(groups).map(([key,g])=>`<fieldset class="slot"><legend>${g.name}<small>${g.en}</small></legend><div class="options">${g.values.map(([id,label,desc,color,icon])=>`<button class="option" data-slot="${key}" data-value="${id}" aria-pressed="false" title="${desc}"><span class="swatch" style="--swatch:${color}">${icon}</span>${label}</button>`).join('')}</div><p class="slot-desc" id="desc-${key}"></p></fieldset>`).join('');
 $('presets').innerHTML=presets.map((p,i)=>`<button class="preset" data-preset="${i}" aria-pressed="false"><span class="preset-icon" style="--swatch:${p.color}">${p.icon}</span><span><strong>${p.name}</strong><small>${p.sub}</small></span></button>`).join('');
 for(const button of document.querySelectorAll('[data-slot]'))button.addEventListener('click',()=>{state[button.dataset.slot]=button.dataset.value;rebuild();syncUI();});
 for(const button of document.querySelectorAll('[data-preset]'))button.addEventListener('click',()=>{const p=presets[Number(button.dataset.preset)];state={fruit:p.fruit,skin:p.skin,ornament:p.ornament};rebuild();syncUI();});
}
function syncUI(){
 const chosen=Object.entries(groups).map(([key,g])=>g.values.find(v=>v[0]===state[key]));
 for(const b of document.querySelectorAll('[data-slot]'))b.setAttribute('aria-pressed',String(state[b.dataset.slot]===b.dataset.value));
 Object.keys(groups).forEach((key,i)=>{$('desc-'+key).textContent=chosen[i][2];});
 const selected=presets.findIndex(p=>Object.keys(state).every(k=>p[k]===state[k]));
 for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(Number(b.dataset.preset)===selected));
 $('name').textContent=selected>=0?presets[selected].name:'我的奇珍草莓';
 $('specimen').textContent=selected>=0?`0${selected+1} / ${presets[selected].name}`:'CUSTOM / 自由培育';
 $('tags').innerHTML=chosen.map((v,i)=>`<span>${Object.values(groups)[i].name} · ${v[1]}</span>`).join('');
 $('rotate').textContent=rotating?'旋转中':'旋转暂停';$('rotate').setAttribute('aria-pressed',String(rotating));
 $('motion').textContent=motion?'动效开启':'动效暂停';$('motion').setAttribute('aria-pressed',String(motion));
 document.body.dataset.combination=Object.values(state).join('/');
}
function disposeTree(root){
 const geometries=new Set(),materials=new Set();
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();
}
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
function profile(t){return Math.pow(Math.sin(Math.PI*t),.72)*(.57+.65*t);}
function berryGeometry(){
 const points=[];for(let i=0;i<=56;i++){const t=i/56;points.push(new T.Vector2(profile(t),t*2.25-1.05));}
 const geo=new T.LatheGeometry(points,96);const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);let yy=y;
  if(state.fruit==='heart'&&y>.2)yy-=.18*Math.exp(-x*x*15)*(y-.2);
  pos.setXYZ(i,x*(state.fruit==='heart'?1.17:1),yy,z*.84);
 }geo.computeVertexNormals();return geo;
}
function leaf(angle,parent){
 const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.24,.13,-.28,.54,0,.83);shape.bezierCurveTo(.25,.5,.27,.12,0,0);
 const geo=new T.ShapeGeometry(shape,12);const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setZ(i,Math.sin(y*3.5)*.19);}
 geo.computeVertexNormals();const l=mesh(geo,leafMaterial,parent,0,1.08,0);l.rotation.set(-Math.PI*.57,0,angle);l.rotateZ(angle);return l;
}
function createBerry(parent,x,scale){
 const g=new T.Group();g.position.set(x,0,0);g.scale.setScalar(scale);parent.add(g);
 mesh(berryGeometry(),skinMaterial,g);
 if(companion&&state.skin==='natural'){const outline=mesh(berryGeometry(),new T.MeshBasicMaterial({color:'#4c4940',side:T.BackSide}),g);outline.scale.setScalar(1.025);}
 // Seeds follow the actual berry surface. Warm metal points contrast with cool glass.
 const seedGeo=new T.SphereGeometry(1,10,8);
 for(let row=0;row<(companion?6:9);row++){const t=.14+row*(companion?.125:.084),r=profile(t),count=Math.round((companion?5:9)+r*(companion?6:10));
  for(let j=0;j<count;j++){const a=j/count*Math.PI*2+(row%2)*.15;const sx=r*Math.sin(a),sz=r*Math.cos(a)*.84;
   const seed=mesh(seedGeo,seedMaterial,g,sx*(state.fruit==='heart'?1.17:1)*1.016,t*2.25-1.05,sz*1.016);
   seed.scale.set(.025,.049,.021);seed.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(sx,.18,sz).normalize());
  }
 }
 for(let i=0;i<7;i++)leaf(i/7*Math.PI*2,g);
 const stem=mesh(new T.CylinderGeometry(.045,.075,.3,12),leafMaterial,g,0,1.25,0);stem.rotation.z=-.22;
 if(state.skin!=='natural'){
  const core=mesh(new T.IcosahedronGeometry(.42,1),new T.MeshPhysicalMaterial({color:state.skin==='jade'?'#a2fac6':'#b7dcff',metalness:.1,roughness:.13,emissive:state.skin==='jade'?'#4aca96':'#6c9ce5',emissiveIntensity:.25,transparent:true,opacity:.7}),g,0,.07,0);
  dynamic.push({type:'core',node:core});
  const inner=new T.Group();g.add(inner);for(let i=0;i<11;i++){
   const m=mesh(new T.OctahedronGeometry(.025+(i%3)*.012),new T.MeshBasicMaterial({color:i%2?'#dffbff':'#fff4cf'}),inner,Math.sin(i*2.4)*.46,Math.cos(i*3.1)*.6,Math.cos(i*2.4)*.35);m.rotation.z=i;
  }dynamic.push({type:'inside',node:inner});
 }
 return g;
}
function starGeometry(){const s=new T.Shape();for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=i%2?.046:.11;i?s.lineTo(Math.sin(a)*r,Math.cos(a)*r):s.moveTo(Math.sin(a)*r,Math.cos(a)*r);}s.closePath();return new T.ExtrudeGeometry(s,{depth:.035,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,steps:1});}
function addOrnaments(){
 const gold=new T.MeshStandardMaterial({color:'#ffde8e',metalness:.8,roughness:.21,emissive:'#d99a30',emissiveIntensity:.13,side:T.DoubleSide});
 if(state.ornament==='none'){gold.dispose();return;}
 if(state.ornament==='butterfly')for(let i=0;i<3;i++){
  const b=new T.Group();ornaments.add(b);mesh(new T.CapsuleGeometry(.025,.15,4,8),gold,b);
  const wings=[];for(const side of [-1,1]){const pivot=new T.Group();b.add(pivot);const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(side*.6,.65,side*.68,-.02,side*.26,-.1);shape.bezierCurveTo(side*.51,-.5,side*.12,-.48,0,0);
   mesh(new T.ShapeGeometry(shape),gold,pivot);wings.push(pivot);
  }b.scale.setScalar(i===0?.6:.38);dynamic.push({type:'butterfly',node:b,wings,index:i});
 }
 if(state.ornament==='stars'){
  const ring=new T.Group();ornaments.add(ring);ring.rotation.set(.55,.1,-.38);
  const torus=mesh(new T.TorusGeometry(1.47,.012,8,100),gold,ring);torus.rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const star=mesh(starGeometry(),gold,ring,Math.cos(a)*1.47,0,Math.sin(a)*1.47);star.rotation.z=-a;}
  dynamic.push({type:'ring',node:ring});
 }
 if(state.ornament==='pearls'){
  const crown=new T.Group();ornaments.add(crown);crown.position.y=1.37;
  const rim=mesh(new T.TorusGeometry(.5,.022,8,64),gold,crown);rim.rotation.x=Math.PI/2;
  const pearl=new T.MeshPhysicalMaterial({color:'#fff4e1',metalness:.2,roughness:.15,clearcoat:1,iridescence:.4});
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;mesh(new T.SphereGeometry(.058,16,12),pearl,crown,Math.cos(a)*.5,.07,Math.sin(a)*.5);}
  const chain=new T.CatmullRomCurve3([new T.Vector3(-.65,.65,.53),new T.Vector3(-.37,.27,.79),new T.Vector3(0,.2,.88),new T.Vector3(.37,.27,.79),new T.Vector3(.65,.65,.53)]);
  mesh(new T.TubeGeometry(chain,40,.012,8,false),gold,ornaments);
  const drop=mesh(new T.OctahedronGeometry(.16),new T.MeshPhysicalMaterial({color:'#c4fbee',metalness:.25,roughness:.08,transmission:.7,thickness:.3}),ornaments,0,.01,.9);drop.scale.y=1.5;
  dynamic.push({type:'crown',node:crown});
 }
}
function rebuild(){
 if(!renderer)return;
 disposeTree(fruitRoot);disposeTree(ornaments);dynamic=[];
 const materialOptions={natural:{color:'#d91e46',roughness:.32,metalness:0,clearcoat:.7},crystal:{color:'#d4f5ff',roughness:.055,metalness:0,transmission:1,thickness:1.8,ior:1.48,attenuationColor:'#80dfe8',attenuationDistance:2.2,clearcoat:1,iridescence:.3},jade:{color:'#b8efb9',roughness:.19,metalness:0,transmission:.72,thickness:1.2,ior:1.36,attenuationColor:'#32aa73',attenuationDistance:1.3,clearcoat:1},prism:{color:'#d5c5ff',roughness:.08,metalness:.25,transmission:.8,thickness:1.5,ior:1.65,iridescence:1,iridescenceIOR:1.6,iridescenceThicknessRange:[180,480],clearcoat:1}};
 skinMaterial=new T.MeshPhysicalMaterial(materialOptions[state.skin]);
 if(companion){skinMaterial.roughness=state.skin==='natural'?.72:.23;skinMaterial.clearcoat=.22;skinMaterial.envMapIntensity=.65;if(state.skin==='natural')skinMaterial.color.set('#e97070');else{skinMaterial.transmission=.8;skinMaterial.thickness=1.1;}}
 seedMaterial=new T.MeshStandardMaterial({color:state.skin==='natural'?'#ffd494':'#fff0b5',metalness:.68,roughness:.28});
 leafMaterial=new T.MeshPhysicalMaterial({color:state.skin==='natural'?'#4f8b45':state.skin==='jade'?'#75b484':'#a5cbbb',roughness:.3,metalness:.15,clearcoat:1,side:T.DoubleSide});
 if(companion){seedMaterial.metalness=0;seedMaterial.roughness=.8;seedMaterial.color.set('#f7db98');leafMaterial.metalness=0;leafMaterial.roughness=.8;leafMaterial.clearcoat=0;leafMaterial.color.set('#8da778');}
 if(state.fruit==='twin'){createBerry(fruitRoot,-.48,.76).rotation.z=-.24;createBerry(fruitRoot,.48,.76).rotation.z=.24;}
 else createBerry(fruitRoot,0,state.fruit==='giant'?1.12:1);
 addOrnaments();render();start();
}
function initialize(){
 renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:desktop,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=companion?.9:1.18;
 scene=new T.Scene();scene.background=desktop?null:new T.Color('#172f34');
 if(desktop)renderer.setClearColor(0x000000,0);
 camera=new T.PerspectiveCamera(39,1,.1,40);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight('#dcfcff','#233d43',2.2));
 for(const [color,intensity,x,y,z] of [['#edfcff',65,-3,4,3],['#e2b9ff',45,3,2,-1],['#94ffe1',35,-2,-1,-3]]){const l=new T.PointLight(color,companion?intensity*.38:intensity,20);l.position.set(x,y,z);scene.add(l);}
 const object=new T.Group();object.name='specimen';object.position.y=.34;scene.add(object);fruitRoot=new T.Group();ornaments=new T.Group();object.add(fruitRoot,ornaments);
 pedestal=new T.Group();scene.add(pedestal);pedestal.visible=!desktop;
 mesh(new T.CylinderGeometry(1.4,1.5,.18,96),new T.MeshStandardMaterial({color:'#496063',metalness:.4,roughness:.32}),pedestal,0,-1.33,0);
 const rim=mesh(new T.TorusGeometry(1.41,.009,8,100),new T.MeshBasicMaterial({color:'#accbbd'}),pedestal,0,-1.24,0);rim.rotation.x=Math.PI/2;
 const ring=mesh(new T.RingGeometry(1.58,1.59,100),new T.MeshBasicMaterial({color:'#6c9695',side:T.DoubleSide,transparent:true,opacity:.4}),pedestal,0,-1.41,0);ring.rotation.x=-Math.PI/2;
 const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const ctx=glowCanvas.getContext('2d');const grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'#ffffff');grad.addColorStop(.12,'#d8ffff');grad.addColorStop(.35,'#a5f5ff88');grad.addColorStop(1,'#80caff00');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
 const texture=new T.CanvasTexture(glowCanvas);sparkles=new T.Group();scene.add(sparkles);
 for(let i=0;i<(companion?8:32);i++){const s=new T.Sprite(new T.SpriteMaterial({map:texture,color:i%3?'#c5faff':'#e6b7ff',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));s.scale.setScalar(.045+(i%3)*.024);sparkles.add(s);}
 const observer=new ResizeObserver(()=>{const box=$('stage').getBoundingClientRect();latestSize={width:box.width,height:box.height};renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();render();});observer.observe($('stage'));
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();disposeTree(scene);texture.dispose();environment.dispose();renderer.dispose();},{once:true});
 rebuild();start();document.body.dataset.ready='true';
}
function render(){if(!renderer||disposed)return;camera.position.set(0,.9,zoom);camera.lookAt(0,.12,0);const object=scene.getObjectByName('specimen');object.rotation.set(pitch,yaw,0);renderer.render(scene,camera);}
function tick(time){
 if(desktop&&last&&time-last<32){frame=requestAnimationFrame(tick);return;}
 frame=0;if(disposed||document.hidden)return;const dt=last?Math.min((time-last)/1000,.05):0;last=time;if(motion)elapsed+=dt;if(rotating&&!dragging)yaw+=dt*.18;
 const object=scene.getObjectByName('specimen');object.position.y=.34+(motion?Math.sin(elapsed*1.4)*.045*strength:0);
 for(const d of dynamic){const t=elapsed;
  if(d.type==='core'){d.node.rotation.set(t*.18,t*.32,t*.1);d.node.material.emissiveIntensity=.16+strength*(.16+.12*Math.sin(t*2));}
  if(d.type==='inside')d.node.rotation.y=t*.14;
  if(d.type==='butterfly'){const a=t*.38+d.index*2.1;d.node.position.set(Math.cos(a)*1.3,1.2+Math.sin(t*1.7+d.index)*.18,Math.sin(a)*1);d.node.rotation.y=-a;d.node.rotation.z=Math.sin(t+d.index)*.22;d.wings.forEach((w,i)=>w.rotation.y=(i?1:-1)*Math.sin(t*8+d.index)*.7);}
  if(d.type==='ring')d.node.rotation.y=t*.25;
  if(d.type==='crown')d.node.rotation.y=Math.sin(t*.7)*.07;
 }
 sparkles.visible=state.skin!=='natural'||state.ornament!=='none';sparkles.children.forEach((s,i)=>{const a=i*2.399+elapsed*.1;s.position.set(Math.sin(a)*(1.2+i%4*.25),-.8+((i*.137+elapsed*.12)%2.9),Math.cos(a)*(1.1+i%3*.2));s.material.opacity=strength*(.2+.65*Math.pow(Math.sin(elapsed*1.5+i),2));});
 render();if(motion||rotating)frame=requestAnimationFrame(tick);
}
function start(){if(!renderer||disposed||document.hidden)return;if(!frame){last=0;frame=requestAnimationFrame(tick);}}
buildUI();syncUI();
try{initialize();}catch(error){$('error').hidden=false;document.body.dataset.ready='error';console.error(error);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else start();});
$('rotate').onclick=()=>{rotating=!rotating;syncUI();start();};$('motion').onclick=()=>{motion=!motion;syncUI();start();};
reduced.addEventListener('change',()=>{if(reduced.matches){motion=false;rotating=false;syncUI();start();}});
$('strength').oninput=e=>{strength=Number(e.target.value)/100;$('strength-value').textContent=Math.round(strength*100)+'%';start();};
$('reset').onclick=()=>{state={fruit:'normal',skin:'natural',ornament:'none'};yaw=-.25;pitch=.06;zoom=5.7;rebuild();syncUI();start();};
$('backdrop').onclick=()=>{dark=!dark;document.querySelector('.viewer').classList.toggle('light',!dark);if(scene){scene.background.set(dark?'#172f34':'#e4efed');render();}};
let pointerX=0,pointerY=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;pointerX=e.clientX;pointerY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-pointerX)*.008;pitch=T.MathUtils.clamp(pitch+(e.clientY-pointerY)*.005,-.6,.6);pointerX=e.clientX;pointerY=e.clientY;render();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{dragging=false;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.003,4.8,7.8);render();},{passive:false});
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch-=.08;if(e.key==='ArrowDown')pitch+=.08;pitch=T.MathUtils.clamp(pitch,-.6,.6);render();});
