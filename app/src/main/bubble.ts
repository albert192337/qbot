/**
 * agent 消息投递编排：懒创建气泡窗 → 投递消息。
 * 依赖方向单向 bubble.ts → windows.ts（windows 不反向依赖，否则 openRoomWindow
 * 要清气泡就成环——所以 bubble:clear 由 windows.ts 的 hideBubbleWindow 自己发）。
 */
import type { AgentMessage } from '../shared/ipc-types';
import { getPetWindow, isRoomOpen, showBubbleWindow } from './windows';

/** 请求拥有自己的清理函数，隐藏或尚未加载就结束时不补发过期状态。 */
export function beginChatThinking(): () => void {
  const pet = getPetWindow();
  if (isRoomOpen() || !pet || pet.isDestroyed() || !pet.isVisible()) return () => {};
  const win = showBubbleWindow();
  let active = true;
  const show = () => {
    if (active && !win.isDestroyed() && win.isVisible()) win.webContents.send('bubble:thinking', true);
  };
  const stop = () => {
    if (!active) return;
    active = false;
    win.removeListener('hide', stop);
    win.removeListener('closed', stop);
    pet.removeListener('hide', stop);
    if (!win.isDestroyed()) {
      win.webContents.removeListener('did-finish-load', show);
      win.webContents.send('bubble:thinking', false);
    }
  };
  win.once('hide', stop);
  win.once('closed', stop);
  pet.once('hide', stop);
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', show);
  else show();
  return stop;
}

/** 窗口还在加载时的暂存上限 */
const PENDING_MAX = 5;
const pending: AgentMessage[] = [];

export function pushAgentMessage(msg: AgentMessage): void {
  if (isRoomOpen()) return; // 角色在小房间里，不弹气泡
  const win = showBubbleWindow();
  if (win.webContents.isLoading()) {
    // 首条消息赶上窗口刚创建：暂存，did-finish-load 后补发（同 index.ts 的铺底写法）
    if (pending.length >= PENDING_MAX) pending.shift();
    pending.push(msg);
    win.webContents.once('did-finish-load', () => {
      for (const m of pending.splice(0)) win.webContents.send('agent:message', m);
    });
    return;
  }
  win.webContents.send('agent:message', msg);
}
