/**
 * 联机空间的展示编排层：同一套房间成员状态可在「透明桌面」或「房间场景」中呈现。
 * 房友仍复用独立透明宠窗；房间模式只改变这些窗口的父窗口与布局，不复制网络状态机。
 */
import type { RoomsDisplayMode } from '../../shared/ipc-types';
import { getSettings, setSettings } from '../config';
import {
  closeAllRoomPetWindows,
  closeRoomPetWindow,
  closeRoomWindow,
  ensureRoomPetWindow,
  getRoomPetWindow,
  layoutRoomPetWindows,
  layoutRoomPetWindowsInRoom,
  onRoomWindowBoundsChanged,
  onRoomWindowClosed,
  openRoomWindow,
  pushToLounge,
  setRoomSizePreset,
  setRoomPetWindowDisplayMode,
} from '../windows';
import { myMemberId, memberStates, onRoomPetEvent, type RoomPetEvent } from './room-pets';

/** member:out 后的宽限：宽限内 member:in 复活同一窗，避免闪断重连时窗口一开一关 */
const MEMBER_GONE_GRACE_MS = 5 * 60 * 1000;

/** 在场房友顺序（不含自己；自己由桌面宠窗或房间本地角色负责显示） */
let order: string[] = [];
let displayMode: RoomsDisplayMode = 'desktop';
let inRoom = false;
let closingRoomForModeChange = false;
const graceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function push(memberId: string, channel: string, payload: unknown): void {
  const win = getRoomPetWindow(memberId);
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function pushSnapshot(memberId: string): void {
  const state = memberStates.get(memberId);
  if (!state) return;
  push(memberId, 'roomPet:hello', { nickname: state.nickname });
  if (state.character) push(memberId, 'roomPet:character', state.character);
  push(memberId, 'roomPet:state', {
    mode: state.mode,
    action: state.action,
    sign: state.sign,
  });
}

function ensureVisible(memberId: string): void {
  if (memberId === myMemberId) return;
  ensureRoomPetWindow(memberId);
  setRoomPetWindowDisplayMode(memberId, displayMode);
  pushSnapshot(memberId);
}

function relayout(): void {
  if (displayMode === 'room') layoutRoomPetWindowsInRoom(order);
  else layoutRoomPetWindows(order);
}

function closeRoomSceneForModeChange(): void {
  closingRoomForModeChange = closeRoomWindow();
}

function applyDisplayMode(): void {
  closeAllRoomPetWindows();
  if (!inRoom) {
    if (displayMode === 'room') closeRoomSceneForModeChange();
    pushToLounge('rooms:displayMode', displayMode);
    return;
  }

  if (displayMode === 'room') {
    openRoomWindow('QBot 联机小屋');
  } else {
    closeRoomSceneForModeChange();
  }

  for (const memberId of order) ensureVisible(memberId);
  relayout();
  pushToLounge('rooms:displayMode', displayMode);
}

export function getRoomDisplayMode(): RoomsDisplayMode {
  return displayMode;
}

export async function setRoomDisplayMode(mode: RoomsDisplayMode): Promise<RoomsDisplayMode> {
  const nextMode: RoomsDisplayMode = mode === 'room' ? 'room' : 'desktop';
  await setSettings({ roomsDisplayMode: nextMode });
  displayMode = nextMode;
  applyDisplayMode();
  return displayMode;
}

export function refreshRoomPetLayout(): void {
  relayout();
}

function clearGrace(memberId: string): void {
  const timer = graceTimers.get(memberId);
  if (timer) {
    clearTimeout(timer);
    graceTimers.delete(memberId);
  }
}

function handle(event: RoomPetEvent): void {
  switch (event.kind) {
    case 'roomJoined':
      inRoom = true;
      order = [];
      applyDisplayMode();
      break;

    case 'memberIn': {
      if (event.member.memberId === myMemberId) break;
      clearGrace(event.member.memberId);
      if (!order.includes(event.member.memberId)) order.push(event.member.memberId);
      ensureVisible(event.member.memberId);
      relayout();
      break;
    }

    case 'memberOut': {
      if (event.memberId === myMemberId) break;
      push(event.memberId, 'roomPet:left', undefined);
      clearGrace(event.memberId);
      graceTimers.set(
        event.memberId,
        setTimeout(() => {
          graceTimers.delete(event.memberId);
          order = order.filter((id) => id !== event.memberId);
          closeRoomPetWindow(event.memberId);
          relayout();
          memberStates.delete(event.memberId);
        }, MEMBER_GONE_GRACE_MS),
      );
      break;
    }

    case 'character':
      push(event.memberId, 'roomPet:character', event.character);
      break;

    case 'progress':
      push(event.memberId, 'roomPet:progress', { received: event.received, total: event.total });
      break;

    case 'presence':
      push(event.memberId, 'roomPet:state', { mode: event.mode, action: event.action, sign: event.sign });
      break;

    case 'chat':
      push(event.memberId, 'roomPet:chat', { text: event.text });
      break;

    case 'packFailed':
      push(event.memberId, 'roomPet:packFailed', undefined);
      break;

    case 'roomLeft':
      for (const timer of graceTimers.values()) clearTimeout(timer);
      graceTimers.clear();
      inRoom = false;
      order = [];
      closeAllRoomPetWindows();
      if (displayMode === 'room') {
        closeRoomSceneForModeChange();
      }
      break;
  }
}

let wired = false;

/** index.ts 启动时调一次即可（幂等），把显示层挂到事件流上。 */
export function wireRoomPetDisplay(): void {
  if (wired) return;
  wired = true;
  onRoomPetEvent(handle);
  onRoomWindowBoundsChanged(relayout);
  onRoomWindowClosed(() => {
    if (closingRoomForModeChange) {
      closingRoomForModeChange = false;
      return;
    }
    if (inRoom && displayMode === 'room') void setRoomDisplayMode('desktop');
  });
  void getSettings().then((settings) => {
    setRoomSizePreset(settings.roomSizePreset ?? 'large');
    displayMode = settings.roomsDisplayMode === 'room' ? 'room' : 'desktop';
    if (inRoom) applyDisplayMode();
    else pushToLounge('rooms:displayMode', displayMode);
  });
}
