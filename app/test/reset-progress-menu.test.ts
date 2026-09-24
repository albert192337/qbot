import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({show:vi.fn(),request:vi.fn(),quit:vi.fn(),relaunch:vi.fn()}));
vi.mock('electron',()=>({app:{getPath:()=>'/isolated',quit:mocks.quit,relaunch:mocks.relaunch},dialog:{showMessageBox:mocks.show}}));
vi.mock('../src/main/reset-progress-storage',()=>({requestProgressReset:mocks.request}));
import { confirmProgressReset } from '../src/main/reset-progress';
const owner={isDestroyed:()=>false} as any;
beforeEach(()=>vi.clearAllMocks());
it('cancel is the default and causes no reset or restart',async()=>{
 mocks.show.mockResolvedValue({response:0});await confirmProgressReset(owner);
 expect(mocks.show.mock.calls[0][1]).toMatchObject({defaultId:0,cancelId:0});
 expect(mocks.request).not.toHaveBeenCalled();expect(mocks.quit).not.toHaveBeenCalled();
});
it('confirmed reset persists the request before graceful restart',async()=>{
 mocks.show.mockResolvedValue({response:1});mocks.request.mockResolvedValue('/backup');
 await confirmProgressReset(owner);expect(mocks.request).toHaveBeenCalledWith('/isolated');
 expect(mocks.relaunch).toHaveBeenCalledOnce();expect(mocks.quit).toHaveBeenCalledOnce();
 expect(mocks.request.mock.invocationCallOrder[0]).toBeLessThan(mocks.relaunch.mock.invocationCallOrder[0]);
});
it('storage failure leaves the running app open',async()=>{
 mocks.show.mockResolvedValue({response:1});mocks.request.mockRejectedValue(Error('disk full'));
 await confirmProgressReset(owner);expect(mocks.relaunch).not.toHaveBeenCalled();expect(mocks.quit).not.toHaveBeenCalled();
 expect(mocks.show).toHaveBeenCalledTimes(2);
});
