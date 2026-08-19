import { describe, expect, it } from 'vitest';
import type { ActionId } from '@qbot/pipeline';
import {
  pointInPolygon,
  polygonCentroid,
  randomPointInPolygon,
} from '../src/renderer/room/geometry';
import { isBlocked } from '../src/renderer/room/decor';
import {
  ACT_PROB,
  CLICK_ACTION,
  CLICK_WALK_MAX_PX,
  scaleForY,
  step,
  truncateAtBlocked,
  walkDurationMs,
  WALK_MAX_MS,
  WALK_MIN_MS,
  type RoamGeom,
  type RoamState,
} from '../src/renderer/room/roam';

const ALL: ActionId[] = ['idle', 'drag', 'sleep', 'tea', 'talk_happy', 'talk_annoyed'];
const GEOM: RoamGeom = {
  floor: [
    [400, 390],
    [640, 510],
    [400, 620],
    [160, 510],
  ],
  scaleNear: 1,
  scaleFar: 0.62,
};
const rng = (v: number) => ({ random: () => v });
/** 依次吐出给定序列，用完循环最后一个 */
const seqRng = (vs: number[]) => {
  let i = 0;
  return { random: () => vs[Math.min(i++, vs.length - 1)] };
};
const ctx = (r = rng(0.5), available = ALL) => ({ available, rng: r, geom: GEOM });

describe('几何工具', () => {
  it('randomPointInPolygon 采样恒在地板多边形内', () => {
    // LCG 伪随机，可复现
    let seed = 42;
    const lcg = { random: () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32) };
    for (let i = 0; i < 200; i++) {
      const p = randomPointInPolygon(GEOM.floor, lcg);
      expect(pointInPolygon(p, GEOM.floor)).toBe(true);
    }
  });

  it('采样一直失败时兜底质心', () => {
    // rng 永远返回 0 → 候选点 = bbox 左上角（多边形外）→ 30 次后回质心
    const p = randomPointInPolygon(GEOM.floor, rng(0));
    expect(p).toEqual(polygonCentroid(GEOM.floor));
  });

  it('scaleForY 端点与夹取正确', () => {
    expect(scaleForY(390, GEOM)).toBeCloseTo(0.62); // 地板最上缘 = 最远
    expect(scaleForY(620, GEOM)).toBeCloseTo(1); // 最下缘 = 最近
    expect(scaleForY(0, GEOM)).toBeCloseTo(0.62); // 越界夹取
    expect(scaleForY(999, GEOM)).toBeCloseTo(1);
  });

  it('walkDurationMs 按距离计算并夹取上下限', () => {
    expect(walkDurationMs({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(WALK_MIN_MS);
    expect(walkDurationMs({ x: 0, y: 0 }, { x: 9999, y: 0 })).toBe(WALK_MAX_MS);
    // 240px @120px/s = 2000ms
    expect(walkDurationMs({ x: 0, y: 0 }, { x: 240, y: 0 })).toBe(2000);
  });
});

describe('漫游状态机', () => {
  const resting: RoamState = { kind: 'resting', pos: { x: 400, y: 500 } };

  it('REST_OVER：掷中动作概率时进 acting 播随机动作', () => {
    // 第一次 random < ACT_PROB 走动作分支，第二次挑动作
    const r = step(resting, { type: 'REST_OVER' }, ctx(seqRng([ACT_PROB - 0.01, 0])));
    expect(r.state.kind).toBe('acting');
    expect(r.play).toBe('sleep'); // pool = 非 idle/drag 的第一个
  });

  it('REST_OVER：未掷中动作时走向地板内随机点', () => {
    const r = step(resting, { type: 'REST_OVER' }, ctx(rng(0.5)));
    expect(r.state.kind).toBe('walking');
    expect(r.play).toBe('idle');
    if (r.state.kind === 'walking') {
      expect(pointInPolygon(r.state.to, GEOM.floor)).toBe(true);
      expect(r.state.from).toEqual(resting.pos);
    }
  });

  it('REST_OVER：掷中动作但无可用动作时仍走动', () => {
    const r = step(resting, { type: 'REST_OVER' }, ctx(rng(0.1), ['idle', 'drag']));
    expect(r.state.kind).toBe('walking');
  });

  it('WALK_ARRIVED：到点转 resting 并重排休息定时器', () => {
    const walking: RoamState = {
      kind: 'walking',
      from: { x: 400, y: 500 },
      to: { x: 500, y: 550 },
      durationMs: 1000,
    };
    const r = step(walking, { type: 'WALK_ARRIVED' }, ctx());
    expect(r.state).toEqual({ kind: 'resting', pos: { x: 500, y: 550 } });
    expect(r.restMs).toBeGreaterThan(0);
  });

  it('VIDEO_ENDED：acting 播完回 resting + idle', () => {
    const acting: RoamState = { kind: 'acting', action: 'tea', pos: { x: 400, y: 500 } };
    const r = step(acting, { type: 'VIDEO_ENDED' }, ctx());
    expect(r.state).toEqual({ kind: 'resting', pos: { x: 400, y: 500 } });
    expect(r.play).toBe('idle');
    expect(r.restMs).toBeGreaterThan(0);
  });

  it('VIDEO_ENDED：非 acting 态忽略（idle loop 不产生状态变化）', () => {
    const r = step(resting, { type: 'VIDEO_ENDED' }, ctx());
    expect(r.state).toBe(resting);
    expect(r.play).toBeUndefined();
  });

  it('CHAR_CLICK：点一下从当前位置就近走一小会（v3 语义，原来是原地 talk_happy）', () => {
    const walking: RoamState = {
      kind: 'walking',
      from: { x: 400, y: 500 },
      to: { x: 500, y: 550 },
      durationMs: 1000,
    };
    const clickPos = { x: 450, y: 525 }; // 插值中点（驱动层从 DOM 读出）
    const r = step(walking, { type: 'CHAR_CLICK', pos: clickPos }, ctx());
    expect(r.state.kind).toBe('walking');
    if (r.state.kind === 'walking') {
      expect(r.state.from).toEqual(clickPos); // 从点击时的实际位置起步
      expect(r.state.durationMs).toBeGreaterThan(0);
      // 落点在地板内，且不超过就近位移上限
      expect(pointInPolygon(r.state.to, GEOM.floor)).toBe(true);
      const d = Math.hypot(r.state.to.x - clickPos.x, r.state.to.y - clickPos.y);
      expect(d).toBeLessThanOrEqual(CLICK_WALK_MAX_PX + 1);
    }
  });

  it('CHAR_CLICK：resting 态点一下也会走（不再原地做动作）', () => {
    const r = step(resting, { type: 'CHAR_CLICK', pos: resting.pos }, ctx());
    expect(r.state.kind).toBe('walking');
  });

  it('CHAR_CLICK：被拎着时不响应', () => {
    const dragging: RoamState = { kind: 'dragging', pos: { x: 400, y: 500 } };
    const r = step(dragging, { type: 'CHAR_CLICK', pos: { x: 400, y: 500 } }, ctx());
    expect(r.state).toBe(dragging);
  });

  it('DRAG_START：进 dragging 并播 drag 动画', () => {
    const r = step(resting, { type: 'DRAG_START', pos: { x: 300, y: 400 } }, ctx());
    expect(r.state).toEqual({ kind: 'dragging', pos: { x: 300, y: 400 } });
    expect(r.play).toBe('drag');
  });

  it('DRAG_MOVE：只更新位置，非 dragging 态忽略', () => {
    const dragging: RoamState = { kind: 'dragging', pos: { x: 300, y: 400 } };
    const r = step(dragging, { type: 'DRAG_MOVE', pos: { x: 350, y: 420 } }, ctx());
    expect(r.state).toEqual({ kind: 'dragging', pos: { x: 350, y: 420 } });
    const r2 = step(resting, { type: 'DRAG_MOVE', pos: { x: 1, y: 2 } }, ctx());
    expect(r2.state).toBe(resting);
  });

  it('DRAG_END：落在地板内就地放下，重排休息定时器', () => {
    const inside = polygonCentroid(GEOM.floor);
    const dragging: RoamState = { kind: 'dragging', pos: inside };
    const r = step(dragging, { type: 'DRAG_END', pos: inside }, ctx());
    expect(r.state).toEqual({ kind: 'resting', pos: inside });
    expect(r.play).toBe('idle');
    expect(r.restMs).toBeGreaterThan(0);
  });

  it('DRAG_END：拖到地板外会吸附回地板内', () => {
    const outside = { x: -9999, y: -9999 };
    const dragging: RoamState = { kind: 'dragging', pos: outside };
    const r = step(dragging, { type: 'DRAG_END', pos: outside }, ctx());
    expect(r.state.kind).toBe('resting');
    if (r.state.kind === 'resting') {
      expect(pointInPolygon(r.state.pos, GEOM.floor)).toBe(true);
    }
  });

  it('REST_OVER / WALK_ARRIVED 在 dragging 态被忽略（被拎着时定时器不生效）', () => {
    const dragging: RoamState = { kind: 'dragging', pos: { x: 400, y: 500 } };
    expect(step(dragging, { type: 'REST_OVER' }, ctx()).state).toBe(dragging);
    expect(step(dragging, { type: 'WALK_ARRIVED' }, ctx()).state).toBe(dragging);
  });

  it('SPEAK_ACTION：resting 时接受 mood 联动动作', () => {
    const r = step(resting, { type: 'SPEAK_ACTION', action: 'talk_annoyed' }, ctx());
    expect(r.state).toEqual({ kind: 'acting', action: 'talk_annoyed', pos: resting.pos });
    expect(r.play).toBe('talk_annoyed');
  });

  it('SPEAK_ACTION：非 resting 态忽略', () => {
    const acting: RoamState = { kind: 'acting', action: 'tea', pos: { x: 400, y: 500 } };
    const r = step(acting, { type: 'SPEAK_ACTION', action: 'talk_happy' }, ctx());
    expect(r.state).toBe(acting);
    expect(r.play).toBeUndefined();
  });
});

describe('家具阻挡', () => {
  /** 盖住地板中心一带的足迹（GEOM.floor 菱形中心约 400,505） */
  const blockCenter: Array<[number, number]> = [
    [330, 470], [470, 470], [470, 540], [330, 540],
  ];
  /** 真随机（LCG）：常量 rng 会让拒绝采样 30 次拿到同一个点，测不出真实行为 */
  const lcg = () => {
    let seed = 12345;
    return { random: () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32) };
  };
  const ctxB = (blocked: Array<Array<[number, number]>>, r = lcg(), available = ALL) =>
    ({ available, rng: r, geom: GEOM, blocked });
  /** 起点放在地板内、且不在上面那块足迹里 */
  const resting: RoamState = { kind: 'resting', pos: { x: 300, y: 570 } };

  it('REST_OVER：落点避开家具足迹', () => {
    // 掷不中动作（rng 首个值需 >= ACT_PROB）→ 走动分支
    for (let i = 0; i < 30; i++) {
      const r = step(resting, { type: 'REST_OVER' }, ctxB([blockCenter], lcg()));
      if (r.state.kind !== 'walking') continue;
      expect(isBlocked(r.state.to, [blockCenter])).toBe(false);
    }
  });

  it('CHAR_CLICK：就近落点也避开家具', () => {
    const from = { x: 300, y: 560 };
    for (let i = 0; i < 20; i++) {
      const r = step(resting, { type: 'CHAR_CLICK', pos: from }, ctxB([blockCenter], lcg()));
      if (r.state.kind !== 'walking') continue;
      expect(isBlocked(r.state.to, [blockCenter])).toBe(false);
    }
  });

  it('truncateAtBlocked：撞上家具就停在撞上前，不穿过去', () => {
    const from = { x: 400, y: 610 };  // 家具下方
    const to = { x: 400, y: 400 };    // 家具上方（直线必穿过）
    const cut = truncateAtBlocked(from, to, [blockCenter]);
    expect(isBlocked(cut, [blockCenter])).toBe(false);
    // 停在家具近侧（y 大于足迹底边），且确实往目标方向前进了
    expect(cut.y).toBeGreaterThan(540);
    expect(cut.y).toBeLessThan(from.y);
  });

  it('truncateAtBlocked：路径不撞家具时原样返回终点', () => {
    const from = { x: 250, y: 560 };
    const to = { x: 300, y: 590 };
    expect(truncateAtBlocked(from, to, [blockCenter])).toEqual(to);
  });

  it('走动时长跟着截断后的距离缩短', () => {
    const from = { x: 400, y: 610 };
    const to = { x: 400, y: 400 };
    const full = walkDurationMs(from, to);
    const cut = truncateAtBlocked(from, to, [blockCenter]);
    const short = walkDurationMs(from, cut);
    expect(short).toBeLessThanOrEqual(full);
    expect(walkDurationMs(from, cut)).toBe(short); // 纯函数
  });

  it('整个地板被挡住时退化为原地休息，不硬塞非法点', () => {
    const coverAll: Array<[number, number]> = [
      [0, 0], [1000, 0], [1000, 1000], [0, 1000],
    ];
    const r = step(resting, { type: 'REST_OVER' }, ctxB([coverAll], lcg(), ['idle', 'drag']));
    expect(r.state.kind).toBe('resting');
    expect(r.restMs).toBeGreaterThan(0);
  });

  it('无 blocked 字段时行为与改动前一致（向后兼容）', () => {
    const r = step(resting, { type: 'REST_OVER' }, ctx(rng(0.5)));
    expect(r.state.kind).toBe('walking');
  });
});
