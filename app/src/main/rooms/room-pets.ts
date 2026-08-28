/**
 * 公共房间的宠上屏（2026-08-24）：角色包分发 + 成员宠状态。
 *
 * 分发模型是**服务端缓存**（rooms/server.mjs 的 packs/）：join 后把本机角色包
 * 上传一次（pack:have -> pack:put 分块），房友的包按需从服务端拉
 * （pack:get -> pack:begin/chunk 重组），本地缓存 `.peer-<hash>/`。
 * 为什么不是 P2P 盲转（1v1 的老路）：12 人房里发送方要为每个接收方重传一遍
 * （11 × 12MB 上行），而且晚进房的人赶不上发送方在线窗口。
 *
 * 隐私：包内容经 asset-pack sanitize（persona 剥离，有测试守着）；
 * `roomsShowMyPet` 关 = 不上传不播报，房友只见缩略图。
 *
 * 本模块只管状态与分发；窗口开合/布局/推送由 onRoomPetEvent 订阅方负责（M2）。
 * 纯状态机风格：网络应答都从 handlePackFrame / handlePackError 回来，不做 await 链。
 */
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { ChunkAssembler, chunkToBase64, packCharacterDir, unpackCharacter } from '../asset-pack';
import { charactersDir } from '../characters';
import { getSettings } from '../config';
import type { LinkPeerCharacter, RoomMember, RoomSnapshot } from '../../shared/ipc-types';
import { PACK_HASH_RE, selectPruneTargets } from './rooms-rules';

/** .peer- 缓存目录保留的包数上限（~12MB/个，超了删最旧的；在用包永不删） */
const PEER_CACHE_KEEP = 4;
/** pack:not_found 重试（对端可能还没传完自己的包） */
const NOT_FOUND_RETRY_MAX = 5;
const NOT_FOUND_RETRY_MS = 3_000;
/** 上传块间限速（同 1v1 老链路：别把小 VPS 冲爆） */
const PUT_DELAY_MS = 5;
/** 进度推送节流：每收 N 块推一次（64KB/块 -> 约每 0.5MB 一次） */
const PROGRESS_EVERY = 8;

const PEER_CACHE_PREFIX = '.peer-';

/** 帧的最小形状（与 rooms.ts 内部 Frame 类型结构一致，避免互相 import 出循环依赖） */
type OutFrame = { t: string } & Record<string, unknown>;

/** rooms.ts 注入的出帧口（room-pets 不持连接，避免与 rooms.ts 循环依赖） */
let sendFrame: ((frame: OutFrame) => void) | null = null;

export function setRoomsSend(fn: (frame: OutFrame) => void): void {
  sendFrame = fn;
}

// ── 事件（窗口层订阅）──────────────────────────────────────

export type RoomPetEvent =
  | { kind: 'roomJoined' }
  | { kind: 'memberIn'; member: RoomMember }
  | { kind: 'memberOut'; memberId: string }
  | { kind: 'character'; memberId: string; nickname: string; character: LinkPeerCharacter }
  | { kind: 'progress'; memberId: string; received: number; total: number }
  | { kind: 'presence'; memberId: string; mode?: string; action?: string }
  | { kind: 'chat'; memberId: string; nickname: string; text: string }
  | { kind: 'packFailed'; memberId: string; nickname: string }
  | { kind: 'roomLeft' };

const listeners: Array<(e: RoomPetEvent) => void> = [];

export function onRoomPetEvent(cb: (e: RoomPetEvent) => void): void {
  listeners.push(cb);
}

function emit(e: RoomPetEvent): void {
  for (const cb of listeners) {
    try {
      cb(e);
    } catch (err) {
      console.error('[room-pets] listener failed:', err); // 单个订阅者炸了不拖累其他
    }
  }
}

// ── 本机包（上传侧）────────────────────────────────────────

/** 本机当前角色包指纹；null = 尚未打包（不在房/开关关闭/打包失败） */
let localPackHash: string | null = null;
/** 本机包已确认在服务端（put:ok / have:ack cached），换房重连免传 */
let localPackOnServer = false;
/** 上一次播报出去的 hash（announce 去重） */
let announcedHash: string | null = null;
let uploading = false;
/** pack:have 未命中时要传的包体（have:ack 回来才动它） */
let pendingUploadBuffer: Buffer | null = null;
/**
 * 同步重入锁：announceLocalPack 第一个 await（getSettings）落地前，
 * uploading/pendingUploadBuffer 都还是旧值——onJoinedRoom 一次进房对多个
 * 在线成员循环调 onMemberIn 会在同一轮同步代码里把这个函数触发多次。
 */
let announcing = false;

/**
 * 打包并播报本机角色。房里只有自己时不传（白占带宽），等有人进来再补。
 */
async function announceLocalPack(): Promise<void> {
  if (!myMemberId) return; // 不在房：等 onJoinedRoom 触发（角色激活可能早于进房）
  if (uploading || pendingUploadBuffer || announcing) return; // 上一轮还在途：别插队
  announcing = true;
  try {
    const { activeCharacter, roomsShowMyPet } = await getSettings();
    if (!activeCharacter || roomsShowMyPet === false) return;
    const packed = await packCharacterDir(path.join(charactersDir(), activeCharacter));
    localPackHash = packed.hash;
    if (localPackOnServer && announcedHash === packed.hash) {
      sendFrame?.({ t: 'pack:announce', hash: packed.hash });
      return;
    }
    pendingUploadBuffer = packed.buffer; // have:ack 未命中 -> startUpload 用
    sendFrame?.({ t: 'pack:have', hash: packed.hash });
  } catch (err) {
    console.error('[room-pets] pack local character failed:', err); // 打包失败不阻断房间功能
    localPackHash = null;
    pendingUploadBuffer = null;
  } finally {
    announcing = false; // 之后的重入交给 uploading/pendingUploadBuffer 卫住
  }
}

async function startUpload(hash: string, buffer: Buffer): Promise<void> {
  const chunks = chunkToBase64(buffer);
  uploading = true;
  try {
    for (let seq = 0; seq < chunks.length; seq++) {
      if (!uploading || !sendFrame) return; // 断开/收场/提前 put:ok：放弃余块
      sendFrame({ t: 'pack:put', hash, seq, total: chunks.length, data: chunks[seq] });
      await new Promise((r) => setTimeout(r, PUT_DELAY_MS));
    }
  } finally {
    uploading = false;
  }
}

/** 角色切换钩子（托盘/IPC 激活入口调用）：重新打包播报。
 *  不再 gate 在 myMemberId 上——announceLocalPack 自己判「不在房先等」，
 *  这样进房/角色激活无论谁先谁后，后到的事件都会把播报补上（启动竞态）。 */
export function notifyRoomCharacterChanged(): void {
  localPackOnServer = false; // 新包服务端大概率没有
  announcedHash = null;
  void announceLocalPack();
}

// ── 成员包（下载侧）────────────────────────────────────────

interface MemberState {
  nickname: string;
  hash: string;
  /** 就位的角色（本地缓存命中或下载完成）；null = 还在路上 */
  character: LinkPeerCharacter | null;
  /** 最近一次在场状态（窗口启动自取快照用；同 1v1 peerState 缓存的思路） */
  mode?: string;
  action?: string;
}

interface DownloadState {
  assembler: ChunkAssembler;
  /** pack:begin 带回的总块数（chunk 帧不带，靠这里补全） */
  total: number;
  retries: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
}

/** memberId -> 状态（只含在线且要上屏的成员） */
const memberStates = new Map<string, MemberState>();
/** hash -> 下载（同一 hash 多人共用：同预设角色的朋友会撞 hash） */
const downloads = new Map<string, DownloadState>();
/** 下载队列：一次只拉一个（串行；服务端单连接也只允许一个下载流） */
const downloadQueue: string[] = [];
let activeDownloadHash: string | null = null;
/** 进房时记下的自己（memberId）；null = 不在房 */
let myMemberId: string | null = null;
export { myMemberId, memberStates };

function peerCacheDir(hash: string): string {
  return path.join(charactersDir(), `${PEER_CACHE_PREFIX}${hash}`);
}

function emitProgress(hash: string): void {
  const dl = downloads.get(hash);
  if (!dl) return;
  for (const [memberId, m] of memberStates) {
    if (m.hash === hash && !m.character) {
      emit({ kind: 'progress', memberId, received: dl.assembler.received, total: dl.total });
    }
  }
}

function emitCharacter(hash: string, character: LinkPeerCharacter): void {
  for (const [memberId, m] of memberStates) {
    if (m.hash === hash && !m.character) {
      m.character = character;
      emit({ kind: 'character', memberId, nickname: m.nickname, character });
    }
  }
}

/** 要某个成员的包：本地缓存命中直接就位，否则排队下载（幂等） */
function ensureMemberPack(memberId: string, nickname: string, hash: string): void {
  if (!PACK_HASH_RE.test(hash)) return;
  const known = memberStates.get(memberId);
  if (known && known.hash === hash) {
    known.nickname = nickname;
    if (known.character) return;
  } else {
    memberStates.set(memberId, { nickname, hash, character: null });
  }
  const manifestPath = path.join(peerCacheDir(hash), 'manifest.json');
  if (existsSync(manifestPath)) {
    void loadCached(hash, manifestPath);
    return;
  }
  if (!downloads.has(hash) && !downloadQueue.includes(hash)) downloadQueue.push(hash);
  pumpDownloadQueue();
}

async function loadCached(hash: string, manifestPath: string): Promise<void> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    emitCharacter(hash, { dirId: `${PEER_CACHE_PREFIX}${hash}`, manifest });
  } catch {
    await rm(path.dirname(manifestPath), { recursive: true, force: true }); // 缓存损坏：删掉重下
    if (!downloads.has(hash) && !downloadQueue.includes(hash)) downloadQueue.push(hash);
    pumpDownloadQueue();
  }
}

function pumpDownloadQueue(): void {
  while (!activeDownloadHash && downloadQueue.length > 0) {
    const hash = downloadQueue.shift()!;
    // 排队期间可能已无人需要它（成员退房）
    if (![...memberStates.values()].some((m) => m.hash === hash)) continue;
    activeDownloadHash = hash;
    const timeoutTimer = setTimeout(() => {
      console.error('[room-pets] 下载超时', hash);
      finishDownload(hash);
      if (!downloadQueue.includes(hash)) downloadQueue.push(hash);
      pumpDownloadQueue();
    }, 30000);
    downloads.set(hash, { assembler: new ChunkAssembler(hash), total: 0, retries: 0, retryTimer: null, timeoutTimer });
    sendFrame?.({ t: 'pack:get', hash });
    for (const [memberId, m] of memberStates) {
      if (m.hash === hash && !m.character) {
        emit({ kind: 'progress', memberId, received: 0, total: 0 }); // 总数未知：窗口先亮「走来中」
      }
    }
    return;
  }
}

/** 下载收尾（成功/放弃）：清状态、继续队列 */
function finishDownload(hash: string): void {
  const dl = downloads.get(hash);
  if (dl?.retryTimer) clearTimeout(dl.retryTimer);
  if (dl?.timeoutTimer) clearTimeout(dl.timeoutTimer);
  downloads.delete(hash);
  if (activeDownloadHash === hash) activeDownloadHash = null;
  pumpDownloadQueue();
}

async function completeDownload(hash: string, buffer: Buffer): Promise<void> {
  // 临时目录解包 -> rename 原子就位（同 1v1 老链路，崩溃不留半包缓存）
  const dir = peerCacheDir(hash);
  const tmp = `${dir}.tmp`;
  try {
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    await unpackCharacter(buffer, tmp);
    await rm(dir, { recursive: true, force: true });
    await rename(tmp, dir);
    await prunePeerCache();
    const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
    finishDownload(hash);
    emitCharacter(hash, { dirId: `${PEER_CACHE_PREFIX}${hash}`, manifest });
    console.log(`[room-pets] pack ready: ${hash}`);
  } catch (err) {
    console.error('[room-pets] unpack failed:', err);
    await rm(tmp, { recursive: true, force: true });
    finishDownload(hash);
    emitPackFailed(hash);
  }
}

function emitPackFailed(hash: string): void {
  for (const [memberId, m] of memberStates) {
    if (m.hash === hash && !m.character) {
      emit({ kind: 'packFailed', memberId, nickname: m.nickname });
      // 失败后一段时间后重新尝试下载
      setTimeout(() => {
        if (memberStates.has(memberId) && m.hash === hash && !m.character) {
          ensureMemberPack(memberId, m.nickname, hash);
        }
      }, 5_000);
    }
  }
}

/** 只保留在用 + 最近的几个 .peer- 包（12MB/个，攒着不值；在用的永不删） */
async function prunePeerCache(): Promise<void> {
  try {
    const inUse = new Set<string>();
    for (const m of memberStates.values()) inUse.add(m.hash);
    const candidates: Array<{ name: string; mtime: number }> = [];
    for (const entry of await readdir(charactersDir(), { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith(PEER_CACHE_PREFIX)) continue;
      const hash = entry.name.slice(PEER_CACHE_PREFIX.length);
      if (inUse.has(hash)) continue;
      const manifest = path.join(charactersDir(), entry.name, 'manifest.json');
      candidates.push({ name: entry.name, mtime: existsSync(manifest) ? statSync(manifest).mtimeMs : 0 });
    }
    for (const name of selectPruneTargets(candidates, PEER_CACHE_KEEP)) {
      await rm(path.join(charactersDir(), name), { recursive: true, force: true });
    }
  } catch {
    /* 清理失败不影响主流程 */
  }
}

// ── rooms.ts 的事件入口 ────────────────────────────────────

/**
 * 进房（或换房）：登记在线成员、按需播报自己。
 * 初始在线成员复用 onMemberIn 的处理路径；自己**无论空房与否都播报**——
 * 这既让后进房的房友在快照里就拿到我的 packHash（免等待），也消掉
 * 「进空房时 activeCharacter 尚未落盘、进房后没机会再播」的启动竞态。
 * 服务端按 hash 缓存，重复进房只重发一个 announce 帧，不会重传 12MB。
 */
export function onJoinedRoom(room: RoomSnapshot, selfId: string | null): void {
  onLeftRoom(); // 换房：旧状态整体作废
  myMemberId = selfId;
  emit({ kind: 'roomJoined' });
  for (const m of room.members) {
    if (m.online) onMemberIn(m);
  }
  void announceLocalPack(); // 无论空房都播报（见上方注释）
}

export function onMemberIn(member: RoomMember): void {
  emit({ kind: 'memberIn', member });
  if (!announcedHash && !uploading && member.memberId !== myMemberId) void announceLocalPack(); // 第一个房友来了：补播报
  if (member.packHash) ensureMemberPack(member.memberId, member.nickname, member.packHash);
}

export function onMemberOut(memberId: string): void {
  if (memberId === myMemberId) return;
  memberStates.delete(memberId);
  emit({ kind: 'memberOut', memberId });
}

/** 服务端广播 member:pack：成员换角色 / 迟到的 announce */
export function onMemberPack(memberId: string, nickname: string, hash: string): void {
  if (memberId === myMemberId) return;
  ensureMemberPack(memberId, nickname, hash);
}

export function onPresence(memberId: string, mode?: string, action?: string): void {
  const m = memberStates.get(memberId);
  if (m) {
    m.mode = mode;
    m.action = action;
  }
  emit({ kind: 'presence', memberId, mode, action });
}

/**
 * 窗口启动自取快照（?roomPet=1 的 did-finish-load 可能早于监听注册，
 * 同 1v1 remote-main 的 getPeerCache 竞态兜底）。
 */
export function getMemberSnapshot(memberId: string): {
  nickname: string;
  character: LinkPeerCharacter | null;
  mode?: string;
  action?: string;
} | null {
  const m = memberStates.get(memberId);
  if (!m) return null;
  return { nickname: m.nickname, character: m.character, mode: m.mode, action: m.action };
}

export function onChat(memberId: string, nickname: string, text: string): void {
  if (memberId === myMemberId) return;
  emit({ kind: 'chat', memberId, nickname, text });
}

/** 退房/被踢/断线：状态全清（磁盘缓存留着走 LRU） */
export function onLeftRoom(): void {
  for (const dl of downloads.values()) {
    if (dl.retryTimer) clearTimeout(dl.retryTimer);
  }
  downloads.clear();
  downloadQueue.length = 0;
  activeDownloadHash = null;
  memberStates.clear();
  uploading = false;
  pendingUploadBuffer = null;
  myMemberId = null;
  emit({ kind: 'roomLeft' });
}

/**
 * rooms.ts 把 pack 应答帧路由到这里（pack:have:ack / put:ok / begin / chunk）。
 * 错误帧走 handlePackError。
 */
export function handlePackFrame(frame: Record<string, unknown>): void {
  const hash = typeof frame.hash === 'string' ? frame.hash : '';
  switch (frame.t) {
    case 'pack:have:ack': {
      if (hash !== localPackHash) return; // 陈旧应答（切角色后的旧探测）
      if (frame.cached === true) {
        localPackOnServer = true;
        pendingUploadBuffer = null;
        sendFrame?.({ t: 'pack:announce', hash });
        announcedHash = hash;
      } else if (pendingUploadBuffer) {
        const buffer = pendingUploadBuffer;
        pendingUploadBuffer = null;
        void startUpload(hash, buffer);
      }
      break;
    }
    case 'pack:put:ok': {
      if (hash !== localPackHash) return;
      uploading = false; // 提前收工（重连/重复上传场景：服务端已有这份包）
      localPackOnServer = true;
      pendingUploadBuffer = null;
      sendFrame?.({ t: 'pack:announce', hash });
      announcedHash = hash;
      break;
    }
    case 'pack:begin': {
      const dl = downloads.get(hash);
      if (!dl || hash !== activeDownloadHash) return; // 已放弃/过期
      dl.total = Number(frame.total);
      break;
    }
    case 'pack:chunk': {
      const dl = downloads.get(hash);
      if (!dl || !dl.total) return; // 没等 begin 的野块：丢
      try {
        const done = dl.assembler.add(Number(frame.seq), dl.total, String(frame.data));
        if (dl.assembler.received % PROGRESS_EVERY === 0 || done) emitProgress(hash);
        if (done) {
          const buffer = dl.assembler.assemble();
          activeDownloadHash = null;
          void completeDownload(hash, buffer);
        }
      } catch (err) {
        console.error('[room-pets] chunk rejected:', err);
        finishDownload(hash); // 乱序/超限：与 1v1 同款纪律，整趟作废
        emitPackFailed(hash);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * pack 专属错误码（rooms.ts 的 error 帧分流过来）。
 * error 帧不带 hash，按当前活跃下载归属；上传侧错误归 localPackHash。
 */
export function handlePackError(code: string): void {
  const hash = activeDownloadHash;
  const dl = hash ? downloads.get(hash) : undefined;
  if (code === 'pack:not_found') {
    if (!dl || !hash) return;
    if (dl.retries < NOT_FOUND_RETRY_MAX) {
      dl.retries++;
      dl.retryTimer = setTimeout(() => {
        if (activeDownloadHash !== hash || !downloads.has(hash)) return;
        finishDownload(hash);
        if (!downloadQueue.includes(hash)) downloadQueue.unshift(hash); // 插队重试
        pumpDownloadQueue();
      }, NOT_FOUND_RETRY_MS * (dl.retries + 1)); // 指数退避，增加重试间隔
      return;
    }
    finishDownload(hash);
    emitPackFailed(hash);
    // 失败后一段时间后重新尝试
    setTimeout(() => {
      if (!downloadQueue.includes(hash)) downloadQueue.push(hash);
      pumpDownloadQueue();
    }, 10_000);
    return;
  }
  if (code === 'pack:busy') {
    // 本地是串行下载，busy 只在服务重启等边角出现：排回队尾
    if (hash) {
      finishDownload(hash);
      if (!downloadQueue.includes(hash)) downloadQueue.push(hash);
    }
    return;
  }
  if (code === 'pack:bad' || code === 'bad_frame') {
    if (hash) {
      finishDownload(hash);
      emitPackFailed(hash);
    }
    return;
  }
  if (code === 'pack:rate_limited') {
    // 上传侧被限流：本轮作废，下个 memberIn/join 事件会重试
    uploading = false;
    pendingUploadBuffer = null;
  }
}
