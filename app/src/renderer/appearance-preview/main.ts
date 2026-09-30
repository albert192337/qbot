import { Application, Assets, Rectangle, BlurFilter, Container, Graphics, Sprite, Texture, VideoSource } from 'pixi.js';
import { createPortalFilter } from './portal';
import { createEdgeFilter, createFlameFilter } from './materials';
import { SpinePlayer } from '../pet/spine-player';
import './style.css';

type Mode = 'portal' | 'footprints' | 'echo';
type Meta = Awaited<ReturnType<typeof window.qbot.characters.list>>[number];
type Trace = { sprite: Sprite; age: number; life: number; kind: 'foot' | 'echo' | 'dust'; ownTexture?: boolean; vx?: number; vy?: number; spin?:number; size?:number; phase?:number; originX?:number; originY?:number };
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));
const smooth=(v:number)=>{v=clamp(v);return v*v*(3-2*v);};
const ease=(v:number)=>1-(1-clamp(v))**3;
const app=new Application();
const viewport=$('viewport'), scene=$('scene'), select=$<HTMLSelectElement>('character'), replay=$<HTMLButtonElement>('replay');
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=systemMotion.matches,mode:Mode='portal',disposed=false,ready=false,loading=false;
let width=1,height=1,actorHeight=260,artWidth=320,artHeight=320;
let ax=.5,ay=.96,bboxHeight=.82,footX=0,footY=0,lastPrintX=0,lastPrintY=0,step=0;
let elapsed=99,walk=false,drag=false,demoDrag=false,dragOffset={x:0,y:0},lastEcho=0;
let frameTime=0,version=0,media:HTMLVideoElement|undefined,videoSource:VideoSource|undefined,meta:Meta|undefined;
let currentAction='',resources:Meta[]=[],traces:Trace[]=[];
let spine:SpinePlayer|undefined,spineCanvas:HTMLCanvasElement|undefined,spineHost:HTMLDivElement|undefined;
let flameTextures:Texture[]=[];
let lastStep=-1,landingCount=0,lastFlameX=0,lastFlameY=0;
const back=new Container(),trail=new Container(),foreground=new Container();
const actor=new Sprite(),shadow=new Sprite(),floorGlow=new Sprite(),portal=new Sprite(Texture.WHITE);
const material=createPortalFilter(),entranceBlur=new BlurFilter({strength:0,quality:3});
const edgeRepair=createEdgeFilter(),flameMaterials=[0,2.1,4.7].map(createFlameFilter);
const actorFilters=()=>spine?[]:[edgeRepair];
const dustSeeds=Array.from({length:22},(_,i)=>({angle:i*2.39996,r:.48+(i%5)*.055,speed:.12+(i%3)*.04,phase:i*.71}));
const portalDust=new Graphics();

function canvasTexture(draw:(ctx:CanvasRenderingContext2D)=>void,size=128):Texture{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  draw(canvas.getContext('2d')!);return Texture.from(canvas);
}
const glow=canvasTexture(c=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fff');g.addColorStop(.18,'#ffffffa0');g.addColorStop(.55,'#ffffff25');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,128,128);});
const footprint=canvasTexture(c=>{
  c.translate(64,64);c.rotate(-.4);
  const g=c.createLinearGradient(-28,-32,25,38);g.addColorStop(0,'#fff1e8');g.addColorStop(.38,'#f9c6d9');g.addColorStop(.75,'#cf789f');g.addColorStop(1,'#995879');c.fillStyle=g;
  c.beginPath();c.moveTo(0,43);c.bezierCurveTo(-8,21,-41,8,-32,-23);c.bezierCurveTo(-26,-43,-8,-41,0,-29);c.bezierCurveTo(12,-42,31,-35,33,-15);c.bezierCurveTo(35,9,10,30,0,43);c.fill();
  c.strokeStyle='#ffe8eb50';c.lineWidth=.8;c.beginPath();c.moveTo(0,36);c.quadraticCurveTo(5,3,0,-26);c.stroke();
});
const glint=canvasTexture(c=>{c.translate(64,64);c.fillStyle='#fff2df';c.beginPath();c.moveTo(0,-38);c.quadraticCurveTo(5,-5,24,0);c.quadraticCurveTo(5,5,0,38);c.quadraticCurveTo(-5,5,-24,0);c.quadraticCurveTo(-5,-5,0,-38);c.fill();});

function setStatus(text:string){$('status').textContent=text;}
function setReady(value:boolean){ready=value;replay.disabled=!value;document.body.dataset.ready=String(value);}
function baseline(){return height*.79;}
function layout(){
  const r=scene.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);
  app.renderer.resize(width,height);actorHeight=Math.min(280,height*.61,width*.55);
  if(!drag&&!walk&&!demoDrag){footX=width*.52;footY=baseline();}
  sizeActor();positionActor();
}
function sizeActor(){
  artHeight=actorHeight/bboxHeight;artWidth=artHeight*(spine?1:media?media.videoWidth/media.videoHeight:1);
  actor.width=artWidth;actor.height=artHeight;actor.anchor.set(ax,ay);
}
function positionActor(scale=1){
  actor.position.set(footX,footY);actor.width=artWidth*scale;actor.height=artHeight*scale;
  shadow.position.set(footX,footY+3);shadow.width=actorHeight*.55;shadow.height=actorHeight*.12;
  floorGlow.position.set(footX,footY+3);floorGlow.width=actorHeight*.9;floorGlow.height=actorHeight*.23;
}
function clearTraces(){for(const t of traces){t.sprite.destroy({texture:!!t.ownTexture,textureSource:!!t.ownTexture});}traces=[];}
function reset(){
  drag=false;walk=false;demoDrag=false;elapsed=99;clearTraces();
  portal.visible=false;portalDust.clear();actor.visible=true;actor.alpha=1;actor.filters=actorFilters();
  if(spine){spine.play('idle',true);currentAction='idle';}
  footX=width*.52;footY=baseline();positionActor();shadow.alpha=.32;floorGlow.alpha=.1;
  scene.style.cursor=mode==='echo'?'grab':'default';
}
function assetURL(dir:string,file:string){return `qbot-asset://${encodeURIComponent(dir)}/${file.split('/').map(encodeURIComponent).join('/')}`;}
async function loadAction(action:string,measure=false){
  if(!meta)return;
  const manifest=meta.manifest,slot=manifest.actions[action as keyof typeof manifest.actions]??manifest.customActions?.[action];
  const file=slot?.webm;if(!file)return;
  const request=++version;loading=true;setReady(false);reset();
  const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.crossOrigin='anonymous';
  try{
    await new Promise<void>((resolve,reject)=>{
      const timeout=setTimeout(()=>{video.removeAttribute('src');video.load();reject(Error('角色动画加载超时'));},12000);
      video.onloadeddata=()=>{clearTimeout(timeout);resolve();};video.onerror=()=>{clearTimeout(timeout);reject(Error('角色动画暂时无法读取'));};
      video.src=assetURL(meta!.dirId,file);
    });
    if(request!==version||disposed){video.removeAttribute('src');video.load();return;}
    await video.play();
    if(request!==version||disposed){video.pause();video.removeAttribute('src');video.load();return;}
    const source=new VideoSource({resource:video,autoLoad:false,autoPlay:false,updateFPS:30,alphaMode:'premultiply-alpha-on-upload'});
    await source.load();
    if(request!==version||disposed){source.destroy();return;}
    videoSource?.destroy();media=video;videoSource=source;currentAction=action;
    const old=actor.texture;actor.texture=new Texture({source});if(old!==Texture.EMPTY&&old!==Texture.WHITE)old.destroy();
    if(measure){
      const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(video,0,0,128,128);
      const rgba=ctx.getImageData(0,0,128,128).data;let minX=128,maxX=0,minY=128,maxY=0;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(rgba[(y*128+x)*4+3]>40){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}
      bboxHeight=Math.max(.3,(maxY-minY+1)/128);ax=(minX+maxX+1)/256;ay=(maxY+1)/128;
    }
    loading=false;layout();setReady(true);wake();
  }catch(error){if(request===version){loading=false;setReady(false);setStatus(String(error instanceof Error?error.message:error));document.body.dataset.error=String(error);}}
}
async function characterChanged(){
  meta=resources.find(c=>c.dirId===select.value);if(!meta)return;
  setReady(false);loading=true;
  const oldTexture=actor.texture;actor.texture=Texture.EMPTY;
  if(oldTexture!==Texture.EMPTY&&oldTexture!==Texture.WHITE)oldTexture.destroy(!videoSource);
  videoSource?.destroy();videoSource=undefined;media=undefined;
  version++;spine?.dispose();spine=undefined;spineCanvas=undefined;spineHost?.remove();spineHost=undefined;
  if(!meta.manifest.spine&&mode==='footprints')modeChanged('portal');
  reset();setStatus('正在试穿…');
  if(meta.manifest.spine){
    const request=++version;loading=true;setReady(false);
    spineHost=document.createElement('div');spineHost.style.cssText='position:fixed;left:-2000px;top:0;width:512px;height:512px;pointer-events:none';document.body.append(spineHost);
    spine=new SpinePlayer(spineHost,meta.dirId,meta.manifest,()=>{});spineCanvas=spineHost.querySelector('canvas')!;
    for(let i=0;i<240&&!spineCanvas.dataset.ready;i++){await new Promise(r=>setTimeout(r,50));if(request!==version||disposed)return;if(spineCanvas.dataset.error)throw Error(spineCanvas.dataset.error);}
    if(!spineCanvas.dataset.ready)throw Error('Spine 加载超时');
    const old=actor.texture;actor.texture=Texture.from(spineCanvas);if(old!==Texture.EMPTY&&old!==Texture.WHITE)old.destroy();
    ax=.5;ay=550/620;bboxHeight=.73;currentAction='idle';loading=false;layout();setReady(true);play();return;
  }
  await loadAction('idle',true);if(ready)play();
}
function modeChanged(next:Mode){
  mode=next;reset();
  const info={portal:['01 — 月蚀之门','一道裂隙，短暂相逢。','再次入场'],footprints:['02 — 步生花','落脚成花，风过留香。','走一小段'],echo:['03 — 苍蓝幽焰','按住角色，拖出一道蓝焰。','演示拖拽']}[mode];
  $('scene-label').textContent=info[0];$('hint').textContent=info[1];replay.innerHTML=`${info[2]} <span>↗</span>`;
  document.querySelectorAll<HTMLButtonElement>('[data-effect]').forEach(b=>{b.classList.toggle('active',b.dataset.effect===mode);b.setAttribute('aria-pressed',String(b.dataset.effect===mode));});
  if(ready)play();
}
function play(){
  if(!ready||loading)return;reset();
  if(reduced){setStatus('已减少动态效果 · 保留角色静态展示');return;}
  elapsed=0;
  if(mode==='portal'){actor.alpha=0;portal.visible=true;setStatus('月蚀之门 · 正在入场');}
  else if(mode==='footprints'){
    if(!spine){const candidate=resources.find(c=>c.manifest.spine?.actions.walk);if(candidate){select.value=candidate.dirId;void characterChanged();return;}}
    walk=true;step=0;lastStep=-1;landingCount=0;spine?.play('walk',true);currentAction='walk';lastPrintX=footX=width*.73;lastPrintY=footY=baseline();setStatus('花瓣跟随左右脚落下');
  }
  else{demoDrag=true;footX=width*.24;footY=baseline();lastFlameX=footX;lastFlameY=footY;setStatus('也可以直接按住角色拖动');}
  wake();
}
function addFoot(x:number,y:number,direction:number){
  landingCount++;step++;
  for(let i=0;i<3;i++){
    const a=i*2.39996+step*.7,r=7+Math.random()*11;
    const sprite=new Sprite(footprint);sprite.anchor.set(.5);sprite.position.set(x+Math.cos(a)*r,y+Math.sin(a)*r*.36);
    const size=13+Math.random()*12;sprite.width=size;sprite.height=size*.8;sprite.rotation=a+direction;sprite.alpha=0;
    trail.addChild(sprite);traces.push({sprite,age:0,life:3.2+Math.random()*.7,kind:'foot',vx:Math.cos(a)*(12+i*2),vy:-12-Math.random()*22,spin:(Math.random()-.5)*2,size,phase:a,originX:sprite.x,originY:sprite.y});
  }
  for(let i=0;i<1;i++){const s=new Sprite(glint);s.anchor.set(.5);s.position.set(x+(Math.random()-.5)*25,y-3);s.width=s.height=2+Math.random()*2;s.tint=0xffd4b5;trail.addChild(s);traces.push({sprite:s,age:0,life:.7+Math.random()*.4,kind:'dust',vx:(Math.random()-.5)*18,vy:-15});}
}
function addEcho(){
  if(frameTime-lastEcho<.065||traces.filter(t=>t.kind==='echo').length>=12)return;
  lastEcho=frameTime;
  const dx=footX-lastFlameX,dy=footY-lastFlameY,speed=Math.min(1,Math.hypot(dx,dy)/24);
  lastFlameX=footX;lastFlameY=footY;
  for(let i=0;i<1;i++){
    const sprite=new Sprite(flameTextures[step%4]);sprite.anchor.set(.5,.93);sprite.position.set(footX+(Math.random()-.5)*actorHeight*.12,footY-actorHeight*(.08+Math.random()*.25));
    sprite.width=actorHeight*(.35+speed*.16);sprite.height=actorHeight*(.5+speed*.29+Math.random()*.1);
    sprite.filters=[flameMaterials[(step++)%3]];sprite.blendMode='add';sprite.alpha=.75;trail.addChild(sprite);
    traces.push({sprite,age:0,life:.72+Math.random()*.2,kind:'echo',vx:-dx*2,vy:-15-dy});
  }
  const s=new Sprite(glow);s.anchor.set(.5);s.position.set(footX+(Math.random()-.5)*actorHeight*.5,footY-actorHeight*Math.random()*.6);s.width=3;s.height=9;s.tint=0x85ddff;s.blendMode='add';trail.addChild(s);traces.push({sprite:s,age:0,life:.8,kind:'dust',vx:-dx*2,vy:-35});
}
function drawPortal(t:number){
  const open=smooth(t/.6)*(1-smooth((t-2.35)/.8)),stretch=.2+.8*ease(t/.65);
  portal.position.set(width*.48,baseline()-actorHeight*.5);portal.anchor.set(.5);
  portal.width=actorHeight*1.75*stretch;portal.height=actorHeight*1.94*stretch;
  material.resources.portal.uniforms.uTime=t;material.resources.portal.uniforms.uOpen=open;
  portalDust.clear();
  for(const s of dustSeeds){
    const a=s.angle+t*s.speed,r=actorHeight*(s.r-.08*smooth(t/2));
    const x=portal.x+Math.cos(a)*r*.87,y=portal.y+Math.sin(a)*r;
    const opacity=Math.max(0,Math.sin(t*1.6+s.phase))*.32*open;
    portalDust.circle(x,y,s.phase%1>.5?1:.65).fill({color:0xdcc4df,alpha:opacity});
  }
  const emerge=ease((t-.68)/1.5);
  actor.alpha=smooth((t-.68)/.8);actor.visible=t>=.68;
  footX=width*.48+actorHeight*.09*emerge;footY=baseline()-actorHeight*.12*(1-emerge);
  positionActor(.62+.38*emerge);
  entranceBlur.strength=5*(1-emerge);actor.filters=emerge<.98?[...actorFilters(),entranceBlur]:actorFilters();
  shadow.alpha=.3*emerge;floorGlow.alpha=.15*open;
  if(t>3.2){portal.visible=false;portalDust.clear();actor.filters=actorFilters();setStatus('已入场 · 可再次播放');}
}
function update(dt:number){
  frameTime+=dt;elapsed+=dt;
  if(spineCanvas)actor.texture.source.update();
  for(const f of flameMaterials)f.resources.fire.uniforms.uTime=frameTime;
  if(mode==='portal'&&elapsed<3.3&&!reduced)drawPortal(elapsed);
  if(walk){
    const pose=spine?.getSceneFeet(),duration=pose?.duration??1.3333,time=pose?.time??elapsed;
    // Existing walk lands left at cycle start, right at half-cycle (foot Y timelines).
    const half=Math.floor(time/(duration/2));
    const stride=actorHeight*.14;footX=width*.73-time/duration*stride;footY=baseline();positionActor();
    if(half>lastStep&&pose){lastStep=half;const foot=half%2?pose.right:pose.left;if(foot)addFoot(actor.x+(foot.x-ax)*artWidth,actor.y+(foot.y-ay)*artHeight,0);}
    if(time>=duration*4){walk=false;spine?.play('idle',true);currentAction='idle';setStatus('脚步停了，花瓣慢慢落定');}
  }
  if(demoDrag){
    const t=clamp(elapsed/2.3);addEcho();
    footX=width*(.24+.52*ease(t));footY=baseline()-Math.sin(t*Math.PI)*height*.28;
    positionActor();shadow.alpha=.18;floorGlow.alpha=.04;
    if(t===1){demoDrag=false;setStatus('按住角色拖动，试试自己的轨迹');}
  }
  traces=traces.filter(t=>{
    t.age+=dt;if(t.age>=t.life){t.sprite.destroy({texture:!!t.ownTexture,textureSource:!!t.ownTexture});return false;}
    const p=t.age/t.life;
    if(t.kind==='foot'){
      t.sprite.alpha=.9*smooth(t.age/.12)*(1-smooth((p-.58)/.42));
      const drift=1-Math.exp(-t.age*3);t.sprite.x=t.originX!+(t.vx??0)*drift*.8;
      t.sprite.y=t.originY!+(t.vy??0)*Math.sin(Math.min(1,t.age/1.25)*Math.PI)*.55+Math.sin(t.phase!)*5*drift;
      t.sprite.rotation+=(t.spin??0)*dt*(1-p);t.sprite.height=t.size!*(.35+.45*Math.abs(Math.cos(t.age*2.4+t.phase!)));
    }
    else if(t.kind==='echo'){t.sprite.alpha=.88*(1-p)**1.25;t.sprite.x+=(t.vx??0)*dt*(1-p);t.sprite.y+=(t.vy??0)*dt;t.sprite.rotation+=(t.spin??0)*dt;}
    else{t.sprite.alpha=Math.sin(p*Math.PI)*.5;t.sprite.x+=(t.vx??0)*dt;t.sprite.y+=(t.vy??0)*dt;}
    return true;
  });
  document.body.dataset.traceCount=String(traces.length);
}
function wake(){if(!disposed&&!document.hidden)app.start();}
function pointerPosition(e:PointerEvent){const r=scene.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
scene.addEventListener('pointerdown',e=>{
  if(mode!=='echo'||!ready||reduced||e.button!==0)return;
  const p=pointerPosition(e),bounds=actor.getBounds();
  if(p.x<bounds.x||p.x>bounds.x+bounds.width||p.y<bounds.y||p.y>bounds.y+bounds.height)return;
  walk=false;demoDrag=false;elapsed=99;drag=true;lastFlameX=footX;lastFlameY=footY;dragOffset={x:p.x-footX,y:p.y-footY};scene.setPointerCapture(e.pointerId);scene.style.cursor='grabbing';setStatus('苍蓝幽焰 · 松手后余焰散去');wake();
});
scene.addEventListener('pointermove',e=>{
  if(!drag)return;const p=pointerPosition(e),x=clamp(p.x-dragOffset.x,actorHeight*.3,width-actorHeight*.3),y=clamp(p.y-dragOffset.y,actorHeight*.8,height-18);
  if(Math.hypot(x-footX,y-footY)>4)addEcho();footX=x;footY=y;positionActor();shadow.alpha=.12;floorGlow.alpha=.04;
});
function release(){if(!drag)return;drag=false;scene.style.cursor='grab';shadow.alpha=.3;floorGlow.alpha=.1;setStatus('余影已散 · 可以继续拖动');}
scene.addEventListener('pointerup',release);scene.addEventListener('pointercancel',release);scene.addEventListener('lostpointercapture',release);
function motionChanged(){reduced=systemMotion.matches||$<HTMLInputElement>('reduced').checked;reset();setStatus(reduced?'已减少动态效果':'选择一种效果，或再次播放');wake();}
systemMotion.addEventListener('change',motionChanged);$('reduced').addEventListener('change',motionChanged);
document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();media?.pause();spine?.setSuspended(true);app.stop();}else{void media?.play().catch(()=>{});spine?.setSuspended(false);wake();}});
window.addEventListener('blur',release);
document.querySelectorAll<HTMLButtonElement>('[data-effect]').forEach(b=>b.onclick=()=>modeChanged(b.dataset.effect as Mode));
replay.onclick=play;select.onchange=()=>void characterChanged();$('backdrop').onclick=()=>{document.body.classList.toggle('light');$('backdrop').textContent=document.body.classList.contains('light')?'深色背景 ◑':'浅色背景 ◐';};
const resize=new ResizeObserver(()=>{if(app.renderer){reset();layout();wake();}});

async function boot(){
  await app.init({backgroundAlpha:0,preference:'webgl',antialias:true,autoDensity:true,resolution:Math.min(devicePixelRatio,1.5),autoStart:false});
  const atlas=await Assets.load(new URL('./assets/blue-flame-atlas.png',import.meta.url).href);
  flameTextures=Array.from({length:4},(_,i)=>new Texture({source:atlas.source,frame:new Rectangle(i%2*atlas.width/2,Math.floor(i/2)*atlas.height/2,atlas.width/2,atlas.height/2)}));
  app.ticker.maxFPS=45;scene.append(app.canvas);app.stage.eventMode='none';
  shadow.texture=glow;shadow.anchor.set(.5);shadow.tint=0x05020b;
  floorGlow.texture=glow;floorGlow.anchor.set(.5);floorGlow.tint=0xa69abd;
  portal.filters=[material];portal.visible=false;
  app.stage.addChild(back,trail,shadow,floorGlow,actor,foreground);back.addChild(portal);foreground.addChild(portalDust);
  resources=(await window.qbot.characters.list()).filter(c=>!!c.manifest.spine||!!c.manifest.actions.idle?.webm);
  if(!resources.length)throw Error('没有可试穿的角色动画');
  for(const c of resources){const option=document.createElement('option');option.value=c.dirId;option.textContent=c.manifest.name;select.append(option);}
  layout();resize.observe(scene);app.ticker.add(t=>update(Math.min(t.deltaMS/1000,.06)));
  await characterChanged();
  const requested=new URLSearchParams(location.search).get('appearance');if(requested==='petal-steps')modeChanged('footprints');
}
window.addEventListener('pagehide',()=>{disposed=true;version++;resize.disconnect();systemMotion.removeEventListener('change',motionChanged);clearTraces();spine?.dispose();spineHost?.remove();media?.pause();media?.removeAttribute('src');media?.load();app.destroy(true,{children:true});videoSource?.destroy();glow.destroy(true);footprint.destroy(true);glint.destroy(true);material.destroy();entranceBlur.destroy();edgeRepair.destroy();flameMaterials.forEach(f=>f.destroy());},{once:true});

// Only this isolated preview exposes controls for local UI validation.
Object.assign(window,{appearancePreview:{play,mode:modeChanged,edgePreview:(clean:boolean,time?:number)=>{reset();media?.pause();if(media&&time!==undefined)media.currentTime=time;actor.filters=clean?actorFilters():[];},stats:()=>({mode,ready,loading,reduced,drag,walk,demoDrag,currentAction,backend:spine?'spine':'video',landingCount,pose:spine?.getSceneFeet(),traces:traces.length,ghosts:traces.filter(t=>t.kind==='echo').length,feet:traces.filter(t=>t.kind==='foot').map(t=>({x:t.sprite.x,y:t.sprite.y,originX:t.originX,originY:t.originY,age:t.age})),actor:{x:actor.x,y:actor.y,width:actor.width,height:actor.height,alpha:actor.alpha},portal:portal.visible,elapsed,running:app.ticker.started})}});
void boot().catch(error=>{document.body.dataset.error=String(error);setStatus('试衣间未能打开：'+String(error instanceof Error?error.message:error));console.error(error);});
