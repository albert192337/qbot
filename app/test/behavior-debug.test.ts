import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ emit: vi.fn() }));
vi.mock('../src/main/perception', () => ({ emitEvent: mocks.emit, currentFocus: vi.fn(), getSnapshot: vi.fn(), onPerceptionChanged: vi.fn(), recordDecision: vi.fn() }));
vi.mock('../src/main/agent-server', () => ({ getAgentStatus: vi.fn() }));
vi.mock('../src/main/meeting-monitor', () => ({ getMeetingStatus: vi.fn() }));
vi.mock('../src/main/music-monitor', () => ({ getMusicStatus: vi.fn() }));
import { loadBuiltinRules, debugTrigger, setBehaviorExecutor, setAvailableActionsGetter } from '../src/main/behavior-rules';
it('重复规则试播只执行所选规则，不伪造点击事件引出“嗯？”', async () => {
  await loadBuiltinRules();
  const execute = vi.fn();
  setBehaviorExecutor(execute);
  setAvailableActionsGetter(() => ['idle', 'wave']);
  debugTrigger('click-response');
  debugTrigger('click-response');
  expect(execute).toHaveBeenCalledTimes(2);
  expect(execute.mock.calls.every(([s]) => s.meta.source === 'debug')).toBe(true);
  expect(mocks.emit).not.toHaveBeenCalled();
});
