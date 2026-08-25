/**
 * QBot 公共房间服务（spec: docs/superpowers/specs/2026-08-21-public-rooms-design.md）
 *
 * 与 relay 的根本区别：**这个服务解析帧内容并落盘**（房间注册表 + 最近 50 条聊天
 * + 角色包缓存）。所以它必须是独立进程——把这些塞进 relay 会废掉 relay
 * 「不解析不落盘」的隐私声明。
 *
 * 单文件 + 唯一依赖 ws（同 relay/market 的部署哲学：整目录 scp 就能跑）；
 * 禁止 import 仓库其他模块。日志只记数量，**聊天正文绝不进日志**。
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 24252);
/**
 * 监听地址。
 *
 * 主路是 nginx 反代的 wss（`wss://albertbeta.cn/rooms`），本来只听回环最干净；
 * 但域名/证书是单点——挂了房间功能就整体不可用。所以同时听公网，
 * 给客户端留一条明文兜底路（客户端主路失败才回退，且回退时会明示未加密）。
 *
 * 想收回公网暴露：`HOST=127.0.0.1` 即可（同时记得摘掉客户端的回退地址）。
 */
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'rooms.json');

/** 协议版本：不一致直接拒，不做兼容层（沿用 1v1 联机策略）。v2 = 角色包分发 */
const PROTO_VER = 2;

/**
 * 房间帧全是小文本；角色包分块走独立上限（64KB 块 base64 后 ~87KB，128KB 余量充足）。
 * nginx 对已升级的 WS 连接只隧道转发字节，帧尺寸不受反代限制。
 */
const MAX_PAYLOAD = 128 * 1024;

// ── 容量（spec §8.2） ──────────────────────────────────────
const MAX_ROOMS = 200;
const MAX_ROOMS_PER_CONN = 3;
const CAPACITY_MIN = 4;
const CAPACITY_MAX = 12;
const CAPACITY_DEFAULT = 8;
/** 空房回收：7 天无人进就删（常驻的前提是别无限累积） */
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PING_INTERVAL_MS = 30 * 1000;
/** 脏写落盘间隔 */
const FLUSH_MS = 30 * 1000;

// ── 文本上限 ───────────────────────────────────────────────
const NAME_MAX = 24;
const NICK_MAX = 16;
const CHAT_MAX = 200;
/** 每房保留的最近聊天条数（spec §5.1） */
const CHAT_KEEP = 50;

// ── 聊天限流（spec §5.2） ─────────────────────────────────
const CHAT_COOLDOWN_MS = 3000;
const CHAT_PER_MIN = 10;
const CHAT_DUP_LIMIT = 3;

// ── 角色包缓存（2026-08-24 上屏功能）────────────────────────
// 房友的宠要出现在彼此桌面 -> 需要分发角色包（sanitize 过的美术资产，无 persona 文本）。
// P2P 盲转意味着发送方为每个接收方重传一遍（12 人房 = 11 x 12MB 上行），
// 所以改服务端缓存：每人上传一次，房友按需下载，磁盘 LRU 封顶。
const PACKS_DIR = path.join(DATA_DIR, 'packs');
/** 单包上限（正常包 ~12MB，多动作/导入贴纸的角色更大，64MB 兜底） */
const PACK_MAX_BYTES = 64 * 1024 * 1024;
/** 缓存总量上限（LRU 淘汰） */
const PACK_CACHE_MAX = Number(process.env.PACK_CACHE_MAX || 2 * 1024 * 1024 * 1024);
/** 下载限速：块间停顿（~1.3MB/s，对小 VPS 的上行礼貌些） */
const PACK_CHUNK_DELAY_MS = 5;
/** 单连接上传流量窗口：5 分钟 192MB（够传 1 个包 + 重试 + 切角色，防刷盘刷带宽） */
const PACK_PUT_WINDOW_MS = 5 * 60_000;
const PACK_PUT_WINDOW_BYTES = 192 * 1024 * 1024;
const HASH_RE = /^[0-9a-f]{16}$/;
const PACK_CHUNK = 64 * 1024;

/** @type {Map<string, {size:number, at:number}>} hash -> 索引（at = 最近使用，LRU 依据） */
const packs = new Map();

const ROOM_KINDS = new Set(['idle', 'study', 'night', 'coop']);
/** 去易混字符集（同 relay） */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_ID_LEN = 8;

/** @type {Map<string, Room>} 房间注册表（落盘） */
const rooms = new Map();
/** @type {Map<string, Set<import('ws').WebSocket>>} roomId → 在线连接（不落盘） */
const online = new Map();
let dirty = false;

// ── 工具 ───────────────────────────────────────────────────

function genId(len = ROOM_ID_LEN) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

function genRoomId() {
  for (let i = 0; i < 100; i++) {
    const id = genId();
    if (!rooms.has(id)) return id;
  }
  return null;
}

function clampText(v, max) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function fail(ws, code) {
  send(ws, { t: 'error', code });
}

/** 房内广播（可排除发起者） */
function broadcast(roomId, obj, except = null) {
  const peers = online.get(roomId);
  if (!peers) return;
  for (const p of peers) if (p !== except) send(p, obj);
}

function onlineCount(roomId) {
  return online.get(roomId)?.size ?? 0;
}

// ── 落盘（spec §8.1）────────────────────────────────────────
// 全量内存 + 30s 脏写 + 退出前 flush。房间 200 × (12 成员 + 50 聊天) ≈ 3.3MB，
// 这个量级不值得上数据库。

function load() {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    console.log('[rooms] no data file, starting empty');
    return;
  }
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    for (const r of Array.isArray(raw?.rooms) ? raw.rooms : []) {
      const room = sanitizeRoom(r);
      if (room) rooms.set(room.roomId, room);
    }
    console.log(`[rooms] loaded ${rooms.size} rooms`);
  } catch (err) {
    // 坏档不能让服务起不来：改名留档，空表启动
    console.error('[rooms] data file corrupt, archiving:', err.message);
    try {
      writeFileSync(`${DATA_FILE}.corrupt`, readFileSync(DATA_FILE));
    } catch { /* 留档失败也继续 */ }
  }
}

/** 读盘容错：坏字段退默认，整条不合格才丢（同 app 侧 sanitizeProgress 的思路） */
function sanitizeRoom(r) {
  if (typeof r !== 'object' || r === null) return null;
  const roomId = typeof r.roomId === 'string' ? r.roomId : '';
  if (!/^[0-9A-Z]{4,12}$/.test(roomId)) return null;
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  const now = Date.now();
  const members = [];
  for (const m of Array.isArray(r.members) ? r.members : []) {
    if (typeof m?.memberId !== 'string' || !m.memberId) continue;
    members.push({
      memberId: m.memberId,
      nickname: clampText(m.nickname, NICK_MAX) || '匿名',
      avatarHash: typeof m.avatarHash === 'string' ? m.avatarHash.slice(0, 32) : undefined,
      joinedAt: num(m.joinedAt, now),
      lastSeenAt: num(m.lastSeenAt, now),
    });
  }
  const chat = [];
  for (const c of Array.isArray(r.chat) ? r.chat : []) {
    if (typeof c?.text !== 'string' || typeof c?.memberId !== 'string') continue;
    chat.push({
      id: typeof c.id === 'string' ? c.id : genId(12),
      memberId: c.memberId,
      nickname: clampText(c.nickname, NICK_MAX) || '匿名',
      text: c.text.slice(0, CHAT_MAX),
      at: num(c.at, now),
    });
  }
  return {
    roomId,
    name: clampText(r.name, NAME_MAX) || '未命名',
    kind: ROOM_KINDS.has(r.kind) ? r.kind : 'idle',
    capacity: Math.min(CAPACITY_MAX, Math.max(CAPACITY_MIN, num(r.capacity, CAPACITY_DEFAULT))),
    listed: r.listed !== false,
    ownerToken: typeof r.ownerToken === 'string' ? r.ownerToken : randomBytes(16).toString('hex'),
    ownerId: typeof r.ownerId === 'string' ? r.ownerId : '',
    members,
    banned: Array.isArray(r.banned) ? r.banned.filter((x) => typeof x === 'string') : [],
    reports: Array.isArray(r.reports)
      ? r.reports.filter((x) => x && typeof x.msgId === 'string' && typeof x.by === 'string').slice(-200)
      : [],
    chat: chat.slice(-CHAT_KEEP),
    createdAt: num(r.createdAt, now),
    lastActiveAt: num(r.lastActiveAt, now),
  };
}

function flush() {
  if (!dirty) return;
  dirty = false;
  try {
    const tmp = `${DATA_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify({ rooms: [...rooms.values()] }));
    renameSync(tmp, DATA_FILE); // 原子替换：崩在写一半也不会留下坏档
  } catch (err) {
    console.error('[rooms] flush failed:', err.message);
    dirty = true; // 下轮重试
  }
}

/** 空房回收：7 天没人进就删 */
function sweep() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  let removed = 0;
  for (const [id, room] of rooms) {
    if (room.lastActiveAt < cutoff && onlineCount(id) === 0) {
      rooms.delete(id);
      online.delete(id);
      removed++;
    }
  }
  if (removed) {
    dirty = true;
    console.log(`[rooms] swept ${removed} stale rooms`);
  }
}

// ── 角色包缓存 ─────────────────────────────────────────────

/** 启动扫描 packs/ 重建索引（atime 不可靠，用 mtime 当 LRU 初值）；顺手清掉崩溃残留的 tmp */
function loadPacks() {
  mkdirSync(PACKS_DIR, { recursive: true });
  for (const name of readdirSync(PACKS_DIR)) {
    if (name.endsWith('.tmp')) {
      try { rmSync(path.join(PACKS_DIR, name)); } catch { /* noop */ }
      continue;
    }
    const m = name.match(/^([0-9a-f]{16})\.qpack$/);
    if (!m) continue;
    try {
      const st = statSync(path.join(PACKS_DIR, name));
      packs.set(m[1], { size: st.size, at: st.mtimeMs });
    } catch { /* 刚被淘汰的竞态：跳过 */ }
  }
  if (packs.size) console.log(`[rooms] loaded ${packs.size} character packs`);
}

/** 废弃进行中的上传：删临时文件清状态（限流/出错/断开时） */
function abortPackUpload(ws) {
  const up = ws.packUpload;
  ws.packUpload = null;
  if (!up) return;
  try { rmSync(up.tmp, { force: true }); } catch { /* noop */ }
}

function packPath(hash) {
  return path.join(PACKS_DIR, `${hash}.qpack`);
}

/** 总量超上限就按最久未用淘汰（下载命中会 touch at，热包自然留下） */
function evictPacks() {
  let total = 0;
  for (const p of packs.values()) total += p.size;
  if (total <= PACK_CACHE_MAX) return;
  const byAge = [...packs.entries()].sort((a, b) => a[1].at - b[1].at);
  for (const [hash, meta] of byAge) {
    if (total <= PACK_CACHE_MAX) break;
    packs.delete(hash);
    total -= meta.size;
    try { rmSync(packPath(hash)); } catch { /* 没了就没了 */ }
    console.log(`[rooms] evicted pack (cached=${Math.round(total / 1e6)}MB)`);
  }
}

/** 记一笔上传流量；超窗返回 false（拒绝理由 rate_limited） */
function allowPutBytes(ws, n) {
  const now = Date.now();
  ws.putLog = (ws.putLog || []).filter((e) => now - e.at < PACK_PUT_WINDOW_MS);
  const used = ws.putLog.reduce((s, e) => s + e.bytes, 0);
  if (used + n > PACK_PUT_WINDOW_BYTES) return false;
  ws.putLog.push({ at: now, bytes: n });
  return true;
}

/** 收齐一块上传：校验 hash -> 原子就位；不匹配删临时文件回 bad */
function finalizePackPut(ws, upload) {
  ws.packUpload = null;
  try {
    const buf = readFileSync(upload.tmp);
    const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16);
    if (hash !== upload.hash || buf.length !== upload.bytes) {
      rmSync(upload.tmp, { force: true });
      fail(ws, 'pack:bad');
      console.log('[rooms] pack hash mismatch rejected'); // 不打内容
      return;
    }
    renameSync(upload.tmp, packPath(upload.hash));
    packs.set(upload.hash, { size: buf.length, at: Date.now() });
    evictPacks();
    send(ws, { t: 'pack:put:ok', hash: upload.hash });
    console.log(`[rooms] pack stored (${upload.hash}, cached=${packs.size})`);
  } catch (err) {
    try { rmSync(upload.tmp, { force: true }); } catch { /* noop */ }
    console.error('[rooms] finalize pack failed:', err.message);
    fail(ws, 'server_error');
  }
}

/** 下载泵：pack:begin + 分块流（5ms 节流）。fire-and-forget，错误自己吞 */
function streamPack(ws, hash) {
  const meta = packs.get(hash);
  if (!meta) { fail(ws, 'pack:not_found'); return; }
  if (ws.downloading) { fail(ws, 'pack:busy'); return; }
  let buf;
  try {
    buf = readFileSync(packPath(hash)); // 读后被淘汰：内容已在内存，照发不误
  } catch {
    fail(ws, 'pack:not_found');
    return;
  }
  meta.at = Date.now();
  ws.downloading = true;
  const total = Math.ceil(buf.length / PACK_CHUNK);
  const pump = async () => {
    try {
      send(ws, { t: 'pack:begin', hash, total, size: buf.length });
      for (let seq = 0; seq < total; seq++) {
        if (ws.readyState !== ws.OPEN) return; // 客户端断开：收工
        send(ws, {
          t: 'pack:chunk',
          hash,
          seq,
          data: buf.subarray(seq * PACK_CHUNK, Math.min((seq + 1) * PACK_CHUNK, buf.length)).toString('base64'),
        });
        await new Promise((r) => setTimeout(r, PACK_CHUNK_DELAY_MS));
      }
    } finally {
      ws.downloading = false;
    }
  };
  pump().catch(() => { ws.downloading = false; });
}

// ── 房间视图 ───────────────────────────────────────────────

/** 列表条目：不含聊天/token/成员详情（列表页不需要，也少一份泄漏面） */
function roomBrief(room) {
  return {
    roomId: room.roomId,
    name: room.name,
    kind: room.kind,
    capacity: room.capacity,
    members: room.members.length,
    online: onlineCount(room.roomId),
    lastActiveAt: room.lastActiveAt,
  };
}

/** 房内快照：成员表 + 每人当前在场状态（token 永不出现） */
function roomSnapshot(room) {
  const peers = online.get(room.roomId);
  const presence = {};
  if (peers) {
    for (const p of peers) {
      if (p.memberId) {
        presence[p.memberId] = { mode: p.mode || 'idle', action: p.action, packHash: p.packHash };
      }
    }
  }
  return {
    roomId: room.roomId,
    name: room.name,
    kind: room.kind,
    capacity: room.capacity,
    listed: room.listed,
    ownerId: room.ownerId,
    members: room.members.map((m) => ({
      memberId: m.memberId,
      nickname: m.nickname,
      avatarHash: m.avatarHash,
      joinedAt: m.joinedAt,
      online: !!presence[m.memberId],
      mode: presence[m.memberId]?.mode,
      action: presence[m.memberId]?.action,
      packHash: presence[m.memberId]?.packHash,
    })),
  };
}

/** 常驻成员登记：进过就算（社交资产是「常客名单」，不是「在线名单」） */
function upsertMember(room, ws) {
  const now = Date.now();
  let m = room.members.find((x) => x.memberId === ws.memberId);
  if (!m) {
    m = { memberId: ws.memberId, nickname: ws.nickname, joinedAt: now, lastSeenAt: now };
    room.members.push(m);
  }
  m.nickname = ws.nickname;
  if (ws.avatarHash) m.avatarHash = ws.avatarHash;
  m.lastSeenAt = now;
  room.lastActiveAt = now;
  dirty = true;
  return m;
}

/** 离房：清在线表 + 广播；不动 members（常驻） */
function leaveRoom(ws, notify = true) {
  const roomId = ws.roomId;
  if (!roomId) return;
  ws.roomId = null;
  const peers = online.get(roomId);
  if (peers) {
    peers.delete(ws);
    if (peers.size === 0) online.delete(roomId);
  }
  const room = rooms.get(roomId);
  if (room) {
    const m = room.members.find((x) => x.memberId === ws.memberId);
    if (m) { m.lastSeenAt = Date.now(); dirty = true; }
  }
  if (notify) broadcast(roomId, { t: 'member:out', roomId, memberId: ws.memberId });
}

// ── 聊天限流（spec §5.2）──────────────────────────────────
// 服务端权威。客户端 chat-rules.ts 有一份同规则的本地预挡（即时反馈），
// 但**以这里为准**——不信客户端。

/** @returns {string|null} 拒绝原因 code，null = 放行 */
function checkChatLimit(ws, text) {
  const now = Date.now();
  if (now - (ws.lastChatAt || 0) < CHAT_COOLDOWN_MS) return 'rate_limited';
  ws.chatTimes = (ws.chatTimes || []).filter((t) => now - t < 60_000);
  if (ws.chatTimes.length >= CHAT_PER_MIN) return 'rate_limited';
  // 连发同内容：防复制粘贴刷屏
  if (text === ws.lastChatText) {
    if ((ws.dupCount || 0) + 1 >= CHAT_DUP_LIMIT) return 'rate_limited';
  }
  return null;
}

function noteChatSent(ws, text) {
  const now = Date.now();
  ws.lastChatAt = now;
  ws.chatTimes = [...(ws.chatTimes || []), now];
  ws.dupCount = text === ws.lastChatText ? (ws.dupCount || 0) + 1 : 0;
  ws.lastChatText = text;
}

// ── 帧处理 ─────────────────────────────────────────────────

const handlers = {
  hello(ws, f) {
    if (f.protoVer !== PROTO_VER) { fail(ws, 'proto_mismatch'); ws.close(); return; }
    // memberId 由服务端分配后由客户端存本地复用（零账号体系，同市场的 token 思路）
    ws.memberId = typeof f.memberId === 'string' && /^[0-9A-Z]{12}$/.test(f.memberId)
      ? f.memberId
      : genId(12);
    ws.nickname = clampText(f.nickname, NICK_MAX) || '匿名';
    ws.avatarHash = typeof f.avatarHash === 'string' ? f.avatarHash.slice(0, 32) : undefined;
    ws.hello = true;
    send(ws, { t: 'hello:ack', memberId: ws.memberId, serverTime: Date.now() });
  },

  list(ws, f) {
    const kind = ROOM_KINDS.has(f.kind) ? f.kind : null;
    const q = clampText(f.q, 32).toLowerCase();
    const out = [];
    for (const room of rooms.values()) {
      if (!room.listed) continue; // 私密房不上架，凭 roomId 进
      if (kind && room.kind !== kind) continue;
      if (q && !room.name.toLowerCase().includes(q)) continue;
      out.push(roomBrief(room));
    }
    // 在线人多的排前面，其次按最近活跃
    out.sort((a, b) => b.online - a.online || b.lastActiveAt - a.lastActiveAt);
    send(ws, { t: 'rooms', rooms: out.slice(0, 100) });
  },

  create(ws, f) {
    if (rooms.size >= MAX_ROOMS) { fail(ws, 'server_full'); return; }
    if ((ws.created || 0) >= MAX_ROOMS_PER_CONN) { fail(ws, 'too_many_rooms'); return; }
    const name = clampText(f.name, NAME_MAX);
    if (!name) { fail(ws, 'bad_frame'); return; }
    const roomId = genRoomId();
    if (!roomId) { fail(ws, 'server_full'); return; }
    const now = Date.now();
    const room = {
      roomId,
      name,
      kind: ROOM_KINDS.has(f.kind) ? f.kind : 'idle',
      capacity: Math.min(CAPACITY_MAX, Math.max(CAPACITY_MIN,
        Number.isFinite(f.capacity) ? Math.floor(f.capacity) : CAPACITY_DEFAULT)),
      listed: f.listed !== false,
      ownerToken: randomBytes(16).toString('hex'),
      ownerId: ws.memberId,
      members: [],
      banned: [],
      reports: [],
      chat: [],
      createdAt: now,
      lastActiveAt: now,
    };
    rooms.set(roomId, room);
    ws.created = (ws.created || 0) + 1;
    dirty = true;
    send(ws, { t: 'room', roomId, ownerToken: room.ownerToken });
    console.log(`[rooms] created (total=${rooms.size})`); // 不记房名
  },

  join(ws, f) {
    const room = rooms.get(String(f.roomId || '').toUpperCase());
    if (!room) { fail(ws, 'room_not_found'); return; }
    if (room.banned.includes(ws.memberId)) { fail(ws, 'banned'); return; }
    // 已在别的房：先退（一条连接同时只在一个房里）
    if (ws.roomId && ws.roomId !== room.roomId) leaveRoom(ws);
    if (ws.roomId !== room.roomId && onlineCount(room.roomId) >= room.capacity) {
      fail(ws, 'room_full');
      return;
    }
    ws.roomId = room.roomId;
    ws.mode = ws.mode || 'idle';
    if (!online.has(room.roomId)) online.set(room.roomId, new Set());
    online.get(room.roomId).add(ws);
    const member = upsertMember(room, ws);
    // 进房带回最近 50 条聊天（spec §5.1「能看到最近的」）
    send(ws, { t: 'joined', room: roomSnapshot(room), chat: room.chat });
    broadcast(room.roomId, {
      t: 'member:in',
      roomId: room.roomId,
      member: { ...member, online: true, mode: ws.mode, packHash: ws.packHash },
    }, ws);
  },

  leave(ws) {
    leaveRoom(ws);
  },

  presence(ws, f) {
    if (!ws.roomId) return;
    ws.mode = typeof f.mode === 'string' ? f.mode.slice(0, 16) : 'idle';
    ws.action = typeof f.action === 'string' ? f.action.slice(0, 32) : undefined;
    // 只转发状态枚举 + 动作名——曲名等内容在客户端就没进帧（spec §5.3）
    broadcast(ws.roomId, {
      t: 'presence',
      roomId: ws.roomId,
      memberId: ws.memberId,
      mode: ws.mode,
      action: ws.action,
    }, ws);
  },

  // —— 角色包分发（2026-08-24 上屏）────────────────────────
  // announce 把当前角色的包指纹挂到连接上：成员快照/广播都从这里取。
  // packHash 是连接级状态（同 memberId 重连要重报），不进落盘的 member
  // 记录——离线成员本来就不上屏，落盘只多一份泄漏面。
  'pack:announce'(ws, f) {
    const hash = typeof f.hash === 'string' ? f.hash : '';
    if (hash && !HASH_RE.test(hash)) { fail(ws, 'bad_frame'); return; }
    ws.packHash = hash || undefined;
    if (ws.roomId && hash) {
      broadcast(ws.roomId, {
        t: 'member:pack',
        roomId: ws.roomId,
        memberId: ws.memberId,
        packHash: hash,
      }); // 含发送者：客户端据此确认 announce 生效
    }
  },

  'pack:have'(ws, f) {
    const hash = String(f.hash || '');
    if (!HASH_RE.test(hash)) { fail(ws, 'bad_frame'); return; }
    send(ws, { t: 'pack:have:ack', hash, cached: packs.has(hash) });
  },

  /** 顺序分块上传：seq 从 0 连续到 total-1，收齐校验 sha256 就位 */
  'pack:put'(ws, f) {
    const hash = String(f.hash || '');
    if (!HASH_RE.test(hash)) { fail(ws, 'bad_frame'); return; }
    if (packs.has(hash)) { send(ws, { t: 'pack:put:ok', hash }); return; } // 幂等
    const seq = Number(f.seq);
    const total = Number(f.total);
    const data = typeof f.data === 'string' ? f.data : '';
    if (!Number.isInteger(seq) || !Number.isInteger(total) || total <= 0
      || seq < 0 || seq >= total || total > Math.ceil(PACK_MAX_BYTES / PACK_CHUNK)) {
      fail(ws, 'bad_frame');
      return;
    }
    const raw = Buffer.from(data, 'base64');
    if (raw.length === 0 || raw.length > PACK_CHUNK) { fail(ws, 'bad_frame'); return; }

    let up = ws.packUpload;
    if (seq === 0) {
      // seq 0 = 新一轮（首次 / 客户端重传）：旧临时文件直接废弃
      if (up) { try { rmSync(up.tmp, { force: true }); } catch { /* noop */ } }
      ws.packUpload = up = {
        hash,
        tmp: path.join(PACKS_DIR, `${hash}.${genId(6)}.tmp`),
        received: 0,
        bytes: 0,
      };
      try {
        writeFileSync(up.tmp, Buffer.alloc(0));
      } catch (err) {
        ws.packUpload = null;
        console.error('[rooms] create pack tmp failed:', err.message);
        fail(ws, 'server_error');
        return;
      }
    } else if (!up || up.hash !== hash || seq !== up.received) {
      fail(ws, 'bad_frame'); // 乱序/重发/凭空插流：与客户端 ChunkAssembler 同一纪律
      return;
    }
    if (!allowPutBytes(ws, raw.length)) {
      abortPackUpload(ws);
      fail(ws, 'pack:rate_limited'); // 专属码：不与聊天限流的 rate_limited 混用（客户端两边处置不同）
      return;
    }
    try {
      appendFileSync(up.tmp, raw);
    } catch (err) {
      console.error('[rooms] append pack chunk failed:', err.message);
      abortPackUpload(ws);
      fail(ws, 'server_error');
      return;
    }
    up.received++;
    up.bytes += raw.length;
    if (up.bytes > PACK_MAX_BYTES) {
      abortPackUpload(ws);
      fail(ws, 'pack:too_big');
      return;
    }
    if (up.received === total) finalizePackPut(ws, up);
  },

  'pack:get'(ws, f) {
    const hash = String(f.hash || '');
    if (!HASH_RE.test(hash)) { fail(ws, 'bad_frame'); return; }
    streamPack(ws, hash);
  },

  chat(ws, f) {
    if (!ws.roomId) { fail(ws, 'not_in_room'); return; }
    const room = rooms.get(ws.roomId);
    if (!room) { fail(ws, 'room_not_found'); return; }
    const text = clampText(f.text, CHAT_MAX);
    if (!text) return;
    const reject = checkChatLimit(ws, text);
    if (reject) { fail(ws, reject); return; }
    noteChatSent(ws, text);
    const msg = {
      id: genId(12),
      memberId: ws.memberId,
      nickname: ws.nickname,
      text,
      at: Date.now(), // 服务端时间：不信客户端时钟
    };
    room.chat.push(msg);
    if (room.chat.length > CHAT_KEEP) room.chat = room.chat.slice(-CHAT_KEEP);
    room.lastActiveAt = msg.at;
    dirty = true;
    broadcast(ws.roomId, { t: 'chat', roomId: ws.roomId, msg }); // 含发送者：以服务端 id/时间为准
  },

  'chat:delete'(ws, f) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    const id = String(f.id || '');
    const i = room.chat.findIndex((c) => c.id === id);
    if (i < 0) return;
    // 只能删自己的（房主也不能删别人的话——踢人是另一回事）
    if (room.chat[i].memberId !== ws.memberId) { fail(ws, 'not_yours'); return; }
    room.chat.splice(i, 1);
    dirty = true;
    broadcast(ws.roomId, { t: 'chat:deleted', roomId: ws.roomId, id });
  },

  /**
   * 举报一条发言：**只记计数 + 快照，不做任何自动判定**。
   * 自部署服务没有 7×24 审核能力（spec §5.3），所以这里只负责留证据给房主/运维看，
   * 绝不自动删帖或封人——误伤的代价比漏判高。
   */
  report(ws, f) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    const id = String(f.id || '');
    const msg = room.chat.find((c) => c.id === id);
    if (!msg) return;
    if (msg.memberId === ws.memberId) return; // 举报自己没意义
    room.reports = Array.isArray(room.reports) ? room.reports : [];
    // 同一人对同一条只算一次
    if (room.reports.some((r) => r.msgId === id && r.by === ws.memberId)) return;
    room.reports.push({
      msgId: id,
      by: ws.memberId,
      at: Date.now(),
      // 快照：原消息可能被作者撤回，留个证据才有意义
      snapshot: { memberId: msg.memberId, nickname: msg.nickname, text: msg.text, at: msg.at },
    });
    // 只留最近 200 条举报，别让它无限涨
    if (room.reports.length > 200) room.reports = room.reports.slice(-200);
    dirty = true;
    console.log(`[rooms] report filed (room reports=${room.reports.length})`); // 不打正文
    send(ws, { t: 'reported', id });
  },

  wave(ws, f) {
    if (!ws.roomId) return;
    const target = String(f.targetMemberId || '');
    const peers = online.get(ws.roomId);
    if (!peers) return;
    for (const p of peers) {
      if (p.memberId === target) {
        send(p, { t: 'wave', roomId: ws.roomId, fromMemberId: ws.memberId, fromNickname: ws.nickname });
        break;
      }
    }
  },

  'room:update'(ws, f) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (f.token !== room.ownerToken) { fail(ws, 'not_owner'); return; }
    if (typeof f.name === 'string') room.name = clampText(f.name, NAME_MAX) || room.name;
    if (ROOM_KINDS.has(f.kind)) room.kind = f.kind;
    if (typeof f.listed === 'boolean') room.listed = f.listed;
    dirty = true;
    broadcast(room.roomId, { t: 'room:updated', room: roomSnapshot(room) });
  },

  'room:kick'(ws, f) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (f.token !== room.ownerToken) { fail(ws, 'not_owner'); return; }
    const target = String(f.memberId || '');
    if (!target || target === room.ownerId) return;
    room.members = room.members.filter((m) => m.memberId !== target);
    if (!room.banned.includes(target)) room.banned.push(target);
    dirty = true;
    const peers = online.get(room.roomId);
    if (peers) {
      for (const p of [...peers]) {
        if (p.memberId === target) {
          send(p, { t: 'kicked', roomId: room.roomId });
          leaveRoom(p);
        }
      }
    }
    broadcast(room.roomId, { t: 'member:out', roomId: room.roomId, memberId: target });
  },
};

// ── WS 服务器 ──────────────────────────────────────────────

load();
loadPacks();

const wss = new WebSocketServer({ host: HOST, port: PORT, maxPayload: MAX_PAYLOAD });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.roomId = null;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    let frame;
    try {
      frame = JSON.parse(data.toString());
    } catch {
      fail(ws, 'bad_frame');
      return;
    }
    const handler = handlers[frame?.t];
    if (!handler) { fail(ws, 'bad_frame'); return; }
    // hello 之前只允许 hello：memberId/nickname 是后续一切帧的前提
    if (!ws.hello && frame.t !== 'hello') { fail(ws, 'need_hello'); return; }
    try {
      handler(ws, frame);
    } catch (err) {
      console.error(`[rooms] handler ${frame.t} failed:`, err.message); // 不打帧内容
      fail(ws, 'server_error');
    }
  });

  ws.on('close', () => {
    leaveRoom(ws);
    abortPackUpload(ws); // 半截上传不留垃圾 tmp
  });
  ws.on('error', () => ws.close());
});

// 心跳踢死连接（NAT 半开、断电对端）
const pinger = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, PING_INTERVAL_MS);

const flusher = setInterval(flush, FLUSH_MS);
const sweeper = setInterval(sweep, 60 * 60 * 1000);
sweeper.unref();

// 运营日志只记数字（聊天正文绝不进日志，spec §8.4）
const logger = setInterval(() => {
  let chatCount = 0;
  for (const r of rooms.values()) chatCount += r.chat.length;
  console.log(`[rooms] rooms=${rooms.size} conns=${wss.clients.size} msgs=${chatCount}`);
}, 60 * 1000);
logger.unref();

function shutdown() {
  clearInterval(pinger);
  clearInterval(flusher);
  flush(); // 退出前落盘，别丢最后 30s 的聊天
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`[rooms] listening on ${HOST}:${PORT}  data=${DATA_FILE}`);
