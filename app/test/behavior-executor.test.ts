import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { BehaviorScript } from '../src/shared/behavior-dsl';

const mocks = vi.hoisted(() => ({ send: vi.fn(), show: vi.fn(), record: vi.fn() }));
const mode = vi.hoisted(() => ({ freeMode: false }));
vi.mock('../src/main/config', () => ({ getSettings: async () => mode }));
vi.mock('../src/main/windows', () => ({ sendToWindows: mocks.send, showBubbleWindow: mocks.show }));
vi.mock('../src/main/local-sign', () => ({ setLocalSign: vi.fn() }));
vi.mock('../src/main/perception', () => ({ recordBehavior: mocks.record }));
vi.mock('../src/main/behavior-rules', () => ({ setBehaviorExecutor: vi.fn() }));
vi.mock('../src/main/brain-log', () => ({ updateBrainCall: vi.fn() }));
import { execute, getExecutorState, stopAllBehaviors } from '../src/main/behavior-executor';
import { rememberConversation, conversationFor } from '../src/main/conversation-memory';

let web: EventEmitter & { send: ReturnType<typeof vi.fn>; isLoading: ReturnType<typeof vi.fn> };
const script = (id: string, priority = 1, source: BehaviorScript['meta']['source'] = 'rule'): BehaviorScript => ({
  meta: { id, priority, source },
  steps: [{ op: 'play', action: id }, { op: 'say', text: id }],
});
beforeEach(() => {
  mode.freeMode = false;
  vi.useFakeTimers();
  vi.clearAllMocks();
  web = Object.assign(new EventEmitter(), { send: vi.fn(), isLoading: vi.fn(() => false) });
  mocks.show.mockReturnValue({ webContents: web, isDestroyed: () => false });
});
it('自由模式屏蔽规则台词但保留模型台词', async () => {
  mode.freeMode = true;
  execute(script('rule'));
  await vi.advanceTimersByTimeAsync(4000);
  expect(web.send).not.toHaveBeenCalled();
  execute(script('generated', 2, 'llm'));
  await vi.advanceTimersByTimeAsync(3000);
  expect(web.send).toHaveBeenCalledWith('behavior:say', expect.objectContaining({ text: 'generated' }));
});
afterEach(async () => {
  stopAllBehaviors();
  await vi.advanceTimersByTimeAsync(0);
  vi.useRealTimers();
});

it('高优先级打断等待后继续执行，不堵住后续台词', async () => {
  execute(script('old'));
  execute(script('new', 2));
  await vi.advanceTimersByTimeAsync(3000);
  expect(web.send).toHaveBeenCalledWith('behavior:say', expect.objectContaining({ text: 'new', durationMs: 20_000 }));
  expect(web.send).not.toHaveBeenCalledWith('behavior:say', expect.objectContaining({ text: 'old' }));
  await vi.advanceTimersByTimeAsync(20_000);
  expect(getExecutorState().current).toBeNull();
});

it('连续点击同条试播立即重播，旧执行完成不清除新执行', async () => {
  execute(script('preview', 1, 'debug'));
  await vi.advanceTimersByTimeAsync(1000);
  execute(script('preview', 1, 'debug'));
  expect(mocks.send.mock.calls.filter(([, p]) => p.action === 'preview')).toHaveLength(2);
  expect(mocks.send).toHaveBeenLastCalledWith('behavior:action', expect.objectContaining({ preview: true }));
  await vi.advanceTimersByTimeAsync(2000);
  expect(web.send).not.toHaveBeenCalled();
  expect(getExecutorState().current?.id).toBe('preview');
  await vi.advanceTimersByTimeAsync(1000);
  expect(web.send).toHaveBeenCalledTimes(1);
});

it('停止后马上启动，旧定时器不能推进新脚本', async () => {
  execute(script('old'));
  stopAllBehaviors();
  execute(script('new'));
  await vi.advanceTimersByTimeAsync(3000);
  expect(web.send).toHaveBeenCalledTimes(1);
  expect(web.send.mock.calls[0][1].text).toBe('new');
});

it('自动点击回应不排队，显式试播仍立即响应', () => {
  execute(script('busy'));
  execute(script('click-response', 30));
  expect(getExecutorState().queue).toEqual([]);
  expect(getExecutorState().current?.id).toBe('busy');
  execute(script('click-response', 30, 'debug'));
  expect(getExecutorState().current?.id).toBe('click-response');
});

it('气泡加载后才开始计时，中断的旧消息不能迟到覆盖', async () => {
  web.isLoading.mockReturnValue(true);
  execute({ ...script('old'), steps: [{ op: 'say', text: 'old' }] });
  stopAllBehaviors();
  execute({ ...script('new'), steps: [{ op: 'say', text: 'new' }] });
  await vi.advanceTimersByTimeAsync(10_000);
  web.emit('did-finish-load');
  expect(web.send).toHaveBeenCalledTimes(1);
  expect(web.send.mock.calls[0][1].text).toBe('new');
  await vi.advanceTimersByTimeAsync(19_999);
  expect(getExecutorState().current?.id).toBe('new');
  await vi.advanceTimersByTimeAsync(1);
  expect(getExecutorState().current).toBeNull();
});

it('页面加载失败超时释放队列，迟到的加载事件不发送过期台词', async () => {
  web.isLoading.mockReturnValue(true);
  execute({ ...script('old'), steps: [{ op: 'say', text: 'old' }] });
  await vi.advanceTimersByTimeAsync(15_000);
  expect(getExecutorState().current).toBeNull();
  web.emit('did-finish-load');
  expect(web.send).not.toHaveBeenCalled();
});

it('聊天三句话立即一起冒泡，动作不等气泡消失', async () => {
  execute(script('old'));
  execute({ meta: { id: 'llm-chat', source: 'llm', priority: 100 }, steps: [
    { op: 'say', text: '一' }, { op: 'say', text: '二' }, { op: 'say', text: '三' }, { op: 'play', action: 'newDance' },
  ] });
  await vi.advanceTimersByTimeAsync(20);
  expect(web.send.mock.calls.map(c => c[1].text)).toEqual(['一', '二', '三']);
  expect(web.send.mock.calls.every(c => c[1].source === 'chat')).toBe(true);
  expect(mocks.send).toHaveBeenLastCalledWith('behavior:action', expect.objectContaining({ action: 'newDance', preview: true }));
});

it('实际发出的自动台词进入共享记忆，未发送的旧回应不记成说过', async () => {
  execute({ meta: { id: 'llm-brain', source: 'llm', priority: 10, characterId: 'memory-sent' }, steps: [{ op: 'say', text: '休息一下吧' }] });
  expect(conversationFor('memory-sent').at(-1)?.text).toBe('休息一下吧');
  stopAllBehaviors();
  execute({ meta: { id: 'llm-brain', source: 'llm', priority: 10, characterId: 'memory-race' }, steps: [{ op: 'play', action: 'wave' }, { op: 'say', text: '过时回复' }] });
  await vi.advanceTimersByTimeAsync(1000);
  rememberConversation('memory-race', { role: 'user', source: 'chat', text: '新的问题', at: Date.now() });
  await vi.advanceTimersByTimeAsync(3000);
  expect(web.send).not.toHaveBeenCalledWith('behavior:say', expect.objectContaining({ text: '过时回复' }));
  expect(conversationFor('memory-race').map(line => line.text)).toEqual(['新的问题']);
});
