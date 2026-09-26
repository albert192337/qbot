/* The 4.0 runtime matches the supplied 4.0.64 skeleton. */
(async()=>{
const canvas=document.querySelector('canvas');
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
if(!gl)throw Error('需要 WebGL 支持');
const renderer=new spine.SceneRenderer(canvas,gl);
const assets=new spine.AssetManager(gl);
const base='source/smalltown_spine_player/smalltown_spine_player';
assets.loadTextureAtlas(base+'.atlas.txt');assets.loadJson(base+'.json');
await assets.loadAll();
const raw=assets.get(base+'.json');
const atlas=assets.get(base+'.atlas.txt');
const data=new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(raw);
const skeletons=[new spine.Skeleton(data),new spine.Skeleton(data)];
const states=skeletons.map(()=>new spine.AnimationState(new spine.AnimationStateData(data)));
const isHood=new URLSearchParams(location.search).get('skin')!=='traveler';
const isWuxie=new URLSearchParams(location.search).get('skin')==='wuxie';
const skinFile=isWuxie?'wuxie':isHood?'hood':'traveler';
try{
 const response=await fetch(skinFile+'.atlas');
 if(response.ok){assets.loadTextureAtlas(skinFile+'.atlas');if(isHood)assets.loadJson(skinFile+'.json');await assets.loadAll();const otherData=new spine.SkeletonJson(new spine.AtlasAttachmentLoader(assets.get(skinFile+'.atlas'))).readSkeletonData(isHood?assets.get(skinFile+'.json'):raw);skeletons[1]=new spine.Skeleton(otherData);states[1]=new spine.AnimationState(new spine.AnimationStateData(otherData));document.querySelector('#new-name').textContent=isWuxie?'吴邪':isHood?'小黄鸡兜帽少年':'银发旅行者';document.querySelector('#new-note').textContent=isWuxie?'棕发小狗发饰 · 黄外套与工装裤':isHood?'黑发圆兜帽 · 豆豆眼与短线嘴':'六块 AI 新贴图 · 原骨骼与动画';}
 else document.querySelector('#new-note').textContent='新贴图尚未就绪 · 暂用原图';
}catch(e){throw Error('换皮加载失败：'+e.message);}
document.querySelector('#stats').textContent=`${data.bones.length} 根骨骼 / ${data.animations.length} 个动作`;
let current='ship_spine_idle',paused=false,speed=1,debug=false,elapsed=0;
function setAnimation(name){current=name;elapsed=0;for(let i=0;i<2;i++){skeletons[i].setToSetupPose();states[i].clearTracks();states[i].setAnimation(0,name,true);states[i].apply(skeletons[i]);skeletons[i].updateWorldTransform();}document.querySelector('#all').value=name;document.querySelectorAll('[data-animation]').forEach(b=>b.classList.toggle('active',b.dataset.animation===name));}
const actions=[['待机','ship_spine_idle'],['走路','ship_spine_walk'],['跑步','ship_spine_run'],['开心','town_face_xinxi'],['睡觉','ship_spine_sleep_cute'],['喝茶','town_post_player_taketea'],['贴贴','town_shuangren_tietie01']];
for(const [label,name]of actions){const b=document.createElement('button');b.textContent=label;b.dataset.animation=name;b.onclick=()=>setAnimation(name);document.querySelector('#actions').append(b);}
for(const a of data.animations){const o=document.createElement('option');o.value=a.name;o.textContent=a.name;document.querySelector('#all').append(o);}
document.querySelector('#all').onchange=e=>setAnimation(e.target.value);
document.querySelector('#pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'播放':'暂停';};
document.querySelector('#speed').oninput=e=>speed=Number(e.target.value);
document.querySelector('#bones').onchange=e=>debug=e.target.checked;
renderer.skeletonDebugRenderer.drawRegionAttachments=false;renderer.skeletonDebugRenderer.drawMeshHull=false;renderer.skeletonDebugRenderer.drawMeshTriangles=false;
const requestedAction=new URLSearchParams(location.search).get('action');
setAnimation(requestedAction&&data.findAnimation(requestedAction)?requestedAction:current);
const hoodBody=new Set(['右手_1无袖','左手_1无袖','躯干上部','腿右','腿右fk','腿左','腿左fk','发中面部']);
function applyHoodFace(sk){
 for(const slot of sk.slots)if(!hoodBody.has(slot.data.name))slot.color.a=0;
 const closed=current.includes('sleep')||elapsed%3.8>3.64;
 for(const [slotName,attachment]of [['eye_LA0',closed?'hood_eye_L_closed':'eye_L_default'],['eye_RA0',closed?'hood_eye_R_closed':'eye_R_default'],['mouth_A0','mouth_0']]){
  sk.setAttachment(slotName,attachment);sk.findSlot(slotName).color.set(1,1,1,1);
 }
}
function adaptTogetherKnees(sk){
 // The source choreography moves hips/feet sideways while keeping independent
 // knee targets nearly fixed. Limit that sideways kink for the long-pants skin.
 for(const side of ['L','R']){
  const hip=sk.findBone('leg_'+side+'0'),foot=sk.findBone('foot_'+side),knee=sk.findBone('knee_'+side);
  const dx=foot.worldX-hip.worldX,dy=foot.worldY-hip.worldY,len=Math.hypot(dx,dy);
  if(len<1)continue;
  const t=Math.max(.35,Math.min(.65,((knee.worldX-hip.worldX)*dx+(knee.worldY-hip.worldY)*dy)/(len*len)));
  const px=hip.worldX+t*dx,py=hip.worldY+t*dy;
  const offset=Math.max(-4,Math.min(4,((knee.worldX-px)*-dy+(knee.worldY-py)*dx)/len));
  const local=knee.parent.worldToLocal(new spine.Vector2(px-offset*dy/len,py+offset*dx/len));
  knee.x=local.x;knee.y=local.y;
 }
 sk.updateWorldTransform();
}
function draw(dt){elapsed+=dt;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);renderer.camera.position.set(0,220,0);renderer.camera.viewportWidth=1430;renderer.camera.viewportHeight=650;renderer.begin();for(let i=0;i<2;i++){const sk=skeletons[i];sk.x=i===0?-360:360;sk.y=0;if(i===1&&isHood&&current==='town_shuangren_tietie01'){for(const n of ['knee_L','knee_R']){const b=sk.findBone(n);b.x=b.data.x;b.y=b.data.y;}}states[i].update(dt);states[i].apply(sk);if(i===1){if(isHood)applyHoodFace(sk);else sk.findSlot('nose_0').color.a=0;}sk.updateWorldTransform();if(i===1&&isHood&&current==='town_shuangren_tietie01')adaptTogetherKnees(sk);renderer.drawSkeleton(sk,false);if(debug)renderer.drawSkeletonDebug(sk);}renderer.end();}
let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.06);last=now;draw(paused?0:dt*speed);requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.spineLab={raw,data,atlas,skeletons,states,renderer,setAnimation,draw,setPaused(v){paused=v;},ready:true};
document.body.dataset.ready='true';
})().catch(e=>{document.querySelector('#error').textContent=e.stack||String(e);console.error(e);});
