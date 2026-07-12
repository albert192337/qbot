/** 窗口管理：桌宠透明置顶窗 + 孵化常规窗 + 小房间窗 + dock 显隐协调 */
import { BrowserWindow, app, screen, shell } from 'electron';
import path from 'node:path';
import type { CharacterMeta } from '../shared/ipc-types';

const PET_SIZE = 360;
const ROOM_SIZE = 560;

let petWindow: BrowserWindow | null = null;
let hatchWindow: BrowserWindow | null = null;
let roomWindow: BrowserWindow | null = null;
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
}

function rendererUrl(page: 'pet' | 'hatch' | 'room'): { url?: string; file?: string } {
  if (process.env.ELECTRON_RENDERER_URL) {
    return { url: `${process.env.ELECTRON_RENDERER_URL}/${page}/index.html` };
  }
  return { file: path.join(__dirname, `../renderer/${page}/index.html`) };
}

function load(win: BrowserWindow, page: 'pet' | 'hatch' | 'room'): void {
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
  petWindow.once('ready-to-show', () => petWindow?.show());
  petWindow.on('closed', () => (petWindow = null));
  load(petWindow, 'pet');
  return petWindow;
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
