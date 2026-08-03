/** room 渲染进程入口：内置房间背景 + 角色漫游驱动 + 点角色互动 + 语音 + 贴纸窗交互 + 装饰 */
import type { ActionId } from '@qbot/pipeline';
import { Player } from '../pet/player';
import { DEFAULT_VOICE_SETTINGS, Speaker, type VoiceSettings } from '../pet/voice/speak';
import { depthZ, footprintsOf, sanitizePlacements, type Footprint } from './decor';
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
/** 标准 6 动作（本地常量：renderer 不能 value-import pipeline，会把 node 依赖打进浏览器包） */
const STD_ACTION_IDS: readonly string[] = ['idle', 'drag', 'sleep', 'tea', 'talk_happy', 'talk_annoyed'];
let timer: ReturnType<typeof setTimeout> | null = null;
let editing = false; // 编辑态：漫游/发言/互动/窗口拖动全部暂停
/** 当前角色（取美术固有朝向用） */
let currentCharacter: Awaited<ReturnType<typeof window.qbot.characters.getActive>> = null;
/** 水平翻转系数：1 = 原朝向，-1 = 镜像（朝行进方向） */
let charScaleFlip = 1;
/** 是否有可用的自定义 walk 动画。
 *  漫游动作池只收标准动作（走路不该被当成「随机做个动作」抽中），
 *  所以 walk 单独记一个开关，只在 walking 状态用。 */
let hasWalkAction = false;
/** 行走动画的动作名（manifest.customActions 里的 key） */
const WALK_ACTION = 'walk';

const player = new Player(charStage, () => dispatch({ type: 'VIDEO_ENDED' }));

const speaker = new Speaker({
  bubble: document.getElementById('bubble')!,
  canSpeak: () => state.kind === 'resting',
  playAction: (action) => dispatch({ type: 'SPEAK_ACTION', action }),
  hasAction: (action) => available.includes(action),
});

/**
 * 行走素材本身的朝向。
 * 不能用 manifest.actions.talk_happy.facing 当代理——那是**另一个动作**的朝向，
 * 自定义动作的 manifest 里没有 facing 字段，实测按它判断会翻反。
 * walk 生成时 prompt 明确要求「正侧面朝左」，所以钉死为 left。
 */
const WALK_ART_FACING: 'left' | 'right' = 'left';

/**
 * 走动朝向：让角色面朝行进方向。房间里角色四面八方走，所以必须按 dx 判断
 * （桌面上是固定方向所以不翻）。素材朝左 → 往右走才需要镜像。
 *
 * 换向必须是**瞬间**的：镜像若跟着走动的 transition 补间，会经过 scaleX(0)
 * 把角色压扁成一条线。所以镜像单独放在 #charStage（无过渡），并在换向那一刻
 * 触发烟雾特效遮掩这一帧的跳变。
 */
function faceTowards(dx: number): void {
  if (Math.abs(dx) < 1) return; // 几乎垂直移动：保持当前朝向，别抖
  const goingRight = dx > 0;
  const next = goingRight === (WALK_ART_FACING === 'left') ? -1 : 1;
  if (next === charScaleFlip) return; // 朝向没变，别白放特效
  charScaleFlip = next;
  player.triggerPoof();
}

/** 脚底锚点定位 + 远近缩放；durationMs>0 = 走动的匀速平移 */
function render(pos: Point, durationMs: number): void {
  // 走动用 linear：ease-in-out 的起步/收尾加减速配上平移会更像「飘」而不是走
  const ease = durationMs > 0 ? `transform ${durationMs}ms linear` : 'none';
  char.style.transition = ease;
  // 缩放不跟走动同缓动（远近变化应平滑连续，不需要 linear）
  charScale.style.transition = durationMs > 0 ? `transform ${durationMs}ms linear` : 'none';
  char.style.transform = `translate(${pos.x - spec.petHeight / 2}px, ${pos.y - spec.petHeight}px)`;
  // #charScale 只做远近缩放；镜像放在 #charStage —— 否则会把同级的 #bubble 一起镜像
  // （实测气泡文字反过来了），而且跟着补间会被压扁。
  charScale.style.transform = `scale(${scaleForY(pos.y, spec)})`;
  charStage.style.transition = 'none';
  charStage.style.transform = `scaleX(${charScaleFlip})`;
  // 与地面家具共用同一深度刻度：角色走到家具前面就盖住它，走到后面就被挡
  char.style.zIndex = String(depthZ(pos.y, spec));
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

/**
 * 当前地面家具足迹。每次现取而不缓存：placements 只由 DecorEditor 持有，
 * 且它的每个修改器都**重新赋值新数组** —— 缓存一份引用会立刻失效。
 */
function currentBlocked(): Footprint[] {
  return footprintsOf(editor.placementsSnapshot(), (id) => DECOR_BY_ID.get(id));
}

function dispatch(event: Parameters<typeof step>[1]): void {
  if (editing) return; // 编辑态冻结漫游
  const result = step(state, event, { available, rng, geom: spec, blocked: currentBlocked() });
  if (result.state === state && !result.play && !result.restMs) return; // 事件被忽略
  state = result.state;
  clearTimer();
  if (state.kind === 'walking') {
    // 有 walk 动画就循环播它（roam.ts 给的是 idle 兜底：没有行走动画时只能原地站着滑）
    faceTowards(state.to.x - state.from.x);
    if (hasWalkAction) player.playLooping(WALK_ACTION);
    else if (result.play) player.play(result.play);
    render(state.to, state.durationMs);
    timer = setTimeout(() => dispatch({ type: 'WALK_ARRIVED' }), state.durationMs);
  } else {
    if (result.play) player.play(result.play);
    // 拎着时跟手：不能有过渡，否则会拖出橡皮筋般的延迟
    render(state.pos, 0);
  }
  if (result.restMs) timer = setTimeout(() => dispatch({ type: 'REST_OVER' }), result.restMs);
}

// ── 角色加载（启动主动拉取 + 切角色广播） ─────────────────
function loadCharacter(meta: Awaited<ReturnType<typeof window.qbot.characters.getActive>>): void {
  if (!meta?.manifest) return; // 无激活角色：空房间照常展示
  currentCharacter = meta;
  // 小房间漫游只用标准动作，自定义动作（听歌摇摆等）不参与
  const loaded = player.load(meta.dirId, meta.manifest);
  hasWalkAction = loaded.includes(WALK_ACTION);
  available = loaded.filter((id): id is ActionId => STD_ACTION_IDS.includes(id));
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

// ── 点角色 / 拎起角色 ─────────────────────────────────────
// 点一下 = 就近走一小会；按住拖 = 拎起来（播 drag 动画，跟手移动，松手落回地板）
// 不用 setPointerCapture：同 DecorEditor 的注释，CDP 合成事件下它会抛异常，
// 而 releasePointerCapture 一抛就会把后面的 DRAG_END 吃掉 → 角色永远卡在 drag。
// 改成 window 级监听，天然免疫。
const CHAR_DRAG_THRESHOLD = 4; // px（房间坐标），超过才算拖拽而非点击

char.addEventListener('pointerdown', (e) => {
  if (editing || available.length === 0 || e.button !== 0) return;
  e.stopPropagation(); // 别触发窗口拖动
  const downAt = toRoom(e.clientX, e.clientY);
  let dragging = false;

  const onMove = (ev: PointerEvent): void => {
    const p = toRoom(ev.clientX, ev.clientY);
    if (!dragging) {
      if (Math.hypot(p.x - downAt.x, p.y - downAt.y) < CHAR_DRAG_THRESHOLD) return;
      dragging = true;
      speaker.stop(); // 拎起来就别说话了
      dispatch({ type: 'DRAG_START', pos: p });
    }
    dispatch({ type: 'DRAG_MOVE', pos: p });
  };

  const onUp = (ev: PointerEvent): void => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (dragging) {
      dispatch({ type: 'DRAG_END', pos: toRoom(ev.clientX, ev.clientY) });
      return;
    }
    // 没超过阈值 = 点击：就近走一小会 + 说一句
    dispatch({ type: 'CHAR_CLICK', pos: currentPos() });
    speaker.forceSpeak();
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
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
    window.qbot.room.setIgnoreMouse(false); // 编辑期整窗可交互（装饰栏在轮廓外）
    inRoom = true;
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
// 编辑态整窗保持可交互：装饰栏 fixed 在轮廓外的透明区，穿透会让它点不到。
let inRoom = false;
document.addEventListener('mousemove', (e) => {
  const inside = editing || pointInPolygon(toRoom(e.clientX, e.clientY), spec.outline);
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
