import './style.css';
import { Player } from '../pet/player';

type Meta = NonNullable<Awaited<ReturnType<typeof window.qbot.characters.getActive>>>;
type Bounds = { x: number; y: number; w: number; h: number };
type Arrangement = { id: string; action: string; size: number; offset: number };
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene'), ctx = canvas.getContext('2d')!;
canvas.width = 1536; canvas.height = 1024;
const background = new Image();
const key = 'qbot.tearoom.arrangement.v1';
const locations = [
  { label: '沙发旁', description: '有坐姿时可坐上沙发', x: 370, y: 738, height: 260 },
  { label: '茶桌后', description: '桌沿自然遮住下半身', x: 699, y: 628, height: 285 },
  { label: '窗边', description: '留一个晒太阳的位置', x: 1132, y: 670, height: 260 },
  { label: '地毯上', description: '近一点，看得清表情', x: 520, y: 880, height: 285 },
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
  $('note').textContent = !characters.length ? '还没有可预览的角色。可先欣赏茶室，稍后从装扮站添加角色再来。' : selected === 0 ? '有“坐下”素材时会放到沙发座面；其他动作在沙发旁播放。自带椅子或道具的素材会保留原样。' : '使用角色已有动画；大小按可见轮廓校准。这里只安排试住位置，不更换桌面角色。';
  $('summary').textContent = `${arrangement.filter(a => a.id).length} 位朋友 · 午后的窗边茶室`;
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
  const h = Math.min(spot.height * config.size / 100, 350 * (b.h * ih) / (b.w * iw)), w = h * b.w * iw / (b.h * ih);
  const seated = i === 0 && ['perch_sit', 'perch_lie'].includes(config.action);
  const x = seated ? 407 : spot.x, y = (seated ? 548 : spot.y) + config.offset;
  ctx.save(); ctx.translate(x, y - 4); ctx.scale(Math.min(w * .35, 74), seated ? 8 : 12);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); shadow.addColorStop(0, '#42301f69'); shadow.addColorStop(1, '#42301f00');
  ctx.fillStyle = shadow; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  ctx.drawImage(image, b.x * iw, b.y * ih, b.w * iw, b.h * ih, x - w / 2, y - h, w, h);
}
// A fixed camera permits a foreground mask taken from the same painting: the
// table top, tea set and legs cover the back actor without altering source art.
function foregroundTable(): void {
  ctx.save(); ctx.beginPath();
  ctx.moveTo(602, 581); ctx.bezierCurveTo(601, 566, 649, 553, 679, 553);
  ctx.lineTo(679, 548); ctx.lineTo(720, 547); ctx.lineTo(725, 565); ctx.lineTo(739, 564);
  ctx.lineTo(729, 523); ctx.lineTo(748, 527); ctx.lineTo(755, 514); ctx.lineTo(775, 507); ctx.lineTo(778, 499); ctx.lineTo(789, 499); ctx.lineTo(794, 509);
  ctx.lineTo(815, 520); ctx.lineTo(822, 517); ctx.lineTo(837, 526); ctx.lineTo(837, 548); ctx.lineTo(826, 558);
  ctx.lineTo(843, 561); ctx.lineTo(843, 534); ctx.lineTo(820, 505); ctx.lineTo(827, 488); ctx.lineTo(857, 480); ctx.lineTo(887, 495); ctx.lineTo(895, 520); ctx.lineTo(874, 537); ctx.lineTo(875, 568);
  ctx.lineTo(907, 568); ctx.lineTo(908, 546); ctx.lineTo(947, 546); ctx.lineTo(958, 554); ctx.lineTo(953, 573);
  ctx.bezierCurveTo(993, 568, 1008, 577, 1006, 591); ctx.lineTo(1003, 613); ctx.lineTo(973, 626); ctx.lineTo(992, 690); ctx.lineTo(955, 700); ctx.lineTo(936, 632);
  ctx.lineTo(910, 639); ctx.lineTo(914, 730); ctx.lineTo(873, 742); ctx.lineTo(861, 649); ctx.lineTo(784, 648); ctx.lineTo(780, 669); ctx.lineTo(751, 668); ctx.lineTo(750, 645);
  ctx.lineTo(685, 638); ctx.lineTo(667, 719); ctx.lineTo(627, 725); ctx.lineTo(640, 628); ctx.lineTo(607, 616); ctx.closePath();
  ctx.clip(); ctx.drawImage(background, 0, 0, 1536, 1024); ctx.restore();
}
function paint(now: number): void {
  ctx.drawImage(background, 0, 0, 1536, 1024);
  drawActor(2, now); drawActor(1, now); foregroundTable(); drawActor(0, now); drawActor(3, now);
}
function tick(now: number): void {
  if (document.hidden) { frame = 0; return; }
  if (ready && now - lastPaint >= 1000 / 30) { paint(now); lastPaint = now; }
  frame = requestAnimationFrame(tick);
}
$('character').addEventListener('change', () => { current().id = $<HTMLSelectElement>('character').value; current().action = 'idle'; loadActor(selected); sync(); });
$('action').addEventListener('change', () => { current().action = $<HTMLSelectElement>('action').value; actors[selected].bounds = null; actors[selected].media = null; actors[selected].player.playLooping(current().action); sync(); });
for (const id of ['size', 'offset'] as const) $(id).addEventListener('input', () => { current()[id] = Number($<HTMLInputElement>(id).value); if (id === 'size') $('sizeValue').textContent = `${current().size}%`; });
$('edit').onclick = () => { editing = !editing; $('controls').hidden = !editing; $('edit').textContent = editing ? '收起布置' : '安排朋友'; $('edit').setAttribute('aria-expanded', String(editing)); };
$('save').onclick = () => { try { localStorage.setItem(key, JSON.stringify(arrangement)); $('note').textContent = '已记住这次安排，下次来还是这些朋友。'; } catch { $('note').textContent = '暂时未能保存，当前安排仍在，请重试。'; } };
$('photo').onclick = () => { if (!ready) return; try { paint(performance.now()); const a = document.createElement('a'); a.download = 'QBot-窗边茶室.png'; a.href = canvas.toDataURL('image/png'); a.click(); } catch { $('note').textContent = '照片暂时未能保存，请重试。'; } };
document.addEventListener('visibilitychange', () => {
  for (const [i, a] of actors.entries()) { a.player.setSuspended(document.hidden); if (!document.hidden && arrangement[i].action && arrangement[i].id) a.player.playLooping(arrangement[i].action); }
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (!frame) frame = requestAnimationFrame(tick);
});
window.addEventListener('beforeunload', () => { cancelAnimationFrame(frame); actors.forEach(a => a.player.dispose()); });
async function boot(): Promise<void> {
  background.src = new URL('./art/afternoon.png', import.meta.url).href; await background.decode();
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
      return { id: typeof s.id === 'string' && characters.some(m => m.dirId === s.id) ? s.id : '', action: typeof s.action === 'string' ? s.action : 'idle', size: Number.isFinite(s.size) ? Math.min(145, Math.max(65, s.size)) : 100, offset: Number.isFinite(s.offset) ? Math.min(45, Math.max(-45, s.offset)) : 0 };
    });
  } catch { /* A damaged preview preference never changes installed characters. */ }
  arrangement.forEach((_, i) => loadActor(i)); sync(); ready = true; $('loading').hidden = true; document.body.dataset.ready = 'true'; frame = requestAnimationFrame(tick);
}
void boot().catch(() => { $('loading').textContent = '茶室素材未能打开，请重新进入。'; });
