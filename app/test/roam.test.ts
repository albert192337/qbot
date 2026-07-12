import { describe, expect, it } from 'vitest';
import type { ActionId } from '@qbot/pipeline';
import {
  pointInPolygon,
  polygonCentroid,
  randomPointInPolygon,
} from '../src/renderer/room/geometry';
import {
  ACT_PROB,
  CLICK_ACTION,
  scaleForY,
  step,
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

  it('CHAR_CLICK：走动中被点 → 停在当前位置播 talk_happy', () => {
    const walking: RoamState = {
      kind: 'walking',
      from: { x: 400, y: 500 },
      to: { x: 500, y: 550 },
      durationMs: 1000,
    };
    const clickPos = { x: 450, y: 525 }; // 插值中点（驱动层从 DOM 读出）
    const r = step(walking, { type: 'CHAR_CLICK', pos: clickPos }, ctx());
    expect(r.state).toEqual({ kind: 'acting', action: CLICK_ACTION, pos: clickPos });
    expect(r.play).toBe(CLICK_ACTION);
  });

  it('CHAR_CLICK：无 talk_happy 时退化为原地休息（仍打断走动）', () => {
    const walking: RoamState = {
      kind: 'walking',
      from: { x: 400, y: 500 },
      to: { x: 500, y: 550 },
      durationMs: 1000,
    };
    const r = step(walking, { type: 'CHAR_CLICK', pos: { x: 450, y: 525 } }, ctx(rng(0.5), ['idle']));
    expect(r.state).toEqual({ kind: 'resting', pos: { x: 450, y: 525 } });
    expect(r.play).toBe('idle');
    expect(r.restMs).toBeGreaterThan(0);
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
