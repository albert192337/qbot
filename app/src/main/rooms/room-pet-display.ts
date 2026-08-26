/**
 * 公共房间宠上屏的显示层：订阅 room-pets.ts 的事件，驱动 windows.ts 的键控多窗
 * + 把内容推进各窗渲染器（?roomPet=1，room-pet-main.ts）。
 *
 * 状态/网络在 room-pets.ts，窗口生命周期在 windows.ts，推送编排在这——三层分开
 * 是因为 room-pets 要能在无窗口环境下单测（纯状态机），windows.ts 只认 Electron。
 */
import {
  closeAllRoomPetWindows,
  closeRoomPetWindow,
  ensureRoomPetWindow,
  getRoomPetWindow,
  layoutRoomPetWindows,
} from '../windows';
import { onRoomPetEvent, type RoomPetEvent } from './room-pets';
import { myMemberId, memberStates } from './room-pets';

/** member:out 后的宽限：宽限内 member:in 复活同一窗，避免闪断重连时窗口一开一关 */
const MEMBER_GONE_GRACE_MS = 5 * 60 * 1000; // 5分钟，避免频繁闪断

/** 在场成员顺序（用于布局；进房先后，退房不重排剩余成员顺序） */
let order: string[] = [];
const graceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function push(memberId: string, channel: string, payload: unknown): void {
  const win = getRoomPetWindow(memberId);
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function relayout(): void {
  layoutRoomPetWindows(order);
}

function clearGrace(memberId: string): void {
  const t = graceTimers.get(memberId);
  if (t) {
    clearTimeout(t);
    graceTimers.delete(memberId);
  }
}

function handle(e: RoomPetEvent): void {
  switch (e.kind) {
    case 'roomJoined':
      order = [];
      // 确保本地用户自己也被添加到成员列表中
      if (myMemberId && !order.includes(myMemberId)) {
        order.push(myMemberId);
      }
      break;

    case 'memberIn': {
      clearGrace(e.member.memberId);
      ensureRoomPetWindow(e.member.memberId); // 幂等：新成员开窗 / 宽限内复活复用
      if (!order.includes(e.member.memberId)) {
        order.push(e.member.memberId);
        relayout();
      }
      push(e.member.memberId, 'roomPet:hello', { nickname: e.member.nickname });
      if (e.member.mode) {
        push(e.member.memberId, 'roomPet:state', { mode: e.member.mode, action: e.member.action });
      }
      break;
    }

    case 'memberOut': {
      push(e.memberId, 'roomPet:left', undefined);
      // 宽限期内不关窗：可能只是短暂重连，闪断重连时窗口一开一关很扎眼
      clearGrace(e.memberId);
      graceTimers.set(
        e.memberId,
        setTimeout(() => {
          graceTimers.delete(e.memberId);
          // 从成员列表中移除
          order = order.filter((id) => id !== e.memberId);
          // 关闭角色窗口
          closeRoomPetWindow(e.memberId);
          relayout();
          // 清理成员状态
          memberStates?.delete(e.memberId);
        }, MEMBER_GONE_GRACE_MS),
      );
      break;
    }

    case 'character':
      push(e.memberId, 'roomPet:character', e.character);
      break;

    case 'progress':
      push(e.memberId, 'roomPet:progress', { received: e.received, total: e.total });
      break;

    case 'presence':
      push(e.memberId, 'roomPet:state', { mode: e.mode, action: e.action });
      break;

    case 'chat':
      push(e.memberId, 'roomPet:chat', { text: e.text });
      break;

    case 'packFailed':
      push(e.memberId, 'roomPet:packFailed', undefined);
      break;

    case 'roomLeft':
      for (const t of graceTimers.values()) clearTimeout(t);
      graceTimers.clear();
      order = [];
      closeAllRoomPetWindows();
      break;
  }
}

let wired = false;

/** index.ts 启动时调一次即可（幂等），把显示层挂到事件流上 */
export function wireRoomPetDisplay(): void {
  if (wired) return;
  wired = true;
  onRoomPetEvent(handle);
}
