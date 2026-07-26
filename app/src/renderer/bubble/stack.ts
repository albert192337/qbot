/**
 * 气泡栈的纯逻辑：增改、到点淘汰、同名来源去重。
 * 不碰 DOM、不起定时器（时间一律作参数传入），可单测。
 */
import type { AgentMessage } from '../../shared/ipc-types';

/** 同时最多挂几枚（按 BUBBLE_H 的几何算出来的硬上限，不是随手定的） */
export const MAX_BUBBLES = 3;
/** 可见时长，到点开始淡出 */
export const BUBBLE_TTL_MS = 10_000;
/** 淡出动画时长，与 CSS 保持一致 */
export const FADE_MS = 260;
/** 轮询周期：用单个 tick + 纯 expire()，不给每枚气泡起 setTimeout */
export const TICK_MS = 250;

export type BubbleItem = AgentMessage;

export interface StackResult {
  items: BubbleItem[];
  /** 被移出的 sessionKey（调用方据此播淡出动画） */
  removed: string[];
}

/**
 * 插入或就地更新。
 * 同 sessionKey 就地替换而不是新开一枚——否则一个会话连着 Notification + Stop
 * 就占掉 2/3 的位子，且「每枚气泡标来源」隐含了「一个来源一枚」。
 * 例外：attention 且正文完全相同时不刷新 at——Claude Code 的闲置提醒会反复发
 * 同一条 Notification，续命会让气泡永不消失。
 */
export function upsert(
  items: BubbleItem[],
  msg: AgentMessage,
  max = MAX_BUBBLES,
): StackResult {
  const idx = items.findIndex((i) => i.sessionKey === msg.sessionKey);
  if (idx >= 0) {
    const prev = items[idx];
    if (prev.kind === 'attention' && msg.kind === 'attention' && prev.text === msg.text) {
      return { items, removed: [] }; // 重复的闲置提醒：不续命，让它自然淡出
    }
    const next = items.slice();
    next[idx] = msg;
    return { items: next, removed: [] };
  }
  const next = items.concat(msg);
  const removed: string[] = [];
  while (next.length > max) removed.push(next.shift()!.sessionKey);
  return { items: next, removed };
}

/** 摘掉到点的气泡 */
export function expire(items: BubbleItem[], now: number): StackResult {
  const keep: BubbleItem[] = [];
  const removed: string[] = [];
  for (const it of items) {
    if (now - it.at >= BUBBLE_TTL_MS) removed.push(it.sessionKey);
    else keep.push(it);
  }
  return { items: removed.length ? keep : items, removed };
}

/**
 * 展示用标签：同名来源并存时补 ` #xxxx` 后缀。
 * 同一仓库开多个会话（worktree）很常见，两枚都标 "QBot" 等于没标。
 */
export function displayLabels(items: BubbleItem[]): string[] {
  const count = new Map<string, number>();
  for (const it of items) count.set(it.source, (count.get(it.source) ?? 0) + 1);
  return items.map((it) =>
    (count.get(it.source) ?? 0) > 1 && it.sessionShort
      ? `${it.source} #${it.sessionShort}`
      : it.source,
  );
}
