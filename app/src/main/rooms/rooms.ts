/**
 * 公共房间链路（spec 2026-08-21）：连 rooms 服务、开/加/退房、出在场帧、收广播 → 转 renderer。
 *
 * 原 1v1 联机（link/link.ts + relay）已于 2026-08-24 退役，公共房间是唯一的联机链路；
 * 好友配对场景由私密房（凭 roomId 进、不上架）顶替。
 *
 * 隐私边界（spec §5.3）：出本机的只有——状态枚举、动作名、用户手打的聊天文字、昵称、缩略图。
 * 气泡正文 / last_assistant_message / transcript / cwd / persona **绝不进这个模块**；
 * 曲名也不发（房间对象是陌生人，不给「分享曲名」这个开关）。
 *
 * 角色包分发（2026-08-24 上屏）卸载到 room-pets.ts：包状态机/缓存/网络应答全在那边，
 * 这里只做帧路由。
 */
import { getSettings, setSettings } from '../config';
import type {
  AgentActivity,
  CreateRoomInput,
  MusicStatus,
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
import * as RoomPets from './room-pets';
import { ROOMS } from '../../shared/config';
import { withTimeout, withRetry } from '../../shared/timeout';

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
// 已在shared/config.ts中定义，保留注释用于参考
// const ROOMS_URL_CHAIN = ['wss://albertbeta.cn/rooms', 'ws://14.103.59.73:24252'] as const;
// const CONNECT_TIMEOUT_MS = 8_000;
// const REQUEST_TIMEOUT_MS = 8_000;
// const PRESENCE_HEARTBEAT_MS = 15_000;
const WS_OPEN = 1;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 30000;
let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/** Node ≥22 内置全局 WebSocket；@types/node 旧版缺声明 → 本地补最小类型 */
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
let localMusic: MusicStatus = { playing: false };
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
  return override ? [override] : ROOMS.URL_CHAIN;
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
      // 重置重试延迟
      reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
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
    }, ROOMS.CONNECT_TIMEOUT_MS);
    s.addEventListener('open', () => done(() => resolve(s)));
    s.addEventListener('error', () => done(() => reject(new Error('连接失败'))));
    s.addEventListener('message', (ev) => handleMessage(ev.data));
    s.addEventListener('close', () => {
      // 连上之后才断：走正常的掉线处理（连接期的失败已被上面 reject 掉）
      if (settled && ws === s) handleClosed();
    });
    // 新增：pong监听器，检测心跳超时
    let lastPongTime = Date.now();
    s.addEventListener('pong', () => {
      lastPongTime = Date.now();
    });
    (s as any).lastPongTime = lastPongTime;
  });
}

function handleClosed(): void {
  ws = null;
  activeUrl = null;
  currentRoomId = null;
  roomCache = null;
  stopHeartbeat();
  RoomPets.onLeftRoom(); // 连接掉了：宠上屏跟着收场
  // 清理所有pending请求
  const pendingCopy = new Map(pending);
  pending.clear();
  for (const [, p] of pendingCopy) {
    clearTimeout(p.timer);
    p.reject(new Error('连接已断开'));
  }
  // 主动断开是正常收场；被动断开要让 UI 看到原因
  setStatus(closedByUs ? { phase: 'off' } : { phase: 'off', error: '与房间服务的连接断开了' });

  // 自动重连：如果不是主动关闭，尝试重新连接
  if (!closedByUs && status.phase !== 'off') {
    const delay = reconnectDelay;
    reconnectTimer = setTimeout(() => {
      if (ws === null && !closedByUs) {
        connect().catch(() => {});
        // 更新重试延迟，指数退避
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
      }
    }, delay);
  }
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
const MAX_REQUEST_RETRIES = 3;
function request(frame: Frame, expect: string, retries = 0): Promise<Frame> {
  return new Promise<Frame>((resolve, reject) => {
    if (!ws || ws.readyState !== WS_OPEN) {
      if (retries < MAX_REQUEST_RETRIES) {
        // 延迟后重试，指数退避
        setTimeout(() => {
          resolve(request(frame, expect, retries + 1));
        }, 1000 * retries);
        return;
      }
      reject(new Error('房间服务未连接'));
      return;
    }
    const timer = setTimeout(() => {
      pending.delete(expect);
      if (retries < MAX_REQUEST_RETRIES) {
        // 重试请求
        resolve(request(frame, expect, retries + 1));
      } else {
        reject(new Error('房间服务无响应'));
      }
    }, ROOMS.REQUEST_TIMEOUT_MS);
    pending.set(expect, { resolve, reject, timer });
    ws.send(JSON.stringify(frame));
  });
}

function send(frame: Frame): void {
  if (ws && ws.readyState === WS_OPEN) ws.send(JSON.stringify(frame));
}

// room-pets 不持连接（避免循环 import），出帧借这个口子；注入一次即可，
// send() 内部自己判连接状态，room-pets 调用时连接可能已断也没事（静默丢）
RoomPets.setRoomsSend(send);

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
  } catch (err) {
    console.debug('rooms: 收到非JSON消息', data);
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
      // pack:* 错误是 room-pets 的 fire-and-forget 帧引起的，从不进 pending 表，
      // 必须先分流掉——否则会被下面「谁在等就给谁」误接到一个不相关的请求上
      // （比如用户正在拉房间列表，此时房友包传输失败，list 的 promise 不该被牵连）
      if (code.startsWith('pack:')) {
        RoomPets.handlePackError(code);
        break;
      }
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
      if (member) RoomPets.onMemberIn(member);
      push('rooms:memberIn', member);
      break;
    }

    case 'member:out': {
      const id = String(frame.memberId ?? '');
      if (roomCache && frame.roomId === currentRoomId) {
        const m = roomCache.members.find((x) => x.memberId === id);
        if (m) { m.online = false; m.mode = undefined; m.action = undefined; }
      }
      RoomPets.onMemberOut(id);
      push('rooms:memberOut', id);
      break;
    }

    case 'member:pack': {
      const id = String(frame.memberId ?? '');
      const hash = String(frame.packHash ?? '');
      const nickname = roomCache?.members.find((m) => m.memberId === id)?.nickname ?? '房友';
      if (roomCache && frame.roomId === currentRoomId) {
        const m = roomCache.members.find((x) => x.memberId === id);
        if (m) m.packHash = hash;
      }
      if (hash) RoomPets.onMemberPack(id, nickname, hash);
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
      RoomPets.onPresence(payload.memberId, payload.mode as string | undefined, payload.action as string | undefined);
      // 只打枚举不打内容（同 link.ts 的日志纪律）
      push('rooms:presence', payload);
      break;
    }

    case 'chat': {
      const msg = frame.msg as RoomChatMsg | undefined;
      if (!msg) break;
      chatCache = [...chatCache, msg].slice(-50);
      RoomPets.onChat(msg.memberId, msg.nickname, msg.text);
      push('rooms:chat', msg);
      break;
    }

    // ── 角色包分发应答（转给 room-pets 的状态机）──
    case 'pack:have:ack':
    case 'pack:put:ok':
    case 'pack:begin':
    case 'pack:chunk':
      RoomPets.handlePackFrame(frame);
      break;

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
      RoomPets.onLeftRoom();
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
  RoomPets.onJoinedRoom(room, memberId);
}

// ── 在场出帧 ───────────────────────────────────────────────

function startHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (!ws) return;
    // 检查最后一次pong的时间
    const socket = ws as any;
    const lastPong = socket.lastPongTime ?? 0;
    if (Date.now() - lastPong > HEARTBEAT_TIMEOUT_MS) {
      // 心跳超时，关闭连接触发重连
      console.error('[rooms] 心跳超时，关闭连接');
      socket.close();
      return;
    }
    // 发送ping等待pong
    if (typeof (ws as any).ping === 'function') {
      (ws as any).ping();
    }
    void sendPresence(true);
  }, ROOMS.PRESENCE_HEARTBEAT_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  lastPresence = null;
}

/**
 * 出在场帧。**只发状态枚举 + 动作名**——不发曲名（对象是陌生人，spec §5.3）。
 * 模式合成：agent 活动优先，其次音乐态，再退 idle（借状态机优先级，同 1v1 老链路）。
 */
async function sendPresence(force: boolean): Promise<void> {
  if (!currentRoomId || !ws || ws.readyState !== WS_OPEN) return;
  const mode: string = localActivity !== 'idle' ? localActivity : localMusic.playing ? 'music' : 'idle';
  // 经白名单函数出帧：能出本机的字段由 buildPresenceFrame 一处说了算（有测试守着）
  const frame = buildPresenceFrame({ activity: mode });
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

/** music-monitor.updateStatus 的房间钩子（不在房时只记账；只出枚举不带曲名） */
export function pushLocalMusic(next: MusicStatus): void {
  localMusic = next;
  void sendPresence(false);
}

// ── 公开 API（IPC 入口）────────────────────────────────────

/** 拉房间列表（未连接则先连）。kind/q 交服务端筛一道，客户端还会本地再筛 */
export async function listRooms(kind?: RoomKind, q?: string): Promise<RoomBrief[]> {
  await connect();
  return withRetry(async () => {
    const frame = await request({ t: 'list', kind, q }, 'rooms');
    return Array.isArray(frame.rooms) ? (frame.rooms as RoomBrief[]) : [];
  }, 3, 1000);
}

/** 开房：成功后把房主管理码存本地（改设置/踢人要用），并自动进房 */
export async function createRoom(input: CreateRoomInput): Promise<string> {
  const normalized = normalizeCreateInput(input);
  if (!normalized) throw new Error('房间名不能为空');
  await connect();
  return withRetry(async () => {
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
  }, 3, 1000);
}

export async function joinRoom(roomId: string): Promise<RoomSnapshot> {
  await connect();
  return withRetry(async () => {
    const frame = await request({ t: 'join', roomId: roomId.trim().toUpperCase() }, 'joined');
    return frame.room as RoomSnapshot;
  }, 3, 1000);
}

export function leaveRoom(): void {
  if (!currentRoomId) return;
  send({ t: 'leave', roomId: currentRoomId });
  currentRoomId = null;
  roomCache = null;
  chatCache = [];
  stopHeartbeat();
  RoomPets.onLeftRoom();
  setStatus({ phase: 'online', memberId: memberId ?? undefined });
}

/** 角色切换钩子（IPC/托盘的激活入口调用）：在房就把新形象重新报给房友 */
export function notifyRoomCharacterChanged(): void {
  RoomPets.notifyRoomCharacterChanged();
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

  // 关闭WebSocket连接
  if (ws) {
    ws.close();
    ws = null;
  }

  stopHeartbeat();
  // 清除重连定时器
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  // 重置重试延迟
  reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

  // 清空所有pending请求
  const pendingCopy = new Map(pending);
  pending.clear();
  for (const [, p] of pendingCopy) {
    clearTimeout(p.timer);
  }

  setStatus({ phase: 'off' });
}
