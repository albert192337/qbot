/**
 * 公共房间链路（spec 2026-08-21）：连 rooms 服务、开/加/退房、出在场帧、收广播 → 转 renderer。
 *
 * 原 1v1 联机（link/link.ts + relay）已于 2026-08-24 退役，公共房间是唯一的联机链路；
 * 好友配对场景由私密房（凭 roomId 进、不上架）顶替。
 *
 * 隐私边界（spec §5.3）：出本机的只有——状态枚举、动作名、桌宠当前实际显示的牌面文字、
 * 用户手打的聊天文字、昵称、缩略图。牌面可能包含手动文字、完成提示、会议状态、曲名/歌手；
 * 没显示在牌面上的气泡正文 / last_assistant_message / transcript / cwd / persona **绝不进这个模块**。
 *
 * 角色包分发（2026-08-24 上屏）卸载到 room-pets.ts：包状态机/缓存/网络应答全在那边，
 * 这里只做帧路由。
 */
import { getSettings, setSettings } from '../config';
import type {
  AgentActivity,
  CreateRoomInput,
  MeetingStatus,
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
import { getCharacter } from '../characters';
import { pairActions } from '../../shared/pair-interaction';
import { listTestGuests } from './test-guests';
import { readContactCache, saveContactCache } from './contact-cache';
import type { ContactSnapshot, ContactAction } from '../../shared/social';
import type { TestGuest } from '../../shared/social';

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
const MAX_CONNECT_RETRIES_BEFORE_JITTER = 3; // 连续3次失败后才启用抖动重连
let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectFailCount = 0; // 连接失败计数器

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
let localMeeting: MeetingStatus = { inMeeting: false };
let localMusic: MusicStatus = { playing: false };
let localSign: string | null = null;
let lastPresence: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let closedByUs = false;
let socialSupported = false;
let contactsSupported = false;
let contactSnapshot: ContactSnapshot = {available:false, reason:'点击刷新连接朋友列表', people:[], invitations:[]};
let worldCache: RoomChatMsg[] = [];
let worldSubscribed = false;
let connectPromise: Promise<WsLike> | null = null;
let requestSequence = 0;
let connectionGeneration = 0;
/**
 * 最近一次收到服务端任何帧的时间。心跳超时的判定依据：
 * Node 内置全局 WebSocket 是 undici 的 WHATWG 实现，**没有 `.ping()` 方法、
 * 也不派发 `pong` 事件**（协议层 ping/pong 在内部自动处理，对 JS 不可见），
 * 所以「靠 pong 回调续命」的方案在这个 API 上是死路--lastPongTime 永远停在
 * 连接建立那一刻，进房 30s 后必然误判超时把自己掐了（复现见 2026-08-30）。
 * 改成应用层心跳：主动发 {t:'ping'}，收到任何帧（pong/错误帧/广播）都续命。
 */
let lastAliveAt = 0;
/** 实际连上的地址（决定 isSecureTransport 的答案；未连接时为 null） */
let activeUrl: string | null = null;

/** Requests are correlated by ID; a legacy peer permits one request per response type. */
const pending = new Map<
  string,
  { expect: string; resolve: (f: Frame) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
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
  status = { ...next, socialReady: socialSupported || !!next.room?.testing };
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

// 快速重连模式：跳过指数退避，直接尝试重连
let fastReconnectMode = false;

async function connect(useFastReconnect = false): Promise<WsLike> {
  if (connectPromise) return connectPromise;
  connectPromise = connectOnce(useFastReconnect);
  try { return await connectPromise; } finally { connectPromise = null; }
}
async function connectOnce(useFastReconnect = false): Promise<WsLike> {
  if (ws && ws.readyState === WS_OPEN) return ws;
  if (!WebSocketCtor) throw new Error('WebSocket unavailable (need Electron with Node >= 22)');
  closedByUs = false;
  const generation = connectionGeneration;
  setStatus({ phase: 'connecting' });

  // 连接失败计数，用于抖动缓冲
  connectFailCount++;

  // 仅在连续失败超过阈值后才启用指数退避
  const delay = useFastReconnect || connectFailCount < MAX_CONNECT_RETRIES_BEFORE_JITTER
    ? 0
    : reconnectDelay;

  // 如果需要延迟，等待后再尝试
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
    // 更新重试延迟，指数退避
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
  }

  // 依次试候选地址：主路（域名 wss）连不上就降级到兜底（IP 明文）
  const errors: string[] = [];
  for (const candidate of candidates()) {
    try {
      if (generation !== connectionGeneration) throw new Error('连接已取消');
      const socket = await open(candidate);
      if (generation !== connectionGeneration) { socket.close(); throw new Error('连接已取消'); }
      ws = socket;
      activeUrl = candidate;
      await hello(generation);
      // 连接成功，重置状态
      connectFailCount = 0;
      reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      // 连接成功后发送队列中的消息
      startHeartbeat();
      return socket;
    } catch (err) {
      if (generation !== connectionGeneration) throw new Error('连接已取消');
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
    s.addEventListener('message', (ev) => {
      if (ws !== s) return; // A superseded connection cannot mutate the current room.
      // 任何入帧都证明链路活着（pong / 聊天 / 在场广播一视同仁），
      // 心跳超时判定吃的就是这个时间戳
      lastAliveAt = Date.now();
      handleMessage(ev.data);
    });
    s.addEventListener('close', () => {
      // 连上之后才断：走正常的掉线处理（连接期的失败已被上面 reject 掉）
      if (settled && ws === s) handleClosed();
    });
  });
}

function handleClosed(): void {
  // 被动掉线前在的房：重连成功后自动回房（心跳误杀/网络抖动对用户表现为无感）
  const droppedRoomId = currentRoomId;
  ws = null;
  activeUrl = null;
  currentRoomId = null;
  roomCache = null;
  chatCache = [];
  worldCache = [];
  worldSubscribed = false;
  socialSupported = false;
  contactsSupported = false;
  contactSnapshot = {...contactSnapshot, available:false, reason:'连接已断开，显示上次记录', invitations:[], people:contactSnapshot.people.map(p=>({...p,online:false}))};
  push('social:contacts', contactSnapshot);
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

  // 被动断开才重连（注意：不能拿 status.phase 判断--上面 setStatus 刚把它设成 'off'，
  // 旧代码就是栽在这：重连条件永远不成立，掉线后只能等用户手动再操作）
  if (!closedByUs) scheduleReconnect(droppedRoomId);
}

/**
 * 掉线重连 + 自动回房。指数退避（上限 30s），失败按上限间隔一直重试，
 * 直到用户主动断开（disconnectRooms 会清 reconnectTimer）。
 */
function scheduleReconnect(roomId: string | null): void {
  if (reconnectTimer) return;
  const delay = reconnectDelay;
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (ws !== null || closedByUs) return;
    try {
      await connect();
    } catch {
      scheduleReconnect(roomId);
      return;
    }
    if (roomId) {
      try {
        // joined 帧会重建房间缓存/聊天历史/心跳/宠上屏（applyJoined 全套）
        await joinRoom(roomId);
      } catch {
        // 房间回不去了（被删/满员/被踢）：保持在线，不再回试
        console.error('[rooms] 重连后回房失败，留在已连接状态');
      }
    }
  }, delay);
}

async function hello(generation: number): Promise<void> {
  const settings = await getSettings();
  if (generation !== connectionGeneration) throw new Error('连接已取消');
  const nickname =
    clampText(settings.nickname ?? settings.marketNickname, NICK_MAX) || '匿名';
  const identity = readContactCache(activeUrl!);
  const character = settings.activeCharacter ? await getCharacter(settings.activeCharacter) : null;
  const ack = await request(
    { t: 'hello', protoVer: PROTO_VER, nickname, memberId: identity.id || settings.roomsMemberId, contactToken: identity.token, character: character?.manifest.name },
    'hello:ack',
  );
  if (generation !== connectionGeneration) throw new Error('连接已取消');
  socialSupported = ack.social === 1;
  contactsSupported = ack.contacts === 1;
  RoomPets.setContactRealm(activeUrl!);
  contactSnapshot = {...(readContactCache(activeUrl!).snapshot || {people:[],invitations:[]}),available:false,reason:'正在读取朋友列表'};
  if (contactsSupported && typeof ack.contactToken === 'string') saveContactCache(activeUrl!, {id:String(ack.memberId), token:ack.contactToken});
  memberId = String(ack.memberId ?? '');
  // 服务端分配的 memberId 存本地复用（零账号体系：下次连上还是同一个人）
  if (memberId && memberId !== settings.roomsMemberId) {
    await setSettings({ roomsMemberId: memberId });
  }
  setStatus({ phase: 'online', memberId });
  if (contactsSupported) void request({t:'contacts:get'}, 'contacts:snapshot').catch(()=>{});
}

/** 发一帧并等指定类型的应答（error 帧一律 reject） */
function request(frame: Frame, expect: string): Promise<Frame> {
  if (!ws || ws.readyState !== WS_OPEN) return Promise.reject(new Error('房间服务未连接，请重连后再试'));
  if (!socialSupported && [...pending.values()].some(p => p.expect === expect)) return Promise.reject(new Error('请求正在处理中，请稍候'));
  const requestId = String(++requestSequence);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('房间服务无响应，请确认当前状态后再试')); }, ROOMS.REQUEST_TIMEOUT_MS);
    pending.set(requestId, {expect, resolve, reject, timer});
    try { ws!.send(JSON.stringify({...frame, requestId})); }
    catch { clearTimeout(timer); pending.delete(requestId); reject(new Error('连接已断开')); }
  });
}
function send(frame: Frame): void {
  if (ws?.readyState === WS_OPEN && !roomCache?.testing) ws.send(JSON.stringify(frame));
}

// room-pets 不持连接（避免循环 import），出帧借这个口子；注入一次即可，
// send() 内部自己判连接状态，room-pets 调用时连接可能已断也没事（静默丢）
RoomPets.setRoomsSend(send);

function settle(type: string, frame: Frame, err?: Error): void {
  const key = typeof frame.requestId === 'string' ? frame.requestId : (!socialSupported ? [...pending].find(([,p]) => p.expect === type)?.[0] : undefined);
  if (!key) return;
  const p = pending.get(key);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(key);
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
  if (typeof frame.requestId === 'string' && frame.t === 'error') {
    settle('', frame, new Error(errorText(String(frame.code)))); return;
  }
  if (frame.roomId && ['chat','chat:deleted','member:in','member:out','member:pack','presence','wave','kicked'].includes(frame.t) && frame.roomId !== currentRoomId) return;
  switch (frame.t) {
    case 'contacts:ack': settle(frame.t, frame); break;
    case 'contacts:snapshot': {
      contactSnapshot = {available:true, reason:'', people:Array.isArray(frame.people) ? frame.people as ContactSnapshot['people'] : [], invitations:Array.isArray(frame.invitations) ? frame.invitations as ContactSnapshot['invitations'] : []};
      try { if(activeUrl) saveContactCache(activeUrl, {snapshot:contactSnapshot}); } catch { contactSnapshot.reason='记录暂未保存到本机，请检查磁盘空间'; }
      push('social:contacts', contactSnapshot); settle(frame.t, frame); break;
    }
    case 'social:ack': settle(frame.t, frame); break;
    case 'world:history':
      worldCache = Array.isArray(frame.messages) ? frame.messages as RoomChatMsg[] : [];
      push('social:world', worldCache); settle(frame.t, frame); break;
    case 'world:chat': {
      const msg = frame.msg as RoomChatMsg;
      if (worldSubscribed && msg && !worldCache.some(m => m.id === msg.id)) worldCache = [...worldCache, msg].slice(-50);
      push('social:world', worldCache); break;
    }
    case 'world:deleted':
      worldCache = worldCache.filter(m => m.id !== frame.id); push('social:world', worldCache); break;
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
      if (socialSupported) { push('rooms:error', errorText(code)); break; }
      // 旧版服务端不认识应用层 ping 帧，回了 bad_frame：这帧本身证明链路活着
      // （心跳吃的就是它），且不是任何在飞请求的应答，往下走会误杀 pending
      if (code === 'bad_frame') break;
      // 应答类错误：转给在等的那个请求（谁在等就给谁）
      const waiting = [...pending.keys()][0];
      if (waiting) {
        settle('', { ...frame, requestId: waiting }, new Error(errorText(code)));
      } else {
        push('rooms:error', errorText(code)); // 无人等待的错误（如发言被限流）
      }
      break;
    }

    // ── 心跳应答（活性已在 message 监听器里记账，这里无需做事）──
    case 'pong':
      break;

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
        if (m) { m.online = false; m.mode = undefined; m.action = undefined; m.sign = undefined; }
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
        sign: typeof frame.sign === 'string' ? frame.sign : undefined,
      };
      if (roomCache && frame.roomId === currentRoomId) {
        const m = roomCache.members.find((x) => x.memberId === payload.memberId);
        if (m) {
          m.online = true;
          m.mode = payload.mode as RoomMember['mode'];
          m.action = payload.action as string | undefined;
          m.sign = payload.sign;
        }
      }
      RoomPets.onPresence(
        payload.memberId,
        payload.mode as string | undefined,
        payload.action as string | undefined,
        payload.sign,
      );
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
  // 进房重置基线：连接建立到进房之间可能隔着逛列表的几分钟，
  // 不重置的话第一次 tick 就拿旧时间戳误判超时
  lastAliveAt = Date.now();
  heartbeatTimer = setInterval(() => {
    if (!ws || ws.readyState !== WS_OPEN) return;
    if (Date.now() - lastAliveAt > HEARTBEAT_TIMEOUT_MS) {
      console.error('[rooms] 心跳超时（30s 无任何入帧），关闭连接');
      try { ws.close(); } catch { /* 已经死了 */ }
      return;
    }
    // 应用层 ping：证明双向链路（旧服务端不认识这帧会回 bad_frame 错误帧，
    // 也是入帧、同样续命，所以新旧服务端都能用）
    send({ t: 'ping' });
    void sendPresence(true);
  }, ROOMS.PRESENCE_HEARTBEAT_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  lastPresence = null;
}

/**
 * 出在场帧：状态枚举 + 动作名 + 当前实际牌面文字。
 * 模式合成：agent 活动优先，其次会议、音乐态，再退 idle。
 */
async function sendPresence(force: boolean): Promise<void> {
  if (!currentRoomId || !ws || ws.readyState !== WS_OPEN) return;
  const mode: string =
    localActivity !== 'idle'
      ? localActivity
      : localMeeting.inMeeting
        ? 'meeting'
        : localMusic.playing
          ? 'music'
          : 'idle';
  // 经白名单函数出帧：能出本机的字段由 buildPresenceFrame 一处说了算（有测试守着）
  const settings = await getSettings();
  const active = settings.activeCharacter;
  const wanted = active && settings.socialPoses?.[active];
  const character = wanted && active ? await getCharacter(active) : null;
  const action = character?.manifest && wanted && pairActions(character.manifest).has(wanted) ? wanted : undefined;
  if (!currentRoomId || roomCache?.testing || ws?.readyState !== WS_OPEN) return;
  const frame = buildPresenceFrame({ activity: action ? 'idle' : mode, signText: localSign }, action || undefined);
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

/** music-monitor.updateStatus 的房间钩子（不在房时只记账；曲名若显示在牌面，由 sign:sync 单独同步） */
export function pushLocalMusic(next: MusicStatus): void {
  localMusic = next;
  void sendPresence(false);
}

/** meeting-monitor 的房间钩子（不在房时只记账） */
export function pushLocalMeeting(next: MeetingStatus): void {
  localMeeting = next;
  void sendPresence(false);
}

/** pet renderer 报告当前实际牌面；内容会透明同步给同房成员 */
export function pushLocalSign(text: string | null): void {
  localSign = text;
  void sendPresence(false);
}

// ── 公开 API（IPC 入口）────────────────────────────────────

/** 拉房间列表（未连接则先连）。kind/q 交服务端筛一道，客户端还会本地再筛 */
export async function listRooms(kind?: RoomKind, q?: string): Promise<RoomBrief[]> {
  if (roomCache?.testing) throw new Error('请先退出本地试演，再连接世界广场');
  await connect();
  const frame = await request({ t: 'list', kind, q }, 'rooms');
  return Array.isArray(frame.rooms) ? frame.rooms as RoomBrief[] : [];
}
export async function createRoom(input: CreateRoomInput): Promise<string> {
  if (roomCache?.testing) throw new Error('请先退出本地试演');
  const normalized = normalizeCreateInput(input);
  if (!normalized) throw new Error('房间名不能为空');
  await connect();
  if (!socialSupported && (input.description || input.language && input.language !== 'all' || input.chatEnabled === false)) throw new Error('房间服务需更新后才能保存扩展设置');
  const frame = await request({t:'create', ...normalized, description:input.description, language:input.language, chatEnabled:input.chatEnabled}, 'room');
  const roomId = String(frame.roomId ?? '');
  if (!roomId) throw new Error('开房失败');
  const settings = await getSettings();
  await setSettings({ roomsOwnerTokens: {...settings.roomsOwnerTokens, [roomId]:String(frame.ownerToken ?? '')} });
  await joinRoom(roomId);
  await setSettings({socialLastRoom: input});
  return roomId;
}
export async function joinRoom(roomId: string): Promise<RoomSnapshot> {
  if (roomCache?.testing) throw new Error('请先退出本地试演');
  const code = roomId.trim().toUpperCase();
  if (!/^[0-9A-Z]{8}$/.test(code)) throw new Error('请输入八位字母或数字房间码');
  await connect();
  const frame = await request({ t:'join', roomId:code }, 'joined');
  return frame.room as RoomSnapshot;
}

export function leaveRoom(): void {
  if (!currentRoomId) return;
  const wasTest = roomCache?.testing;
  send({ t: 'leave', roomId: currentRoomId });
  testGuests.clear();
  currentRoomId = null;
  roomCache = null;
  chatCache = [];
  stopHeartbeat();
  RoomPets.onLeftRoom();
  setStatus({ phase: wasTest ? 'off' : 'online', memberId: memberId ?? undefined });
  if (!wasTest) startHeartbeat();
}

/** 角色切换钩子（IPC/托盘的激活入口调用）：在房就把新形象重新报给房友 */
export function notifyRoomCharacterChanged(): void {
  if (!roomCache?.testing) RoomPets.notifyRoomCharacterChanged();
  void sendPresence(true);
}

/**
 * 发言。**这是用户手打文字的唯一出口**——任何 agent 内容
 * （气泡正文/last_assistant_message/transcript/cwd/persona）都不许从这里走，
 * 也不许有「一键分享结论到房间」这类便利入口（spec §5.3，有测试守着）。
 */
export function sendChat(text: string): void {
  if (roomCache?.testing) { void sendSocialChat(text).catch(e => push('rooms:error', e.message)); return; }
  if (!currentRoomId) return;
  const frame = buildChatFrame(text);
  if (frame) send(frame);
}

export function deleteChat(id: string): void {
  if (roomCache?.testing) { chatCache = chatCache.filter(m => m.id !== id || m.memberId !== memberId); push('rooms:history', chatCache); return; }
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
  if (roomCache?.testing) { replyTestGuest(targetMemberId, '嗨！见到你真好（模拟回应）'); return; }
  if (!currentRoomId) return;
  send({ t: 'wave', targetMemberId });
}

/** 改房间设置（房主，token 从本地取） */
export async function updateRoom(patch: Partial<CreateRoomInput>): Promise<void> {
  if (!currentRoomId || !roomCache) throw new Error('不在房间里');
  if (roomCache.ownerId !== memberId) throw new Error('只有房主可以设置房间');
  if (patch.capacity !== undefined && (!Number.isInteger(patch.capacity) || patch.capacity < Math.max(2,roomCache.members.filter(m=>m.online).length) || patch.capacity > 12)) throw new Error('人数上限不能小于当前人数，且须为 2–12');
  if (roomCache.testing) {
    const safe = normalizeCreateInput({...roomCache, ...patch});
    if (!safe) throw new Error('房名不能为空');
    roomCache = {...roomCache, ...safe, description:clampText(patch.description ?? roomCache.description,200), language:patch.language ?? roomCache.language, chatEnabled:patch.chatEnabled ?? roomCache.chatEnabled, listed:false};
    publishTest(); return;
  }
  if (!socialSupported) throw new Error('房间服务需更新后才能确认保存设置');
  const settings = await getSettings();
  const roomId = currentRoomId;
  const token = settings.roomsOwnerTokens?.[roomId];
  if (!token) throw new Error('没有这个房间的管理码');
  await request({ t:'room:update', ...patch, roomId, token }, 'social:ack');
  if (roomCache?.roomId === roomId) await setSettings({socialLastRoom: {...roomCache}});
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
  connectionGeneration++;
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
    p.reject(new Error('连接已断开'));
  }
  socialSupported = false;
  contactsSupported = false;
  contactSnapshot = {...contactSnapshot,available:false,reason:'连接已断开，显示上次记录',invitations:[],people:contactSnapshot.people.map(p=>({...p,online:false}))};
  push('social:contacts',contactSnapshot);
  worldSubscribed = false;
  worldCache = [];
  setStatus({ phase: 'off' });
}

export function supportsSocial(): boolean { return socialSupported || !!roomCache?.testing; }
export async function prepareSocialConnection(): Promise<void> {
  if (roomCache?.testing) throw new Error('请先退出本地试演');
  await connect();
}
export async function refreshSocialPose(): Promise<void> { await sendPresence(true); }
export async function subscribeWorld(subscribe: boolean): Promise<RoomChatMsg[]> {
  if (roomCache?.testing) { if (!subscribe) return []; throw new Error('本地试演不连接世界频道'); }
  if (!subscribe && !ws) { worldSubscribed = false; return []; }
  await connect();
  if (!socialSupported) throw new Error('房间服务尚未更新，世界聊天暂不可用');
  worldSubscribed = subscribe;
  const frame = await request({t:'world:subscribe', subscribe}, 'world:history');
  return frame.messages as RoomChatMsg[];
}
export async function sendSocialChat(text: string, world = false): Promise<void> {
  const clean = clampText(text, 200);
  if (!clean) throw new Error('请输入消息');
  if (roomCache?.testing) {
    if (world) throw new Error('本地试演不能向世界发送消息');
    if (roomCache.chatEnabled === false) throw new Error('房主关闭了聊天');
    appendTestChat(memberId!, clean); return;
  }
  if (!socialSupported) throw new Error('房间服务尚未更新，无法确认发送结果');
  if (!world && !currentRoomId) throw new Error('请先加入房间');
  if (world && !worldSubscribed) throw new Error('请先打开世界广场');
  await request({t:world ? 'world:send' : 'chat', text:clean, ...(world ? {} : {roomId:currentRoomId})}, 'social:ack');
}
export async function moderateSocial(id: string, action: 'delete' | 'report', world: boolean): Promise<void> {
  if (action !== 'delete' && action !== 'report') throw new Error('未知操作');
  if (roomCache?.testing) {
    if (world) throw new Error('不在世界频道');
    if (action === 'delete') deleteChat(id);
    else throw new Error('本地试演消息不提交举报');
    return;
  }
  if (!socialSupported) throw new Error('房间服务尚未更新');
  if (world) await request({t: action === 'delete' ? 'world:delete' : 'world:report', id}, 'social:ack');
  else await request({t:action === 'delete' ? 'chat:delete' : 'report', id, roomId:currentRoomId}, 'social:ack');
}

const testGuests = new Map<string, TestGuest>();
function publishTest(): void {
  setStatus({phase:'in-room', memberId:memberId!, room:roomCache!});
  push('rooms:history', chatCache);
}
export async function startTestRoom(): Promise<void> {
  if (currentRoomId) throw new Error('请先退出当前房间，再开始本地试演');
  disconnectRooms();
  const settings = await getSettings();
  memberId = 'test:me'; currentRoomId = 'LOCAL';
  roomCache = {roomId:'LOCAL', name:'我的试演小屋', description:'本地试演 · 不会向任何玩家发送邀请', kind:'idle', capacity:6, listed:false, chatEnabled:true, language:'zh', testing:true,
    ownerId:memberId, members:[{memberId, nickname:settings.nickname || settings.marketNickname || '我', joinedAt:Date.now(), online:true}]};
  chatCache = []; testGuests.clear();
  RoomPets.startLocalTest(memberId);
  publishTest();
}
export async function inviteTestGuest(id: string): Promise<void> {
  if (!roomCache?.testing) throw new Error('请先开始本地试演');
  const room = roomCache;
  const guest = (await listTestGuests()).find(g => g.id === id);
  if (roomCache !== room) throw new Error('试演已经结束');
  if (!guest) throw new Error('这个角色的素材已不可用');
  if (testGuests.has(id)) throw new Error('这个角色已经在房间里了');
  if (room.members.length >= room.capacity) throw new Error('试演房已满，请先调整人数上限');
  const member = {memberId:`test:${id}`, nickname:guest.name, joinedAt:Date.now(), online:true, testing:true};
  testGuests.set(id, guest); room.members.push(member);
  RoomPets.addLocalTestGuest(member, guest.character);
  publishTest();
}
export function getTestGuest(member: string): TestGuest | undefined {
  return roomCache?.testing && member.startsWith('test:') ? testGuests.get(member.slice(5)) : undefined;
}
export function removeTestGuest(id: string): void {
  if (!getTestGuest(id) || !roomCache) throw new Error('测试访客不存在');
  testGuests.delete(id.slice(5)); roomCache.members = roomCache.members.filter(m => m.memberId !== id);
  RoomPets.onMemberOut(id); publishTest();
}
function appendTestChat(id: string, text: string): void {
  const member = roomCache?.members.find(m => m.memberId === id);
  if (!roomCache?.testing || !member) throw new Error('测试成员不存在');
  const msg = {id:`local-${++requestSequence}`, memberId:id, nickname:member.nickname + (member.testing ? ' · 模拟' : ''), text:clampText(text,200), at:Date.now()};
  chatCache = [...chatCache, msg].slice(-50);
  RoomPets.onChat(id, msg.nickname, msg.text); push('rooms:chat', msg);
}
export function replyTestGuest(id: string, text: string): void {
  if (!getTestGuest(id)) throw new Error('测试访客不存在');
  if (roomCache?.chatEnabled === false) throw new Error('房主关闭了聊天');
  if (!clampText(text,200)) throw new Error('请输入模拟回复');
  appendTestChat(id, text);
}

/** Friend data is scoped to the room service, never inferred from a character cache. */
export async function getContacts(refresh = false): Promise<ContactSnapshot> {
  if (refresh) {
    await prepareSocialConnection();
    if (!contactsSupported) return {available:false, reason:'当前房间服务尚未支持朋友列表，请更新房间服务', people:[], invitations:[]};
    const settings = await getSettings();
    const character = settings.activeCharacter ? await getCharacter(settings.activeCharacter) : null;
    await request({t:'contacts:get', character:character?.manifest.name || ''}, 'contacts:snapshot');
    return contactSnapshot;
  }
  if (contactsSupported && ws?.readyState === WS_OPEN) return contactSnapshot;
  const realm = activeUrl || process.env.QBOT_ROOMS_URL || ROOMS.URL_CHAIN[0];
  const cached = readContactCache(realm).snapshot;
  return {...(cached || contactSnapshot), available:false, reason:'离线记录 · 点击刷新连接', invitations:[], people:(cached?.people || []).map(p=>({...p, online:false}))};
}
export async function changeContact(id: string, action: ContactAction): Promise<void> {
  if (!contactsSupported || !ws || ws.readyState !== WS_OPEN) throw new Error('请先刷新并连接朋友列表');
  if (roomCache?.testing) throw new Error('请先退出本地试演，再操作真实好友');
  if (!/^[0-9A-Z]{12}$/.test(id) || !['request','accept','reject','cancel','remove','invite'].includes(action)) throw new Error('无效的好友操作');
  await request({t:action === 'invite' ? 'contacts:invite' : 'contacts:change', id, action}, 'contacts:ack');
  await request({t:'contacts:get'}, 'contacts:snapshot');
}
export async function resolveContactInvitation(id: string, accept: boolean): Promise<string | undefined> {
  if (!contactsSupported || roomCache?.testing) throw new Error('请连接朋友列表并退出本地试演');
  if (typeof id !== 'string' || !/^[0-9a-f]{32}$/.test(id)) throw new Error('无效的邀请');
  const frame = await request({t:'contacts:invitation', id, action:accept ? 'accept' : 'dismiss'}, 'contacts:ack');
  return typeof frame.roomId === 'string' ? frame.roomId : undefined;
}

export async function rehearseContact(id: string): Promise<void> {
  const realm = activeUrl || process.env.QBOT_ROOMS_URL || ROOMS.URL_CHAIN[0];
  const snapshot = await getContacts();
  if (!snapshot.people.some(p=>p.id===id)) throw new Error('这位玩家不在朋友记录里');
  const guest = (await listTestGuests()).find(g=>g.ownerId===id && g.ownerRealm===realm);
  if (!guest) throw new Error('这位朋友没有可用的角色缓存，可以等下次同房时获取素材');
  if (roomCache && !roomCache.testing) throw new Error('请先退出当前房间，再邀请缓存角色进行本地试演');
  if (!roomCache) await startTestRoom();
  await inviteTestGuest(guest.id);
}
