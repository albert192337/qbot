/** preload：contextBridge 暴露 QBotApi（契约见 shared/ipc-types.ts） */
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { AgentMessage, AgentStatus, CharacterMeta, CustomActionEvent, HatchProgress, LinkAssetProgress, LinkPeerCharacter, LinkPeerHello, LinkPeerState, MusicStatus, QBotApi, Settings } from '../shared/ipc-types';

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
  },
  appMenu: {
    popup: () => ipcRenderer.send('app:popupMenu'),
  },
  market: {
    open: () => ipcRenderer.send('market:open'),
    list: () => ipcRenderer.invoke('market:list'),
    upload: (dirId) => ipcRenderer.invoke('market:upload', dirId),
    download: (hash) => ipcRenderer.invoke('market:download', hash),
    remove: (hash) => ipcRenderer.invoke('market:remove', hash),
  },
  studio: {
    open: () => ipcRenderer.send('studio:open'),
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
  link: {
    getStatus: () => ipcRenderer.invoke('link:getStatus'),
    stop: () => ipcRenderer.send('link:stop'),
    onPeerHello: (cb) => {
      const listener = (_ev: unknown, info: LinkPeerHello) => cb(info);
      ipcRenderer.on('link:peerHello', listener);
      return () => ipcRenderer.removeListener('link:peerHello', listener);
    },
    onPeerState: (cb) => {
      const listener = (_ev: unknown, s: LinkPeerState) => cb(s);
      ipcRenderer.on('link:peerState', listener);
      return () => ipcRenderer.removeListener('link:peerState', listener);
    },
    onPeerLeft: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('link:peerLeft', listener);
      return () => ipcRenderer.removeListener('link:peerLeft', listener);
    },
    onPeerCharacter: (cb) => {
      const listener = (_ev: unknown, meta: LinkPeerCharacter) => cb(meta);
      ipcRenderer.on('link:peerCharacter', listener);
      return () => ipcRenderer.removeListener('link:peerCharacter', listener);
    },
    onAssetProgress: (cb) => {
      const listener = (_ev: unknown, p: LinkAssetProgress) => cb(p);
      ipcRenderer.on('link:assetProgress', listener);
      return () => ipcRenderer.removeListener('link:assetProgress', listener);
    },
    getPeerCache: () => ipcRenderer.invoke('link:getPeerCache'),
  },
};

contextBridge.exposeInMainWorld('qbot', api);
