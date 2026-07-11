/** IPC 注册：preload 契约的主进程实现 */
import { BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { app } from 'electron';
import { getCharacter, listCharacters, renameCharacter } from './characters';
import { getSettings, setSettings } from './config';
import { movePetWindow, getPetWindow, createPetWindow } from './windows';
import { pickTurnaround, resumeHatch, startHatch } from './pipeline-bridge';
import { rebuildTray } from './tray';

export function registerIpc(): void {
  // ── hatch ──────────────────────────────────────────────
  ipcMain.handle('hatch:start', (_ev, refImagePath: string) => startHatch(refImagePath));
  ipcMain.handle('hatch:resume', (_ev, dirId: string) => resumeHatch(dirId));
  ipcMain.handle('hatch:pickTurnaround', (_ev, dirId: string, index: number) =>
    pickTurnaround(dirId, index),
  );
  ipcMain.handle(
    'hatch:saveCard',
    async (ev, rect: { x: number; y: number; width: number; height: number }) => {
      const win = BrowserWindow.fromWebContents(ev.sender);
      if (!win) return null;
      const image = await win.webContents.capturePage(rect);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        defaultPath: path.join(app.getPath('desktop'), 'qbot-birth-card.png'),
        filters: [{ name: 'PNG', extensions: ['png'] }],
      });
      if (canceled || !filePath) return null;
      await writeFile(filePath, image.toPNG());
      return filePath;
    },
  );

  // ── characters ─────────────────────────────────────────
  ipcMain.handle('characters:list', () => listCharacters());
  ipcMain.handle('characters:activate', async (_ev, dirId: string) => {
    const meta = await getCharacter(dirId);
    if (!meta || !meta.manifest) throw new Error(`character not found: ${dirId}`);
    await setSettings({ activeCharacter: dirId });
    const pet = getPetWindow() ?? createPetWindow();
    pet.webContents.send('characters:activated', meta);
    await rebuildTray(); // 切换后菜单 radio 状态同步
  });
  ipcMain.handle('characters:rename', async (_ev, dirId: string, name: string) => {
    await renameCharacter(dirId, name);
    await rebuildTray();
  });

  // ── pet ────────────────────────────────────────────────
  ipcMain.on('pet:move', (_ev, x: number, y: number) => movePetWindow(x, y));

  // ── settings ───────────────────────────────────────────
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', (_ev, patch) => setSettings(patch));
}
