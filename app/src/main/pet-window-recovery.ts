/** Desktop presentation recovery. Room-mode hiding remains intentional. */
import { powerMonitor, screen, type BrowserWindow } from 'electron';

export function attachPetWindowRecovery(win: BrowserWindow, shouldShow: () => boolean): void {
  let stopped = false;
  let failures = 0;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  let healthyTimer: ReturnType<typeof setTimeout> | undefined;
  let hangTimer: ReturnType<typeof setTimeout> | undefined;

  const restore = () => {
    if (stopped || win.isDestroyed() || !shouldShow()) return;
    const bounds = win.getBounds();
    const area = screen.getDisplayMatching(bounds).workArea;
    // Keep the complete window within the nearest remaining display where possible.
    const x = Math.round(Math.max(area.x, Math.min(bounds.x, area.x + area.width - bounds.width)));
    const y = Math.round(Math.max(area.y, Math.min(bounds.y, area.y + area.height - bounds.height)));
    if (x !== bounds.x || y !== bounds.y) win.setPosition(x, y);
    if (win.isMinimized()) win.restore();
    if (!win.isAlwaysOnTop()) win.setAlwaysOnTop(true, 'floating');
    if (!win.isVisible()) win.showInactive();
  };
  const wake = () => {
    if (stopped || win.isDestroyed()) return;
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    restore();
    win.webContents.invalidate();
  };
  const recoverRenderer = (reason: string) => {
    if (stopped || win.isDestroyed() || reloadTimer) return;
    clearTimeout(healthyTimer);
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5));
    console.warn('[pet-window] renderer recovery', { reason, delay });
    reloadTimer = setTimeout(() => {
      reloadTimer = undefined;
      if (!stopped && !win.isDestroyed()) win.webContents.reload();
    }, delay);
  };
  const gone = (_event: unknown, details: { reason: string }) => recoverRenderer(details.reason);
  const failed = (_event: unknown, code: number, description: string, _url: string, mainFrame: boolean) => {
    if (mainFrame && code !== -3) recoverRenderer(description); // ERR_ABORTED is navigation cancellation.
  };
  const responsive = () => { clearTimeout(hangTimer); hangTimer = undefined; };
  const unresponsive = () => {
    if (hangTimer) return;
    hangTimer = setTimeout(() => { hangTimer = undefined; recoverRenderer('unresponsive'); }, 10_000);
  };
  const loaded = () => {
    clearTimeout(reloadTimer);
    reloadTimer = undefined;
    responsive();
    clearTimeout(healthyTimer);
    healthyTimer = setTimeout(() => { failures = 0; }, 60_000);
    restore();
  };
  const tick = setInterval(restore, 15_000);
  win.webContents.on('render-process-gone', gone);
  win.webContents.on('did-fail-load', failed);
  win.webContents.on('did-finish-load', loaded);
  win.on('unresponsive', unresponsive);
  win.on('responsive', responsive);
  powerMonitor.on('resume', wake);
  powerMonitor.on('unlock-screen', wake);
  screen.on('display-removed', wake);
  screen.on('display-metrics-changed', wake);
  win.once('closed', () => {
    stopped = true;
    clearInterval(tick);
    clearTimeout(reloadTimer);
    clearTimeout(healthyTimer);
    responsive();
    powerMonitor.removeListener('resume', wake);
    powerMonitor.removeListener('unlock-screen', wake);
    screen.removeListener('display-removed', wake);
    screen.removeListener('display-metrics-changed', wake);
  });
}
