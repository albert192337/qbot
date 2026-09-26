import './style.css';
import { Player } from '../pet/player';
import { createRoom, restoreRoom, clamp, type Piece, type Room, type Theme, type Kind } from './model';

type Meta = NonNullable<Awaited<ReturnType<typeof window.qbot.characters.getActive>>>;
type Bounds = { x: number; y: number; w: number; h: number };
type Arrangement = { id: string; action: string; size: number; offset: number };
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene'), ctx = canvas.getContext('2d')!;
canvas.width = 1536; canvas.height = 1024;
const shells = {warm:new Image(),pink:new Image()}, atlases = {warm:new Image(),pink:new Image()};
const sprites = new Map<string, {canvas:HTMLCanvasElement; pixels:Uint8ClampedArray}>();
const key = 'qbot.diyroom.v1';
let room=createRoom(), family:Theme='pink', selectedFurniture='pink-sofa';
const history:Room[]=[];
let drag: {piece:Piece;x:number;y:number;before:Room;pointer:number}|null=null;
const locations = [
  { label: '沙发旁', description: '跟随沙发的位置', x: 390, y: 825, height: 235 },
  { label: '茶桌后', description: '跟随茶几的位置', x: 740, y: 745, height: 255 },
  { label: '窗边', description: '跟随窗户的位置', x: 1060, y: 707, height: 230 },
  { label: '地毯上', description: '跟随地毯的位置', x: 850, y: 930, height: 255 },
];
let characters: Meta[] = [], selected = 0, ready = false, editing = true, frame = 0, lastPaint = 0;
let arrangement: Arrangement[] = locations.map(() => ({ id: '', action: 'idle', size: 100, offset: 0 }));
const actors = locations.map(() => {
  const source = document.createElement('div'); $('sources').append(source);
  return { source, player: new Player(source, () => {}), actions: [] as string[], bounds: null as Bounds | null, media: null as CanvasImageSource | null, sampledAt: 0, error: false };
});
const sample = document.createElement('canvas'); sample.width = 192; sample.height = 192;
const sampling = sample.getContext('2d', { willReadFrequently: true })!;
const spotButtons = locations.map((spot, i) => {
  const b = document.createElement('button'), title = document.createElement('span'), name = document.createElement('small');
  title.textContent = spot.label; b.append(title, name); b.onclick = () => { selected = i; sync(); }; $('spots').append(b); return b;
});
const current = () => arrangement[selected];
function visibleMedia(i: number): HTMLVideoElement | HTMLImageElement | null {
  const source = actors[i].source;
  return [...source.querySelectorAll('video')].find(v => v.style.visibility === 'visible' && v.readyState >= 2)
    || [...source.querySelectorAll('img')].find(v => v.style.visibility !== 'hidden' && v.complete && v.naturalWidth > 0) || null;
}
function loadActor(i: number): void {
  const a = actors[i], config = arrangement[i], meta = characters.find(m => m.dirId === config.id);
  a.player.dispose(); a.bounds = null; a.media = null; a.error = false; a.actions = [];
  if (!meta) { config.id = ''; return; }
  a.actions = a.player.load(meta.dirId, meta.manifest);
  if (!a.actions.includes(config.action)) config.action = a.actions.includes('idle') ? 'idle' : a.actions[0] || '';
  if (config.action) a.player.playLooping(config.action);
}
function sync(): void {
  spotButtons.forEach((b, i) => {
    b.setAttribute('aria-pressed', String(i === selected));
    b.querySelector('small')!.textContent = characters.find(m => m.dirId === arrangement[i].id)?.manifest.name || '留空';
  });
  $<HTMLSelectElement>('character').value = current().id;
  const select = $<HTMLSelectElement>('action'); select.replaceChildren();
  const names: Record<string, string> = { idle: '自然待着', tea: '喝茶', sleep: '休息', talk_happy: '开心聊天', talk_annoyed: '闹点小脾气', perch_sit: '坐下', perch_lie: '趴下', wave: '打招呼', stretch: '伸懒腰' };
  for (const id of actors[selected].actions) { const o = new Option(names[id] || id, id); select.append(o); }
  select.value = current().action; select.disabled = !current().id;
  $<HTMLInputElement>('size').value = String(current().size); $('sizeValue').textContent = `${current().size}%`;
  $<HTMLInputElement>('offset').value = String(current().offset);
  $('note').textContent = !characters.length ? '还没有可预览的角色，可以先布置房间。' : '人物跟随对应家具；收起家具时，该位置的朋友也暂时离开。已有动画中的道具保留原样。';
  $('summary').textContent = `${arrangement.filter((a,i) => a.id && anchor(i)).length} 位朋友 · ${room.furniture.filter(p=>p.visible).length} 件家具`;
}
function anchor(i:number):Piece|undefined {
  const kinds:Kind[]=['sofa','table','window','rug'];
  return room.furniture.find(p=>p.visible&&p.kind===kinds[i]);
}
function actorPosition(i:number){
  const p=anchor(i),fallback=locations[i];if(!p)return {...fallback,visible:false,seated:false};
  const b=pieceBounds(p), seated=i===0 && ['perch_sit','perch_lie'].includes(arrangement[i].action);
  let x=p.x,y=p.y;
  if(i===0)y+=seated?-b.h*.23:90;
  if(i===1){x-=b.w*.2;y-=b.h*.55;}
  if(i===2){x+=b.w*.64;y=710;}
  if(i===3){x+=b.w*.25;y-=18;}
  return {x:clamp(x,120,1416),y:clamp(y,540,970),height:fallback.height,visible:true,seated};
}
function readBounds(image: HTMLVideoElement | HTMLImageElement): Bounds | null {
  sampling.clearRect(0, 0, 192, 192); sampling.drawImage(image, 0, 0, 192, 192);
  const pixels = sampling.getImageData(0, 0, 192, 192).data;
  let left = 192, top = 192, right = -1, bottom = -1;
  for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) if (pixels[(y * 192 + x) * 4 + 3] > 35) {
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < left ? null : { x: Math.max(0, left - 2) / 192, y: Math.max(0, top - 2) / 192, w: (Math.min(191, right + 2) - Math.max(0, left - 2) + 1) / 192, h: (Math.min(191, bottom + 2) - Math.max(0, top - 2) + 1) / 192 };
}
function drawActor(i: number, now: number): void {
  const a = actors[i], config = arrangement[i], spot = actorPosition(i), image = visibleMedia(i);
  if (!config.id || !image || !spot.visible) return;
  if (a.media !== image) { a.media = image; a.bounds = null; a.sampledAt = 0; }
  if (!a.bounds || now - a.sampledAt > 350) {
    try {
      const b = readBounds(image); if (b) {
        if (!a.bounds) a.bounds = b;
        else { const old = a.bounds, x = Math.min(old.x, b.x), y = Math.min(old.y, b.y); a.bounds = { x, y, w: Math.max(old.x + old.w, b.x + b.w) - x, h: Math.max(old.y + old.h, b.y + b.h) - y }; }
      }
    } catch { a.error = true; a.bounds = { x: 0, y: 0, w: 1, h: 1 }; }
    a.sampledAt = now;
  }
  if (!a.bounds) return;
  const b = a.bounds, iw = image instanceof HTMLVideoElement ? image.videoWidth : image.naturalWidth, ih = image instanceof HTMLVideoElement ? image.videoHeight : image.naturalHeight;
  const h = Math.min(spot.height * config.size / 100, 350 * (b.h * ih) / (b.w * iw)), w = h * b.w * iw / (b.h * ih);
  const seated = spot.seated;
  const x = spot.x, y = spot.y + config.offset;
  ctx.save(); ctx.translate(x, y - 4); ctx.scale(Math.min(w * .35, 74), seated ? 8 : 12);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); shadow.addColorStop(0, '#42301f69'); shadow.addColorStop(1, '#42301f00');
  ctx.fillStyle = shadow; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  ctx.drawImage(image, b.x * iw, b.y * ih, b.w * iw, b.h * ih, x - w / 2, y - h, w, h);
}
function piecePosition(p:Piece){const table=room.furniture.find(p=>p.visible&&p.kind==='table');return p.layer==='top'&&table?{x:p.x+table.x-810,y:p.y+table.y-815}:{x:p.x,y:p.y};}
function isVisible(p:Piece){return p.visible&&(p.layer!=='top'||room.furniture.some(t=>t.visible&&t.kind==='table'));}
function pieceBounds(p:Piece){const pos=piecePosition(p),s=sprites.get(p.id)?.canvas,w=p.width*p.scale,h=s?w*s.height/s.width:w;return {x:pos.x-w/2,y:pos.y-h,w,h};}
function drawPiece(p:Piece){
  const sprite=sprites.get(p.id);if(!sprite)return;const b=pieceBounds(p);
  if(p.layer==='floor'){
    ctx.save();ctx.translate(p.x,p.y-4);ctx.scale(b.w*.39,Math.min(18,b.w*.05));
    const shadow=ctx.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,'#38231640');shadow.addColorStop(1,'#38231600');ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  ctx.save();if(p.flip){ctx.translate(piecePosition(p).x*2,0);ctx.scale(-1,1);}ctx.drawImage(sprite.canvas,b.x,b.y,b.w,b.h);ctx.restore();
}
function renderOrder():Piece[]{return room.furniture.filter(isVisible).sort((a,b)=>{
  const rank={wall:0,ground:1,floor:2,top:3};return rank[a.layer]-rank[b.layer]||(a.layer==='wall'?a.index-b.index:a.y-b.y);
});}
function paint(now: number): void {
  ctx.drawImage(shells[room.wall],0,0,1536,1024);
  ctx.save();ctx.beginPath();ctx.rect(0,635,1536,389);ctx.clip();ctx.drawImage(shells[room.floor],0,0,1536,1024);ctx.restore();
  const pieces=renderOrder();pieces.filter(p=>p.layer==='wall'||p.layer==='ground').forEach(drawPiece);
  const items:Array<{depth:number;draw:()=>void}>=pieces.filter(p=>p.layer==='floor'||p.layer==='top').map(p=>({depth:p.layer==='top'?(room.furniture.find(t=>t.visible&&t.kind==='table')?.y||p.y)+.5:p.y,draw:()=>drawPiece(p)}));
  actors.forEach((_,i)=>{const spot=actorPosition(i);items.push({depth:spot.seated?(anchor(i)?.y||spot.y)+1:spot.y+arrangement[i].offset,draw:()=>drawActor(i,now)});});
  items.sort((a,b)=>a.depth-b.depth).forEach(e=>e.draw());
  if(editing){const p=room.furniture.find(p=>p.id===selectedFurniture&&p.visible);if(p){const b=pieceBounds(p);ctx.save();ctx.strokeStyle='#b8768d';ctx.lineWidth=3;ctx.setLineDash([8,7]);ctx.strokeRect(b.x-5,b.y-5,b.w+10,b.h+10);ctx.restore();}}
}
function tick(now: number): void {
  if (document.hidden) { frame = 0; return; }
  if (ready && now - lastPaint >= 1000 / 30) { paint(now); lastPaint = now; }
  frame = requestAnimationFrame(tick);
}
$('character').addEventListener('change', () => { current().id = $<HTMLSelectElement>('character').value; current().action = 'idle'; loadActor(selected); sync(); });
$('action').addEventListener('change', () => { current().action = $<HTMLSelectElement>('action').value; actors[selected].bounds = null; actors[selected].media = null; actors[selected].player.playLooping(current().action); sync(); });
for (const id of ['size', 'offset'] as const) $(id).addEventListener('input', () => { current()[id] = Number($<HTMLInputElement>(id).value); if (id === 'size') $('sizeValue').textContent = `${current().size}%`; });
$('edit').onclick = () => { editing = !editing; $('controls').hidden = !editing; $('decor').hidden=!editing; $('edit').textContent = editing ? '收起布置' : '布置小屋'; $('edit').setAttribute('aria-expanded', String(editing)); };
$('save').onclick = () => { try { localStorage.setItem(key, JSON.stringify({room,arrangement})); $('note').textContent = '家具和朋友的位置已保存。'; } catch { $('note').textContent = '暂时未能保存，当前安排仍在，请重试。'; } };
$('photo').onclick = () => { if (!ready) return; const was=editing;try { editing=false;paint(performance.now()); const a = document.createElement('a'); a.download = 'QBot-我的小屋.png'; a.href = canvas.toDataURL('image/png'); a.click(); } catch { $('note').textContent = '照片暂时未能保存，请重试。'; }finally{editing=was;} };

function remember(before=structuredClone(room)){history.push(before);if(history.length>25)history.shift();$<HTMLButtonElement>('undo').disabled=false;}
function syncDecor(){
  $<HTMLSelectElement>('wall').value=room.wall;$<HTMLSelectElement>('floor').value=room.floor;
  document.querySelectorAll<HTMLButtonElement>('[data-family]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.family===family)));
  $('catalog').replaceChildren();
  for(const p of room.furniture.filter(p=>p.theme===family)){
    const button=document.createElement('button');button.dataset.furniture=p.id;button.setAttribute('aria-label',p.label);button.setAttribute('aria-pressed',String(p.id===selectedFurniture));button.classList.toggle('on',p.visible);
    const thumb=document.createElement('canvas');thumb.width=140;thumb.height=100;const g=thumb.getContext('2d')!,s=sprites.get(p.id)?.canvas;
    if(s){const scale=Math.min(132/s.width,94/s.height);g.drawImage(s,(140-s.width*scale)/2,(100-s.height*scale)/2,s.width*scale,s.height*scale);}
    const label=document.createElement('span');label.textContent=p.label;button.append(thumb,label);
    button.onclick=()=>{selectedFurniture=p.id;if(!p.visible){remember();if(p.kind!=='accessory'){const old=room.furniture.find(x=>x.visible&&x.kind===p.kind);if(old){p.x=old.x;p.y=old.y;p.scale=old.scale;p.flip=old.flip;}room.furniture.filter(x=>x.kind===p.kind).forEach(x=>x.visible=false);}p.visible=true;}syncDecor();sync();};$('catalog').append(button);
  }
  const p=room.furniture.find(p=>p.id===selectedFurniture)!;
  $('selectedName').textContent=p.label;$('stow').textContent=p.visible?'收起':'放回';$<HTMLInputElement>('furnitureSize').value=String(p.scale*100);
  $<HTMLButtonElement>('undo').disabled=!history.length;
  document.body.dataset.furniture=String(room.furniture.filter(isVisible).length);document.body.dataset.wall=room.wall;document.body.dataset.floor=room.floor;
}
function movePiece(p:Piece,x:number,y:number){
  const b=pieceBounds(p);p.x=clamp(x,b.w/2+20,1516-b.w/2);
  p.y=clamp(y,p.layer==='wall'?Math.max(b.h+20,170):650,p.layer==='wall'?610:984);
}
function canvasPoint(e:PointerEvent){const b=canvas.getBoundingClientRect(),scale=Math.min(b.width/1536,b.height/1024);return {x:(e.clientX-b.left-(b.width-1536*scale)/2)/scale,y:(e.clientY-b.top-(b.height-1024*scale)/2)/scale};}
function hitPiece(p:Piece,x:number,y:number){const b=pieceBounds(p),s=sprites.get(p.id);if(!s||x<b.x||x>=b.x+b.w||y<b.y||y>=b.y+b.h)return false;let sx=Math.floor((x-b.x)/b.w*s.canvas.width);if(p.flip)sx=s.canvas.width-1-sx;const sy=Math.floor((y-b.y)/b.h*s.canvas.height);return s.pixels[(sy*s.canvas.width+sx)*4+3]>30;}
canvas.addEventListener('pointerdown',e=>{if(!editing||!ready||e.button!==0)return;const point=canvasPoint(e),p=renderOrder().reverse().find(p=>hitPiece(p,point.x,point.y));if(!p)return;
  selectedFurniture=p.id;family=p.theme;drag={piece:p,x:point.x-p.x,y:point.y-p.y,before:structuredClone(room),pointer:e.pointerId};canvas.setPointerCapture(e.pointerId);canvas.focus();syncDecor();
});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const point=canvasPoint(e);movePiece(drag.piece,point.x-drag.x,point.y-drag.y);});
function endDrag(cancel=false){if(!drag)return;const before=drag.before,pointer=drag.pointer;drag=null;if(cancel)room=before;else remember(before);if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);syncDecor();sync();}
canvas.addEventListener('pointerup',()=>endDrag());canvas.addEventListener('pointercancel',()=>endDrag(true));canvas.addEventListener('lostpointercapture',()=>endDrag(true));
canvas.addEventListener('keydown',e=>{if(!editing)return;if(e.key==='Escape'){endDrag(true);return;}const p=room.furniture.find(p=>p.id===selectedFurniture)!;if(!p.visible)return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remember();p.visible=false;syncDecor();sync();return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();remember();const n=e.shiftKey?20:5;movePiece(p,p.x+(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0),p.y+(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0));syncDecor();
});
document.querySelectorAll<HTMLButtonElement>('[data-family]').forEach(b=>b.onclick=()=>{family=b.dataset.family as Theme;syncDecor();});
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(b=>b.onclick=()=>{remember();room=createRoom(b.dataset.preset as Theme);family=b.dataset.preset as Theme;selectedFurniture=`${family}-sofa`;syncDecor();sync();});
for(const name of ['wall','floor'] as const)$(name).addEventListener('change',()=>{remember();room[name]=$<HTMLSelectElement>(name).value as Theme;syncDecor();});
$('stow').onclick=()=>{remember();const p=room.furniture.find(p=>p.id===selectedFurniture)!;if(!p.visible&&p.kind!=='accessory')room.furniture.filter(x=>x.kind===p.kind).forEach(x=>x.visible=false);p.visible=!p.visible;syncDecor();sync();};
$('flip').onclick=()=>{remember();const p=room.furniture.find(p=>p.id===selectedFurniture)!;p.flip=!p.flip;syncDecor();};
$('undo').onclick=()=>{if(history.length)room=history.pop()!;syncDecor();sync();};
$('clear').onclick=()=>{remember();room.furniture.forEach(p=>p.visible=false);syncDecor();sync();};
$('exportPiece').onclick=()=>{const p=room.furniture.find(p=>p.id===selectedFurniture)!;const s=sprites.get(p.id);if(!s)return;const a=document.createElement('a');a.download=`${p.label}.png`;a.href=s.canvas.toDataURL('image/png');a.click();};
let scaleBefore:Room|null=null;
$('furnitureSize').addEventListener('input',()=>{scaleBefore??=structuredClone(room);const p=room.furniture.find(p=>p.id===selectedFurniture)!;p.scale=Number($<HTMLInputElement>('furnitureSize').value)/100;movePiece(p,p.x,p.y);});
$('furnitureSize').addEventListener('change',()=>{if(scaleBefore)remember(scaleBefore);scaleBefore=null;syncDecor();});

function sliceAtlas(theme:Theme){
  const image=atlases[theme],scratch=document.createElement('canvas');scratch.width=image.width;scratch.height=image.height;const g=scratch.getContext('2d',{willReadFrequently:true})!;g.drawImage(image,0,0);
  const data=g.getImageData(0,0,image.width,image.height).data;
  // Generated cells are not mathematically exact: explicit nonoverlapping gutters
  // preserve the entire furniture silhouette instead of cutting at grid thirds.
  const cols=theme==='warm'?[0,.35,.675,1]:[0,.367,.71,1];
  const rows=theme==='warm'?[0,.30,.655,1]:[0,.32,.687,1];
  for(const p of room.furniture.filter(p=>p.theme===theme)){
    const x0=Math.round(cols[p.index%3]*image.width),y0=Math.round(rows[Math.floor(p.index/3)]*image.height),x1=Math.round(cols[p.index%3+1]*image.width),y1=Math.round(rows[Math.floor(p.index/3)+1]*image.height);
    const width=x1-x0,height=y1-y0,seen=new Uint8Array(width*height),queue=new Int32Array(width*height);
    let best={count:0,x:x0,y:y0,right:x1-1,bottom:y1-1};
    const solid=(id:number)=>data[((y0+Math.floor(id/width))*image.width+x0+id%width)*4+3]>35;
    for(let seed=0;seed<width*height;seed++){
      if(seen[seed]||!solid(seed))continue;let head=0,tail=1,minX=x1,minY=y1,maxX=x0,maxY=y0;seen[seed]=1;queue[0]=seed;
      while(head<tail){const id=queue[head++],x=x0+id%width,y=y0+Math.floor(id/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
        for(const next of [id-1,id+1,id-width,id+width]){if(next<0||next>=width*height||seen[next]||Math.abs(next%width-id%width)+Math.abs(Math.floor(next/width)-Math.floor(id/width))!==1||!solid(next))continue;seen[next]=1;queue[tail++]=next;}}
      if(tail>best.count)best={count:tail,x:minX,y:minY,right:maxX,bottom:maxY};
    }
    if(best.count<100)throw Error(`missing transparent furniture: ${p.id}`);
    const left=Math.max(x0,best.x-2),top=Math.max(y0,best.y-2),right=Math.min(x1,best.right+3),bottom=Math.min(y1,best.bottom+3);
    const sprite=document.createElement('canvas');sprite.width=right-left;sprite.height=bottom-top;const sg=sprite.getContext('2d',{willReadFrequently:true})!;sg.drawImage(image,left,top,sprite.width,sprite.height,0,0,sprite.width,sprite.height);
    sprites.set(p.id,{canvas:sprite,pixels:sg.getImageData(0,0,sprite.width,sprite.height).data});
  }
}
document.addEventListener('visibilitychange', () => {
  for (const [i, a] of actors.entries()) { a.player.setSuspended(document.hidden); if (!document.hidden && arrangement[i].action && arrangement[i].id) a.player.playLooping(arrangement[i].action); }
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (!frame) frame = requestAnimationFrame(tick);
});
window.addEventListener('beforeunload', () => { cancelAnimationFrame(frame); actors.forEach(a => a.player.dispose()); });
async function boot(): Promise<void> {
  shells.warm.src=new URL('./art/shell-warm.png',import.meta.url).href;shells.pink.src=new URL('./art/shell-pink.png',import.meta.url).href;
  atlases.warm.src=new URL('./art/furniture-warm.png',import.meta.url).href;atlases.pink.src=new URL('./art/furniture-pink.png',import.meta.url).href;
  await Promise.all([...Object.values(shells),...Object.values(atlases)].map(i=>i.decode()));sliceAtlas('warm');sliceAtlas('pink');
  try { characters = (await window.qbot.characters.list()).filter(m => m.manifest); } catch { characters = []; }
  const selector = $<HTMLSelectElement>('character'); selector.append(new Option('留一个空位', ''));
  characters.forEach(m => selector.append(new Option(m.manifest.name || '未命名朋友', m.dirId)));
  const market = characters.filter(m => m.dirId.startsWith('market-'));
  const people=market.filter(m=>m.manifest.name&&m.manifest.name!=='未命名');
  const choices = [...people, ...characters.filter(m=>m.dirId==='mascot'),...market.filter(m=>!people.includes(m))];
  arrangement = locations.map((_, i) => ({ id: choices[i]?.dirId || '', action: 'idle', size: 100, offset: 0 }));
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if(saved?.room)room=restoreRoom(saved.room);
    if (Array.isArray(saved?.arrangement) && saved.arrangement.length === locations.length) arrangement = arrangement.map((fallback, i) => {
      const s = saved.arrangement[i]; if (!s || typeof s !== 'object') return fallback;
      return { id: typeof s.id === 'string' && characters.some(m => m.dirId === s.id) ? s.id : '', action: typeof s.action === 'string' ? s.action : 'idle', size: Number.isFinite(s.size) ? Math.min(145, Math.max(65, s.size)) : 100, offset: Number.isFinite(s.offset) ? Math.min(45, Math.max(-45, s.offset)) : 0 };
    });
  } catch { /* A damaged preview preference never changes installed characters. */ }
  arrangement.forEach((_, i) => loadActor(i)); sync();syncDecor(); ready = true; $('loading').hidden = true; document.body.dataset.ready = 'true'; frame = requestAnimationFrame(tick);
}
void boot().catch(e => { $('loading').textContent = '小屋素材未能打开，请重新进入。';console.error(e); });
