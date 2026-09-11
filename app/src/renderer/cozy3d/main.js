import './style.css';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Player } from '../pet/player';

const $ = id => document.getElementById(id);
const scene = new T.Scene();
const renderer = new T.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const camera=new T.OrthographicCamera(-5,5,5,-5,.1,100);
let angle=false,night=false,shadowOn=true;
function cameraPose(){camera.position.set(angle?8:9,8,angle?12:9);camera.lookAt(0,.9,0);camera.updateMatrixWorld();}
cameraPose();
const hemi=new T.HemisphereLight('#fff5dd','#b3ad96',2.6);scene.add(hemi);
const sun=new T.DirectionalLight('#fff0d0',3.6);sun.position.set(-3,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:25});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.shadow.radius=4;scene.add(sun);
const materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.82}));return materials.get(color);}
function mesh(parent,geometry,color,x,y,z){const m=new T.Mesh(geometry,typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,w,h,d,c,x,y,z,r=.09){return mesh(p,new RoundedBoxGeometry(w,h,d,4,Math.min(r,w/2,h/2,d/2)),c,x,y,z);}
function ball(p,x,y,z,sx,sy,sz,c){const m=mesh(p,new T.SphereGeometry(1,32,20),c,x,y,z);m.scale.set(sx,sy,sz);return m;}
function cyl(p,rt,rb,h,c,x,y,z){return mesh(p,new T.CylinderGeometry(rt,rb,h,48),c,x,y,z);}
const room=new T.Group();scene.add(room);
box(room,7.2,.32,7.2,'#c6b795',0,-.18,0,.15);
box(room,7,2.95,.19,'#e9e3cc',0,1.43,-3.48);
box(room,.19,2.95,7,'#c6d0b6',-3.48,1.43,0);
box(room,6.9,.16,.10,'#f8efd9',0,.10,-3.34,.04);box(room,.10,.16,6.9,'#f8efd9',-3.34,.10,0,.04);
for(let i=0;i<16;i++)for(let j=0;j<3;j++)box(room,.425,.04,2.30,['#d6bc90','#dac298','#dfc7a0','#d9c196'][(i+j)%4],-3.23+i*.43,.005,-2.32+j*2.32,.015);
// Window is inset-looking trim and sky; all furniture below is geometry, not image planes.
box(room,1.95,1.65,.16,'#f6eddb',.5,1.96,-3.31,.23);
box(room,1.67,1.38,.05,new T.MeshStandardMaterial({color:'#b7d9d0',emissive:'#8aada8',emissiveIntensity:.25,roughness:1}),.5,1.98,-3.21,.2);
box(room,.065,1.38,.07,'#fff5dd',.5,1.98,-3.16,.02);box(room,1.7,.065,.07,'#fff5dd',.5,1.98,-3.16,.02);box(room,2.15,.14,.4,'#f2e4c8',.5,1.11,-3.10,.05);
// Little wall picture and peg rail give scale without visual clutter.
box(room,.08,.92,.76,'#ae8b63',-3.32,1.94,.3,.04);box(room,.05,.77,.61,'#fff0d4',-3.26,1.94,.3,.03);
ball(room,-3.21,2,.3,.028,.19,.15,'#9eaf86');
const rug=cyl(room,1,1,.045,'#eee3c7',.2,.055,.65);rug.scale.set(2.1,1,1.57);
for(const r of [1.0,.96,.92]){const ring=mesh(room,new T.TorusGeometry(r,.008,6,100),'#cabb9b',.2,.082,.65);ring.rotation.x=-Math.PI/2;ring.scale.set(2,r===1?1.49:1.49,1);}
const furniture={};
function group(id,x,z){const g=new T.Group();g.position.set(x,0,z);scene.add(g);furniture[id]=g;return g;}
const sofa=group('sofa',-1.5,.1);
for(const x of [-.98,.98])for(const z of [-.37,.37])cyl(sofa,.075,.065,.25,'#aa815d',x,.16,z);
box(sofa,2.7,.37,1.12,'#e2d6b8',0,.39,0,.17);
box(sofa,2.55,.92,.35,'#f1e6cb',0,.95,-.43,.17);
for(const x of [-.62,.62]){box(sofa,1.16,.31,.89,'#fff0d5',x,.65,.10,.15);const b=box(sofa,1.12,.68,.27,'#eee0be',x,1.03,-.25,.12);b.rotation.x=-.09;}
for(const x of [-1.26,1.26])box(sofa,.31,.67,1.13,'#f3e7cc',x,.67,.02,.15);
const cushion=box(sofa,.50,.47,.20,'#acb997',-.78,1.0,.03,.1);cushion.rotation.z=.18;
const table=group('table',.85,1.05);
for(const a of [0,2.1,4.2]){const leg=cyl(table,.075,.095,.65,'#ae8054',Math.cos(a)*.48,.37,Math.sin(a)*.48);leg.rotation.z=Math.cos(a)*-.1;}
cyl(table,.79,.77,.16,'#d4ad77',0,.76,0);cyl(table,.765,.765,.025,'#e4c698',0,.85,0);
box(table,.46,.065,.32,'#a6b496',-.19,.90,0,.025);box(table,.42,.023,.29,'#fff2d8',-.19,.934,0,.009);
cyl(table,.115,.09,.19,'#faf0d7',.29,.96,.12);cyl(table,.092,.092,.007,'#95613f',.29,1.058,.12);
const handle=mesh(table,new T.TorusGeometry(.071,.025,12,24),'#f7e8c9',.415,.97,.12);
const lamp=group('lamp',-2.65,-1.5);cyl(lamp,.30,.33,.10,'#b6a57c',0,.10,0);cyl(lamp,.038,.045,1.70,'#ae946b',0,.93,0);
const shadeMat=new T.MeshStandardMaterial({color:'#f3d6a0',roughness:.75,emissive:'#ffc375',emissiveIntensity:.3});
const shade=mesh(lamp,new T.SphereGeometry(.51,48,24,0,Math.PI*2,0,Math.PI/2),shadeMat,0,1.85,0);shade.scale.y=.76;
cyl(lamp,.50,.48,.07,'#ffe4ae',0,1.84,0);
const lampLight=new T.PointLight('#ffc680',3,6,2);lampLight.position.set(-2.65,1.65,-1.5);scene.add(lampLight);
const shelf=group('shelf',1.95,-2.91);
box(shelf,1.30,1.62,.15,'#94a486',0,.91,-.21);
for(const x of [-.64,.64])box(shelf,.12,1.76,.56,'#a6b597',x,.94,0,.04);
for(const y of [.15,.67,1.22,1.79])box(shelf,1.40,.10,.61,'#adba9a',0,y,0,.045);
for(let i=0;i<6;i++)box(shelf,.115,.30+(i%3)*.055,.31,['#e1bb8e','#eee1be','#bcc8bb'][i%3],-.44+i*.15,.88+(i%3)*.027,0,.02);
box(shelf,.72,.30,.41,'#dbc9a3',0,.35,.01,.07);box(shelf,.16,.04,.015,'#a58a60',0,.39,.225,.01);
const plant=group('plant',2.65,-1.4);cyl(plant,.25,.18,.40,'#e6c5a3',0,.25,0);cyl(plant,.22,.22,.025,'#81694c',0,.465,0);cyl(plant,.022,.03,.65,'#81915e',0,.74,0);
for(let i=0;i<7;i++){const a=i*2.4;const leaf=ball(plant,Math.cos(a)*.18,.60+i*.085,Math.sin(a)*.17,.12,.27,.055,i%2?'#95ac76':'#b3c390');leaf.rotation.set(.2,a,Math.cos(a)*.65);}
const source=$('actorSource'),player=new Player(source,()=>{});
const actorCanvas=document.createElement('canvas');actorCanvas.width=512;actorCanvas.height=512;const ctx=actorCanvas.getContext('2d');
const actorTexture=new T.CanvasTexture(actorCanvas);actorTexture.colorSpace=T.SRGBColorSpace;
const actorMat=new T.MeshBasicMaterial({map:actorTexture,transparent:true,alphaTest:.03,depthWrite:true,side:T.DoubleSide,toneMapped:false});
const actor=new T.Mesh(new T.PlaneGeometry(1.65,1.65),actorMat);scene.add(actor);actor.visible=false;
// Vertical billboard: the foot stays on the floor; only yaw follows the camera.
const position=new T.Vector3(.5,0,2.1);let destination=position.clone();
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const grad=sc.createRadialGradient(64,64,1,64,64,64);grad.addColorStop(0,'rgba(65,49,31,.32)');grad.addColorStop(.4,'rgba(65,49,31,.15)');grad.addColorStop(1,'rgba(65,49,31,0)');sc.fillStyle=grad;sc.fillRect(0,0,128,128);
const shadowTexture=new T.CanvasTexture(shadowCanvas);const footShadow=new T.Mesh(new T.PlaneGeometry(1.15,.8),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));footShadow.rotation.x=-Math.PI/2;scene.add(footShadow);
let metas=[];
async function friends(){metas=await window.qbot.characters.list();for(const m of metas){const o=document.createElement('option');o.value=m.dirId;o.textContent=m.manifest.name;$('friend').append(o);}const active=await window.qbot.characters.getActive();$('friend').value=metas.some(m=>m.dirId===active?.dirId)?active.dirId:metas[0]?.dirId;if(metas.length)showFriend();}
function showFriend(){const m=metas.find(m=>m.dirId===$('friend').value);if(!m)return;actor.visible=false;ctx.clearRect(0,0,512,512);actorTexture.needsUpdate=true;const actions=player.load(m.dirId,m.manifest);if(actions.length)player.playLooping(actions.includes('idle')?'idle':actions[0]);}
$('friend').onchange=showFriend;
function setLight(value){night=value==='night';hemi.intensity=night?.8:2.6;sun.intensity=night?.28:3.6;sun.color.set(night?'#a6bde5':'#fff0d0');lampLight.intensity=night?10:3;shadeMat.emissiveIntensity=night?1:.3;actorMat.color.set(night?'#c9d1e0':'#ffffff');document.querySelectorAll('[data-light]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.light===value)));}
document.querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>setLight(b.dataset.light));
function place(x,z){position.set(x,0,z);destination.copy(position);}
$('front').onclick=()=>{place(-1.5,1.1);$('status').textContent='站在沙发前：看脚底柔影和角色的大小。';};
$('behind').onclick=()=>{place(-1.5,-.85);$('status').textContent='站在沙发后：身体被真实家具遮挡，不是简单叠图。';};
$('angle').onclick=()=>{angle=!angle;cameraPose();};
$('shadow').onclick=()=>{shadowOn=!shadowOn;$('shadow').setAttribute('aria-pressed',String(shadowOn));};
$('rotate').onclick=()=>{furniture[$('furniture').value].rotation.y+=Math.PI/4;place(.5,2.1);};
$('restore').onclick=()=>{Object.values(furniture).forEach(g=>g.rotation.y=0);place(.5,2.1);angle=false;cameraPose();$('zoom').value='100';resize();};
function resize(){const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height,false);const h=5.6/(Number($('zoom').value)/100);camera.left=-h*r.width/r.height;camera.right=h*r.width/r.height;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();}
const observer=new ResizeObserver(resize);observer.observe($('stage'));$('zoom').oninput=resize;
const ray=new T.Raycaster(),floor=new T.Plane(new T.Vector3(0,1,0),0);
const obstacles=()=>Object.values(furniture).map(g=>new T.Box3().setFromObject(g));
function free(p){return Math.abs(p.x)<3.1&&Math.abs(p.z)<3.1&&!obstacles().some(b=>p.x>b.min.x-.18&&p.x<b.max.x+.18&&p.z>b.min.z-.18&&p.z<b.max.z+.18);}
$('scene').onpointerdown=e=>{const b=$('scene').getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const p=new T.Vector3();if(ray.ray.intersectPlane(floor,p)&&free(p)){destination.copy(p);$('status').textContent='慢慢走过去。遇到家具会停下，暂未做绕行寻路。';}};
let last=0,paintAt=0,frame=0,disposed=false;
function tick(now){if(disposed||document.hidden){frame=0;return;}frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;if(now-paintAt<1000/30)return;paintAt=now;
 const delta=destination.clone().sub(position);if(delta.length()>.01){const next=position.clone().add(delta.setLength(Math.min(delta.length(),dt*2.2)));if(free(next))position.copy(next);else destination.copy(position);}
 const video=[...source.querySelectorAll('video')].find(v=>v.style.visibility==='visible'&&v.readyState>=2);const fallback=source.querySelector('img');const image=video||(fallback?.complete&&fallback.naturalWidth?fallback:null);
 if(image){ctx.clearRect(0,0,512,512);ctx.drawImage(image,0,0,512,512);actorTexture.needsUpdate=true;actor.visible=true;}
 actor.position.set(position.x,.81,position.z);actor.rotation.y=Math.atan2(camera.position.x,camera.position.z);footShadow.position.set(position.x,.09,position.z);footShadow.visible=shadowOn&&actor.visible;renderer.render(scene,camera);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;source.querySelectorAll('video').forEach(v=>v.pause());}else{last=performance.now();source.querySelectorAll('video').forEach(v=>{if(v.style.visibility==='visible')void v.play().catch(()=>{});});if(!frame)frame=requestAnimationFrame(tick);}});
window.addEventListener('beforeunload',()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();player.dispose();scene.traverse(o=>{o.geometry?.dispose();});materials.forEach(m=>m.dispose());actorMat.dispose();actorTexture.dispose();shadowTexture.dispose();footShadow.material.dispose();shadeMat.dispose();renderer.dispose();});
$('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;$('loading').textContent='绘图暂时中断，请重新打开试住小屋。';});
resize();frame=requestAnimationFrame(tick);$('loading').hidden=true;document.body.dataset.ready='true';void friends().catch(()=>{$('status').textContent='角色暂时没找到，仍可查看小屋。';});
