import { describe, expect, it } from 'vitest';
import {
  AGENT_ACTION,
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

  it('PLAY_ACTION 立即切换指定动作播 1 遍，drag 中忽略', () => {
    const r = step({ kind: 'idle' }, { type: 'PLAY_ACTION', action: 'tea' }, { available: ALL, rng: rng(0) });
    expect(r.state).toEqual({ kind: 'auto', action: 'tea', loopsLeft: 1 });
    expect(r.play).toBe('tea');
    expect(r.clearTimer).toBe(true);

    // 播完自动回 idle
    const r2 = step(r.state, { type: 'VIDEO_ENDED' }, { available: ALL, rng: rng(0) });
    expect(r2.state.kind).toBe('idle');

    // drag 中忽略
    const r3 = step({ kind: 'drag' }, { type: 'PLAY_ACTION', action: 'tea' }, { available: ALL, rng: rng(0) });
    expect(r3.state.kind).toBe('drag');
    expect(r3.play).toBeUndefined();

    // 不可用动作忽略
    const r4 = step({ kind: 'idle' }, { type: 'PLAY_ACTION', action: 'tea' }, { available: ['idle'], rng: rng(0) });
    expect(r4.state.kind).toBe('idle');
    expect(r4.play).toBeUndefined();
  });

  it('randomDelay 在 30s~3min 区间', () => {
    expect(randomDelay(rng(0))).toBe(SCHEDULE_MIN_MS);
    expect(randomDelay(rng(0.999999))).toBeLessThan(SCHEDULE_MAX_MS);
  });
});

describe('agent 联动', () => {
  it('AGENT_STATUS 进行中活动映射动作并进 agent 态', () => {
    const cases: Array<[string, ActionId]> = [
      ['thinking', 'tea'],
      ['working', 'talk_happy'],
      ['waiting', 'talk_annoyed'],
      ['error', 'talk_annoyed'],
    ];
    for (const [activity, action] of cases) {
      const r = step(
        { kind: 'idle' },
        { type: 'AGENT_STATUS', activity: activity as never },
        { available: ALL, rng: rng(0) },
      );
      expect(r.state).toEqual({ kind: 'agent', activity, action });
      expect(r.play).toBe(action);
      expect(r.clearTimer).toBe(true);
    }
  });

  it('回归：agent 活动一律不映射到 drag（粘性循环 + drag 动画 = 无限蹦跳）', () => {
    for (const action of Object.values(AGENT_ACTION)) {
      expect(action).not.toBe('drag');
    }
  });

  it('agent 态 VIDEO_ENDED 重播同动作（粘性循环）', () => {
    const s: PetState = { kind: 'agent', activity: 'thinking', action: 'tea' };
    const r = step(s, { type: 'VIDEO_ENDED' }, { available: ALL, rng: rng(0) });
    expect(r.state).toBe(s);
    expect(r.play).toBe('tea');
  });

  it('活动切换换动作重播，同动作只换语义不重播', () => {
    const thinking: PetState = { kind: 'agent', activity: 'thinking', action: 'tea' };
    const r = step(thinking, { type: 'AGENT_STATUS', activity: 'working' }, { available: ALL, rng: rng(0) });
    expect(r.state).toEqual({ kind: 'agent', activity: 'working', action: 'talk_happy' });
    expect(r.play).toBe('talk_happy');

    // working → done 庆祝 → talk_happy 已在播：done 走 auto 分支，动作相同也重播（从头庆祝）
    const same = step(
      { kind: 'agent', activity: 'working', action: 'talk_happy' },
      { type: 'AGENT_STATUS', activity: 'working' },
      { available: ALL, rng: rng(0) },
    );
    expect(same.state.kind).toBe('agent');
    expect(same.play).toBeUndefined();
  });

  it('idle 活动退出 agent 态回 idle；非 agent 态忽略', () => {
    const r = step(
      { kind: 'agent', activity: 'working', action: 'talk_happy' },
      { type: 'AGENT_STATUS', activity: 'idle' },
      { available: ALL, rng: rng(0) },
    );
    expect(r.state.kind).toBe('idle');
    expect(r.play).toBe('idle');
    expect(r.rescheduleTimer).toBe(true);

    const r2 = step({ kind: 'idle' }, { type: 'AGENT_STATUS', activity: 'idle' }, { available: ALL, rng: rng(0) });
    expect(r2.state.kind).toBe('idle');
    expect(r2.play).toBeUndefined();
  });

  it('done 一次性庆祝 2 遍后回 idle', () => {
    const r = step(
      { kind: 'agent', activity: 'working', action: 'talk_happy' },
      { type: 'AGENT_STATUS', activity: 'done' },
      { available: ALL, rng: rng(0) },
    );
    expect(r.state).toEqual({ kind: 'auto', action: 'talk_happy', loopsLeft: 2 });
    const r2 = step(r.state, { type: 'VIDEO_ENDED' }, { available: ALL, rng: rng(0) });
    const r3 = step(r2.state, { type: 'VIDEO_ENDED' }, { available: ALL, rng: rng(0) });
    expect(r3.state.kind).toBe('idle');
  });

  it('drag 中忽略 AGENT_STATUS（由入口层松手后恢复）', () => {
    const r = step({ kind: 'drag' }, { type: 'AGENT_STATUS', activity: 'working' }, { available: ALL, rng: rng(0) });
    expect(r.state.kind).toBe('drag');
    expect(r.play).toBeUndefined();
  });

  it('映射动作不可用时退化为 idle 动画但保持 agent 态', () => {
    const r = step(
      { kind: 'idle' },
      { type: 'AGENT_STATUS', activity: 'thinking' },
      { available: ['idle', 'drag'], rng: rng(0) },
    );
    expect(r.state).toEqual({ kind: 'agent', activity: 'thinking', action: 'idle' });
    expect(r.play).toBe('idle');
  });

  it('POINTER_DOWN 可打断 agent 态进 drag', () => {
    const r = step(
      { kind: 'agent', activity: 'working', action: 'talk_happy' },
      { type: 'POINTER_DOWN' },
      { available: ALL, rng: rng(0) },
    );
    expect(r.state.kind).toBe('drag');
    expect(r.play).toBe('drag');
  });

  it('TIMER_FIRE 在 agent 态忽略（不插播随机动作）', () => {
    const s: PetState = { kind: 'agent', activity: 'thinking', action: 'tea' };
    const r = step(s, { type: 'TIMER_FIRE' }, { available: ALL, rng: rng(0) });
    expect(r.state).toBe(s);
    expect(r.play).toBeUndefined();
  });
});
