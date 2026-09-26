import { describe, expect, it, vi } from 'vitest';
import { NurseryController } from '../src/renderer/nursery/controller';
import { incubation, errorMessage } from '../src/renderer/nursery/model';
import type { HatchStatus } from '../src/shared/ipc-types';
const status = (patch: Partial<HatchStatus> = {}): HatchStatus => ({ stage: 'turnaround', running: true, actions: {} as HatchStatus['actions'], ...patch });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
describe('nursery scene boundary', () => {
  it('does not let an old task snapshot replace the selected task', async () => {
    const slow = deferred<HatchStatus>();
    const controller = new NurseryController({ getStatus: vi.fn(id => id === 'a' ? slow.promise : Promise.resolve(status({ stage: 'awaiting_pick' }))) }, vi.fn());
    const first = controller.open('a'); await controller.open('b');
    slow.resolve(status({ stage: 'done' })); await first;
    expect(controller.state.id).toBe('b'); expect(controller.state.status?.stage).toBe('awaiting_pick');
  });
  it('preserves newer cloud pushes over older snapshots', async () => {
    const slow = deferred<HatchStatus>(); const controller = new NurseryController({ getStatus: () => slow.promise }, vi.fn());
    const opening = controller.open('a'); controller.receive('a', status({ stage: 'done' }));
    slow.resolve(status()); await opening;
    expect(controller.state.status?.stage).toBe('done');
  });
  it('ignores background jobs and does not resume a paused task on read', async () => {
    const getStatus = vi.fn(async () => status({ running: false }));
    const controller = new NurseryController({ getStatus }, vi.fn());
    controller.receive('other'); expect(getStatus).not.toHaveBeenCalled();
    await controller.open('a'); controller.receive('other', status({ stage: 'done' }));
    expect(controller.state.status?.running).toBe(false);
    expect(incubation(controller.state.status).phase).toBe('interrupted');
    await controller.open(null); controller.receive('a'); expect(getStatus).toHaveBeenCalledTimes(1);
  });
  it('locks repeated mutations and unlocks after failure', async () => {
    const slow = deferred<void>(); const controller = new NurseryController({ getStatus: async () => null }, vi.fn());
    const first = controller.perform(() => slow.promise); const duplicate = vi.fn();
    expect(await controller.perform(duplicate)).toBe(false); expect(duplicate).not.toHaveBeenCalled();
    slow.resolve(); expect(await first).toBe(true);
    expect(await controller.perform(async () => { throw new Error('offline'); })).toBe(false);
    expect(controller.state).toMatchObject({ busy: false, error: 'offline' });
  });
  it('keeps local failure events even when no failed snapshot was persisted', async () => {
    const controller = new NurseryController({ getStatus: async () => status() }, vi.fn());
    await controller.open('a');
    controller.receiveProgress({ dirId:'a', jobId:'a', stage:'failed', error:'模型暂时不可用' });
    expect(controller.state.status).toMatchObject({ stage:'failed', running:false, error:'模型暂时不可用' });
  });
  it('does not publish after disposal', async () => {
    const slow = deferred<HatchStatus>(); const changed = vi.fn();
    const controller = new NurseryController({ getStatus: () => slow.promise }, changed);
    const opening = controller.open('a'); controller.dispose(); changed.mockClear(); slow.resolve(status()); await opening;
    expect(changed).not.toHaveBeenCalled();
  });
  it('reports missing task records and permits a later refresh', async () => {
    const getStatus = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(status());
    const controller = new NurseryController({ getStatus }, vi.fn()); await controller.open('missing');
    expect(controller.state.error).toContain('记录'); await controller.refresh(); expect(controller.state.error).toBeNull();
  });
});
describe('honest progress', () => {
  it('counts completed actions, never treating failed actions as completion', () => {
    const st = status({ stage: 'done', actions: { idle: {status:'done'}, sleep:{status:'failed'} } as HatchStatus['actions'] });
    expect(incubation(st)).toEqual({ phase:'interrupted',done:1,failed:1,total:2 });
  });
  it('requires the package done stage for birth', () => {
    expect(incubation(status({ stage:'package' })).phase).toBe('learning');
    expect(incubation(status({ stage:'done', running:false })).phase).toBe('born');
    expect(incubation(status({ stage:'awaiting_pick', running:false })).phase).toBe('interrupted');
    expect(incubation(status({ cloudPhase:'queued' })).phase).toBe('queued');
  });
});

it('shows the actionable error without Electron transport internals', () => {
  expect(errorMessage(new Error("Error invoking remote method 'characters:activate': Error: 领取暂时失败，请重试"))).toBe('领取暂时失败，请重试');
});
