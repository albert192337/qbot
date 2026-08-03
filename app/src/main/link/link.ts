/**
 * 联机链路管理（spec §二.2）：房间生命周期 + 本地状态出帧 + 对端帧驱动远端宠窗。
 *
 * 隐私铁律（spec §四）：出本机的只有状态枚举、动作名、开关放行的曲名。
 * 气泡正文 / last_assistant_message / cwd / 会话内容永远不进这个模块。
 */
import { existsSync } from 'node:fs';
import { readFile, readdir, rename, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { charactersDir, getCharacter } from '../characters';
import { getSettings } from '../config';
import type {
  AgentActivity,
  LinkAssetProgress,
  LinkMode,
  LinkPeerCharacter,
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
import { ChunkAssembler, chunkToBase64, packCharacterDir, unpackCharacter } from './asset-pack';
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
/** 对端真身角色（缓存命中 / 传输完成后就位） */
let peerCharacter: LinkPeerCharacter | null = null;
/** 进行中的角色包接收（hash 不匹配的块一律丢弃） */
let assembler: ChunkAssembler | null = null;

/** 对端角色包缓存目录前缀（点开头：listCharacters 会跳过，不进切换角色菜单） */
const PEER_CACHE_PREFIX = '.peer-';
const HASH_RE = /^[0-9a-f]{16}$/;

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
  peerCharacter = null;
  assembler = null;
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
      const manifestHash =
        typeof frame.manifestHash === 'string' && HASH_RE.test(frame.manifestHash)
          ? frame.manifestHash
          : undefined;
      peerHello = { charName: String(frame.charName ?? '好友'), manifestHash };
      setStatus({ ...status, peerName: peerHello.charName });
      pushToRemote('link:peerHello', peerHello);
      void ensurePeerCharacter(manifestHash);
      break;
    }
    case 'asset:request': {
      if (typeof frame.hash === 'string' && HASH_RE.test(frame.hash)) {
        void serveAssetRequest(frame.hash);
      }
      break;
    }
    case 'asset:chunk': {
      void handleAssetChunk(frame);
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
      peerCharacter = null;
      assembler = null;
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
  if (peerCharacter) pushToRemote('link:peerCharacter', peerCharacter);
  if (peerState) pushToRemote('link:peerState', peerState);
}

// ── L1 资产分发（spec §三.2）────────────────────────────────
// 接收端：hello 带 manifestHash → 缓存 `.peer-<hash>/` 命中直接加载，
// 未命中发 asset:request，逐块收 asset:chunk 重组落盘。
// 发送端：收到 asset:request 且 hash 与自己当前角色匹配 → 打包分块回传。

/** 进度推送节流：每收 N 块推一次（64KB/块 → 约每 0.5MB 一次） */
const PROGRESS_EVERY = 8;

function peerCacheDir(hash: string): string {
  return path.join(charactersDir(), `${PEER_CACHE_PREFIX}${hash}`);
}

async function ensurePeerCharacter(hash: string | undefined): Promise<void> {
  if (!hash) return; // 老版本对端（hello 无 hash）：远端窗保持占位
  if (peerCharacter?.dirId === `${PEER_CACHE_PREFIX}${hash}`) return; // 已就位
  const dir = peerCacheDir(hash);
  const manifestPath = path.join(dir, 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      peerCharacter = { dirId: `${PEER_CACHE_PREFIX}${hash}`, manifest };
      pushToRemote('link:peerCharacter', peerCharacter);
      console.log('[link] peer character cache hit:', hash);
      return;
    } catch {
      await rm(dir, { recursive: true, force: true }); // 缓存损坏：删掉重传
    }
  }
  if (assembler?.hash === hash) return; // 同一包已在收，别重复请求
  assembler = new ChunkAssembler(hash);
  console.log('[link] peer character cache miss, requesting:', hash);
  pushToRemote('link:assetProgress', { received: 0, total: 0 } satisfies LinkAssetProgress);
  transport?.send({ t: 'asset:request', hash });
}

async function serveAssetRequest(hash: string): Promise<void> {
  const { activeCharacter } = await getSettings();
  if (!activeCharacter || !transport) return;
  try {
    const packed = await packCharacterDir(path.join(charactersDir(), activeCharacter));
    if (packed.hash !== hash) {
      console.log('[link] asset request hash stale, ignoring'); // 对端要的是旧角色（刚切过）
      return;
    }
    const chunks = chunkToBase64(packed.buffer);
    console.log(`[link] sending character package: ${chunks.length} chunks`);
    for (let seq = 0; seq < chunks.length; seq++) {
      if (!transport || status.phase !== 'paired') return; // 中途断了：放弃
      transport.send({ t: 'asset:chunk', hash, seq, total: chunks.length, data: chunks[seq] });
      await new Promise((r) => setTimeout(r, 5)); // 轻限速，别把 relay 冲爆
    }
  } catch (err) {
    console.error('[link] serve asset failed:', err);
  }
}

async function handleAssetChunk(frame: LinkFrame): Promise<void> {
  if (!assembler || frame.hash !== assembler.hash) return; // 没在等 / 过期传输：丢弃
  try {
    const done = assembler.add(Number(frame.seq), Number(frame.total), String(frame.data));
    if (assembler.received % PROGRESS_EVERY === 0 || done) {
      pushToRemote('link:assetProgress', {
        received: assembler.received,
        total: assembler.expectedTotal,
      } satisfies LinkAssetProgress);
    }
    if (!done) return;
    const { hash } = assembler;
    const buffer = assembler.assemble();
    assembler = null;
    // 临时目录解包 → rename 原子就位（中途崩溃不会留半包缓存）
    const dir = peerCacheDir(hash);
    const tmp = `${dir}.tmp`;
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    await unpackCharacter(buffer, tmp);
    await rm(dir, { recursive: true, force: true });
    await rename(tmp, dir);
    await prunePeerCache(hash);
    const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
    peerCharacter = { dirId: `${PEER_CACHE_PREFIX}${hash}`, manifest };
    pushToRemote('link:peerCharacter', peerCharacter);
    console.log('[link] peer character received:', hash);
  } catch (err) {
    console.error('[link] asset transfer failed:', err);
    assembler = null; // 本次作废；对端换角色/重配对会重新走 hello → request
  }
}

/** 只留当前对端的包，旧 peer 缓存清掉（12MB/个，不值得攒） */
async function prunePeerCache(keepHash: string): Promise<void> {
  try {
    for (const entry of await readdir(charactersDir(), { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith(PEER_CACHE_PREFIX)) continue;
      if (entry.name === `${PEER_CACHE_PREFIX}${keepHash}`) continue;
      await rm(path.join(charactersDir(), entry.name), { recursive: true, force: true });
    }
  } catch {
    /* 清理失败不影响主流程 */
  }
}

/** 角色切换钩子（ipc/tray 的激活入口调用）：配对中就把新形象重新报给对端 */
export function notifyActiveCharacterChanged(): void {
  if (status.phase === 'paired') void sendHello();
}

/**
 * 远端窗启动自取快照：pet/main.ts 动态 import 使 did-finish-load 早于监听注册，
 * push/replay 都可能丢失（与本地宠同款竞态）→ 渲染端注册完监听后主动拉一次
 */
export function getPeerCache(): {
  hello: LinkPeerHello | null;
  character: LinkPeerCharacter | null;
  state: LinkPeerState | null;
} {
  return { hello: peerHello, character: peerCharacter, state: peerState };
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
  // manifestHash：脱敏包指纹（打包 ≈12MB 读盘，只在配对/切角色时发生）
  let manifestHash: string | undefined;
  if (activeCharacter && meta?.manifest) {
    try {
      ({ hash: manifestHash } = await packCharacterDir(
        path.join(charactersDir(), activeCharacter),
      ));
    } catch (err) {
      console.error('[link] hash character failed:', err); // 没 hash 也照常 hello（对端显示占位）
    }
  }
  transport.send({ t: 'hello', charName: meta?.manifest?.name || 'QBot', manifestHash });
}
