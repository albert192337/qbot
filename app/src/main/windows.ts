/** 窗口管理：桌宠透明置顶窗 + 孵化常规窗 + 小房间窗 + dock 显隐协调 */
import { BrowserWindow, app, screen, shell } from 'electron';
import path from 'node:path';
import type { CharacterMeta, RoomSizePreset, RoomsDisplayMode } from '../shared/ipc-types';
import { layoutRoomPets, layoutRoomScenePets, normalizeRoomSizePreset, resolveRoomSceneSize } from './rooms/rooms-rules';
import { clampPetScale, petTargetSize, pairWindowBounds } from './pet-geometry';
import { attachPetWindowRecovery } from './pet-window-recovery';
import { aboveBubbleLayout } from './bubble-layout';
import { attachGarden } from './garden/windows';
import { moveFixedSize } from './fixed-window';
import { attachPetWindowLayer, raisePetWindowGroup } from './pet-window-layer';

const PET_SIZE = 360;
/** 房间宠上屏窗：比本地宠小一档（房友是客人体量），固定尺寸永不 resize */
const ROOM_PET_SIZE = 200;
const ROOM_PET_GAP = 20;
const ROOM_SCENE_PET_SIZE = 180;
const ROOM_SCENE_PET_GAP = 12;
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
/** 利用角色素材顶部留白，使台词更贴近头顶；花园卡按气泡实测边界避让。 */
const BUBBLE_OVERLAP = 42;

let petWindow: BrowserWindow | null = null;
/** 公共房间宠上屏：键控多窗（memberId -> 窗），全员在线上限即窗口数上限 */
const roomPetWindows = new Map<string, BrowserWindow>();
const roomPetSizes = new WeakMap<BrowserWindow, number>();
let roomWindow: BrowserWindow | null = null;
let cozyPreviewWindow: BrowserWindow | null = null;
let consoleWindow: BrowserWindow | null = null;
let nurseryWindow: BrowserWindow | null = null;
let loungeWindow: BrowserWindow | null = null;
let roomChatWindow: BrowserWindow | null = null;
let bubbleWindow: BrowserWindow | null = null;
let bubbleSide: 'above' | 'below' = 'above';
let petScale = 1;
/** 桌宠是否处于串门（双人宽）模式——权威尺寸的一部分，移动时要重申 */
let petVisitMode = false;
let beforeVisit: { x: number; y: number } | null = null;
let roomWindowBoundsChanged: (() => void) | null = null;
let roomWindowClosed: (() => void) | null = null;
let roomSizePreset: RoomSizePreset = 'large';

/**
 * 摆放固定尺寸的透明窗，**每次都重申权威尺寸**。
 *
 * 血泪坑：Windows 上分数显示缩放（125%/150%/190%…）时，`setPosition` 会让窗口
 * 每次调用都长大几像素——拖一次桌宠就从 360 涨到 700+。原因是 Electron 内部
 * 走「DIP bounds 读回 → 物理像素 → 再换算回 DIP」的往返，非整数 scaleFactor 下
 * 每次往返都向上取整，误差逐次累积（实测 scaleFactor=1.905：180 的窗 getBounds()
 * 就已经报 183）。`setBounds` 里带上读回的 width/height 一样中招，因为脏数据源头
 * 就是读回值本身。
 *
 * 唯一稳的写法：显式传**与当前 bounds 无关的**权威尺寸，把累积链掐断。
 *
 * `changesSize`：真要改尺寸时才置 true——mac 上 resizable:false 会拦尺寸变更，
 * 需临时放开（Windows 实测不拦，但保留以免回归 mac）。纯移动不用付这个开销，
 * 拖拽时这里是每帧调用的热路径。
 */

/** 桌宠缩放（0.5~2）：窗口即画布，改窗口尺寸即改桌宠大小；右下角锚定 */
export function setPetScale(scale: number): void {
  petScale = clampPetScale(scale);
  if (!petWindow || petWindow.isDestroyed()) return;
  if (petVisitMode) {
    const b = pairWindowBounds(petScale, petWindow.getBounds(), screen.getDisplayMatching(petWindow.getBounds()).workArea);
    moveFixedSize(petWindow, b.x, b.y, b, true); return;
  }
  const size = petTargetSize(petScale, petVisitMode);
  const [x, y] = petWindow.getPosition();
  const [w, h] = petWindow.getSize();
  moveFixedSize(petWindow, x + w - size.width, y + h - size.height, size, true);
  syncBubbleBounds();
}

type RendererPage = 'social' | 'pet' | 'room' | 'cozy' | 'bubble' | 'console' | 'lounge' | 'nursery' | 'chat';

/** A local, framed preview: never changes room membership or the active desktop pet. */
export function openCozyPreview(): BrowserWindow {
  if (cozyPreviewWindow && !cozyPreviewWindow.isDestroyed()) {
    cozyPreviewWindow.show(); cozyPreviewWindow.focus(); return cozyPreviewWindow;
  }
  const area = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({
    width: Math.min(1160, area.width), height: Math.min(850, area.height),
    minWidth: Math.min(720, area.width), minHeight: Math.min(580, area.height),
    title: 'QBot · 奶油小屋试住', backgroundColor: '#f6f1e8', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false },
  });
  cozyPreviewWindow = win;
  win.on('closed', () => { cozyPreviewWindow = null; });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  load(win, 'cozy');
  return win;
}

let chatWindow: BrowserWindow | null = null;
const desktopWindowGroup = () => [petWindow, bubbleWindow, chatWindow];
function syncChatBounds(): void {
  if (!chatWindow || chatWindow.isDestroyed() || !petWindow) return;
  const pet = petWindow.getBounds();
  const wa = screen.getDisplayMatching(pet).workArea;
  const x = Math.max(wa.x, Math.min(pet.x + pet.width / 2 - 190, wa.x + wa.width - 380));
  const y = Math.max(wa.y, Math.min(pet.y + pet.height + 6, wa.y + wa.height - 110));
  moveFixedSize(chatWindow, x, y, {width:380,height:110});
}
export function closePetChat(): void { chatWindow?.hide(); }
export function openPetChat(): void {
  if (chatWindow?.isVisible()) { closePetChat(); return; }
  if (petWindow) {
    const pet = petWindow.getBounds();
    const wa = screen.getDisplayMatching(pet).workArea;
    if (pet.y + pet.height + 116 > wa.y + wa.height) {
      movePetWindow(pet.x, Math.max(wa.y, wa.y + wa.height - pet.height - 116));
    }
  }
  if (!chatWindow || chatWindow.isDestroyed()) {
    chatWindow = new BrowserWindow({ width: 380, height: 110, frame: false, transparent: true,
      resizable: false, hasShadow: false, skipTaskbar: true, show: false,
      webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false } });
    chatWindow.setAlwaysOnTop(true, 'floating');
    attachPetWindowLayer(chatWindow, desktopWindowGroup, petWindow);
    chatWindow.on('closed', () => { chatWindow = null; });
    chatWindow.once('ready-to-show', () => { syncChatBounds(); chatWindow?.show(); });
    load(chatWindow, 'chat');
  } else { syncChatBounds(); chatWindow.show(); chatWindow.focus(); }
}

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

/** 始终在头顶；顶部空间不足时内容贴顶，不翻到脚下。 */
function bubbleAnchor(pet: Electron.Rectangle) {
  const wa = screen.getDisplayMatching(pet).workArea;
  return aboveBubbleLayout(pet, wa, BUBBLE_W, BUBBLE_H, BUBBLE_OVERLAP);
}

export function syncBubbleBounds(): void {
  syncChatBounds();
  const b = bubbleWindow;
  if (!b || b.isDestroyed() || !b.isVisible()) return; // 隐藏时不做功（常态）
  if (!petWindow || petWindow.isDestroyed()) return;
  const { x, y, side, contentHeight } = bubbleAnchor(petWindow.getBounds());
  moveFixedSize(b, x, y, { width: BUBBLE_W, height: BUBBLE_H });
  bubbleSide = side;
  b.webContents.send('bubble:anchor', side, contentHeight);
}

/** 激活角色变化：广播给 pet 窗（必要时创建）和 room 窗（存在时） */
/** 当前激活角色的可播放动作（合并顺序同 renderer player.load：标准 → 贴纸 → 自定义） */
let activePlayables: string[] = [];

export function broadcastCharacterActivated(meta: CharacterMeta): void {
  // 主进程侧同步一份可用动作（行为引擎的动作解析要用；与 player.load 同口径：
  // 生成动作看 status，贴纸落盘即可用；可选预设动作也按 status 判断）
  const m = meta.manifest;
  const ids: string[] = [];
  for (const [id, a] of Object.entries(m.actions ?? {})) {
    if (a.status === 'done') ids.push(id);
  }
  for (const id of Object.keys(m.importedActions ?? {})) ids.push(id);
  for (const [id, a] of Object.entries(m.expressionActions ?? {})) {
    if (a.status === 'done') ids.push(id);
  }
  for (const [id, a] of Object.entries(m.customActions ?? {})) {
    if (a.status === 'done') ids.push(id);
  }
  activePlayables = ids;
  const pet = petWindow && !petWindow.isDestroyed() ? petWindow : createPetWindow();
  pet.webContents.send('characters:activated', meta);
  if(nurseryWindow&&!nurseryWindow.isDestroyed())nurseryWindow.webContents.send('characters:activated',meta);
  if(consoleWindow&&!consoleWindow.isDestroyed())consoleWindow.webContents.send('characters:activated',meta);
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
  petVisitMode = false;
  beforeVisit = null;
  const { width: size } = petTargetSize(petScale);
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
      backgroundThrottling: false,
      sandbox: false,
    },
  });
  petWindow.setAlwaysOnTop(true, 'floating'); // 盖普通窗，不盖 Mission Control
  attachPetWindowLayer(petWindow, desktopWindowGroup);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // 气泡窗跟随：move 覆盖拖拽与 OS 侧移动，resize 覆盖缩放
  petWindow.on('move', syncBubbleBounds);
  petWindow.on('resize', syncBubbleBounds);
  const win = petWindow;
  win.webContents.on('did-start-loading', () => setPetVisitMode(false));
  attachGarden(win);
  attachPetWindowRecovery(win, () => !isRoomOpen());
  win.once('ready-to-show', () => { if (!isRoomOpen()) win.showInactive(); });
  petWindow.on('closed', () => {
    chatWindow?.close();
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
  roomPetSizes.set(win, ROOM_PET_SIZE);
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

/** Drag only the sending member window, using its last authoritative logical size. */
export function moveRoomPetWindow(win: BrowserWindow, x: number, y: number): void {
  if (!findRoomPetMemberId(win)) return;
  const size = roomPetSizes.get(win) ?? ROOM_PET_SIZE;
  moveFixedSize(win, x, y, {width:size, height:size});
}

/**
 * 按当前在线成员顺序重排所有宠窗：屏幕底部居中排开，超一行往上叠
 * （layoutRoomPets 是纯函数，这里只管把结果换算成绝对坐标 + setBounds）。
 * 成员进出、petScale 变化后都要调一次；只挪位置，窗口尺寸恒定不变。
 *
 * 用 setBounds 而不是 setPosition：分数 DPI 下 setPosition 会让窗口逐次胀大，
 * 必须每次重申权威尺寸（血泪坑 DPI-setPosition）。
 */
export function layoutRoomPetWindows(orderedMemberIds: readonly string[]): void {
  const { workArea } = screen.getPrimaryDisplay();
  const slots = layoutRoomPets(orderedMemberIds, workArea.width, ROOM_PET_SIZE, ROOM_PET_GAP);
  const size = { width: ROOM_PET_SIZE, height: ROOM_PET_SIZE };
  for (const slot of slots) {
    const win = roomPetWindows.get(slot.memberId);
    if (!win || win.isDestroyed()) continue;
    roomPetSizes.set(win, ROOM_PET_SIZE);
    moveFixedSize(
      win,
      workArea.x + slot.x,
      workArea.y + workArea.height - slot.bottomOffset,
      size,
    );
  }
}

/** 将房友宠窗挂在小房间窗口上，并按房间内部坐标排列。 */
export function layoutRoomPetWindowsInRoom(orderedMemberIds: readonly string[]): void {
  if (!roomWindow || roomWindow.isDestroyed()) return;
  const roomBounds = roomWindow.getBounds();
  const petSize = Math.max(120, Math.min(ROOM_SCENE_PET_SIZE, Math.round(roomBounds.width * 0.1875)));
  const slots = layoutRoomScenePets(
    orderedMemberIds,
    roomBounds.width,
    roomBounds.height,
    petSize,
    ROOM_SCENE_PET_GAP,
  );
  for (const slot of slots) {
    const win = roomPetWindows.get(slot.memberId);
    if (!win || win.isDestroyed()) continue;
    roomPetSizes.set(win, petSize);
    moveFixedSize(
      win,
      roomBounds.x + slot.x,
      roomBounds.y + slot.y,
      { width: petSize, height: petSize },
      true,
    );
  }
}

/** 房友宠窗在桌面/房间之间切换；角色内容和网络状态保持不变。 */
export function setRoomPetWindowDisplayMode(memberId: string, mode: RoomsDisplayMode): void {
  const win = roomPetWindows.get(memberId);
  if (!win || win.isDestroyed()) return;
  if (mode === 'room' && roomWindow && !roomWindow.isDestroyed()) {
    win.setAlwaysOnTop(false);
    win.setVisibleOnAllWorkspaces(false);
    win.setParentWindow(roomWindow);
    return;
  }
  win.setParentWindow(null);
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

export function onRoomWindowBoundsChanged(listener: () => void): void {
  roomWindowBoundsChanged = listener;
}

export function onRoomWindowClosed(listener: () => void): void {
  roomWindowClosed = listener;
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
  bubbleWindow.setIgnoreMouseEvents(true, { forward: true }); // 转发移动以命中奖励卡关闭按钮。
  bubbleWindow.setAlwaysOnTop(true, 'floating');
  attachPetWindowLayer(bubbleWindow, desktopWindowGroup, petWindow);
  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWindow.on('closed', () => (bubbleWindow = null));
  bubbleWindow.webContents.on('did-finish-load', () => {
    syncBubbleBounds();
  });
  load(bubbleWindow, 'bubble');
  return bubbleWindow;
}

/** 显示气泡窗（先摆位再 show，避免在旧坐标闪一帧） */
export function showBubbleWindow(): BrowserWindow {
  const win = createBubbleWindow();
  if (!win.isVisible()) {
    if (petWindow && !petWindow.isDestroyed()) {
      const { x, y, side, contentHeight } = bubbleAnchor(petWindow.getBounds());
      moveFixedSize(win, x, y, { width: BUBBLE_W, height: BUBBLE_H });
      bubbleSide = side;
      win.webContents.send('bubble:anchor', side, contentHeight);
    }
    win.showInactive(); // 不抢焦点
  }
  syncBubbleBounds();
  raisePetWindowGroup(desktopWindowGroup());
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

/** 拖拽移动（高频调用，走 moveFixedSize：分数 DPI 下 setPosition 会胀窗） */
export function movePetWindow(x: number, y: number): void {
  if (petVisitMode && petWindow && !petWindow.isDestroyed()) {
    const b = pairWindowBounds(petScale, { x, y }, screen.getDisplayMatching(petWindow.getBounds()).workArea);
    moveFixedSize(petWindow, b.x, b.y, b); return;
  }
  moveFixedSize(petWindow, x, y, petTargetSize(petScale, petVisitMode));
}

/** 进入串门模式：窗口拓宽为双人宽；离开时恢复单人尺寸 */
export function setPetVisitMode(enter: boolean): void {
  if (petVisitMode === enter) return;
  petVisitMode = enter;
  if (!petWindow || petWindow.isDestroyed()) return;
  const [x, y] = petWindow.getPosition();
  const area = screen.getDisplayMatching(petWindow.getBounds()).workArea;
  if (enter) {
    beforeVisit = { x, y };
    const b = pairWindowBounds(petScale, { x, y }, area);
    moveFixedSize(petWindow, b.x, b.y, b, true);
  } else {
    const origin = beforeVisit ?? { x, y }; beforeVisit = null;
    const size = petTargetSize(petScale);
    moveFixedSize(petWindow, Math.max(area.x, Math.min(origin.x, area.x + area.width - size.width)),
      Math.max(area.y, Math.min(origin.y, area.y + area.height - size.height)), size, true);
  }
}

export function moveRoomWindow(x: number, y: number): void {
  const s = roomSize();
  moveFixedSize(roomWindow, x, y, { width: s, height: s });
  roomWindowBoundsChanged?.();
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
function roomSize(display = screen.getPrimaryDisplay()): number {
  const { workArea } = display;
  return Math.min(ROOM_SIZE_PREFERRED, ROOM_ART_SIZE, resolveRoomSceneSize(roomSizePreset, workArea.width, workArea.height));
}

export function getRoomSizePreset(): RoomSizePreset {
  return roomSizePreset;
}

export function setRoomSizePreset(preset: RoomSizePreset): RoomSizePreset {
  roomSizePreset = normalizeRoomSizePreset(preset);
  if (!roomWindow || roomWindow.isDestroyed()) return roomSizePreset;
  const current = roomWindow.getBounds();
  const display = screen.getDisplayMatching(current);
  const size = roomSize(display);
  const x = Math.max(
    display.workArea.x,
    Math.min(
      Math.round(current.x + (current.width - size) / 2),
      display.workArea.x + display.workArea.width - size,
    ),
  );
  const y = Math.max(
    display.workArea.y,
    Math.min(
      Math.round(current.y + (current.height - size) / 2),
      display.workArea.y + display.workArea.height - size,
    ),
  );
  moveFixedSize(roomWindow, x, y, { width: size, height: size }, true);
  roomWindowBoundsChanged?.();
  return roomSizePreset;
}

export function openRoomWindow(title: string): BrowserWindow {
  if (roomWindow && !roomWindow.isDestroyed()) {
    roomWindow.focus();
    return roomWindow;
  }
  petWindow?.hide();
  hideBubbleWindow(); // 角色进小房间：气泡跟着走
  if (process.platform === 'darwin') void app.dock?.show();
  const display = screen.getPrimaryDisplay();
  const size = roomSize(display);
  const { workArea } = display;
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
    roomWindowClosed?.();
    if (process.platform === 'darwin' && !consoleWindow && !nurseryWindow && !loungeWindow) app.dock?.hide();
  });
  roomWindow.on('move', () => roomWindowBoundsChanged?.());
  load(roomWindow, 'room');
  return roomWindow;
}

export function closeRoomWindow(): boolean {
  if (!roomWindow || roomWindow.isDestroyed()) return false;
  roomWindow.close();
  return true;
}

/** 控制台侧栏 pane 标识（与 renderer/console/main.ts 的 PaneId 对应） */
export type ConsolePane =
  | 'profile'
  | 'tasks'
  | 'home'
  | 'characters'
  | 'hatch'
  | 'persona'
  | 'scene-actions'
  | 'stickers'
  | 'sticker-create'
  | 'prompts'
  | 'market'
  | 'claude'
  | 'settings'
  | 'devtools' | 'rewards' | 'furnish' | 'memory';

export function getConsoleWindow(): BrowserWindow | null {
  return consoleWindow;
}

/**
 * 统一广播：桌面宠窗 + 房间窗 + 控制台窗（存在才发）。
 * 各监控器（agent/music/meeting/progress/settings）的状态推送都走这里，
 * 新窗接入只改这一处。
 */
export function sendToWindows(channel: string, payload: unknown): void {
  if (nurseryWindow && !nurseryWindow.isDestroyed()) nurseryWindow.webContents.send(channel, payload);
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
  return createNurseryWindow(false, pane ?? 'home');
}

/**
 * 公共房间窗（spec 2026-08-21 §6.3）：普通窗口，**不是**透明穿透窗——
 * 要输入文字、要滚动、要长时间停留，透明窗那套约束（血泪坑 5/18）全是负担。
 */
export function createLoungeWindow(): BrowserWindow {
  if (loungeWindow && !loungeWindow.isDestroyed()) { loungeWindow.restore(); loungeWindow.show(); loungeWindow.focus(); return loungeWindow; }
  loungeWindow = createSocialWindow(false);
  loungeWindow.on('closed', () => { loungeWindow = null; });
  return loungeWindow;
}
export function createRoomChatWindow(): BrowserWindow {
  if (roomChatWindow && !roomChatWindow.isDestroyed()) { roomChatWindow.restore(); roomChatWindow.show(); roomChatWindow.focus(); return roomChatWindow; }
  roomChatWindow = createSocialWindow(true);
  roomChatWindow.on('closed', () => { roomChatWindow = null; });
  return roomChatWindow;
}
function createSocialWindow(compact: boolean): BrowserWindow {
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const win = new BrowserWindow({title:compact ? '房间聊天' : '一起玩', width:Math.min(compact ? 370 : 960, area.width), height:Math.min(compact ? 490 : 740, area.height),
    minWidth:Math.min(compact ? 300 : 640,area.width), minHeight:Math.min(compact ? 340 : 500, area.height), backgroundColor:'#f5f1e5', autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'../preload/index.js'), contextIsolation:true, sandbox:false}});
  load(win, 'social', compact ? {compact:'1'} : undefined);
  return win;
}

/** 房间事件推送口（rooms.ts 通过 setLoungePush 注入这个） */
export function pushToLounge(channel: string, payload: unknown): void {
  for (const win of [roomChatWindow, petWindow, roomWindow]) if(win && !win.isDestroyed()) win.webContents.send(channel,payload);
  if(nurseryWindow && !nurseryWindow.isDestroyed()) nurseryWindow.webContents.send(channel,payload);
  if (loungeWindow && !loungeWindow.isDestroyed()) {
    loungeWindow.webContents.send(channel, payload);
  }
}

/** Game surface is a normal resizable window; the desktop pet keeps its existing renderer. */
export function createNurseryWindow(create = false, pane?: string): BrowserWindow {
  if (nurseryWindow && !nurseryWindow.isDestroyed()) {
    if (nurseryWindow.isMinimized()) nurseryWindow.restore();
    nurseryWindow.show();
    nurseryWindow.focus();
    if (create || pane) {
      const target = create ? 'nursery:create' : pane!;
      const win = nurseryWindow;
      if (win.webContents.isLoadingMainFrame()) win.webContents.once('did-finish-load', () => win.webContents.send('ui:showScreen', target));
      else win.webContents.send('ui:showScreen', target);
    }
    return nurseryWindow;
  }
  if (process.platform === 'darwin') void app.dock?.show();
  const { workArea } = screen.getPrimaryDisplay();
  nurseryWindow = new BrowserWindow({
    width: Math.min(1120, workArea.width), height: Math.min(760, workArea.height),
    minWidth: Math.min(840, workArea.width), minHeight: Math.min(570, workArea.height),
    title: 'QBot · 故事小屋', backgroundColor: '#ded6c1', show: false,
    webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false },
  });
  const win = nurseryWindow;
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))void shell.openExternal(url);return {action:'deny'};});
  const pushVisibility = () => win.webContents.send('ui:nurseryVisibility', win.isVisible() && !win.isMinimized());
  win.on('show', pushVisibility);
  win.on('hide', pushVisibility);
  win.on('minimize', pushVisibility);
  win.on('restore', pushVisibility);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    nurseryWindow = null;
    if (process.platform === 'darwin' && !consoleWindow && !roomWindow && !loungeWindow) app.dock?.hide();
  });
  load(win, 'nursery', create ? { create: '1' } : pane ? { pane } : undefined);
  return win;
}
