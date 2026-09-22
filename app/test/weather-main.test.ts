vi.mock('../src/main/garden/service',()=>({beginGardenWeatherTest:vi.fn(async()=>{}),endGardenWeatherTest:vi.fn(async()=>{})}));
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocked = vi.hoisted(() => ({ create: vi.fn(), transition: vi.fn(), dispose: vi.fn(), lost: () => {} }));
vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events');
  return { app: new EventEmitter(), powerMonitor: new EventEmitter(), dialog: {showMessageBox: vi.fn()},
    screen: Object.assign(new EventEmitter(), {getPrimaryDisplay: () => ({bounds:{x:0,y:0,width:1200,height:800}})}),
  };
});
vi.mock('../src/main/weather-reaction',()=>({cancelWeatherReaction:vi.fn(),reactToWeather:vi.fn(async()=>{})}));
vi.mock('../src/main/weather-surface', () => ({createBitmapWeatherSurface: mocked.create}));
import { changeWeatherTest, stopWeatherTest, weatherTestMenu, showScheduledWeather, weatherPreview } from '../src/main/weather';
import { powerMonitor, screen } from 'electron';
import { WEATHER_TEST_MS } from '../src/shared/weather';
beforeEach(() => {
  vi.useFakeTimers(); mocked.dispose.mockClear();mocked.transition.mockReset().mockResolvedValue(undefined);
  mocked.create.mockReset().mockImplementation(async (_display, lost) => {mocked.lost=lost;return {transition:mocked.transition,dispose:mocked.dispose};});
  vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
});
afterEach(() => { stopWeatherTest(); vi.restoreAllMocks(); vi.useRealTimers(); });
it('fades out and releases the native layer at expiry', async () => {
  await changeWeatherTest('meteor');await vi.advanceTimersByTimeAsync(WEATHER_TEST_MS-1);
  expect(mocked.dispose).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1);
  expect(mocked.transition).toHaveBeenLastCalledWith(null);expect(mocked.dispose).toHaveBeenCalledTimes(1);
});
it('renews expiry on switch and cancels it on restore', async () => {
  await changeWeatherTest('meteor');await vi.advanceTimersByTimeAsync(100000);
  await changeWeatherTest('aurora');await vi.advanceTimersByTimeAsync(100000);
  expect(mocked.dispose).not.toHaveBeenCalled();await changeWeatherTest(null);
  await vi.advanceTimersByTimeAsync(WEATHER_TEST_MS);expect(mocked.dispose).toHaveBeenCalledTimes(1);
});
it('keeps only one expiry timer for queued switches',async()=>{
  await Promise.all([changeWeatherTest('meteor'),changeWeatherTest('aurora')]);
  expect(vi.getTimerCount()).toBe(1);
  await changeWeatherTest(null);expect(vi.getTimerCount()).toBe(0);
});
it.each(['suspend','lock-screen'])('releases weather immediately on %s',async event=>{
  await changeWeatherTest('meteor');powerMonitor.emit(event);
  expect(mocked.dispose).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
});
it('releases weather on geometry change or native failure',async()=>{
  await changeWeatherTest('meteor');screen.emit('display-metrics-changed');
  expect(mocked.dispose).toHaveBeenCalledTimes(1);
  await changeWeatherTest('aurora');mocked.lost();expect(mocked.dispose).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});
it('does not schedule expiry after creation failure',async()=>{
  mocked.create.mockRejectedValueOnce(new Error('unsupported desktop'));
  await expect(changeWeatherTest('meteor')).rejects.toThrow('unsupported desktop');expect(vi.getTimerCount()).toBe(0);
});
it('disables unsupported platforms',()=>{
  vi.spyOn(process,'platform','get').mockReturnValue('darwin');
  const menu=weatherTestMenu().submenu as Electron.MenuItemConstructorOptions[];
  expect(menu[0].enabled).toBe(false);expect(menu.at(-1)?.label).toContain('Windows');
});
it('enables Windows presets and marks the active weather',async()=>{
  await changeWeatherTest('meteor');const menu=weatherTestMenu().submenu as Electron.MenuItemConstructorOptions[];
  expect(menu[0].enabled).toBe(true);expect(menu[0].checked).toBe(true);expect(menu[1].checked).toBe(false);
});

it('keeps scheduled weather for the event duration, independent of three-minute previews',async()=>{
  await showScheduledWeather('meteor',Date.now()+45*60000);expect(weatherPreview()).toBeNull();
  await vi.advanceTimersByTimeAsync(3*60000);expect(mocked.dispose).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(42*60000);expect(mocked.dispose).toHaveBeenCalledTimes(1);
});
