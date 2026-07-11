import { describe, expect, it } from 'vitest';
import { plan, planDurationSec } from '../src/renderer/pet/voice/synth';
import { VOICE_PACKS } from '../src/renderer/pet/voice/packs';
import { assignVoice, resolveVoice, VOICE_PACK_IDS } from '../src/shared/voice-assign';
import { pickUtterance, type Utterance } from '../src/renderer/pet/voice/utterance-picker';
import utterancesData from '../src/shared/utterances.json';

const soft = { pack: VOICE_PACKS.soft, pitchScale: 1, rateScale: 1 };

describe('synth plan()', () => {
  it('确定性：同输入同输出', () => {
    const a = plan('今天也要加油哦', 'neutral', soft);
    const b = plan('今天也要加油哦', 'neutral', soft);
    expect(a).toEqual(b);
    expect(a.length).toBe(7); // 一字一音节
  });

  it('同一个字永远映射同一个音（逐字映射层）', () => {
    const a = plan('茶', 'neutral', soft)[0];
    const b = plan('茶', 'neutral', soft)[0];
    expect(a.f0).toBe(b.f0);
    expect(a.vowel).toBe(b.vowel);
  });

  it('疑问句末字音高上扬', () => {
    const plain = plan('还不睡吗', 'neutral', soft);
    const question = plan('还不睡吗？', 'neutral', soft);
    expect(question[question.length - 1].f0).toBeGreaterThan(plain[plain.length - 1].f0);
  });

  it('感叹句尾追加两声花腔', () => {
    const plain = plan('加油', 'neutral', soft);
    const exclaim = plan('加油！', 'neutral', soft);
    expect(exclaim.length).toBe(plain.length + 2);
    expect(exclaim[exclaim.length - 1].f0).toBeGreaterThan(exclaim[exclaim.length - 2].f0);
  });

  it('mood 改变节拍：sleepy 比 happy 慢', () => {
    const happy = plan('今天也要加油', 'happy', soft);
    const sleepy = plan('今天也要加油', 'sleepy', soft);
    expect(planDurationSec(sleepy)).toBeGreaterThan(planDurationSec(happy));
  });

  it('不同语音包产出不同计划', () => {
    const a = plan('你好呀', 'neutral', soft);
    const b = plan('你好呀', 'neutral', { pack: VOICE_PACKS.bouncy, pitchScale: 1, rateScale: 1 });
    expect(a).not.toEqual(b);
  });

  it('pitchScale 整体缩放音高', () => {
    const base = plan('你好', 'neutral', soft);
    const high = plan('你好', 'neutral', { ...soft, pitchScale: 1.15 });
    base.forEach((blip, i) => expect(high[i].f0).toBeCloseTo(blip.f0 * 1.15, 6));
  });

  it('标点不发声、空文本出空计划', () => {
    expect(plan('，。！？', 'neutral', soft)).toEqual([]);
    expect(plan('', 'neutral', soft)).toEqual([]);
    expect(plan('你，好。', 'neutral', soft).length).toBe(2);
  });
});

describe('voice assignment', () => {
  it('同 id 分配结果稳定，且在参数区间内', () => {
    const a = assignVoice('8a39fa2f-ee3b-4a31-863f-d1cf09f363a9');
    const b = assignVoice('8a39fa2f-ee3b-4a31-863f-d1cf09f363a9');
    expect(a).toEqual(b);
    expect(VOICE_PACK_IDS).toContain(a.pack);
    expect(a.pitchScale).toBeGreaterThanOrEqual(0.85);
    expect(a.pitchScale).toBeLessThan(1.15);
    expect(a.rateScale).toBeGreaterThanOrEqual(0.9);
    expect(a.rateScale).toBeLessThan(1.1);
  });

  it('不同 id 大概率不同参数（抽样验证散布）', () => {
    const voices = ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'].map(assignVoice);
    const distinct = new Set(voices.map((v) => `${v.pack}:${v.pitchScale}:${v.rateScale}`));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('resolveVoice：合法字段原样保留，缺失/未知包回退哈希分配', () => {
    const explicit = { pack: 'baby', pitchScale: 1.1, rateScale: 0.95 };
    expect(resolveVoice('any-id', explicit)).toEqual(explicit);
    expect(resolveVoice('any-id', undefined)).toEqual(assignVoice('any-id'));
    expect(resolveVoice('any-id', { pack: 'unknown', pitchScale: 1, rateScale: 1 })).toEqual(
      assignVoice('any-id'),
    );
  });
});

describe('utterance picker', () => {
  const lib: Utterance[] = [
    { id: 'a', text: 'A', mood: 'happy', scenes: ['idle'], weight: 1 },
    { id: 'b', text: 'B', mood: 'neutral', scenes: ['idle'], weight: 1 },
    { id: 'c', text: 'C', mood: 'sleepy', scenes: ['night'], weight: 1 },
  ];
  const rng = (v: number) => ({ random: () => v });

  it('按 scene 过滤', () => {
    expect(pickUtterance(lib, 'night', rng(0))?.id).toBe('c');
    expect(pickUtterance(lib, 'nowhere', rng(0))).toBeNull();
  });

  it('不与上一句连续重复', () => {
    for (const v of [0, 0.3, 0.6, 0.99]) {
      expect(pickUtterance(lib, 'idle', rng(v), 'a')?.id).toBe('b');
    }
  });

  it('weight 加权：权重大者更可能被抽中', () => {
    const weighted: Utterance[] = [
      { id: 'x', text: 'X', mood: 'happy', scenes: ['idle'], weight: 1 },
      { id: 'y', text: 'Y', mood: 'happy', scenes: ['idle'], weight: 9 },
    ];
    // roll ∈ [0,10)：前 1 归 x，后 9 归 y
    expect(pickUtterance(weighted, 'idle', rng(0.05))?.id).toBe('x');
    expect(pickUtterance(weighted, 'idle', rng(0.5))?.id).toBe('y');
    expect(pickUtterance(weighted, 'idle', rng(0.99))?.id).toBe('y');
  });

  it('打包的种子文案库：条目合法、id 唯一、句长 4~14 字', () => {
    const { utterances } = utterancesData as { utterances: Utterance[] };
    expect(utterances.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(utterances.map((u) => u.id));
    expect(ids.size).toBe(utterances.length);
    for (const u of utterances) {
      expect(['happy', 'sleepy', 'neutral', 'curious', 'annoyed']).toContain(u.mood);
      expect(u.scenes).toContain('idle');
      const visible = u.text.replace(/[，。！？、～…\s]/g, '');
      expect(visible.length).toBeGreaterThanOrEqual(4);
      expect(visible.length).toBeLessThanOrEqual(14);
    }
  });
});
