import './style.css';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { NetworkDriver } from '../pet/network-driver';
import { connectLiveRoom } from './live';
import { createActorSource } from './actor';
import { createModel,createShell,batchModel } from './models';
import { CATALOG,BY_ID,DEFAULT_LAYOUT,SAVE_KEY,restore,legal,extent,seatWorld } from './layout.mjs';

const params=new URLSearchParams(location.search),liveMode=params.has('live'),editorMode=params.has('editor'),official=liveMode||editorMode;
if(editorMode){try{window.qbot=window.parent.qbot;}catch{}}
let suspended=false;const cleanups=[];
const desktopMode=new URLSearchParams(location.search).has('desktop');
if(desktopMode)document.documentElement.classList.add('desktop');
let incoming=null;try{if(desktopMode)incoming=JSON.parse(decodeURIComponent(location.hash.slice(1)));}catch{}
const $=id=>document.getElementById(id),status=text=>$('status').textContent=text;
const urls=import.meta.glob('./models/*.glb',{eager:true,query:'?url',import:'default'});
const scene=new T.Scene(),world=new T.Group();scene.add(world);
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$('stage').append(renderer.domElement);
const camera=new T.PerspectiveCamera(36,1,.1,100),controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,1,0);controls.enableDamping=!desktopMode;controls.dampingFactor=.1;controls.enablePan=false;controls.enableRotate=!desktopMode;controls.minDistance=8;controls.maxDistance=23;controls.minPolarAngle=.10;controls.maxPolarAngle=1.53;controls.minAzimuthAngle=-1.45;controls.maxAzimuthAngle=1.45;
const hemi=new T.HemisphereLight('#d8e3de','#84745e',2.6);scene.add(hemi);
const sun=new T.DirectionalLight('#ffe0aa',2.6);sun.position.set(-3,7,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
// Soft frontal bounce lights the inward-facing left wall without adding a second shadow.
const fill=new T.DirectionalLight('#eee5d3',1.8);fill.position.set(4,3,7);fill.target.position.set(-2,1,0);scene.add(fill,fill.target);
const cool=new T.DirectionalLight('#90c3e3',1.2);cool.position.set(1,3,-5);scene.add(cool);
const shellSource=createShell(()=>{needsRender=true;}),sideSource=shellSource.getObjectByName('side-walls');shellSource.remove(sideSource);
const shell=batchModel(shellSource),sideWalls=batchModel(sideSource);shell.add(sideWalls);world.add(shell);
let wallsVisible=incoming?.wallsVisible??!official;
const floorLight=new T.PointLight('#ffb95c',4,5,2);floorLight.position.set(2.25,.8,.6);world.add(floorLight);
const furniture=new Map(),templates=new Map(),ray=new T.Raycaster(),pointer=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),0);
const marker=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:'#c0cf8e',transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.y=.05;marker.visible=false;world.add(marker);
const grid=new T.GridHelper(9,45,'#99b5a0','#99b5a0');grid.material.transparent=true;grid.material.opacity=.15;grid.position.y=.035;grid.visible=false;world.add(grid);
let layout=structuredClone(DEFAULT_LAYOUT),selected=null,drag=null,dirty=false,view='home',tower=null,disposed=false,draws=0,last=0,frame=0,needsRender=true,transition=null;
let desktopPointer=false;renderer.domElement.addEventListener('pointerdown',()=>{desktopPointer=true;});window.addEventListener('pointerup',()=>{desktopPointer=false;});window.addEventListener('pointercancel',()=>{desktopPointer=false;});window.addEventListener('blur',()=>{desktopPointer=false;});
const history=[],actors=[];let actorCursor=0;let characters=[];const guestIds=['',''];
try{const raw=localStorage.getItem(SAVE_KEY);if(raw)layout=restore(JSON.parse(raw));}catch{status('存档暂时不可读，先展示默认茶室');}
if(incoming?.layout)layout=restore(incoming.layout);
function changed(){dirty=true;needsRender=true;$('save').textContent='保存布置 ·';}
function snapshot(){history.push(JSON.stringify(layout));if(history.length>40)history.shift();$('undo').disabled=false;}
function instance(asset){const o=(templates.get(asset)||createModel(asset)).clone(true);o.traverse(n=>{if(n.isMesh){n.castShadow=asset!=='jade-rug';n.receiveShadow=true;}});return o;}
function rebuild(){for(const g of furniture.values())world.remove(g);furniture.clear();for(const p of layout){const g=instance(p.asset);g.position.set(p.x,0,p.z);g.rotation.y=p.angle;g.userData.key=p.key;world.add(g);furniture.set(p.key,g);}if(selected&&!furniture.has(selected))selected=null;refreshSelection();updateActors(0);needsRender=true;}
function chosen(){return layout.find(p=>p.key===selected);}
function refreshSelection(){const p=chosen();$('selection').hidden=!p||view==='tower';marker.visible=!!p&&view!=='tower';if(!p)return;const meta=BY_ID[p.asset];$('selected-name').textContent=meta.name;$('selected-info').textContent=meta.category==='seat'?'双人座位 · 可替换坐具':meta.category==='rug'?'地毯可以放在家具下方':'独立家具 · 自由摆放';
 const select=$('replace');select.replaceChildren();for(const a of CATALOG.filter(a=>a.category===meta.category)){const opt=document.createElement('option');opt.value=a.id;opt.textContent=a.name;select.append(opt);}select.value=p.asset;select.disabled=select.options.length<2;
 $('sit').hidden=!meta.seats;$('sit').disabled=!actors.some(a=>a.source.canSit);$('sit').textContent=actors.some(a=>a.source.canSit)?'坐在这里':'当前角色未接入坐姿';const e=extent(p);marker.scale.set(e.x*2+.1,e.z*2+.1,1);marker.position.set(p.x,.046,p.z);marker.material.color.set('#c0cf8e');
}
function select(key){selected=key;refreshSelection();needsRender=true;}
function cancelDrag(){if(!drag)return;const g=furniture.get(drag.key);if(g){g.position.set(drag.original.x,0,drag.original.z);g.rotation.y=drag.original.angle;}drag=null;controls.enabled=true;refreshSelection();needsRender=true;}
function point(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.ray.intersectPlane(floor,new T.Vector3());}
function hit(){for(const h of ray.intersectObjects([...furniture.values()],true)){let n=h.object;while(n&&!n.userData.key)n=n.parent;if(n)return n.userData.key;}return null;}
renderer.domElement.addEventListener('pointerdown',e=>{if(desktopMode||e.button!==0||view==='tower')return;const at=point(e),key=hit();if(!key||!at){select(null);return;}select(key);const p=chosen();controls.enabled=false;transition=null;drag={key,original:{...p},candidate:{...p},start:[e.clientX,e.clientY],offset:{x:p.x-at.x,z:p.z-at.z},moved:false,valid:true};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;const at=point(e);if(!at)return;if(Math.hypot(e.clientX-drag.start[0],e.clientY-drag.start[1])<4&&!drag.moved)return;drag.moved=true;const snap=$('snap').checked ? .2 : .01;const p={...drag.original,x:Math.round((at.x+drag.offset.x)/snap)*snap,z:Math.round((at.z+drag.offset.z)/snap)*snap};drag.candidate=p;drag.valid=legal(p,layout);const g=furniture.get(drag.key);g.position.set(p.x,.1,p.z);marker.position.set(p.x,.048,p.z);marker.material.color.set(drag.valid?'#b9d58b':'#ed8f74');status(drag.valid?'松手放下家具':'这里放不下，松手会回到原位');needsRender=true;});
renderer.domElement.addEventListener('pointerup',()=>{if(!drag)return;const d=drag;cancelDrag();if(d.moved&&d.valid){snapshot();Object.assign(layout.find(p=>p.key===d.key),d.candidate);rebuild();changed();status('已放下，可以继续调整');}else if(d.moved)status('保留原来的位置');});
renderer.domElement.addEventListener('pointercancel',cancelDrag);renderer.domElement.addEventListener('lostpointercapture',cancelDrag);window.addEventListener('blur',cancelDrag);
function move(dx,dz,angle=0){const p=chosen();if(!p)return;const next={...p,x:p.x+dx,z:p.z+dz,angle:(p.angle+angle)%(Math.PI*2)};if(!legal(next,layout)){status('空间不足，请先把家具移到空处');return;}snapshot();Object.assign(p,next);rebuild();changed();}
$('rotate').onclick=()=>move(0,0,Math.PI/4);$('remove').onclick=()=>{if(!selected)return;snapshot();for(const a of actors)if(a.seatKey===selected)stand(a);layout=layout.filter(p=>p.key!==selected);selected=null;rebuild();changed();status('家具已收起，可从下方重新添加');};
$('replace').onchange=e=>{const p=chosen();if(!p)return;const next={...p,asset:e.target.value};if(!legal(next,layout)){e.target.value=p.asset;status('这件家具需要更大的空间');return;}snapshot();Object.assign(p,next);rebuild();changed();status('家具已替换，位置和座位已保留');};
function add(asset){const meta=BY_ID[asset];if(layout.length>=30){status('样板最多摆放 30 件家具');return;}for(let z=-1.8;z<=2;z+=.35)for(let x=-3.8;x<=4;x+=.35){const p={key:crypto.randomUUID(),asset,x,z,angle:0};if(legal(p,layout)){snapshot();layout.push(p);rebuild();select(p.key);changed();status('已添入'+meta.name+'，拖到喜欢的位置');return;}}status('暂时没有足够空位，可以先收起一件家具');}
$('undo').onclick=()=>{if(!history.length)return;cancelDrag();layout=JSON.parse(history.pop());$('undo').disabled=!history.length;rebuild();changed();status('已撤销上一步');};
function roomState(){return{layout:structuredClone(layout),camera:{position:camera.position.toArray(),target:controls.target.toArray(),view},wallsVisible};}
async function saveRoom(){cancelDrag();if(official)await window.qbot.room.save3d(roomState());else localStorage.setItem(SAVE_KEY,JSON.stringify(layout));dirty=false;$('save').textContent='保存布置';status('已保存，桌面房间已更新');}
$('save').onclick=()=>{void saveRoom().catch(e=>status('保存失败：'+e.message+'，修改仍在'));};
$('reset').onclick=()=>{cancelDrag();snapshot();layout=structuredClone(DEFAULT_LAYOUT);for(const a of actors)stand(a);rebuild();changed();status('已恢复茶室，可撤销或保存');};
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('art-dialog').open)return;if(e.key==='Escape'){cancelDrag();select(null);return;}if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();return;}if(desktopMode||!chosen()||view==='tower')return;const n=e.shiftKey ? .2 : .05;if(e.key==='ArrowLeft')move(-n,0);else if(e.key==='ArrowRight')move(n,0);else if(e.key==='ArrowUp')move(0,-n);else if(e.key==='ArrowDown')move(0,n);else if(e.key.toLowerCase()==='r')move(0,0,Math.PI/4);else return;e.preventDefault();});

function setView(next,initial=false){if(desktopMode&&!initial)return;cancelDrag();view=next;for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===next));grid.visible=next==='edit';
 if(next==='tower'&&!tower){tower=new T.Group();const sh=shell.clone(true);tower.add(sh);for(const p of DEFAULT_LAYOUT){const g=instance(p.asset);g.position.set(p.x,0,p.z);g.rotation.y=p.angle;tower.add(g);}tower.position.y=3.55;tower.traverse(n=>{if(n.isLight)n.visible=false;});scene.add(tower);}if(tower)tower.visible=next==='tower';setWalls(wallsVisible);
 const pos=next==='edit'?[6,9,13]:next==='tower'?[5,7.8,21]:[0,4.6,13],target=next==='tower'?[0,2.8,0]:[0,1,0];controls.maxDistance=next==='tower'?29:23;transition={from:camera.position.clone(),to:new T.Vector3(...pos),start:performance.now(),targetFrom:controls.target.clone(),targetTo:new T.Vector3(...target)};refreshSelection();$('room-caption').textContent=next==='tower'?'两层展示 · 上层为陈设样例':'青竹 · 原木 · 青瓷';status(next==='tower'?'楼层总览 · 上层为展示样例，布置请切回生活或布置视角':'拖动家具布置，拖动空处调整视角');needsRender=true;
}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
function setWalls(visible){wallsVisible=visible;for(const root of [shell,tower])root?.traverse(o=>{if(o.name==='side-walls')o.traverse(n=>{n.visible=visible;});});$('walls').textContent=visible?'隐藏侧墙':'显示侧墙';$('walls').setAttribute('aria-pressed',String(!visible));needsRender=true;}
$('walls').onclick=()=>{setWalls(!wallsVisible);if(editorMode)changed();};
$('front').onclick=()=>{setView('home',true);transition=null;controls.target.set(0,1,0);camera.position.set(0,4.6,13);controls.update();needsRender=true;};
function orbit(delta){if(desktopMode)return;transition=null;const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);s.theta=T.MathUtils.clamp(s.theta+delta,controls.minAzimuthAngle,controls.maxAzimuthAngle);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();needsRender=true;}
$('left').onclick=()=>orbit(-.13);$('right').onclick=()=>orbit(.13);
function zoom(f){transition=null;const v=camera.position.clone().sub(controls.target);v.setLength(T.MathUtils.clamp(v.length()*f,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);controls.update();needsRender=true;}
$('zoom-in').onclick=()=>zoom(.9);$('zoom-out').onclick=()=>zoom(1.1);controls.addEventListener('change',()=>{needsRender=true;});controls.addEventListener('start',()=>{transition=null;});
$('art').src=new URL('./art/tea-concept.png',import.meta.url).href;$('concept').onclick=()=>$('art-dialog').showModal();$('close-art').onclick=()=>$('art-dialog').close();

function stand(a){a.seatKey=null;a.state='standing';a.anchor=null;a.anchorAt=performance.now()+100;a.player.play('idle',true);a.mesh.position.set(a.groundX??(-.75+a.slot*1.5),.78,1.9);needsRender=true;}
$('stand').onclick=()=>{for(const a of actors)stand(a);status('已回到地面');};
$('sit').onclick=()=>{const p=chosen();if(!p||!BY_ID[p.asset].seats)return;const occupied=new Set(actors.filter(a=>a.seatKey===p.key).map(a=>a.seatIndex));const index=[0,1].find(i=>!occupied.has(i));if(index===undefined){status('这张软榻已经坐满了');return;}const eligible=actors.filter(a=>a.source.canSit);const a=eligible.find(a=>!a.seatKey)||eligible[(actorCursor++)%eligible.length];if(!a)return;a.seatKey=p.key;a.seatIndex=index;a.state='seated';a.anchor=null;a.anchorAt=performance.now()+100;a.player.play('perch',true);updateActors(0);status('已试坐 · 座位随家具移动，第二次点击可坐入另一位');};
function disposeActor(a){world.remove(a.shadow);a.shadow.geometry.dispose();a.shadow.material.map.dispose();a.shadow.material.dispose();a.player.dispose();a.host.remove();world.remove(a.mesh);a.mesh.geometry.dispose();a.mesh.material.dispose();a.tex.dispose();}
function contactShadow(){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,31);gradient.addColorStop(0,'rgba(35,28,20,0.38)');gradient.addColorStop(.4,'rgba(35,28,20,0.23)');gradient.addColorStop(1,'rgba(35,28,20,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const map=new T.CanvasTexture(canvas),shadow=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.userData.noHit=true;world.add(shadow);return shadow;}
function switchGuest(slot,id,supplied){
 const old=actors.find(a=>a.slot===slot);if(old){disposeActor(old);actors.splice(actors.indexOf(old),1);}
 guestIds[slot]=id;if($('guest-'+slot))$('guest-'+slot).value=id;
 const char=supplied||characters.find(c=>c.dirId===id);
 if(char){const host=document.createElement('div');$('sources').append(host);let actor;const source=createActorSource(host,char,()=>actor?.onEnded?actor.onEnded():actor?.driver?.onVideoEnded()),{player,canvas}=source;
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.minFilter=T.LinearFilter;
 const mat=new T.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.15,depthWrite:true,side:T.DoubleSide,toneMapped:false,color:'#f3ece0'});
 const size=source.kind==='Spine'?2.12:1.7,shadow=contactShadow();const mesh=new T.Mesh(new T.PlaneGeometry(size,size),mat);mesh.name='guest-'+slot;world.add(mesh);
 const a=actor={slot,id,source,player,host,canvas,tex,mesh,size,shadow,seatKey:null,seatIndex:0,state:'standing'};actors.push(a);stand(a);}
 try{if(!desktopMode&&!official)localStorage.setItem(SAVE_KEY+'.guests',JSON.stringify(guestIds));}catch{}
 $('guest-note').textContent=actors.some(a=>!a.source.canSit)?'普通动画保留原有动作；坐姿需单独适配素材':'选择软榻可试坐，两位客人可分别替换';refreshSelection();needsRender=true;return actors.find(a=>a.slot===slot);
}
async function loadActors(){
 if(!window.qbot?.characters){status('从客户端打开可选择已有角色');return;}
 try{characters=(await window.qbot.characters.list()).filter(c=>c.manifest);
 let saved=incoming?.guests;try{saved??=JSON.parse(localStorage.getItem(SAVE_KEY+'.guests'));}catch{}
 const active=editorMode?await window.qbot.characters.getActive():null;
 const defaults=active?[active.dirId]:characters.filter(c=>c.manifest.spine?.actions?.perch).slice(0,2).map(c=>c.dirId);
 for(let slot=0;slot<2;slot++){
 const control=$('guest-'+slot);control.replaceChildren(new Option('不放角色',''));
 for(const c of characters)control.add(new Option((c.manifest.name||c.dirId)+' · '+(c.manifest.spine?'Spine':'动画'),c.dirId));
 const id=Array.isArray(saved)?saved[slot]:defaults[slot]||(editorMode?'':characters[slot]?.dirId||'');
 switchGuest(slot,characters.some(c=>c.dirId===id)?id:'');control.onchange=()=>switchGuest(slot,control.value);
 const a=actors.find(a=>a.slot===slot),seat=incoming?.seats?.[slot];
 if(a?.source.canSit&&seat&&layout.some(p=>p.key===seat.key&&BY_ID[p.asset]?.seats)&&[0,1].includes(seat.index)){
 a.seatKey=seat.key;a.seatIndex=seat.index;a.state='seated';a.player.play('perch',true);}
 }
 }catch(e){status('角色暂时未能加载：'+e.message);}
}
$('desktop').onclick=()=>{
 if(official){void saveRoom().then(()=>window.qbot.room.openHome()).catch(e=>status('保存失败：'+e.message));return;}
 cancelDrag();const url=new URL(location.href);url.search='?desktop=1';url.hash=encodeURIComponent(JSON.stringify({layout,camera:{position:camera.position.toArray(),target:controls.target.toArray(),view},wallsVisible,guests:guestIds,seats:[0,1].map(slot=>{const a=actors.find(a=>a.slot===slot);return a?.seatKey?{key:a.seatKey,index:a.seatIndex}:null;})}));
 const child=window.open(url.href,'_blank');status(child?'茶室已放到桌面，拖动顶部把手移动整间房':'当前预览尚不支持桌面窗口，请重新打开 3D 试住');
};
$('desktop-close').onclick=()=>liveMode?window.qbot.desktop.openMenu():window.close();
if(editorMode){document.querySelectorAll('.guests label').forEach((label,i)=>{label.firstChild.textContent='预览客人'+(i+1)+' ';});cleanups.push(window.qbot.characters.onActivated(meta=>{if(meta?.manifest)switchGuest(0,meta.dirId,meta);}));}
if(official){document.title='听雨茶室 · 房间装扮';document.querySelector('.badge').textContent='3D 房间';$('desktop').textContent='保存并放到桌面';}
if(liveMode){$('desktop-close').textContent='显示／隐藏';$('desktop-decor').hidden=false;$('desktop-mode').hidden=false;$('desktop-chat').hidden=false;$('desktop-decor').onclick=()=>window.qbot.room.openDecorEditor();$('desktop-mode').onclick=()=>void window.qbot.settings.set({roomRenderMode:'2d'});$('desktop-chat').onclick=()=>window.qbot.rooms.open();}

function updateActors(){for(const a of actors){a.source.update();if(a.canvas.dataset.ready!=='true'){a.mesh.visible=false;a.shadow.visible=false;continue;}a.mesh.visible=true;a.shadow.visible=true;a.tex.needsUpdate=true;if((!a.anchor||a.seatKey)&&performance.now()>a.anchorAt)a.anchor=a.source.anchor(a.seatKey?'seat':'floor');const p=layout.find(p=>p.key===a.seatKey);if(a.seatKey&&!p){stand(a);continue;}if(p){const display=drag?.key===p.key?drag.candidate:p;const s=seatWorld(display,a.seatIndex);if(s){const g=furniture.get(p.key);const forward=.36,ax=((a.anchor?.x??.5)-.5)*a.size,ay=((a.anchor?.y??.73)-.5)*a.size;a.mesh.position.set(s.x+Math.sin(p.angle)*forward-Math.cos(p.angle)*ax,s.y-.035+ay+(g?.position.y||0),s.z+Math.cos(p.angle)*forward+Math.sin(p.angle)*ax);a.mesh.rotation.set(0,p.angle,0);a.shadow.position.set(s.x,s.y+.009+(g?.position.y||0),s.z);a.shadow.scale.set(.62,.4,1);a.shadow.rotation.z=-p.angle;}}else{if(a.anchor)a.mesh.position.y=.025+(a.anchor.y-.5)*a.size;a.shadow.position.set(a.mesh.position.x,.031,a.mesh.position.z);a.shadow.scale.set(.75,.43,1);a.shadow.rotation.z=0;a.mesh.rotation.set(0,Math.atan2(camera.position.x-a.mesh.position.x,camera.position.z-a.mesh.position.z)*.35,0);}}}
function resize(){const r=$('stage').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.fov=2*Math.atan(Math.tan(Math.PI/10)*Math.max(1,1.9/camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();needsRender=true;}
const observer=new ResizeObserver(resize);observer.observe($('stage'));
function tick(now){if(disposed)return;frame=requestAnimationFrame(tick);if(suspended||document.hidden||now-last<1000/30)return;last=now;controls.update();if(transition){const t=Math.min(1,(now-transition.start)/650),v=1-(1-t)**3;camera.position.lerpVectors(transition.from,transition.to,v);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,v);controls.update();if(t===1)transition=null;needsRender=true;}if(actors.length){updateActors();needsRender=true;}if(needsRender){const lamp=layout.find(p=>p.asset==='lantern');floorLight.visible=!!lamp;if(lamp)floorLight.position.set(lamp.x,.8,lamp.z);renderer.render(scene,camera);draws++;document.body.dataset.draws=String(draws);needsRender=false;}}
function suspend(value){suspended=value;for(const a of actors){a.player.setSuspended(suspended||document.hidden);if(!suspended&&!document.hidden){if(a.driver)a.driver.dragEnd();else a.player.play(a.seatKey?'perch':'idle',true);}}needsRender=true;last=0;}
document.addEventListener('visibilitychange',()=>suspend(suspended));
async function thumbnails(){const tr=new T.WebGLRenderer({alpha:true,antialias:true});tr.setSize(184,130);tr.outputColorSpace=T.SRGBColorSpace;tr.toneMapping=T.ACESFilmicToneMapping;const sc=new T.Scene();sc.add(new T.HemisphereLight('#ffffff','#7a6951',3));const l=new T.DirectionalLight('#ffe6bd',3);l.position.set(-3,5,4);sc.add(l);const cam=new T.PerspectiveCamera(35,184/130,.01,30);
 for(const meta of CATALOG){const obj=instance(meta.id);sc.add(obj);const bound=new T.Box3().setFromObject(obj),size=bound.getSize(new T.Vector3()),center=bound.getCenter(new T.Vector3());const dist=Math.max(size.x*.9,size.y,size.z)*2;cam.position.copy(center).add(new T.Vector3(dist*.65,dist*.5,dist));cam.lookAt(center);tr.render(sc,cam);const b=document.createElement('button');b.className='item';b.dataset.asset=meta.id;b.setAttribute('aria-label','添加'+meta.name);const img=new Image();img.src=tr.domElement.toDataURL();img.alt='';const name=document.createElement('span');name.textContent=meta.name;const plus=document.createElement('em');plus.textContent='+';b.append(img,name,plus);b.onclick=()=>{if(view==='tower')setView('home');add(meta.id);};$('shelf').append(b);sc.remove(obj);}tr.dispose();tr.forceContextLoss();}
async function boot(){if(official){const saved=await window.qbot.room.get3d();if(saved){incoming=saved;layout=restore(saved.layout);wallsVisible=saved.wallsVisible;}}for(const meta of CATALOG){const url=urls[`./models/${meta.id}.glb`];let object;try{object=url?(await new GLTFLoader().loadAsync(url)).scene:createModel(meta.id);}catch{object=createModel(meta.id);document.body.dataset.modelFallback='true';}templates.set(meta.id,batchModel(object));}rebuild();camera.position.set(0,4.6,13);const shot=incoming?.camera;if(shot&&[shot.position,shot.target].every(v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<100))){setView(['home','edit','tower'].includes(shot.view)?shot.view:'home',true);transition=null;camera.position.fromArray(shot.position);controls.target.fromArray(shot.target);}setWalls(wallsVisible);controls.update();resize();await thumbnails();document.body.dataset.ready='true';status('茶室已就绪 · 选择家具，试着挪一挪');frame=requestAnimationFrame(tick);if(liveMode){cleanups.push(await connectLiveRoom({actors,create:switchGuest,remove:a=>{disposeActor(a);actors.splice(actors.indexOf(a),1);},stand,suspend,driver:NetworkDriver,status}));cleanups.push(window.qbot.room.on3dChanged(saved=>{layout=restore(saved.layout);setWalls(saved.wallsVisible);if(saved.camera){setView(saved.camera.view,true);transition=null;camera.position.fromArray(saved.camera.position);controls.target.fromArray(saved.camera.target);controls.update();}rebuild();}));}else await loadActors();}
// Inspection/export hooks are local to this specimen and never mutate account state.
window.tea3d={get cameraState(){return{position:camera.position.toArray(),target:controls.target.toArray(),view,wallsVisible,wallMeshes:sideWalls.children.filter(m=>m.visible).length};},get layout(){return structuredClone(layout);},get actors(){return actors.map(a=>({id:a.id,slot:a.slot,kind:a.source.kind,media:a.canvas.dataset.media,state:a.state,seatKey:a.seatKey,ready:a.canvas.dataset.ready,error:a.canvas.dataset.error,position:a.mesh.position.toArray(),shadowVisible:a.shadow.visible,shadowPosition:a.shadow.position.toArray(),size:a.size}));},get draws(){return draws;},select,setView,add,switchGuest:(slot,id)=>{switchGuest(slot,id);},suspend,desktopHit(x,y){if(drag||desktopPointer)return true;const el=document.elementFromPoint(x,y);if(el?.closest('#desktop-bar,.viewbar'))return true;const r=renderer.domElement.getBoundingClientRect();if(x<r.left||y<r.top||x>=r.right||y>=r.bottom)return false;pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects([world,...(tower?.visible?[tower]:[])],true).some(h=>h.object.visible&&!h.object.userData.noHit&&h.object!==marker&&h.object!==grid);},project(key){const p=furniture.get(key);if(!p)return null;const v=new T.Box3().setFromObject(p).getCenter(new T.Vector3()).project(camera),r=renderer.domElement.getBoundingClientRect();return{x:Math.round(r.left+(v.x+1)*r.width/2),y:Math.round(r.top+(1-v.y)*r.height/2)};},projectFloor(x,z){const v=new T.Vector3(x,0,z).project(camera),r=renderer.domElement.getBoundingClientRect();return{x:Math.round(r.left+(v.x+1)*r.width/2),y:Math.round(r.top+(1-v.y)*r.height/2)};},async exportModels(){const result={};for(const meta of CATALOG){const buffer=await new GLTFExporter().parseAsync(createModel(meta.id),{binary:true});result[meta.id]=Array.from(new Uint8Array(buffer));}return result;},stats(){return{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,models:templates.size,dirty};}};
window.addEventListener('beforeunload',()=>{disposed=true;cleanups.forEach(fn=>fn());cancelAnimationFrame(frame);observer.disconnect();controls.dispose();for(const a of actors)disposeActor(a);const geos=new Set(),mats=new Set(),textures=new Set();for(const root of [scene,...templates.values()])root.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();});
void boot().catch(e=>{status('茶室未能加载：'+e.message);document.body.dataset.error=e.message;console.error(e);});
