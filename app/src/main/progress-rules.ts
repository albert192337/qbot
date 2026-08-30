/**
 * 游戏化积累的**纯逻辑**：挂机结算、开箱判定、合成配方。
 *
 * 零 IO 零 Electron，全部纯函数 → 可单测（`app/test/progress-rules.test.ts`）。
 * 落盘/广播/定时器在 `progress.ts`，两者边界不要糊在一起。
 */
import {
  CRAFT_COST,
  IDLE_MS_PER_BOX,
  POINTS_PER_BOX,
  idsOfTier,
  nextTier,
  tierOf,
  TIER_ORDER,
  type FurnitureTier,
} from '../shared/furniture';
import type { Progress } from '../shared/ipc-types';

// 数值本身在 shared/furniture.ts（renderer 也要拿去显示文案/进度条）；
// 这里原样转出，让主进程侧只认一个 import 来源
export {
  CRAFT_COST,
  DEFAULT_MAX_BOXES,
  IDLE_MS_PER_BOX,
  POINTS_PER_AGENT_RUN,
  POINTS_PER_BOX,
  POINTS_PER_KEY,
} from '../shared/furniture';

/** 挂机计时器间隔 */
export const IDLE_TICK_MS = 30_000;
/**
 * 单次 tick 最多认几毫秒。
 * 必须 clamp：定时器用**真实墙钟差**算（数 tick 次数会被 Chromium/系统节流少算），
 * 但墙钟差在机器休眠一整夜后会一次性送几十个箱子。
 */
export const IDLE_DELTA_CAP_MS = IDLE_TICK_MS * 2;

export function emptyProgress(): Progress {
  return {
    points: 0,
    boxes: 0,
    idleMs: 0,
    inventory: {},
    keysCounted: 0,
    runsCounted: 0,
    boxesOpened: 0,
    crafted: 0,
  };
}

/** 读盘容错：任何字段坏了都退回默认值，绝不让脏 progress.json 崩掉主进程 */
export function sanitizeProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

  const inventory: Record<string, number> = {};
  if (typeof r.inventory === 'object' && r.inventory !== null) {
    for (const [id, n] of Object.entries(r.inventory as Record<string, unknown>)) {
      const c = num(n, 0);
      if (c > 0) inventory[id] = c;
    }
  }
  return {
    points: num(r.points, base.points),
    boxes: num(r.boxes, base.boxes),
    idleMs: num(r.idleMs, base.idleMs),
    inventory,
    keysCounted: num(r.keysCounted, base.keysCounted),
    runsCounted: num(r.runsCounted, base.runsCounted),
    boxesOpened: num(r.boxesOpened, base.boxesOpened),
    crafted: num(r.crafted, base.crafted),
  };
}

/**
 * 挂机时长结算：累加 deltaMs，每满 IDLE_MS_PER_BOX 结算一个箱子。
 * 余量留在 idleMs 里继续攒（不清零，否则进度条永远从 0 开始很挫）。
 */
export function settleIdle(
  idleMs: number,
  deltaMs: number,
  capMs: number = IDLE_DELTA_CAP_MS,
): { idleMs: number; gained: number } {
  const d = Math.max(0, Math.min(deltaMs, capMs));
  const total = idleMs + d;
  const gained = Math.floor(total / IDLE_MS_PER_BOX);
  return { idleMs: total - gained * IDLE_MS_PER_BOX, gained };
}

/**
 * 带上限的挂机结算。箱子堆到 maxBoxes 就停止产出——
 * 不封顶的话离开一周回来几百个箱子，开箱这个动作本身就没意义了。
 *
 * 满仓时**冻结 idleMs**（不累加也不清零）：开掉一个箱子后从原处续攒，
 * 而不是白挂机一整天再从 0 开始。
 */
export function settleIdleCapped(
  idleMs: number,
  deltaMs: number,
  boxes: number,
  maxBoxes: number,
  capMs: number = IDLE_DELTA_CAP_MS,
): { idleMs: number; gained: number } {
  const max = Math.max(0, Math.floor(maxBoxes));
  const have = Math.max(0, Math.floor(boxes));
  if (have >= max) return { idleMs, gained: 0 };
  const { idleMs: rest, gained: raw } = settleIdle(idleMs, deltaMs, capMs);
  const gained = Math.min(raw, max - have);
  // 撞上限时余量一起丢：留着会让下一次开箱后瞬间又跳出一个箱子
  return { idleMs: gained < raw ? 0 : rest, gained };
}

/** 距下一个箱子的进度 0~1（UI 进度条用） */
export function idleProgressRatio(idleMs: number): number {
  return Math.max(0, Math.min(1, idleMs / IDLE_MS_PER_BOX));
}

/** 开箱需要**同时**有箱子和够点数 */
export function canOpenBox(p: Pick<Progress, 'points' | 'boxes'>): { ok: boolean; reason?: string } {
  if (p.boxes < 1) return { ok: false, reason: '没有箱子，再挂机一会儿' };
  if (p.points < POINTS_PER_BOX) {
    return { ok: false, reason: `点数不够（${p.points}/${POINTS_PER_BOX}）` };
  }
  return { ok: true };
}

function withInventory(inv: Readonly<Record<string, number>>, id: string, delta: number) {
  const next = { ...inv };
  const n = (next[id] ?? 0) + delta;
  if (n > 0) next[id] = n;
  else delete next[id];
  return next;
}

export function applyOpenBox(p: Progress, stickerId: string): Progress {
  return {
    ...p,
    points: p.points - POINTS_PER_BOX,
    boxes: p.boxes - 1,
    inventory: withInventory(p.inventory, stickerId, 1),
    boxesOpened: p.boxesOpened + 1,
  };
}

/** 每档持有总件数（含重复），合成页显示「7/10」用 */
export function tierCounts(
  inventory: Readonly<Record<string, number>>,
): Record<FurnitureTier, number> {
  const out = { common: 0, rare: 0, epic: 0 } as Record<FurnitureTier, number>;
  for (const [id, n] of Object.entries(inventory)) out[tierOf(id)] += n;
  return out;
}

/** 可合成的档位（该档 ≥ CRAFT_COST 件，且存在上一档） */
export function craftableTiers(inventory: Readonly<Record<string, number>>): FurnitureTier[] {
  const counts = tierCounts(inventory);
  return TIER_ORDER.filter((t) => counts[t] >= CRAFT_COST && nextTier(t) !== null);
}

/**
 * 选出合成要消耗的 CRAFT_COST 件（同档任意组合，不要求同款）。
 *
 * 策略：每次从**剩余最多的那一堆**里拿一件——尽量给每种家具留一件，
 * 别把收集到的品种给烧没了。同数量时取 id 字典序小的，保证结果确定可测。
 * 该档总数不足返回 null。
 */
export function pickCraftSacrifice(
  inventory: Readonly<Record<string, number>>,
  tier: FurnitureTier,
  count: number = CRAFT_COST,
): Record<string, number> | null {
  const ids = idsOfTier(tier);
  const remain = new Map<string, number>(ids.map((id) => [id, inventory[id] ?? 0]));
  let total = 0;
  for (const n of remain.values()) total += n;
  if (total < count) return null;

  const take: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    let pick = '';
    let pickN = 0;
    for (const id of ids) {
      const n = remain.get(id) ?? 0;
      if (n > pickN) {
        pick = id;
        pickN = n;
      }
    }
    if (!pick) return null; // total 已校验过，理论到不了
    remain.set(pick, pickN - 1);
    take[pick] = (take[pick] ?? 0) + 1;
  }
  return take;
}

export function applyCraft(
  p: Progress,
  take: Readonly<Record<string, number>>,
  gainedId: string,
): Progress {
  let inventory: Record<string, number> = { ...p.inventory };
  for (const [id, n] of Object.entries(take)) inventory = withInventory(inventory, id, -n);
  inventory = withInventory(inventory, gainedId, 1);
  return { ...p, inventory, crafted: p.crafted + 1 };
}
