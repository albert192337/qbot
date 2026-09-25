import type { GardenState } from './garden';
import { gardenWeather, type GardenWeatherStatus } from './garden-weather';
import { hourlyWeather } from './garden-v3';

/** One snapshot for the desktop indicator and the native background scheduler. */
export function gardenWeatherStatus(state: Pick<GardenState, 'v3' | 'testWeather'>, now = Date.now()): GardenWeatherStatus {
  const status = gardenWeather(now);
  if (state.v3) {
    const realm = state.v3.realm ?? 'garden', hour = Math.floor(now / 3600000);
    const event = (h: number) => ({ id: `v3:${realm}:${h}`, kind: hourlyWeather(h, realm), start: h * 3600000, end: (h + 1) * 3600000 });
    status.hourly = { current: event(hour), next: event(hour + 1) };
  }
  const test = state.testWeather;
  status.test = test && test.start <= now && now < test.end ? test : null;
  if (status.test) status.current = status.test;
  return status;
}
