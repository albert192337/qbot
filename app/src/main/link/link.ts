/**
 * 联机链路管理（spec §二.2）：房间生命周期 + 本地状态出帧 + 对端帧驱动远端宠窗。
 *
 * 隐私铁律（spec §四）：出本机的只有状态枚举、动作名、开关放行的曲名。
 * 气泡正文 / last_assistant_message / cwd / 会话内容永远不进这个模块。
 */
import { getCharacter } from '../characters';
import { getSettings } from '../config';
import type {
  AgentActivity,
  LinkMode,
  LinkPeerHello,
  LinkPeerState,
  LinkStatus,
  MusicStatus,
} from '../../shared/ipc-types';
import {
  closeRemotePetWindow,
  createRemotePetWindow,
  getRemotePetWindow,
} from '../windows';
import { RelayWsTransport } from './relay-ws';
import type { LinkFrame, Transport } from './transport';

/** 状态心跳（对端以此确认链路活着；on-change 之外的兜底重发） */
const HEARTBEAT_MS = 15_000;
/** 对端掉线宽限：期内重连则恢复，超时关远端窗（spec §一「掉线表现」） */
const PEER_GONE_CLOSE_MS = 30_000;
const VALID_MODES: ReadonlySet<string> = new Set([
  'idle', 'thinking', 'working', 'waiting', 'done', 'error', 'music',
]);

let transport: Transport | null = null;
let status: LinkStatus = { phase: 'off' };
/** 状态变化通知（index.ts 接去重建托盘；避免 link ↔ tray 循环 import） */
let statusListener: (() => void) | null = null;

let localActivity: AgentActivity = 'idle';
let localMusic: MusicStatus = { playing: false };
/** 上次发出的 state 帧序列化快照（on-change 去重；心跳强制重发） */
let lastSent: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let peerGoneTimer: ReturnType<typeof setTimeout> | null = null;

/** 对端缓存：远端窗（重）加载时补发，不依赖帧到达时窗口已就绪 */
let peerHello: LinkPeerHello | null = null;
let peerState: LinkPeerState | null = null;

export function setLinkStatusListener(cb: () => void): void {
  statusListener = cb;
}

export function getLinkStatus(): LinkStatus {
  return status;
}

function setStatus(next: LinkStatus): void {
  status = next;
  statusListener?.();
}

// ── 房间生命周期 ────────────────────────────────────────────

export async function createLinkRoom(): Promise<string> {
  stopLink();
  transport = makeTransport();
  try {
    const code = await transport.create();
    setStatus({ phase: 'waiting', roomCode: code });
    return code;
  } catch (err) {
    teardown();
    throw err;
  }
}

export async function joinLinkRoom(code: string): Promise<void> {
  stopLink();
  setStatus({ phase: 'connecting' });
  transport = makeTransport();
  try {
    await transport.join(code); // resolve 即 paired（handlePaired 已触发）
  } catch (err) {
    teardown();
    throw err;
  }
}

/** 主动断开：发 bye（区别于掉线，对端立即收走远端窗不等宽限） */
export function stopLink(): void {
  if (!transport) return;
  transport.send({ t: 'bye' });
  teardown();
}

function teardown(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (peerGoneTimer) { clearTimeout(peerGoneTimer); peerGoneTimer = null; }
  transport?.close();
  transport = null;
  peerHello = null;
  peerState = null;
  lastSent = null;
  closeRemotePetWindow();
  setStatus({ phase: 'off' });
}

function makeTransport(): Transport {
  return new RelayWsTransport({
    onPaired: handlePaired,
    onFrame: handleFrame,
    onPeerLeave: handlePeerLeave,
    onClosed: teardown, // 本端连接死了：整体收场（断线重连是 L3）
  });
}

// ── transport 事件 ──────────────────────────────────────────

function handlePaired(): void {
  console.log('[link] paired');
  if (peerGoneTimer) { clearTimeout(peerGoneTimer); peerGoneTimer = null; }
  setStatus({ ...status, phase: 'paired' });
  void sendHello();
  void sendState(true);
  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => void sendState(true), HEARTBEAT_MS);
  }
  openRemoteWindow();
}

function handleFrame(frame: LinkFrame): void {
  switch (frame.t) {
    case 'hello': {
      peerHello = { charName: String(frame.charName ?? '好友') };
      setStatus({ ...status, peerName: peerHello.charName });
      pushToRemote('link:peerHello', peerHello);
      break;
    }
    case 'state': {
      const mode = VALID_MODES.has(String(frame.mode)) ? (frame.mode as LinkMode) : 'idle';
      console.log('[link] peer state:', mode); // 只打枚举，不打曲名等内容
      peerState = {
        mode,
        action: typeof frame.action === 'string' ? frame.action : undefined,
        song: typeof frame.song === 'string' ? frame.song.slice(0, 80) : undefined,
      };
      pushToRemote('link:peerState', peerState);
      break;
    }
    case 'bye':
      // 对端主动退出：立即收走远端窗，自己留在房里等新的加入没有意义 → 回 waiting
      console.log('[link] peer bye');
      peerHello = null;
      peerState = null;
      closeRemotePetWindow();
      setStatus({ phase: 'waiting', roomCode: status.roomCode });
      break;
  }
}

function handlePeerLeave(): void {
  console.log('[link] peer left (grace 30s)');
  pushToRemote('link:peerLeft', undefined);
  setStatus({ phase: 'waiting', roomCode: status.roomCode });
  if (peerGoneTimer) clearTimeout(peerGoneTimer);
  peerGoneTimer = setTimeout(() => {
    peerGoneTimer = null;
    closeRemotePetWindow();
  }, PEER_GONE_CLOSE_MS);
}

// ── 远端宠窗 ────────────────────────────────────────────────

function pushToRemote(channel: string, payload: unknown): void {
  const win = getRemotePetWindow();
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function openRemoteWindow(): void {
  const win = createRemotePetWindow();
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', replayPeerCache);
  } else {
    replayPeerCache(); // 重配对时窗还开着：直接补发
  }
}

function replayPeerCache(): void {
  if (peerHello) pushToRemote('link:peerHello', peerHello);
  if (peerState) pushToRemote('link:peerState', peerState);
}

// ── 本地状态出帧 ────────────────────────────────────────────

/** agent-server.broadcastIfChanged 的联机钩子（未联机时只记账） */
export function pushLocalAgentActivity(activity: AgentActivity): void {
  localActivity = activity;
  void sendState(false);
}

/** music-monitor.updateStatus 的联机钩子（未联机时只记账） */
export function pushLocalMusic(next: MusicStatus): void {
  localMusic = next;
  void sendState(false);
}

async function composeState(): Promise<LinkPeerState> {
  const mode: LinkMode =
    localActivity !== 'idle' ? localActivity : localMusic.playing ? 'music' : 'idle';
  const state: LinkPeerState = { mode };
  if (mode === 'music' && localMusic.title) {
    const { linkShareSong } = await getSettings();
    if (linkShareSong) {
      state.song = `${localMusic.title}${localMusic.artist ? ` - ${localMusic.artist}` : ''}`;
    }
  }
  return state;
}

async function sendState(force: boolean): Promise<void> {
  if (!transport || status.phase !== 'paired') return;
  const state = await composeState();
  const snapshot = JSON.stringify(state);
  if (!force && snapshot === lastSent) return;
  lastSent = snapshot;
  transport.send({ t: 'state', ...state });
}

async function sendHello(): Promise<void> {
  if (!transport) return;
  const { activeCharacter } = await getSettings();
  const meta = activeCharacter ? await getCharacter(activeCharacter) : null;
  transport.send({ t: 'hello', charName: meta?.manifest?.name || 'QBot' });
}
