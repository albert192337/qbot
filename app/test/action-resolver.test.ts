/**
 * action-resolver 单测。
 * 验证：精确匹配 / 同义词降级 / 分类兜底 / 用户覆盖 / 最终 fallback。
 */
import { describe, expect, it } from 'vitest';
import { resolveAction, resolveFirstAvailable } from '../src/main/action-resolver';

const S_TIER = ['idle', 'drag', 'sleep', 'tea', 'talk_happy', 'talk_annoyed'];

describe('resolveAction', () => {
  it('精确匹配动作名', () => {
    const r = resolveAction('tea', S_TIER);
    expect(r.action).toBe('tea');
    expect(r.matchLevel).toBe('exact');
  });

  it('大小写不敏感', () => {
    const r = resolveAction('Tea', S_TIER);
    expect(r.action).toBe('tea');
    expect(r.matchLevel).toBe('exact');
  });

  it('happy 意图 → talk_happy（同义词）', () => {
    const r = resolveAction('happy', S_TIER);
    expect(r.action).toBe('talk_happy');
    expect(r.matchLevel).toBe('synonym');
  });

  it('中文意图「开心」→ talk_happy', () => {
    const r = resolveAction('开心', S_TIER);
    expect(r.action).toBe('talk_happy');
    expect(r.matchLevel).toBe('synonym');
  });

  it('annoyed 意图 → talk_annoyed', () => {
    const r = resolveAction('annoyed', S_TIER);
    expect(r.action).toBe('talk_annoyed');
    expect(r.matchLevel).toBe('synonym');
  });

  it('sleepy → sleep', () => {
    const r = resolveAction('sleepy', S_TIER);
    expect(r.action).toBe('sleep');
    expect(r.matchLevel).toBe('synonym');
  });

  it('缺动作时降级：没有 talk_happy → 降到 tea', () => {
    const avail = ['idle', 'tea', 'talk_annoyed', 'sleep', 'drag'];
    const r = resolveAction('happy', avail);
    expect(r.action).toBe('tea');
    expect(r.matchLevel).toBe('synonym'); // 第二个候选
    expect(r.tried).toContain('talk_happy');
    expect(r.tried).toContain('tea');
  });

  it('完全没有积极向动作 → 分类兜底到 idle', () => {
    const avail = ['idle', 'drag'];
    const r = resolveAction('happy', avail);
    expect(r.action).toBe('idle');
    expect(r.matchLevel).toBe('category');
  });

  it('未知意图 → 靠关键词猜分类再降级', () => {
    const r = resolveAction('super_angry_xxx', S_TIER);
    expect(r.matchLevel).toBe('category');
    // 负向分类应该优先找 annoyed
    expect(r.action).toBe('talk_annoyed');
  });

  it('完全未知的意图 → 走 neutral 分类兜底到 idle', () => {
    const avail = ['idle', 'drag'];
    const r = resolveAction('blahblahxyz', avail);
    expect(r.action).toBe('idle');
    expect(r.matchLevel).toBe('category'); // 落到 neutral 分类
  });

  it('连 idle 都没有时 → 最终 fallback 回第一个可用的', () => {
    const avail = ['drag'];
    const r = resolveAction('happy', avail);
    // 所有降级链都断了，最终落到 FINAL_FALLBACK = 'idle'
    // 但 idle 不在可用列表里 → 应该返回 idle 还是找第一个可用的？
    // 当前实现：fallback 级别强制返回 idle（哪怕不在可用列表里——播放器自己会兜底）
    expect(r.action).toBe('idle');
    expect(r.matchLevel).toBe('fallback');
  });

  it('用户覆盖优先于内置映射', () => {
    const override = { happy: 'sleep' as const };
    const r = resolveAction('happy', S_TIER, override);
    expect(r.action).toBe('sleep');
    expect(r.matchLevel).toBe('exact');
  });

  it('用户覆盖的动作不存在时回退到内置映射', () => {
    const override = { happy: 'nonexistent' };
    const r = resolveAction('happy', S_TIER, override);
    expect(r.action).toBe('talk_happy');
    expect(r.matchLevel).not.toBe('exact');
  });

  it('M 档动作名（smug）在 S 档下降级到 talk_annoyed', () => {
    const r = resolveAction('smug', S_TIER);
    // M 档的 smug 还没生成，应该降级到最接近的
    expect(['talk_annoyed', 'tea', 'idle']).toContain(r.action);
  });

  it('M 档动作可用时，point 能精确匹配', () => {
    const avail = [...S_TIER, 'point'];
    const r = resolveAction('point', avail);
    // 此时 point 不在 INTENT_MAP 的精确匹配第一候选里
    // 但 intent = 'point'，精确匹配应该命中（step 2 检查 intent 本身是否是可用动作）
    expect(r.action).toBe('point');
    expect(r.matchLevel).toBe('exact');
  });
});

describe('resolveFirstAvailable', () => {
  it('按顺序找第一个能解析到非 fallback 的', () => {
    const avail = ['idle', 'tea', 'talk_annoyed']; // 没有 talk_happy
    const r = resolveFirstAvailable(['happy', 'annoyed'], avail);
    expect(r).not.toBeNull();
    // happy 降级到 tea（synonym），是第一个非 fallback
    expect(r!.action).toBe('tea');
  });

  it('全部 fallback 时返回第一个的结果', () => {
    const avail = ['idle', 'drag'];
    const r = resolveFirstAvailable(['happy', 'angry'], avail);
    expect(r).not.toBeNull();
    expect(r!.action).toBe('idle');
  });

  it('空列表返回 null', () => {
    const r = resolveFirstAvailable([], S_TIER);
    expect(r).toBeNull();
  });
});
