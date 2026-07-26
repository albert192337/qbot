import { describe, expect, it } from 'vitest';
import {
  BUBBLE_TTL_MS,
  displayLabels,
  expire,
  MAX_BUBBLES,
  upsert,
  type BubbleItem,
} from '../src/renderer/bubble/stack';
import type { AgentMessageKind } from '../src/shared/ipc-types';

const T0 = 1_000_000;

const msg = (
  key: string,
  over: Partial<BubbleItem> = {},
): BubbleItem => ({
  sessionKey: key,
  source: 'QBot',
  sessionShort: key.slice(-4),
  kind: 'done',
  text: `${key} 的正文`,
  at: T0,
  ...over,
});

describe('气泡栈增改', () => {
  it('新消息追加到末尾（最新在最下，离桌宠最近）', () => {
    const r = upsert(upsert([], msg('a')).items, msg('b'));
    expect(r.items.map((i) => i.sessionKey)).toEqual(['a', 'b']);
    expect(r.removed).toEqual([]);
  });

  it('回归：同一会话不该堆两枚气泡，就地替换且位置不变', () => {
    const base = upsert(upsert([], msg('a')).items, msg('b')).items;
    const r = upsert(base, msg('a', { text: '新正文', at: T0 + 5_000 }));
    expect(r.items.map((i) => i.sessionKey)).toEqual(['a', 'b']);
    expect(r.items[0].text).toBe('新正文');
    expect(r.items[0].at).toBe(T0 + 5_000);
    expect(r.removed).toEqual([]);
  });

  it('超上限挤掉最老的并报出它', () => {
    let items: BubbleItem[] = [];
    for (const k of ['a', 'b', 'c']) items = upsert(items, msg(k)).items;
    const r = upsert(items, msg('d'));
    expect(r.items.map((i) => i.sessionKey)).toEqual(['b', 'c', 'd']);
    expect(r.removed).toEqual(['a']);
  });

  it('回归：重复的闲置提醒不许续命（否则气泡永不消失）', () => {
    const items = upsert([], msg('a', { kind: 'attention', text: '等你输入' })).items;
    const again = upsert(items, msg('a', { kind: 'attention', text: '等你输入', at: T0 + 9_000 }));
    expect(again.items).toBe(items); // 原样返回，at 没被刷新
    expect(again.items[0].at).toBe(T0);
  });

  it('attention 正文变了就正常更新', () => {
    const items = upsert([], msg('a', { kind: 'attention', text: '等你输入' })).items;
    const next = upsert(items, msg('a', { kind: 'attention', text: '要授权', at: T0 + 9_000 }));
    expect(next.items[0].text).toBe('要授权');
    expect(next.items[0].at).toBe(T0 + 9_000);
  });

  it('上限就是用户定的 3', () => {
    expect(MAX_BUBBLES).toBe(3);
  });
});

describe('到点淡出', () => {
  it('用户定的 10 秒', () => {
    expect(BUBBLE_TTL_MS).toBe(10_000);
  });

  it('不到点不动，到点摘掉', () => {
    const items = [msg('a')];
    expect(expire(items, T0 + BUBBLE_TTL_MS - 1).removed).toEqual([]);
    expect(expire(items, T0 + BUBBLE_TTL_MS).removed).toEqual(['a']);
  });

  it('只摘到点的，其余不动', () => {
    const items = [msg('a'), msg('b', { at: T0 + 8_000 })];
    const r = expire(items, T0 + BUBBLE_TTL_MS);
    expect(r.removed).toEqual(['a']);
    expect(r.items.map((i) => i.sessionKey)).toEqual(['b']);
  });

  it('无变化时原样返回同一引用（渲染层据此跳过重排）', () => {
    const items = [msg('a')];
    expect(expire(items, T0).items).toBe(items);
  });

  it('空表安全', () => {
    expect(expire([], T0)).toEqual({ items: [], removed: [] });
  });
});

describe('来源标签去重', () => {
  it('来源唯一时原样显示', () => {
    expect(displayLabels([msg('a', { source: 'QBot' })])).toEqual(['QBot']);
  });

  it('回归：同项目开两个会话必须能分清', () => {
    const items = [
      msg('claude:aaaa', { source: 'QBot', sessionShort: 'aaaa' }),
      msg('claude:bbbb', { source: 'QBot', sessionShort: 'bbbb' }),
    ];
    expect(displayLabels(items)).toEqual(['QBot #aaaa', 'QBot #bbbb']);
  });

  it('混合时只给重名的加后缀', () => {
    const items = [
      msg('x', { source: 'QBot', sessionShort: 'aaaa' }),
      msg('y', { source: 'QBot', sessionShort: 'bbbb' }),
      msg('z', { source: 'other', sessionShort: 'cccc' }),
    ];
    expect(displayLabels(items)).toEqual(['QBot #aaaa', 'QBot #bbbb', 'other']);
  });

  it('每个气泡类型都是合法的 kind（类型哨兵）', () => {
    const kinds: AgentMessageKind[] = ['done', 'attention'];
    expect(kinds).toHaveLength(2);
  });
});
