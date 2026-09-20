import { EventEmitter } from 'node:events';
import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ pet: null as any, win: null as any, room: false }));
vi.mock('../src/main/windows', () => ({
  getPetWindow: () => state.pet,
  isRoomOpen: () => state.room,
  showBubbleWindow: () => state.win,
}));
import { beginChatThinking } from '../src/main/bubble';

beforeEach(() => {
  state.room = false;
  state.pet = Object.assign(new EventEmitter(), { isDestroyed: () => false, isVisible: () => true });
  state.win = Object.assign(new EventEmitter(), {
    isDestroyed: () => false, isVisible: () => true,
    webContents: Object.assign(new EventEmitter(), { isLoading: vi.fn(() => false), send: vi.fn() }),
  });
});

it('加载完才显示，结束后不会在迟到的加载事件中重新冒泡', () => {
  state.win.webContents.isLoading.mockReturnValue(true);
  const stop = beginChatThinking();
  expect(state.win.webContents.send).not.toHaveBeenCalled();
  stop();
  state.win.webContents.emit('did-finish-load');
  expect(state.win.webContents.send.mock.calls).toEqual([['bubble:thinking', false]]);
});

it('桌宠隐藏时收起，重复清理无副作用且释放监听', () => {
  const stop = beginChatThinking();
  state.pet.emit('hide');
  stop();
  expect(state.win.webContents.send.mock.calls).toEqual([['bubble:thinking', true], ['bubble:thinking', false]]);
  expect(state.win.listenerCount('hide')).toBe(0);
  expect(state.pet.listenerCount('hide')).toBe(0);
});

it('气泡隐藏取消待加载状态，回到桌面不补发', () => {
  state.win.webContents.isLoading.mockReturnValue(true);
  beginChatThinking();
  state.win.emit('hide');
  state.win.webContents.emit('did-finish-load');
  expect(state.win.webContents.send.mock.calls).toEqual([['bubble:thinking', false]]);
});

it('角色在房间时不显示桌面思考泡泡', () => {
  state.room = true;
  beginChatThinking()();
  expect(state.win.webContents.send).not.toHaveBeenCalled();
});
