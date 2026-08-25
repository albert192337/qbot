/**
 * 家具品质分级 —— 开箱抽取与合成的唯一数据源。
 *
 * 为什么放 shared 而不是 renderer 的 decor-pack.ts：主进程要摇随机家具
 * （progress.ts），renderer 要渲染品质角标和合成配方，**两边都得 value import**。
 * 所以本文件必须零依赖：不 import electron、不 import @qbot/pipeline（血泪坑 12）。
 * 图片/尺寸/锚定这些只有 renderer 用得上的字段仍留在 decor-pack.ts。
 */

export type FurnitureTier = 'common' | 'rare' | 'epic';

/** 由低到高。合成时按这个顺序找上一档 */
export const TIER_ORDER: readonly FurnitureTier[] = ['common', 'rare', 'epic'];

export const TIER_LABEL: Readonly<Record<FurnitureTier, string>> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
};

export const TIER_COLOR: Readonly<Record<FurnitureTier, string>> = {
  common: '#9aa0a6',
  rare: '#4a90d9',
  epic: '#b56cd6',
};

/**
 * 每件家具的品质。
 *
 * 分档时刻意让**每档都同时含「墙面」和「家具」两类**——否则合成到高档后
 * 可能手里全是挂墙的、地面空着没法摆，体验很怪。
 * 当前 10 件：common 5（灯笼/盆栽/折扇/挂钟/茶壶案几）、
 * rare 3（山水挂画/字画卷轴/书架）、epic 2（圆窗/屏风）。
 */
export const FURNITURE_TIER: Readonly<Record<string, FurnitureTier>> = {
  lantern: 'common',
  plant: 'common',
  fan: 'common',
  clock: 'common',
  teapot: 'common',

  painting: 'rare',
  calligraphy: 'rare',
  shelf: 'rare',

  window: 'epic',
  screen: 'epic',
};

/** 未登记的 id 一律当 common（贴纸包加了新家具但忘了分档时不至于崩） */
export function tierOf(stickerId: string): FurnitureTier {
  return FURNITURE_TIER[stickerId] ?? 'common';
}

/** 某一档的全部家具 id，字典序（排序是为了让抽取/合成结果可预测、可测） */
export function idsOfTier(tier: FurnitureTier): string[] {
  return Object.keys(FURNITURE_TIER)
    .filter((id) => FURNITURE_TIER[id] === tier)
    .sort();
}

/** 上一档；已是最高档返回 null */
export function nextTier(tier: FurnitureTier): FurnitureTier | null {
  const i = TIER_ORDER.indexOf(tier);
  if (i < 0 || i >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[i + 1];
}

/** 开箱权重（相对值，不必和为 100） */
export const TIER_WEIGHT: Readonly<Record<FurnitureTier, number>> = {
  common: 70,
  rare: 25,
  epic: 5,
};

// ── 玩法数值 ─────────────────────────────────────────────
// 也放 shared：主进程要拿它们结算，renderer 要拿它们显示「500 点」「10 件」这些
// 文案和进度条。两边各写一份必然对不上（改了一处忘另一处 = UI 骗人）。

/** 敲一下键盘得几点 */
export const POINTS_PER_KEY = 1;
/** Claude Code 跑完一轮得几点 */
export const POINTS_PER_AGENT_RUN = 10;
/** 开一个箱子消耗多少点（外加 1 个箱子本身） */
export const POINTS_PER_BOX = 500;
/** 挂机多久攒一个箱子 */
export const IDLE_MS_PER_BOX = 15 * 60 * 1000;
/** 合成消耗同档几件 */
export const CRAFT_COST = 10;

/** 是否够开一个箱子（有箱有点）—— renderer 专用谓词，避免 import 主进程 progress-rules */
export function canAffordBox(points: number, boxes: number): boolean {
  return boxes >= 1 && points >= POINTS_PER_BOX;
}

/**
 * 抽一件家具：先按 TIER_WEIGHT 抽档位，再在档位内等概率抽具体家具。
 *
 * rand 由调用方注入（运行时 Math.random，测试里给定值序列）——**消耗两次
 * rand**（先档位后具体件），测试要按这个顺序准备序列。
 */
export function rollFurniture(rand: () => number): string {
  const total = TIER_ORDER.reduce((s, t) => s + TIER_WEIGHT[t], 0);
  const r = rand() * total;
  let acc = 0;
  // 兜底取最高档：浮点累加可能差一点点没进任何区间
  let picked: FurnitureTier = TIER_ORDER[TIER_ORDER.length - 1];
  for (const t of TIER_ORDER) {
    acc += TIER_WEIGHT[t];
    if (r < acc) {
      picked = t;
      break;
    }
  }
  const pool = idsOfTier(picked);
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor(rand() * pool.length)));
  return pool[i];
}
