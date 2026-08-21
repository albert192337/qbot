/** 窗口管理：桌宠透明置顶窗 + 孵化常规窗 + 小房间窗 + dock 显隐协调 */
import { BrowserWindow, app, screen, shell } from 'electron';
import path from 'node:path';
import type { CharacterMeta } from '../shared/ipc-types';

const PET_SIZE = 360;
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
/** 联机远端宠窗（?remote=1 复用 pet renderer；独立单例，绝不复用 petWindow——
 *  否则 broadcastCharacterActivated 会把本地角色切换广播进远端窗） */
let remotePetWindow: BrowserWindow | null = null;
let hatchWindow: BrowserWindow | null = null;
let roomWindow: BrowserWindow | null = null;
let studioWindow: BrowserWindow | null = null;
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

type RendererPage = 'pet' | 'hatch' | 'room' | 'studio' | 'bubble' | 'market' | 'lounge';

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

export function getHatchWindow(): BrowserWindow | null {
  return hatchWindow;
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
export function broadcastCharacterActivated(meta: CharacterMeta): void {
  const pet = petWindow && !petWindow.isDestroyed() ? petWindow : createPetWindow();
  pet.webContents.send('characters:activated', meta);
  if (roomWindow && !roomWindow.isDestroyed()) {
    roomWindow.webContents.send('characters:activated', meta);
  }
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

// ── 联机远端宠窗（spec 2026-08-02 §二.3）─────────────────────

export function getRemotePetWindow(): BrowserWindow | null {
  return remotePetWindow;
}

export function createRemotePetWindow(): BrowserWindow {
  if (remotePetWindow && !remotePetWindow.isDestroyed()) return remotePetWindow;
  const { workArea } = screen.getPrimaryDisplay();
  const size = Math.round(PET_SIZE * petScale);
  // 默认落在本地宠左侧；本地宠不在（角色进房间等）就贴屏幕左下
  const anchor = petWindow && !petWindow.isDestroyed() ? petWindow.getBounds() : null;
  remotePetWindow = new BrowserWindow({
    width: size,
    height: size,
    x: anchor ? Math.max(workArea.x, anchor.x - size - 24) : workArea.x + 40,
    y: anchor ? anchor.y : workArea.y + workArea.height - size - 20,
    transparent: true,
    frame: false,
    hasShadow: false, // 同 pet 窗：不显式关会有残影阴影框
    resizable: false, // 透明窗 resize 有渲染 bug
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  remotePetWindow.setAlwaysOnTop(true, 'floating');
  remotePetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  remotePetWindow.once('ready-to-show', () => remotePetWindow?.show());
  remotePetWindow.on('closed', () => {
    remotePetWindow = null;
  });
  load(remotePetWindow, 'pet', { remote: '1' });
  return remotePetWindow;
}

export function closeRemotePetWindow(): void {
  if (remotePetWindow && !remotePetWindow.isDestroyed()) remotePetWindow.close();
  remotePetWindow = null;
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

export function createHatchWindow(screenName?: 'settings'): BrowserWindow {
  if (hatchWindow && !hatchWindow.isDestroyed()) {
    hatchWindow.focus();
    if (screenName) hatchWindow.webContents.send('ui:showScreen', screenName);
    return hatchWindow;
  }
  // dock 隐藏时常规窗口聚焦行为异常 → 开孵化窗时临时显示 dock
  if (process.platform === 'darwin') void app.dock?.show();
  hatchWindow = new BrowserWindow({
    width: 720,
    height: 560,
    title: 'QBot 孵化室',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  hatchWindow.on('closed', () => {
    hatchWindow = null;
    // room 窗还开着就不收 dock（常规窗聚焦需要 dock 在场）
    if (process.platform === 'darwin' && !roomWindow) app.dock?.hide();
  });
  hatchWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  if (screenName) {
    hatchWindow.webContents.once('did-finish-load', () => {
      hatchWindow?.webContents.send('ui:showScreen', screenName);
    });
  }
  load(hatchWindow, 'hatch');
  return hatchWindow;
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
    if (process.platform === 'darwin' && !hatchWindow) app.dock?.hide();
  });
  load(roomWindow, 'room');
  return roomWindow;
}

/** 生成配置面板：编辑人设 + 查看/新增/删除动作 */
export function createStudioWindow(): BrowserWindow {
  if (studioWindow && !studioWindow.isDestroyed()) {
    studioWindow.focus();
    return studioWindow;
  }
  studioWindow = new BrowserWindow({
    width: 480,
    height: 680,
    title: 'QBot 角色工作室',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  studioWindow.on('closed', () => { studioWindow = null; });
  load(studioWindow, 'studio');
  return studioWindow;
}

/** 装扮市场：上传/下载皮肤的货架窗（spec 2026-08-02-skin-market-design） */
let marketWindow: BrowserWindow | null = null;

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

export function createMarketWindow(): BrowserWindow {
  if (marketWindow && !marketWindow.isDestroyed()) {
    marketWindow.focus();
    return marketWindow;
  }
  marketWindow = new BrowserWindow({
    width: 640,
    height: 720,
    title: 'QBot 装扮市场',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  marketWindow.on('closed', () => { marketWindow = null; });
  load(marketWindow, 'market');
  return marketWindow;
}
