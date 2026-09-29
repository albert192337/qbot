import { describe, it, expect, vi } from 'vitest';
const windows = vi.hoisted(() => [] as any[]);
vi.mock('electron', () => ({ BrowserWindow: { getAllWindows: () => windows } }));
import { notifyGardenRenderMode } from '../src/main/garden/render-settings';
describe('garden display settings notifications', () => {
  it('notifies desktop and management garden pages without relying on the pet window registry', () => {
    windows.splice(0);
    for(const url of ['file:///app/renderer/garden/index.html?view=strip','http://localhost:5173/garden/index.html?view=plots','file:///app/renderer/pet/index.html','about:blank'])
      windows.push({isDestroyed:()=>false,webContents:{getURL:()=>url,send:vi.fn()}});
    notifyGardenRenderMode('3d');
    for(const win of windows.slice(0,2))expect(win.webContents.send).toHaveBeenCalledWith('settings:changed',{gardenRenderMode:'3d'});
    for(const win of windows.slice(2))expect(win.webContents.send).not.toHaveBeenCalled();
    notifyGardenRenderMode('2d');
    expect(windows[0].webContents.send).toHaveBeenLastCalledWith('settings:changed',{gardenRenderMode:'2d'});
  });
  it('skips destroyed windows without reading their webContents', () => {
    windows.splice(0,windows.length,{isDestroyed:()=>true,webContents:{getURL:vi.fn(),send:vi.fn()}});
    notifyGardenRenderMode('3d');expect(windows[0].webContents.getURL).not.toHaveBeenCalled();
  });
});
