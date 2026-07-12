/** room 渲染进程入口：内置房间背景 + 角色漫游驱动 + 点角色互动 + 语音 + 贴纸窗交互 + 装饰 */
import type { ActionId } from '@qbot/pipeline';
import { Player } from '../pet/player';
import { DEFAULT_VOICE_SETTINGS, Speaker, type VoiceSettings } from '../pet/voice/speak';
import { sanitizePlacements } from './decor';
import { DecorEditor } from './decor-editor';
import { DECOR_BY_ID } from './decor-pack';
import { pointInPolygon, polygonCentroid } from './geometry';
import { scaleForY, step, type Point, type RoamState } from './roam';
import { DEFAULT_ROOM, FALLBACK_ROOM } from './rooms/default';

const spec = DEFAULT_ROOM;
const stage = document.getElementById('stage')!;
const bg = document.getElementById('bg') as HTMLImageElement;
const char = document.getElementById('char')!;
const charScale = document.getElementById('charScale')!;
const charStage = document.getElementById('charStage')!;
const closeBtn = document.getElementById('closeBtn')!;
const menu = document.getElementById('menu')!;
const rng = { random: () => Math.random() };

// ── 房间画布布局 ─────────────────────────────────────────
let fit = 1;
function applyLayout(): void {
  bg.src = spec.background;
  stage.style.width = `${spec.width}px`;
  stage.style.height = `${spec.height}px`;
  char.style.width = `${spec.petHeight}px`;
  char.style.height = `${spec.petHeight}px`;
  // 关闭钮贴在右墙上缘内侧（房间坐标系，随 stage 缩放）
  const xs = spec.outline.map((p) => p[0]);
  const ys = spec.outline.map((p) => p[1]);
  closeBtn.style.left = `${Math.max(...xs) - 92}px`;
  closeBtn.style.top = `${Math.min(...ys) + 130}px`;
  fitStage();
}

function fitStage(): void {
  fit = Math.min(window.innerWidth / spec.width, window.innerHeight / spec.height);
  stage.style.setProperty('--fit', String(fit));
}
window.addEventListener('resize', fitStage);

// 内置 PNG 背景异常（缺失/损坏）→ 回退 SVG 手绘房间（几何一并切换）
bg.addEventListener('error', () => {
  if (spec.background === FALLBACK_ROOM.background) return;
  Object.assign(spec, FALLBACK_ROOM);
  applyLayout();
  state = { kind: 'resting', pos: polygonCentroid(spec.floor) };
  render(state.pos, 0);
});
applyLayout();

/** 窗口客户区坐标 → 房间坐标 */
function toRoom(clientX: number, clientY: number): Point {
  return { x: clientX / fit, y: clientY / fit };
}

// ── 状态机驱动 ───────────────────────────────────────────
let state: RoamState = { kind: 'resting', pos: polygonCentroid(spec.floor) };
let available: ActionId[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let editing = false; // 编辑态：漫游/发言/互动/窗口拖动全部暂停

const player = new Player(charStage, () => dispatch({ type: 'VIDEO_ENDED' }));

const speaker = new Speaker({
  bubble: document.getElementById('bubble')!,
  canSpeak: () => state.kind === 'resting',
  playAction: (action) => dispatch({ type: 'SPEAK_ACTION', action }),
  hasAction: (action) => available.includes(action),
});

/** 脚底锚点定位 + 远近缩放；durationMs>0 = 走动的缓动平移 */
function render(pos: Point, durationMs: number): void {
  const ease = durationMs > 0 ? `transform ${durationMs}ms ease-in-out` : 'none';
  char.style.transition = ease;
  charScale.style.transition = ease;
  char.style.transform = `translate(${pos.x - spec.petHeight / 2}px, ${pos.y - spec.petHeight}px)`;
  charScale.style.transform = `scale(${scaleForY(pos.y, spec)})`;
}

/** 当前实际位置（走动中 = CSS 过渡的插值位置），脚底锚点坐标 */
function currentPos(): Point {
  const m = new DOMMatrixReadOnly(getComputedStyle(char).transform);
  return { x: m.m41 + spec.petHeight / 2, y: m.m42 + spec.petHeight };
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function dispatch(event: Parameters<typeof step>[1]): void {
  if (editing) return; // 编辑态冻结漫游
  const result = step(state, event, { available, rng, geom: spec });
  if (result.state === state && !result.play && !result.restMs) return; // 事件被忽略
  state = result.state;
  clearTimer();
  if (result.play) player.play(result.play);
  if (state.kind === 'walking') {
    render(state.to, state.durationMs);
    timer = setTimeout(() => dispatch({ type: 'WALK_ARRIVED' }), state.durationMs);
  } else {
    render(state.pos, 0);
  }
  if (result.restMs) timer = setTimeout(() => dispatch({ type: 'REST_OVER' }), result.restMs);
}

// ── 角色加载（启动主动拉取 + 切角色广播） ─────────────────
function loadCharacter(meta: Awaited<ReturnType<typeof window.qbot.characters.getActive>>): void {
  if (!meta?.manifest) return; // 无激活角色：空房间照常展示
  available = player.load(meta.dirId, meta.manifest);
  clearTimer();
  state = { kind: 'resting', pos: polygonCentroid(spec.floor) };
  player.play('idle');
  render(state.pos, 0);
  timer = setTimeout(() => dispatch({ type: 'REST_OVER' }), 2_000); // 进门先站一会
  speaker.setCharacter(meta.manifest.id, meta.manifest.voice);
}

void window.qbot.characters.getActive().then(loadCharacter);
window.qbot.characters.onActivated(loadCharacter);

// ── 语音设置 ─────────────────────────────────────────────
function voiceSettings(s: {
  voiceEnabled?: boolean;
  voiceVolume?: number;
  talkFrequency?: VoiceSettings['talkFrequency'];
}): VoiceSettings {
  return {
    voiceEnabled: s.voiceEnabled ?? DEFAULT_VOICE_SETTINGS.voiceEnabled,
    voiceVolume: s.voiceVolume ?? DEFAULT_VOICE_SETTINGS.voiceVolume,
    talkFrequency: s.talkFrequency ?? DEFAULT_VOICE_SETTINGS.talkFrequency,
  };
}
void window.qbot.settings.get().then((s) => speaker.setSettings(voiceSettings(s)));
window.qbot.settings.onChanged((s) => speaker.setSettings(voiceSettings(s)));

// ── 点角色互动：打断漫游，talk_happy + 说一句 ─────────────
char.addEventListener('click', () => {
  if (editing || available.length === 0) return;
  dispatch({ type: 'CHAR_CLICK', pos: currentPos() });
  speaker.forceSpeak();
});

// ── 装饰系统 ─────────────────────────────────────────────
const editor = new DecorEditor({
  stage,
  layer: document.getElementById('decor')!,
  bar: document.getElementById('decorBar')!,
  spec,
  toRoom,
  onEnter: () => {
    editing = true;
    clearTimer();
    speaker.stop(); // 气泡收起、自主发言停
    hideMenu();
  },
  onExit: (placements) => {
    void window.qbot.decor.set(spec.name, placements);
    editing = false;
    // 角色从定格处回到 resting 重新起漫游
    state = { kind: 'resting', pos: currentPos() };
    player.play('idle');
    render(state.pos, 0);
    timer = setTimeout(() => dispatch({ type: 'REST_OVER' }), 2_000);
    speaker.interrupt(); // 重排下一次自主发言
  },
});

void window.qbot.decor
  .get(spec.name)
  .then((raw) => editor.setPlacements(sanitizePlacements(raw, new Set(DECOR_BY_ID.keys()))));

// ── 贴纸窗交互 ───────────────────────────────────────────
// 外沿透明区穿透：鼠标出入房间实体轮廓时切换 setIgnoreMouseEvents（forward 保证
// 穿透期间 mousemove 仍进来，能判定回归）；同一状态只发一次 IPC。
let inRoom = false;
document.addEventListener('mousemove', (e) => {
  const inside = pointInPolygon(toRoom(e.clientX, e.clientY), spec.outline);
  if (inside === inRoom) return;
  inRoom = inside;
  window.qbot.room.setIgnoreMouse(!inside);
  document.body.classList.toggle('in-room', inside); // 关闭钮随之浮现/隐藏
  if (!inside) hideMenu();
});

// 空白处按住拖动 = 移动窗口（角色/关闭钮/菜单除外），复用 pet 窗模式：
// screenX/Y 差值（clientX 会正反馈抖动）+ rAF 节流。
let winDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let rafPending = false;
let lastScreenX = 0;
let lastScreenY = 0;

stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || editing) return; // 编辑态禁用移窗（拖装饰优先）
  const t = e.target as Node;
  if (char.contains(t) || closeBtn.contains(t)) return;
  winDragging = true;
  dragOffsetX = e.clientX;
  dragOffsetY = e.clientY;
  stage.setPointerCapture(e.pointerId);
  hideMenu();
});
stage.addEventListener('pointermove', (e) => {
  if (!winDragging) return;
  lastScreenX = e.screenX;
  lastScreenY = e.screenY;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (winDragging) window.qbot.room.move(lastScreenX - dragOffsetX, lastScreenY - dragOffsetY);
    });
  }
});
stage.addEventListener('pointerup', (e) => {
  if (!winDragging) return;
  winDragging = false;
  stage.releasePointerCapture(e.pointerId);
});

// 关闭：悬停钮 / ESC / 右键菜单，统一 window.close()（主进程 closed 事件恢复 pet 窗）
closeBtn.addEventListener('click', () => window.close());
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (editor.active) editor.exit(); // 编辑态 ESC 先退编辑，再按才关窗
  else window.close();
});

function hideMenu(): void {
  menu.style.display = 'none';
}

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!inRoom || editing) return;
  menu.replaceChildren();
  const decorate = document.createElement('div');
  decorate.className = 'menu-item';
  decorate.textContent = '布置房间';
  decorate.addEventListener('click', () => {
    hideMenu();
    editor.enter(editor.placementsSnapshot());
  });
  menu.appendChild(decorate);
  const close = document.createElement('div');
  close.className = 'menu-item';
  close.textContent = '关闭房间';
  close.addEventListener('click', () => {
    hideMenu();
    window.close();
  });
  menu.appendChild(close);
  menu.style.display = 'block';
  const mw = 120;
  menu.style.left = `${Math.min(e.clientX, window.innerWidth - mw - 4)}px`;
  menu.style.top = `${Math.min(e.clientY, window.innerHeight - 78)}px`;
});
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target as Node)) hideMenu();
});
