import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it('only follows an explicitly opened job and ignores background jobs while creating', async () => {
  let progress: ((event: Record<string, unknown>) => void) | undefined;
  const screens = new Map<string, { classList: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> } }>();
  for (const id of ['drop', 'brewing', 'pick', 'progress', 'certificate']) screens.set(`#hatch-screen-${id}`, {classList:{add:vi.fn(),remove:vi.fn()}});
  const host = { innerHTML:'', querySelector:(selector:string) => screens.get(selector) ?? null, querySelectorAll:()=>[] } as unknown as HTMLElement;
  const status = vi.fn(async () => ({stage:'turnaround',running:true,actions:{}}));
  vi.stubGlobal('document', {querySelector:()=>null,querySelectorAll:()=>[]});
  vi.stubGlobal('localStorage', {getItem:()=>null});
  vi.stubGlobal('requestAnimationFrame', (fn:FrameRequestCallback)=>{fn(0);return 1;});
  vi.stubGlobal('window', {
    addEventListener:vi.fn(),setInterval:vi.fn(()=>1),clearInterval:vi.fn(),innerWidth:880,
    qbot:{hatch:{onCloudStatus:vi.fn(()=>vi.fn()),getStatus:status,onProgress:(fn:typeof progress)=>{progress=fn;return vi.fn();}},settings:{get:async()=>({})},characters:{list:async()=>[]}},
  });
  const hatch = await import('../src/renderer/console/panes/hatch');
  await hatch.mount(host);
  progress?.({dirId:'background',stage:'turnaround'});
  expect(screens.get('#hatch-screen-brewing')!.classList.add).not.toHaveBeenCalled();
  expect(status).not.toHaveBeenCalled();
  await hatch.onNavigate({pane:'hatch',taskId:'chosen'});
  expect(status).toHaveBeenCalledWith('chosen');
  expect(screens.get('#hatch-screen-brewing')!.classList.add).toHaveBeenCalledWith('active');
  const count = screens.get('#hatch-screen-brewing')!.classList.add.mock.calls.length;
  progress?.({dirId:'different',stage:'turnaround'});
  expect(screens.get('#hatch-screen-brewing')!.classList.add).toHaveBeenCalledTimes(count);
  await hatch.onNavigate({pane:'hatch',fresh:true});
  progress?.({dirId:'chosen',stage:'turnaround'});
  expect(screens.get('#hatch-screen-brewing')!.classList.add).toHaveBeenCalledTimes(count);
  expect(screens.get('#hatch-screen-drop')!.classList.add).toHaveBeenCalledWith('active');
  hatch.unmount();
});
