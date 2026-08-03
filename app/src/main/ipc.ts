/** IPC 注册：preload 契约的主进程实现 */
import { BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { app } from 'electron';
import type { CharacterForm, CharacterStyle, ImageProvider } from '@qbot/pipeline';
import { getCharacter, listCharacters, renameCharacter, deleteCharacter } from './characters';
import { getSettings, setSettings } from './config';
import { createStudioWindow, setPetScale, getPetWindow, getRoomWindow, broadcastCharacterActivated, openRoomWindow, moveRoomWindow, setRoomIgnoreMouse, setPetVisitMode, hideBubbleWindow } from './windows';
import { getLinkStatus, stopLink, notifyActiveCharacterChanged, getPeerCache } from './link/link';
import { getHatchStatus, pickTurnaround, redoFailed, resumeHatch, startHatch, savePersona, addCustomAction, deleteCustomAction, getPrompts, saveActionPrompt, saveAgentActions } from './pipeline-bridge';
import { getDecor, setDecor } from './decor';
import { rebuildTray, popupAppMenu } from './tray';
import { getAgentStatus } from './agent-server';
import { getMusicStatus } from './music-monitor';

export function registerIpc(): void {
  // ── hatch ──────────────────────────────────────────────
  ipcMain.handle(
    'hatch:start',
    (
      _ev,
      refImagePath: string,
      imageProvider?: ImageProvider,
      characterForm?: CharacterForm,
      characterStyle?: CharacterStyle,
    ) => startHatch(refImagePath, imageProvider, characterForm, characterStyle),
  );
  ipcMain.handle('hatch:resume', (_ev, dirId: string) => resumeHatch(dirId));
  ipcMain.handle('hatch:redo', (_ev, dirId: string) => redoFailed(dirId));
  ipcMain.handle('hatch:pickTurnaround', (_ev, dirId: string, index: number) =>
    pickTurnaround(dirId, index),
  );
  ipcMain.handle('hatch:getStatus', (_ev, dirId: string) => getHatchStatus(dirId));
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
    notifyActiveCharacterChanged(); // 联机中：新形象重新 hello 给对端
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
  ipcMain.handle('characters:delete', async (_ev, dirId: string) => {
    await deleteCharacter(dirId);
    // 如果删的是当前激活角色，清空激活
    const settings = await getSettings();
    if (settings.activeCharacter === dirId) {
      await setSettings({ activeCharacter: undefined });
    }
    await rebuildTray();
  });

  // ── pet ────────────────────────────────────────────────
  // 按发送方窗口分派：本地宠和联机远端宠共用同一套拖拽代码
  ipcMain.on('pet:move', (ev, x: number, y: number) => {
    BrowserWindow.fromWebContents(ev.sender)?.setPosition(Math.round(x), Math.round(y), false);
  });
  ipcMain.on('pet:setVisitMode', (_ev, enter: boolean) => setPetVisitMode(enter));

  // ── link 联机 ──────────────────────────────────────────
  ipcMain.handle('link:getStatus', () => getLinkStatus());
  ipcMain.handle('link:getPeerCache', () => getPeerCache());
  ipcMain.on('link:stop', () => stopLink());

  // ── room ───────────────────────────────────────────────
  ipcMain.on('room:open', async () => {
    const { activeCharacter } = await getSettings();
    const meta = activeCharacter ? await getCharacter(activeCharacter) : null;
    const name = meta?.manifest?.name;
    openRoomWindow(name && name !== '未命名' ? `${name}的家` : '小房间');
  });
  ipcMain.on('room:move', (_ev, x: number, y: number) => moveRoomWindow(x, y));
  ipcMain.on('room:setIgnoreMouse', (_ev, ignore: boolean) => setRoomIgnoreMouse(ignore));

  // ── decor ──────────────────────────────────────────────
  ipcMain.handle('decor:get', (_ev, roomName: string) => getDecor(roomName));
  ipcMain.handle('decor:set', async (_ev, roomName: string, placements) => {
    try {
      await setDecor(roomName, placements);
    } catch (err) {
      console.error('decor:set failed', err); // 写失败不阻塞 UI
    }
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

  // ── studio ──────────────────────────────────────────────
  ipcMain.on('studio:open', () => createStudioWindow());
  // 桌宠右键「更多…」→ 鼠标处弹托盘同源原生菜单（托盘被刘海屏挤掉时的兜底）
  ipcMain.on('app:popupMenu', (ev) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    void popupAppMenu(win ?? undefined);
  });
  ipcMain.handle('studio:savePersona', async (_ev, dirId: string, persona: string) => {
    await savePersona(dirId, persona);
  });
  ipcMain.handle('studio:addCustomAction', async (_ev, dirId: string, name: string, poseDesc: string, motionDesc: string, durationSec: number) => {
    await addCustomAction(dirId, name, poseDesc, motionDesc, durationSec);
  });
  ipcMain.handle('studio:deleteCustomAction', async (_ev, dirId: string, name: string) => {
    await deleteCustomAction(dirId, name);
  });
  ipcMain.handle('studio:getPrompts', async (_ev, dirId: string) => {
    return getPrompts(dirId);
  });
  ipcMain.handle('studio:saveActionPrompt', async (_ev, dirId: string, actionId: string, poseDesc: string, motionDesc: string) => {
    await saveActionPrompt(dirId, actionId, poseDesc, motionDesc);
  });
  ipcMain.handle('studio:saveAgentActions', async (_ev, dirId: string, config) => {
    await saveAgentActions(dirId, config);
  });

  // ── agent 联动 ─────────────────────────────────────────
  ipcMain.handle('agent:getStatus', () => getAgentStatus());

  // ── music 联动 ─────────────────────────────────────────
  ipcMain.handle('music:getStatus', () => getMusicStatus());

  // ── bubble ─────────────────────────────────────────────
  ipcMain.on('bubble:empty', () => hideBubbleWindow());
}
