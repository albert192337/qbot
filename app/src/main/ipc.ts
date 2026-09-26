import { registerRoomPetMenu } from './rooms/room-pet-menu';
import { registerDesktopVisibility, desktopQuiet } from './desktop-visibility';
import {registerDesktopOverlays} from './desktop-overlays';
import {registerPetHints} from './pet-hint';
import { saveResourceAnnotation, saveScenePools } from './resource-settings';
import { registerSocialIpc } from './social-ipc';
import { moveRoomPetWindow } from './windows';
import { imageChoices, selectedImage, saveCover } from './character-images';
import { prepareActionFrame, approveActionFrame, pendingActionFrame, actionReference } from './pipeline-bridge';
import { cloudAccount, acknowledgeCloudJob, forgetCloudJob } from './cloud-generation';
import { tryPerch, detachPerch, getPerchState } from './window-perch';
import { initUserMemory, editUserMemory, resumeMemoryExtraction } from './user-memory';
/** IPC 注册：preload 契约的主进程实现 */
import { BrowserWindow, Menu, dialog, ipcMain, powerMonitor } from 'electron';
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { app } from 'electron';
import { showBubbleWindow, getBubbleWindow, openCozyPreview, displayDesktopSign } from './windows';
import { openGenePreview, openDesktopGenePreview, openPineapplePreview } from './gene-preview';
import { getBrainLog, updateBrainCall } from './brain-log';
import type { CharacterForm, CharacterStyle, ImageProvider } from '@qbot/pipeline';
import type { PerceptionInteractKind, PetMenuActionEntry, PetMenuCommand, CreateRoomInput, RoomKind, RoomSizePreset, RoomsDisplayMode } from '../shared/ipc-types';
import { charactersDir, getCharacter, listCharacters, renameCharacter, deleteCharacter, deleteGenerationTask } from './characters';
import { getSettings, setSettings } from './config';
import { createNurseryWindow, closeRoomWindow, openRoomWindow, createConsoleWindow, createLoungeWindow, movePetWindow, setPetScale, broadcastCharacterActivated, moveRoomWindow, setRoomIgnoreMouse, setPetVisitMode, hideBubbleWindow, sendToWindows, findRoomPetMemberId, getPetWindow, getRoomSizePreset, setRoomSizePreset, type ConsolePane } from './windows';
import { downloadSkin, listSkins, removeSkin, uploadSkin } from './market';
import { listRooms, createRoom, joinRoom, leaveRoom, getRoomsStatus, getRoomsCache, isSecureTransport, reportChat, sendChat, deleteChat, waveAt, updateRoom, kickMember, toggleFavorite, disconnectRooms, pushLocalSign } from './rooms/rooms';
import { getLocalSign, setLocalSign } from './local-sign';
import { getPetMessage, clearPetMessage, onPetMessageChanged } from './pet-message';
import { notifyRoomCharacterChanged } from './rooms/rooms';
import { getMemberSnapshot } from './rooms/room-pets';
import { getRoomDisplayMode, getRoomSceneMembers, refreshRoomPetLayout, setRoomDisplayMode } from './rooms/room-pet-display';
import { getHatchStatus, pickTurnaround, redoFailed, resumeHatch, startHatch, savePersona, addCustomAction, deleteCustomAction, getPrompts, saveActionPrompt, saveAgentActions, saveFullPrompts, saveTurnaroundPrompt, regenerateActions, regenerateTurnaround, generateExpressionAction } from './pipeline-bridge';
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
import { weatherTestMenu } from './weather';
import { PAIR_INTERACTIONS, pairActions } from '../shared/pair-interaction';
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
  setForegroundObservationEnabled,
} from './perception';
import { getAllRules, debugTrigger, triggerRules } from './behavior-rules';
import { getExecutorState, stopAllBehaviors } from './behavior-executor';
import { debugThink, requestThink } from './brain-llm';
import { setGardenSpeechBounds } from './garden/windows';
import { sendPetChat } from './pet-chat';
import { openPetChat, closePetChat } from './windows';
import { registerGardenIpc } from './garden/windows';
import { registerStickerLibraryIpc } from './sticker-library-ipc';
import { getIdlePlan } from './idle-plan';

export function registerIpc(): void {
  registerDesktopVisibility();
  registerPetHints();
  registerDesktopOverlays((id,kind)=>id===getPetWindow()?.webContents.id||(kind==='speech'&&id===getBubbleWindow()?.webContents.id));
  registerSocialIpc();
  ipcMain.handle('behavior:getIdlePlan',(_ev,id:string)=>getIdlePlan(id));
  ipcMain.handle('memory:retry', async () => {
    if (!(await getSettings()).developerMode) throw new Error('请先开启开发者模式');
    await resumeMemoryExtraction(true);
  });
  const memoryCharacter = async (value: unknown) => {
    const id = value === undefined ? (await getSettings()).activeCharacter ?? 'default' : value;
    if (typeof id !== 'string' || (id !== 'default' && !(await listCharacters()).some(c => c.dirId === id))) throw new Error('角色不存在');
    return id;
  };
  ipcMain.handle('memory:get', async (_ev, character, debug) => {
    const id = await memoryCharacter(character);
    if (debug === true && !(await getSettings()).developerMode) throw new Error('请先开启开发者模式');
    const store = await initUserMemory();
    await store.flush();
    return store.snapshot(id, debug === true);
  });
  ipcMain.handle('memory:edit', async (_ev, command, character) => {
    await editUserMemory(command, await memoryCharacter(character));
  });
  registerStickerLibraryIpc();
  registerGardenIpc();
  ipcMain.on('petChat:open', () => openPetChat());
  ipcMain.on('petChat:close', () => closePetChat());
  ipcMain.handle('petChat:send', (_ev, text: unknown) => sendPetChat(text));
  // ── hatch ──────────────────────────────────────────────
  ipcMain.handle(
    'hatch:start',
    (
      _ev,
      refImagePath: string,
      imageProvider?: ImageProvider,
      characterForm?: CharacterForm,
      characterStyle?: CharacterStyle,
      name?: string,
      persona?: string,
    ) => startHatch(refImagePath, imageProvider, characterForm, characterStyle, name, persona),
  );
  ipcMain.handle('hatch:cloudAccount', (_ev, invite?: string) => cloudAccount(invite));
  ipcMain.handle('hatch:resume', (_ev, dirId: string) => resumeHatch(dirId));
  ipcMain.handle('hatch:redo', (_ev, dirId: string) => redoFailed(dirId));
  ipcMain.handle('hatch:pickTurnaround', (_ev, dirId: string, index: number) =>
    pickTurnaround(dirId, index),
  );
  ipcMain.handle('hatch:deleteTask', (_ev, dirId: string) => deleteGenerationTask(dirId));
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
    await acknowledgeCloudJob(dirId);
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
    await forgetCloudJob(dirId);
    await deleteCharacter(dirId);
    // 如果删的是当前激活角色，清空激活
    const settings = await getSettings();
    if (settings.activeCharacter === dirId) {
      await setSettings({ activeCharacter: undefined });
    }
    await rebuildTray();
  });

  // ── pet ────────────────────────────────────────────────
  ipcMain.handle('pet:perch', ev => !desktopQuiet() && ev.sender === getPetWindow()?.webContents ? tryPerch() : {ok:false});
  app.once('before-quit',detachPerch);
  ipcMain.handle('pet:getPerch', ev => ev.sender === getPetWindow()?.webContents ? getPerchState() : null);
  ipcMain.on('pet:detachPerch', ev => { if(ev.sender === getPetWindow()?.webContents)detachPerch(); });
  ipcMain.on('pet:move', (_ev, x: number, y: number) => movePetWindow(x, y));
  ipcMain.handle('pet:setVisitMode', (ev, enter: boolean, partner?:string) => {
    if(partner!==undefined&&(typeof partner!=='string'||!/^[A-Z0-9]{12}$/.test(partner)))throw Error('无效的互动房友');
    if (ev.sender === getPetWindow()?.webContents && typeof enter === 'boolean') setPetVisitMode(enter,partner);
  });

  // ── 手动举牌（纯本地记账）────────────────────────────────
  onPetMessageChanged(message => sendToWindows('sign:message', message));
  ipcMain.handle('sign:getMessage', () => getPetMessage());
  ipcMain.on('sign:display', (ev, text: unknown) => {
    if (ev.sender !== getPetWindow()?.webContents) return;
    if (text !== null && typeof text !== 'string') return;
    displayDesktopSign(typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, 60) || null : null);
  });
  ipcMain.on('sign:set', (_ev, text: string | null) => {
    setLocalSign(typeof text === 'string' ? text : null);
    if (!text) clearPetMessage();
  });
  ipcMain.on('sign:sync', (_ev, text: string | null) =>
    pushLocalSign(typeof text === 'string' ? text : null),
  );

  // ── room ───────────────────────────────────────────────
  // 旧的小房间调用兼容到统一联机空间；房间场景由联机空间内的展示模式控制。
  ipcMain.on('room:open', () => createLoungeWindow());
  ipcMain.on('room:openCozyPreview', () => openCozyPreview());
  ipcMain.on('room:openHome', () => {
    if (getRoomsStatus().phase === 'in-room') void setRoomDisplayMode('room');
    else openRoomWindow('QBot 我的小屋');
  });
  ipcMain.on('room:move', (_ev, x: number, y: number) => {
    moveRoomWindow(x, y);
    refreshRoomPetLayout();
  });
  ipcMain.handle('room:getSizePreset', () => getRoomSizePreset());
  ipcMain.handle('room:setSizePreset', async (_ev, preset: RoomSizePreset) => {
    const normalized = setRoomSizePreset(preset);
    await setSettings({ roomSizePreset: normalized });
    refreshRoomPetLayout();
    return normalized;
  });
  ipcMain.on('room:setIgnoreMouse', (_ev, ignore: boolean) => setRoomIgnoreMouse(ignore));

  // ── decor ──────────────────────────────────────────────
  ipcMain.handle('decor:get', (_ev, roomName: string) => getDecor(roomName));
  ipcMain.handle('decor:set', async (_ev, roomName: string, placements) => {
    await setDecor(roomName, placements);
    sendToWindows('decor:changed',{roomName,placements});
  });

  // ── progress 游戏化积累 ────────────────────────────────
  // 一次性结果（开箱/合成得到什么）走 invoke 返回值，幂等状态走 progress:changed
  // 广播 —— 两者混用会被节流的广播吞掉一次性事件（见本文件 AgentStatus 处的同类注释）
  ipcMain.handle('progress:get', () => getProgress());
  ipcMain.handle('progress:openBox', async () => {
    const result = await openBox();
    if (result.ok && result.gardenItems?.length) {
      const win = showBubbleWindow();
      const send = () => { if (!win.isDestroyed()) win.webContents.send('bubble:reward', result.gardenItems); };
      if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send); else send();
    }
    return result;
  });
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
    if (typeof patch?.foregroundObservationEnabled === 'boolean') {
      setForegroundObservationEnabled(patch.foregroundObservationEnabled);
      sendToWindows('perception:changed', null);
    }
    // 语音设置实时生效（pet + room）
    sendToWindows('settings:changed', next);
  });

  // ── studio ──────────────────────────────────────────────
  // 统一控制台：右键/托盘/各处配置入口都走这里开窗并直达 pane
  // （原 studio:open / market:open 两条 IPC 是死代码，合并改造）
  ipcMain.on('ui:openNursery', (_ev, create?: boolean) => createNurseryWindow(create === true));
  ipcMain.handle('ui:returnToDesktop', async () => {
    if (getRoomsStatus().phase === 'in-room') await setRoomDisplayMode('desktop');
    else closeRoomWindow();
    getPetWindow()?.showInactive();
  });
  ipcMain.on('ui:openConsole', (_ev, pane?: ConsolePane) => createConsoleWindow(pane));
  ipcMain.handle('market:list', () => listSkins());
  ipcMain.handle('market:upload', (_ev, dirId: string) => uploadSkin(dirId));
  ipcMain.handle('market:download', (_ev, hash: string) => downloadSkin(hash));
  ipcMain.handle('market:remove', (_ev, hash: string) => removeSkin(hash));

  // ── 公共房间（spec 2026-08-21）────────────────────────────
  ipcMain.on('rooms:open', () => createLoungeWindow());
  ipcMain.handle('rooms:getDisplayMode', () => getRoomDisplayMode());
  ipcMain.handle('rooms:getSceneMembers', () => getRoomSceneMembers());
  ipcMain.handle('rooms:setDisplayMode', (_ev, mode: RoomsDisplayMode) => setRoomDisplayMode(mode));
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
  registerRoomPetMenu();
  ipcMain.on('roomPet:move', (event, x: number, y: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) moveRoomPetWindow(win, x, y);
  });
  ipcMain.handle('roomPet:getCache', (ev) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    const memberId = win && findRoomPetMemberId(win);
    const snap = memberId ? getMemberSnapshot(memberId) : null;
    return snap ? {hello:{nickname:snap.nickname,memberId}, character:snap.character, state:{mode:snap.mode,action:snap.action,sign:snap.sign}} : null;
  });

  // 桌宠右键菜单：原生 Menu.popup 不受桌宠小窗边界约束（DOM 菜单会被截断）。
  // 只留「玩宠动作 + 去处」两段——所有配置/管理都收进控制台（一个窗、左侧栏二级目录），
  // 不再把托盘的 section 平铺进来。说话/播动作/举牌回渲染端执行；开窗口直调主进程
  ipcMain.on('pet:popupMenu', async (ev, actions: PetMenuActionEntry[]) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    if (!win) return;
    const send = (cmd: PetMenuCommand) => ev.sender.send('pet:menuCommand', cmd);
    const active = (await getSettings()).activeCharacter;
    const guests = (await listCharacters()).filter(c => c.dirId !== active && c.manifest && pairActions(c.manifest).size);
    const {CHARACTER_UNLOCKS,currentGrowth,characterLevel}=await import('../shared/garden-life');
    const garden=await (await import('./garden/service')).getGarden().catch(()=>null);
    const actorLevel=garden?characterLevel(currentGrowth(garden)?.xp??0):1;
    if (win.isDestroyed()) return;
    const menu = Menu.buildFromTemplate([
      // ── 玩宠（最高频，一级直达）─────────────────────────
      { label: '说句话', click: () => send({ type: 'speak' }) },
      { label: '双人互动（本地试演）', submenu: [
        ...PAIR_INTERACTIONS.map(({ id, label }) => ({ label:label+(CHARACTER_UNLOCKS.some(u=>u.kind===id&&u.level>actorLevel)?` · Lv.${CHARACTER_UNLOCKS.find(u=>u.kind===id)!.level} 解锁`:''),enabled:!CHARACTER_UNLOCKS.some(u=>u.kind===id&&u.level>actorLevel), submenu: guests.length
          ? guests.map(c => ({ label: c.manifest.name, click: () => send({ type: 'pair', kind: id, guestId: c.dirId }) }))
          : [{ label: '请先下载或创建另一个角色', enabled: false }] })),
        { label: '结束互动', click: () => send({ type: 'pairEnd' }) },
      ] },
      weatherTestMenu(win.getBounds()),
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
      ...(getLocalSign() || getPetMessage() ? [{ label: '收牌 / 收起留言', click: () => send({ type: 'signClear' as const }) }] : []),
      { type: 'separator' },
      // ── 去处（角色能去的地方 + 控制台）──────────────────
      { label: '一起玩…', click: () => createLoungeWindow() },
      { label: '角色管理…', click: () => createConsoleWindow() },
      { label: '草莓基因工坊（效果预览）…', click: () => openGenePreview() },
      { label: '菠萝词条工坊（效果预览）…', click: () => openPineapplePreview() },
      { label: '3D 草莓放到桌面（试摆）…', click: () => openDesktopGenePreview() },
      { label: '养成从头开始…', click: () => { void import('./reset-progress').then(m => m.confirmProgressReset(win)); } },
      { label: '工具抽屉（日志）…', click: async () => {
        await setSettings({ developerMode: true });
        createConsoleWindow('devtools');
      } },
    ]);
    menu.popup({ window: win });
  });
  ipcMain.on('pet:previewAction', (_ev, action: string) => {
    getPetWindow()?.webContents.send('pet:menuCommand', { type: 'play', action } satisfies PetMenuCommand);
  });
  ipcMain.handle('studio:savePersona', async (_ev, dirId: string, persona: string) => {
    await savePersona(dirId, persona);
  });
  ipcMain.handle('studio:addCustomAction', async (_ev, dirId: string, name: string, poseDesc: string, motionDesc: string, durationSec: number) => {
    await addCustomAction(dirId, name, poseDesc, motionDesc, durationSec);
  });
  // 官方预设动作按需生成（复用自定义动作管线，幂等不重复花钱）
  ipcMain.handle('studio:generateExpressionAction', async (_ev, dirId: string, action: string) => {
    await generateExpressionAction(dirId, action as any);
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
  const notifyResources = async (dirId: string) => {
    const meta = await getCharacter(dirId);
    if (meta && (await getSettings()).activeCharacter === dirId) broadcastCharacterActivated(meta);
  };
  ipcMain.handle('studio:saveResourceAnnotation', async (_ev, dirId: string, id: string, value) => {
    await saveResourceAnnotation(path.join(charactersDir(),checkedImageDir(dirId)),id,value); await notifyResources(dirId);
  });
  ipcMain.handle('studio:saveScenePools', async (_ev, dirId: string, pools) => {
    await saveScenePools(path.join(charactersDir(),checkedImageDir(dirId)),pools); await notifyResources(dirId);
  });
  ipcMain.handle('studio:imageChoices', async (_ev, dirId: string) => imageChoices(path.join(charactersDir(),checkedImageDir(dirId))));
  ipcMain.handle('studio:previewImage', async (_ev, dirId: string, selection) => `data:image/png;base64,${(await selectedImage(path.join(charactersDir(),checkedImageDir(dirId)),selection)).toString('base64')}`);
  ipcMain.handle('studio:saveCover', async (_ev, dirId: string, selection) => saveCover(path.join(charactersDir(),checkedImageDir(dirId)),selection));
  ipcMain.handle('studio:prepareActionFrame', async (_ev, dirId: string, id, selection) => prepareActionFrame(checkedImageDir(dirId),id,selection));
  ipcMain.handle('studio:actionReference', async (_ev, dirId: string, id) => actionReference(checkedImageDir(dirId),id));
  ipcMain.handle('studio:pendingActionFrame', async (_ev, dirId: string, id) => pendingActionFrame(checkedImageDir(dirId),id));
  ipcMain.handle('studio:approveActionFrame', async (_ev, dirId: string, id, frame) => approveActionFrame(checkedImageDir(dirId),id,frame));
  ipcMain.handle('studio:regenerateActions', async (_ev, dirId: string, actionIds: string[]) => {
    await regenerateActions(dirId, actionIds as never);
  });
  ipcMain.handle('studio:regenerateTurnaround', async (_ev, dirId: string) => {
    // 三视图要人工挑图：先把控制台切到孵化 pane 并置前，否则候选图出现在看不见的
    // 地方，管线会永久挂在 pickResolver 上等不到人挑（原实现开的是独立孵化窗）
    createConsoleWindow('tasks');
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
  ipcMain.on('bubble:bounds', (ev, bounds) => {
    const win = getBubbleWindow();
    if (!win || win.isDestroyed() || ev.sender !== win.webContents) return;
    if (bounds === null) { setGardenSpeechBounds(null); return; }
    if (!bounds || !['left','right','top','bottom'].every(k => typeof bounds[k] === 'number' && Number.isFinite(bounds[k]))) return;
    const b = win.getBounds();
    setGardenSpeechBounds({left:b.x+bounds.left,right:b.x+bounds.right,top:b.y+bounds.top,bottom:b.y+bounds.bottom});
  });
  ipcMain.on('bubble:ignoreMouse', (ev, ignore: boolean) => {
    const win = getBubbleWindow();
    if (win && !win.isDestroyed() && ev.sender === win.webContents && typeof ignore === 'boolean')
      win.setIgnoreMouseEvents(ignore, { forward: true });
  });
  ipcMain.on('bubble:say', (ev, payload: { text?: unknown; durationMs?: unknown }) => {
    if (desktopQuiet() || ev.sender !== getPetWindow()?.webContents || typeof payload?.text !== 'string') return;
    const text = payload.text.trim().slice(0, 500);
    if (!text) return;
    const win = showBubbleWindow();
    const msg = { text, durationMs: 20_000 };
    if (win.webContents.isLoading()) win.webContents.once('did-finish-load', () => {
      if (!desktopQuiet() && !win.isDestroyed() && win.isVisible()) win.webContents.send('behavior:say', msg);
    });
    else win.webContents.send('behavior:say', msg);
  });
  ipcMain.handle('bubble:idleSeconds', () =>
    powerMonitor.getSystemIdleState(15) === 'locked' ? 15 : powerMonitor.getSystemIdleTime());

  // ── perception 感知层（阶段 A：事件流/账本/行为史/决策日志）──
  ipcMain.handle('perception:get', () => getSnapshot());
  ipcMain.on('perception:report', (_ev, kind: PerceptionInteractKind) => {
    const now = Date.now();
    void emitEvent({ type: 'interact', at: now, kind });
  });
  // 调试注入：假 app_focus 事件，验证「事件→账本」链路
  ipcMain.handle('perception:injectTest', async (_ev, appName?: string) => {
    const name = (appName as string | undefined)?.trim() || 'Code（假快照）';
    const windows = process.platform === 'win32';
    await emitEvent({
      type: 'app_focus',
      at: Date.now(),
      platform: windows ? 'windows' : 'macos',
      source: windows ? 'windows-user32' : 'macos-nsworkspace-system-events',
      detailLevel: 'full',
      app: name,
      windowTitle: `${name} · 调试窗口`,
      processId: process.pid,
      processName: 'qbot-debug',
    });
  });

  // 感知数据变化 → 统一广播（pet 窗 + 控制台都能收到）
  onPerceptionChanged(() => {
    sendToWindows('perception:changed', null);
  });

  // ── behavior 行为规则调试（仅开发者工具用）──
  ipcMain.handle('behavior:getRules', () =>
    getAllRules().map((r) => ({ id: r.id, name: r.name, weight: r.weight, enabled: true })),
  );
  ipcMain.handle('behavior:brainLog', () => getBrainLog());
  ipcMain.on('behavior:trace', (_ev, id: string, stage: string) => {
    if (typeof id === 'string' && typeof stage === 'string') void updateBrainCall(id, stage.slice(0, 200));
  });
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
  ipcMain.handle('behavior:requestThink', async (ev, force) => {
    if (ev.sender === getPetWindow()?.webContents) await requestThink(force === true);
  });
}

function checkedImageDir(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('无效角色');
  return id;
}
