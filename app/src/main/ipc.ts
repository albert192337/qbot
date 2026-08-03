/** IPC 注册：preload 契约的主进程实现 */
import { BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { app } from 'electron';
import type { CharacterForm, CharacterStyle, ImageProvider } from '@qbot/pipeline';
import type { PetMenuActionEntry, PetMenuCommand } from '../shared/ipc-types';
import { getCharacter, listCharacters, renameCharacter, deleteCharacter } from './characters';
import { getSettings, setSettings } from './config';
import { createStudioWindow, setPetScale, getPetWindow, getRoomWindow, broadcastCharacterActivated, openRoomWindow, moveRoomWindow, setRoomIgnoreMouse, setPetVisitMode, hideBubbleWindow, createMarketWindow } from './windows';
import { downloadSkin, listSkins, removeSkin, uploadSkin } from './market';
import { getLinkStatus, stopLink, notifyActiveCharacterChanged, getPeerCache, getLocalSign, setLocalSign } from './link/link';
import { getHatchStatus, pickTurnaround, redoFailed, resumeHatch, startHatch, savePersona, addCustomAction, deleteCustomAction, getPrompts, saveActionPrompt, saveAgentActions } from './pipeline-bridge';
import { getDecor, setDecor } from './decor';
import { rebuildTray, buildMenuTemplate } from './tray';
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
  ipcMain.on('link:setSign', (_ev, text: string | null) =>
    setLocalSign(typeof text === 'string' ? text : null),
  );
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

  // ── market 装扮市场 ────────────────────────────────────
  ipcMain.on('market:open', () => createMarketWindow());
  ipcMain.handle('market:list', () => listSkins());
  ipcMain.handle('market:upload', (_ev, dirId: string) => uploadSkin(dirId));
  ipcMain.handle('market:download', (_ev, hash: string) => downloadSkin(hash));
  ipcMain.handle('market:remove', (_ev, hash: string) => removeSkin(hash));

  // 桌宠右键菜单：原生 Menu.popup 不受桌宠小窗边界约束（DOM 菜单会被截断）。
  // 说话/播动作回渲染端执行；房间/配置/市场直调主进程；「更多」内嵌托盘同源模板
  // （孵化/切角色/Claude 联动/联机/设置/退出——托盘被刘海屏挤掉时的兜底配置入口）
  ipcMain.on('pet:popupMenu', async (ev, actions: PetMenuActionEntry[]) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    if (!win) return;
    const send = (cmd: PetMenuCommand) => ev.sender.send('pet:menuCommand', cmd);
    const menu = Menu.buildFromTemplate([
      {
        label: '说话 / 动作',
        submenu: [
          { label: '说句话', click: () => send({ type: 'speak' }) },
          { type: 'separator' },
          ...(Array.isArray(actions) ? actions : []).map((a) => ({
            label: String(a.label),
            click: () => send({ type: 'play', action: String(a.id) }),
          })),
        ],
      },
      { type: 'separator' },
      {
        label: '打开房间',
        click: async () => {
          const { activeCharacter } = await getSettings();
          const meta = activeCharacter ? await getCharacter(activeCharacter) : null;
          const name = meta?.manifest?.name;
          openRoomWindow(name && name !== '未命名' ? `${name}的家` : '小房间');
        },
      },
      { label: '生成配置', click: () => createStudioWindow() },
      { label: '装扮市场', click: () => createMarketWindow() },
      // 联机举牌：打字后自己和对端屏幕上的替身都举同款牌（用户显式输入才出本机）；
      // 断线后牌还举着时也给入口，能收牌
      ...(getLinkStatus().phase === 'paired' || getLocalSign()
        ? [
            { type: 'separator' as const },
            {
              label: getLocalSign() ? '换个牌子…' : '举牌…',
              click: () => send({ type: 'signPrompt' as const }),
            },
            ...(getLocalSign()
              ? [{ label: '收牌', click: () => send({ type: 'signClear' as const }) }]
              : []),
          ]
        : []),
      { type: 'separator' },
      { label: '更多', submenu: await buildMenuTemplate() },
    ]);
    menu.popup({ window: win });
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
