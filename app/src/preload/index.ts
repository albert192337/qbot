/** preload：contextBridge 暴露 QBotApi（契约见 shared/ipc-types.ts） */
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { CharacterMeta, HatchProgress, QBotApi, Settings } from '../shared/ipc-types';

const api: QBotApi = {
  hatch: {
    start: (refImagePath, imageProvider, characterForm) =>
      ipcRenderer.invoke('hatch:start', refImagePath, imageProvider, characterForm),
    resume: (dirId) => ipcRenderer.invoke('hatch:resume', dirId),
    redo: (dirId) => ipcRenderer.invoke('hatch:redo', dirId),
    pickTurnaround: (dirId, index) =>
      ipcRenderer.invoke('hatch:pickTurnaround', dirId, index),
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
    onActivated: (cb) => {
      const listener = (_ev: unknown, meta: CharacterMeta) => cb(meta);
      ipcRenderer.on('characters:activated', listener);
      return () => ipcRenderer.removeListener('characters:activated', listener);
    },
  },
  pet: {
    // 高频拖拽走 send（不等待回包）
    move: (x, y) => ipcRenderer.send('pet:move', x, y),
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
  },
  ui: {
    onShowScreen: (cb) => {
      const listener = (_ev: unknown, name: string) => cb(name);
      ipcRenderer.on('ui:showScreen', listener);
      return () => ipcRenderer.removeListener('ui:showScreen', listener);
    },
  },
};

contextBridge.exposeInMainWorld('qbot', api);
