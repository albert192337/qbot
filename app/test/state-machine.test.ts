import { describe, expect, it } from 'vitest';
import {
  pickAutoAction,
  randomDelay,
  step,
  SCHEDULE_MAX_MS,
  SCHEDULE_MIN_MS,
  type PetState,
} from '../src/renderer/pet/state-machine';
import type { ActionId } from '@qbot/pipeline';

const ALL: ActionId[] = ['idle', 'drag', 'sleep', 'tea', 'talk_happy', 'talk_annoyed'];
const rng = (v: number) => ({ random: () => v });

describe('pet state machine', () => {
  it('POINTER_DOWN 从任何状态进 drag 并清定时器', () => {
    for (const s of [
      { kind: 'idle' },
      { kind: 'auto', action: 'tea', loopsLeft: 2 },
    ] as PetState[]) {
      const r = step(s, { type: 'POINTER_DOWN' }, { available: ALL, rng: rng(0) });
      expect(r.state.kind).toBe('drag');
      expect(r.play).toBe('drag');
      expect(r.clearTimer).toBe(true);
    }
  });

  it('POINTER_UP 只在 drag 态生效，回 idle 并重排定时器', () => {
    const r = step({ kind: 'drag' }, { type: 'POINTER_UP' }, { available: ALL, rng: rng(0) });
    expect(r.state.kind).toBe('idle');
    expect(r.play).toBe('idle');
    expect(r.rescheduleTimer).toBe(true);
    const r2 = step({ kind: 'idle' }, { type: 'POINTER_UP' }, { available: ALL, rng: rng(0) });
    expect(r2.state.kind).toBe('idle');
    expect(r2.play).toBeUndefined();
  });

  it('TIMER_FIRE 在 idle 时切随机 auto 动作', () => {
    const r = step({ kind: 'idle' }, { type: 'TIMER_FIRE' }, { available: ALL, rng: rng(0) });
    expect(r.state.kind).toBe('auto');
    if (r.state.kind === 'auto') {
      expect(['sleep', 'tea', 'talk_happy', 'talk_annoyed']).toContain(r.state.action);
      expect(r.state.loopsLeft).toBeGreaterThanOrEqual(1);
    }
  });

  it('TIMER_FIRE 在非 idle 时忽略（迟到的定时器）', () => {
    const r = step(
      { kind: 'auto', action: 'tea', loopsLeft: 1 },
      { type: 'TIMER_FIRE' },
      { available: ALL, rng: rng(0) },
    );
    expect(r.state).toEqual({ kind: 'auto', action: 'tea', loopsLeft: 1 });
  });

  it('VIDEO_ENDED 递减 loopsLeft，归零回 idle', () => {
    const r1 = step(
      { kind: 'auto', action: 'tea', loopsLeft: 2 },
      { type: 'VIDEO_ENDED' },
      { available: ALL, rng: rng(0) },
    );
    expect(r1.state).toEqual({ kind: 'auto', action: 'tea', loopsLeft: 1 });
    expect(r1.play).toBe('tea'); // 重播同一动作

    const r2 = step(r1.state, { type: 'VIDEO_ENDED' }, { available: ALL, rng: rng(0) });
    expect(r2.state.kind).toBe('idle');
    expect(r2.play).toBe('idle');
    expect(r2.rescheduleTimer).toBe(true);
  });

  it('pickAutoAction 排除 idle/drag；failed 动作由调用方过滤（available 只含 done）', () => {
    expect(pickAutoAction(['idle', 'drag'] as ActionId[], rng(0))).toBeNull();
    const picked = pickAutoAction(['idle', 'drag', 'sleep'] as ActionId[], rng(0));
    expect(picked?.action).toBe('sleep');
  });

  it('randomDelay 在 30s~3min 区间', () => {
    expect(randomDelay(rng(0))).toBe(SCHEDULE_MIN_MS);
    expect(randomDelay(rng(0.999999))).toBeLessThan(SCHEDULE_MAX_MS);
  });
});
