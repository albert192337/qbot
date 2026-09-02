import { afterEach, describe, expect, it, vi } from 'vitest';

describe('hatch pane', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('mounts and handles progress events without runtime reference errors', async () => {
    let progress: ((event: Record<string, unknown>) => void) | undefined;
    const queryable = {
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    const host = { ...queryable, innerHTML: '' } as unknown as HTMLElement;

    vi.stubGlobal('document', queryable);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      innerWidth: 880,
      qbot: {
        hatch: {
          onProgress: (callback: typeof progress) => {
            progress = callback;
            return vi.fn();
          },
        },
        characters: { list: vi.fn(async () => []) },
      },
    });

    const hatch = await import('../src/renderer/console/panes/hatch');
    await expect(hatch.mount(host)).resolves.toBeUndefined();
    expect(progress).toBeTypeOf('function');
    expect(() => progress?.({ dirId: 'pet-1', jobId: 'job-1', stage: 'turnaround' })).not.toThrow();
    expect(() => progress?.({ dirId: 'pet-1', jobId: 'job-1', stage: 'actions' })).not.toThrow();
    expect(() => progress?.({ dirId: 'pet-1', jobId: 'job-1', stage: 'failed', error: 'boom' })).not.toThrow();
    hatch.unmount();
  });
});
