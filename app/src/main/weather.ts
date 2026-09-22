import { beginGardenWeatherTest, endGardenWeatherTest } from './garden/service';
import { app, dialog, powerMonitor, screen } from 'electron';

import { WEATHER_PRESETS, WEATHER_TEST_MS, type WeatherKind } from '../shared/weather';
import { WeatherSession, type WeatherSurface } from './weather-session';
import { createBitmapWeatherSurface } from './weather-surface';
import { cancelWeatherReaction, reactToWeather } from './weather-reaction';
let reactionRequest = 0;
let visualSource: 'test'|'scheduled'|null=null;
export function weatherPreview(){return visualSource==='test'?session.current:null;}
export async function showScheduledWeather(kind:WeatherKind,until:number){await changeWeatherTest(kind,undefined,Math.max(1,until-Date.now()),'scheduled');}
export async function clearScheduledWeather(){if(visualSource==='scheduled')await changeWeatherTest(null);}

let anchor: Electron.Rectangle | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;
let initialized = false;
let onChanged = () => {};
export function onWeatherTestChanged(listener: () => void): void { onChanged = listener; }
const session = new WeatherSession(createSurface);

async function createSurface(): Promise<WeatherSurface> {
  if (process.platform !== 'win32') throw new Error('天气背景测试目前支持 Windows');
  const display = anchor ? screen.getDisplayMatching(anchor) : screen.getPrimaryDisplay();
  return createBitmapWeatherSurface(display, stopWeatherTest);
}

export function stopWeatherTest(): void {
  reactionRequest++; cancelWeatherReaction();
  clearTimeout(expiry); expiry = undefined;
  session.stop(); visualSource=null;
  void endGardenWeatherTest().catch(error=>console.warn('[weather] ending test',error));
  onChanged();
}

export function initWeatherTest(): void {
  if (initialized) return;
  initialized = true;
  app.on('before-quit', stopWeatherTest);
  screen.on('display-added', stopWeatherTest);
  screen.on('display-removed', stopWeatherTest);
  screen.on('display-metrics-changed', stopWeatherTest);
  powerMonitor.on('suspend', stopWeatherTest);
  powerMonitor.on('lock-screen', stopWeatherTest);
}

export async function changeWeatherTest(kind: WeatherKind | null, bounds?: Electron.Rectangle, durationMs=WEATHER_TEST_MS, source:'test'|'scheduled'='test'): Promise<void> {
  initWeatherTest();
  const startedAt=Date.now();
  visualSource=kind?source:null;
  const request = ++reactionRequest; cancelWeatherReaction();
  clearTimeout(expiry); expiry = undefined;
  if(source==='test'&&kind)await beginGardenWeatherTest(kind,durationMs);else await endGardenWeatherTest();
  if(request!==reactionRequest)return;
  anchor = bounds;
  const changing = session.change(kind);
  onChanged();
  try { await changing; } finally { onChanged(); }
  if (kind && request === reactionRequest && session.current === kind) void reactToWeather(kind).catch(error => console.warn('[weather] reaction failed', error));
  clearTimeout(expiry); expiry = undefined;
  if (session.current) expiry = setTimeout(() => { void changeWeatherTest(null).catch(() => stopWeatherTest()); }, Math.max(1,durationMs-(source==='scheduled'?Date.now()-startedAt:0)));
}

/** Test controls are available in both the pet menu and tray (including restore). */
export function weatherTestMenu(bounds?: Electron.Rectangle): Electron.MenuItemConstructorOptions {
  const run = (kind: WeatherKind | null) => {
    console.info('[weather] requested', kind ?? 'restore');
    void changeWeatherTest(kind, bounds).catch(error => {
      console.error('[weather] failed', error);
      void dialog.showMessageBox({ type: 'error', title: '天气背景测试', message: '暂时无法显示天气背景',
        detail: `已恢复桌面显示。${error instanceof Error ? error.message : String(error)}` });
    });
  };
  return { label: '切换天气（测试）', submenu: [
    ...WEATHER_PRESETS.map(preset => ({ label: preset.label, type: 'radio' as const,
      checked: session.current === preset.id, enabled: process.platform === 'win32' && !session.busy,
      click: () => run(preset.id) })),
    { type: 'separator' },
    { label: '恢复原壁纸', enabled: !!session.current || session.busy, click: () => run(null) },
    { label: process.platform === 'win32' ? '真实变异 · 每场判定一次 · 3 分钟自动恢复' : '当前测试仅支持 Windows', enabled: false },
  ] };
}
