/** IPC 注册：preload 契约的主进程实现 */
import { BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { app } from 'electron';
import type { CharacterForm, CharacterStyle, ImageProvider } from '@qbot/pipeline';
import type { PerceptionInteractKind, PetMenuActionEntry, PetMenuCommand, CreateRoomInput, RoomKind } from '../shared/ipc-types';
import { getCharacter, listCharacters, renameCharacter, deleteCharacter } from './characters';
import { getSettings, setSettings } from './config';
import { createConsoleWindow, createLoungeWindow, movePetWindow, setPetScale, broadcastCharacterActivated, openRoomWindow, moveRoomWindow, setRoomIgnoreMouse, setPetVisitMode, hideBubbleWindow, sendToWindows, findRoomPetMemberId, type ConsolePane } from './windows';
import { downloadSkin, listSkins, removeSkin, uploadSkin } from './market';
import { listRooms, createRoom, joinRoom, leaveRoom, getRoomsStatus, getRoomsCache, isSecureTransport, reportChat, sendChat, deleteChat, waveAt, updateRoom, kickMember, toggleFavorite, disconnectRooms } from './rooms/rooms';
import { getLocalSign, setLocalSign } from './local-sign';
import { notifyRoomCharacterChanged } from './rooms/rooms';
import { getMemberSnapshot } from './rooms/room-pets';
import { getHatchStatus, pickTurnaround, redoFailed, resumeHatch, startHatch, savePersona, addCustomAction, deleteCustomAction, getPrompts, saveActionPrompt, saveAgentActions, saveFullPrompts, saveTurnaroundPrompt, regenerateActions, regenerateTurnaround } from './pipeline-bridge';
import { getDecor, setDecor } from './decor';
import {
  analyzeStickers,
  applyStickers,
  clearImportedStickers,
  type StickerAssignment,
} from './sticker-importer';
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
import {
  emitEvent,
  getSnapshot,
  onPerceptionChanged,
  recordBehavior,
  recordDecision,
} from './perception';
import { getAllRules, debugTrigger, triggerRules } from './behavior-rules';
import { getExecutorState, stopAllBehaviors } from './behavior-executor';
import { debugThink } from './brain-llm';

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
    notifyRoomCharacterChanged(); // 公共房间：新形象重新播报给房友（上屏用）
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

  // ── 手动举牌（纯本地记账）────────────────────────────────
  ipcMain.on('sign:set', (_ev, text: string | null) =>
    setLocalSign(typeof text === 'string' ? text : null),
  );

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

  // ── 公共房间（spec 2026-08-21）────────────────────────────
  ipcMain.on('rooms:open', () => createLoungeWindow());
  ipcMain.handle('rooms:list', (_ev, kind?: RoomKind, q?: string) => listRooms(kind, q));
  ipcMain.handle('rooms:create', (_ev, input: CreateRoomInput) => createRoom(input));
  ipcMain.handle('rooms:join', (_ev, roomId: string) => joinRoom(roomId));
  ipcMain.handle('rooms:leave', () => leaveRoom());
  ipcMain.handle('rooms:getStatus', () => getRoomsStatus());
  ipcMain.handle('rooms:getCache', () => getRoomsCache());
  ipcMain.handle('rooms:isSecure', () => isSecureTransport());
  ipcMain.on('rooms:chat', (_ev, text: string) => sendChat(text));
  ipcMain.on('rooms:deleteChat', (_ev, id: string) => deleteChat(id));
  ipcMain.on('rooms:report', (_ev, id: string) => reportChat(id));
  ipcMain.on('rooms:wave', (_ev, memberId: string) => waveAt(memberId));
  ipcMain.handle('rooms:update', (_ev, patch) => updateRoom(patch));
  ipcMain.handle('rooms:kick', (_ev, memberId: string) => kickMember(memberId));
  ipcMain.handle('rooms:toggleFavorite', (_ev, roomId: string) => toggleFavorite(roomId));
  ipcMain.handle('rooms:disconnect', () => disconnectRooms());

  // 宠上屏窗（?roomPet=1）：一个窗只服务一个成员，靠发送者反查 memberId，不必带参数
  ipcMain.on('roomPet:wave', (ev) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    const memberId = win && findRoomPetMemberId(win);
    if (memberId) waveAt(memberId);
  });
  ipcMain.on('roomPet:leaveRoom', () => leaveRoom());
  ipcMain.handle('roomPet:getCache', (ev) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    const memberId = win && findRoomPetMemberId(win);
    return memberId ? getMemberSnapshot(memberId) : null;
  });

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
      // ── 去处（角色能去的地方 + 控制台）──────────────────
      { label: '小房间', click: () => void openRoomWindowSafe() },
      { label: '公共房间', click: () => createLoungeWindow() },
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

  // ── 表情包导入 ─────────────────────────────────────────
  // analyze 调打标 API（很便宜，一批不到 1 分钱），只返回建议不落盘；
  // apply 才转码写盘。取消复核 = 什么都没发生。
  ipcMain.handle(
    'studio:analyzeStickers',
    async (_ev, input: { dir?: string; files?: string[] }) => analyzeStickers(input),
  );
  ipcMain.handle(
    'studio:applyStickers',
    async (_ev, dirId: string, assignments: StickerAssignment[]) =>
      applyStickers(dirId, assignments),
  );
  ipcMain.handle('studio:clearImportedStickers', async (_ev, dirId: string) => {
    await clearImportedStickers(dirId);
  });
  ipcMain.handle('studio:pickStickerDir', async () => {
    const res = await dialog.showOpenDialog({
      title: '选择表情包文件夹',
      properties: ['openDirectory'],
    });
    return res.canceled ? null : res.filePaths[0];
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

  // ── music 联动 ─────────────────────────────────────────
  ipcMain.handle('music:getStatus', () => getMusicStatus());

  // ── meeting 联动 ───────────────────────────────────────
  ipcMain.handle('meeting:getStatus', () => getMeetingStatus());
  // ── bubble ─────────────────────────────────────────────
  ipcMain.on('bubble:empty', () => hideBubbleWindow());

  // ── perception 感知层（阶段 A：事件流/账本/行为史/决策日志）──
  ipcMain.handle('perception:get', () => getSnapshot());
  ipcMain.on('perception:report', (_ev, kind: PerceptionInteractKind) => {
    const now = Date.now();
    void emitEvent({ type: 'interact', at: now, kind });
  });
  // 调试注入：假 app_focus 事件，验证「事件→账本」链路
  ipcMain.handle('perception:injectTest', async (_ev, appName?: string) => {
    const name = (appName as string | undefined)?.trim() || 'Code（假快照）';
    await emitEvent({ type: 'app_focus', at: Date.now(), app: name, windowTitle: name });
  });

  // 感知数据变化 → 统一广播（pet 窗 + 控制台都能收到）
  onPerceptionChanged(() => {
    sendToWindows('perception:changed', null);
  });

  // ── behavior 行为规则调试（仅开发者工具用）──
  ipcMain.handle('behavior:getRules', () =>
    getAllRules().map((r) => ({ id: r.id, name: r.name, weight: r.weight, enabled: true })),
  );
  ipcMain.handle('behavior:debugTrigger', (_ev, ruleId: string) => {
    debugTrigger(ruleId);
  });
  ipcMain.handle('behavior:getExecutorState', () => getExecutorState());
  ipcMain.handle('behavior:stopAll', () => {
    stopAllBehaviors();
  });
  ipcMain.handle('behavior:trigger', (_ev, trigger: string) => {
    void triggerRules(trigger as any);
  });
  // 自由模式 LLM 脑：手动触发一次思考（绕过节流，仍受 freeMode 开关 + key 门控）
  ipcMain.handle('behavior:debugThink', async () => {
    await debugThink();
  });
}
