import { describe, expect, it } from 'vitest';
import { initialGarden, transition, validateGarden, refreshShop, REFRESH_MS, rollTraits } from '../src/main/garden/rules';
import { type GardenState, type GardenCommand, level } from '../src/shared/garden';
let n = 0;
const rng = (value = .8) => ({ random: () => value, id: () => `test-${n++}` });
const now = 100000;
function run(s: GardenState, cmd: GardenCommand, time = now, r = rng()) { return transition(s, cmd, time, r).state; }
function planted(random = .8) { const s = initialGarden(now, rng()); return run(s, { type: 'plant', plot: 0, seed: s.seeds[0].id }, now, rng(random)); }
describe('garden rules', () => {
    it('五种配饰基础概率一致，音乐只提升朋克和古典', () => {
        const s = initialGarden(now, rng());
        for (const music of [false, true]) {
            const counts: Record<string, number> = {};
            for (let i = 0; i < 1000; i++) for (const t of rollTraits(s, 'lotus', rng(i / 1000), 1, music)) counts[t] = (counts[t] ?? 0) + 1;
            for (const t of ['shiny', 'firefly', 'petals']) expect(counts[t]).toBe(8);
            for (const t of ['punk', 'classical']) expect(counts[t]).toBe(music ? 24 : 8);
        }
    });
    it('playing music boosts only musical accessories during sowing and mutation', () => {
        const s = initialGarden(now, rng());
        const cmd = { type: 'plant' as const, plot: 0, seed: s.seeds[0].id };
        const quiet = transition(s, cmd, now, rng(.01)).state;
        const music = transition(s, cmd, now, rng(.01), { musicPlaying: true }).state;
        expect(quiet.plots[0]!.traits).not.toContain('punk');
        expect(music.plots[0]!.traits).toEqual(expect.arrayContaining(['punk', 'classical']));
        expect(music.plots[0]!.traits.filter(t => !['punk', 'classical'].includes(t))).toEqual(quiet.plots[0]!.traits);
        const changed = transition(quiet, { type: 'fertilize', plot: 0, fertilizer: 'mutation' }, now, rng(.02), { musicPlaying: true }).state;
        expect(changed.plots[0]!.traits).toContain('classical');
        expect(validateGarden(changed)).toEqual(changed);
    });
    it('consumes one seed, keeps input immutable, rejects occupied/invalid plots', () => {
        const s = initialGarden(now, rng()), p = run(s, { type: 'plant', plot: 0, seed: s.seeds[0].id });
        expect(s.seeds).toHaveLength(6);
        expect(p.seeds).toHaveLength(5);
        expect(() => run(p, { type: 'plant', plot: 0, seed: p.seeds[0].id })).toThrow('先收获');
        expect(() => run(s, { type: 'plant', plot: -1, seed: s.seeds[0].id })).toThrow();
    });
    it('grows offline, harvests once, retains breeding status', () => {
        const s = planted();
        s.plots[0]!.bred = true;
        expect(() => run(s, { type: 'harvest', plot: 0 })).toThrow('还没有成熟');
        const p = run(s, { type: 'harvest', plot: 0 }, now + 24 * 3600000);
        expect(p.plots[0]).toBeNull();
        expect(p.produce[0].bred).toBe(true);
        expect(() => run(p, { type: 'harvest', plot: 0 }, now + 24 * 3600000)).toThrow();
    });
    it('giants weigh more; traits multiply value; maturity does not reroll', () => {
        const giant = planted(0), normal = planted(.99);
        expect(giant.plots[0]!.traits).toContain('giant');
        expect(giant.plots[0]!.kg).toBeGreaterThan(normal.plots[0]!.kg);
        expect(giant.plots[0]!.value).toBeGreaterThan(normal.plots[0]!.value);
        const mature = run(giant, { type: 'mature' });
        expect(mature.plots[0]!.traits).toEqual(giant.plots[0]!.traits);
        expect(mature.plots[0]!.kg).toBe(giant.plots[0]!.kg);
    });
    it('each fertilizer is consumed once, cannot apply after maturity', () => {
        const s = planted();
        const faster = run(s, { type: 'fertilize', plot: 0, fertilizer: 'speed' });
        expect(faster.plots[0]!.readyAt - now).toBe((s.plots[0]!.readyAt - now) / 2);
        expect(faster.fertilizers.speed).toBe(s.fertilizers.speed - 1);
        expect(() => run(faster, { type: 'fertilize', plot: 0, fertilizer: 'speed' })).toThrow('一次');
        expect(() => run(run(s, { type: 'mature' }), { type: 'fertilize', plot: 0, fertilizer: 'weight' })).toThrow();
    });
    it('mutation-created giant also receives the weight multiplier', () => {
        const s = planted();
        const p = run(s, { type: 'fertilize', plot: 0, fertilizer: 'mutation' }, now, rng(0));
        expect(p.plots[0]!.traits).toContain('giant');
        expect(p.plots[0]!.kg).toBe(s.plots[0]!.kg * 4);
    });
    it('cross-species breeding selects one parent species, consumes both qualifications across land/bag', () => {
        let s = planted(0);
        const seed = s.seeds.find(x => x.species === 'strawberry')!;
        s = run(s, { type: 'plant', plot: 1, seed: seed.id });
        s = run(s, { type: 'mature' });
        s = run(s, { type: 'harvest', plot: 0 });
        const a = s.produce[0], b = s.plots[1]!;
        const cmd = { type: 'breed' as const, first: a.id, second: b.id };
        const child = run(s, cmd, now, rng(0));
        expect(child.seeds.at(-1)!.species).toBe(a.species);
        expect(child.seeds.at(-1)!.genes).toEqual(a.traits);
        expect(child.seeds.at(-1)!.parents).toEqual(['lotus', 'strawberry']);
        expect(child.produce[0].bred).toBe(true);
        expect(child.plots[1]!.bred).toBe(true);
        expect(() => run(child, cmd)).toThrow();
        expect(run(s, cmd, now, rng(.99)).seeds.at(-1)!.species).toBe('strawberry');
        expect(() => run(s, { type: 'breed', first: a.id, second: a.id })).toThrow();
    });
    it('breeding rejects immature parents and preserves input on failure', () => {
        const s = planted();
        expect(() => run(s, { type: 'breed', first: s.plots[0]!.id, second: 'missing' })).toThrow();
        expect(s.plots[0]!.bred).toBe(false);
    });
    it('inherited genes survive planting even before their random unlock level', () => {
        const s = initialGarden(now, rng());
        s.seeds[0].genes = ['rainbow'];
        const p = run(s, { type: 'plant', plot: 0, seed: s.seeds[0].id });
        expect(p.plots[0]!.traits).toContain('rainbow');
    });
    it('shop stock and coins persist; old offers fail after timed refresh', () => {
        const s = initialGarden(now, rng());
        const o = s.shop.offers[0];
        const p = run(s, { type: 'buy', offer: o.id });
        expect(p.coins).toBe(s.coins - o.price);
        expect(p.shop.offers[0].stock).toBe(o.stock - 1);
        const copy = validateGarden(JSON.parse(JSON.stringify(p)));
        refreshShop(copy, now + 1000, rng());
        expect(copy.shop).toEqual(p.shop);
        expect(() => run(copy, { type: 'buy', offer: o.id }, now + REFRESH_MS)).toThrow('刷新');
        copy.coins = 0;
        expect(() => run(copy, { type: 'buy', offer: o.id })).toThrow('不足');
    });
    it('harvest unlocks factors once; claiming rewards upgrades species and cannot duplicate', () => {
        let s = run(planted(0), { type: 'mature' });
        s = run(s, { type: 'harvest', plot: 0 });
        const result = transition(s, { type: 'claim' }, now, rng());
        expect(result.points).toBe(260); // 原生 + 十二种 Lv.1 词条，各 20 分。
        expect(level(result.state.xp.lotus)).toBe(3);
        expect(() => run(result.state, { type: 'claim' })).toThrow();
        const advanced = run(result.state, { type: 'plant', plot: 0, seed: result.state.seeds[0].id }, now, rng(0));
        expect(advanced.plots[0]!.traits).toContain('rainbow');
    });
    it('box supplies are independent from furniture; emits explicit external transaction', () => {
        const s = initialGarden(now, rng());
        const r = transition(s, { type: 'box' }, now, rng());
        expect(r.points).toBe(-500);
          expect(r.boxes).toBe(-1);
          expect(r.reveal?.items).toHaveLength(2);
          expect(r.reveal?.items?.map(item=>item.kind)).toEqual(['seed','fertilizer']);
        expect(r.state.seeds.length).toBe(s.seeds.length + r.reveal!.items![0].count);
        expect(Object.values(r.state.fertilizers).reduce((a, b) => a + b)).toBe(7);
    });
    it('selling is final and cannot credit the same item twice', () => {
        let s = run(planted(), { type: 'mature' });
        s = run(s, { type: 'harvest', plot: 0 });
        const p = s.produce[0];
        const sold = run(s, { type: 'sell', id: p.id });
        expect(sold.coins).toBe(s.coins + p.value);
        expect(() => run(sold, { type: 'sell', id: p.id })).toThrow();
    });
    it('corrupt saves are rejected instead of silently replaced', () => {
        expect(() => validateGarden({ version: 2 })).toThrow();
        const s = initialGarden(now, rng());
        s.coins = NaN;
        expect(() => validateGarden(s)).toThrow();
    });
});
