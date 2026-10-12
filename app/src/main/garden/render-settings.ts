import { BrowserWindow } from 'electron';

/** Garden windows are owned separately from the pet/console window registry. */
const listeners=new Set<()=>void>();
export function onGardenRenderModeChanged(fn:()=>void):()=>void {listeners.add(fn);return()=>listeners.delete(fn);}
export function notifyGardenRenderMode(gardenRenderMode: '2d' | '3d' | 'hybrid' | undefined): void {
  for(const fn of listeners)fn();
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      if (!new URL(win.webContents.getURL()).pathname.endsWith('/garden/index.html')) continue;
    } catch { continue; }
    // Only the display preference is needed here, not API keys or other settings.
    win.webContents.send('settings:changed', { gardenRenderMode });
  }
}
