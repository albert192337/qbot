/** IPC 注册：preload 契约的主进程实现 */
import { BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { app } from 'electron';
import type { CharacterForm, ImageProvider } from '@qbot/pipeline';
import { getCharacter, listCharacters, renameCharacter } from './characters';
import { getSettings, setSettings } from './config';
import { movePetWindow, setPetScale, getPetWindow, getRoomWindow, broadcastCharacterActivated, openRoomWindow } from './windows';
import { pickTurnaround, redoFailed, resumeHatch, startHatch } from './pipeline-bridge';
import { rebuildTray } from './tray';

export function registerIpc(): void {
  // ── hatch ──────────────────────────────────────────────
  ipcMain.handle(
    'hatch:start',
    (_ev, refImagePath: string, imageProvider?: ImageProvider, characterForm?: CharacterForm) =>
      startHatch(refImagePath, imageProvider, characterForm),
  );
  ipcMain.handle('hatch:resume', (_ev, dirId: string) => resumeHatch(dirId));
  ipcMain.handle('hatch:redo', (_ev, dirId: string) => redoFailed(dirId));
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
    broadcastCharacterActivated(meta);
    await rebuildTray(); // 切换后菜单 radio 状态同步
  });
  ipcMain.handle('characters:getActive', async () => {
    const { activeCharacter } = await getSettings();
    return activeCharacter ? getCharacter(activeCharacter) : null;
  });
  ipcMain.handle('characters:rename', async (_ev, dirId: string, name: string) => {
    await renameCharacter(dirId, name);
    await rebuildTray();
  });

  // ── pet ────────────────────────────────────────────────
  ipcMain.on('pet:move', (_ev, x: number, y: number) => movePetWindow(x, y));

  // ── room ───────────────────────────────────────────────
  ipcMain.on('room:open', async () => {
    const { activeCharacter } = await getSettings();
    const meta = activeCharacter ? await getCharacter(activeCharacter) : null;
    const name = meta?.manifest?.name;
    openRoomWindow(name && name !== '未命名' ? `${name}的家` : '小房间');
  });

  // ── settings ───────────────────────────────────────────
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', async (_ev, patch) => {
    const next = await setSettings(patch);
    if (typeof patch?.petScale === 'number') setPetScale(patch.petScale); // 实时生效
    // 语音设置实时生效（pet + room）
    getPetWindow()?.webContents.send('settings:changed', next);
    getRoomWindow()?.webContents.send('settings:changed', next);
  });
}
