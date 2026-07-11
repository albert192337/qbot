/**
 * 桌宠状态机：纯逻辑，不碰 DOM（vitest 可单测）。
 * 状态：idle（loop 常驻）/ auto（随机动作，播 1~3 遍回 idle）/ drag（指针按住）。
 * 调度：idle 时随机 30s~3min 触发一次 auto。
 */
import type { ActionId } from '@qbot/pipeline';

export type PetState =
  | { kind: 'idle' }
  | { kind: 'auto'; action: ActionId; loopsLeft: number }
  | { kind: 'drag' };

export type PetEvent =
  | { type: 'POINTER_DOWN' }
  | { type: 'POINTER_UP' }
  | { type: 'TIMER_FIRE' } // 调度定时器到点
  | { type: 'VIDEO_ENDED' }; // 当前（非 loop）视频播完一遍

export interface StepResult {
  state: PetState;
  /** 需要切换播放的动作（undefined = 不换） */
  play?: ActionId;
  /** 重排调度定时器（回到 idle 时） */
  rescheduleTimer?: boolean;
  /** 清除调度定时器（离开 idle 时） */
  clearTimer?: boolean;
}

export const SCHEDULE_MIN_MS = 30_000;
export const SCHEDULE_MAX_MS = 180_000;
export const AUTO_LOOPS_MIN = 1;
export const AUTO_LOOPS_MAX = 3;

export interface SchedulerRng {
  /** [0,1) */
  random(): number;
}

export function randomDelay(rng: SchedulerRng): number {
  return SCHEDULE_MIN_MS + Math.floor(rng.random() * (SCHEDULE_MAX_MS - SCHEDULE_MIN_MS));
}

export function pickAutoAction(
  available: ActionId[],
  rng: SchedulerRng,
): { action: ActionId; loops: number } | null {
  // 可自主播放的动作：done 且非 idle/drag（由调用方过滤 status，这里过滤语义）
  const pool = available.filter((a) => a !== 'idle' && a !== 'drag');
  if (pool.length === 0) return null;
  const action = pool[Math.floor(rng.random() * pool.length)];
  const loops =
    AUTO_LOOPS_MIN + Math.floor(rng.random() * (AUTO_LOOPS_MAX - AUTO_LOOPS_MIN + 1));
  return { action, loops };
}

export function step(
  state: PetState,
  event: PetEvent,
  ctx: { available: ActionId[]; rng: SchedulerRng },
): StepResult {
  switch (event.type) {
    case 'POINTER_DOWN':
      // 任何状态被按住都进 drag
      if (state.kind === 'drag') return { state };
      return { state: { kind: 'drag' }, play: 'drag', clearTimer: true };

    case 'POINTER_UP':
      if (state.kind !== 'drag') return { state };
      return { state: { kind: 'idle' }, play: 'idle', rescheduleTimer: true };

    case 'TIMER_FIRE': {
      if (state.kind !== 'idle') return { state }; // 非 idle 忽略迟到的定时器
      const picked = pickAutoAction(ctx.available, ctx.rng);
      if (!picked) return { state, rescheduleTimer: true };
      return {
        state: { kind: 'auto', action: picked.action, loopsLeft: picked.loops },
        play: picked.action,
        clearTimer: true,
      };
    }

    case 'VIDEO_ENDED': {
      if (state.kind !== 'auto') return { state }; // idle 是 loop，drag 播完接着循环
      const left = state.loopsLeft - 1;
      if (left <= 0) {
        return { state: { kind: 'idle' }, play: 'idle', rescheduleTimer: true };
      }
      // 还要再播：同一动作重播（play 同值让播放器 restart）
      return { state: { ...state, loopsLeft: left }, play: state.action };
    }
  }
}
