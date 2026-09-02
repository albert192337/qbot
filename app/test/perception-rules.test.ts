/**
 * 账本聚合纯逻辑测试（行为体系 spec §3.2：写入时聚合，字段宁多勿少）。
 */
import { describe, expect, it } from 'vitest';
import type { Ledger, PerceptionEvent } from '../src/shared/perception';
import { aggregateEvent, emptyDay } from '../src/main/perception-rules';

function ev(type: PerceptionEvent['type'], at: number, extra?: Record<string, unknown>): PerceptionEvent {
  if (type === 'app_focus' || type === 'foreground_change') {
    return {
      type,
      at,
      platform: 'macos',
      source: 'macos-nsworkspace-system-events',
      detailLevel: 'full',
      app: (extra?.app as string) ?? 'app-x',
      windowTitle: (extra?.windowTitle as string) ?? 'X',
    };
  }
  if (type === 'agent') return { type, at, activity: 'working', sessions: 1 };
  if (type === 'meeting') return { type, at, inMeeting: true };
  if (type === 'music') return { type, at, playing: true, title: 't', artist: 'a' };
  if (type === 'interact') return { type, at, kind: 'click' };
  return { type, at };
}

describe('账本聚合', () => {
  it('app_focus 建当天账本并按应用累计切换次数', () => {
    const ledger: Ledger = {};
    aggregateEvent(ledger, ev('app_focus', 1000, { app: '原神' }));
    aggregateEvent(ledger, ev('app_focus', 2000, { app: '原神' }));
    const day = ledger['1970-01-01'];
    expect(day).toBeDefined();
    expect(day.eventCount).toBe(2);
    expect(day.totalSwitches).toBe(2);
    expect(day.apps['原神']?.switches).toBe(2);
    expect(day.apps['原神']?.firstAt).toBe(1000);
    expect(day.apps['原神']?.lastAt).toBe(2000);
  });

  it('不同应用各自计数', () => {
    const ledger: Ledger = {};
    aggregateEvent(ledger, ev('app_focus', 1000, { app: '原神' }));
    aggregateEvent(ledger, ev('app_focus', 2000, { app: 'VS Code' }));
    const day = ledger['1970-01-01'];
    expect(day.apps['原神']?.switches).toBe(1);
    expect(day.apps['VS Code']?.switches).toBe(1);
    expect(day.totalSwitches).toBe(2);
  });

  it('同一应用内的窗口标题变化不计为应用切换', () => {
    const ledger: Ledger = {};
    aggregateEvent(ledger, ev('app_focus', 1000, { app: 'Code' }));
    aggregateEvent(ledger, {
      type: 'foreground_change',
      at: 2000,
      platform: 'macos',
      source: 'macos-nsworkspace-system-events',
      detailLevel: 'full',
      app: 'Code',
      windowTitle: '另一个文件.ts',
    });
    expect(ledger['1970-01-01'].totalSwitches).toBe(1);
    expect(ledger['1970-01-01'].apps.Code?.switches).toBe(1);
    expect(ledger['1970-01-01'].eventCount).toBe(2);
    expect(ledger['1970-01-01'].lastActivityAt).toBe(1000);
  });

  it('跨天：事件按日期落到各自的账本', () => {
    const ledger: Ledger = {};
    // 1970-01-01 与 1970-01-02 相差 86400000ms
    aggregateEvent(ledger, ev('app_focus', 1000, { app: 'A' }));
    aggregateEvent(ledger, ev('app_focus', 86401000, { app: 'B' }));
    expect(ledger['1970-01-01']?.apps['A']?.switches).toBe(1);
    expect(ledger['1970-01-02']?.apps['B']?.switches).toBe(1);
    expect(Object.keys(ledger)).toHaveLength(2);
  });

  it('非 app 事件也计入 eventCount 与活动时刻，不建 app 条目', () => {
    const ledger: Ledger = {};
    aggregateEvent(ledger, ev('agent', 1500));
    aggregateEvent(ledger, ev('meeting', 3000));
    const day = ledger['1970-01-01'];
    expect(day.eventCount).toBe(2);
    expect(day.firstActivityAt).toBe(1500);
    expect(day.lastActivityAt).toBe(3000);
    expect(Object.keys(day.apps)).toHaveLength(0);
    expect(day.totalSwitches).toBe(0);
  });

  it('空账本 firstActivityAt 缺省（首次事件填充）', () => {
    const ledger: Ledger = {};
    aggregateEvent(ledger, ev('app_focus', 500, { app: 'A' }));
    expect(ledger['1970-01-01']?.firstActivityAt).toBe(500);
  });

  it('已存在的 app 再进来只累加不改 firstAt', () => {
    const ledger: Ledger = {};
    aggregateEvent(ledger, ev('app_focus', 1000, { app: 'A' }));
    aggregateEvent(ledger, ev('app_focus', 9000, { app: 'A' }));
    expect(ledger['1970-01-01']?.apps['A']?.firstAt).toBe(1000);
    expect(ledger['1970-01-01']?.apps['A']?.lastAt).toBe(9000);
  });

  it('emptyDay 是干净的初始状态', () => {
    const d = emptyDay();
    expect(d.eventCount).toBe(0);
    expect(d.totalSwitches).toBe(0);
    expect(d.apps).toEqual({});
    expect(d.firstActivityAt).toBeUndefined();
    expect(d.lastActivityAt).toBeUndefined();
  });
});
