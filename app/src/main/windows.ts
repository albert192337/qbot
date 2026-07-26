/** 窗口管理：桌宠透明置顶窗 + 孵化常规窗 + 小房间窗 + dock 显隐协调 */
import { BrowserWindow, app, screen, shell } from 'electron';
import path from 'node:path';
import type { CharacterMeta } from '../shared/ipc-types';

const PET_SIZE = 360;
const ROOM_SIZE = 560;
/** 气泡窗：固定尺寸，创建后只 setPosition 永不改大小（绕开透明窗 resize 渲染 bug） */
const BUBBLE_W = 340;
const BUBBLE_H = 500;
/** 气泡栈底边压进桌宠窗顶边的像素（桌宠窗顶部本就是 contain 留白） */
const BUBBLE_OVERLAP = 24;

let petWindow: BrowserWindow | null = null;
let hatchWindow: BrowserWindow | null = null;
let roomWindow: BrowserWindow | null = null;
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

type RendererPage = 'pet' | 'hatch' | 'room' | 'bubble';

function rendererUrl(page: RendererPage): { url?: string; file?: string } {
  if (process.env.ELECTRON_RENDERER_URL) {
    return { url: `${process.env.ELECTRON_RENDERER_URL}/${page}/index.html` };
  }
  return { file: path.join(__dirname, `../renderer/${page}/index.html`) };
}

function load(win: BrowserWindow, page: RendererPage): void {
  const target = rendererUrl(page);
  if (target.url) void win.loadURL(target.url);
  else void win.loadFile(target.file!);
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
export function openRoomWindow(title: string): BrowserWindow {
  if (roomWindow && !roomWindow.isDestroyed()) {
    roomWindow.focus();
    return roomWindow;
  }
  petWindow?.hide();
  hideBubbleWindow(); // 角色进小房间：气泡跟着走
  if (process.platform === 'darwin') void app.dock?.show();
  roomWindow = new BrowserWindow({
    width: ROOM_SIZE,
    height: ROOM_SIZE,
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
