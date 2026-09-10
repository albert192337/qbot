import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupSeeds } from '../src/renderer/garden/inventory';
import { attachGardenHint } from '../src/renderer/pet/garden-hint';
import type { GardenApi, GardenState, Seed } from '../src/shared/garden';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('desktop garden', () => {
  it('shows counts without mixing inherited genes or parentage', () => {
    const base: Seed = { id: '1', species: 'lotus', genes: [], bred: false };
    const seeds: Seed[] = [base, { ...base, id: '2' }, { ...base, id: '3', bred: true, genes: ['shiny'] }, { ...base, id: '4', bred: true, genes: ['giant'] }];
    expect(groupSeeds(seeds).map(x => x.count)).toEqual([2, 1, 1]);
    expect(groupSeeds(seeds)[0].seed.id).toBe('1');
    expect(seeds).toHaveLength(4);
  });
  it('subtly signals maturity while folded, and clears after harvest', async () => {
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    const doc = new EventTarget(); Object.assign(doc, { hidden: false }); vi.stubGlobal('document', doc);
    const classes = new Set<string>();
    const button = { classList: { toggle: (name: string, on: boolean) => on ? classes.add(name) : classes.delete(name) } } as unknown as HTMLElement;
    let plots = [{ readyAt: 11_000 }]; let changed = () => {};
    const off = vi.fn();
    const api = { get: async () => ({ plots } as GardenState), onChanged: (cb: () => void) => { changed = cb; return off; } };
    const dispose = attachGardenHint(button, api);
    await vi.advanceTimersByTimeAsync(0); expect(classes.has('garden-ready')).toBe(false);
    await vi.advanceTimersByTimeAsync(1100); expect(classes.has('garden-ready')).toBe(true);
    plots = []; changed(); await vi.advanceTimersByTimeAsync(0); expect(classes.has('garden-ready')).toBe(false);
    dispose(); expect(off).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
