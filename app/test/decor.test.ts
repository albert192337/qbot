import { describe, expect, it } from 'vitest';
import type { DecorPlacement } from '../src/shared/ipc-types';
import {
  addPlacement,
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
