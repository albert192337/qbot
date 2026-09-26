import { expect, it, vi } from 'vitest';
import { writePairLine, writePairDialogue } from '../src/main/pair-dialogue';
import { PAIR_INTERACTIONS, pairBeats } from '../src/shared/pair-interaction';
vi.mock('../src/main/llm-client', () => ({ chatComplete: vi.fn(), BRAIN_MODEL: 'test-model' }));
vi.mock('../src/main/brain-log', () => ({ beginBrainCall: async () => 'trace', updateBrainCall: vi.fn() }));
import { chatComplete } from '../src/main/llm-client';

it('writes each side with its own persona and the actual prior utterances for every interaction', async () => {
  const complete = vi.mocked(chatComplete);
  for (const { id: kind } of PAIR_INTERACTIONS) {
    complete.mockReset().mockResolvedValueOnce('先喝一口再翻页。').mockResolvedValueOnce('我陪你慢慢喝。').mockResolvedValueOnce('这样也很好。');
    const lines = await writePairDialogue('test', kind, { name: '甲', persona: '克制寡言' }, { name: '乙', persona: '活泼热情' });
    expect(lines).toHaveLength(pairBeats(kind).length);
    const prompts = complete.mock.calls.map(([opts]) => JSON.parse(opts.messages[1].content));
    expect(prompts[0]).toMatchObject({ character: { name: '甲', persona: '克制寡言' }, previousLines: [] });
    expect(prompts[1]).toMatchObject({ character: { name: '乙', persona: '活泼热情' }, previousLines: [lines[0]], role: '接收者' });
    expect(prompts[0].interaction).toBeTruthy();
    expect(prompts[0].partner).toEqual({name:'乙',persona:'活泼热情'});
    if (prompts[2]) expect(prompts[2].previousLines).toEqual(lines.slice(0, 2));
  }
});

it('uses bounded fallback for absent keys, failed calls and malformed or overlong output', async () => {
  const context = { kind: 'tea' as const, step: 0, voice: { name: '甲' }, partner: '乙', history: [] };
  const complete = vi.fn().mockRejectedValue(new Error('timeout'));
  expect(await writePairLine(undefined, context, complete)).toBeNull();
  expect(complete).not.toHaveBeenCalled();
  expect(await writePairLine('test', context, complete)).toBeNull();
  for (const raw of ['', '字'.repeat(61), '甲：你好\n乙：你好', '{"caption":"你好"}']) {
    complete.mockResolvedValueOnce(raw);
    expect(await writePairLine('test', context, complete)).toBeNull();
  }
  expect(await writePairDialogue(undefined, 'tea', { name: '甲' }, { name: '乙' })).toEqual(pairBeats('tea').map(b => b.caption));
});

it('bounds even a response body that never finishes', async () => {
  vi.useFakeTimers();
  try {
    const line = writePairLine('test', { kind: 'tea', step: 0, voice: { name: '甲' }, partner: '乙', history: [] },
      () => new Promise<string>(() => {}));
    await vi.advanceTimersByTimeAsync(8000);
    expect(await line).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});
