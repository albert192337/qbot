import { expect, it } from 'vitest';
import { advanceReading } from '../src/renderer/bubble/reading';
import type { BubbleItem } from '../src/renderer/bubble/stack';
const item: BubbleItem = { sessionKey: 'behavior', source: '桌宠', sessionShort: '', kind: 'done', text: '回来再读', at: 0 };

it('离开后数小时不消散，回来后完整保留 20 秒', () => {
  const away = advanceReading([item], 3_600_000, 3600, 1000, false);
  expect(away.removed).toEqual([]);
  const back = advanceReading(away.items, 3_601_000, 0, 3_600_000, true);
  expect(back.items[0].at).toBe(3_601_000);
  expect(advanceReading(back.items, 3_620_000, 0, 3_619_000, false).removed).toEqual([]);
  expect(advanceReading(back.items, 3_621_000, 0, 3_620_000, false).removed).toEqual(['behavior']);
});
it('无人时收到的新气泡不会因旧时间戳过期', () => {
  expect(advanceReading([item], 60_000, 60, null, false).items).toEqual([item]);
});
it('始终有活动照常到期；睡眠唤醒的长时间间隔重新计时', () => {
  expect(advanceReading([item], 20_000, 0, 19_000, false).removed).toEqual(['behavior']);
  const resumed = advanceReading([item], 3_600_000, 0, 1000, false);
  expect(resumed.removed).toEqual([]);
  expect(resumed.items[0].at).toBe(3_600_000);
});
