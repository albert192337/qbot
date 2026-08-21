/** 窗口管理：桌宠透明置顶窗 + 孵化常规窗 + 小房间窗 + dock 显隐协调 */
import { BrowserWindow, app, screen, shell } from 'electron';
import path from 'node:path';
import type { CharacterMeta } from '../shared/ipc-types';
import { layoutRoomPets } from './rooms/rooms-rules';

const PET_SIZE = 360;
/** 房间宠上屏窗：比本地宠小一档（房友是客人体量），固定尺寸永不 resize */
const ROOM_PET_SIZE = 200;
const ROOM_PET_GAP = 20;
/**
 * 小房间窗边长。素材是 1024x1024，560 时 fit~0.55 -- 房间只占屏幕一小块，
 * 家具缩到 ~120px，观感「又小又挤」。放大到 960 让素材接近 1:1。
 * 实际值由 roomSize() 按工作区夹取，避免小屏被裁。
 */
const ROOM_SIZE_PREFERRED = 960;
/** 房间素材设计尺寸；超过它就是放大插值，别再往上加 */
const ROOM_ART_SIZE = 1024;
/** 气泡窗：固定尺寸，创建后只 setPosition 永不改大小（绕开透明窗 resize 渲染 bug） */
const BUBBLE_W = 340;
const BUBBLE_H = 500;
/** 气泡栈底边压进桌宠窗顶边的像素（桌宠窗顶部本就是 contain 留白） */
const BUBBLE_OVERLAP = 24;

let petWindow: BrowserWindow | null = null;
/** 公共房间宠上屏：键控多窗（memberId -> 窗），全员在线上限即窗口数上限 */
const roomPetWindows = new Map<string, BrowserWindow>();
let roomWindow: BrowserWindow | null = null;
let consoleWindow: BrowserWindow | null = null;
let loungeWindow: BrowserWindow | null = null;
let bubbleWindow: BrowserWindow | null = null;
let bubbleSide: 'above' | 'below' = 'above';
let petScale = 1;

/** 桌宠缩放（0.5~2）：窗口即画布，改窗口尺寸即改桌宠大小；右下角锚定 */
export function setPetScale(scale: number): void {
  petScale = Math.min(2, Math.max(0.5, scale || 1));
  if (!petWindow || petWindow.isDestroyed()) return;
  const size = Math.round(PET_SIZE * petScale);
  const [x, y] = petWindow.getPosition();
  const [w, h] = petWindow.getSize();
  // resizable:false 会拦 setSize → 临时放开
  petWindow.setResizable(true);
  petWindow.setBounds({ x: x + w - size, y: y + h - size, width: size, height: size });
  petWindow.setResizable(false);
  syncBubbleBounds(); // 不依赖 resize 事件的投递时机
}

type RendererPage = 'pet' | 'room' | 'bubble' | 'console' | 'lounge';

function load(win: BrowserWindow, page: RendererPage, query?: Record<string, string>): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    const qs = query ? `?${new URLSearchParams(query)}` : '';
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${page}/index.html${qs}`);
    return;
  }
  // 打包模式：loadFile 原生支持 query，location.search 两种模式行为一致
  void win.loadFile(
    path.join(__dirname, `../renderer/${page}/index.html`),
    query ? { query } : undefined,
  );
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow;
}

export function getRoomWindow(): BrowserWindow | null {
  return roomWindow;
}

export function getBubbleWindow(): BrowserWindow | null {
  return bubbleWindow;
}

export function isRoomOpen(): boolean {
  return !!roomWindow && !roomWindow.isDestroyed();
}

/** 气泡栈的锚定位置：默认贴桌宠头顶，顶部放不下就翻到脚下 */
function bubbleAnchor(pet: Electron.Rectangle): { x: number; y: number; side: 'above' | 'below' } {
  const wa = screen.getDisplayMatching(pet).workArea;
  const x = Math.round(
    Math.min(Math.max(pet.x + pet.width / 2 - BUBBLE_W / 2, wa.x), wa.x + wa.width - BUBBLE_W),
  );
  const above = pet.y - BUBBLE_H + BUBBLE_OVERLAP;
  if (above >= wa.y) return { x, y: Math.round(above), side: 'above' };
  const below = Math.min(pet.y + pet.height - BUBBLE_OVERLAP, wa.y + wa.height - BUBBLE_H);
  return { x, y: Math.round(Math.max(below, wa.y)), side: 'below' };
}

export function syncBubbleBounds(): void {
  const b = bubbleWindow;
  if (!b || b.isDestroyed() || !b.isVisible()) return; // 隐藏时不做功（常态）
  if (!petWindow || petWindow.isDestroyed()) return;
  const { x, y, side } = bubbleAnchor(petWindow.getBounds());
  b.setPosition(x, y, false); // 只移不改尺寸
  if (side !== bubbleSide) {
    bubbleSide = side;
    b.webContents.send('bubble:anchor', side);
  }
}

/** 激活角色变化：广播给 pet 窗（必要时创建）和 room 窗（存在时） */
/** 当前激活角色的可播放动作（合并顺序同 renderer player.load：标准 → 贴纸 → 自定义） */
let activePlayables: string[] = [];

export function broadcastCharacterActivated(meta: CharacterMeta): void {
  // 主进程侧同步一份可用动作（行为引擎的动作解析要用；与 player.load 同口径：
  // 生成动作看 status，贴纸/自定义动作落盘即可用）
  const m = meta.manifest;
  const ids: string[] = [];
  for (const [id, a] of Object.entries(m.actions ?? {})) {
    if (a.status === 'done') ids.push(id);
  }
  for (const id of Object.keys(m.importedActions ?? {})) ids.push(id);
  for (const [id, a] of Object.entries(m.customActions ?? {})) {
    if (a.status === 'done') ids.push(id);
  }
  activePlayables = ids;
  const pet = petWindow && !petWindow.isDestroyed() ? petWindow : createPetWindow();
  pet.webContents.send('characters:activated', meta);
  if (roomWindow && !roomWindow.isDestroyed()) {
    roomWindow.webContents.send('characters:activated', meta);
  }
}

/** 行为规则引擎的 setAvailableActionsGetter 接这里（无需 import 角色模块） */
export function getActivePlayables(): string[] {
  return activePlayables;
}

export function createPetWindow(): BrowserWindow {
  if (petWindow && !petWindow.isDestroyed()) return petWindow;
  const { workArea } = screen.getPrimaryDisplay();
  const size = Math.round(PET_SIZE * petScale);
  petWindow = new BrowserWindow({
    width: size,
    height: size,
    x: workArea.x + workArea.width - size - 40,
    y: workArea.y + workArea.height - size - 20,
    transparent: true,
    frame: false,
    hasShadow: false, // 不显式关会有残影阴影框
    resizable: false, // 透明窗 resize 有渲染 bug
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  petWindow.setAlwaysOnTop(true, 'floating'); // 盖普通窗，不盖 Mission Control
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // 气泡窗跟随：move 覆盖拖拽与 OS 侧移动，resize 覆盖缩放
  petWindow.on('move', syncBubbleBounds);
  petWindow.on('resize', syncBubbleBounds);
  petWindow.once('ready-to-show', () => petWindow?.show());
  petWindow.on('closed', () => {
    petWindow = null;
    closeBubbleWindow();
  });
  load(petWindow, 'pet');
  return petWindow;
}

// ── 公共房间宠上屏（2026-08-24）──────────────────────────────
// 固定尺寸键控多窗，永不 resize（血泪坑 4/18）；位置由 layoutRoomPets 算，
// 每次成员进出整体重排。窗数量 = 在线成员数，用户已明确选择「尽量全部在线」。

export function getRoomPetWindow(memberId: string): BrowserWindow | null {
  return roomPetWindows.get(memberId) ?? null;
}

/** 开一个成员的宠窗（幂等）；位置由随后的 layoutRoomPetWindows 统一摆放 */
export function ensureRoomPetWindow(memberId: string): BrowserWindow {
  const existing = roomPetWindows.get(memberId);
  if (existing && !existing.isDestroyed()) return existing;
  const { workArea } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    width: ROOM_PET_SIZE,
    height: ROOM_PET_SIZE,
    x: workArea.x + workArea.width - ROOM_PET_SIZE, // 摆位前的占位坐标，随即被 layout 覆盖
    y: workArea.y + workArea.height - ROOM_PET_SIZE,
    transparent: true,
    frame: false,
    hasShadow: false, // 同 pet 窗：不显式关会有残影阴影框
    resizable: false, // 透明窗 resize 有渲染 bug（血泪坑 4/18）
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    if (roomPetWindows.get(memberId) === win) roomPetWindows.delete(memberId);
  });
  roomPetWindows.set(memberId, win);
  load(win, 'pet', { roomPet: '1' });
  return win;
}

export function closeRoomPetWindow(memberId: string): void {
  const win = roomPetWindows.get(memberId);
  roomPetWindows.delete(memberId);
  if (win && !win.isDestroyed()) win.close();
}

export function closeAllRoomPetWindows(): void {
  for (const win of roomPetWindows.values()) {
    if (!win.isDestroyed()) win.close();
  }
  roomPetWindows.clear();
}

/** 反查：IPC 收到某个宠上屏窗的消息时，据此知道是哪个成员（窗数量小，扫表足够快） */
export function findRoomPetMemberId(win: BrowserWindow): string | null {
  for (const [memberId, w] of roomPetWindows) {
    if (w === win) return memberId;
  }
  return null;
}

/**
 * 按当前在线成员顺序重排所有宠窗：屏幕底部居中排开，超一行往上叠
 * （layoutRoomPets 是纯函数，这里只管把结果换算成绝对坐标 + setPosition）。
 * 成员进出、petScale 变化后都要调一次；只挪位置，窗口尺寸恒定不变。
 */
export function layoutRoomPetWindows(orderedMemberIds: readonly string[]): void {
  const { workArea } = screen.getPrimaryDisplay();
  const slots = layoutRoomPets(orderedMemberIds, workArea.width, ROOM_PET_SIZE, ROOM_PET_GAP);
  for (const slot of slots) {
    const win = roomPetWindows.get(slot.memberId);
    if (!win || win.isDestroyed()) continue;
    win.setPosition(
      Math.round(workArea.x + slot.x),
      Math.round(workArea.y + workArea.height - slot.bottomOffset),
      false,
    );
  }
}

/** 懒创建：桌宠 99% 时间没有 agent 消息，不预先吃一个 renderer 进程 */
function createBubbleWindow(): BrowserWindow {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) return bubbleWindow;
  bubbleWindow = new BrowserWindow({
    width: BUBBLE_W,
    height: BUBBLE_H,
    transparent: true,
    frame: false,
    hasShadow: false, // 同 pet/room：不显式关会有残影阴影框
    resizable: false, // 透明窗 resize 有渲染 bug
    focusable: false, // 纯展示层，绝不抢焦点
    skipTaskbar: true,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  bubbleWindow.setIgnoreMouseEvents(true); // 全穿透：不吃桌面点击
  bubbleWindow.setAlwaysOnTop(true, 'floating');
  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWindow.on('closed', () => (bubbleWindow = null));
  load(bubbleWindow, 'bubble');
  return bubbleWindow;
}

/** 显示气泡窗（先摆位再 show，避免在旧坐标闪一帧） */
export function showBubbleWindow(): BrowserWindow {
  const win = createBubbleWindow();
  if (!win.isVisible()) {
    if (petWindow && !petWindow.isDestroyed()) {
      const { x, y, side } = bubbleAnchor(petWindow.getBounds());
      win.setPosition(x, y, false);
      bubbleSide = side;
    }
    win.showInactive(); // 不抢焦点
  }
  syncBubbleBounds();
  return win;
}

/**
 * 隐藏气泡窗。先发 clear 再 hide 是必须的，不是省事：
 * Chromium 对隐藏窗口做定时器节流，留着 pending 的淡出定时器会导致
 * 回到桌面时一次性冒出一堆过期气泡。
 */
export function hideBubbleWindow(): void {
  const b = bubbleWindow;
  if (!b || b.isDestroyed()) return;
  b.webContents.send('bubble:clear');
  b.hide();
}

function closeBubbleWindow(): void {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) bubbleWindow.close();
  bubbleWindow = null;
}

/** 拖拽移动（高频调用，不做动画） */
export function movePetWindow(x: number, y: number): void {
  petWindow?.setPosition(Math.round(x), Math.round(y), false);
}

/** 进入串门模式：窗口拓宽为双人宽；离开时 restore=true 恢复单人尺寸 */
export function setPetVisitMode(enter: boolean): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const size = Math.round(PET_SIZE * petScale);
  const [x, y] = petWindow.getPosition();
  petWindow.setResizable(true);
  if (enter) {
    // 向右拓宽，保持角色位置不变
    petWindow.setBounds({ x: x, y: y, width: size * 2, height: size });
  } else {
    petWindow.setBounds({ x: x, y: y, width: size, height: size });
  }
  petWindow.setResizable(false);
}

export function moveRoomWindow(x: number, y: number): void {
  roomWindow?.setPosition(Math.round(x), Math.round(y), false);
}

/** 房间外沿透明区穿透：forward 让 mousemove 继续进 renderer 以便判定回归实体 */
export function setRoomIgnoreMouse(ignore: boolean): void {
  roomWindow?.setIgnoreMouseEvents(ignore, { forward: true });
}

/**
 * 开小房间：角色「走进房间」——pet 窗隐藏，room 窗关闭（含渲染进程崩溃、Cmd+W）
 * 统一走 closed 事件恢复 pet 窗。
 */
/**
 * 房间窗边长：取偏好值，但留出工作区边距并不超过素材原尺寸。
 * 小屏（笔记本 768p）会被夹到装得下的最大方形，避免窗口比屏幕还高。
 */
function roomSize(): number {
  const { workArea } = screen.getPrimaryDisplay();
  const fits = Math.floor(Math.min(workArea.width, workArea.height) * 0.9);
  return Math.max(480, Math.min(ROOM_SIZE_PREFERRED, ROOM_ART_SIZE, fits));
}

export function openRoomWindow(title: string): BrowserWindow {
  if (roomWindow && !roomWindow.isDestroyed()) {
    roomWindow.focus();
    return roomWindow;
  }
  petWindow?.hide();
  hideBubbleWindow(); // 角色进小房间：气泡跟着走
  if (process.platform === 'darwin') void app.dock?.show();
  const size = roomSize();
  const { workArea } = screen.getPrimaryDisplay();
  roomWindow = new BrowserWindow({
    width: size,
    height: size,
    // 原来完全没定位，Electron 默认摆放常常偏上角；房间是主要观赏面，居中
    x: Math.round(workArea.x + (workArea.width - size) / 2),
    y: Math.round(workArea.y + (workArea.height - size) / 2),
    useContentSize: true,
    title,
    // 贴纸小屋：只显示房间实体，外沿透明；关闭/拖动由 renderer 自绘
    transparent: true,
    frame: false,
    hasShadow: false, // 不显式关会有残影阴影框（同 pet 窗）
    resizable: false, // 透明窗 resize 有渲染 bug
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  roomWindow.on('closed', () => {
    roomWindow = null;
    petWindow?.show(); // 角色回桌面
    if (process.platform === 'darwin' && !consoleWindow) app.dock?.hide();
  });
  load(roomWindow, 'room');
  return roomWindow;
}

/** 控制台侧栏 pane 标识（与 renderer/console/main.ts 的 PaneId 对应） */
export type ConsolePane =
  | 'characters'
  | 'hatch'
  | 'persona'
  | 'scene-actions'
  | 'stickers'
  | 'prompts'
  | 'market'
  | 'claude'
  | 'settings'
  | 'devtools';

export function getConsoleWindow(): BrowserWindow | null {
  return consoleWindow;
}

/**
 * 统一广播：桌面宠窗 + 房间窗 + 控制台窗（存在才发）。
 * 各监控器（agent/music/meeting/progress/settings）的状态推送都走这里，
 * 新窗接入只改这一处。
 */
export function sendToWindows(channel: string, payload: unknown): void {
  getPetWindow()?.webContents.send(channel, payload);
  const room = getRoomWindow();
  if (room && !room.isDestroyed()) room.webContents.send(channel, payload);
  const consoleWin = getConsoleWindow();
  if (consoleWin && !consoleWin.isDestroyed()) consoleWin.webContents.send(channel, payload);
}

/**
 * 统一控制台窗：右侧栏二级目录收拢全部配置/管理功能。
 * 深链：已开窗→直接发 ui:showScreen；新窗→did-finish-load once 后发（避免渲染进程还没订阅）。
 * dock 协调：mac 上 dock 隐藏时常规窗聚焦行为异常，所以开窗前 show、关窗后按需 hide。
 */
export function createConsoleWindow(pane?: ConsolePane): BrowserWindow {
  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.focus();
    if (pane) consoleWindow.webContents.send('ui:showScreen', pane);
    return consoleWindow;
  }
  if (process.platform === 'darwin') void app.dock?.show();
  consoleWindow = new BrowserWindow({
    width: 880,
    height: 640,
    title: 'QBot 控制台',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  consoleWindow.on('closed', () => {
    consoleWindow = null;
    if (process.platform === 'darwin' && !roomWindow) app.dock?.hide();
  });
  consoleWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  if (pane) {
    consoleWindow.webContents.once('did-finish-load', () => {
      consoleWindow?.webContents.send('ui:showScreen', pane);
    });
  }
  load(consoleWindow, 'console', pane ? { pane } : undefined);
  return consoleWindow;
}

/**
 * 公共房间窗（spec 2026-08-21 §6.3）：普通窗口，**不是**透明穿透窗——
 * 要输入文字、要滚动、要长时间停留，透明窗那套约束（血泪坑 5/18）全是负担。
 */
export function createLoungeWindow(): BrowserWindow {
  if (loungeWindow && !loungeWindow.isDestroyed()) {
    loungeWindow.focus();
    return loungeWindow;
  }
  loungeWindow = new BrowserWindow({
    width: 460,
    height: 620,
    minWidth: 380,
    minHeight: 480,
    title: 'QBot 公共房间',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  loungeWindow.on('closed', () => { loungeWindow = null; });
  load(loungeWindow, 'lounge');
  return loungeWindow;
}

/** 房间事件推送口（rooms.ts 通过 setLoungePush 注入这个） */
export function pushToLounge(channel: string, payload: unknown): void {
  if (loungeWindow && !loungeWindow.isDestroyed()) {
    loungeWindow.webContents.send(channel, payload);
  }
}
