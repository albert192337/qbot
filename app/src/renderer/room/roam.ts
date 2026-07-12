/**
 * 小房间漫游状态机：纯逻辑，不碰 DOM（vitest 可单测），风格同 pet/state-machine.ts。
 * 状态：resting（原地 idle，定时到点后走动或做动作）/ walking（idle 动画平移）/
 * acting（播一遍动作回 resting）。点角色 = 任何状态打断，播 talk_happy。
 */
import type { ActionId } from '@qbot/pipeline';

export interface Point {
  x: number;
  y: number;
}

export interface RoamGeom {
  floor: Array<[number, number]>;
  scaleNear: number;
  scaleFar: number;
}

export type RoamState =
  | { kind: 'resting'; pos: Point }
  | { kind: 'walking'; from: Point; to: Point; durationMs: number }
  | { kind: 'acting'; action: ActionId; pos: Point };

export type RoamEvent =
  | { type: 'REST_OVER' } // 休息定时器到点
  | { type: 'WALK_ARRIVED' }
  | { type: 'VIDEO_ENDED' } // acting 的动作视频播完一遍
  | { type: 'CHAR_CLICK'; pos: Point } // 点角色；pos = 当前实际位置（走动中 = 插值位置）
  | { type: 'SPEAK_ACTION'; action: ActionId }; // Speaker mood 联动请求

export interface RoamResult {
  state: RoamState;
  /** 需要切换播放的动作（undefined = 不换） */
  play?: ActionId;
  /** 重排休息定时器（进入 resting 时给出） */
  restMs?: number;
}

export interface RoamRng {
  /** [0,1) */
  random(): number;
}

export const REST_MIN_MS = 4_000;
export const REST_MAX_MS = 12_000;
/** 走动速度（房间坐标 px/s）与时长夹取 */
export const WALK_SPEED_PX_S = 120;
export const WALK_MIN_MS = 800;
export const WALK_MAX_MS = 3_200;
/** 休息到点后做动作（而非走动）的概率 */
export const ACT_PROB = 0.4;
export const CLICK_ACTION: ActionId = 'talk_happy';

export function randomRestMs(rng: RoamRng): number {
  return REST_MIN_MS + Math.floor(rng.random() * (REST_MAX_MS - REST_MIN_MS));
}

/** 射线法点在多边形内（边上视为在内即可，漫游精度足够） */
export function pointInPolygon(p: Point, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonCentroid(poly: Array<[number, number]>): Point {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) {
    x += px;
    y += py;
  }
  return { x: x / poly.length, y: y / poly.length };
}

/** 地板内随机点：bbox 内 rejection sampling（凸多边形几次就中），兜底质心 */
export function randomPointInPolygon(poly: Array<[number, number]>, rng: RoamRng): Point {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  for (let i = 0; i < 30; i++) {
    const p = {
      x: minX + rng.random() * (maxX - minX),
      y: minY + rng.random() * (maxY - minY),
    };
    if (pointInPolygon(p, poly)) return p;
  }
  return polygonCentroid(poly);
}

/** 等距假透视：y 越靠地板下缘越大（近），线性插值缩放 */
export function scaleForY(y: number, geom: RoamGeom): number {
  const ys = geom.floor.map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const t = maxY === minY ? 1 : Math.min(1, Math.max(0, (y - minY) / (maxY - minY)));
  return geom.scaleFar + (geom.scaleNear - geom.scaleFar) * t;
}

export function walkDurationMs(from: Point, to: Point): number {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const ms = (dist / WALK_SPEED_PX_S) * 1000;
  return Math.min(WALK_MAX_MS, Math.max(WALK_MIN_MS, Math.round(ms)));
}

function pickAction(available: ActionId[], rng: RoamRng): ActionId | null {
  const pool = available.filter((a) => a !== 'idle' && a !== 'drag');
  if (pool.length === 0) return null;
  return pool[Math.floor(rng.random() * pool.length)];
}

/** 当前名义位置（walking 取终点：打断场景由 CHAR_CLICK 自带实际位置） */
function statePos(state: RoamState): Point {
  return state.kind === 'walking' ? state.to : state.pos;
}

export function step(
  state: RoamState,
  event: RoamEvent,
  ctx: { available: ActionId[]; rng: RoamRng; geom: RoamGeom },
): RoamResult {
  switch (event.type) {
    case 'REST_OVER': {
      if (state.kind !== 'resting') return { state }; // 迟到的定时器
      if (ctx.rng.random() < ACT_PROB) {
        const action = pickAction(ctx.available, ctx.rng);
        if (action) {
          return { state: { kind: 'acting', action, pos: state.pos }, play: action };
        }
      }
      const to = randomPointInPolygon(ctx.geom.floor, ctx.rng);
      return {
        state: { kind: 'walking', from: state.pos, to, durationMs: walkDurationMs(state.pos, to) },
        play: 'idle',
      };
    }

    case 'WALK_ARRIVED': {
      if (state.kind !== 'walking') return { state };
      return { state: { kind: 'resting', pos: state.to }, restMs: randomRestMs(ctx.rng) };
    }

    case 'VIDEO_ENDED': {
      if (state.kind !== 'acting') return { state }; // idle 是 loop，播完事件只来自动作
      return {
        state: { kind: 'resting', pos: state.pos },
        play: 'idle',
        restMs: randomRestMs(ctx.rng),
      };
    }

    case 'CHAR_CLICK': {
      // 任何状态打断（走动中停在当前位置）；无 talk_happy 时退化为原地休息
      if (!ctx.available.includes(CLICK_ACTION)) {
        return {
          state: { kind: 'resting', pos: event.pos },
          play: 'idle',
          restMs: randomRestMs(ctx.rng),
        };
      }
      return {
        state: { kind: 'acting', action: CLICK_ACTION, pos: event.pos },
        play: CLICK_ACTION,
      };
    }

    case 'SPEAK_ACTION': {
      // Speaker 只在 canSpeak（resting）时发起，其他状态防御性忽略
      if (state.kind !== 'resting' || !ctx.available.includes(event.action)) return { state };
      return {
        state: { kind: 'acting', action: event.action, pos: statePos(state) },
        play: event.action,
      };
    }
  }
}
