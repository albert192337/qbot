/** preload：contextBridge 暴露 QBotApi（契约见 shared/ipc-types.ts） */
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { RoomChatMsg, RoomMember, RoomsStatus, RoomWave, LinkMode, AgentMessage, AgentStatus, CharacterMeta, CustomActionEvent, HatchProgress, LinkAssetProgress, LinkPeerCharacter, MeetingStatus, MusicStatus, PetMenuCommand, Progress, QBotApi, Settings } from '../shared/ipc-types';

const api: QBotApi = {
  hatch: {
    start: (refImagePath, imageProvider, characterForm, characterStyle) =>
      ipcRenderer.invoke('hatch:start', refImagePath, imageProvider, characterForm, characterStyle),
    resume: (dirId) => ipcRenderer.invoke('hatch:resume', dirId),
    redo: (dirId) => ipcRenderer.invoke('hatch:redo', dirId),
    pickTurnaround: (dirId, index) =>
      ipcRenderer.invoke('hatch:pickTurnaround', dirId, index),
    getStatus: (dirId) => ipcRenderer.invoke('hatch:getStatus', dirId),
    onProgress: (cb) => {
      const listener = (_ev: unknown, payload: HatchProgress) => cb(payload);
      ipcRenderer.on('hatch:progress', listener);
      return () => ipcRenderer.removeListener('hatch:progress', listener);
    },
    // Electron ≥32 移除了 File.path，取真实路径只能靠 webUtils（且必须在 preload）
    getPathForFile: (file) => webUtils.getPathForFile(file),
    saveCard: (rect) => ipcRenderer.invoke('hatch:saveCard', rect),
  },
  characters: {
    list: () => ipcRenderer.invoke('characters:list'),
    activate: (dirId) => ipcRenderer.invoke('characters:activate', dirId),
    rename: (dirId, name) => ipcRenderer.invoke('characters:rename', dirId, name),
    delete: (dirId) => ipcRenderer.invoke('characters:delete', dirId),
    onActivated: (cb) => {
      const listener = (_ev: unknown, meta: CharacterMeta) => cb(meta);
      ipcRenderer.on('characters:activated', listener);
      return () => ipcRenderer.removeListener('characters:activated', listener);
    },
    getActive: () => ipcRenderer.invoke('characters:getActive'),
  },
  pet: {
    // 高频拖拽走 send（不等待回包）
    move: (x, y) => ipcRenderer.send('pet:move', x, y),
    setVisitMode: (enter) => ipcRenderer.send('pet:setVisitMode', enter),
    popupMenu: (actions) => ipcRenderer.send('pet:popupMenu', actions),
    onMenuCommand: (cb) => {
      const listener = (_ev: unknown, cmd: PetMenuCommand) => cb(cmd);
      ipcRenderer.on('pet:menuCommand', listener);
      return () => ipcRenderer.removeListener('pet:menuCommand', listener);
    },
  },
  room: {
    open: () => ipcRenderer.send('room:open'),
    move: (x, y) => ipcRenderer.send('room:move', x, y),
    setIgnoreMouse: (ignore) => ipcRenderer.send('room:setIgnoreMouse', ignore),
  },
  decor: {
    get: (roomName) => ipcRenderer.invoke('decor:get', roomName),
    set: (roomName, placements) => ipcRenderer.invoke('decor:set', roomName, placements),
  },
  progress: {
    get: () => ipcRenderer.invoke('progress:get'),
    openBox: () => ipcRenderer.invoke('progress:openBox'),
    craft: (tier) => ipcRenderer.invoke('progress:craft', tier),
    onChanged: (cb) => {
      const listener = (_ev: unknown, progress: Progress) => cb(progress);
      ipcRenderer.on('progress:changed', listener);
      return () => ipcRenderer.removeListener('progress:changed', listener);
    },
    debugAddIdleMs: (ms) => ipcRenderer.invoke('progress:debugAddIdleMs', ms),
    debugGrantBoxes: (n) => ipcRenderer.invoke('progress:debugGrantBoxes', n),
    debugGrantPoints: (n) => ipcRenderer.invoke('progress:debugGrantPoints', n),
    debugGrantFurniture: (stickerId) =>
      ipcRenderer.invoke('progress:debugGrantFurniture', stickerId),
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    onChanged: (cb) => {
      const listener = (_ev: unknown, settings: Settings) => cb(settings);
      ipcRenderer.on('settings:changed', listener);
      return () => ipcRenderer.removeListener('settings:changed', listener);
    },
  },
  ui: {
    onShowScreen: (cb) => {
      const listener = (_ev: unknown, name: string) => cb(name);
      ipcRenderer.on('ui:showScreen', listener);
      return () => ipcRenderer.removeListener('ui:showScreen', listener);
    },
    /** 打开统一控制台窗并直达 pane（未开窗则新开；已开则切 pane） */
    openConsole: (pane?: string) => ipcRenderer.send('ui:openConsole', pane),
  },
  market: {
    list: () => ipcRenderer.invoke('market:list'),
    upload: (dirId) => ipcRenderer.invoke('market:upload', dirId),
    download: (hash) => ipcRenderer.invoke('market:download', hash),
    remove: (hash) => ipcRenderer.invoke('market:remove', hash),
  },
  rooms: {
    open: () => ipcRenderer.send('rooms:open'),
    list: (kind, q) => ipcRenderer.invoke('rooms:list', kind, q),
    create: (input) => ipcRenderer.invoke('rooms:create', input),
    join: (roomId) => ipcRenderer.invoke('rooms:join', roomId),
    leave: () => ipcRenderer.invoke('rooms:leave'),
    getStatus: () => ipcRenderer.invoke('rooms:getStatus'),
    getCache: () => ipcRenderer.invoke('rooms:getCache'),
    // 高频/无返回值的走 send（同 pet.move 的取舍）
    isSecure: () => ipcRenderer.invoke('rooms:isSecure'),
    chat: (text) => ipcRenderer.send('rooms:chat', text),
    deleteChat: (id) => ipcRenderer.send('rooms:deleteChat', id),
    report: (id) => ipcRenderer.send('rooms:report', id),
    wave: (memberId) => ipcRenderer.send('rooms:wave', memberId),
    update: (patch) => ipcRenderer.invoke('rooms:update', patch),
    kick: (memberId) => ipcRenderer.invoke('rooms:kick', memberId),
    toggleFavorite: (roomId) => ipcRenderer.invoke('rooms:toggleFavorite', roomId),
    disconnect: () => ipcRenderer.invoke('rooms:disconnect'),
    onStatus: (cb) => {
      const listener = (_ev: unknown, s: RoomsStatus) => cb(s);
      ipcRenderer.on('rooms:status', listener);
      return () => ipcRenderer.removeListener('rooms:status', listener);
    },
    onHistory: (cb) => {
      const listener = (_ev: unknown, chat: RoomChatMsg[]) => cb(chat);
      ipcRenderer.on('rooms:history', listener);
      return () => ipcRenderer.removeListener('rooms:history', listener);
    },
    onChat: (cb) => {
      const listener = (_ev: unknown, msg: RoomChatMsg) => cb(msg);
      ipcRenderer.on('rooms:chat', listener);
      return () => ipcRenderer.removeListener('rooms:chat', listener);
    },
    onChatDeleted: (cb) => {
      const listener = (_ev: unknown, id: string) => cb(id);
      ipcRenderer.on('rooms:chatDeleted', listener);
      return () => ipcRenderer.removeListener('rooms:chatDeleted', listener);
    },
    onMemberIn: (cb) => {
      const listener = (_ev: unknown, m: RoomMember) => cb(m);
      ipcRenderer.on('rooms:memberIn', listener);
      return () => ipcRenderer.removeListener('rooms:memberIn', listener);
    },
    onMemberOut: (cb) => {
      const listener = (_ev: unknown, id: string) => cb(id);
      ipcRenderer.on('rooms:memberOut', listener);
      return () => ipcRenderer.removeListener('rooms:memberOut', listener);
    },
    onPresence: (cb) => {
      const listener = (_ev: unknown, p: { memberId: string; mode?: LinkMode; action?: string }) => cb(p);
      ipcRenderer.on('rooms:presence', listener);
      return () => ipcRenderer.removeListener('rooms:presence', listener);
    },
    onWave: (cb) => {
      const listener = (_ev: unknown, w: RoomWave) => cb(w);
      ipcRenderer.on('rooms:wave', listener);
      return () => ipcRenderer.removeListener('rooms:wave', listener);
    },
    onKicked: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('rooms:kicked', listener);
      return () => ipcRenderer.removeListener('rooms:kicked', listener);
    },
    onError: (cb) => {
      const listener = (_ev: unknown, msg: string) => cb(msg);
      ipcRenderer.on('rooms:error', listener);
      return () => ipcRenderer.removeListener('rooms:error', listener);
    },
  },
  studio: {
    savePersona: (dirId, persona) => ipcRenderer.invoke('studio:savePersona', dirId, persona),
    addCustomAction: (dirId, name, poseDesc, motionDesc, durationSec) =>
      ipcRenderer.invoke('studio:addCustomAction', dirId, name, poseDesc, motionDesc, durationSec),
    deleteCustomAction: (dirId, name) =>
      ipcRenderer.invoke('studio:deleteCustomAction', dirId, name),
    getPrompts: (dirId) => ipcRenderer.invoke('studio:getPrompts', dirId),
    saveActionPrompt: (dirId, actionId, poseDesc, motionDesc) =>
      ipcRenderer.invoke('studio:saveActionPrompt', dirId, actionId, poseDesc, motionDesc),
    saveAgentActions: (dirId, config) =>
      ipcRenderer.invoke('studio:saveAgentActions', dirId, config),
    onCustomAction: (cb) => {
      const listener = (_ev: unknown, payload: CustomActionEvent) => cb(payload);
      ipcRenderer.on('studio:customAction', listener);
      return () => ipcRenderer.removeListener('studio:customAction', listener);
    },
    saveFullPrompts: (dirId, actionId, framePromptFull, videoPromptFull) =>
      ipcRenderer.invoke('studio:saveFullPrompts', dirId, actionId, framePromptFull, videoPromptFull),
    saveTurnaroundPrompt: (dirId, prompt) =>
      ipcRenderer.invoke('studio:saveTurnaroundPrompt', dirId, prompt),
    regenerateActions: (dirId, actionIds) =>
      ipcRenderer.invoke('studio:regenerateActions', dirId, actionIds),
    /** M 档表现力动作：官方 prompt 按需生成（幂等，已生成不重复花钱） */
    generateExpressionAction: (dirId, action) =>
      ipcRenderer.invoke('studio:generateExpressionAction', dirId, action),
    regenerateTurnaround: (dirId) =>
      ipcRenderer.invoke('studio:regenerateTurnaround', dirId),
    pickStickerDir: () => ipcRenderer.invoke('studio:pickStickerDir'),
    analyzeStickers: (input) => ipcRenderer.invoke('studio:analyzeStickers', input),
    applyStickers: (dirId, assignments) =>
      ipcRenderer.invoke('studio:applyStickers', dirId, assignments),
    clearImportedStickers: (dirId) =>
      ipcRenderer.invoke('studio:clearImportedStickers', dirId),
  },
  claude: {
    getStatus: () => ipcRenderer.invoke('claude:getStatus'),
    toggle: () => ipcRenderer.invoke('claude:toggle'),
  },
  agent: {
    getStatus: () => ipcRenderer.invoke('agent:getStatus'),
    onStatus: (cb) => {
      const listener = (_ev: unknown, status: AgentStatus) => cb(status);
      ipcRenderer.on('agent:status', listener);
      return () => ipcRenderer.removeListener('agent:status', listener);
    },
    onMessage: (cb) => {
      const listener = (_ev: unknown, msg: AgentMessage) => cb(msg);
      ipcRenderer.on('agent:message', listener);
      return () => ipcRenderer.removeListener('agent:message', listener);
    },
  },
  bubble: {
    reportEmpty: () => ipcRenderer.send('bubble:empty'),
    onClear: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('bubble:clear', listener);
      return () => ipcRenderer.removeListener('bubble:clear', listener);
    },
    onAnchor: (cb) => {
      const listener = (_ev: unknown, side: 'above' | 'below') => cb(side);
      ipcRenderer.on('bubble:anchor', listener);
      return () => ipcRenderer.removeListener('bubble:anchor', listener);
    },
  },
  music: {
    getStatus: () => ipcRenderer.invoke('music:getStatus'),
    onStatus: (cb) => {
      const listener = (_ev: unknown, status: MusicStatus) => cb(status);
      ipcRenderer.on('music:status', listener);
      return () => ipcRenderer.removeListener('music:status', listener);
    },
  },
  meeting: {
    getStatus: () => ipcRenderer.invoke('meeting:getStatus'),
    onStatus: (cb) => {
      const listener = (_ev: unknown, status: MeetingStatus) => cb(status);
      ipcRenderer.on('meeting:status', listener);
      return () => ipcRenderer.removeListener('meeting:status', listener);
    },
  },
  roomPet: {
    onHello: (cb) => {
      const listener = (_ev: unknown, info: { nickname: string }) => cb(info);
      ipcRenderer.on('roomPet:hello', listener);
      return () => ipcRenderer.removeListener('roomPet:hello', listener);
    },
    onCharacter: (cb) => {
      const listener = (_ev: unknown, meta: LinkPeerCharacter) => cb(meta);
      ipcRenderer.on('roomPet:character', listener);
      return () => ipcRenderer.removeListener('roomPet:character', listener);
    },
    onProgress: (cb) => {
      const listener = (_ev: unknown, p: LinkAssetProgress) => cb(p);
      ipcRenderer.on('roomPet:progress', listener);
      return () => ipcRenderer.removeListener('roomPet:progress', listener);
    },
    onState: (cb) => {
      const listener = (_ev: unknown, s: { mode?: LinkMode; action?: string; sign?: string }) => cb(s);
      ipcRenderer.on('roomPet:state', listener);
      return () => ipcRenderer.removeListener('roomPet:state', listener);
    },
    onChat: (cb) => {
      const listener = (_ev: unknown, msg: { text: string }) => cb(msg);
      ipcRenderer.on('roomPet:chat', listener);
      return () => ipcRenderer.removeListener('roomPet:chat', listener);
    },
    onPackFailed: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('roomPet:packFailed', listener);
      return () => ipcRenderer.removeListener('roomPet:packFailed', listener);
    },
    onLeft: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('roomPet:left', listener);
      return () => ipcRenderer.removeListener('roomPet:left', listener);
    },
    wave: () => ipcRenderer.send('roomPet:wave'),
    leaveRoom: () => ipcRenderer.send('roomPet:leaveRoom'),
    getCache: () => ipcRenderer.invoke('roomPet:getCache'),
  },
  /** 举牌：手动牌记账 + 当前实际牌面同步 */
  sign: {
    set: (text: string | null) => ipcRenderer.send('sign:set', text),
    sync: (text: string | null) => ipcRenderer.send('sign:sync', text),
  },
  perception: {
    get: () => ipcRenderer.invoke('perception:get'),
    onChanged: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('perception:changed', listener);
      return () => ipcRenderer.removeListener('perception:changed', listener);
    },
    report: (kind) => ipcRenderer.send('perception:report', kind),
    injectTest: (appName) => ipcRenderer.invoke('perception:injectTest', appName),
  },
  /** 行为引擎 → pet 窗：播指定动作（state-machine 的 PLAY_ACTION 入口） */
  behaviorAction: {
    onPlay: (cb) => {
      const listener = (_ev: unknown, payload: { action: string; loops: number }) => cb(payload);
      ipcRenderer.on('behavior:action', listener);
      return () => ipcRenderer.removeListener('behavior:action', listener);
    },
  },
  /** 行为引擎 → bubble 窗：说话气泡 */
  behaviorSay: {
    onSay: (cb) => {
      const listener = (_ev: unknown, payload: { text: string; durationMs: number }) => cb(payload);
      ipcRenderer.on('behavior:say', listener);
      return () => ipcRenderer.removeListener('behavior:say', listener);
    },
  },
  behavior: {
    getRules: () => ipcRenderer.invoke('behavior:getRules'),
    debugTrigger: (ruleId) => ipcRenderer.invoke('behavior:debugTrigger', ruleId),
    getExecutorState: () => ipcRenderer.invoke('behavior:getExecutorState'),
    stopAll: () => ipcRenderer.invoke('behavior:stopAll'),
    trigger: (trigger) => ipcRenderer.invoke('behavior:trigger', trigger),
    debugThink: () => ipcRenderer.invoke('behavior:debugThink'),
  },
};

contextBridge.exposeInMainWorld('qbot', api);
