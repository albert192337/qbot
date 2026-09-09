import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ request: vi.fn(), execute: vi.fn(), settings: vi.fn(), input: vi.fn(), log: vi.fn() }));
vi.mock('../src/main/config', () => ({ getSettings: m.settings }));
vi.mock('../src/main/brain-llm', () => ({ buildInput: m.input }));
vi.mock('../src/main/brain-log', () => ({ beginBrainCall: async () => 'chat-test', updateBrainCall: m.log }));
vi.mock('../src/main/llm-client', () => ({ BRAIN_MODEL: 'mock', chatCompleteWithRetry: m.request }));
vi.mock('../src/main/behavior-executor', () => ({ execute: m.execute }));
import { sendPetChat } from '../src/main/pet-chat';
beforeEach(() => {
  vi.clearAllMocks();
  m.settings.mockResolvedValue({ activeCharacter: 'frog', arkApiKey: 'mock', freeMode: false });
  m.input.mockResolvedValue({ personaName: '阿呱', availableIntents: ['newDance'], actionDescriptions: [] });
  m.request.mockResolvedValue('{"thought":"回应用户","action":"newDance","say":["你好","跳个新舞"]}');
});
it('自由模式关闭仍能连续主动聊天，台词和新动作均送执行器', async () => {
  expect((await sendPetChat('你好')).ok).toBe(true);
  expect((await sendPetChat('再跳一次')).ok).toBe(true);
  expect(m.request).toHaveBeenCalledTimes(2);
  expect(m.execute.mock.calls[1][0].steps).toEqual([{ op: 'say', text: '你好' }, { op: 'say', text: '跳个新舞' }, { op: 'play', action: 'newDance', loops: 1 }]);
  expect(m.log).toHaveBeenCalledWith('chat-test', '收到原始输出', expect.anything());
});
it('请求失败给出错误，不触发保底冒泡', async () => {
  m.request.mockRejectedValue(new Error('网络不可用'));
  expect(await sendPetChat('你好')).toEqual({ ok: false, error: '网络不可用' });
  expect(m.execute).not.toHaveBeenCalled();
});
it('请求期间切换角色不让旧回复配上新角色动作', async () => {
  m.settings.mockResolvedValueOnce({ activeCharacter: 'frog', arkApiKey: 'mock' }).mockResolvedValue({ activeCharacter: 'cat' });
  expect((await sendPetChat('你好')).ok).toBe(false);
  expect(m.execute).not.toHaveBeenCalled();
});
