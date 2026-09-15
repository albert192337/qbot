import { EventEmitter } from 'node:events';
import type { BrowserWindow } from 'electron';
import { afterEach, expect, it, vi } from 'vitest';
import { attachPetWindowLayer, raisePetWindowGroup, syncPetWindowGroup } from '../src/main/pet-window-layer';

afterEach(() => vi.useRealTimers());

function windowMock(name: string, order: string[], visible = true) {
  return Object.assign(new EventEmitter(), {
    isDestroyed: () => false, isVisible: vi.fn(() => visible), isAlwaysOnTop: () => true,
    setAlwaysOnTop: vi.fn(), setParentWindow: vi.fn(), moveTop: () => order.push(name),
    show: vi.fn(), focus: vi.fn(), hookWindowMessage: vi.fn(),
    getMediaSourceId: () => name, moveAbove: vi.fn((anchor: string) => order.push(`${name}>${anchor}`)),
  });
}
it('owned surfaces rise together in order on focus/show, without stealing focus', () => {
  const order: string[] = [];
  const pet = windowMock('pet', order), bubble = windowMock('bubble', order), chat = windowMock('chat', order);
  const group = () => [pet, bubble, chat] as unknown as BrowserWindow[];
  attachPetWindowLayer(bubble as unknown as BrowserWindow, group, pet as unknown as BrowserWindow);
  expect(bubble.setParentWindow).toHaveBeenCalledWith(pet);
  bubble.emit('show');
  expect(order).toEqual(['pet', 'bubble', 'chat']);
  expect(pet.focus).not.toHaveBeenCalled();
  order.length = 0; bubble.emit('focus');
  expect(order).toEqual(['pet', 'bubble', 'chat']);
  bubble.emit('closed'); order.length = 0; bubble.emit('show');
  expect(order).toEqual([]);
});
it('native reconciliation keeps overlays adjacent to the pet and ignores hidden surfaces', () => {
  const order: string[] = [];
  const pet = windowMock('pet', order), bubble = windowMock('bubble', order), chat = windowMock('chat', order, false);
  const group = () => [pet, bubble, chat] as unknown as BrowserWindow[];
  syncPetWindowGroup(group());
  expect(order).toEqual(['bubble>pet']);
  expect(pet.focus).not.toHaveBeenCalled();
  expect(chat.show).not.toHaveBeenCalled();
  pet.isVisible.mockReturnValue(false); order.length = 0;
  syncPetWindowGroup(group()); expect(order).toEqual([]);
});
it('Windows watcher repairs foreign insertions and stops when the owner closes', () => {
  if (process.platform !== 'win32') return;
  vi.useFakeTimers();
  const order: string[] = [];
  const pet = windowMock('pet', order), bubble = windowMock('bubble', order);
  const group = () => [pet, bubble] as unknown as BrowserWindow[];
  attachPetWindowLayer(pet as unknown as BrowserWindow, group);
  vi.advanceTimersByTime(100);
  expect(order).toEqual(['bubble>pet']);
  pet.emit('closed'); order.length = 0;
  vi.advanceTimersByTime(500);
  expect(order).toEqual([]);
});
it('hidden input stays hidden and deliberately hidden pet suppresses group raising', () => {
  const order: string[] = [];
  const pet = windowMock('pet', order), bubble = windowMock('bubble', order), chat = windowMock('chat', order, false);
  const group = [pet, bubble, chat] as unknown as BrowserWindow[];
  raisePetWindowGroup(group);
  expect(order).toEqual(['pet', 'bubble']);
  expect(chat.show).not.toHaveBeenCalled();
  order.length = 0; pet.isVisible.mockReturnValue(false); raisePetWindowGroup(group);
  expect(order).toEqual([]);
});
