/**
 * 小房间漫游状态机：纯逻辑，不碰 DOM（vitest 可单测），风格同 pet/state-machine.ts。
 * 状态：resting（原地 idle，定时到点后走动或做动作）/ walking（idle 动画平移）/
 * acting（播一遍动作回 resting）。点角色 = 任何状态打断，播 talk_happy。
 */
import type { ActionId } from '@qbot/pipeline';
import { isBlocked, type Footprint } from './decor';
import { pointInPolygon, randomPointInPolygon, type Point } from './geometry';

export type { Point } from './geometry';

export interface RoamGeom {
  floor: Array<[number, number]>;
  scaleNear: number;
  scaleFar: number;
}

export type RoamState =
  | { kind: 'resting'; pos: Point }
  | { kind: 'walking'; from: Point; to: Point; durationMs: number }
  | { kind: 'acting'; action: ActionId; pos: Point }
  | { kind: 'dragging'; pos: Point };

export type RoamEvent =
  | { type: 'REST_OVER' } // 休息定时器到点
  | { type: 'WALK_ARRIVED' }
  | { type: 'VIDEO_ENDED' } // acting 的动作视频播完一遍
  | { type: 'CHAR_CLICK'; pos: Point } // 点角色；pos = 当前实际位置（走动中 = 插值位置）
  | { type: 'SPEAK_ACTION'; action: ActionId } // Speaker mood 联动请求
  | { type: 'DRAG_START'; pos: Point } // 拎起角色
  | { type: 'DRAG_MOVE'; pos: Point } // 拖动中（位置由入口层直接渲染，状态只记录）
  | { type: 'DRAG_END'; pos: Point }; // 放下

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
/** 点一下走一小会的位移上限（房间坐标 px） */
export const CLICK_WALK_MAX_PX = 220;
/** 被拎起时播的动作 */
export const DRAG_ACTION: ActionId = 'drag';

export function randomRestMs(rng: RoamRng): number {
  return REST_MIN_MS + Math.floor(rng.random() * (REST_MAX_MS - REST_MIN_MS));
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

/** step() 上下文。blocked 可选 → 现有 GEOM fixture 与 ctx() helper 不改也能编译 */
export interface RoamCtx {
  available: ActionId[];
  rng: RoamRng;
  geom: RoamGeom;
  /** 地面家具足迹：落点要避开，路径撞上就提前停 */
  blocked?: readonly Footprint[];
}

export function step(state: RoamState, event: RoamEvent, ctx: RoamCtx): RoamResult {
  switch (event.type) {
    case 'REST_OVER': {
      if (state.kind !== 'resting') return { state }; // 迟到的定时器（含 dragging）
      if (ctx.rng.random() < ACT_PROB) {
        const action = pickAction(ctx.available, ctx.rng);
        if (action) {
          return { state: { kind: 'acting', action, pos: state.pos }, play: action };
        }
      }
      const to = pickFreePoint(ctx, () => randomPointInPolygon(ctx.geom.floor, ctx.rng));
      // 全被家具挡住（房间塞满）→ 退化为原地休息。不能硬塞一个可能非法的点：
      // randomPointInPolygon 的兜底是质心，而质心自己可能正压在家具上。
      if (!to) return { state, restMs: randomRestMs(ctx.rng) };
      return walkTo(state.pos, to, ctx);
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
      // 点一下 = 往地板上就近走一小会（比原来的原地 talk_happy 更有反馈）。
      // 被拎着时不响应点击。
      if (state.kind === 'dragging') return { state };
      const from = event.pos;
      const target = pickFreePoint(ctx, () => nearbyFloorPoint(from, ctx.geom, ctx.rng));
      if (!target) return { state: { kind: 'resting', pos: from }, play: 'idle', restMs: randomRestMs(ctx.rng) };
      return walkTo(from, target, ctx);
    }

    case 'DRAG_START': {
      const play = ctx.available.includes(DRAG_ACTION) ? DRAG_ACTION : undefined;
      return { state: { kind: 'dragging', pos: event.pos }, play };
    }

    case 'DRAG_MOVE': {
      if (state.kind !== 'dragging') return { state };
      return { state: { kind: 'dragging', pos: event.pos } };
    }

    case 'DRAG_END': {
      if (state.kind !== 'dragging') return { state };
      // 松手落回地板内（拖到墙上/外面就吸附到最近的合法点）
      const pos = ctx.geom.floor.length && pointInPolygon(event.pos, ctx.geom.floor)
        ? event.pos
        : randomPointInPolygon(ctx.geom.floor, ctx.rng);
      return { state: { kind: 'resting', pos }, play: 'idle', restMs: randomRestMs(ctx.rng) };
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

/**
 * 从当前位置就近取一个地板内的落点（点一下走一小会用）。
 * 随机方向、随机距离，取不到合法点就回落到地板内任意点。
 */
function nearbyFloorPoint(from: Point, geom: RoamGeom, rng: RoamRng): Point {
  for (let i = 0; i < 12; i++) {
    const angle = rng.random() * Math.PI * 2;
    const dist = CLICK_WALK_MAX_PX * (0.45 + rng.random() * 0.55);
    const p = { x: from.x + Math.cos(angle) * dist, y: from.y + Math.sin(angle) * dist };
    if (pointInPolygon(p, geom.floor)) return p;
  }
  return randomPointInPolygon(geom.floor, rng);
}

/** 反复取点直到不被家具挡住；全失败返回 null（调用方退化为原地休息） */
function pickFreePoint(ctx: RoamCtx, gen: () => Point): Point | null {
  const blocked = ctx.blocked;
  for (let i = 0; i < 16; i++) {
    const p = gen();
    if (!blocked?.length || !isBlocked(p, blocked)) return p;
  }
  return null;
}

/**
 * 构造走动状态：路径若撞上家具足迹，就把终点收到**撞上前的最后一个安全点**
 * 并按新距离重算时长 —— 这就是「遇到家具停下来」，不绕路。
 */
function walkTo(from: Point, to: Point, ctx: RoamCtx): RoamResult {
  const target = ctx.blocked?.length ? truncateAtBlocked(from, to, ctx.blocked) : to;
  return {
    state: { kind: 'walking', from, to: target, durationMs: walkDurationMs(from, target) },
    play: 'idle', // 入口层有 walk 动画时会覆盖成 walk
  };
}

/** 沿 from→to 采样，返回撞上足迹前的最后一个安全点（没撞上就是 to） */
export function truncateAtBlocked(
  from: Point,
  to: Point,
  blocked: readonly Footprint[],
  samples = 16,
): Point {
  let safe = from;
  for (let i = 1; i <= samples; i++) {
    const k = i / samples;
    const p = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
    if (isBlocked(p, blocked)) return safe;
    safe = p;
  }
  return to;
}
