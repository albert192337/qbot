import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_TTL_MS,
  EVENT_ACTIVITY,
  PRIORITY,
  effectiveActivity,
  mergeSessions,
  type SessionEntry,
} from '../src/main/agent-merge';
import type { AgentActivity } from '../src/shared/ipc-types';

const T0 = 1_000_000;
const at = (activity: AgentActivity, ageMs = 0): SessionEntry => ({
  activity,
  updatedAt: T0 - ageMs,
});

describe('agent 会话合成', () => {
  it('空会话表 → idle / 0', () => {
    expect(mergeSessions([], T0)).toEqual({ activity: 'idle', sessions: 0 });
  });

  it('单会话按自身活动态对外展示，计入 sessions', () => {
    expect(mergeSessions([at('working')], T0)).toEqual({
      activity: 'working',
      sessions: 1,
    });
  });

  it('idle 会话不计入 sessions', () => {
    expect(mergeSessions([at('idle'), at('thinking')], T0)).toEqual({
      activity: 'thinking',
      sessions: 1,
    });
  });

  it('error 优先级最高', () => {
    const all: AgentActivity[] = ['idle', 'done', 'waiting', 'thinking', 'working', 'error'];
    expect(mergeSessions(all.map((a) => at(a)), T0).activity).toBe('error');
  });

  it('working / thinking 压过 waiting（挂着的会话不该盖掉真在跑的）', () => {
    expect(mergeSessions([at('waiting'), at('working')], T0).activity).toBe('working');
    expect(mergeSessions([at('waiting'), at('thinking')], T0).activity).toBe('thinking');
  });

  it('waiting 压过 done / idle', () => {
    expect(mergeSessions([at('done'), at('waiting')], T0).activity).toBe('waiting');
    expect(mergeSessions([at('idle'), at('waiting')], T0).activity).toBe('waiting');
  });

  it('PRIORITY 覆盖全部活动态且无重复', () => {
    const all: AgentActivity[] = ['idle', 'thinking', 'working', 'waiting', 'done', 'error'];
    expect([...PRIORITY].sort()).toEqual([...all].sort());
  });
});

describe('活动态 TTL 衰减', () => {
  it('每个活动态都有 TTL（漏一个就会钉死合成状态）', () => {
    const all: AgentActivity[] = ['idle', 'thinking', 'working', 'waiting', 'done', 'error'];
    for (const a of all) {
      expect(ACTIVITY_TTL_MS[a], a).toBeGreaterThan(0);
    }
  });

  it('idle 永不过期（TTL 无穷）', () => {
    expect(effectiveActivity(at('idle', 10 * 60_000), T0)).toBe('idle');
  });

  it('TTL 内保持原活动态，超时降级 idle', () => {
    for (const a of ['thinking', 'working', 'waiting', 'done', 'error'] as AgentActivity[]) {
      const ttl = ACTIVITY_TTL_MS[a];
      expect(effectiveActivity(at(a, ttl - 1), T0), `${a} 未到点`).toBe(a);
      expect(effectiveActivity(at(a, ttl + 1), T0), `${a} 已过期`).toBe('idle');
    }
  });

  it('done 保持 45s 衰减', () => {
    expect(ACTIVITY_TTL_MS.done).toBe(45_000);
    expect(effectiveActivity(at('done', 44_000), T0)).toBe('done');
    expect(effectiveActivity(at('done', 46_000), T0)).toBe('idle');
  });

  it('回归：残留 waiting 会话超 TTL 后不再钉死状态（无限蹦跳 bug）', () => {
    const stale = [at('waiting', ACTIVITY_TTL_MS.waiting + 1)];
    expect(mergeSessions(stale, T0)).toEqual({ activity: 'idle', sessions: 0 });
  });

  it('回归：残留 waiting 不影响新会话的 thinking 展示', () => {
    const merged = mergeSessions(
      [at('waiting', ACTIVITY_TTL_MS.waiting + 1), at('thinking')],
      T0,
    );
    expect(merged).toEqual({ activity: 'thinking', sessions: 1 });
  });

  it('working TTL 足够长，容得下慢工具调用（PreToolUse 到 PostToolUse）', () => {
    expect(ACTIVITY_TTL_MS.working).toBeGreaterThanOrEqual(120_000);
  });
});

describe('hook 事件映射', () => {
  it('覆盖 Claude Code 的状态类事件', () => {
    expect(EVENT_ACTIVITY.SessionStart).toBe('idle');
    expect(EVENT_ACTIVITY.UserPromptSubmit).toBe('thinking');
    expect(EVENT_ACTIVITY.PreToolUse).toBe('working');
    expect(EVENT_ACTIVITY.PostToolUse).toBe('working');
    expect(EVENT_ACTIVITY.Notification).toBe('waiting');
    expect(EVENT_ACTIVITY.Stop).toBe('done');
  });

  it('未知事件无映射（调用方静默忽略）', () => {
    expect(EVENT_ACTIVITY.SomethingElse).toBeUndefined();
    // SessionEnd 走删会话分支，不在映射表里
    expect(EVENT_ACTIVITY.SessionEnd).toBeUndefined();
  });
});
