/**
 * behavior-dsl 单测：校验函数的边界用例。
 * LLM 输出是不可信的，校验必须足够严格。
 */
import { describe, expect, it } from 'vitest';
import {
  validateScript,
  makeSayScript,
  makePlaySayScript,
  PRIORITY,
  type BehaviorScript,
} from '../src/shared/behavior-dsl';

describe('validateScript', () => {
  it('接受合法的 say 脚本', () => {
    const s = makeSayScript({ id: 'test', text: 'hello' });
    expect(validateScript(s).ok).toBe(true);
  });

  it('接受合法的 play+say 脚本', () => {
    const s = makePlaySayScript({ id: 'test', action: 'happy', text: 'hi' });
    expect(validateScript(s).ok).toBe(true);
  });

  it('拒绝 null / 非对象', () => {
    expect(validateScript(null).ok).toBe(false);
    expect(validateScript(42).ok).toBe(false);
    expect(validateScript('oops').ok).toBe(false);
  });

  it('拒绝缺失 meta', () => {
    const r = validateScript({ steps: [{ op: 'say', text: 'hi' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('meta'))).toBe(true);
  });

  it('拒绝 id 为空', () => {
    const r = validateScript({ meta: { priority: 1, id: '', source: 'rule' }, steps: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('id'))).toBe(true);
  });

  it('拒绝负 priority', () => {
    const r = validateScript({
      meta: { id: 'x', priority: -1, source: 'rule' },
      steps: [{ op: 'say', text: 'hi' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('priority'))).toBe(true);
  });

  it('拒绝空 steps', () => {
    const r = validateScript({ meta: { id: 'x', priority: 1, source: 'rule' }, steps: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('empty'))).toBe(true);
  });

  it('拒绝 steps 超过上限', () => {
    const steps = Array.from({ length: 50 }, () => ({ op: 'wait', ms: 100 }));
    const r = validateScript({ meta: { id: 'x', priority: 1 }, steps });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('too long'))).toBe(true);
  });

  it('拒绝未知 op', () => {
    const r = validateScript({
      meta: { id: 'x', priority: 1 },
      steps: [{ op: 'explode' } as any],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('unknown'))).toBe(true);
  });

  it('play: 拒绝缺失 action', () => {
    const r = validateScript({
      meta: { id: 'x', priority: 1 },
      steps: [{ op: 'play' } as any],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('action'))).toBe(true);
  });

  it('play: 拒绝 loops 过大', () => {
    const r = validateScript({
      meta: { id: 'x', priority: 1 },
      steps: [{ op: 'play', action: 'idle', loops: 999 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('loops'))).toBe(true);
  });

  it('say: 拒绝超长文本', () => {
    const r = validateScript({
      meta: { id: 'x', priority: 1 },
      steps: [{ op: 'say', text: 'a'.repeat(1000) }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('too long'))).toBe(true);
  });

  it('wait: 拒绝负数和超长', () => {
    let r = validateScript({
      meta: { id: 'x', priority: 1 },
      steps: [{ op: 'wait', ms: -5 }],
    });
    expect(r.ok).toBe(false);

    r = validateScript({
      meta: { id: 'x', priority: 1 },
      steps: [{ op: 'wait', ms: 999_999 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('too large'))).toBe(true);
  });

  it('sign: text 可以是 null', () => {
    const r = validateScript({
      meta: { id: 'x', priority: 1, source: 'rule' },
      steps: [{ op: 'sign', text: null }],
    });
    expect(r.ok).toBe(true);
  });

  it('非法 source 被拒', () => {
    const r = validateScript({
      meta: { id: 'x', priority: 1, source: 'alien' },
      steps: [{ op: 'say', text: 'hi' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('source'))).toBe(true);
  });

  it('合法的多步骤脚本全部通过', () => {
    const script: BehaviorScript = {
      meta: { id: 'complex', priority: PRIORITY.COMMENT, source: 'rule', cooldownMs: 60_000 },
      steps: [
        { op: 'play', action: 'talk_happy', loops: 2 },
        { op: 'say', text: '在忙吗？', durationMs: 5000 },
        { op: 'wait', ms: 2000 },
        { op: 'sign', text: '加油' },
      ],
    };
    const r = validateScript(script);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
});

describe('makeSayScript / makePlaySayScript', () => {
  it('makeSayScript 输出结构正确', () => {
    const s = makeSayScript({
      id: 'foo',
      text: 'bar',
      priority: PRIORITY.REACTIVE,
      reason: 'test',
    });
    expect(s.meta.id).toBe('foo');
    expect(s.meta.priority).toBe(PRIORITY.REACTIVE);
    expect(s.steps.length).toBe(1);
    expect(s.steps[0].op).toBe('say');
    expect((s.steps[0] as any).text).toBe('bar');
  });

  it('makePlaySayScript 输出结构正确', () => {
    const s = makePlaySayScript({ id: 'x', action: 'happy', text: 'yay', loops: 2 });
    expect(s.steps.length).toBe(2);
    expect(s.steps[0].op).toBe('play');
    expect(s.steps[1].op).toBe('say');
  });

  it('两个快捷工厂的输出都能通过 validateScript', () => {
    expect(validateScript(makeSayScript({ id: 'a', text: 'b' })).ok).toBe(true);
    expect(validateScript(makePlaySayScript({ id: 'a', action: 'x', text: 'b' })).ok).toBe(true);
  });
});
