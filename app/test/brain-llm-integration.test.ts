import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ character: vi.fn(), chat: vi.fn(), execute: vi.fn(), log: vi.fn() }));
vi.mock('../src/main/brain-log', () => ({ beginBrainCall: async () => 'test-call', updateBrainCall: mocks.log, brainGate: vi.fn() }));
vi.mock('../src/main/config', () => ({ getSettings: async () => ({ activeCharacter: 'test', freeMode: true, arkApiKey: 'mock-only' }) }));
vi.mock('../src/main/characters', () => ({ getCharacter: mocks.character }));
vi.mock('../src/main/llm-client', () => ({ BRAIN_MODEL: 'test-model', ARK_BASE_URL: 'https://example.invalid', chatCompleteWithRetry: mocks.chat, LlmError: class extends Error {} }));
vi.mock('../src/main/perception', () => ({
  currentFocus: () => ({ app: null }),
  getSnapshot: async () => ({ ledger: { apps: {}, totalSwitches: 0 }, behaviors: [] }),
  onPerceptionChanged: vi.fn(), recordBehavior: vi.fn(), recordDecision: vi.fn(),
}));
vi.mock('../src/main/agent-server', () => ({ getAgentStatus: () => ({ activity: 'idle' }) }));
vi.mock('../src/main/meeting-monitor', () => ({ getMeetingStatus: () => ({ inMeeting: false }) }));
vi.mock('../src/main/music-monitor', () => ({ getMusicStatus: () => ({ playing: false }) }));
import { debugThink, setBrainExecutor } from '../src/main/brain-llm';

beforeEach(() => { vi.clearAllMocks(); setBrainExecutor(mocks.execute); });
it('模型选择不行动的内心想法不进入执行器，也不会冒泡', async () => {
  mocks.character.mockResolvedValue(character());
  mocks.chat.mockResolvedValue('{"do":false,"thought":"下午五点了，用户还在频繁切换应用呢","say":"下午五点了"}');
  await debugThink();
  expect(mocks.execute).not.toHaveBeenCalled();
  expect(mocks.log).toHaveBeenCalledWith('test-call', '收到原始输出', expect.objectContaining({ raw: expect.stringContaining('下午五点') }));
  expect(mocks.log).toHaveBeenCalledWith('test-call', '模型选择不行动', expect.objectContaining({ decision: expect.objectContaining({ do: false }) }));
});
const character = (extras: object = {}) => ({ manifest: {
  name: '测试', actions: { idle: { status: 'done', webm: 'idle.webm' } }, customActions: extras,
} });
it('新增动作的描述进入请求，响应解析后真实 ID 进入执行器；下次请求刷新动作库', async () => {
  mocks.character.mockResolvedValue(character({ NewDance: { status: 'done', webm: 'dance.webm', motionDesc: '跳新舞步' } }));
  mocks.chat.mockResolvedValue('{"do":true,"action":"NewDance","say":"跳一下"}');
  await debugThink();
  expect(mocks.chat.mock.calls[0][0].messages[0].content).toContain('跳新舞步');
  expect(mocks.execute.mock.calls[0][0].steps[0]).toEqual({ op: 'play', action: 'NewDance', loops: 1 });
  mocks.character.mockResolvedValue(character({ NodAgain: { status: 'done', webm: 'nod.webm' } }));
  mocks.chat.mockResolvedValue('{"do":true,"action":"NodAgain"}');
  await debugThink();
  expect(mocks.chat.mock.calls[1][0].messages[0].content).not.toContain('NewDance');
  expect(mocks.execute.mock.calls[1][0].steps[0].action).toBe('NodAgain');
});
it('LLM 请求期间动作被删除，保留台词但不发送失效动作', async () => {
  mocks.character.mockResolvedValueOnce(character({ cheer: { status: 'done', webm: 'cheer.webm' } }))
    .mockResolvedValue(character());
  mocks.chat.mockResolvedValue('{"do":true,"action":"cheer","say":"你好"}');
  await debugThink();
  expect(mocks.execute.mock.calls[0][0].steps).toEqual([{ op: 'say', text: '你好' }]);
});
