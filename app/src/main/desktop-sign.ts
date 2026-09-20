import { BrowserWindow, ipcMain, screen } from 'electron';
import { moveFixedSize } from './fixed-window';
import { attachPetWindowLayer, raisePetWindowGroup } from './pet-window-layer';

export const SIGN_SIZE = { width: 176, height: 252 };
/** 与生成素材的 NORM_BASELINE 一致；底部留白/HUD 不算落脚位置。 */
export const PET_BASELINE = .86;
type Rect = { x: number; y: number; width: number; height: number };
/** 默认在本体窗口右侧；屏幕边缘改放左侧，不挤进角色。 */
export function desktopSignPosition(pet: Rect, area: Rect) {
  const right = pet.x + pet.width + 6;
  const x = right + SIGN_SIZE.width <= area.x + area.width ? right : pet.x - SIGN_SIZE.width - 6;
  return {
    x: Math.round(Math.max(area.x, Math.min(x, area.x + area.width - SIGN_SIZE.width))),
    y: Math.round(Math.max(area.y, Math.min(pet.y + pet.height * PET_BASELINE + 8 - SIGN_SIZE.height, area.y + area.height - SIGN_SIZE.height))),
  };
}

export function createDesktopSign(pet: BrowserWindow, group: () => Array<BrowserWindow | null>, preload: string, load: (win: BrowserWindow) => void, onDismiss: () => void = () => {}) {
  let win: BrowserWindow | null = null;
  let text: string | null = null;
  let ready = false;
  let hoverTimer: ReturnType<typeof setInterval> | undefined;
  let hitBounds: { left: number; top: number; right: number; bottom: number } | null = null;
  let hovered = false;
  function updateHover() {
    if (!win || win.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint(), origin = win.getBounds();
    const x = cursor.x - origin.x, y = cursor.y - origin.y;
    const hit = Boolean(text && win.isVisible() && hitBounds && x >= hitBounds.left && x <= hitBounds.right && y >= hitBounds.top && y <= hitBounds.bottom);
    if (hit === hovered) return;
    hovered = hit;
    win.setIgnoreMouseEvents(!hit, { forward: true });
    win.webContents.send('sign:hover', hit);
  }
  function stopHover() {
    clearInterval(hoverTimer); hoverTimer = undefined; hovered = false;
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(true, { forward: true });
      win.webContents.send('sign:hover', false);
    }
  }
  function sync() {
    if (!win || win.isDestroyed()) return;
    if (!text || !pet.isVisible() || !ready) { stopHover(); win.hide(); return; }
    const position = desktopSignPosition(pet.getBounds(), screen.getDisplayMatching(pet.getBounds()).workArea);
    moveFixedSize(win, position.x, position.y, SIGN_SIZE);
    win.webContents.send('sign:display', text);
    if (!win.isVisible()) win.showInactive();
    if (!hoverTimer) { hoverTimer = setInterval(updateHover, 80); hoverTimer.unref(); }
    updateHover();
    raisePetWindowGroup(group());
  }
  function setText(value: string | null) {
    text = value;
    if (text && !win) {
      win = new BrowserWindow({ ...SIGN_SIZE, transparent: true, frame: false, hasShadow: false,
        resizable: false, focusable: false, skipTaskbar: true, show: false,
        webPreferences: { preload, contextIsolation: true, sandbox: false } });
      win.setIgnoreMouseEvents(true, { forward: true });
      win.setAlwaysOnTop(true, 'floating');
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      attachPetWindowLayer(win, group, pet);
      win.webContents.on('did-finish-load', () => { ready = true; sync(); });
      win.on('closed', () => { win = null; ready = false; });
      load(win);
    }
    sync();
  }
  pet.on('move', sync);
  pet.on('resize', sync);
  pet.on('show', sync);
  pet.on('hide', sync);
  pet.webContents.on('did-start-loading', () => setText(null));
  const boundsChanged = (ev: Electron.IpcMainEvent, bounds: typeof hitBounds) => {
    if (!win || ev.sender !== win.webContents || !bounds) return;
    const { left, top, right, bottom } = bounds;
    if (![left, top, right, bottom].every(Number.isFinite) || left < 0 || top < 0 || right > SIGN_SIZE.width + 4 || bottom > SIGN_SIZE.height + 4 || right < left || bottom < top) return;
    hitBounds = bounds;
    updateHover();
  };
  const dismiss = (ev: Electron.IpcMainEvent) => {
    if (!win || ev.sender !== win.webContents || !win.isVisible()) return;
    setText(null);
    onDismiss();
  };
  ipcMain.on('sign:bounds', boundsChanged);
  ipcMain.on('sign:dismiss', dismiss);
  pet.once('closed', () => {
    stopHover();
    ipcMain.removeListener('sign:bounds', boundsChanged);
    ipcMain.removeListener('sign:dismiss', dismiss);
    win?.destroy();
  });
  return { setText, getWindow: () => win };
}
