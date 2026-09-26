import './style.css';
import { Player } from '../pet/player';
import { NetworkDriver } from '../pet/network-driver';
import type { LinkPeerCharacter, LinkPeerState, RoomSizePreset } from '../../shared/ipc-types';
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('scene'),ctx=canvas.getContext('2d')!;canvas.width=1000;canvas.height=295;
type Member={id:string;nickname:string;character:LinkPeerCharacter|null;mode?:string;action?:string};
type Bounds={x:number;y:number;w:number;h:number};
type Actor={member:Member;source:HTMLDivElement;player:Player;driver:NetworkDriver;key:string;bounds:Bounds|null;media:CanvasImageSource|null;sampled:number};
const actors=new Map<string,Actor>(),sample=document.createElement('canvas');sample.width=128;sample.height=128;
const sc=sample.getContext('2d',{willReadFrequently:true})!;
const themes={halloween:new URL('../roomlab/art/halloween-reference.png',import.meta.url).href,space:new URL('./art/space-v2.png',import.meta.url).href,observatory:new URL('./art/observatory-v2.png',import.meta.url).href,greenhouse:new URL('./art/greenhouse-v2.png',import.meta.url).href};
let background=new Image(),theme:keyof typeof themes='halloween',imageVersion=0,frame=0,last=0,hiddenMembers:string[]=[],hidden=false,disposed=false;
let mine:Member|null=null,peers:Member[]=[],refreshing=false,refreshAgain=false;
async function changeTheme(value:string){
 if(!(value in themes))return;const v=++imageVersion,img=new Image();img.src=themes[value as keyof typeof themes];
 try{await img.decode();if(v!==imageVersion||disposed)return;background=img;theme=value as keyof typeof themes;try{localStorage.setItem('qbot.onlineRoom.theme.v2',theme);}catch{}$('credit').textContent=theme==='halloween'?'明日方舟参考图 © Hypergryph · 测试':'QBot · 房间原画';document.body.dataset.ready='true';}catch{$('status').textContent='背景加载失败，请换一张试试';}
}
function reconcile(){
 const members=[...(mine?[mine]:[]),...peers].filter(m=>!hiddenMembers.includes(m.id));const keep=new Set(members.map(m=>m.id));
 for(const [id,a]of actors)if(!keep.has(id)){a.player.dispose();a.source.remove();actors.delete(id);}
 for(const member of members){let a=actors.get(member.id);if(!a){const source=document.createElement('div');$('sources').append(source);let driver:NetworkDriver;const player=new Player(source,()=>driver.onVideoEnded());driver=new NetworkDriver({play:(action,loop)=>{if(!hidden&&!document.hidden)loop?player.playLooping(action):player.play(action);}});a={member,source,player,driver,key:'',bounds:null,media:null,sampled:0};actors.set(member.id,a);}a.member=member;
  const key=member.character?JSON.stringify(member.character):'';if(key!==a.key){a.player.dispose();a.key=key;a.bounds=null;a.media=null;if(member.character){const available=a.player.load(member.character.dirId,member.character.manifest);a.driver.setCharacter(available,member.character.manifest.agentActions);}}
  a.driver.applyState({mode:member.mode??'idle',action:member.action} as LinkPeerState);
 }
 $('status').textContent=`${members.length} 位朋友 · 点击角色查看名字，双击打开聊天`;
 document.body.dataset.members=String(members.length);
}
async function refresh(){if(refreshing){refreshAgain=true;return;}refreshing=true;try{peers=await window.qbot.rooms.getSceneMembers();if(!disposed)reconcile();}catch{$('status').textContent='房间状态暂时不可用';}finally{refreshing=false;if(refreshAgain&&!disposed){refreshAgain=false;void refresh();}}}
async function loadMine(){const meta=await window.qbot.characters.getActive();mine=meta?{id:'self',nickname:meta.manifest.name||'我',character:{dirId:meta.dirId,manifest:meta.manifest},mode:'idle'}:null;reconcile();}
function readBounds(media:HTMLVideoElement|HTMLImageElement):Bounds|null{sc.clearRect(0,0,128,128);sc.drawImage(media,0,0,128,128);const data=sc.getImageData(0,0,128,128).data;let l=128,t=128,r=-1,b=-1;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]>35){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return r<0?null:{x:Math.max(0,l-1)/128,y:Math.max(0,t-1)/128,w:(Math.min(127,r+1)-Math.max(0,l-1)+1)/128,h:(Math.min(127,b+1)-Math.max(0,t-1)+1)/128};}
function paint(now:number){
 if(background.complete&&background.naturalWidth){if(theme==='halloween')ctx.drawImage(background,0,65,1000,295,0,0,1000,295);else{const h=background.naturalWidth*.295;ctx.drawImage(background,0,(background.naturalHeight-h)/2,background.naturalWidth,h,0,0,1000,295);}}
 const list=[...actors.values()],gap=880/Math.max(1,list.length),height=Math.min(100,gap*1.25);
 list.forEach((a,i)=>{const x=60+gap*(i+.5),y=280;const media=[...a.source.querySelectorAll('video')].find(v=>v.style.visibility==='visible'&&v.readyState>=2)||[...a.source.querySelectorAll('img')].find(v=>v.complete&&v.naturalWidth&&v.style.visibility!=='hidden');
  if(!media){ctx.fillStyle='#dfd5c2';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(a.member.nickname+' · 等待形象',x,y,Math.max(40,gap-5));return;}
  if(a.media!==media){a.media=media;a.bounds=null;}if(!a.bounds||now-a.sampled>500){try{const b=readBounds(media);if(b){if(!a.bounds)a.bounds=b;else{const old=a.bounds,l=Math.min(old.x,b.x),t=Math.min(old.y,b.y);a.bounds={x:l,y:t,w:Math.max(old.x+old.w,b.x+b.w)-l,h:Math.max(old.y+old.h,b.y+b.h)-t};}}}catch{a.bounds={x:0,y:0,w:1,h:1};}a.sampled=now;}
  const b=a.bounds;if(!b)return;const iw=media instanceof HTMLVideoElement?media.videoWidth:media.naturalWidth,ih=media instanceof HTMLVideoElement?media.videoHeight:media.naturalHeight;
  const h=Math.min(height,(gap-10)*b.h*ih/(b.w*iw)),w=h*b.w*iw/(b.h*ih);ctx.save();ctx.translate(x,y-2);ctx.scale(Math.min(w*.36,28),3);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'#0009');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();ctx.drawImage(media,b.x*iw,b.y*ih,b.w*iw,b.h*ih,x-w/2,y-h,w,h);
 });
}
function tick(now:number){if(disposed)return;if(!hidden&&!document.hidden&&now-last>1000/24){paint(now);last=now;}frame=requestAnimationFrame(tick);}
function visibility(){for(const a of actors.values()){a.player.setSuspended(hidden||document.hidden);if(!hidden&&!document.hidden&&a.member.character)a.driver.dragEnd();}}
const cleanups=[window.qbot.rooms.onSceneChanged(()=>void refresh()),window.qbot.characters.onActivated(()=>void loadMine()),window.qbot.desktop.onChanged(s=>{hidden=s.hidden;hiddenMembers=s.hiddenMembers;reconcile();visibility();})];
cleanups.push(window.qbot.agent.onStatus(status=>{if(mine){mine.mode=status.activity;reconcile();}}));
document.addEventListener('visibilitychange',visibility);
$('theme').onchange=()=>void changeTheme($<HTMLSelectElement>('theme').value);
$('size').onchange=()=>void window.qbot.room.setSizePreset($<HTMLSelectElement>('size').value as RoomSizePreset);
$('chat').onclick=()=>window.qbot.rooms.open();$('off').onclick=()=>window.qbot.desktop.openMenu();
canvas.onclick=e=>{const x=(e.clientX-canvas.getBoundingClientRect().left)/canvas.clientWidth*1000,index=Math.floor((x-60)/(880/Math.max(1,actors.size))),a=[...actors.values()][index];if(a)$('status').textContent=a.member.nickname;};canvas.ondblclick=()=>window.qbot.rooms.open();
window.addEventListener('beforeunload',()=>{disposed=true;cancelAnimationFrame(frame);cleanups.forEach(fn=>fn());actors.forEach(a=>a.player.dispose());});
async function boot(){let saved='greenhouse';try{saved=localStorage.getItem('qbot.onlineRoom.theme.v2')||saved;}catch{}if(!(saved in themes))saved='greenhouse';$<HTMLSelectElement>('theme').value=saved;await changeTheme(saved);$<HTMLSelectElement>('size').value=await window.qbot.room.getSizePreset();await loadMine();await refresh();frame=requestAnimationFrame(tick);}
void boot().catch(()=>{$('status').textContent='房间未能加载，请关闭背景后重新开启';});
