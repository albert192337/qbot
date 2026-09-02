/**
 * 账本聚合规则（纯函数，可单测）。
 * 与 progress-rules.ts 同理：主进程持有权威，纯逻辑放这里测。
 * 行为体系 spec §3.2：写入时聚合，字段宁多勿少——原始流 7 天后不可回扫。
 */
import type { AppDayStat, DayLedger, Ledger, PerceptionEvent } from '../shared/perception';

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function emptyDay(): DayLedger {
  return { apps: {}, totalSwitches: 0, eventCount: 0 };
}

/** 把一条事件聚合进账本（返回同一个 ledger，便于链式调用） */
export function aggregateEvent(ledger: Ledger, ev: PerceptionEvent): Ledger {
  const key = todayKey(new Date(ev.at));
  let day = ledger[key];
  if (!day) {
    day = emptyDay();
    ledger[key] = day;
  }
  day.eventCount++;
  // 同一应用内的标题/窗口状态可能由页面自己刷新，不足以证明用户有新活动。
  if (ev.type !== 'foreground_change') {
    day.firstActivityAt ??= ev.at;
    day.lastActivityAt = ev.at;
  }

  if (ev.type === 'app_focus') {
    const stat: AppDayStat = day.apps[ev.app] ?? { focusMs: 0, switches: 0 };
    stat.switches++;
    stat.firstAt ??= ev.at;
    stat.lastAt = ev.at;
    day.apps[ev.app] = stat;
    day.totalSwitches++;
  }
  return ledger;
}

/** 聚合一批事件（顺序敏感：firstAt/lastAt 取最早/最晚，与到达顺序一致即可） */
export function aggregateMany(ledger: Ledger, events: PerceptionEvent[]): Ledger {
  for (const ev of events) aggregateEvent(ledger, ev);
  return ledger;
}
