import './style.css';
import { Player } from '../pet/player';

type Meta = NonNullable<Awaited<ReturnType<typeof window.qbot.characters.getActive>>>;
type Bounds = { x: number; y: number; w: number; h: number };
type Arrangement = { id: string; action: string; size: number; offset: number; x?: number };
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene'), ctx = canvas.getContext('2d')!;
canvas.width = 1000; canvas.height = 295;
const background = new Image();
const key = 'qbot.roomlab.arrangement.v1';
const locations = [
  { label: '左侧空地', x: 245, y: 287, height: 96 },
  { label: '壁炉左侧', x: 390, y: 280, height: 92 },
  { label: '壁炉右侧', x: 608, y: 286, height: 96 },
  { label: '右侧门边', x: 904, y: 285, height: 96 },
];
let characters: Meta[] = [], selected = 0, ready = false, editing = false, frame = 0, lastPaint = 0;
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
  $('note').textContent = '整屋参考图试住：可拖动角色，或调整大小和动作；背景家具暂不可拆。';
  $('summary').textContent = `${arrangement.filter(a => a.id).length} 位朋友 · 横向房间试住`;
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
  const a = actors[i], config = arrangement[i], spot = locations[i], image = visibleMedia(i);
  if (!config.id || !image) return;
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
  const h = Math.min(spot.height * config.size / 100, 170 * (b.h * ih) / (b.w * iw)), w = h * b.w * iw / (b.h * ih);
  const seated = false;
  const x = config.x ?? spot.x, y = spot.y + config.offset;
  ctx.save(); ctx.translate(x, y - 4); ctx.scale(Math.min(w * .32, 25), 3);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); shadow.addColorStop(0, '#42301f69'); shadow.addColorStop(1, '#42301f00');
  ctx.fillStyle = shadow; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  ctx.drawImage(image, b.x * iw, b.y * ih, b.w * iw, b.h * ih, x - w / 2, y - h, w, h);
}
function paint(now: number): void {
  // Display the room viewport without changing the source promotional image.
  ctx.drawImage(background, 0, 65, 1000, 295, 0, 0, 1000, 295);
  locations.map((_, i) => i).sort((a,b)=>(locations[a].y+arrangement[a].offset)-(locations[b].y+arrangement[b].offset)).forEach(i=>drawActor(i,now));
}
function tick(now: number): void {
  if (document.hidden) { frame = 0; return; }
  if (ready && now - lastPaint >= 1000 / 30) { paint(now); lastPaint = now; }
  frame = requestAnimationFrame(tick);
}
$('character').addEventListener('change', () => { current().id = $<HTMLSelectElement>('character').value; current().action = 'idle'; loadActor(selected); sync(); });
$('action').addEventListener('change', () => { current().action = $<HTMLSelectElement>('action').value; actors[selected].bounds = null; actors[selected].media = null; actors[selected].player.playLooping(current().action); sync(); });
for (const id of ['size', 'offset'] as const) $(id).addEventListener('input', () => { current()[id] = Number($<HTMLInputElement>(id).value); if (id === 'size') $('sizeValue').textContent = `${current().size}%`; });
const preview = (window as unknown as {roomlab?: {resize: (width:number, editing:boolean)=>void; pin:(value:boolean)=>void}}).roomlab;
let roomWidth = 800;
function resize(): void { document.body.classList.toggle('editing', editing); preview?.resize(roomWidth, editing); }
$('edit').onclick = () => { editing = !editing; $('controls').hidden = !editing; $('edit').textContent = editing ? '收起设置' : '安排角色'; $('edit').setAttribute('aria-expanded', String(editing)); resize(); };
$('width').onchange = () => { roomWidth = Number($<HTMLSelectElement>('width').value); resize(); };
$('pin').onclick = () => { const value = $('pin').getAttribute('aria-pressed') !== 'true'; $('pin').setAttribute('aria-pressed', String(value)); $('pin').textContent = value ? '取消置顶' : '置顶'; preview?.pin(value); };
let dragging = false;
canvas.onpointerdown = event => { if (!editing) return; const rect=canvas.getBoundingClientRect(), x=(event.clientX-rect.left)*1000/rect.width, y=(event.clientY-rect.top)*295/rect.height;
  const hit=locations.map((p,i)=>({i,d:Math.abs(x-(arrangement[i].x??p.x))})).filter(p=>arrangement[p.i].id && Math.abs(y-(locations[p.i].y+arrangement[p.i].offset-45))<80).sort((a,b)=>a.d-b.d)[0];
  if(!hit || hit.d>65)return; selected=hit.i; dragging=true; canvas.setPointerCapture(event.pointerId); sync(); };
canvas.onpointermove = event => { if(!dragging)return; const rect=canvas.getBoundingClientRect(); current().x=Math.max(35,Math.min(965,(event.clientX-rect.left)*1000/rect.width)); current().offset=Math.max(-45,Math.min(5,(event.clientY-rect.top)*295/rect.height-locations[selected].y+35)); sync(); };
canvas.onpointerup = canvas.onpointercancel = () => { dragging=false; };
$('save').onclick = () => { try { localStorage.setItem(key, JSON.stringify(arrangement)); $('note').textContent = '已记住这次安排，下次来还是这些朋友。'; } catch { $('note').textContent = '暂时未能保存，当前安排仍在，请重试。'; } };
$('photo').onclick = () => { if (!ready) return; try { paint(performance.now()); const a = document.createElement('a'); a.download = 'QBot-横向房间试住.png'; a.href = canvas.toDataURL('image/png'); a.click(); } catch { $('note').textContent = '照片暂时未能保存，请重试。'; } };
document.addEventListener('visibilitychange', () => {
  for (const [i, a] of actors.entries()) { a.player.setSuspended(document.hidden); if (!document.hidden && arrangement[i].action && arrangement[i].id) a.player.playLooping(arrangement[i].action); }
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (!frame) frame = requestAnimationFrame(tick);
});
window.addEventListener('beforeunload', () => { cancelAnimationFrame(frame); actors.forEach(a => a.player.dispose()); });
async function boot(): Promise<void> {
  background.src = new URL('./art/halloween-reference.png', import.meta.url).href; await background.decode();
  try { characters = (await window.qbot.characters.list()).filter(m => m.manifest); } catch { characters = []; }
  const selector = $<HTMLSelectElement>('character'); selector.append(new Option('留一个空位', ''));
  characters.forEach(m => selector.append(new Option(m.manifest.name || '未命名朋友', m.dirId)));
  const market = characters.filter(m => m.dirId.startsWith('market-'));
  const choices = [...market, ...characters.filter(m => !market.includes(m))];
  arrangement = locations.map((_, i) => ({ id: choices[i]?.dirId || '', action: 'idle', size: 100, offset: 0 }));
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(saved) && saved.length === locations.length) arrangement = arrangement.map((fallback, i) => {
      const s = saved[i]; if (!s || typeof s !== 'object') return fallback;
      return { id: typeof s.id === 'string' && characters.some(m => m.dirId === s.id) ? s.id : '', action: typeof s.action === 'string' ? s.action : 'idle', size: Number.isFinite(s.size) ? Math.min(145, Math.max(65, s.size)) : 100, x: Number.isFinite(s.x) ? Math.max(35, Math.min(965, s.x)) : undefined, offset: Number.isFinite(s.offset) ? Math.min(5, Math.max(-45, s.offset)) : 0 };
    });
  } catch { /* A damaged preview preference never changes installed characters. */ }
  arrangement.forEach((_, i) => loadActor(i)); sync(); ready = true; $('loading').hidden = true; document.body.dataset.ready = 'true'; frame = requestAnimationFrame(tick);
}
void boot().catch(() => { $('loading').textContent = '房间参考图未能打开，请重新进入。'; });
