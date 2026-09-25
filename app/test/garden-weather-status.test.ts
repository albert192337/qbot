import { expect, it } from 'vitest';
import { gardenWeatherStatus } from '../src/shared/garden-weather-status';
import { hourlyWeather, type GardenV3 } from '../src/shared/garden-v3';
import { gardenWeather } from '../src/shared/garden-weather';
import { weatherIcon, weatherName } from '../src/renderer/weather-ui';

it('uses the same realm and hourly calendar as the garden, including hour boundaries', () => {
  for (const realm of ['garden', 'online-realm']) {
    const state = { v3: { realm } as GardenV3 };
    for (let hour = 497000; hour < 497200; hour++) {
      const s = gardenWeatherStatus(state, hour * 3600000 + 3599999);
      expect(s.hourly?.current.kind).toBe(hourlyWeather(hour, realm));
      expect(s.hourly?.next).toEqual(gardenWeatherStatus(state, (hour + 1) * 3600000).hourly?.current);
      expect(weatherName(s.hourly!.current.kind)).toBeTruthy();
      expect(weatherIcon(s.hourly!.current.kind)).not.toContain('undefined');
    }
  }
});
it('preserves legacy calendars and bounds test weather without replacing the hourly calendar', () => {
  const now = Date.UTC(2026, 8, 25, 8);
  expect(gardenWeatherStatus({}, now)).toMatchObject(gardenWeather(now));
  const testWeather = { id: 'weather-test:one', kind: 'aurora' as const, start: now, end: now + 1000, checkedAt: now, evaluated: [] };
  const state = { v3: { realm: 'garden' } as GardenV3, testWeather };
  expect(gardenWeatherStatus(state, now).test?.kind).toBe('aurora');
  expect(gardenWeatherStatus(state, now + 1000).test).toBeNull();
  expect(gardenWeatherStatus(state, now).hourly?.current.kind).toBe(hourlyWeather(now / 3600000));
});
