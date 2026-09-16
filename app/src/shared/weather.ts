/** Local visual test only; no garden rewards or automatic weather scheduling. */
export const WEATHER_PRESETS = [
  { id: 'meteor', label: '流星夜' },
  { id: 'aurora', label: '极光夜' },
] as const;
export type WeatherKind = typeof WEATHER_PRESETS[number]['id'];
export const WEATHER_FADE_MS = 2400;
export const WEATHER_TEST_MS = 180_000;
export function isWeatherKind(value: unknown): value is WeatherKind {
  return WEATHER_PRESETS.some(preset => preset.id === value);
}
