import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/main/user-memory', () => ({ initUserMemory: async () => ({ revision: 0, flush: async () => {}, select: async () => [] }) }));
const mocks = vi.hoisted(() => ({ character: vi.fn(), chat: vi.fn(), execute: vi.fn(), log: vi.fn(), perception: vi.fn() }));
vi.mock('../src/main/brain-log', () => ({ beginBrainCall: async () => 'test-call', updateBrainCall: mocks.log, brainGate: vi.fn() }));
vi.mock('../src/main/config', () => ({ getSettings: async () => ({ activeCharacter: 'test', freeMode: true, arkApiKey: 'mock-only' }) }));
vi.mock('../src/main/characters', () => ({ getCharacter: mocks.character }));
vi.mock('../src/main/llm-client', () => ({ BRAIN_MODEL: 'test-model', ARK_BASE_URL: 'https://example.invalid', chatCompleteWithRetry: mocks.chat, LlmError: class extends Error {} }));
vi.mock('../src/main/perception', () => ({
  currentFocus: () => ({ app: null }),
  getSnapshot: async () => ({ ledger: { apps: {}, totalSwitches: 0 }, behaviors: [], foreground: { app: 'Google Chrome', windowTitle: '燕云体验整理', at: Date.now() } }),
  onPerceptionChanged: mocks.perception, recordBehavior: vi.fn(), recordDecision: vi.fn(),
}));
vi.mock('../src/main/agent-server', () => ({ getAgentStatus: () => ({ activity: 'idle' }) }));
vi.mock('../src/main/meeting-monitor', () => ({ getMeetingStatus: () => ({ inMeeting: false }) }));
vi.mock('../src/main/music-monitor', () => ({ getMusicStatus: () => ({ playing: false }) }));
import { debugThink, setBrainExecutor, brainInterval, wireBrain } from '../src/main/brain-llm';
import { rememberConversation } from '../src/main/conversation-memory';

beforeEach(() => { vi.clearAllMocks(); setBrainExecutor(mocks.execute); });
it('重要收获可越过普通冷却触发，连续收获不连发请求', async () => {
  mocks.character.mockResolvedValue(character());
  mocks.chat.mockResolvedValue('{"do":true,"action":"idle","say":"草莓可以留给下午茶"}');
  await debugThink();
  wireBrain();
  const notify = mocks.perception.mock.calls[0][0];
  notify({ type: 'garden_highlight', at: Date.now(), summary: '收获金色草莓' });
  await vi.waitFor(() => expect(mocks.chat).toHaveBeenCalledTimes(2));
  expect(mocks.chat.mock.calls[1][0].messages[0].content).toContain('刚发生了一次值得庆祝的收获');
  notify({ type: 'garden_highlight', at: Date.now(), summary: '再收获一株' });
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(mocks.chat).toHaveBeenCalledTimes(2);
});
it('陪伴节奏不变，自由模式更主动', () => {
  expect(brainInterval()).toBe(900000);
  expect(brainInterval('companion')).toBe(900000);
  expect(brainInterval('free')).toBe(90000);
});
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
it('模型仅留言的决定进入真实行为脚本', async () => {
  mocks.character.mockResolvedValue(character());
  mocks.chat.mockResolvedValue('{"do":true,"message":"别熬太晚"}');
  await debugThink();
  expect(mocks.execute.mock.calls[0][0].steps).toEqual([{ op: 'sign', text: '别熬太晚' }]);
  expect(mocks.chat.mock.calls[0][0].messages[0].content).toContain('持续30分钟');
});
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

it('自动脑实际请求读取共享聊天与前台标题', async () => {
  rememberConversation('test', { role: 'user', source: 'chat', text: '刚才聊过燕云', at: Date.now() - 30 * 60000 });
  mocks.character.mockResolvedValue(character());
  mocks.chat.mockResolvedValue('{"do":false,"thought":"话题已经结束，先不打扰"}');
  await debugThink();
  const messages = JSON.stringify(mocks.chat.mock.calls[0][0].messages);
  expect(messages).toContain('燕云体验整理');
  expect(messages).toContain('刚才聊过燕云');
});
