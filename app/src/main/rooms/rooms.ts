/**
 * 公共房间链路（spec 2026-08-21）：连 rooms 服务、开/加/退房、出在场帧、收广播 → 转 renderer。
 *
 * 与 `link/link.ts` 的关系：**两条独立链路，互不影响，可同时在线**。
 * link 是 1v1 好友替身窗（relay 盲转，零状态）；这条是多人房间（rooms 服务，解析+落盘）。
 *
 * 隐私边界（spec §5.3）：出本机的只有——状态枚举、动作名、用户手打的聊天文字、昵称、缩略图。
 * 气泡正文 / last_assistant_message / transcript / cwd / persona **绝不进这个模块**；
 * 曲名也不发（1v1 有开关是因为对端是好友，公共房间对象是陌生人，不给这个开关）。
 */
import { getSettings, setSettings } from '../config';
import type {
  AgentActivity,
  CreateRoomInput,
  RoomBrief,
  RoomChatMsg,
  RoomKind,
  RoomMember,
  RoomSnapshot,
  RoomsStatus,
} from '../../shared/ipc-types';
import {
  PROTO_VER,
  buildChatFrame,
  buildPresenceFrame,
  clampText,
  errorText,
  normalizeCreateInput,
  NICK_MAX,
} from './rooms-rules';

/**
 * 房间服务地址，**按顺序尝试**：域名 wss 为主，IP 明文为兜底。
 *
 * 为什么要兜底：域名 + 证书是单点，一挂房间功能就整体不可用（证书有到期日，
 * DNS 也可能出问题）。所以主路连不上时自动降级到 IP 直连。
 *
 * 代价说清楚：兜底路是**明文**，聊天正文会裸奔过公网。所以
 * `isSecureTransport()` 在降级后返回 false，入房弹窗会自动补上「当前未加密」
 * ——用户看到的提示永远跟实际链路一致，不会出现「以为加密其实没有」。
 *
 * `QBOT_ROOMS_URL` 指定时只用它、不做回退（开发调试要的是确定性）。
 */
const ROOMS_URL_CHAIN = [
  'wss://albertbeta.cn/rooms',
  'ws://14.103.59.73:24252',
] as const;
const CONNECT_TIMEOUT_MS = 8_000;
const REQUEST_TIMEOUT_MS = 8_000;
/** 在场心跳：on-change 之外的兜底重发（同 link 的 15s 心跳思路，房间人多所以放宽到 30s） */
const PRESENCE_HEARTBEAT_MS = 30_000;
const WS_OPEN = 1;

/** Node ≥22 内置全局 WebSocket；@types/node 旧版缺声明 → 本地补最小类型（同 relay-ws.ts） */
interface WsLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: string, listener: (ev: { data?: unknown }) => void): void;
}
const WebSocketCtor = (globalThis as Record<string, unknown>).WebSocket as
  | (new (url: string) => WsLike)
  | undefined;

interface Frame {
  t: string;
  [k: string]: unknown;
}

let ws: WsLike | null = null;
let status: RoomsStatus = { phase: 'off' };
let statusListener: (() => void) | null = null;
/** renderer 推送口（lounge 窗；主进程不直接持有窗口引用，由 index.ts 注入） */
let pushToLounge: ((channel: string, payload: unknown) => void) | null = null;

let memberId: string | null = null;
let currentRoomId: string | null = null;
/** 房内聊天缓存：lounge 窗重开时补发，不必重新进房 */
let chatCache: RoomChatMsg[] = [];
let roomCache: RoomSnapshot | null = null;

let localActivity: AgentActivity = 'idle';
let lastPresence: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let closedByUs = false;
/** 实际连上的地址（决定 isSecureTransport 的答案；未连接时为 null） */
let activeUrl: string | null = null;

/** 在飞的请求（一次一个类型；create/join/list 各自等自己的应答帧） */
const pending = new Map<
  string,
  { resolve: (f: Frame) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
>();

export function setRoomsStatusListener(cb: () => void): void {
  statusListener = cb;
}

export function setLoungePush(fn: (channel: string, payload: unknown) => void): void {
  pushToLounge = fn;
}

export function getRoomsStatus(): RoomsStatus {
  return status;
}

/**
 * 当前链路是否加密（wss）。渲染端据此决定入房明示要不要加「传输未加密」那句——
 * 与其含糊带过，不如把实情写在用户点「知道了」之前（spec §8.5）。
 *
 * 判断依据是**实际连上的地址**而不是候选表首项：降级到 IP 明文时必须如实说不加密。
 * 还没连上时保守报 false——宁可多提示一次，也不能让用户以为加密了其实没有。
 */
export function isSecureTransport(): boolean {
  return activeUrl !== null && activeUrl.startsWith('wss://');
}

function setStatus(next: RoomsStatus): void {
  status = next;
  statusListener?.();
  push('rooms:status', status);
}

function push(channel: string, payload: unknown): void {
  pushToLounge?.(channel, payload);
}

// ── 连接 ───────────────────────────────────────────────────

/** 候选地址表：显式指定则只用它，否则走主路→兜底链 */
function candidates(): readonly string[] {
  const override = process.env.QBOT_ROOMS_URL;
  return override ? [override] : ROOMS_URL_CHAIN;
}

/** 当前生效地址（连上过才有意义；没连上时取第一个候选用于展示） */
function url(): string {
  return activeUrl ?? candidates()[0];
}

async function connect(): Promise<WsLike> {
  if (ws && ws.readyState === WS_OPEN) return ws;
  if (!WebSocketCtor) throw new Error('WebSocket unavailable (need Electron with Node >= 22)');
  closedByUs = false;
  setStatus({ phase: 'connecting' });

  // 依次试候选地址：主路（域名 wss）连不上就降级到兜底（IP 明文）
  const errors: string[] = [];
  for (const candidate of candidates()) {
    try {
      const socket = await open(candidate);
      ws = socket;
      activeUrl = candidate;
      await hello();
      return socket;
    } catch (err) {
      errors.push(`${candidate}: ${err instanceof Error ? err.message : String(err)}`);
      // 半开的连接要收掉，否则它稍后 onclose 会污染下一次尝试的状态
      if (ws) { const stale = ws; ws = null; activeUrl = null; try { stale.close(); } catch { /* 已经死了 */ } }
    }
  }
  activeUrl = null;
  setStatus({ phase: 'off', error: '房间服务连不上' });
  // 详细原因只进日志（含地址），给用户的是一句人话
  console.error('[rooms] all candidates failed:', errors.join(' | '));
  throw new Error('房间服务连不上');
}

/** 连单个地址（不做 hello，不改全局状态——失败时调用方好干净地换下一个） */
function open(target: string): Promise<WsLike> {
  return new Promise<WsLike>((resolve, reject) => {
    const s = new WebSocketCtor!(target);
    let settled = false;
    const done = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      done(() => {
        try { s.close(); } catch { /* noop */ }
        reject(new Error('连接超时'));
      });
    }, CONNECT_TIMEOUT_MS);
    s.addEventListener('open', () => done(() => resolve(s)));
    s.addEventListener('error', () => done(() => reject(new Error('连接失败'))));
    s.addEventListener('message', (ev) => handleMessage(ev.data));
    s.addEventListener('close', () => {
      // 连上之后才断：走正常的掉线处理（连接期的失败已被上面 reject 掉）
      if (settled && ws === s) handleClosed();
    });
  });
}

function handleClosed(): void {
  ws = null;
  activeUrl = null;
  currentRoomId = null;
  roomCache = null;
  stopHeartbeat();
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.reject(new Error('连接已断开'));
  }
  pending.clear();
  // 主动断开是正常收场；被动断开要让 UI 看到原因
  setStatus(closedByUs ? { phase: 'off' } : { phase: 'off', error: '与房间服务的连接断开了' });
}

async function hello(): Promise<void> {
  const settings = await getSettings();
  const nickname =
    clampText(settings.nickname ?? settings.marketNickname, NICK_MAX) || '匿名';
  const ack = await request(
    { t: 'hello', protoVer: PROTO_VER, nickname, memberId: settings.roomsMemberId },
    'hello:ack',
  );
  memberId = String(ack.memberId ?? '');
  // 服务端分配的 memberId 存本地复用（零账号体系：下次连上还是同一个人）
  if (memberId && memberId !== settings.roomsMemberId) {
    await setSettings({ roomsMemberId: memberId });
  }
  setStatus({ phase: 'online', memberId });
}

/** 发一帧并等指定类型的应答（error 帧一律 reject） */
function request(frame: Frame, expect: string): Promise<Frame> {
  return new Promise<Frame>((resolve, reject) => {
    if (!ws || ws.readyState !== WS_OPEN) {
      reject(new Error('房间服务未连接'));
      return;
    }
    const timer = setTimeout(() => {
      pending.delete(expect);
      reject(new Error('房间服务无响应'));
    }, REQUEST_TIMEOUT_MS);
    pending.set(expect, { resolve, reject, timer });
    ws.send(JSON.stringify(frame));
  });
}

function send(frame: Frame): void {
  if (ws && ws.readyState === WS_OPEN) ws.send(JSON.stringify(frame));
}

function settle(type: string, frame: Frame, err?: Error): void {
  const p = pending.get(type);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(type);
  if (err) p.reject(err);
  else p.resolve(frame);
}

// ── 收帧 ───────────────────────────────────────────────────

function handleMessage(data: unknown): void {
  let frame: Frame;
  try {
    frame = JSON.parse(String(data)) as Frame;
  } catch {
    return; // 非 JSON 帧直接丢
  }
  switch (frame.t) {
    // ── 请求应答 ──
    case 'hello:ack':
    case 'rooms':
    case 'room':
    case 'joined':
      if (frame.t === 'joined') applyJoined(frame);
      settle(frame.t, frame);
      break;

    case 'error': {
      const code = String(frame.code ?? 'unknown');
      // 应答类错误：转给在等的那个请求（谁在等就给谁）
      const waiting = [...pending.keys()][0];
      if (waiting) {
        settle(waiting, frame, new Error(errorText(code)));
      } else {
        push('rooms:error', errorText(code)); // 无人等待的错误（如发言被限流）
      }
      break;
    }

    // ── 房内广播 ──
    case 'member:in': {
      const member = frame.member as RoomMember | undefined;
      if (member && roomCache && frame.roomId === currentRoomId) {
        const i = roomCache.members.findIndex((m) => m.memberId === member.memberId);
        if (i >= 0) roomCache.members[i] = member;
        else roomCache.members.push(member);
      }
      push('rooms:memberIn', member);
      break;
    }

    case 'member:out': {
      const id = String(frame.memberId ?? '');
      if (roomCache && frame.roomId === currentRoomId) {
        const m = roomCache.members.find((x) => x.memberId === id);
        if (m) { m.online = false; m.mode = undefined; m.action = undefined; }
      }
      push('rooms:memberOut', id);
      break;
    }

    case 'presence': {
      const payload = {
        memberId: String(frame.memberId ?? ''),
        mode: frame.mode,
        action: frame.action,
      };
      if (roomCache && frame.roomId === currentRoomId) {
        const m = roomCache.members.find((x) => x.memberId === payload.memberId);
        if (m) {
          m.online = true;
          m.mode = payload.mode as RoomMember['mode'];
          m.action = payload.action as string | undefined;
        }
      }
      // 只打枚举不打内容（同 link.ts 的日志纪律）
      push('rooms:presence', payload);
      break;
    }

    case 'chat': {
      const msg = frame.msg as RoomChatMsg | undefined;
      if (!msg) break;
      chatCache = [...chatCache, msg].slice(-50);
      push('rooms:chat', msg);
      break;
    }

    case 'chat:deleted': {
      const id = String(frame.id ?? '');
      chatCache = chatCache.filter((c) => c.id !== id);
      push('rooms:chatDeleted', id);
      break;
    }

    case 'wave':
      push('rooms:wave', {
        fromMemberId: String(frame.fromMemberId ?? ''),
        fromNickname: String(frame.fromNickname ?? '好友'),
      });
      break;

    case 'room:updated': {
      const room = frame.room as RoomSnapshot | undefined;
      if (room && room.roomId === currentRoomId) {
        roomCache = room;
        setStatus({ phase: 'in-room', memberId: memberId ?? undefined, room });
      }
      break;
    }

    case 'kicked':
      currentRoomId = null;
      roomCache = null;
      chatCache = [];
      stopHeartbeat();
      setStatus({ phase: 'online', memberId: memberId ?? undefined });
      push('rooms:kicked', undefined);
      break;
  }
}

function applyJoined(frame: Frame): void {
  const room = frame.room as RoomSnapshot | undefined;
  if (!room) return;
  currentRoomId = room.roomId;
  roomCache = room;
  chatCache = Array.isArray(frame.chat) ? (frame.chat as RoomChatMsg[]) : [];
  setStatus({ phase: 'in-room', memberId: memberId ?? undefined, room });
  // 进房历史必须**推**给渲染端：渲染端只订阅增量 chat，光靠它攒不出历史，
  // 换房时也会把上一间房的记录留在屏幕上（截图实测到过）
  push('rooms:history', chatCache);
  startHeartbeat();
  void sendPresence(true);
}

// ── 在场出帧 ───────────────────────────────────────────────

function startHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => void sendPresence(true), PRESENCE_HEARTBEAT_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  lastPresence = null;
}

/**
 * 出在场帧。**只发状态枚举 + 动作名**——不发曲名（陌生人场景不给这个开关，
 * 与 1v1 的 linkShareSong 是有意的区别，spec §5.3）。
 */
async function sendPresence(force: boolean): Promise<void> {
  if (!currentRoomId || !ws || ws.readyState !== WS_OPEN) return;
  // 经白名单函数出帧：能出本机的字段由 buildPresenceFrame 一处说了算（有测试守着）
  const frame = buildPresenceFrame({ activity: localActivity });
  const snapshot = JSON.stringify(frame);
  if (!force && snapshot === lastPresence) return;
  lastPresence = snapshot;
  send(frame);
}

/** agent-server.broadcastIfChanged 的房间钩子（不在房时只记账） */
export function pushLocalAgentActivity(activity: AgentActivity): void {
  localActivity = activity;
  void sendPresence(false);
}

// ── 公开 API（IPC 入口）────────────────────────────────────

/** 拉房间列表（未连接则先连）。kind/q 交服务端筛一道，客户端还会本地再筛 */
export async function listRooms(kind?: RoomKind, q?: string): Promise<RoomBrief[]> {
  await connect();
  const frame = await request({ t: 'list', kind, q }, 'rooms');
  return Array.isArray(frame.rooms) ? (frame.rooms as RoomBrief[]) : [];
}

/** 开房：成功后把房主管理码存本地（改设置/踢人要用），并自动进房 */
export async function createRoom(input: CreateRoomInput): Promise<string> {
  const normalized = normalizeCreateInput(input);
  if (!normalized) throw new Error('房间名不能为空');
  await connect();
  const frame = await request({ t: 'create', ...normalized }, 'room');
  const roomId = String(frame.roomId ?? '');
  const ownerToken = String(frame.ownerToken ?? '');
  if (!roomId) throw new Error('开房失败');
  const settings = await getSettings();
  await setSettings({
    roomsOwnerTokens: { ...settings.roomsOwnerTokens, [roomId]: ownerToken },
  });
  await joinRoom(roomId);
  return roomId;
}

export async function joinRoom(roomId: string): Promise<RoomSnapshot> {
  await connect();
  const frame = await request({ t: 'join', roomId: roomId.trim().toUpperCase() }, 'joined');
  return frame.room as RoomSnapshot;
}

export function leaveRoom(): void {
  if (!currentRoomId) return;
  send({ t: 'leave', roomId: currentRoomId });
  currentRoomId = null;
  roomCache = null;
  chatCache = [];
  stopHeartbeat();
  setStatus({ phase: 'online', memberId: memberId ?? undefined });
}

/**
 * 发言。**这是用户手打文字的唯一出口**——任何 agent 内容
 * （气泡正文/last_assistant_message/transcript/cwd/persona）都不许从这里走，
 * 也不许有「一键分享结论到房间」这类便利入口（spec §5.3，有测试守着）。
 */
export function sendChat(text: string): void {
  if (!currentRoomId) return;
  const frame = buildChatFrame(text);
  if (frame) send(frame);
}

export function deleteChat(id: string): void {
  if (!currentRoomId) return;
  send({ t: 'chat:delete', id });
}

/**
 * 举报一条发言。服务端只记计数 + 快照，**不做自动判定**——
 * 自部署服务没有审核能力，误伤的代价比漏判高（spec §5.3）。
 */
export function reportChat(id: string): void {
  if (!currentRoomId) return;
  send({ t: 'report', id });
}

export function waveAt(targetMemberId: string): void {
  if (!currentRoomId) return;
  send({ t: 'wave', targetMemberId });
}

/** 改房间设置（房主，token 从本地取） */
export async function updateRoom(patch: {
  name?: string;
  kind?: RoomKind;
  listed?: boolean;
}): Promise<void> {
  if (!currentRoomId) throw new Error('不在房间里');
  const settings = await getSettings();
  const token = settings.roomsOwnerTokens?.[currentRoomId];
  if (!token) throw new Error('没有这个房间的管理码（不是你开的房？）');
  send({ t: 'room:update', ...patch, token });
}

export async function kickMember(targetMemberId: string): Promise<void> {
  if (!currentRoomId) throw new Error('不在房间里');
  const settings = await getSettings();
  const token = settings.roomsOwnerTokens?.[currentRoomId];
  if (!token) throw new Error('没有这个房间的管理码（不是你开的房？）');
  send({ t: 'room:kick', memberId: targetMemberId, token });
}

/** 收藏切换（纯本地，服务端不知道谁收藏了什么） */
export async function toggleFavorite(roomId: string): Promise<string[]> {
  const settings = await getSettings();
  const favorites = new Set(settings.roomsFavorites ?? []);
  if (favorites.has(roomId)) favorites.delete(roomId);
  else favorites.add(roomId);
  const next = [...favorites];
  await setSettings({ roomsFavorites: next });
  return next;
}

/**
 * lounge 窗启动自取快照：窗口 did-finish-load 可能早于渲染端注册监听
 * （与 pet/remote 窗同款竞态，见 link.ts 的 getPeerCache 注释）→ 渲染端主动拉一次
 */
export function getRoomsCache(): {
  status: RoomsStatus;
  room: RoomSnapshot | null;
  chat: RoomChatMsg[];
} {
  return { status, room: roomCache, chat: chatCache };
}

/** 主动断开（关 lounge 窗不断开——房间是常驻的，用户可能只是收起窗口） */
export function disconnectRooms(): void {
  closedByUs = true;
  leaveRoom();
  ws?.close();
  ws = null;
  stopHeartbeat();
  setStatus({ phase: 'off' });
}
