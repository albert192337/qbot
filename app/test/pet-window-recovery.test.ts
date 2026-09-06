import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events');
  return {
    powerMonitor: new EventEmitter(),
    screen: Object.assign(new EventEmitter(), {
      getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }),
    }),
  };
});
import { powerMonitor, screen } from 'electron';
import { attachPetWindowRecovery } from '../src/main/pet-window-recovery';

let visible: boolean;
let room: boolean;
let win: ReturnType<typeof mockWindow>;
function mockWindow() {
  return Object.assign(new EventEmitter(), {
    webContents: Object.assign(new EventEmitter(), { reload: vi.fn(), invalidate: vi.fn() }),
    isDestroyed: () => false,
    getBounds: () => ({ x: 2000, y: 900, width: 360, height: 360 }),
    setPosition: vi.fn(),
    isMinimized: () => false, restore: vi.fn(),
    isAlwaysOnTop: () => false, setAlwaysOnTop: vi.fn(),
    isVisible: () => visible,
    showInactive: vi.fn(() => { visible = true; }),
    setVisibleOnAllWorkspaces: vi.fn(),
  });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
  visible = true; room = false; win = mockWindow();
  attachPetWindowRecovery(win as unknown as BrowserWindow, () => !room);
});
afterEach(() => { win.emit('closed'); vi.useRealTimers(); vi.restoreAllMocks(); });
it('restores an unexpectedly hidden desktop pet without taking focus', () => {
  visible = false; vi.advanceTimersByTime(15_000);
  expect(win.showInactive).toHaveBeenCalledOnce();
  expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating');
});
it('does not undo deliberate room-mode hiding on tick, load or resume', () => {
  room = true; visible = false;
  vi.advanceTimersByTime(15_000); win.webContents.emit('did-finish-load'); powerMonitor.emit('resume');
  expect(win.showInactive).not.toHaveBeenCalled(); expect(win.setPosition).not.toHaveBeenCalled();
});
it('moves an off-screen window back after removing a display or waking', () => {
  screen.emit('display-removed'); powerMonitor.emit('resume');
  expect(win.setPosition).toHaveBeenCalledWith(1080, 540);
  expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, { visibleOnFullScreen: true });
  expect(win.webContents.invalidate).toHaveBeenCalledTimes(2);
});
it('deduplicates crash reports and backs off repeated renderer failures', () => {
  win.webContents.emit('render-process-gone', {}, { reason: 'crashed' });
  win.webContents.emit('render-process-gone', {}, { reason: 'crashed' });
  vi.advanceTimersByTime(1000); expect(win.webContents.reload).toHaveBeenCalledTimes(1);
  win.webContents.emit('did-finish-load');
  win.webContents.emit('render-process-gone', {}, { reason: 'crashed' });
  vi.advanceTimersByTime(1000); expect(win.webContents.reload).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1000); expect(win.webContents.reload).toHaveBeenCalledTimes(2);
});
it('only retries main-frame load failures, excluding aborted navigation', () => {
  win.webContents.emit('did-fail-load', {}, -3, 'aborted', '', true);
  win.webContents.emit('did-fail-load', {}, -2, 'subframe', '', false);
  vi.advanceTimersByTime(1000); expect(win.webContents.reload).not.toHaveBeenCalled();
  win.webContents.emit('did-fail-load', {}, -2, 'failed', '', true);
  vi.advanceTimersByTime(1000); expect(win.webContents.reload).toHaveBeenCalledOnce();
});
it('allows a temporarily unresponsive renderer to recover without reload', () => {
  win.emit('unresponsive'); vi.advanceTimersByTime(5000); win.emit('responsive');
  vi.advanceTimersByTime(15_000); expect(win.webContents.reload).not.toHaveBeenCalled();
});
it('reloads a persistently unresponsive renderer', () => {
  win.emit('unresponsive'); vi.advanceTimersByTime(11_000);
  expect(win.webContents.reload).toHaveBeenCalledOnce();
});
it('cleans up global listeners and cancels recovery when closed', () => {
  win.webContents.emit('render-process-gone', {}, { reason: 'crashed' }); win.emit('closed');
  vi.advanceTimersByTime(60_000);
  expect(win.webContents.reload).not.toHaveBeenCalled();
  expect(powerMonitor.listenerCount('resume')).toBe(0);
  expect(screen.listenerCount('display-removed')).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});
