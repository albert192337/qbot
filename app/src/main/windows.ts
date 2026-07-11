/** 窗口管理：桌宠透明置顶窗 + 孵化常规窗 + dock 显隐协调 */
import { BrowserWindow, app, screen, shell } from 'electron';
import path from 'node:path';

const PET_SIZE = 360;

let petWindow: BrowserWindow | null = null;
let hatchWindow: BrowserWindow | null = null;

function rendererUrl(page: 'pet' | 'hatch'): { url?: string; file?: string } {
  if (process.env.ELECTRON_RENDERER_URL) {
    return { url: `${process.env.ELECTRON_RENDERER_URL}/${page}/index.html` };
  }
  return { file: path.join(__dirname, `../renderer/${page}/index.html`) };
}

function load(win: BrowserWindow, page: 'pet' | 'hatch'): void {
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

export function createPetWindow(): BrowserWindow {
  if (petWindow && !petWindow.isDestroyed()) return petWindow;
  const { workArea } = screen.getPrimaryDisplay();
  petWindow = new BrowserWindow({
    width: PET_SIZE,
    height: PET_SIZE,
    x: workArea.x + workArea.width - PET_SIZE - 40,
    y: workArea.y + workArea.height - PET_SIZE - 20,
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

export function createHatchWindow(): BrowserWindow {
  if (hatchWindow && !hatchWindow.isDestroyed()) {
    hatchWindow.focus();
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
    if (process.platform === 'darwin') app.dock?.hide();
  });
  hatchWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  load(hatchWindow, 'hatch');
  return hatchWindow;
}

/** 拖拽移动（高频调用，不做动画） */
export function movePetWindow(x: number, y: number): void {
  petWindow?.setPosition(Math.round(x), Math.round(y), false);
}
