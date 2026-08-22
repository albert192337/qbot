/**
 * 表情包导入纯逻辑单测：打标解析容错 + 槽位竞争消解 + 提示词构造。
 * 全 mock，不调 API、不跑 ffmpeg。
 */
import { describe, expect, it } from 'vitest';
import {
  buildLabelParts,
  CATEGORY_TO_SLOT,
  confidenceTier,
  CONFIDENCE_HIGH,
  CONFIDENCE_LOW,
  extractJsonArray,
  LABEL_SYSTEM_PROMPT,
  parseLabels,
  resolveSlots,
  STICKER_CATEGORIES,
  type StickerFrames,
  type StickerLabel,
} from '../src/sticker-import.js';

/** 造 n 张假贴纸（帧内容无所谓，解析逻辑只用 sourceName 和数量） */
function fakeStickers(n: number): StickerFrames[] {
  return Array.from({ length: n }, (_, i) => ({
    sourceName: `s${i + 1}.gif`,
    frames: [Buffer.from([1]), Buffer.from([2]), Buffer.from([3])],
  }));
}

function label(
  sourceName: string,
  category: StickerLabel['category'],
  confidence: number,
): StickerLabel {
  return {
    sourceName,
    category,
    confidence,
    reason: '',
    slot: CATEGORY_TO_SLOT[category],
  };
}

describe('extractJsonArray', () => {
  it('裸 JSON 数组', () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it('剥掉 markdown 代码块（模型最常见的多余包装）', () => {
    const text = '```json\n[{"index":1,"category":"happy"}]\n```';
    expect(extractJsonArray(text)).toEqual([{ index: 1, category: 'happy' }]);
  });

  it('剥掉前后解释文字', () => {
    const text = '好的，分析如下：\n[{"index":1}]\n以上是结果。';
    expect(extractJsonArray(text)).toEqual([{ index: 1 }]);
  });

  it('找不到数组时抛错', () => {
    expect(() => extractJsonArray('抱歉我无法分析')).toThrow(/找不到 JSON 数组/);
  });
});

describe('parseLabels', () => {
  it('正常解析并映射槽位', () => {
    const stickers = fakeStickers(2);
    const text = JSON.stringify([
      { index: 1, category: 'happy', confidence: 0.9, reason: '在笑' },
      { index: 2, category: 'sleep', confidence: 0.7, reason: '闭眼' },
    ]);
    const out = parseLabels(text, stickers);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      sourceName: 's1.gif',
      category: 'happy',
      confidence: 0.9,
      slot: 'talk_happy',
    });
    expect(out[1]).toMatchObject({ category: 'sleep', slot: 'sleep' });
  });

  it('按 index 对位，乱序返回也能对上', () => {
    const stickers = fakeStickers(3);
    const text = JSON.stringify([
      { index: 3, category: 'tea', confidence: 0.8 },
      { index: 1, category: 'happy', confidence: 0.9 },
      { index: 2, category: 'annoyed', confidence: 0.6 },
    ]);
    const out = parseLabels(text, stickers);
    expect(out.map((o) => o.category)).toEqual(['happy', 'annoyed', 'tea']);
    expect(out.map((o) => o.sourceName)).toEqual(['s1.gif', 's2.gif', 's3.gif']);
  });

  it('index 缺失时按数组下标兜底', () => {
    const stickers = fakeStickers(2);
    const text = JSON.stringify([
      { category: 'happy', confidence: 0.9 },
      { category: 'tea', confidence: 0.8 },
    ]);
    const out = parseLabels(text, stickers);
    expect(out.map((o) => o.category)).toEqual(['happy', 'tea']);
  });

  it('类别非法 → 降级 other，confidence 归零（强制人工指定）', () => {
    const stickers = fakeStickers(1);
    const text = JSON.stringify([
      { index: 1, category: '开心得不得了', confidence: 0.95 },
    ]);
    const out = parseLabels(text, stickers);
    expect(out[0]).toMatchObject({ category: 'other', confidence: 0, slot: undefined });
    expect(out[0].reason).toMatch(/无法识别/);
  });

  it('返回条目少于贴纸数 → 缺的降级 other，不丢贴纸', () => {
    const stickers = fakeStickers(3);
    const text = JSON.stringify([{ index: 1, category: 'happy', confidence: 0.9 }]);
    const out = parseLabels(text, stickers);
    expect(out).toHaveLength(3);
    expect(out[0].category).toBe('happy');
    expect(out[1]).toMatchObject({ category: 'other', confidence: 0 });
    expect(out[2].reason).toMatch(/未返回/);
  });

  it('confidence 越界/非数字 → 夹到 [0,1]', () => {
    const stickers = fakeStickers(3);
    const text = JSON.stringify([
      { index: 1, category: 'happy', confidence: 1.8 },
      { index: 2, category: 'tea', confidence: -0.5 },
      { index: 3, category: 'sleep', confidence: 'abc' },
    ]);
    const out = parseLabels(text, stickers);
    expect(out.map((o) => o.confidence)).toEqual([1, 0, 0]);
  });

  it('other 类别不给槽位（进备选库）', () => {
    const stickers = fakeStickers(1);
    const text = JSON.stringify([{ index: 1, category: 'other', confidence: 0.9 }]);
    expect(parseLabels(text, stickers)[0].slot).toBeUndefined();
  });

  it('v1 未映射的预留类别（celebrate/focus/wave）也不给槽位', () => {
    const stickers = fakeStickers(3);
    const text = JSON.stringify([
      { index: 1, category: 'celebrate', confidence: 0.9 },
      { index: 2, category: 'focus', confidence: 0.9 },
      { index: 3, category: 'wave', confidence: 0.9 },
    ]);
    const out = parseLabels(text, stickers);
    expect(out.every((o) => o.slot === undefined)).toBe(true);
    // 但类别本身要保留——动作体系重构后补映射表即可自动启用
    expect(out.map((o) => o.category)).toEqual(['celebrate', 'focus', 'wave']);
  });

  it('reason 过长截断', () => {
    const stickers = fakeStickers(1);
    const text = JSON.stringify([
      { index: 1, category: 'happy', confidence: 0.9, reason: '很'.repeat(200) },
    ]);
    expect(parseLabels(text, stickers)[0].reason.length).toBeLessThanOrEqual(60);
  });
});

describe('resolveSlots', () => {
  it('同槽位竞争取最高置信度，落选进备选库', () => {
    const labels = [
      label('a.gif', 'happy', 0.5),
      label('b.gif', 'happy', 0.9),
      label('c.gif', 'sleep', 0.7),
    ];
    const { assigned, spares } = resolveSlots(labels);
    expect(assigned.get('talk_happy')?.sourceName).toBe('b.gif');
    expect(assigned.get('sleep')?.sourceName).toBe('c.gif');
    expect(spares.map((s) => s.sourceName)).toEqual(['a.gif']);
  });

  it('平票按文件名取前者（结果可复现，重试不变）', () => {
    const labels = [label('z.gif', 'tea', 0.8), label('a.gif', 'tea', 0.8)];
    const first = resolveSlots(labels);
    const second = resolveSlots([...labels].reverse());
    expect(first.assigned.get('tea')?.sourceName).toBe('a.gif');
    expect(second.assigned.get('tea')?.sourceName).toBe('a.gif');
  });

  it('无槽位的贴纸全进备选库', () => {
    const labels = [label('a.gif', 'other', 0.9), label('b.gif', 'celebrate', 0.9)];
    const { assigned, spares } = resolveSlots(labels);
    expect(assigned.size).toBe(0);
    expect(spares).toHaveLength(2);
  });

  it('贴纸数少于槽位数 → 只填有的，其余槽位空着（混合模式靠调用方兜底）', () => {
    const { assigned } = resolveSlots([label('a.gif', 'idle', 0.9)]);
    expect(assigned.size).toBe(1);
    expect(assigned.has('idle')).toBe(true);
  });

  it('空输入不炸', () => {
    const { assigned, spares } = resolveSlots([]);
    expect(assigned.size).toBe(0);
    expect(spares).toEqual([]);
  });
});

describe('confidenceTier', () => {
  it('三档边界', () => {
    expect(confidenceTier(1)).toBe('high');
    expect(confidenceTier(CONFIDENCE_HIGH)).toBe('high');
    expect(confidenceTier(CONFIDENCE_HIGH - 0.01)).toBe('medium');
    expect(confidenceTier(CONFIDENCE_LOW)).toBe('medium');
    expect(confidenceTier(CONFIDENCE_LOW - 0.01)).toBe('low');
    expect(confidenceTier(0)).toBe('low');
  });
});

describe('buildLabelParts', () => {
  it('每组帧前插序号标记（防模型把图对错贴纸）', () => {
    const parts = buildLabelParts(fakeStickers(2));
    const texts = parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text);
    expect(texts[0]).toMatch(/共 2 张贴纸/);
    expect(texts.some((t) => t.includes('贴纸 #1'))).toBe(true);
    expect(texts.some((t) => t.includes('贴纸 #2'))).toBe(true);
    // 图片数 = 2 张 × 3 帧
    expect(parts.filter((p) => p.type === 'image')).toHaveLength(6);
  });

  it('图片紧跟在自己的序号标记之后', () => {
    const parts = buildLabelParts(fakeStickers(2));
    const marker1 = parts.findIndex(
      (p) => p.type === 'text' && p.text.includes('贴纸 #1'),
    );
    const marker2 = parts.findIndex(
      (p) => p.type === 'text' && p.text.includes('贴纸 #2'),
    );
    // #1 和 #2 之间恰好 3 张图
    expect(parts.slice(marker1 + 1, marker2).every((p) => p.type === 'image')).toBe(true);
    expect(marker2 - marker1 - 1).toBe(3);
  });
});

describe('提示词与类别表一致性', () => {
  it('系统提示词里列出了全部类别（漏一个模型就永远不会输出它）', () => {
    for (const cat of STICKER_CATEGORIES) {
      expect(LABEL_SYSTEM_PROMPT).toContain(`- ${cat}：`);
    }
  });

  it('映射表的槽位都是合法动作 ID（打错字会让贴纸永远播不出来）', () => {
    const validSlots = ['idle', 'drag', 'sleep', 'tea', 'talk_happy', 'talk_annoyed'];
    for (const slot of Object.values(CATEGORY_TO_SLOT)) {
      expect(validSlots).toContain(slot);
    }
  });

  it('映射表的 key 都是合法类别', () => {
    for (const cat of Object.keys(CATEGORY_TO_SLOT)) {
      expect(STICKER_CATEGORIES).toContain(cat as never);
    }
  });

  it('drag 不在映射目标里（drag 是被指针按住的动画，贴纸对不上语义）', () => {
    expect(Object.values(CATEGORY_TO_SLOT)).not.toContain('drag');
  });
});
