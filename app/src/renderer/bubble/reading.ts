import { expire, type BubbleItem, type StackResult } from './stack';

export const AWAY_SECONDS = 15;

/** 只根据系统空闲秒数计时，不记录键位、鼠标位置或窗口内容。 */
export function advanceReading(
  items: BubbleItem[], now: number, idleSeconds: number,
  previousPoll: number | null, wasAway: boolean,
): StackResult & { away: boolean } {
  const away = idleSeconds >= AWAY_SECONDS;
  if (away) return { items, removed: [], away };
  // 唤醒/后台节流后不能直接让积压消息过期，重新留出完整阅读时间。
  const resumed = wasAway || (previousPoll !== null && now - previousPoll > 5000);
  const visible = resumed ? items.map((it) => ({ ...it, at: now })) : items;
  return { ...expire(visible, now), away };
}
