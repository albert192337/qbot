/**
 * 游戏化积累持久化：userData/progress.json
 *
 * 点数/箱子/家具库存/挂机余量的唯一权威。**主进程持有**而不是 renderer localStorage，
 * 因为三个来源（键盘 input-monitor、Claude Code 的 Stop 事件、挂机计时器）全在主进程，
 * 而消费方分散在 pet 窗（调试面板）和 room 窗（背包/合成）两个 renderer。
 *
 * 与 config.ts / decor.ts 的差别：那两个是 read-modify-write 无缓存，够用是因为写得稀疏；
 * 这里每秒都有键盘加分，所以**内存缓存 + 防抖落盘 + 节流广播**，否则一分钟几十次写盘。
 */
import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CraftResult, OpenBoxResult, Progress } from '../shared/ipc-types';
import {
  FURNITURE_TIER,
  rollFurniture,
  tierOf,
  nextTier,
  idsOfTier,
  type FurnitureTier,
} from '../shared/furniture';
import {
  CRAFT_COST,
  IDLE_DELTA_CAP_MS,
  IDLE_TICK_MS,
  POINTS_PER_AGENT_RUN,
  POINTS_PER_KEY,
  applyCraft,
  applyOpenBox,
  canOpenBox,
  emptyProgress,
  pickCraftSacrifice,
  sanitizeProgress,
  settleIdle,
} from './progress-rules';
import { getPetWindow, getRoomWindow } from './windows';

/** 首次运行送几个空箱子：否则新用户开局装饰托盘全锁着，房间看着像坏了 */
const STARTER_BOXES = 2;
/** 落盘防抖 */
const SAVE_DEBOUNCE_MS = 2_000;
/** 广播节流：键盘加分每秒都在变，不节流就是每秒几十条 IPC */
const BROADCAST_THROTTLE_MS = 1_000;

let cache: Progress | null = null;
let loading: Promise<Progress> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let broadcastTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;
let lastIdleAt = 0;

function progressPath(): string {
  return path.join(app.getPath('userData'), 'progress.json');
}

/**
 * 首次创建时从已有摆件播种库存。
 * 不播种的话，老用户升级后房间里摆着的家具会突然从托盘消失、无法再摆回去。
 */
async function seedFromPlacements(): Promise<Record<string, number>> {
  const inventory: Record<string, number> = {};
  try {
    const raw = JSON.parse(await readFile(path.join(app.getPath('userData'), 'room-decor.json'), 'utf8'));
    if (typeof raw !== 'object' || raw === null) return inventory;
    for (const list of Object.values(raw as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        const id = (p as { stickerId?: unknown })?.stickerId;
        if (typeof id === 'string' && id) inventory[id] = (inventory[id] ?? 0) + 1;
      }
    }
  } catch {
    // 没摆过 / 文件损坏 → 空库存，不是错误
  }
  return inventory;
}

async function load(): Promise<Progress> {
  if (cache) return cache;
  if (loading) return loading;
  loading = (async () => {
    try {
      const parsed = JSON.parse(await readFile(progressPath(), 'utf8'));
      cache = sanitizeProgress(parsed);
    } catch {
      // 不存在或损坏 → 新档；不主动覆盖写，保留手改坏的现场（下次保存才重写）
      cache = { ...emptyProgress(), boxes: STARTER_BOXES, inventory: await seedFromPlacements() };
      scheduleSave();
    }
    return cache;
  })();
  const p = await loading;
  loading = null;
  return p;
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushProgress();
  }, SAVE_DEBOUNCE_MS);
}

/** 退出前调用，把防抖里没落的那笔写掉 */
export async function flushProgress(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!cache) return;
  try {
    await mkdir(path.dirname(progressPath()), { recursive: true });
    await writeFile(progressPath(), JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('[progress] 写盘失败', err); // 写失败不阻塞玩法
  }
}

function scheduleBroadcast(): void {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    if (!cache) return;
    // pet 窗有调试面板，room 窗有背包/合成；其余窗口不消费
    getPetWindow()?.webContents.send('progress:changed', cache);
    const room = getRoomWindow();
    if (room && !room.isDestroyed()) room.webContents.send('progress:changed', cache);
  }, BROADCAST_THROTTLE_MS);
}

/** 改完统一走这里：落盘 + 广播都是防抖/节流的 */
function commit(next: Progress): Progress {
  cache = next;
  scheduleSave();
  scheduleBroadcast();
  return next;
}

export async function getProgress(): Promise<Progress> {
  return load();
}

export async function addPoints(n: number, kind: 'key' | 'run'): Promise<void> {
  if (!Number.isFinite(n) || n <= 0) return;
  const p = await load();
  commit({
    ...p,
    points: p.points + Math.floor(n),
    keysCounted: kind === 'key' ? p.keysCounted + Math.floor(n / POINTS_PER_KEY) : p.keysCounted,
    runsCounted: kind === 'run' ? p.runsCounted + 1 : p.runsCounted,
  });
}

/** input-monitor 的钩子：一秒内数到的按键数 */
export async function addKeystrokes(keys: number): Promise<void> {
  await addPoints(keys * POINTS_PER_KEY, 'key');
}

/** agent-server 的钩子：Claude Code 跑完一轮 */
export async function addAgentRun(): Promise<void> {
  await addPoints(POINTS_PER_AGENT_RUN, 'run');
}

/** 挂机计时：用真实墙钟差（tick 会被节流少算），但 clamp 掉休眠造成的跳变 */
async function idleTick(): Promise<void> {
  const now = Date.now();
  const delta = lastIdleAt ? now - lastIdleAt : 0;
  lastIdleAt = now;
  if (delta <= 0) return;
  const p = await load();
  const { idleMs, gained } = settleIdle(p.idleMs, delta, IDLE_DELTA_CAP_MS);
  if (gained > 0) console.log(`[progress] 挂机结算 +${gained} 箱`);
  commit({ ...p, idleMs, boxes: p.boxes + gained });
}

export function startProgressTicker(): void {
  if (idleTimer) return;
  lastIdleAt = Date.now();
  idleTimer = setInterval(() => void idleTick(), IDLE_TICK_MS);
}

export function stopProgressTicker(): void {
  if (idleTimer) {
    clearInterval(idleTimer);
    idleTimer = null;
  }
}

/** 开箱：扣 1 箱 + POINTS_PER_BOX 点，随机得一件家具 */
export async function openBox(): Promise<OpenBoxResult> {
  const p = await load();
  const check = canOpenBox(p);
  if (!check.ok) return { ok: false, error: check.reason ?? '开不了' };
  const stickerId = rollFurniture(Math.random);
  const next = commit(applyOpenBox(p, stickerId));
  return { ok: true, stickerId, tier: tierOf(stickerId), progress: next };
}

/** 合成：同档任意 CRAFT_COST 件 → 上一档随机 1 件 */
export async function craft(tier: FurnitureTier): Promise<CraftResult> {
  const up = nextTier(tier);
  if (!up) return { ok: false, error: '已是最高品质，无法继续合成' };
  const p = await load();
  const take = pickCraftSacrifice(p.inventory, tier, CRAFT_COST);
  if (!take) return { ok: false, error: `${CRAFT_COST} 件才能合成，现在不够` };
  const pool = idsOfTier(up);
  const stickerId = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  const next = commit(applyCraft(p, take, stickerId));
  return { ok: true, stickerId, tier: up, consumed: take, progress: next };
}

// ── 调试用：直接注水（对应调试面板的三个按钮） ───────────────

export async function debugAddIdleMs(ms: number): Promise<Progress> {
  const p = await load();
  // 调试注水不 clamp（cap 给 Infinity），否则「+15 分钟」按钮点了没反应
  const { idleMs, gained } = settleIdle(p.idleMs, Math.max(0, ms), Number.POSITIVE_INFINITY);
  return commit({ ...p, idleMs, boxes: p.boxes + gained });
}

export async function debugGrantBoxes(n: number): Promise<Progress> {
  const p = await load();
  return commit({ ...p, boxes: p.boxes + Math.max(0, Math.floor(n)) });
}

export async function debugGrantPoints(n: number): Promise<Progress> {
  const p = await load();
  return commit({ ...p, points: p.points + Math.max(0, Math.floor(n)) });
}

/** stickerId 省略 = 按开箱权重随机一件（不扣箱不扣点） */
export async function debugGrantFurniture(stickerId?: string): Promise<{ stickerId: string; progress: Progress }> {
  const p = await load();
  // tierOf 对未知 id 会兜底成 common，不能拿它当校验 → 直接查分档表
  const id = stickerId && stickerId in FURNITURE_TIER ? stickerId : rollFurniture(Math.random);
  const inventory = { ...p.inventory, [id]: (p.inventory[id] ?? 0) + 1 };
  return { stickerId: id, progress: commit({ ...p, inventory }) };
}
