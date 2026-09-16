import { describe, it, expect, vi } from 'vitest';
import { WeatherSession, type WeatherSurface } from '../src/main/weather-session';

const surface = (): WeatherSurface => ({ transition: vi.fn(async () => {}), dispose: vi.fn() });
describe('temporary desktop weather lifecycle', () => {
  it('serializes fast switches and restores after pending transitions', async () => {
    const layer = surface();
    const create = vi.fn(async () => layer);
    const session = new WeatherSession(create);
    await Promise.all([session.change('meteor'), session.change('aurora'), session.change(null)]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(layer.transition).toHaveBeenNthCalledWith(1, 'meteor');
    expect(layer.transition).toHaveBeenNthCalledWith(2, 'aurora');
    expect(layer.transition).toHaveBeenNthCalledWith(3, null);
    expect(layer.dispose).toHaveBeenCalledTimes(1);
    expect(session.current).toBeNull(); expect(session.busy).toBe(false);
  });
  it('disposes a late-created layer if the app quits or the display disappears', async () => {
    const layer = surface();
    let finish!: (value: WeatherSurface) => void;
    const session = new WeatherSession(() => new Promise(resolve => { finish = resolve; }));
    const start = session.change('meteor');
    await Promise.resolve(); session.stop(); finish(layer); await start;
    expect(layer.transition).not.toHaveBeenCalled();
    expect(layer.dispose).toHaveBeenCalledTimes(1);
    expect(session.current).toBeNull();
  });
  it('does not resurrect weather when an in-flight fade completes after stop', async () => {
    let finish!: () => void;
    const layer = surface();
    layer.transition = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const session = new WeatherSession(async () => layer);
    const start = session.change('meteor');
    await Promise.resolve(); await Promise.resolve();
    session.stop(); finish(); await start;
    expect(layer.dispose).toHaveBeenCalledTimes(1); expect(session.current).toBeNull();
  });
  it('cleans up failed transitions and can retry with a fresh surface', async () => {
    const broken = surface(), healthy = surface();
    broken.transition = vi.fn(async () => { throw new Error('renderer gone'); });
    const create = vi.fn().mockResolvedValueOnce(broken).mockResolvedValueOnce(healthy);
    const session = new WeatherSession(create);
    await expect(session.change('meteor')).rejects.toThrow('renderer gone');
    expect(broken.dispose).toHaveBeenCalledTimes(1);
    await session.change('aurora'); expect(session.current).toBe('aurora');
  });
  it('restore without a weather layer never creates a desktop window', async () => {
    const create = vi.fn(); const session = new WeatherSession(create);
    await session.change(null); expect(create).not.toHaveBeenCalled();
  });
});
