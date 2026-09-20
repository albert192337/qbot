import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/main/user-memory', () => ({ queueMemoryExtraction: vi.fn(async () => {}) }));
const m = vi.hoisted(() => ({ request: vi.fn(), execute: vi.fn(), settings: vi.fn(), input: vi.fn(), log: vi.fn(), idle: vi.fn(), thinking: vi.fn(), stopThinking: vi.fn() }));
vi.mock('../src/main/bubble', () => ({ beginChatThinking: m.thinking }));
vi.mock('../src/main/idle-plan', () => ({ applyIdleDecision: m.idle }));
vi.mock('../src/main/config', () => ({ getSettings: m.settings }));
vi.mock('../src/main/brain-llm', () => ({ buildInput: m.input }));
vi.mock('../src/main/brain-log', () => ({ beginBrainCall: async () => 'chat-test', updateBrainCall: m.log }));
vi.mock('../src/main/llm-client', () => ({ BRAIN_MODEL: 'mock', chatCompleteWithRetry: m.request }));
vi.mock('../src/main/behavior-executor', () => ({ execute: m.execute }));
import { sendPetChat } from '../src/main/pet-chat';
beforeEach(() => {
  vi.clearAllMocks();
  m.thinking.mockReturnValue(m.stopThinking);
  m.settings.mockResolvedValue({ activeCharacter: 'frog', arkApiKey: 'mock', freeMode: false });
  m.input.mockResolvedValue({ personaName: '阿呱', availableIntents: ['newDance'], actionDescriptions: [] });
  m.request.mockResolvedValue('{"thought":"回应用户","action":"newDance","say":["你好","跳个新舞"]}');
});
it('自由模式关闭仍能连续主动聊天，台词和新动作均送执行器', async () => {
  expect((await sendPetChat('你好')).ok).toBe(true);
  expect((await sendPetChat('再跳一次')).ok).toBe(true);
  expect(m.request).toHaveBeenCalledTimes(2);
  expect(m.thinking).toHaveBeenCalledTimes(2);
  expect(m.stopThinking).toHaveBeenCalledTimes(2);
  expect(m.execute.mock.calls[1][0].steps).toEqual([{ op: 'say', text: '你好' }, { op: 'say', text: '跳个新舞' }, { op: 'play', action: 'newDance', loops: 1 }]);
  expect(m.log).toHaveBeenCalledWith('chat-test', '收到原始输出', expect.anything());
});
it('请求失败给出错误，不触发保底冒泡', async () => {
  m.request.mockRejectedValue(new Error('网络不可用'));
  expect(await sendPetChat('你好')).toEqual({ ok: false, error: '网络不可用' });
  expect(m.execute).not.toHaveBeenCalled();
  expect(m.stopThinking).toHaveBeenCalledOnce();
});
it('请求期间切换角色不让旧回复配上新角色动作', async () => {
  m.settings.mockResolvedValueOnce({ activeCharacter: 'frog', arkApiKey: 'mock' }).mockResolvedValue({ activeCharacter: 'cat' });
  expect((await sendPetChat('你好')).ok).toBe(false);
  expect(m.execute).not.toHaveBeenCalled();
});
it('一次聊天请求同时给出即时表情与后续待机，不额外请求模型', async () => {
  m.input.mockResolvedValue({ personaName: '阿呱', availableIntents: ['newDance'], idleCandidates: [{ id: 'rest', description: '安静休息' }] });
  m.request.mockResolvedValue('{"action":"newDance","say":["好呀"],"idleAction":"rest","idleMinutes":5}');
  expect((await sendPetChat('休息一下')).ok).toBe(true);
  expect(m.request).toHaveBeenCalledTimes(1);
  expect(m.idle).toHaveBeenCalledWith('frog', expect.objectContaining({idleAction:'rest',idleMinutes:5}), ['rest']);
});
it('记忆被纠正后，不执行使用旧记忆生成的回复', async () => {
  m.input.mockResolvedValueOnce({ personaName: '阿呱', availableIntents: ['newDance'], memoryRevision: 0 })
    .mockResolvedValue({ personaName: '阿呱', availableIntents: ['newDance'], memoryRevision: 1 });
  expect((await sendPetChat('你好')).ok).toBe(false);
  expect(m.execute).not.toHaveBeenCalled();
});
