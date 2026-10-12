import {loadArt,names} from './plants.js';
import {FlatGarden} from './flat.js';
import {SpaceGarden} from './space.js';

const q=new URLSearchParams(location.search),overlay=q.get('overlay')==='1',native=q.get('native')==='1';
if(overlay)document.body.classList.add('overlay');if(native)document.body.classList.add('native');
const state={mode:q.get('mode')||'2d',stage:q.get('stage')||'new',wind:!matchMedia('(prefers-reduced-motion: reduce)').matches,mutate:false,angle:0,elevation:21,harvested:[],harvestCount:0};
const descriptions={'2d':'手绘植物和柔软草坡，轻轻摇晃。',hybrid:'立体的地面，手绘的植物。转动一点，看看前后层次。','3d':'用圆润的小模型，试试植物真正站在草坪里的感觉。'};
const modeNames={'2d':'绘本 2D',hybrid:'立体草地 + 手绘植物','3d':'玩具 3D'};
let art,flat,space,started=performance.now(),last=0,anim=0,growthAt=-100,motionUntil=0,pauseAt=null,toastTimer,hitMap=new Map(),lastHits=[],frames=0,closed=false;
const garden=document.querySelector('#garden'),flatCanvas=document.querySelector('#flat'),spaceHost=document.querySelector('#space'),buttons=document.querySelector('#plant-buttons');
function toast(s){const e=document.querySelector('#toast');e.textContent=s;e.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('visible'),2200)}
function ui(){
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===state.mode)));
 document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stage===state.stage)));
 document.querySelector('#wind').checked=state.wind;document.querySelector('#mutate').checked=state.mutate;
 document.querySelector('#angle').value=state.angle;document.querySelector('#angle-value').textContent=`${state.angle}°`;document.querySelector('#elevation').value=state.elevation;
 for(const id of ['angle','elevation','recenter'])document.getElementById(id).disabled=state.mode==='2d';
 document.querySelector('#view-note').textContent=state.mode==='2d'?'2D 使用固定视角':state.mode==='hybrid'?'植物是平面，草地有深度':'植物和草地都有体积';
 document.querySelector('#description').textContent=descriptions[state.mode];document.querySelector('#scene-label').textContent=(state.stage==='new'?'新手 · 3 株嫩芽':'后期 · 5 簇植物')+(state.mutate?' · 变异色彩':'');document.querySelector('#overlay-mode').textContent=modeNames[state.mode];
 flatCanvas.style.display=state.mode==='2d'?'block':'none';spaceHost.style.display=state.mode==='2d'?'none':'block';
 document.body.dataset.mode=state.mode;document.body.dataset.stage=state.stage;
}
function apply(patch,publish=true){const before={...state};for(const [k,v]of Object.entries(patch))if(k in state)state[k]=v;if(!['2d','hybrid','3d'].includes(state.mode))state.mode='2d';if(!['new','grown'].includes(state.stage))state.stage='new';state.angle=Math.max(-28,Math.min(28,Number(state.angle)||0));state.elevation=Math.max(12,Math.min(34,Number(state.elevation)||21));
 ui();if(art){flat.resize();if(state.mode!=='2d'){
  if(!space)space=new SpaceGarden(spaceHost,art);
  if(before.mode!==state.mode||before.stage!==state.stage||before.mutate!==state.mutate||JSON.stringify(before.harvested)!==JSON.stringify(state.harvested)||space.state.mode!==state.mode||space.state.stage!==state.stage)space.rebuild(state);
  space.resize();space.setView(state.angle,state.elevation);
 }}
 if(before.stage!==state.stage)growthAt=-100;
 if(publish)window.gardenLab?.setState({...state});requestFrame();
}
function interact(id){motionUntil=(performance.now()-started)/1000+1.6;flat?.click(id);space?.click(id);if(id==='pet'){toast('小兔蹦了一下，继续陪你。')}else{const p=lastHits.find(p=>p.id===id);toast(p?.seed?'小芽也在努力长大。':`${names[p?.type]||'小植物'} · ${state.mutate?'今天有一点不一样':'轻轻摇一摇'}`)}requestFrame()}
function harvest(id){const p=lastHits.find(h=>h.id===id);if(!p||p.seed||id==='pet'||state.harvested.includes(id))return;apply({harvested:[...state.harvested,id],harvestCount:state.harvestCount+1});motionUntil=(performance.now()-started)/1000+1.6;requestFrame()}
function desktopClick({x,y,double}){const h=[...lastHits].reverse().find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);if(h)(double?harvest:interact)(h.id)}
function hits(list){lastHits=list;const ids=new Set(list.map(h=>h.id));for(const[id,b]of hitMap)if(!ids.has(id)){b.remove();hitMap.delete(id)}for(const h of list){let b=hitMap.get(h.id);if(!b){b=document.createElement('button');b.className='plant-hit';b.dataset.plant=h.id;b.addEventListener('click',()=>interact(h.id));b.addEventListener('dblclick',()=>harvest(h.id));buttons.append(b);hitMap.set(h.id,b)}b.setAttribute('aria-label',h.type==='pet'?'摸摸小兔':`${h.seed?'幼苗：':''}${names[h.type]}`);Object.assign(b.style,{left:`${h.x}px`,top:`${h.y}px`,width:`${h.w}px`,height:`${h.h}px`})}}
function frame(now){anim=0;if(closed||(document.hidden&&!native))return;if(now-last<32){requestFrame();return}last=now;const t=(now-started)/1000;const age=t-growthAt;const growth=age<3?.12+.88*(1-Math.pow(1-age/3,3)):1;
 try{hits(state.mode==='2d'?flat.render(t,state,growth):space.render(t,state.wind,growth));frames++;}catch(e){fail(e);return}
 if(state.wind||age<3||t<motionUntil)requestFrame();
}
function requestFrame(){if(!anim&&!closed&&(!document.hidden||native)&&art)anim=requestAnimationFrame(frame)}
function fail(e){console.error(e);document.body.dataset.ready='error';const b=document.querySelector('#error');b.hidden=false;b.textContent='小样暂时没能显示：'+e.message+'。可以尝试重新打开。';closed=true}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>apply({mode:b.dataset.mode}));document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>apply({stage:b.dataset.stage,harvested:[]}));
document.querySelector('#wind').onchange=e=>apply({wind:e.target.checked});document.querySelector('#mutate').onchange=e=>apply({mutate:e.target.checked});
document.querySelector('#angle').oninput=e=>apply({angle:+e.target.value});document.querySelector('#elevation').oninput=e=>apply({elevation:+e.target.value});document.querySelector('#recenter').onclick=()=>apply({angle:0,elevation:21});
document.querySelector('#reset').onclick=()=>apply({stage:'new',mutate:false,angle:0,elevation:21,harvested:[],harvestCount:0});
function grow(publish=true){apply({stage:'grown',harvested:[]},publish);growthAt=(performance.now()-started)/1000;toast('从小芽，长成一片花园。');if(publish)window.gardenLab?.grow();requestFrame()}
document.querySelector('#grow').onclick=()=>grow();document.querySelector('#wallpaper').onclick=()=>document.body.classList.toggle('light');
document.querySelector('#desktop').onclick=async()=>{if(window.gardenLab){let shown;try{shown=await window.gardenLab.toggleDesktop()}catch(e){toast('桌面花园未能打开，请重试。');return}document.querySelector('#desktop').textContent=shown?'收起桌面花园 ↙':'放到真实桌面 ↗'}else toast('使用项目里的“打开花园小样”启动器，即可放到真实桌面。')};document.querySelector('#close-overlay').onclick=()=>window.gardenLab?.closeDesktop();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay)window.gardenLab?.closeDesktop();});
window.addEventListener('resize',()=>{flat?.resize();space?.resize();requestFrame()});
document.addEventListener('visibilitychange',()=>{if(native)return;if(document.hidden){pauseAt=performance.now();cancelAnimationFrame(anim);anim=0}else{if(pauseAt!==null)started+=performance.now()-pauseAt;pauseAt=null;requestFrame()}});
window.addEventListener('beforeunload',()=>{closed=true;cancelAnimationFrame(anim);space?.dispose();Object.values(art||{}).forEach(a=>a.texture.dispose())});
// Native input is observed without intercepting Explorer's mouse events.
window.gardenLab?.onDesktopClick(desktopClick);
window.gardenLab?.onState(s=>apply(s,false));window.gardenLab?.onGrow(()=>grow(false));window.gardenLab?.onDesktop(v=>{document.querySelector('#desktop').textContent=v?'收起桌面花园 ↙':'放到真实桌面 ↗'});
try{ui();art=await loadArt();flat=new FlatGarden(flatCanvas,art);const initial=await window.gardenLab?.getState();apply(initial||state,false);document.body.dataset.ready='true';requestFrame();}catch(e){fail(e)}
window.__gardenLab={get state(){return {...state}},get hits(){return lastHits.map(h=>({...h}))},get frames(){return frames},get assets(){return Object.fromEntries(Object.entries(art||{}).map(([k,a])=>[k,{alpha:a.alpha,width:a.image.width,height:a.image.height}]))},get info(){return space?{...space.renderer.info.memory,calls:space.renderer.info.render.calls}:null},apply,grow,interact,harvest,desktopClick};
