import { beforeEach, expect, it, vi } from 'vitest';
const cloud = vi.hoisted(() => ({ isCloudJob:vi.fn(),cloudOperation:vi.fn() }));
vi.mock('../src/main/cloud-generation',()=>cloud);
vi.mock('../src/main/windows',()=>({}));
vi.mock('../src/main/tray',()=>({}));
vi.mock('../src/main/characters',()=>({}));
vi.mock('../src/main/config',()=>({}));
vi.mock('electron',()=>({webContents:{getAllWebContents:()=>[]}}));
beforeEach(()=>{vi.clearAllMocks();cloud.isCloudJob.mockReturnValue(true);cloud.cloudOperation.mockResolvedValue(undefined);});
it('routes cloud appearance confirmation and regeneration to the existing remote task',async()=>{
  const {pickTurnaround}=await import('../src/main/pipeline-bridge');
  await pickTurnaround('cloud-task',0);
  expect(cloud.cloudOperation).toHaveBeenLastCalledWith('cloud-task','pick',0);
  await pickTurnaround('cloud-task',-1);
  expect(cloud.cloudOperation).toHaveBeenLastCalledWith('cloud-task','pick',-1);
});
it('surfaces cloud quota/network failures so the scene keeps its confirmation screen',async()=>{
  const {pickTurnaround}=await import('../src/main/pipeline-bridge');
  cloud.cloudOperation.mockRejectedValue(new Error('额度不足'));
  await expect(pickTurnaround('cloud-task',0)).rejects.toThrow('额度不足');
});
it('retains the local active-task guard',async()=>{
  const {pickTurnaround}=await import('../src/main/pipeline-bridge');cloud.isCloudJob.mockReturnValue(false);
  await expect(pickTurnaround('not-active',0)).rejects.toThrow('no active hatch');
  expect(cloud.cloudOperation).not.toHaveBeenCalled();
});
