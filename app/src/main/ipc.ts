/** IPC 注册：preload 契约的主进程实现 */
import { BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { app } from 'electron';
import type { CharacterForm, CharacterStyle, ImageProvider } from '@qbot/pipeline';
import type { PetMenuActionEntry, PetMenuCommand } from '../shared/ipc-types';
import { getCharacter, listCharacters, renameCharacter, deleteCharacter } from './characters';
import { getSettings, setSettings } from './config';
import { createConsoleWindow, movePetWindow, setPetScale, broadcastCharacterActivated, openRoomWindow, moveRoomWindow, setRoomIgnoreMouse, setPetVisitMode, hideBubbleWindow, sendToWindows, type ConsolePane } from './windows';
import { downloadSkin, listSkins, removeSkin, uploadSkin } from './market';
import { getLinkStatus, stopLink, notifyActiveCharacterChanged, getPeerCache, getLocalSign, setLocalSign, createLinkRoom, joinLinkRoom } from './link/link';
import { getHatchStatus, pickTurnaround, redoFailed, resumeHatch, startHatch, savePersona, addCustomAction, deleteCustomAction, getPrompts, saveActionPrompt, saveAgentActions, saveFullPrompts, saveTurnaroundPrompt, regenerateActions, regenerateTurnaround } from './pipeline-bridge';
import { getDecor, setDecor } from './decor';
import {
  craft,
  debugAddIdleMs,
  debugGrantBoxes,
  debugGrantFurniture,
  debugGrantPoints,
  getProgress,
  openBox,
} from './progress';
import { rebuildTray } from './tray';
import { getAgentStatus } from './agent-server';
import { getMusicStatus } from './music-monitor';
import { getMeetingStatus } from './meeting-monitor';
import { claudeHooksPresent, toggleClaudeHooks } from './hooks/claude';

export function registerIpc(): void {
  // 开小房间：房间窗标题用激活角色名（右键菜单与 room:open 共用）
  async function openRoomWindowSafe(): Promise<void> {
    const { activeCharacter } = await getSettings();
    const meta = activeCharacter ? await getCharacter(activeCharacter) : null;
    const name = meta?.manifest?.name;
    openRoomWindow(name && name !== '未命名' ? `${name}的家` : '小房间');
  }
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
  ipcMain.on('pet:move', (_ev, x: number, y: number) => movePetWindow(x, y));
  ipcMain.on('pet:setVisitMode', (_ev, enter: boolean) => setPetVisitMode(enter));

  // ── link 联机 ──────────────────────────────────────────
  ipcMain.handle('link:getStatus', () => getLinkStatus());
  ipcMain.handle('link:getPeerCache', () => getPeerCache());
  ipcMain.on('link:setSign', (_ev, text: string | null) =>
    setLocalSign(typeof text === 'string' ? text : null),
  );
  ipcMain.on('link:stop', () => stopLink());

  // ── room ───────────────────────────────────────────────
  ipcMain.on('room:open', () => void openRoomWindowSafe());
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

  // ── progress 游戏化积累 ────────────────────────────────
  // 一次性结果（开箱/合成得到什么）走 invoke 返回值，幂等状态走 progress:changed
  // 广播 —— 两者混用会被节流的广播吞掉一次性事件（见本文件 AgentStatus 处的同类注释）
  ipcMain.handle('progress:get', () => getProgress());
  ipcMain.handle('progress:openBox', () => openBox());
  ipcMain.handle('progress:craft', (_ev, tier) => craft(tier));
  ipcMain.handle('progress:debugAddIdleMs', (_ev, ms: number) => debugAddIdleMs(ms));
  ipcMain.handle('progress:debugGrantBoxes', (_ev, n: number) => debugGrantBoxes(n));
  ipcMain.handle('progress:debugGrantPoints', (_ev, n: number) => debugGrantPoints(n));
  ipcMain.handle('progress:debugGrantFurniture', (_ev, stickerId?: string) =>
    debugGrantFurniture(stickerId),
  );

  // ── settings ───────────────────────────────────────────
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', async (_ev, patch) => {
    const next = await setSettings(patch);
    if (typeof patch?.petScale === 'number') setPetScale(patch.petScale); // 实时生效
    // 语音设置实时生效（pet + room）
    sendToWindows('settings:changed', next);
  });

  // ── studio ──────────────────────────────────────────────
  // 统一控制台：右键/托盘/各处配置入口都走这里开窗并直达 pane
  // （原 studio:open / market:open 两条 IPC 是死代码，合并改造）
  ipcMain.on('ui:openConsole', (_ev, pane?: ConsolePane) => createConsoleWindow(pane));
  ipcMain.handle('market:list', () => listSkins());
  ipcMain.handle('market:upload', (_ev, dirId: string) => uploadSkin(dirId));
  ipcMain.handle('market:download', (_ev, hash: string) => downloadSkin(hash));
  ipcMain.handle('market:remove', (_ev, hash: string) => removeSkin(hash));

  // 桌宠右键菜单：原生 Menu.popup 不受桌宠小窗边界约束（DOM 菜单会被截断）。
  // 只留「玩宠动作 + 去处」两段——所有配置/管理都收进控制台（一个窗、左侧栏二级目录），
  // 不再把托盘的 section 平铺进来。说话/播动作/举牌回渲染端执行；开窗口直调主进程
  ipcMain.on('pet:popupMenu', async (ev, actions: PetMenuActionEntry[]) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    if (!win) return;
    const send = (cmd: PetMenuCommand) => ev.sender.send('pet:menuCommand', cmd);
    const menu = Menu.buildFromTemplate([
      // ── 玩宠（最高频，一级直达）─────────────────────────
      { label: '说句话', click: () => send({ type: 'speak' }) },
      {
        label: '播放动作',
        submenu: (Array.isArray(actions) ? actions : []).map((a) => ({
          label: String(a.label),
          click: () => send({ type: 'play', action: String(a.id) }),
        })),
      },
      // 举牌不依赖联机（signboard 本地渲染，配对时才同步对端）；入口常驻，位置稳定
      {
        label: getLocalSign() ? '换个牌子…' : '举牌…',
        click: () => send({ type: 'signPrompt' }),
      },
      ...(getLocalSign() ? [{ label: '收牌', click: () => send({ type: 'signClear' as const }) }] : []),
      { type: 'separator' },
      // ── 去处（角色能去的两个地方）────────────────────────
      { label: '小房间', click: () => void openRoomWindowSafe() },
      { label: '控制台…', click: () => createConsoleWindow() },
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
  ipcMain.handle('studio:saveFullPrompts', async (_ev, dirId: string, actionId: string, framePromptFull: string, videoPromptFull: string) => {
    await saveFullPrompts(dirId, actionId, framePromptFull, videoPromptFull);
  });
  ipcMain.handle('studio:saveTurnaroundPrompt', async (_ev, dirId: string, prompt: string) => {
    await saveTurnaroundPrompt(dirId, prompt);
  });
  // 下面两个会调 API 花钱，渲染层已做二次确认
  ipcMain.handle('studio:regenerateActions', async (_ev, dirId: string, actionIds: string[]) => {
    await regenerateActions(dirId, actionIds as never);
  });
  ipcMain.handle('studio:regenerateTurnaround', async (_ev, dirId: string) => {
    // 三视图要人工挑图：先把控制台切到孵化 pane 并置前，否则候选图出现在看不见的
    // 地方，管线会永久挂在 pickResolver 上等不到人挑（原实现开的是独立孵化窗）
    createConsoleWindow('hatch');
    await regenerateTurnaround(dirId);
  });

  // ── agent 联动 ─────────────────────────────────────────
  ipcMain.handle('agent:getStatus', () => getAgentStatus());

  // ── Claude Code hooks（控制台「连接」组）────────────────
  // 读磁盘真值而非 settings 里的记忆位：用户手改 ~/.claude/settings.json 后
  // 那个 bool 会漂移（claudeHooksPresent 早就实现，此前无人调用）
  ipcMain.handle('claude:getStatus', () => claudeHooksPresent());
  ipcMain.handle('claude:toggle', async () => {
    const present = await claudeHooksPresent();
    const installed = await toggleClaudeHooks(present);
    await setSettings({ claudeHooksInstalled: installed });
    await rebuildTray();
    return installed;
  });

  // ── link 联机（控制台「连接」组新增建房/加入）───────────
  ipcMain.handle('link:create', () => createLinkRoom());
  ipcMain.handle('link:join', (_ev, code: string) => joinLinkRoom(code));

  // ── music 联动 ─────────────────────────────────────────
  ipcMain.handle('music:getStatus', () => getMusicStatus());

  // ── meeting 联动 ───────────────────────────────────────
  ipcMain.handle('meeting:getStatus', () => getMeetingStatus());
  // ── bubble ─────────────────────────────────────────────
  ipcMain.on('bubble:empty', () => hideBubbleWindow());
}
