import { BrowserWindow } from 'electron';

/** Garden windows are owned separately from the pet/console window registry. */
export function notifyGardenRenderMode(gardenRenderMode: '2d' | '3d' | undefined): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      if (!new URL(win.webContents.getURL()).pathname.endsWith('/garden/index.html')) continue;
    } catch { continue; }
    // Only the display preference is needed here, not API keys or other settings.
    win.webContents.send('settings:changed', { gardenRenderMode });
  }
}
