import { describe, expect, it } from 'vitest';
import type { DecorPlacement } from '../src/shared/ipc-types';
import {
  addPlacement,
  depthZ,
  footprintOf,
  footprintsOf,
  isBlocked,
  movePlacement,
  placementTransform,
  removePlacement,
  sanitizePlacements,
  scalePlacement,
  SCALE_MAX,
  SCALE_MIN,
  zoneFor,
} from '../src/renderer/room/decor';
import { FALLBACK_ROOM } from '../src/renderer/room/rooms/default';
import { anchorOf } from '../src/renderer/room/decor-pack';

// 用 SVG 兜底房间的手工几何做测试（默认 PNG 房间坐标随素材实测会变）
const spec = FALLBACK_ROOM;

describe('zone 判定', () => {
  it('左墙/右墙/地板分区正确', () => {
    expect(zoneFor({ x: 200, y: 350 }, spec)).toBe('wallL'); // 左墙中部
    expect(zoneFor({ x: 600, y: 350 }, spec)).toBe('wallR'); // 右墙中部
    expect(zoneFor({ x: 400, y: 500 }, spec)).toBe('free'); // 地板中央
    expect(zoneFor({ x: 400, y: 700 }, spec)).toBe('free'); // 房间实体之外
  });
});

describe('摆放操作', () => {
  it('add：落点决定 zone，scale 初始 1', () => {
    const list = addPlacement([], 'painting', { x: 200, y: 350 }, spec, 'p1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'p1', stickerId: 'painting', zone: 'wallL', scale: 1 });
  });

  it('move：拖过墙界自动切 zone', () => {
    let list = addPlacement([], 'plant', { x: 200, y: 350 }, spec, 'p1');
    list = movePlacement(list, 'p1', { x: 600, y: 350 }, spec);
    expect(list[0].zone).toBe('wallR');
    list = movePlacement(list, 'p1', { x: 400, y: 500 }, spec);
    expect(list[0].zone).toBe('free');
  });

  it('scale：夹取到 [SCALE_MIN, SCALE_MAX]', () => {
    let list = addPlacement([], 'plant', { x: 400, y: 500 }, spec, 'p1');
    list = scalePlacement(list, 'p1', 99);
    expect(list[0].scale).toBe(SCALE_MAX);
    list = scalePlacement(list, 'p1', 0.01);
    expect(list[0].scale).toBe(SCALE_MIN);
    list = scalePlacement(list, 'p1', 1.5);
    expect(list[0].scale).toBe(1.5);
  });

  it('remove：按 id 删除，其余保留', () => {
    let list = addPlacement([], 'plant', { x: 400, y: 500 }, spec, 'p1');
    list = addPlacement(list, 'lantern', { x: 200, y: 350 }, spec, 'p2');
    list = removePlacement(list, 'p1');
    expect(list.map((p) => p.id)).toEqual(['p2']);
  });
});

describe('placementTransform', () => {
  const base: DecorPlacement = { id: 'x', stickerId: 's', x: 100, y: 200, scale: 1.5, zone: 'free' };

  it('free：无墙面矩阵', () => {
    expect(placementTransform(base, spec)).toBe(
      'translate(100px, 200px) scale(1.5) translate(-50%, -50%)',
    );
  });

  it('墙面：插入对应仿射矩阵', () => {
    expect(placementTransform({ ...base, zone: 'wallL' }, spec)).toContain(
      `matrix(${spec.wallMatrixL.join(', ')}, 0, 0)`,
    );
    expect(placementTransform({ ...base, zone: 'wallR' }, spec)).toContain(
      `matrix(${spec.wallMatrixR.join(', ')}, 0, 0)`,
    );
  });
});

describe('sanitizePlacements', () => {
  const known = new Set(['painting', 'plant']);
  const good: DecorPlacement = { id: 'a', stickerId: 'plant', x: 1, y: 2, scale: 1, zone: 'free' };

  it('非数组/损坏输入 → 空', () => {
    expect(sanitizePlacements(null, known)).toEqual([]);
    expect(sanitizePlacements('junk', known)).toEqual([]);
  });

  it('未知贴纸与坏字段整条丢弃，合法项保留', () => {
    const raw = [
      good,
      { ...good, id: 'b', stickerId: 'deleted-sticker' }, // 贴纸包已删素材
      { ...good, id: 'c', x: NaN }, // 坏坐标
      { ...good, id: 'd', zone: 'ceiling' }, // 非法 zone
    ];
    expect(sanitizePlacements(raw, known)).toEqual([good]);
  });
});

describe('等轴地面家具：锚定与深度遮挡', () => {
  const spec = FALLBACK_ROOM;
  /** 落在左墙区域内的点：取左墙多边形顶点均值（凸多边形，质心必在内部）。
   *  多边形是 [x,y] 元组数组，Point 是 {x,y}，这里转一下。 */
  const onWallL = (() => {
    const n = spec.wallL.length;
    const sx = spec.wallL.reduce((a, [x]) => a + x, 0);
    const sy = spec.wallL.reduce((a, [, y]) => a + y, 0);
    return { x: sx / n, y: sy / n };
  })();

  it('floor 锚定恒为 free —— 站在地上的家具不该因落点在墙区就被切变', () => {
    expect(zoneFor(onWallL, spec, 'floor')).toBe('free');
    // 同一个点，wall 锚定则判为左墙
    expect(zoneFor(onWallL, spec, 'wall')).toBe('wallL');
  });

  it('wall 锚定保持原有分区行为（默认参数不变 = 向后兼容）', () => {
    expect(zoneFor(onWallL, spec)).toBe(zoneFor(onWallL, spec, 'wall'));
  });

  it('floor 家具的 transform 不含墙面 matrix', () => {
    const list = addPlacement([], 'screen', onWallL, spec, 'x1', 'floor');
    expect(list[0]!.zone).toBe('free');
    expect(placementTransform(list[0]!, spec)).not.toContain('matrix');
  });

  it('墙面贴纸恒在地面物件之后', () => {
    const wallZ = depthZ(500, spec, 'wall');
    for (const y of [0, 200, 500, 900, spec.height]) {
      expect(depthZ(y, spec, 'floor')).toBeGreaterThan(wallZ);
    }
  });

  it('深度单调：y 越大（越靠前）层级越高', () => {
    const zs = [100, 300, 500, 700, 900].map((y) => depthZ(y, spec));
    for (let i = 1; i < zs.length; i++) {
      expect(zs[i]!).toBeGreaterThan(zs[i - 1]!);
    }
  });

  it('角色与地面家具同刻度：同一 y 得同层级（才能正确交错遮挡）', () => {
    // 角色用默认 anchor='floor'，家具显式传 'floor'，两者必须一致
    expect(depthZ(640, spec)).toBe(depthZ(640, spec, 'floor'));
  });

  it('越界 y 被夹取，不会算出负数或爆表层级', () => {
    expect(depthZ(-500, spec)).toBe(depthZ(0, spec));
    expect(depthZ(spec.height * 3, spec)).toBe(depthZ(spec.height, spec));
    expect(depthZ(-500, spec)).toBeGreaterThan(0);
  });

  it('移动 floor 家具时 zone 始终保持 free', () => {
    let list = addPlacement([], 'screen', { x: 10, y: 10 }, spec, 'x1', 'floor');
    list = movePlacement(list, 'x1', onWallL, spec, 'floor');
    expect(list[0]!.zone).toBe('free');
  });

  it('贴纸包里墙面/家具锚定与直觉一致', () => {
    expect(anchorOf('painting')).toBe('wall');
    expect(anchorOf('lantern')).toBe('wall');
    expect(anchorOf('screen')).toBe('floor');
    expect(anchorOf('plant')).toBe('floor');
    // 未知 id 宽容处理为墙面（与 sanitizePlacements 的宽容策略一致）
    expect(anchorOf('不存在的贴纸')).toBe('wall');
  });
});

describe('家具足迹（碰撞用）', () => {
  const screen = { defaultW: 100, aspect: 2, anchor: 'floor' as const };
  const painting = { defaultW: 100, aspect: 2, anchor: 'wall' as const };
  const at = (x: number, y: number, scale = 1): DecorPlacement =>
    ({ id: 'p', stickerId: 'screen', x, y, scale, zone: 'free' });

  it('墙面挂件不占地（返回 null）', () => {
    expect(footprintOf(at(500, 500), painting)).toBeNull();
  });

  it('scale=1：底边 = 中心 y + 半高', () => {
    const fp = footprintOf(at(500, 400), screen)!;
    const ys = fp.map((q) => q[1]);
    // 高 = 100×2 = 200 → 底边 400 + 100 = 500
    expect(Math.max(...ys)).toBeCloseTo(500);
  });

  it('足迹只占脚下一小块，不是整个立面', () => {
    const fp = footprintOf(at(500, 400), screen)!;
    const ys = fp.map((q) => q[1]);
    const depth = Math.max(...ys) - Math.min(...ys);
    expect(depth).toBeLessThan(100 * 2 * 0.5); // 远小于 200 的立面高度
    expect(depth).toBeCloseTo(100 * 0.35);     // = 宽 × FOOT_DEPTH_RATIO
  });

  it('宽度留了余量（窄于绘制宽度）', () => {
    const fp = footprintOf(at(500, 400), screen)!;
    const xs = fp.map((q) => q[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100 * 0.8);
  });

  it('scale 参与：放大后足迹更宽、底边更低', () => {
    const a = footprintOf(at(500, 400, 1), screen)!;
    const b = footprintOf(at(500, 400, 2), screen)!;
    const wA = Math.max(...a.map((q) => q[0])) - Math.min(...a.map((q) => q[0]));
    const wB = Math.max(...b.map((q) => q[0])) - Math.min(...b.map((q) => q[0]));
    expect(wB).toBeCloseTo(wA * 2);
    expect(Math.max(...b.map((q) => q[1]))).toBeGreaterThan(Math.max(...a.map((q) => q[1])));
  });

  it('scale≠1 时算上 transform 漂移项（否则底边算错）', () => {
    // s=2：视觉底边 = y + h·s/2 + (s-1)·h/2，h=200 → 400 + 200 + 100 = 700
    const fp = footprintOf(at(500, 400, 2), screen)!;
    expect(Math.max(...fp.map((q) => q[1]))).toBeCloseTo(700);
  });

  it('isBlocked：足迹内为 true、外为 false', () => {
    const fps = [footprintOf(at(500, 400), screen)!];
    expect(isBlocked({ x: 500, y: 490 }, fps)).toBe(true);  // 脚下
    expect(isBlocked({ x: 500, y: 300 }, fps)).toBe(false); // 立面中部不算占地
    expect(isBlocked({ x: 800, y: 490 }, fps)).toBe(false); // 旁边
    expect(isBlocked({ x: 500, y: 490 }, [])).toBe(false);  // 无家具
  });

  it('footprintsOf：跳过墙面件与未知贴纸', () => {
    const list: DecorPlacement[] = [
      { id: 'a', stickerId: 'screen', x: 300, y: 400, scale: 1, zone: 'free' },
      { id: 'b', stickerId: 'painting', x: 300, y: 200, scale: 1, zone: 'wallL' },
      { id: 'c', stickerId: '不存在', x: 300, y: 400, scale: 1, zone: 'free' },
    ];
    const lookup = (id: string) =>
      id === 'screen' ? screen : id === 'painting' ? painting : undefined;
    expect(footprintsOf(list, lookup)).toHaveLength(1);
  });
});
