/**
 * 游戏化积累纯逻辑的单测。
 * 只测 progress-rules.ts + shared/furniture.ts —— 落盘/定时器/IPC 在 progress.ts，
 * 那层要 Electron app.getPath，不在单测覆盖范围内。
 */
import { describe, expect, it } from 'vitest';
import {
  CRAFT_COST,
  IDLE_MS_PER_BOX,
  POINTS_PER_BOX,
  TIER_ORDER,
  idsOfTier,
  nextTier,
  rollFurniture,
  tierOf,
} from '../src/shared/furniture';
import {
  applyCraft,
  applyOpenBox,
  canOpenBox,
  craftableTiers,
  emptyProgress,
  idleProgressRatio,
  pickCraftSacrifice,
  sanitizeProgress,
  settleIdle,
  settleIdleCapped,
  tierCounts,
} from '../src/main/progress-rules';

describe('settleIdle', () => {
  it('不满一箱只累加余量', () => {
    expect(settleIdle(0, 60_000)).toEqual({ idleMs: 60_000, gained: 0 });
  });

  it('满一箱结算并保留余量（余量不清零，否则进度条每次从 0 起）', () => {
    const r = settleIdle(IDLE_MS_PER_BOX - 1_000, 6_000);
    expect(r.gained).toBe(1);
    expect(r.idleMs).toBe(5_000);
  });

  it('clamp 掉休眠造成的墙钟跳变：一夜不会一次送几十个箱子', () => {
    const cap = 60_000;
    const r = settleIdle(0, 8 * 3600 * 1000, cap);
    expect(r.gained).toBe(0);
    expect(r.idleMs).toBe(cap);
  });

  it('调试注水给 Infinity cap 时按真实时长结算', () => {
    const r = settleIdle(0, 3 * IDLE_MS_PER_BOX, Number.POSITIVE_INFINITY);
    expect(r).toEqual({ idleMs: 0, gained: 3 });
  });

  it('负 delta 当 0（系统时钟被往回调）', () => {
    expect(settleIdle(1_000, -99_999)).toEqual({ idleMs: 1_000, gained: 0 });
  });
});

describe('idleProgressRatio', () => {
  it('夹在 0~1', () => {
    expect(idleProgressRatio(-5)).toBe(0);
    expect(idleProgressRatio(IDLE_MS_PER_BOX / 2)).toBeCloseTo(0.5);
    expect(idleProgressRatio(IDLE_MS_PER_BOX * 3)).toBe(1);
  });
});

describe('canOpenBox', () => {
  it('要同时有箱子和够点数', () => {
    expect(canOpenBox({ boxes: 1, points: POINTS_PER_BOX }).ok).toBe(true);
  });

  it('先报缺箱子（箱子是挂机换的，比点数稀缺）', () => {
    const r = canOpenBox({ boxes: 0, points: 99_999 });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('箱子');
  });

  it('点数不够时把进度报出来', () => {
    const r = canOpenBox({ boxes: 3, points: 120 });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain(`120/${POINTS_PER_BOX}`);
  });
});

describe('applyOpenBox', () => {
  it('扣 1 箱 + 点数，库存 +1，统计 +1', () => {
    const p = { ...emptyProgress(), boxes: 2, points: 700 };
    const next = applyOpenBox(p, 'lantern');
    expect(next.boxes).toBe(1);
    expect(next.points).toBe(700 - POINTS_PER_BOX);
    expect(next.inventory).toEqual({ lantern: 1 });
    expect(next.boxesOpened).toBe(1);
  });

  it('不改原对象（commit 靠新对象引用判定变化）', () => {
    const p = { ...emptyProgress(), boxes: 1, points: 500, inventory: { fan: 1 } };
    applyOpenBox(p, 'fan');
    expect(p.inventory).toEqual({ fan: 1 });
    expect(p.boxes).toBe(1);
  });
});

describe('pickCraftSacrifice', () => {
  it('总数不足返回 null', () => {
    expect(pickCraftSacrifice({ lantern: 9 }, 'common')).toBeNull();
  });

  it('优先烧最大的堆，尽量给每种留一件', () => {
    // common 5 种：lantern 20 件，其余各 1 件 → 应该只烧 lantern
    const take = pickCraftSacrifice(
      { lantern: 20, plant: 1, fan: 1, clock: 1, teapot: 1 },
      'common',
    );
    expect(take).toEqual({ lantern: CRAFT_COST });
  });

  it('单种不够时跨种凑，且总数恰好等于 CRAFT_COST', () => {
    const take = pickCraftSacrifice({ lantern: 6, plant: 6 }, 'common');
    expect(take).not.toBeNull();
    const sum = Object.values(take!).reduce((a, b) => a + b, 0);
    expect(sum).toBe(CRAFT_COST);
    // 交替从更大的堆拿 → 5/5
    expect(take).toEqual({ lantern: 5, plant: 5 });
  });

  it('只数本档，别的档位的库存不算进来', () => {
    // painting 是 rare，不该被 common 的合成算入
    expect(pickCraftSacrifice({ lantern: 5, painting: 50 }, 'common')).toBeNull();
  });

  it('结果确定（同输入同输出，字典序破平）', () => {
    const inv = { lantern: 5, plant: 5, fan: 5 };
    expect(pickCraftSacrifice(inv, 'common')).toEqual(pickCraftSacrifice(inv, 'common'));
  });
});

describe('applyCraft', () => {
  it('烧掉消耗件、+1 上档件、清空归零的条目', () => {
    const p = { ...emptyProgress(), inventory: { lantern: 10, plant: 2 } };
    const next = applyCraft(p, { lantern: 10 }, 'painting');
    expect(next.inventory).toEqual({ plant: 2, painting: 1 });
    expect('lantern' in next.inventory).toBe(false); // 归零就删键，不留 0
    expect(next.crafted).toBe(1);
  });

  it('10 换 1 后总件数确实少 9', () => {
    const p = { ...emptyProgress(), inventory: { lantern: 12 } };
    const take = pickCraftSacrifice(p.inventory, 'common')!;
    const next = applyCraft(p, take, 'shelf');
    const before = Object.values(p.inventory).reduce((a, b) => a + b, 0);
    const after = Object.values(next.inventory).reduce((a, b) => a + b, 0);
    expect(before - after).toBe(CRAFT_COST - 1);
  });
});

describe('tierCounts / craftableTiers', () => {
  it('按档汇总含重复件', () => {
    expect(tierCounts({ lantern: 3, plant: 2, painting: 1 })).toEqual({
      common: 5,
      rare: 1,
      epic: 0,
    });
  });

  it('未登记的 id 计入 common（贴纸包加了新件忘分档时不崩）', () => {
    expect(tierCounts({ 'brand-new-thing': 4 }).common).toBe(4);
  });

  it('最高档够 10 件也不可合成（没有上一档）', () => {
    expect(craftableTiers({ window: 10, screen: 5 })).toEqual([]);
  });

  it('够数的中间档可合成', () => {
    expect(craftableTiers({ painting: 10 })).toEqual(['rare']);
  });
});

describe('sanitizeProgress', () => {
  it('非对象 → 空档', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('坏了')).toEqual(emptyProgress());
  });

  it('脏字段逐个退回默认值，不整档丢弃', () => {
    const p = sanitizeProgress({ points: 'abc', boxes: 3, idleMs: -1, crafted: NaN });
    expect(p.points).toBe(0);
    expect(p.boxes).toBe(3); // 好的字段留着
    expect(p.idleMs).toBe(0);
    expect(p.crafted).toBe(0);
  });

  it('库存里 0/负数/非数条目被剔除', () => {
    const p = sanitizeProgress({ inventory: { lantern: 2, plant: 0, fan: -1, clock: 'x' } });
    expect(p.inventory).toEqual({ lantern: 2 });
  });

  it('小数件数取整（手改 json 塞进 1.5 件）', () => {
    expect(sanitizeProgress({ points: 10.9, inventory: { fan: 2.7 } })).toMatchObject({
      points: 10,
      inventory: { fan: 2 },
    });
  });
});

describe('家具分档表', () => {
  it('每档都同时有墙面件和地面件（合成到高档后不至于只剩挂墙的）', () => {
    // 与 decor-pack.ts 的 category 对应：这里只断言每档件数 ≥2 且档位非空，
    // 具体墙面/家具归属由 decor-pack 自己维护（renderer 才有那份数据）
    for (const t of TIER_ORDER) expect(idsOfTier(t).length).toBeGreaterThanOrEqual(2);
  });

  it('idsOfTier 字典序，结果可预测', () => {
    const ids = idsOfTier('common');
    expect([...ids].sort()).toEqual(ids);
  });

  it('nextTier 到顶为 null', () => {
    expect(nextTier('common')).toBe('rare');
    expect(nextTier('rare')).toBe('epic');
    expect(nextTier('epic')).toBeNull();
  });
});

describe('rollFurniture', () => {
  it('rand 极小值 → 最低档第一件（消耗两次 rand：先档位后具体件）', () => {
    const seq = [0, 0];
    let i = 0;
    const id = rollFurniture(() => seq[i++]);
    expect(tierOf(id)).toBe('common');
    expect(id).toBe(idsOfTier('common')[0]);
  });

  it('rand 接近 1 → 最高档', () => {
    const seq = [0.999, 0.999];
    let i = 0;
    expect(tierOf(rollFurniture(() => seq[i++]))).toBe('epic');
  });

  it('权重大致兑现：common 远多于 epic', () => {
    // 固定步长扫一遍 [0,1)，避免依赖真随机导致偶发失败
    const counts = { common: 0, rare: 0, epic: 0 };
    const N = 1000;
    for (let k = 0; k < N; k++) {
      const seq = [k / N, 0];
      let i = 0;
      counts[tierOf(rollFurniture(() => seq[i++]))]++;
    }
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
    expect(counts.common / N).toBeCloseTo(0.7, 1);
  });

  it('产出的 id 一定在贴纸表里（不会摇出摆不出来的家具）', () => {
    for (let k = 0; k < 50; k++) {
      const seq = [k / 50, (k * 7) % 50 / 50];
      let i = 0;
      const id = rollFurniture(() => seq[i++]);
      expect(idsOfTier(tierOf(id))).toContain(id);
    }
  });
});
