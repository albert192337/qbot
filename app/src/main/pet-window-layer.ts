import type { BrowserWindow } from 'electron';

const syncing = new WeakSet<BrowserWindow>();
const WM_WINDOWPOSCHANGED = 0x0047;

/** Keep overlays next to the pet, including when another app changes native Z order. */
export function syncPetWindowGroup(windows: Array<BrowserWindow | null>): void {
  const pet = windows[0];
  if (!pet || pet.isDestroyed() || !pet.isVisible() || syncing.has(pet)) return;
  syncing.add(pet);
  try {
    let anchor = pet;
    for (const win of windows.slice(1)) {
      if (!win || win.isDestroyed() || !win.isVisible()) continue;
      win.moveAbove(anchor.getMediaSourceId());
      anchor = win;
    }
  } finally { syncing.delete(pet); }
}

/** Raise visible desktop surfaces together without taking focus or revealing hidden UI. */
export function raisePetWindowGroup(windows: Array<BrowserWindow | null>): void {
  const pet = windows[0];
  if (!pet || pet.isDestroyed() || !pet.isVisible()) return;
  for (const win of windows) {
    if (!win || win.isDestroyed() || !win.isVisible()) continue;
    if (!win.isAlwaysOnTop()) win.setAlwaysOnTop(true, 'floating');
    win.moveTop();
  }
}

export function attachPetWindowLayer(win: BrowserWindow, group: () => Array<BrowserWindow | null>, owner?: BrowserWindow | null): void {
  if (owner && !owner.isDestroyed()) win.setParentWindow(owner);
  const raise = () => raisePetWindowGroup(group());
  win.on('focus', raise);
  win.on('show', raise);
  let pending: ReturnType<typeof setTimeout> | undefined;
  // Inserting a foreign HWND between owned windows does not notify our HWNDs.
  // One lightweight native restack per group also covers that case.
  const watch = process.platform === 'win32' && !owner
    ? setInterval(() => syncPetWindowGroup(group()), 100) : undefined;
  watch?.unref();
  if (process.platform === 'win32') {
    win.hookWindowMessage(WM_WINDOWPOSCHANGED, () => {
      const pet = group()[0];
      if (!pet || syncing.has(pet) || pending) return;
      // Defer until Windows finishes updating ownership/Z order. Our own moves
      // are guarded so they cannot schedule a perpetual restacking loop.
      pending = setTimeout(() => {
        pending = undefined;
        syncPetWindowGroup(group());
      }, 0);
    });
  }
  win.once('closed', () => {
    clearTimeout(pending);
    clearInterval(watch);
    win.removeListener('focus', raise);
    win.removeListener('show', raise);
  });
}
