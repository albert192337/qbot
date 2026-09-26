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
import { Contacts } from './contacts.mjs';
import { Gardens } from './garden.mjs';
import { Companions } from './companions.mjs';
import { PairDialogue } from './pair-dialogue.mjs';
import { characterProfile } from './character-profile.mjs';
import gardenCore from './generated/garden-core.cjs';

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
const MAX_ROOMS = 500;
const MAX_ROOMS_PER_CONN = 10;
const CAPACITY_MIN = 2;
const CAPACITY_MAX = 12;
const CAPACITY_DEFAULT = 8;
/** 空房回收：7 天无人进就删（常驻的前提是别无限累积） */
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PING_INTERVAL_MS = 60 * 1000;
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
/** 缓存总量上限（LRU 淘汰），8GiB内存可提升到8GB */
const PACK_CACHE_MAX = Number(process.env.PACK_CACHE_MAX || 8 * 1024 * 1024 * 1024);
/** 下载限速：块间停顿（~1.3MB/s，对小 VPS 的上行礼貌些） */
const PACK_CHUNK_DELAY_MS = 5;
/** 单连接上传流量窗口：5 分钟 192MB（够传 1 个包 + 重试 + 切角色，防刷盘刷带宽） */
const PACK_PUT_WINDOW_MS = 5 * 60_000;
const PACK_PUT_WINDOW_BYTES = 512 * 1024 * 1024;
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
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(['hello:ack','rooms','room','joined','error','social:ack','world:history','reported','contacts:snapshot','contacts:ack','garden:result'].includes(obj.t) && ws.requestId ? {...obj, requestId:ws.requestId} : obj));
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
      ...(c.interaction==='petting'?{interaction:'petting'}:{}),
      at: num(c.at, now),
    });
  }
  return {
    ...roomMeta(r),
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
    writeFileSync(tmp, JSON.stringify({ rooms: [...rooms.values()].filter(r=>!r.companion).map(r=>({...r,members:r.members.filter(m=>!m.companion)})) }));
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
    companion: room.companion === true,
    ...roomMeta(room),
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
        presence[p.memberId] = {
          mode: p.mode || 'idle',
          action: p.action,
          sign: p.sign,
          packHash: p.packHash,
        };
      }
    }
  }
  return {
    ...roomMeta(room),
    roomId: room.roomId,
    name: room.name,
    kind: room.kind,
    capacity: room.capacity,
    listed: room.listed,
    ownerId: room.ownerId,
    members: room.members.map((m) => ({
      memberId: m.memberId,
      companion: m.companion === true,
      nickname: m.nickname,
      avatarHash: m.avatarHash,
      joinedAt: m.joinedAt,
      online: !!presence[m.memberId],
      mode: presence[m.memberId]?.mode,
      action: presence[m.memberId]?.action,
      sign: presence[m.memberId]?.sign,
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
  if(ws.companion)m.companion=true;
  if (ws.avatarHash) m.avatarHash = ws.avatarHash;
  m.lastSeenAt = now;
  room.lastActiveAt = now;
  dirty = true;
  return m;
}

/** 离房：清在线表 + 广播；不动 members（常驻） */
function leaveRoom(ws, notify = true) {
  ws.pairEpoch = (ws.pairEpoch || 0) + 1;
  pairDialogue.cancel(ws);
  companions?.left(ws);
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
    if(ws.companion&&roomId!==ws.homeRoomId)room.members=room.members.filter(m=>m.memberId!==ws.memberId);
  }
  if (notify) broadcast(roomId, { t: 'member:out', roomId, memberId: ws.memberId });
}

function occupiedCount(roomId){
  return onlineCount(roomId)+(companions?.peers.filter(p=>p.homeRoomId===roomId&&p.roomId!==roomId).length??0);
}
function moveCompanion(peer,roomId,user){
  const room=rooms.get(roomId);
  if(!room)return false;
  if(peer.roomId===roomId)return true;
  if(user&&(room.banned.includes(peer.memberId)||occupiedCount(roomId)>=room.capacity||pairBusy.get(peer.memberId)>Date.now())){
    fail(user,'invite_unavailable');return false;
  }
  for(const [id,i] of pairInvites)if(i.from===peer.memberId||i.to===peer.memberId)pairInvites.delete(id);
  pairBusy.delete(peer.memberId);
  leaveRoom(peer);
  peer.roomId=roomId;peer.mode=roomId===peer.homeRoomId&&peer.profile.room===1?'working':'idle';
  if(!online.has(roomId))online.set(roomId,new Set());
  online.get(roomId).add(peer);
  const member=upsertMember(room,peer);
  contacts.transaction(()=>{for(const p of online.get(roomId))contacts.meet(peer.memberId,p.memberId);});
  broadcast(roomId,{t:'member:in',roomId,member:{...member,online:true,mode:peer.mode,action:peer.action,packHash:peer.packHash}});
  for(const p of online.get(roomId))if(!p.companion){companions.joined(p);const visit=companions.visits.get(p);if(visit)visit.lastSpoke=Date.now();}
  notifyContacts();return true;
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

const worldPeers = new Set();
const gardenInvites=new Map();
const pairInvites=new Map();
const pairDialogue=new PairDialogue();
const pairBusy=new Map();
let worldChat = [];
const worldReports = [];
try {
  const saved = JSON.parse(readFileSync(path.join(DATA_DIR, 'world-reports.json'), 'utf8'));
  if (Array.isArray(saved)) worldReports.push(...saved.slice(-200).filter(r => r && typeof r.id === 'string' && typeof r.by === 'string'));
} catch { /* First start or a missing report log. */ }
function worldBroadcast(frame) { for (const peer of worldPeers) send(peer, frame); }
const roomMeta = f => ({ description: clampText(f.description, 200), language: ['zh','en','ja','ko'].includes(f.language) ? f.language : 'all', chatEnabled: f.chatEnabled !== false });
const handlers = {
  'world:subscribe'(ws, f) {
    if (f.subscribe === false) worldPeers.delete(ws); else worldPeers.add(ws);
    send(ws, {t:'world:history', messages: f.subscribe === false ? [] : worldChat});
  },
  'world:send'(ws, f) {
    if (!worldPeers.has(ws)) { fail(ws, 'not_subscribed'); return; }
    const text = clampText(f.text, CHAT_MAX);
    if (!text) { fail(ws, 'empty_message'); return; }
    const reason = checkChatLimit(ws, text);
    if (reason) { fail(ws, reason); return; }
    noteChatSent(ws, text);
    const msg = {id:genId(12), memberId:ws.memberId, nickname:ws.nickname, text, at:Date.now()};
    worldChat = [...worldChat, msg].slice(-CHAT_KEEP);
    worldBroadcast({t:'world:chat', msg});
    send(ws, {t:'social:ack'});
  },
  'world:delete'(ws, f) {
    const msg = worldChat.find(m => m.id === f.id);
    if (!msg || msg.memberId !== ws.memberId) { fail(ws, 'not_yours'); return; }
    worldChat = worldChat.filter(m => m.id !== f.id);
    worldBroadcast({t:'world:deleted', id:f.id});
    send(ws, {t:'social:ack'});
  },
  'world:report'(ws, f) {
    const msg = worldChat.find(m => m.id === f.id);
    if (!msg || msg.memberId === ws.memberId) { fail(ws, 'bad_frame'); return; }
    if (!worldReports.some(r => r.id === f.id && r.by === ws.memberId)) {
      const report = {id: f.id, by: ws.memberId, at: Date.now(), snapshot: msg};
      const next = [...worldReports, report].slice(-200);
      try { writeFileSync(path.join(DATA_DIR, 'world-reports.json'), JSON.stringify(next)); }
      catch { fail(ws, 'server_error'); return; }
      worldReports.splice(0, worldReports.length, ...next);
    }
    send(ws, {t:'social:ack'});
  },
  hello(ws, f) {
    if (ws.hello) { fail(ws, 'already_connected'); return; }
    if (f.protoVer !== PROTO_VER) { fail(ws, 'proto_mismatch'); ws.close(); return; }
    let identity;
    try { identity = contacts.login(f.memberId, f.contactToken, f.nickname, f.character); }
    catch (e) { fail(ws, e.message === 'identity_invalid' ? e.message : 'server_error'); ws.close(); return; }
    ws.memberId = identity.id;
    ws.nickname = clampText(f.nickname, NICK_MAX) || '匿名';
    ws.avatarHash = typeof f.avatarHash === 'string' ? f.avatarHash.slice(0, 32) : undefined;
    ws.hello = true;
    ws.pairDialogue = f.pairDialogue === 1 ? 1 : 0;
    ws.companionChat = f.companionChat === 1 ? 1 : 0;
    send(ws, {t:'hello:ack', social:1, contacts:1, garden:1, petting:2, memberId:ws.memberId, contactToken:identity.token, serverTime:Date.now()});
    notifyContacts();
  },
  'contacts:get'(ws, f) { if (typeof f.character === 'string' && contacts.people[ws.memberId].character !== clampText(f.character,32)) { contacts.transaction(()=>{contacts.people[ws.memberId].character=clampText(f.character,32);}); notifyContacts(); } ws.contactsSubscribed = true; send(ws, {t:'contacts:snapshot', ...contactSnapshot(ws)}); },
  'garden:request'(ws,f){
    try {
      if(f.action==='pair:line'){send(ws,{t:'garden:result',ok:pairDialogue.answer(ws,f)});return;}
      if(f.action==='pair:invite'||f.action==='pair:answer'){
        const result=handleGardenInteraction(ws,f);send(ws,{t:'garden:result',...result});return;
      }
      if(f.action==='coop'&&['share','invite'].includes(f.command))requireGardenShare(ws,f);
      if(f.action==='coop'&&f.command==='invite'){
        if(!contacts.areFriends(ws.memberId,f.target))throw Error('请选择已确认的游戏好友');

      }
      const result=gardens.handle(ws.memberId,{...f,realm:ws.roomId??'garden'});
      if(f.action==='coop'&&f.command==='invite'){
        const p=result.visit.plots[f.plot];
        for(const [key,i] of gardenInvites)if(i.expiresAt<Date.now()||i.from===ws.memberId&&i.to===f.target&&i.plant===p.id)gardenInvites.delete(key);
        gardenInvites.set(randomBytes(16).toString('hex'),{from:ws.memberId,to:f.target,plant:p.id,plot:f.plot,label:`${gardenCore.SPECIES[p.species].name} · ${gardenCore.needsReveal(p)?'？ ？ ？':p.traits.map(t=>gardenCore.TRAITS[t].name+'（'+gardenCore.TIER_NAMES[gardenCore.TRAITS[t].tier]+'）').join(' / ')}`,expiresAt:Date.now()+3600000});
        noteChatSent(ws,`garden:${f.owner}:${f.plot}`);notifyContacts();
      }
      if(f.action==='coop'&&f.command==='share'){
        const p=result.visit.plots[f.plot],text=`[培育:${ws.memberId}:${f.plot}] ${gardenCore.SPECIES[p.species].name} · ${gardenCore.needsReveal(p)?'？ ？ ？':p.traits.map(t=>gardenCore.TRAITS[t].name+'（'+gardenCore.TIER_NAMES[gardenCore.TRAITS[t].tier]+'）').join(' / ')} · 一起培育，好奖励概率更高`;
        const existing=worldChat.find(m=>m.garden?.plant===p.id&&m.memberId===ws.memberId);
        const msg={id:existing?.id??genId(12),memberId:ws.memberId,nickname:ws.nickname,text,at:Date.now(),garden:{owner:ws.memberId,plot:f.plot,plant:p.id}};
        worldChat=[...worldChat.filter(m=>m.id!==msg.id),msg].slice(-CHAT_KEEP);noteChatSent(ws,text);worldBroadcast({t:'world:chat',msg});
      }
      refreshGardenCards();
      send(ws,{t:'garden:result',...result});
    }
    catch(e){send(ws,{t:'garden:result',ok:false,error:e.message});}
  },
  'contacts:change'(ws, f) {
    if (!contactRate(ws)) return;
    try { contacts.change(ws.memberId, f.id, f.action); }
    catch(e) { fail(ws, /^contact|^request|^already|^bad_frame/.test(e.message) ? e.message : 'server_error'); return; }
    companions?.contactChanged(ws.memberId,f.id,f.action);
    send(ws, {t:'contacts:ack'}); notifyContacts();
  },
  'contacts:invite'(ws, f) {
    if (!contactRate(ws)) return;
    const room = rooms.get(ws.roomId);
    if (!room || !contacts.areFriends(ws.memberId, f.id)) { fail(ws, 'invite_unavailable'); return; }
    const companion=companions?.peers.find(p=>p.memberId===f.id);
    if(companion){
      if(room.banned.includes(f.id)){fail(ws,'invite_unavailable');return;}
      if(occupiedCount(room.roomId)>=room.capacity){fail(ws,'room_full');return;}
      if(pairBusy.get(f.id)>Date.now()){fail(ws,'companion_busy');return;}
      try{companions.inviteToRoom(companion,ws);}catch(e){fail(ws,e.message);return;}
      send(ws,{t:'contacts:ack'});return;
    }
    const targets = [...wss.clients].filter(p => p.memberId === f.id && p.hello && p.readyState === p.OPEN);
    if (!targets.length) { fail(ws, 'contact_offline'); return; }
    if (occupiedCount(room.roomId) >= room.capacity) { fail(ws, 'room_full'); return; }
    for (const [id, invite] of contactInvites) if (invite.expiresAt < Date.now() || invite.from === ws.memberId && invite.to === f.id) contactInvites.delete(id);
    const id = randomBytes(16).toString('hex');
    contactInvites.set(id, {from:ws.memberId, to:f.id, roomId:room.roomId, expiresAt:Date.now()+120000});
    send(ws, {t:'contacts:ack'}); notifyContacts();
  },
  'contacts:invitation'(ws, f) {
    const garden= gardenInvites.get(f.id);
    if(garden){
      if(garden.to!==ws.memberId||garden.expiresAt<Date.now()||!contacts.areFriends(garden.from,ws.memberId)){fail(ws,'invite_expired');return;}
      if(f.action==='dismiss')gardenInvites.delete(f.id);
      send(ws,{t:'contacts:ack',garden:{owner:garden.from,plot:garden.plot}});notifyContacts();return;
    }
    const invitation = contactInvites.get(f.id);
    if (!invitation || invitation.to !== ws.memberId) { fail(ws, 'invite_expired'); return; }
    if (f.action === 'dismiss') { contactInvites.delete(f.id); send(ws, {t:'contacts:ack'}); notifyContacts(); return; }
    const inviter = [...wss.clients].find(p => p.memberId === invitation.from && p.roomId === invitation.roomId && p.readyState === p.OPEN);
    if (f.action !== 'accept' || !inviter || invitation.expiresAt < Date.now() || !contacts.areFriends(invitation.from, ws.memberId)) { fail(ws, 'invite_expired'); return; }
    const room = rooms.get(invitation.roomId);
    if (!room || room.banned.includes(ws.memberId) || occupiedCount(room.roomId) >= room.capacity && ws.roomId !== room.roomId) { fail(ws, 'invite_unavailable'); return; }
    // Joining is explicit; normal join enforces capacity and bans again on arrival.
    send(ws, {t:'contacts:ack', roomId:room.roomId});
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
      ...roomMeta(f),
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

    if (ws.roomId !== room.roomId && occupiedCount(room.roomId) >= room.capacity) {
      fail(ws, 'room_full');
      return;
    }
    if (ws.roomId === room.roomId) { send(ws, { t: 'joined', room: roomSnapshot(room), chat: room.chat }); return; }
    if (ws.roomId) leaveRoom(ws);
    ws.roomId = room.roomId;
    ws.mode = ws.mode || 'idle';
    if (!online.has(room.roomId)) online.set(room.roomId, new Set());
    online.get(room.roomId).add(ws);
    const member = upsertMember(room, ws);
    ws.hasChatted = false;
    contacts.transaction(() => { for (const p of online.get(room.roomId)) contacts.meet(ws.memberId, p.memberId); });
    notifyContacts();
    // 进房带回最近 50 条聊天（spec §5.1「能看到最近的」）
    send(ws, { t: 'joined', room: roomSnapshot(room), chat: room.chat });
    broadcast(room.roomId, {
      t: 'member:in',
      roomId: room.roomId,
      member: {
        ...member,
        online: true,
        mode: ws.mode,
        action: ws.action,
        sign: ws.sign,
        packHash: ws.packHash,
      },
    }, ws);
    companions?.joined(ws);
  },

  leave(ws) {
    leaveRoom(ws);
  },

  // 应用层心跳。客户端跑的是 Node 内置全局 WebSocket（undici 的 WHATWG 实现），
  // 那个 API 没有协议层 ping/pong（服务端 ping 被 undici 自动回 pong，但对 JS 不可见），
  // 客户端只能靠「发一帧收一帧」验证双向链路。不认识这帧的旧服务端会回
  // bad_frame 错误帧——那也是一帧，同样能证明链路活着，所以客户端兼容两种回法。
  ping(ws) {
    send(ws, { t: 'pong' });
  },

  presence(ws, f) {
    if (!ws.roomId) return;
    ws.mode = typeof f.mode === 'string' ? f.mode.slice(0, 16) : 'idle';
    ws.action = typeof f.action === 'string' ? f.action.slice(0, 32) : undefined;
    ws.sign = clampText(f.sign, 60) || undefined;
    // 牌面是用户当前可见内容，透明同步；未显示在牌面上的 agent/工程信息仍不进入协议。
    broadcast(ws.roomId, {
      t: 'presence',
      roomId: ws.roomId,
      memberId: ws.memberId,
      mode: ws.mode,
      action: ws.action,
      sign: ws.sign,
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
    ws.character = {name:'伙伴',persona:''};
    if(hash&&packs.has(hash))try{ws.character=characterProfile(readFileSync(packPath(hash)));}catch{}
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

  petting(ws, f) {
    const room=rooms.get(ws.roomId);
    if(!room || f.roomId!==ws.roomId){fail(ws,'not_in_room');return;}
    if(room.chatEnabled===false){fail(ws,'chat_disabled');return;}
    const target=[...(online.get(ws.roomId)||[])].find(p=>p.memberId===f.target);
    if(!target){fail(ws,'not_in_room');return;}
    const now=Date.now();
    const phase=f.phase??'start';
    if(!['start','keep','end'].includes(phase)){fail(ws,'invalid_request');return;}
    if(phase!=='start'){
      const active=ws.petSession;
      if(!active||active.room!==ws.roomId||active.target!==f.target||now-active.at>2000){fail(ws,'not_in_room');return;}
      if(phase==='keep'&&now-active.at<350){send(ws,{t:'social:ack'});return;}
      if(phase==='end')ws.petSession=null;else active.at=now;
      send(ws,{t:'social:ack'});
      broadcast(ws.roomId,{t:'petting',roomId:ws.roomId,target:target.memberId,phase});return;
    }
    room.petTimes ??= {};
    for(const [id,at] of Object.entries(room.petTimes))if(now-at>=8000)delete room.petTimes[id];
    if(now-(room.petTimes[ws.memberId]??0)<8000){fail(ws,'rate_limited');return;}
    room.petTimes[ws.memberId]=now;
    ws.petSession={room:ws.roomId,target:target.memberId,at:now};
    const text=target.memberId===ws.memberId?ws.nickname+'摸了摸自己的桌宠。':ws.nickname+'轻轻摸了摸'+target.nickname+'，'+target.nickname+'开心地蹭了蹭小手。';
    const msg={id:genId(12),memberId:ws.memberId,nickname:ws.nickname,text,at:now,interaction:'petting'};
    room.chat=[...room.chat,msg].slice(-CHAT_KEEP);room.lastActiveAt=now;dirty=true;
    send(ws,{t:'social:ack'});
    broadcast(ws.roomId,{t:'chat',roomId:ws.roomId,msg});
    broadcast(ws.roomId,{t:'petting',roomId:ws.roomId,target:target.memberId});
  },
  chat(ws, f) {
    if (!ws.roomId) { fail(ws, 'not_in_room'); return; }
    const room = rooms.get(ws.roomId);
    if (!room) { fail(ws, 'room_not_found'); return; }
    const text = clampText(f.text, CHAT_MAX);
    if (!text) { fail(ws, 'empty_message'); return; }
    if (room.chatEnabled === false) { fail(ws, 'chat_disabled'); return; }
    if (f.roomId && f.roomId !== ws.roomId) { fail(ws, 'not_in_room'); return; }
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
    ws.hasChatted = true;
    contacts.transaction(() => { for (const p of online.get(ws.roomId) || []) if (p.hasChatted) contacts.meet(ws.memberId, p.memberId, true); });
    notifyContacts();
    room.chat.push(msg);
    if (room.chat.length > CHAT_KEEP) room.chat = room.chat.slice(-CHAT_KEEP);
    room.lastActiveAt = msg.at;
    dirty = true;
    send(ws, { t: 'social:ack' });
    broadcast(ws.roomId, { t: 'chat', roomId: ws.roomId, msg }); // 含发送者：以服务端 id/时间为准
    companions?.heard(ws,text);
  },

  'chat:delete'(ws, f) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    const id = String(f.id || '');
    const i = room.chat.findIndex((c) => c.id === id);
    if (i < 0) { fail(ws, 'message_not_found'); return; }
    // 只能删自己的（房主也不能删别人的话——踢人是另一回事）
    if (room.chat[i].memberId !== ws.memberId) { fail(ws, 'not_yours'); return; }
    room.chat.splice(i, 1);
    dirty = true;
    broadcast(ws.roomId, { t: 'chat:deleted', roomId: ws.roomId, id });
    send(ws, {t:'social:ack'});
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
    if (!msg) { fail(ws, 'message_not_found'); return; }
    if (msg.memberId === ws.memberId) return; // 举报自己没意义
    room.reports = Array.isArray(room.reports) ? room.reports : [];
    // 同一人对同一条只算一次
    if (room.reports.some((r) => r.msgId === id && r.by === ws.memberId)) { send(ws, {t:'social:ack'}); return; }
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
    send(ws, { t: 'social:ack', id });
  },

  wave(ws, f) {
    if (!ws.roomId) return;
    const target = String(f.targetMemberId || '');
    const peers = online.get(ws.roomId);
    if (!peers) return;
    for (const p of peers) {
      if (p.memberId === target) {
        if (!contactRate(ws)) return;
        contacts.transaction(() => contacts.meet(ws.memberId, p.memberId, true)); notifyContacts();
        send(p, { t: 'wave', roomId: ws.roomId, fromMemberId: ws.memberId, fromNickname: ws.nickname });
        break;
      }
    }
  },

  'room:update'(ws, f) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (f.token !== room.ownerToken) { fail(ws, 'not_owner'); return; }
    if (f.roomId && f.roomId !== ws.roomId) { fail(ws, 'not_in_room'); return; }
    if (f.capacity !== undefined) {
      if (!Number.isInteger(f.capacity) || f.capacity < Math.max(CAPACITY_MIN, occupiedCount(room.roomId)) || f.capacity > CAPACITY_MAX) { fail(ws, 'bad_capacity'); return; }
      room.capacity = f.capacity;
    }
    if (typeof f.description === 'string') room.description = clampText(f.description, 200);
    if (typeof f.language === 'string') room.language = roomMeta(f).language;
    if (typeof f.chatEnabled === 'boolean') room.chatEnabled = f.chatEnabled;
    if (typeof f.name === 'string') room.name = clampText(f.name, NAME_MAX) || room.name;
    if (ROOM_KINDS.has(f.kind)) room.kind = f.kind;
    if (typeof f.listed === 'boolean') room.listed = f.listed;
    dirty = true;
    broadcast(room.roomId, { t: 'room:updated', room: roomSnapshot(room) });
    send(ws, {t:'social:ack'});
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

const contacts = new Contacts(path.join(DATA_DIR, 'contacts.json'));
const gardens = new Gardens(path.join(DATA_DIR,'gardens.json'),contacts);
function refreshGardenCards(){
  for(const msg of worldChat){if(!msg.garden)continue;const t=gardens.data.tasks[msg.garden.plant];if(!t)continue;
    const members=Object.entries(t.members).map(([id,m])=>({name:contacts.people[id]?.nickname??'伙伴',qualified:m.seconds>=gardenCore.COOP_RULES.minSeconds&&m.work>=gardenCore.COOP_RULES.work*gardenCore.COOP_RULES.minContribution}));
    const qualified=members.filter(m=>m.qualified).length,remaining=Math.ceil(t.remaining/360),active=Object.values(t.members).filter(m=>m.seenAt+15000>Date.now()).length;
    const fruit=t.fruit??gardens.data.people[t.owner]?.state.plots[t.plot];const state={owner:t.owner,plot:t.plot,plant:t.plant,species:fruit?gardenCore.SPECIES[fruit.species].name:undefined,traits:t.done&&fruit?.id===t.plant?fruit.traits.map(id=>({name:gardenCore.TRAITS[id].name,quality:gardenCore.TIER_NAMES[gardenCore.TRAITS[id].tier]})):[],done:t.done,remaining,active,members,chance:gardenCore.coopRareChance(qualified),room:t.room,fruit:t.fruit};
    if(JSON.stringify(msg.garden)===JSON.stringify(state))continue;msg.garden=state;worldBroadcast({t:'world:chat',msg});
  }
}
const gardenShareTimes=new Map();
function requireGardenShare(ws,f){const key=ws.memberId+':'+f.plot+':'+f.command+':'+(f.target??'');const now=Date.now();if(now-(gardenShareTimes.get(key)??0)<30000)throw Error('这颗果实刚刚邀请过，30秒后可以再次邀请');gardenShareTimes.set(key,now);for(const [k,at] of gardenShareTimes)if(now-at>60000)gardenShareTimes.delete(k);const reason=checkChatLimit(ws,`garden:${f.owner}:${f.plot}`);if(reason)throw Error('分享太快了，请稍后再试');}
function handleGardenInteraction(ws,f){
  const now=Date.now();
  for(const [id,i] of pairInvites)if(i.expiresAt<=now)pairInvites.delete(id);
  for(const [id,until] of pairBusy)if(until<=now)pairBusy.delete(id);
  const peerFor=id=>[...wss.clients,...(companions?.peers??[])].find(p=>p.memberId===id&&p.hello&&p.readyState===p.OPEN&&p.roomId===ws.roomId);
  if(f.action==='pair:invite'){
    const kind=gardenCore.PAIR_INTERACTIONS.find(k=>k.id===f.kind),peer=peerFor(f.target);
    if(!kind||!ws.roomId||!peer||peer===ws)throw Error('请邀请同一房间内的在线玩家');
    if(pairBusy.get(ws.memberId)>now||pairBusy.get(peer.memberId)>now)throw Error('正在互动，请稍后再试');
    if(checkChatLimit(ws,`pair:${f.target}:${f.kind}`))throw Error('邀请太快了，请稍后再试');
    if([...pairInvites.values()].filter(i=>i.from===ws.memberId).length>=5)throw Error('请等待之前的邀请回复');
    const state=gardens.handle(ws.memberId,{action:'get',actor:f.actor}).state;
    const growth=state.life.characters[state.activeActor];if(!growth)throw Error('请先选择角色');
    const required=gardenCore.CHARACTER_UNLOCKS.find(k=>k.kind===f.kind)?.level??1;
    if(gardenCore.characterLevel(growth.xp)<required)throw Error(`角色达到 Lv.${required} 才能发起${kind.label}`);
    const id=randomBytes(16).toString('hex');pairInvites.set(id,{from:ws.memberId,to:peer.memberId,roomId:ws.roomId,actor:f.actor,kind:f.kind,label:kind.label,expiresAt:now+120000});
    noteChatSent(ws,`pair:${f.target}:${f.kind}`);notifyContacts();return {ok:true,invitation:id};
  }
  const invite=pairInvites.get(f.id);
  if(!invite||invite.to!==ws.memberId||typeof f.accept!=='boolean')throw Error('邀请已失效');
  if(!f.accept){pairInvites.delete(f.id);notifyContacts();return {ok:true};}
  if(invite.kind==='relay'&&!['happy','heart','wave'].includes(f.response))throw Error('请选择一种接力回应');
  const host=peerFor(invite.from);
  if(!host||!ws.roomId||ws.roomId!==invite.roomId)throw Error('双方需要在原来的房间内');
  if(pairBusy.get(ws.memberId)>now||pairBusy.get(host.memberId)>now)throw Error('正在互动，请稍后再试');
  const state=gardens.handle(ws.memberId,{action:'get',actor:f.actor}).state;
  if(!state.activeActor)throw Error('请先选择角色');
  if(gardens.data.people[host.memberId]?.state.activeActor!==invite.actor)throw Error('对方已更换角色，请重新邀请');
  pairInvites.delete(f.id);notifyContacts();
  const beats=gardenCore.pairBeats(invite.kind);if(invite.kind==='relay'){const response=['happy','heart','wave'].includes(f.response)?f.response:'happy';beats[1]={...beats[1],guest:response,caption:response==='heart'?'送你一个小心心！':response==='wave'?'嗨，我接住啦！':'开心接住！轮到我啦！'};}
  for(const [who,other] of [[ws.memberId,host.memberId],[host.memberId,ws.memberId]])gardens.transaction(()=>gardenCore.recordGarden(gardens.data.people[who].state,now,'interaction','一起玩了'+invite.label,other));
  const until=now+30000+beats.length*4500;
  pairBusy.set(ws.memberId,until);pairBusy.set(host.memberId,until);
  const epochs=[host.pairEpoch,ws.pairEpoch],packs=[host.packHash,ws.packHash];
  const valid=()=>[host,ws].every((p,i)=>p.readyState===p.OPEN&&p.roomId===invite.roomId&&p.pairEpoch===epochs[i]&&p.packHash===packs[i])&&
    gardens.data.people[host.memberId]?.state.activeActor===invite.actor&&gardens.data.people[ws.memberId]?.state.activeActor===f.actor;
  const play=(beat,step)=>{
    if(!valid())return;
    const speaker=beat.speaker==='host'?host:ws, room=rooms.get(invite.roomId);
    if(room&&room.chatEnabled!==false){
      const msg={id:genId(12),memberId:speaker.memberId,nickname:speaker.nickname,companion:!!speaker.companion,speaker:'character',characterName:speaker.character?.name||'伙伴',pairSession:f.id,text:beat.caption,at:Date.now()};
      room.chat=[...room.chat,msg].slice(-CHAT_KEEP);dirty=true;
      broadcast(room.roomId,{t:'chat',roomId:room.roomId,msg});
    }
    for(const [peer,actor,intent] of [[host,invite.actor,beat.host],[ws,f.actor,beat.guest]])
      peer.send(JSON.stringify({t:'garden:interaction',roomId:invite.roomId,kind:invite.kind,actor,intent,step,partner:peer===host?ws.memberId:host.memberId,caption:beat.caption,effect:beat.effect,session:f.id,recipient:peer!==host,lines:beats.map(b=>b.caption)}));
  };
  void pairDialogue.prepare({host,guest:ws,actor:invite.actor,guestActor:f.actor,kind:invite.kind,beats,valid}).then(lines=>{
    if(!lines){for(const peer of [host,ws])if(pairBusy.get(peer.memberId)===until)pairBusy.delete(peer.memberId);return;}
    beats.forEach((beat,i)=>{beat.caption=lines[i];});
    const ends=Date.now()+beats.length*4500;
    pairBusy.set(ws.memberId,ends);pairBusy.set(host.memberId,ends);
    beats.forEach((beat,i)=>{if(!i)play(beat,i);else setTimeout(()=>play(beat,i),i*4500).unref();});
  }).catch(()=>{});
  return {ok:true};
}
const contactInvites = new Map();
function contactRate(ws) {
  const now=Date.now(); ws.contactTimes=(ws.contactTimes||[]).filter(t=>now-t<60000);
  if(ws.contactTimes.length>=30){fail(ws,'rate_limited');return false;}
  ws.contactTimes.push(now);return true;
}
function contactSnapshot(ws) {
  const onlineIds=new Set([...wss.clients,...(companions?.peers??[])].filter(p=>p.hello&&p.readyState===p.OPEN).map(p=>p.memberId));
  const invitations=[...contactInvites].filter(([,v])=>v.to===ws.memberId&&v.expiresAt>Date.now()&&contacts.areFriends(v.from,v.to)).map(([id,v])=>({id, nickname:contacts.people[v.from]?.nickname||'朋友', expiresAt:v.expiresAt}));
  for(const [id,i] of gardenInvites)if(i.to===ws.memberId&&i.expiresAt>Date.now()&&contacts.areFriends(i.from,i.to))invitations.push({id,nickname:contacts.people[i.from]?.nickname||'朋友',expiresAt:i.expiresAt,garden:{owner:i.from,plot:i.plot,label:i.label,plant:i.plant}});
  for(const [id,i] of pairInvites)if(i.to===ws.memberId&&i.roomId===ws.roomId&&i.expiresAt>Date.now())invitations.push({id,nickname:contacts.people[i.from]?.nickname||'朋友',expiresAt:i.expiresAt,pair:{kind:i.kind,label:i.label}});
  return {people:contacts.snapshot(ws.memberId,onlineIds), invitations};
}
function notifyContacts() {
  for(const p of wss.clients) if(p.hello&&p.contactsSubscribed&&p.readyState===p.OPEN) {
    // Push events must not inherit a previous request's correlation id.
    p.send(JSON.stringify({t:'contacts:snapshot',...contactSnapshot(p)}));
  }
}
load();
loadPacks();

const wss = new WebSocketServer({ host: HOST, port: PORT, maxPayload: MAX_PAYLOAD });
let companions;
let companionTimer;
if(process.env.QBOT_COMPANIONS==='1'){
  try{
    companions=new Companions({file:path.join(DATA_DIR,'companions.json'),marketDir:process.env.QBOT_COMPANION_MARKET_DIR||path.resolve('market/data'),contacts,gardens,
      installPack(hash,buffer){writeFileSync(packPath(hash),buffer);packs.set(hash,{size:buffer.length,at:Date.now()});}});
    companions.start();
    for(const room of companions.rooms){if(rooms.has(room.roomId))throw Error('companion room collision');rooms.set(room.roomId,room);online.set(room.roomId,new Set(companions.peers.filter(p=>p.roomId===room.roomId)));}
    companions.hasHumans=id=>[...(online.get(id)??[])].some(p=>!p.companion);
    companions.animate=(peer,frame)=>{
      const patterns={wave:/wave|挥手/,heart:/heart|love|比心/,tea:/tea|drink|喝茶/,talk:/talk|chat|聊天/,listen:/idle|listen/,happy:/happy|wave/};
      const action=peer.actions.find(a=>patterns[frame.intent]?.test(a.label))?.id??peer.action;
      broadcast(peer.roomId,{t:'presence',roomId:peer.roomId,memberId:peer.memberId,mode:'idle',action});
    };
    const speaking=new Set();
    const say=(peer,topic,world=false)=>{void (async()=>{
      const room=rooms.get(peer.roomId);if(!room||!world&&room.chatEnabled===false)return;
      if(speaking.has(room.roomId))return;
      const client=[...(online.get(room.roomId)??[])].find(p=>!p.companion&&p.companionChat===1&&p.readyState===p.OPEN);
      if(!client)return;
      const valid=()=>client.readyState===client.OPEN&&client.roomId===room.roomId&&peer.roomId===room.roomId&&(world||room.chatEnabled!==false);
      speaking.add(room.roomId);
      let text;try{text=await pairDialogue.userChat({peer:client,companion:peer,topic,history:room.chat.slice(-6).map(m=>`${m.speaker==='character'?'角色 '+(m.characterName||'伙伴'):'用户 '+m.nickname}：${m.text}`),valid});}finally{speaking.delete(room.roomId);}
      if(!text||!valid())return;
      const msg={id:genId(12),memberId:peer.memberId,nickname:peer.nickname,companion:true,speaker:'user',text,at:Date.now()};
      if(world){worldChat=[...worldChat,msg].slice(-CHAT_KEEP);worldBroadcast({t:'world:chat',msg});}
      else{room.chat=[...room.chat,msg].slice(-CHAT_KEEP);room.lastActiveAt=msg.at;broadcast(room.roomId,{t:'chat',roomId:room.roomId,msg});}
    })().catch(()=>{});};
    companions.say=say;
    companionTimer=setInterval(()=>{try{companions.tick({humans:[...wss.clients].filter(p=>p.hello),worldActive:worldPeers.size>0,say,pending:pairInvites,notifyContacts,moveCompanion,
      invite:(peer,user,kind)=>handleGardenInteraction(peer,{action:'pair:invite',target:user.memberId,actor:peer.actor,kind}),
      answer:(peer,id)=>handleGardenInteraction(peer,{action:'pair:answer',id,accept:true,actor:peer.actor,response:'happy'})});}catch{console.error('[companions] tick failed');}},1000);
    companionTimer.unref();console.log(`[companions] residents=${companions.peers.length} rooms=${companions.rooms.length}`);
  }catch(error){for(const room of companions?.rooms??[])if(rooms.get(room.roomId)?.companion){rooms.delete(room.roomId);online.delete(room.roomId);}companions=undefined;console.error('[companions] unavailable:',error.message);}
}

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
    ws.requestId = typeof frame?.requestId === 'string' ? frame.requestId.slice(0, 80) : undefined;
    const handler = Object.hasOwn(handlers, frame?.t) ? handlers[frame.t] : null;
    if (!handler) { fail(ws, 'bad_frame'); return; }
    // hello 之前只允许 hello：memberId/nickname 是后续一切帧的前提
    if (!ws.hello && frame.t !== 'hello') { fail(ws, 'need_hello'); return; }
    try {
      handler(ws, frame);
      ws.requestId = undefined;
    } catch (err) {
      console.error(`[rooms] handler ${frame.t} failed:`, err.message); // 不打帧内容
      fail(ws, 'server_error');
    }
  });

  ws.on('close', () => {
    if(ws.memberId)try{gardens.disconnect(ws.memberId);}catch{console.error('[garden] disconnect save failed');}
    ws.contactsSubscribed = false;
    worldPeers.delete(ws);
    leaveRoom(ws);
    notifyContacts();
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
  clearInterval(companionTimer);
  clearInterval(pinger);
  clearInterval(flusher);
  flush(); // 退出前落盘，别丢最后 30s 的聊天
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

wss.on('listening',()=>console.log(`[rooms] listening on ${HOST}:${PORT}  data=${DATA_FILE}`));
