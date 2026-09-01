/**
 * 规则引擎单测。
 * 覆盖：条件评估 / 命中筛选 / 加权抽选 / 脚本生成 / 同组互斥。
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  evaluateRule,
  checkCondition,
  pickWeighted,
  pickLine,
  buildScriptFromRule,
  applyGroupMutex,
  findMatches,
} from '../src/main/rules/rule-engine';
import type { BehaviorRule, RuleContext } from '../src/shared/rule-types';

function baseCtx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    now: new Date('2026-08-30T20:00:00'), // 周日 20:00
    currentApp: 'Code',
    currentAppMs: 5 * 60 * 1000,
    todayLedger: {
      totalSwitches: 12,
      apps: { Code: { focusMs: 3600_000, switches: 5 } },
      firstActivityAt: new Date('2026-08-30T09:00:00').getTime(),
      lastActivityAt: new Date('2026-08-30T19:55:00').getTime(),
    },
    agent: { activity: 'idle', sessions: 3, consecutiveErrors: 0 },
    inMeeting: false,
    musicPlaying: false,
    sinceLastInteractMs: 30 * 60 * 1000,
    availableActions: ['idle', 'drag', 'sleep', 'tea', 'talk_happy', 'talk_annoyed'],
    sinceStartupMs: 2 * 3600 * 1000,
    ...overrides,
  };
}

describe('checkCondition 单条件', () => {
  it('time_range 同一天内', () => {
    const ctx = baseCtx({ now: new Date('2026-08-30T22:30:00') });
    expect(checkCondition({ kind: 'time_range', from: '20:00', to: '23:00' }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'time_range', from: '23:00', to: '05:00' }, ctx)).toBe(false);
  });

  it('time_range 跨零点', () => {
    const ctx = baseCtx({ now: new Date('2026-08-30T02:00:00') });
    expect(checkCondition({ kind: 'time_range', from: '23:00', to: '05:00' }, ctx)).toBe(true);
  });

  it('weekday', () => {
    // 2026-08-30 是周日（getDay() = 0）
    const ctx = baseCtx();
    expect(checkCondition({ kind: 'weekday', days: [0, 6] }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'weekday', days: [1, 2, 3, 4, 5] }, ctx)).toBe(false);
  });

  it('hour_at_least / hour_at_most', () => {
    const ctx = baseCtx(); // 20:00
    expect(checkCondition({ kind: 'hour_at_least', hour: 18 }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'hour_at_least', hour: 22 }, ctx)).toBe(false);
    expect(checkCondition({ kind: 'hour_at_most', hour: 22 }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'hour_at_most', hour: 18 }, ctx)).toBe(false);
  });

  it('app_is / app_contains', () => {
    const ctx = baseCtx(); // currentApp = 'Code'
    expect(checkCondition({ kind: 'app_is', app: 'code' }, ctx)).toBe(true); // 大小写不敏感
    expect(checkCondition({ kind: 'app_is', app: 'Code' }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'app_is', app: 'Safari' }, ctx)).toBe(false);
    expect(checkCondition({ kind: 'app_contains', keyword: 'od' }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'app_contains', keyword: 'xyz' }, ctx)).toBe(false);
  });

  it('app_switches_ge', () => {
    const ctx = baseCtx(); // totalSwitches = 12
    expect(checkCondition({ kind: 'app_switches_ge', count: 10 }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'app_switches_ge', count: 20 }, ctx)).toBe(false);
  });

  it('idle_minutes_ge', () => {
    const ctx = baseCtx(); // lastActivityAt = 19:55, now = 20:00 → 5 分钟
    expect(checkCondition({ kind: 'idle_minutes_ge', minutes: 3 }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'idle_minutes_ge', minutes: 10 }, ctx)).toBe(false);
  });

  it('agent 条件', () => {
    let ctx = baseCtx({ agent: { activity: 'working', sessions: 5, consecutiveErrors: 2 } });
    expect(checkCondition({ kind: 'agent_active' }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'agent_active', activity: 'working' }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'agent_active', activity: 'thinking' }, ctx)).toBe(false);
    expect(checkCondition({ kind: 'agent_sessions_ge', count: 4 }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'agent_consecutive_errors_ge', count: 2 }, ctx)).toBe(true);

    ctx = baseCtx({ agent: { activity: 'idle', sessions: 0, consecutiveErrors: 0 } });
    expect(checkCondition({ kind: 'agent_active' }, ctx)).toBe(false);
  });

  it('会议 / 音乐', () => {
    let ctx = baseCtx({ inMeeting: true, musicPlaying: false });
    expect(checkCondition({ kind: 'in_meeting' }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'not_in_meeting' }, ctx)).toBe(false);
    expect(checkCondition({ kind: 'music_playing' }, ctx)).toBe(false);
    expect(checkCondition({ kind: 'music_not_playing' }, ctx)).toBe(true);
  });

  it('交互条件', () => {
    const ctx = baseCtx({ sinceLastInteractMs: 45 * 60 * 1000 });
    expect(checkCondition({ kind: 'since_last_interact_ge', minutes: 30 }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'since_last_interact_ge', minutes: 60 }, ctx)).toBe(false);
    expect(checkCondition({ kind: 'since_last_interact_lt', minutes: 60 }, ctx)).toBe(true);
    expect(checkCondition({ kind: 'since_last_interact_lt', minutes: 10 }, ctx)).toBe(false);
  });

  it('monday_feeling', () => {
    // 周一 10:00 → true
    const monday = baseCtx({ now: new Date('2026-08-31T10:00:00') });
    expect(checkCondition({ kind: 'monday_feeling' }, monday)).toBe(true);
    // 周二 → false
    const tuesday = baseCtx({ now: new Date('2026-09-01T10:00:00') });
    expect(checkCondition({ kind: 'monday_feeling' }, tuesday)).toBe(false);
    // 周一 8:00 → false（太早）
    const early = baseCtx({ now: new Date('2026-08-31T08:00:00') });
    expect(checkCondition({ kind: 'monday_feeling' }, early)).toBe(false);
  });

  it('random_chance 概率分布大致正确', () => {
    let hits = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      if (checkCondition({ kind: 'random_chance', p: 0.3 }, baseCtx())) hits++;
    }
    // 容差大一点，避免偶发失败
    expect(hits).toBeGreaterThan(2500);
    expect(hits).toBeLessThan(3500);
  });
});

describe('evaluateRule 规则评估', () => {
  it('全部条件满足 → matched', () => {
    const rule: BehaviorRule = {
      id: 'test',
      name: 'test',
      trigger: ['hour_chime'],
      weight: 1,
      conditions: [
        { kind: 'hour_at_least', hour: 18 },
        { kind: 'not_in_meeting' },
      ],
      behavior: { lines: [{ text: 'hi', weight: 1 }] },
    };
    const r = evaluateRule(rule, baseCtx());
    expect(r.matched).toBe(true);
    expect(r.failedConditions).toBeUndefined();
  });

  it('有一个不满足 → 不命中 + 失败索引', () => {
    const rule: BehaviorRule = {
      id: 'test',
      name: 'test',
      trigger: ['hour_chime'],
      weight: 1,
      conditions: [
        { kind: 'hour_at_least', hour: 18 }, // pass
        { kind: 'in_meeting' }, // fail
        { kind: 'music_not_playing' }, // pass
      ],
      behavior: { lines: [{ text: 'hi', weight: 1 }] },
    };
    const r = evaluateRule(rule, baseCtx());
    expect(r.matched).toBe(false);
    expect(r.failedConditions).toEqual([1]);
  });

  it('空条件 → 命中', () => {
    const rule: BehaviorRule = {
      id: 'always',
      name: 'always',
      trigger: ['hour_chime'],
      weight: 1,
      conditions: [],
      behavior: { lines: [{ text: 'hi', weight: 1 }] },
    };
    expect(evaluateRule(rule, baseCtx()).matched).toBe(true);
  });
});

describe('pickWeighted 加权抽选', () => {
  it('单条直接返回', () => {
    const rule = { id: 'r1', name: 'r1', trigger: [], weight: 1, conditions: [], behavior: {} };
    expect(pickWeighted([rule])).toBe(rule);
  });

  it('空数组返回 null', () => {
    expect(pickWeighted([])).toBeNull();
  });

  it('分布大致符合权重', () => {
    const rules: BehaviorRule[] = [
      { id: 'a', name: 'a', trigger: [], weight: 3, conditions: [], behavior: {} },
      { id: 'b', name: 'b', trigger: [], weight: 1, conditions: [], behavior: {} },
    ];
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 10000; i++) {
      const r = pickWeighted(rules);
      if (r) counts[r.id]++;
    }
    // 3:1 → 约 7500 : 2500
    expect(counts.a).toBeGreaterThan(7000);
    expect(counts.a).toBeLessThan(8000);
    expect(counts.b).toBeGreaterThan(2000);
    expect(counts.b).toBeLessThan(3000);
  });
});

describe('pickLine 台词抽选', () => {
  it('空台词返回 null', () => {
    expect(pickLine(undefined)).toBeNull();
    expect(pickLine([])).toBeNull();
  });

  it('单条直接返回', () => {
    expect(pickLine([{ text: 'hi', weight: 1 }])).toBe('hi');
  });

  it('按权重分布', () => {
    const lines = [
      { text: 'common', weight: 70, tier: 'common' as const },
      { text: 'rare', weight: 25, tier: 'rare' as const },
      { text: 'epic', weight: 5, tier: 'epic' as const },
    ];
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0 };
    for (let i = 0; i < 10000; i++) {
      const t = pickLine(lines);
      if (t) counts[t]++;
    }
    expect(counts.common).toBeGreaterThan(6500);
    expect(counts.rare).toBeGreaterThan(2000);
    expect(counts.epic).toBeGreaterThan(200);
  });
});

describe('buildScriptFromRule 生成脚本', () => {
  it('动作 + 台词', () => {
    const rule: BehaviorRule = {
      id: 'late-night',
      name: '深夜了',
      trigger: ['hour_chime'],
      weight: 1,
      conditions: [{ kind: 'time_range', from: '23:00', to: '05:00' }],
      behavior: {
        actionIntent: 'sleepy',
        lines: [{ text: '还不睡呀', weight: 1 }],
      },
    };
    const ctx = baseCtx();
    const script = buildScriptFromRule(rule, ctx);
    expect(script).not.toBeNull();
    expect(script!.meta.id).toBe('late-night');
    expect(script!.steps.length).toBe(2);
    expect(script!.steps[0].op).toBe('play');
    expect(script!.steps[1].op).toBe('say');
  });

  it('只有台词也能生成', () => {
    const rule: BehaviorRule = {
      id: 'just-say',
      name: '说一句',
      trigger: ['hour_chime'],
      weight: 1,
      conditions: [],
      behavior: { lines: [{ text: 'hello', weight: 1 }] },
    };
    const script = buildScriptFromRule(rule, baseCtx());
    expect(script).not.toBeNull();
    expect(script!.steps.length).toBe(1);
    expect(script!.steps[0].op).toBe('say');
  });

  it('只有举牌也能生成', () => {
    const rule: BehaviorRule = {
      id: 'sign-only',
      name: '举牌',
      trigger: ['hour_chime'],
      weight: 1,
      conditions: [],
      behavior: { signText: '加油' },
    };
    const script = buildScriptFromRule(rule, baseCtx());
    expect(script).not.toBeNull();
    expect(script!.steps[0].op).toBe('sign');
    expect((script!.steps[0] as any).text).toBe('加油');
  });

  it('空行为模板返回 null', () => {
    const rule: BehaviorRule = {
      id: 'empty',
      name: 'empty',
      trigger: ['hour_chime'],
      weight: 1,
      conditions: [],
      behavior: {},
    };
    expect(buildScriptFromRule(rule, baseCtx())).toBeNull();
  });
});

describe('applyGroupMutex 同组互斥', () => {
  it('同组只留权重最高的', () => {
    const rules: BehaviorRule[] = [
      { id: 'a', name: 'a', trigger: [], weight: 5, group: 'g1', conditions: [], behavior: {} },
      { id: 'b', name: 'b', trigger: [], weight: 10, group: 'g1', conditions: [], behavior: {} },
      { id: 'c', name: 'c', trigger: [], weight: 1, conditions: [], behavior: {} },
    ];
    const result = applyGroupMutex(rules);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.id)).toContain('b'); // 组内权重最高
    expect(result.map((r) => r.id)).toContain('c'); // 没分组保留
    expect(result.map((r) => r.id)).not.toContain('a');
  });

  it('不同组互不影响', () => {
    const rules: BehaviorRule[] = [
      { id: 'a', name: 'a', trigger: [], weight: 5, group: 'g1', conditions: [], behavior: {} },
      { id: 'b', name: 'b', trigger: [], weight: 5, group: 'g2', conditions: [], behavior: {} },
    ];
    const result = applyGroupMutex(rules);
    expect(result.length).toBe(2);
  });
});

describe('findMatches 批量筛选', () => {
  it('只评估对应 trigger 的规则', () => {
    const rules: BehaviorRule[] = [
      {
        id: 'r1', name: 'r1', trigger: ['hour_chime'], weight: 1,
        conditions: [], behavior: { lines: [{ text: 'hi', weight: 1 }] },
      },
      {
        id: 'r2', name: 'r2', trigger: ['app_switch'], weight: 1,
        conditions: [], behavior: { lines: [{ text: 'hi', weight: 1 }] },
      },
    ];
    const matches = findMatches(rules, 'hour_chime', baseCtx());
    expect(matches.length).toBe(1);
    expect(matches[0].rule.id).toBe('r1');
  });

  it('按权重降序排列', () => {
    const rules: BehaviorRule[] = [
      {
        id: 'low', name: 'low', trigger: ['hour_chime'], weight: 1,
        conditions: [], behavior: { lines: [{ text: 'hi', weight: 1 }] },
      },
      {
        id: 'high', name: 'high', trigger: ['hour_chime'], weight: 10,
        conditions: [], behavior: { lines: [{ text: 'hi', weight: 1 }] },
      },
    ];
    const matches = findMatches(rules, 'hour_chime', baseCtx());
    expect(matches[0].rule.id).toBe('high');
    expect(matches[1].rule.id).toBe('low');
  });
});
