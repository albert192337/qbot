import './style.css';
import { Player } from '../pet/player';
import { blocked, clamp, freshLayout, project, restoreLayout, route, unproject, type Furniture, type Point } from './model';

const compare3d = document.createElement('a');
compare3d.href = '../cozy3d/index.html';
compare3d.textContent = '试试真正的 3D 小屋 ↗';
compare3d.style.cssText = 'color:#788868;font-size:12px;margin-left:auto;margin-right:20px';
document.querySelector('header')!.insertBefore(compare3d, document.getElementById('save'));
const tearoom = document.createElement('a');
tearoom.href = '../tearoom/index.html';
tearoom.textContent = '试住窗边茶室 ↗';
tearoom.style.cssText = 'color:#788868;font-size:12px;margin-right:16px';
document.querySelector('header')!.insertBefore(tearoom, document.getElementById('save'));

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('roomCanvas'), ctx = canvas.getContext('2d')!;
const storageKey = 'qbot.cozy.preview.layout.v1';
let layout = freshLayout(), selected = 'sofa';
try { layout = restoreLayout(JSON.parse(localStorage.getItem(storageKey) || 'null')); } catch { /* Isolated preview falls back without touching real decor. */ }
const shell = new Image(), atlas = new Image();
const spriteRects: Array<{ x: number; y: number; w: number; h: number }> = [];
let fit = 1, ox = 0, oy = 0, width = 800, height = 640, ready = false;
let pet: Point = project(.72, .73), path: Point[] = [], dragging: Furniture | null = null;
let dragOffset: Point = { x: 0, y: 0 }, dragStart: { u: number; v: number } | null = null;
let frame = 0, lastAt = 0, lastPaint = 0, characterGeneration = 0;
const source = $('actorSource');
let actions: string[] = [];
const player = new Player(source, () => { if (actions.includes('idle')) player.playLooping('idle'); });
let portrait: HTMLImageElement | null = null;
type Meta = Awaited<ReturnType<typeof window.qbot.characters.getActive>>;
let characters: NonNullable<Meta>[] = [];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function status(message: string): void { $('status').textContent = message; }
function change(): void { $('save').textContent = '保存布置'; status('布置有新变化，记得保存。'); sync(); }
function sync(): void {
  document.body.dataset.theme = layout.theme;
  $('sceneLabel').textContent = { day: '午后的奶油小屋', sunset: '落日里的小屋', night: '留一盏灯，等你回来' }[layout.theme];
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === layout.theme)));
  $<HTMLInputElement>('rug').checked = layout.rug;
  $<HTMLInputElement>('shadows').checked = layout.shadows;
  const f = layout.furniture.find(f => f.id === selected)!;
  $('selectedName').textContent = f.label;
  $('stow').textContent = f.visible ? '收起来' : '放回房间';
  document.querySelectorAll<HTMLButtonElement>('#catalog button').forEach(b => {
    const item = layout.furniture.find(f => f.id === b.dataset.id)!;
    b.setAttribute('aria-pressed', String(item.id === selected));
    b.querySelector('i')!.textContent = item.visible ? '' : '已收起';
  });
}
function save(): void {
  try { localStorage.setItem(storageKey, JSON.stringify(layout)); $('save').textContent = '已保存'; status('已保存到这间试住小屋，下次打开还在。'); }
  catch { status('暂时没能保存，当前布置还在，请重试。'); }
}
function resize(): void {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  width = r.width; height = r.height;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fit = Math.min((width - 12) / 1024, (height - 22) / 920);
  ox = (width - 1024 * fit) / 2; oy = (height - 920 * fit) / 2 - 55 * fit;
}
const observer = new ResizeObserver(resize); observer.observe(canvas);
function at(e: PointerEvent): Point { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / fit, y: (e.clientY - r.top - oy) / fit }; }
function bounds(f: Furniture) {
  const s = spriteRects[f.index], p = project(f.u, f.v), h = f.width * s.h / s.w;
  return { x: p.x - f.width / 2, y: p.y - h + 8, w: f.width, h };
}
function ellipse(x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function shadow(p: Point, rx: number, ry: number, strength = .25): void {
  if (!layout.shadows) return;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(70,49,25,${strength})`); g.addColorStop(.5, `rgba(70,49,25,${strength * .4})`); g.addColorStop(1, 'rgba(70,49,25,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function rug(): void {
  const c = project(.54, .57);
  shadow({ x: c.x, y: c.y + 9 }, 219, 107, .19);
  ellipse(c.x, c.y + 5, 207, 100, '#a3a489');
  ellipse(c.x, c.y, 206, 99, '#ded9bb');
  ellipse(c.x, c.y - 1, 199, 94, '#f1e8cf');
  ctx.strokeStyle = '#d6c9a4'; ctx.lineWidth = 2;
  for (const gap of [8, 13, 20]) { ctx.beginPath(); ctx.ellipse(c.x, c.y, 199 - gap, 94 - gap * .5, 0, 0, Math.PI * 2); ctx.stroke(); }
  // Fine concentric stitches stay subtle when the room is scaled down.
  ctx.strokeStyle = '#c8bb942d'; ctx.lineWidth = 1;
  for (let r = 15; r < 173; r += 9) { ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * .47, 0, 0, Math.PI * 2); ctx.stroke(); }
}
function furniture(f: Furniture): void {
  const s = spriteRects[f.index], b = bounds(f), p = project(f.u, f.v);
  shadow({ x: p.x + 2, y: p.y - 4 }, f.width * .51, f.width * .14);
  ctx.save();
  if (f.flip) { ctx.translate(p.x * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(atlas, s.x, s.y, s.w, s.h, b.x, b.y, b.w, b.h);
  ctx.restore();
  if (dragging?.id === f.id) {
    ctx.save(); ctx.strokeStyle = '#879a73'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, f.width * .43, f.width * .15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
}
function currentFrame(): HTMLVideoElement | HTMLImageElement | null {
  const video = [...source.querySelectorAll('video')].find(v => v.style.visibility === 'visible' && v.readyState >= 2);
  return video || (portrait?.complete && portrait.naturalWidth ? portrait : null);
}
function drawPet(now: number): void {
  const image = currentFrame(); if (!image) return;
  shadow({ x: pet.x, y: pet.y - 3 }, 43, 12, .3);
  const bob = path.length && !reduced.matches ? Math.abs(Math.sin(now / 105)) * 3 : 0;
  ctx.drawImage(image, pet.x - 85, pet.y - 164 - bob, 170, 170);
}
let lightMask: HTMLCanvasElement | null = null;
function updateLightMask(): void {
  lightMask = document.createElement('canvas'); lightMask.width = 512; lightMask.height = 512;
  const g = lightMask.getContext('2d')!; g.drawImage(shell, 0, 0, 512, 512);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = layout.theme === 'night' ? '#233753' : '#df994e'; g.fillRect(0, 0, 512, 512);
}
function paint(now: number): void {
  ctx.clearRect(0, 0, width, height); ctx.save(); ctx.translate(ox, oy); ctx.scale(fit, fit);
  shadow({ x: 512, y: 844 }, 332, 70, .16);
  ctx.drawImage(shell, 0, 0, 1024, 1024);
  if (layout.rug) rug();
  const entries: Array<{ y: number; draw: () => void }> = layout.furniture.filter(f => f.visible).map(f => ({ y: project(f.u, f.v).y, draw: () => furniture(f) }));
  entries.push({ y: pet.y, draw: () => drawPet(now) });
  entries.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  if (layout.theme !== 'day' && lightMask) { ctx.save(); ctx.globalAlpha = layout.theme === 'night' ? .39 : .12; ctx.drawImage(lightMask, 0, 0, 1024, 1024); ctx.restore(); }
  const lamp = layout.furniture.find(f => f.id === 'lamp' && f.visible);
  if (lamp && layout.shadows) {
    const p = project(lamp.u, lamp.v), b = bounds(lamp);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(p.x, b.y + 26, 0, p.x, b.y + 26, 142);
    g.addColorStop(0, layout.theme === 'night' ? '#ffc974a0' : '#ffd89035'); g.addColorStop(1, '#ffd88000');
    ctx.fillStyle = g; ctx.fillRect(p.x - 145, b.y - 118, 290, 290);
    const ground = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90);
    ground.addColorStop(0, layout.theme === 'night' ? '#ffc47755' : '#ffd57715'); ground.addColorStop(1, '#ffc47700');
    ctx.fillStyle = ground; ctx.beginPath(); ctx.ellipse(p.x, p.y, 100, 42, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function tick(now: number): void {
  if (document.hidden) { frame = 0; return; }
  const dt = Math.min((now - lastAt) / 1000 || 0, .05); lastAt = now;
  if (path.length && !dragging) {
    const next = path[0], d = Math.hypot(next.x - pet.x, next.y - pet.y), step = dt * 105;
    if (d <= step) { pet = next; path.shift(); } else { pet.x += (next.x - pet.x) / d * step; pet.y += (next.y - pet.y) / d * step; }
  }
  if (ready && now - lastPaint > 1000 / 30) { paint(now); lastPaint = now; }
  frame = requestAnimationFrame(tick);
}
function keepPetClear(): void {
  if (!blocked(pet, layout.furniture)) return;
  const candidates = [.82, .7, .55, .4, .25];
  for (const u of candidates) for (const v of candidates) if (!blocked(project(u, v), layout.furniture)) { pet = project(u, v); path = []; return; }
}
canvas.addEventListener('pointerdown', e => {
  if (!ready || e.button !== 0) return;
  const p = at(e);
  const hit = [...layout.furniture].filter(f => f.visible).sort((a,b) => project(b.u,b.v).y - project(a.u,a.v).y).find(f => { const b = bounds(f); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; });
  if (hit) {
    selected = hit.id; dragging = hit; dragStart = { u: hit.u, v: hit.v };
    const foot = project(hit.u, hit.v); dragOffset = { x: p.x - foot.x, y: p.y - foot.y };
    path = []; canvas.setPointerCapture(e.pointerId); sync(); canvas.style.cursor = 'grabbing';
  } else {
    const uv = unproject(p); if (uv.u < .08 || uv.u > .92 || uv.v < .08 || uv.v > .92) return;
    path = route(pet, p, layout.furniture); status(path.length ? '来，去那边坐一会儿。' : '这里有点挤，换一个位置试试。');
  }
  canvas.focus();
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const p = at(e), uv = unproject({ x: p.x - dragOffset.x, y: p.y - dragOffset.y });
  dragging.u = clamp(uv.u, .12, .88); dragging.v = clamp(uv.v, .12, .88);
});
function endDrag(cancel = false): void {
  if (!dragging) return;
  if (cancel && dragStart) Object.assign(dragging, dragStart);
  else if (dragStart && (dragging.u !== dragStart.u || dragging.v !== dragStart.v)) change();
  dragging = null; dragStart = null; canvas.style.cursor = 'default'; keepPetClear();
}
canvas.addEventListener('pointerup', () => endDrag());
canvas.addEventListener('pointercancel', () => endDrag(true));
canvas.addEventListener('lostpointercapture', () => endDrag());
canvas.addEventListener('keydown', e => {
  const f = layout.furniture.find(f => f.id === selected)!;
  if (e.key === 'Escape') { endDrag(true); return; }
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault(); if (!f.visible) return;
  const p = project(f.u, f.v), delta = e.shiftKey ? 12 : 4;
  const uv = unproject({ x: p.x + (e.key === 'ArrowRight' ? delta : e.key === 'ArrowLeft' ? -delta : 0), y: p.y + (e.key === 'ArrowDown' ? delta : e.key === 'ArrowUp' ? -delta : 0) });
  f.u = clamp(uv.u,.12,.88); f.v = clamp(uv.v,.12,.88); keepPetClear(); change();
});
$('save').addEventListener('click', save);
$('flip').addEventListener('click', () => { const f = layout.furniture.find(f => f.id === selected)!; f.flip = !f.flip; change(); });
$('stow').addEventListener('click', () => { const f = layout.furniture.find(f => f.id === selected)!; f.visible = !f.visible; path = []; keepPetClear(); change(); });
let resetArmed = false;
$('reset').addEventListener('click', () => {
  if (!resetArmed) { resetArmed = true; $('reset').textContent = '再点一次恢复（保存前可关闭放弃）'; return; }
  layout = freshLayout(); path = []; selected = 'sofa'; pet = project(.72,.73); resetArmed = false; $('reset').textContent = '恢复初始布置'; updateLightMask(); change();
});
document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b => b.addEventListener('click', () => { layout.theme = b.dataset.theme as typeof layout.theme; updateLightMask(); change(); }));
for (const id of ['rug','shadows'] as const) $(id).addEventListener('change', () => { layout[id] = $<HTMLInputElement>(id).checked; change(); });

async function showCharacter(meta: NonNullable<Meta>): Promise<void> {
  const generation = ++characterGeneration; portrait = null;
  actions = player.load(meta.dirId, meta.manifest);
  if (actions.includes('idle')) player.playLooping('idle'); else if (actions.length) player.playLooping(actions[0]);
  const img = new Image(); img.src = `qbot-asset://${meta.dirId}/__portrait.png`;
  try { await img.decode(); if (generation === characterGeneration) portrait = img; } catch { /* The playable asset remains the primary source. */ }
}
$('friend').addEventListener('change', () => { const meta = characters.find(m => m.dirId === $<HTMLSelectElement>('friend').value); if (meta) void showCharacter(meta); });
async function loadFriends(): Promise<void> {
  try {
    const [list, active] = await Promise.all([window.qbot.characters.list(), window.qbot.characters.getActive()]);
    characters = list.filter(m => m.manifest);
    if (active && !characters.some(m => m.dirId === active.dirId)) characters.unshift(active);
    const select = $<HTMLSelectElement>('friend'); select.replaceChildren();
    for (const meta of characters) { const option = document.createElement('option'); option.value = meta.dirId; option.textContent = meta.manifest.name || '我的朋友'; select.append(option); }
    if (active || characters[0]) { const meta = active || characters[0]; select.value = meta.dirId; await showCharacter(meta); }
    else { const option = document.createElement('option'); option.textContent = '还没有角色'; select.append(option); $('friendNote').textContent = '先布置好小屋，创建角色后再来。'; }
  } catch { $('friendNote').textContent = '暂时没找到角色，仍可试摆家具。'; }
}
async function boot(): Promise<void> {
  shell.src = new URL('./art/room-shell.png', import.meta.url).href;
  atlas.src = new URL('./art/furniture.png', import.meta.url).href;
  await Promise.all([shell.decode(), atlas.decode()]);
  // Inspect alpha inside each atlas cell; crop at render time, preserving the source asset.
  const scratch = document.createElement('canvas'); scratch.width = atlas.width; scratch.height = atlas.height;
  const g = scratch.getContext('2d')!; g.drawImage(atlas,0,0); const data = g.getImageData(0,0,atlas.width,atlas.height).data;
  const cw = atlas.width / 3, ch = atlas.height / 2;
  for (let i = 0; i < 6; i++) {
    const left = i % 3 * cw, top = Math.floor(i / 3) * ch;
    // Generated atlases can contain a disconnected leaf/leg from a neighboring cell.
    // Bound the dominant connected silhouette, not every nontransparent pixel.
    const visited = new Uint8Array(cw * ch), queue = new Int32Array(cw * ch);
    let best = { count: 0, minX: left, minY: top, maxX: left + cw - 1, maxY: top + ch - 1 };
    const opaque = (id: number) => data[((top + Math.floor(id / cw)) * atlas.width + left + id % cw) * 4 + 3] > 45;
    for (let seed = 0; seed < cw * ch; seed++) {
      if (visited[seed] || !opaque(seed)) continue;
      let head = 0, tail = 1, minX = left + cw, minY = top + ch, maxX = left, maxY = top;
      queue[0] = seed; visited[seed] = 1;
      while (head < tail) {
        const id = queue[head++], x = left + id % cw, y = top + Math.floor(id / cw);
        minX = Math.min(minX,x); minY = Math.min(minY,y); maxX = Math.max(maxX,x); maxY = Math.max(maxY,y);
        for (const next of [id - 1,id + 1,id - cw,id + cw]) {
          if (next < 0 || next >= cw * ch || visited[next] || Math.abs(next % cw - id % cw) + Math.abs(Math.floor(next / cw) - Math.floor(id / cw)) !== 1 || !opaque(next)) continue;
          visited[next] = 1; queue[tail++] = next;
        }
      }
      if (tail > best.count) best = { count: tail,minX,minY,maxX,maxY };
    }
    spriteRects.push({ x: best.minX, y: best.minY, w: best.maxX-best.minX+1, h: best.maxY-best.minY+1 });
  }
  for (const f of layout.furniture) {
    const b = document.createElement('button'); b.dataset.id = f.id; b.setAttribute('aria-label', f.label);
    const thumb = document.createElement('canvas'); thumb.width = 220; thumb.height = 130;
    const tg = thumb.getContext('2d')!, r = spriteRects[f.index], s = Math.min(190 / r.w,116 / r.h);
    tg.drawImage(atlas,r.x,r.y,r.w,r.h,(220-r.w*s)/2,(130-r.h*s)/2,r.w*s,r.h*s);
    const label = document.createElement('span'); label.textContent = f.label; b.append(thumb,label,document.createElement('i'));
    b.addEventListener('click', () => { selected = f.id; const current = layout.furniture.find(x => x.id === f.id)!; if (!current.visible) { current.visible = true; change(); } sync(); });
    $('catalog').append(b);
  }
  updateLightMask(); sync(); resize(); ready = true; $('loading').hidden = true; keepPetClear();
  document.body.dataset.ready = 'true';
  frame = requestAnimationFrame(tick); await loadFriends();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; source.querySelectorAll('video').forEach(v => v.pause()); }
  else { lastAt = performance.now(); if (!frame) frame = requestAnimationFrame(tick); const v = source.querySelector<HTMLVideoElement>('video[style*="visible"]'); if (v) void v.play().catch(() => {}); }
});
window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(frame); observer.disconnect(); player.dispose();
});
void boot().catch(() => { $('loading').textContent = '小屋素材没有加载成功，请关闭后重新打开。'; });
