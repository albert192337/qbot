import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {furnitureThumbnail} from '../furniture/catalog';
import './capsule-reveal.css';

const urls=import.meta.glob('../tea3d/models/halloween-*.glb',{eager:true,query:'?url',import:'default'});
const palette={common:['#80e3cc','普通'],rare:['#c5a1ff','稀有'],epic:['#ffd389','史诗']};
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
function release(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
 const bitmaps=new Set();textures.forEach(t=>{if(t.source?.data?.close)bitmaps.add(t.source.data);t.dispose();});bitmaps.forEach(b=>b.close());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}

/** Pure presentation: all rewards have already been committed by the service. */
export function showFurnitureReveal(rewards,onComplete){
 const d=el('dialog','furniture-reveal'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let index=0,dispose=()=>{},closed=false;
 d.setAttribute('aria-label','3D 家具揭晓');document.body.append(d);d.showModal();
 const finish=()=>{if(closed)return;closed=true;dispose();d.close();d.remove();onComplete();};
 d.addEventListener('cancel',e=>{e.preventDefault();finish();});
 d.addEventListener('close',()=>{if(!closed)finish();});
 function show(){
  dispose();const item=rewards[index],[color,tier]=palette[item.tier];
  d.style.setProperty('--reveal-color',color);d.dataset.tier=item.tier;
  const top=el('header','reveal-top'),kicker=el('span','reveal-kicker','THE CABINET OF WONDERS'),skip=el('button','reveal-skip','跳过 · 查看全部');skip.onclick=finish;top.append(kicker,skip);
  const heading=el('div','reveal-heading');heading.append(el('span','reveal-rarity',`${tier}收藏 · 3D 家具`),el('h2','',item.name));
  const stage=el('div','reveal-stage');stage.setAttribute('aria-label',`${item.name}可旋转的立体模型`);
  const halo=el('div','reveal-halo'),rays=el('div','reveal-rays'),floor=el('div','reveal-floor'),flash=el('div','reveal-flash');
  stage.append(rays,halo,floor,flash);
  const loading=el('p','reveal-loading','正在唤醒这件收藏…');loading.setAttribute('role','status');stage.append(loading);
  const caption=el('p','reveal-caption','奖励已收入收藏 · 可在 3D 房间摆放');
  const toolbar=el('div','reveal-toolbar'),rotate=el('button','','暂停旋转'),next=el('button','reveal-next',index<rewards.length-1?'下一件收藏 →':'收下 · 查看全部奖励');
  rotate.disabled=true;next.onclick=()=>{if(index<rewards.length-1){index++;show();}else finish();};
  const counter=el('span','reveal-counter',`${index+1} / ${rewards.length}`);toolbar.append(rotate,counter,next);
  const hint=el('p','reveal-hint','拖动环视 · 滚轮缩放');d.replaceChildren(top,heading,stage,caption,toolbar,hint);
  let dead=false,renderer,scene,controls,model,frame=0,timer,observer,spinning=!reduced.matches,started=0;
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(!dead&&model){started=performance.now();frame=requestAnimationFrame(tick);}};
  const motion=()=>{spinning=!reduced.matches;rotate.textContent=spinning?'暂停旋转':'开启旋转';d.classList.toggle('reveal-still',reduced.matches);};motion();
  const resize=()=>{if(!renderer||dead)return;const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const camera=new T.PerspectiveCamera(34,1,.01,80);camera.position.set(0,1.55,5.8);
  dispose=()=>{dead=true;clearTimeout(timer);cancelAnimationFrame(frame);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);controls?.dispose();if(scene)release(scene);renderer?.dispose();renderer?.forceContextLoss();};
  function fallback(){if(dead)return;clearTimeout(timer);loading.textContent='模型暂时无法展示，奖励已入库';stage.dataset.ready='fallback';stage.append(furnitureThumbnail(item.item,item.name));hint.textContent='可稍后从「查看上次收获」重新打开';}
  let positions,particles,base=[];
  function tick(now){
   if(dead)return;const t=Math.max(0,(now-started)/1000),intro=reduced.matches?1:Math.min(1,t/1.2);
   model.scale.setScalar(1-Math.pow(1-intro,3));model.position.y=reduced.matches?0:Math.sin(t*1.3)*.045;
   controls.autoRotate=spinning;controls.update();
   if(particles){particles.visible=!reduced.matches;for(let i=0;i<base.length;i++){const [a,r,y,speed]=base[i],angle=a+t*speed;positions[i*3]=Math.cos(angle)*r;positions[i*3+1]=(y+t*.13)%3.8-.6;positions[i*3+2]=Math.sin(angle)*r;}particles.geometry.attributes.position.needsUpdate=true;}
   renderer.render(scene,camera);if(!document.hidden)frame=requestAnimationFrame(tick);
  }
  try{
   renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
   renderer.domElement.className='reveal-canvas';renderer.domElement.setAttribute('aria-label',`${item.name} 3D 预览`);stage.append(renderer.domElement);
   scene=new T.Scene();scene.add(new T.HemisphereLight('#e9e7ff','#614b3a',2.6));
   const key=new T.DirectionalLight('#fff0d7',4.2);key.position.set(3,5,5);scene.add(key);
   const rim=new T.DirectionalLight(color,3.5);rim.position.set(-4,2,-3);scene.add(rim);
   const fill=new T.DirectionalLight('#bddcff',2);fill.position.set(-4,1,4);scene.add(fill);
   controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.8,0);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=3.4;controls.maxDistance=9;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.82;controls.autoRotateSpeed=2.6;
   const count=item.tier==='epic'?115:item.tier==='rare'?70:35;positions=new Float32Array(count*3);
   for(let i=0;i<count;i++)base.push([i*2.39996,1.35+(i%13)/11,(i%29)/7,(i%2?1:-1)*(.07+(i%5)*.015)]);
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
   const dot=document.createElement('canvas');dot.width=dot.height=32;const ctx=dot.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'#fff');gradient.addColorStop(.22,color);gradient.addColorStop(1,'transparent');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
   particles=new T.Points(geometry,new T.PointsMaterial({size:.06,map:new T.CanvasTexture(dot),transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}));scene.add(particles);
   observer=new ResizeObserver(resize);observer.observe(stage);resize();
   document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motion);
   const url=urls[`../tea3d/models/${item.item}.glb`];if(!url)throw Error('missing model');
   let timedOut=false;timer=setTimeout(()=>{timedOut=true;fallback();},15000);
   new GLTFLoader().load(url,gltf=>{
    if(dead||timedOut){release(gltf.scene);return;}clearTimeout(timer);
    const asset=gltf.scene,box=new T.Box3().setFromObject(asset),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
    const scale=2.3/Math.max(size.x,size.y,size.z,.001);asset.position.copy(center).multiplyScalar(-scale);asset.position.y+=.85;asset.scale.setScalar(scale);
    model=new T.Group();model.add(asset);scene.add(model);loading.remove();stage.dataset.ready='true';
    rotate.disabled=false;rotate.onclick=()=>{spinning=!spinning;rotate.textContent=spinning?'暂停旋转':'开启旋转';};
    controls.addEventListener('start',()=>{spinning=false;rotate.textContent='开启旋转';});
    started=performance.now();frame=requestAnimationFrame(tick);
   },undefined,()=>fallback());
  }catch{fallback();}
 }
 show();
}
