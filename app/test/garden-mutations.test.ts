import { describe, expect, it } from 'vitest';
import { initialGarden, rollTraits, transition, validateGarden, value } from '../src/main/garden/rules';
import { TRAITS, level } from '../src/shared/garden';

describe('stacked elemental garden mutations', () => {
    it('rolls frost and thunder independently, with no music bonus', () => {
        const rng = { random: () => .8, id: () => 'seed' };
        const state = initialGarden(100, rng);
        const sample = (music: boolean) => {
            let seed = 42, frost = 0, thunder = 0, both = 0;
            const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
            for (let i = 0; i < 30000; i++) {
                const ts = rollTraits(state, 'lotus', { ...rng, random }, 1, music);
                if (ts.includes('frost')) frost++;
                if (ts.includes('thunder')) thunder++;
                if (ts.includes('frost') && ts.includes('thunder')) both++;
            }
            return { frost, thunder, both };
        };
        const quiet = sample(false);
        expect(quiet.frost / 30000).toBeCloseTo(.0045, 3);
        expect(quiet.thunder / 30000).toBeCloseTo(.0025, 3);
        expect(quiet.both).toBeLessThan(4);
        expect(rollTraits(state, 'lotus', { ...rng, random: () => .002 })).toEqual(expect.arrayContaining(['frost', 'thunder']));
        expect(sample(true)).toEqual(quiet);
    });
    it('keeps ordinary seeds mostly native at every level, including music and all fertilizer grades', () => {
        let seed = 42;
        const rng = { id: () => 'distribution', random: () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; } };
        const state = initialGarden(100, rng);
        const samples = 30000;
        for (const xp of [0, 80, 960]) for (const music of [false, true]) {
            state.xp.lotus = xp;
            let previousNative = 1;
            for (const boost of [0, 1.5, 2, 3]) {
                let native = 0, multiple = 0;
                for (let i = 0; i < samples; i++) {
                    const traits = new Set(rollTraits(state, 'lotus', rng, 1, music));
                    if (boost) for (const t of rollTraits(state, 'lotus', rng, boost, music)) traits.add(t);
                    if (!traits.size) native++;
                    if (traits.size >= 2) multiple++;
                }
                const fraction = native / samples;
                const eligible=Object.values(TRAITS).filter(t=>t.level<=level(xp));
                const expected=eligible.reduce((product,t)=>{const chance=t.chance*(music&&['朋克','古典'].includes(t.name)?3:1);return product*(1-chance)*(boost?1-chance*boost:1);},1);
                expect(Math.abs(fraction-expected)).toBeLessThan(.015);
                expect(fraction).toBeLessThan(previousNative);
                expect(multiple/samples).toBeLessThan(.18);
                previousNative = fraction;
            }
        }
    });
    it('retains stacked genes through save, harvest, discovery and breeding without rerolling the harvested item', () => {
        let id = 0;
        const rng = { random: () => .99, id: () => `mutation-${id++}` };
        let state = initialGarden(100, rng);
        state.seeds[0].genes = ['frost', 'thunder', 'rainbow', 'shiny', 'twin'];
        state = transition(state, { type: 'plant', plot: 0, seed: state.seeds[0].id }, 100, rng).state;
        const plant = structuredClone(state.plots[0]!);
        state = validateGarden(JSON.parse(JSON.stringify(state)));
        state = transition(state,{type:'cultivate',plot:0},plant.readyAt,rng).state;
        state = transition(state,{type:'revealPlant',plot:0},plant.readyAt+180000,rng).state;
        const result = transition(state, { type: 'harvest', plot: 0 }, plant.readyAt+180000, rng);
        const item = result.reveal!.produce!;
        expect(item.traits).toEqual(plant.traits);
        expect(item.value).toBe(plant.value);
        expect(item.value).toBe(value(item));
        expect(result.state.discovered).toEqual(expect.arrayContaining(['lotus:frost', 'lotus:thunder']));
        result.state.seeds[0].genes=['golden'];
        state = transition(result.state, { type: 'plant', plot: 1, seed: result.state.seeds[0].id }, 100, rng).state;
        state = transition(state, { type: 'mature' }, 100, rng).state;
        const child = transition(state, { type: 'breed', first: item.id, second: state.plots[1]!.id }, 100, { ...rng, random: () => 0 });
        expect(child.reveal!.seed!.genes).toEqual(expect.arrayContaining(['frost', 'thunder']));
        expect(validateGarden(JSON.parse(JSON.stringify(child.state))).produce[0].traits).toEqual(plant.traits);
        expect(TRAITS.frost.multiplier * TRAITS.thunder.multiplier).toBe(5);
    });
});
