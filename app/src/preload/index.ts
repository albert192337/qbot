import type { ContactSnapshot } from '../shared/social';
/** preload：contextBridge 暴露 QBotApi（契约见 shared/ipc-types.ts） */
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { RoomChatMsg, RoomMember, RoomSizePreset, RoomsDisplayMode, RoomsStatus, RoomWave, LinkMode, AgentMessage, AgentStatus, CharacterMeta, CustomActionEvent, HatchProgress, LinkAssetProgress, LinkPeerCharacter, MeetingStatus, MusicStatus, PetMenuCommand, Progress, QBotApi, Settings } from '../shared/ipc-types';

const api: QBotApi = {
  desktop: {
    openMenu: () => ipcRenderer.send('desktop:menu'),
    get: () => ipcRenderer.invoke('desktop:get'),
    toggle: () => ipcRenderer.invoke('desktop:toggle'),
    setMemberHidden: (id, hidden) => ipcRenderer.invoke('desktop:member', id, hidden),
    drop: () => ipcRenderer.invoke('desktop:drop'),
    unpeek: () => ipcRenderer.send('desktop:unpeek'),
    reportHits: hits => ipcRenderer.send('desktop:hits', hits),
    openPeerControls: () => ipcRenderer.send('desktop:peerControls'),
    onPeerControlsClose: cb => { const fn = () => cb(); ipcRenderer.on('desktop:peerControlsClose',fn); return () => ipcRenderer.removeListener('desktop:peerControlsClose',fn); },
    onChanged: cb => {
      let alive=true, revision=-1;
      const deliver=(s:import('../shared/desktop-visibility').DesktopVisibility)=>{if(alive&&s.revision>=revision){revision=s.revision;cb(s);}};
      const fn=(_e:unknown,s:import('../shared/desktop-visibility').DesktopVisibility)=>deliver(s);
      ipcRenderer.on('desktop:changed',fn); void ipcRenderer.invoke('desktop:get').then(deliver).catch(()=>{});
      return()=>{alive=false;ipcRenderer.removeListener('desktop:changed',fn);};
    },
  },
  overlays: {
    hint:value=>ipcRenderer.send('hint:set',value),
    onHint:cb=>{const fn=(_e:unknown,value:import('../shared/pet-hint').PetHint)=>cb(value);ipcRenderer.on('hint:changed',fn);return()=>ipcRenderer.removeListener('hint:changed',fn);},
    hintAction:action=>ipcRenderer.send('hint:action',action),
    onHintAction:cb=>{const fn=(_e:unknown,action:import('../shared/pet-hint').PetHintAction)=>cb(action);ipcRenderer.on('hint:action',fn);return()=>ipcRenderer.removeListener('hint:action',fn);},
    hintHover:hit=>ipcRenderer.send('hint:hover',hit),
    report:(kind,active)=>ipcRenderer.send('overlays:report',kind,active),
    onChanged:cb=>{
      let alive=true,revision=-1;
      const deliver=(snapshot:import('../shared/desktop-overlays').HeadSnapshot)=>{if(alive&&snapshot.revision>=revision){revision=snapshot.revision;cb(snapshot);}};
      const listener=(_e:unknown,snapshot:import('../shared/desktop-overlays').HeadSnapshot)=>deliver(snapshot);
      ipcRenderer.on('overlays:changed',listener);
      void ipcRenderer.invoke('overlays:get').then(deliver).catch(()=>{});
      return()=>{alive=false;ipcRenderer.removeListener('overlays:changed',listener);};
    },
  },
  memory: {
    retry: () => ipcRenderer.invoke('memory:retry'),
    get: (character, debug) => ipcRenderer.invoke('memory:get', character, debug),
    edit: (command, character) => ipcRenderer.invoke('memory:edit', command, character),
  },
  garden: {
    interact:(target,kind)=>ipcRenderer.invoke('garden:interact',target,kind),
    answerInteraction:(id,accept,response)=>ipcRenderer.invoke('garden:answerInteraction',id,accept,response),
    onInteraction:cb=>{const fn=(_e:unknown,event:Parameters<typeof cb>[0])=>cb(event);ipcRenderer.on('garden:interaction',fn);return()=>ipcRenderer.removeListener('garden:interaction',fn);},
    online: enable => ipcRenderer.invoke('garden:online',enable),
    visit: (owner,preview,task) => ipcRenderer.invoke('garden:visit',owner,preview,task),
    cooperate: (owner,plot,action,target,task) => ipcRenderer.invoke('garden:cooperate',owner,plot,action,target,task),
    saveRehearsal: request => ipcRenderer.invoke('garden:saveRehearsal',request),
    journalStatus: () => ipcRenderer.invoke('garden:journalStatus'),
    rewriteDiary: request => ipcRenderer.invoke('garden:rewriteDiary',request),
    generateMoment: requestId => ipcRenderer.invoke('garden:generateMoment',requestId),
    weather: () => ipcRenderer.invoke('garden:weather'),
    closeTravel: () => ipcRenderer.send('garden:closeTravel'),
    onSpeechBounds: cb => { const fn = (_ev: unknown, bounds: Parameters<typeof cb>[0]) => cb(bounds); ipcRenderer.on('garden:speechBounds', fn); return () => ipcRenderer.removeListener('garden:speechBounds', fn); },
    onPerformance: cb => { const fn = (_ev: unknown, action: string | null) => cb(action); ipcRenderer.on('garden:performance', fn); return () => ipcRenderer.removeListener('garden:performance', fn); },
    cancelPerformance: restore => ipcRenderer.send('garden:cancelPerformance', restore),
    get: () => ipcRenderer.invoke('garden:get'),
    act: command => ipcRenderer.invoke('garden:act', command),
    toggle: () => ipcRenderer.send('garden:toggle'),
    collapse: () => ipcRenderer.send('garden:collapse'),
    drag: (phase, x, y) => ipcRenderer.send('garden:drag', phase, x, y),
    open: page => ipcRenderer.send('garden:open', page),
    ignoreMouse: ignore => ipcRenderer.send('garden:ignore', ignore),
    onAnchor: cb => { const fn = (_ev: unknown, anchor: Parameters<typeof cb>[0]) => cb(anchor); ipcRenderer.on('garden:anchor', fn); return () => ipcRenderer.removeListener('garden:anchor', fn); },
    onChanged: cb => { const fn = () => cb(); ipcRenderer.on('garden:changed', fn); return () => ipcRenderer.removeListener('garden:changed', fn); },
    onPage: cb => { const fn = (_ev: unknown, page: string) => cb(page); ipcRenderer.on('garden:page', fn); return () => ipcRenderer.removeListener('garden:page', fn); },
  },
  hatch: {
    cloudAccount: (invite) => ipcRenderer.invoke('hatch:cloudAccount', invite),
    onCloudStatus: (cb) => {
      const listener = (_ev: unknown, event: Parameters<typeof cb>[0]) => cb(event);
      ipcRenderer.on('hatch:cloudStatus', listener);
      return () => ipcRenderer.removeListener('hatch:cloudStatus', listener);
    },
    start: (refImagePath, imageProvider, characterForm, characterStyle, name, persona) =>
      ipcRenderer.invoke('hatch:start', refImagePath, imageProvider, characterForm, characterStyle, name, persona),
    deleteTask: (dirId) => ipcRenderer.invoke('hatch:deleteTask', dirId),
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
    perch: () => ipcRenderer.invoke('pet:perch'),
    detachPerch: () => ipcRenderer.send('pet:detachPerch'),
    getPerch: () => ipcRenderer.invoke('pet:getPerch'),
    onPerch: cb => { const fn=(_ev:unknown,state:Parameters<typeof cb>[0])=>cb(state); ipcRenderer.on('pet:perch',fn); return ()=>ipcRenderer.removeListener('pet:perch',fn); },
    // 高频拖拽走 send（不等待回包）
    move: (x, y) => ipcRenderer.send('pet:move', x, y),
    setVisitMode: (enter,partner) => ipcRenderer.invoke('pet:setVisitMode', enter,partner),
    popupMenu: (actions) => ipcRenderer.send('pet:popupMenu', actions),
    previewAction: (action) => ipcRenderer.send('pet:previewAction', action),
    onMenuCommand: (cb) => {
      const listener = (_ev: unknown, cmd: PetMenuCommand) => cb(cmd);
      ipcRenderer.on('pet:menuCommand', listener);
      return () => ipcRenderer.removeListener('pet:menuCommand', listener);
    },
  },
  room: {
    openCozyPreview: () => ipcRenderer.send('room:openCozyPreview'),
    openHome: () => ipcRenderer.send('room:openHome'),
    open: () => ipcRenderer.send('room:open'),
    move: (x, y) => ipcRenderer.send('room:move', x, y),
    getSizePreset: () => ipcRenderer.invoke('room:getSizePreset'),
    setSizePreset: (preset: RoomSizePreset) => ipcRenderer.invoke('room:setSizePreset', preset),
    setIgnoreMouse: (ignore) => ipcRenderer.send('room:setIgnoreMouse', ignore),
  },
  decor: {
    get: (roomName) => ipcRenderer.invoke('decor:get', roomName),
    onChanged: (cb) => { const listener=(_ev:unknown,change:Parameters<typeof cb>[0])=>cb(change);ipcRenderer.on('decor:changed',listener);return ()=>ipcRenderer.removeListener('decor:changed',listener); },
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
    openNursery: (create) => ipcRenderer.send('ui:openNursery', create),
    returnToDesktop: () => ipcRenderer.invoke('ui:returnToDesktop'),
    onNurseryVisibility: (cb) => {
      const listener = (_ev: unknown, visible: boolean) => cb(visible);
      ipcRenderer.on('ui:nurseryVisibility', listener);
      return () => ipcRenderer.removeListener('ui:nurseryVisibility', listener);
    },
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
  social: {
    pet: phase => ipcRenderer.invoke("social:pet", phase),
    onPet: cb => { const fn=(_e:unknown,phase?: 'start'|'keep'|'end')=>cb(phase); ipcRenderer.on("social:pet",fn); return ()=>ipcRenderer.removeListener("social:pet",fn); },
    rehearseContact: id => ipcRenderer.invoke('social:rehearseContact', id),
    contacts: refresh => ipcRenderer.invoke('social:contacts', refresh),
    contactAction: (id, action) => ipcRenderer.invoke('social:contactAction', id, action),
    contactInvitation: (id, accept) => ipcRenderer.invoke('social:contactInvitation', id, accept),
    onContacts: cb => { const fn=(_e:unknown, value:ContactSnapshot)=>cb(value); ipcRenderer.on('social:contacts',fn); return ()=>ipcRenderer.removeListener('social:contacts',fn); },
    steam: {
      get: () => ipcRenderer.invoke('steam:get'),
      refresh: () => ipcRenderer.invoke('steam:refresh'),
      invite: id => ipcRenderer.invoke('steam:invite', id),
      accept: id => ipcRenderer.invoke('steam:accept', id),
      dismiss: id => ipcRenderer.invoke('steam:dismiss', id),
      onChanged: cb => { const fn = (_e: unknown, state: import('../shared/steam').SteamSnapshot) => cb(state); ipcRenderer.on('steam:changed', fn); return () => ipcRenderer.removeListener('steam:changed', fn); },
    },
    prepareJoin: () => ipcRenderer.invoke('social:prepareJoin'),
    profile: () => ipcRenderer.invoke('social:profile'),
    pose: (action) => ipcRenderer.invoke('social:pose', action),
    openChat: () => ipcRenderer.send('social:openChat'),
    copyCode: () => ipcRenderer.invoke('social:copyCode'),
    pin: (pin) => ipcRenderer.invoke('social:pin', pin),
    close: () => ipcRenderer.send('social:close'),
    send: (text, world) => ipcRenderer.invoke('social:send', text, world),
    world: (sub) => ipcRenderer.invoke('social:world', sub),
    onWorld: (cb) => { const fn = (_e: unknown, data: RoomChatMsg[]) => cb(data); ipcRenderer.on('social:world', fn); return () => ipcRenderer.removeListener('social:world', fn); },
    moderate: (id, action, world) => ipcRenderer.invoke('social:moderate', id, action, world),
    guests: () => ipcRenderer.invoke('social:guests'),
    startTest: () => ipcRenderer.invoke('social:startTest'),
    inviteTest: (id) => ipcRenderer.invoke('social:inviteTest', id),
    removeTest: (id) => ipcRenderer.invoke('social:removeTest', id),
    replyTest: (id, text) => ipcRenderer.invoke('social:replyTest', id, text),
    interactTest: (id, kind) => ipcRenderer.invoke('social:interactTest', id, kind),
  },
  rooms: {
    open: () => ipcRenderer.send('rooms:open'),
    getDisplayMode: () => ipcRenderer.invoke('rooms:getDisplayMode'),
    setDisplayMode: (mode) => ipcRenderer.invoke('rooms:setDisplayMode', mode),
    getSceneMembers: () => ipcRenderer.invoke('rooms:getSceneMembers'),
    onSceneChanged: cb => { const fn=()=>cb(); ipcRenderer.on('rooms:sceneChanged',fn); return()=>ipcRenderer.removeListener('rooms:sceneChanged',fn); },
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
    onDisplayModeChanged: (cb) => {
      const listener = (_ev: unknown, mode: RoomsDisplayMode) => cb(mode);
      ipcRenderer.on('rooms:displayMode', listener);
      return () => ipcRenderer.removeListener('rooms:displayMode', listener);
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
  stickerLibrary: {
    analyze: dir => ipcRenderer.invoke('stickerLibrary:analyze',dir),
    scan: () => ipcRenderer.invoke('stickerLibrary:scan'),
    preview: (token,id) => ipcRenderer.invoke('stickerLibrary:preview',token,id),
    create: req => ipcRenderer.invoke('stickerLibrary:create',req),
    save: (id,library) => ipcRenderer.invoke('stickerLibrary:save',id,library),
    frame: (dir,id,seconds) => ipcRenderer.invoke('stickerLibrary:frame',dir,id,seconds),
    generate: (dir,id,seconds,description) => ipcRenderer.invoke('stickerLibrary:generate',dir,id,seconds,description),
    package: id => ipcRenderer.invoke('stickerLibrary:package',id),
    onProgress: cb => {
      const fn = (_ev: unknown,p: import('../shared/sticker-library').StickerProgress) => cb(p);
      ipcRenderer.on('stickerLibrary:progress',fn);
      return () => ipcRenderer.removeListener('stickerLibrary:progress',fn);
    },
  },
  studio: {
    saveResourceAnnotation: (dir,id,value) => ipcRenderer.invoke('studio:saveResourceAnnotation',dir,id,value),
    saveScenePools: (dir,pools) => ipcRenderer.invoke('studio:saveScenePools',dir,pools),
    imageChoices: id => ipcRenderer.invoke('studio:imageChoices',id),
    previewImage: (id,selection) => ipcRenderer.invoke('studio:previewImage',id,selection),
    saveCover: (id,selection) => ipcRenderer.invoke('studio:saveCover',id,selection),
    prepareActionFrame: (dir,id,selection) => ipcRenderer.invoke('studio:prepareActionFrame',dir,id,selection),
    actionReference: (dir,id) => ipcRenderer.invoke('studio:actionReference',dir,id),
    pendingActionFrame: (dir,id) => ipcRenderer.invoke('studio:pendingActionFrame',dir,id),
    approveActionFrame: (dir,id,frame) => ipcRenderer.invoke('studio:approveActionFrame',dir,id,frame),

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
    /** 官方预设动作：按需生成（幂等，已生成不重复花钱） */
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
    reportBounds: bounds => ipcRenderer.send('bubble:bounds', bounds),
    ignoreMouse: ignore => ipcRenderer.send('bubble:ignoreMouse', ignore),
    onReward: cb => { const fn = (_ev: unknown, items: import('../shared/garden').GardenRewardItem[]) => cb(items); ipcRenderer.on('bubble:reward', fn); return () => ipcRenderer.removeListener('bubble:reward', fn); },
    openChat: () => ipcRenderer.send('petChat:open'),
    closeChat: () => ipcRenderer.send('petChat:close'),
    sendChat: (text) => ipcRenderer.invoke('petChat:send', text),
    onThinking: cb => {
      const listener = (_ev: unknown, thinking: boolean) => cb(thinking);
      ipcRenderer.on('bubble:thinking', listener);
      return () => ipcRenderer.removeListener('bubble:thinking', listener);
    },
    say: (text, durationMs) => ipcRenderer.send('bubble:say', { text, durationMs }),
    getIdleSeconds: () => ipcRenderer.invoke('bubble:idleSeconds'),
    reportEmpty: () => ipcRenderer.send('bubble:empty'),
    onClear: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('bubble:clear', listener);
      return () => ipcRenderer.removeListener('bubble:clear', listener);
    },
    onAnchor: (cb) => {
      const listener = (_ev: unknown, side: 'above' | 'below', contentHeight?: number) => cb(side, contentHeight);
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
    interactions: () => ipcRenderer.invoke('roomPet:interactions'),
    interact: kind => ipcRenderer.invoke('roomPet:interact', kind),
    popupMenu: () => ipcRenderer.send('roomPet:popupMenu'),
    move: (x, y) => ipcRenderer.send('roomPet:move', x, y),
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
    dismiss: () => ipcRenderer.send('sign:dismiss'),
    reportBounds: bounds => ipcRenderer.send('sign:bounds', bounds),
    onHover: cb => {
      const listener = (_ev: unknown, hovered: boolean) => cb(hovered);
      ipcRenderer.on('sign:hover', listener);
      return () => ipcRenderer.removeListener('sign:hover', listener);
    },
    display: text => ipcRenderer.send('sign:display', text),
    onDisplay: cb => {
      const listener = (_ev: unknown, text: string | null) => cb(text);
      ipcRenderer.on('sign:display', listener);
      return () => ipcRenderer.removeListener('sign:display', listener);
    },
    getMessage: () => ipcRenderer.invoke('sign:getMessage'),
    onMessage: (cb: (message: import('../shared/pet-message').PetMessage | null) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: import('../shared/pet-message').PetMessage | null) => cb(message);
      ipcRenderer.on('sign:message', listener);
      return () => ipcRenderer.removeListener('sign:message', listener);
    },
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
    getIdlePlan: id=>ipcRenderer.invoke('behavior:getIdlePlan',id),
    onIdlePlan: cb=>{
      const fn=(_ev:unknown,plan:import('../shared/idle-plan').IdlePlan)=>cb(plan);
      ipcRenderer.on('behavior:idlePlan',fn);
      return ()=>ipcRenderer.removeListener('behavior:idlePlan',fn);
    },
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
    getBrainLog: () => ipcRenderer.invoke('behavior:brainLog'),
    reportTrace: (id, stage) => ipcRenderer.send('behavior:trace', id, stage),
    getRules: () => ipcRenderer.invoke('behavior:getRules'),
    debugTrigger: (ruleId) => ipcRenderer.invoke('behavior:debugTrigger', ruleId),
    getExecutorState: () => ipcRenderer.invoke('behavior:getExecutorState'),
    stopAll: () => ipcRenderer.invoke('behavior:stopAll'),
    trigger: (trigger) => ipcRenderer.invoke('behavior:trigger', trigger),
    debugThink: () => ipcRenderer.invoke('behavior:debugThink'),
    requestThink: force => ipcRenderer.invoke('behavior:requestThink', force),
  },
};

contextBridge.exposeInMainWorld('qbot', api);
