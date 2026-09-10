import type { GardenApi } from '../../shared/garden';

/** One local deadline timer: works while the garden is folded, without polling its save. */
export function attachGardenHint(button: HTMLElement, api: Pick<GardenApi, 'get' | 'onChanged'>): () => void {
  let deadlines: number[] = [], timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0, disposed = false;
  const update = () => {
    clearTimeout(timer);
    const now = Date.now();
    button.classList.toggle('garden-ready', deadlines.some(at => at <= now));
    const next = Math.min(...deadlines.filter(at => at > now));
    if (Number.isFinite(next)) timer = setTimeout(update, Math.min(2_147_483_647, Math.max(20, next - now + 20)));
  };
  const refresh = async () => {
    const request = ++generation;
    try {
      const state = await api.get();
      if (disposed || request !== generation) return;
      deadlines = state.plots.flatMap(p => p ? [p.readyAt] : []);
      update();
    } catch { /* A failed read must not show a false ready signal. */ }
  };
  const off = api.onChanged(() => void refresh());
  const visible = () => { if (!document.hidden) { update(); void refresh(); } };
  document.addEventListener('visibilitychange', visible);
  void refresh();
  return () => { disposed = true; generation++; clearTimeout(timer); off(); document.removeEventListener('visibilitychange', visible); };
}
