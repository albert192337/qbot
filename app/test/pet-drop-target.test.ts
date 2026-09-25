import { expect, it, vi } from 'vitest';
import { resolvePetDrop } from '../src/renderer/pet/drop-target';
it('docks on a valid window even when its position would trigger edge peek', async () => {
  const api = { perch: vi.fn(async () => ({ok:true})), peek: vi.fn(async () => true), toast: vi.fn() };
  await resolvePetDrop(api, () => true);
  expect(api.perch).toHaveBeenCalledOnce(); expect(api.peek).not.toHaveBeenCalled();
});
it('falls back to edge peek when the drop cannot dock, suppressing irrelevant errors', async () => {
  const api = { perch: vi.fn(async () => ({ok:false,reason:'空间不足'})), peek: vi.fn(async () => true), toast: vi.fn() };
  await resolvePetDrop(api, () => true);
  expect(api.peek).toHaveBeenCalledOnce(); expect(api.toast).not.toHaveBeenCalled();
});
it('does not let an unavailable edge interface prevent window docking', async () => {
  const api = { perch: vi.fn(async () => ({ok:true})), peek: vi.fn(async () => {throw Error('No handler');}), toast: vi.fn() };
  await resolvePetDrop(api, () => true);
  expect(api.perch).toHaveBeenCalledOnce(); expect(api.peek).not.toHaveBeenCalled();
});
it('reports failures and cancels stale fallback after another drag starts', async () => {
  const api = { perch: vi.fn(async () => ({ok:false,reason:'缺少窗沿动作'})), peek: vi.fn(async () => false), toast: vi.fn() };
  await resolvePetDrop(api, () => true); expect(api.toast).toHaveBeenCalledWith('缺少窗沿动作');
  api.peek.mockClear(); await resolvePetDrop(api, () => false); expect(api.peek).not.toHaveBeenCalled();
  api.perch.mockRejectedValueOnce(Error('helper failed')); api.peek.mockRejectedValueOnce(Error('No handler'));
  await expect(resolvePetDrop(api, () => true)).resolves.toBeUndefined();
  expect(api.toast).toHaveBeenLastCalledWith(expect.stringContaining('重启'));
});
