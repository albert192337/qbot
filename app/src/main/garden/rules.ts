import { SPECIES, TRAITS, FERTILIZERS, level, type Species, type Trait, type GardenState, type GardenCommand, type GardenReveal, type Seed, type Produce } from '../../shared/garden';
export interface Random {
    random(): number;
    id(): string;
}
const species = Object.keys(SPECIES) as Species[];
export const REFRESH_MS = 5 * 60000;
export const DISCOVERY_POINTS = 20;
export function refreshShop(s: GardenState, now: number, rng: Random): void {
    if (now < s.shop.refreshAt)
        return;
    const seeds = [...species].sort();
    // Fisher–Yates: random comparator sorting is biased and engine-dependent.
    for (let i = seeds.length - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
    }
    s.shop = { refreshAt: now + REFRESH_MS, offers: [
            ...seeds.slice(0, 2).map(item => ({ id: rng.id(), kind: 'seed' as const, item, price: SPECIES[item].price, stock: 1 + Math.floor(rng.random() * 3) })),
            ...Object.keys(FERTILIZERS).filter(() => rng.random() < .7).map(item => ({ id: rng.id(), kind: 'fertilizer' as const, item: item as keyof typeof FERTILIZERS, price: 45, stock: 1 + Math.floor(rng.random() * 2) })),
        ] };
}
export function initialGarden(now: number, rng: Random): GardenState {
    const s: GardenState = { version: 1, coins: 180, plots: Array(6).fill(null), seeds: species.flatMap(sp => [0, 1].map(() => ({ id: rng.id(), species: sp, genes: [], bred: false }))), produce: [], fertilizers: { speed: 2, mutation: 2, weight: 2 }, discovered: [], claimed: [], xp: { lotus: 0, strawberry: 0, sunflower: 0 }, shop: { refreshAt: 0, offers: [] } };
    refreshShop(s, now, rng);
    return s;
}
export function value(p: Pick<Produce, 'species' | 'kg' | 'traits'>): number {
    return Math.round(SPECIES[p.species].price * 2 * p.kg / SPECIES[p.species].kg * p.traits.reduce((m, t) => m * TRAITS[t].multiplier, 1));
}
function rollTraits(s: GardenState, sp: Species, rng: Random, boost = 1): Trait[] {
    return (Object.keys(TRAITS) as Trait[]).filter(t => TRAITS[t].level <= level(s.xp[sp]) && rng.random() < TRAITS[t].chance * boost);
}
export function transition(input: GardenState, cmd: GardenCommand, now: number, rng: Random): {
    state: GardenState;
    reveal?: GardenReveal;
    points?: number;
    boxes?: number;
} {
    const s = structuredClone(input);
    refreshShop(s, now, rng);
    let reveal: GardenReveal | undefined, points: number | undefined, boxes: number | undefined;
    const plot = (index: number) => { if (!Number.isInteger(index) || index < 0 || index >= 6)
        throw Error('土地不存在'); return s.plots[index]; };
    const parent = (id: string) => s.produce.find(p => p.id === id) ?? s.plots.find(p => p?.id === id && p.readyAt <= now);
    switch (cmd.type) {
        case 'plant': {
            if (plot(cmd.plot))
                throw Error('先收获这块土地');
            const i = s.seeds.findIndex(x => x.id === cmd.seed);
            if (i < 0)
                throw Error('种子已用完');
            const seed = s.seeds.splice(i, 1)[0];
            const traits = [...new Set([...seed.genes, ...rollTraits(s, seed.species, rng)])];
            const kg = Math.round(SPECIES[seed.species].kg * (.65 + rng.random() * 1.7) * (traits.includes('giant') ? 4 : 1) * 1000) / 1000;
            const p = { id: rng.id(), species: seed.species, traits, kg, value: 0, bred: false, plantedAt: now, readyAt: now + SPECIES[seed.species].minutes * 60000, fertilizers: [] };
            p.value = value(p);
            s.plots[cmd.plot] = p;
            break;
        }
        case 'fertilize': {
            const p = plot(cmd.plot);
            if (!p || p.readyAt <= now)
                throw Error('只有生长中的植物可以施肥');
            if (!Object.hasOwn(FERTILIZERS, cmd.fertilizer) || !(s.fertilizers[cmd.fertilizer] > 0))
                throw Error('肥料不足');
            if (p.fertilizers.includes(cmd.fertilizer))
                throw Error('每株每种肥料只能使用一次');
            s.fertilizers[cmd.fertilizer]--;
            p.fertilizers.push(cmd.fertilizer);
            if (cmd.fertilizer === 'speed')
                p.readyAt = now + (p.readyAt - now) / 2;
            if (cmd.fertilizer === 'weight')
                p.kg = Math.round(p.kg * 1.5 * 1000) / 1000;
            if (cmd.fertilizer === 'mutation') {
                const wasGiant = p.traits.includes('giant');
                p.traits = [...new Set([...p.traits, ...rollTraits(s, p.species, rng, 1.5)])];
                if (!wasGiant && p.traits.includes('giant'))
                    p.kg *= 4;
            }
            p.value = value(p);
            break;
        }
        case 'harvest': {
            const p = plot(cmd.plot);
            if (!p || p.readyAt > now)
                throw Error('还没有成熟');
            const item: Produce = { id: p.id, species: p.species, traits: p.traits, kg: p.kg, value: p.value, bred: p.bred };
            s.produce.push(item);
            s.plots[cmd.plot] = null;
            for (const factor of ['base', ...p.traits]) {
                const key = `${p.species}:${factor}`;
                if (!s.discovered.includes(key))
                    s.discovered.push(key);
            }
            reveal = { title: '收获了！', produce: item };
            break;
        }
        case 'breed': {
            if (cmd.first === cmd.second)
                throw Error('需要两株不同植物');
            const a = parent(cmd.first), b = parent(cmd.second);
            if (!a || !b || a.bred || b.bred)
                throw Error('亲本未成熟或已繁育过');
            const genes = [...new Set([...a.traits, ...b.traits])].filter(() => rng.random() < .5);
            const seed: Seed = { id: rng.id(), species: rng.random() < .5 ? a.species : b.species, genes, bred: true, parents: [a.species, b.species] };
            a.bred = b.bred = true;
            s.seeds.push(seed);
            reveal = { title: '新生命诞生！', seed };
            break;
        }
        case 'sell': {
            const i = s.produce.findIndex(p => p.id === cmd.id);
            if (i < 0)
                throw Error('产物已经售出');
            s.coins += s.produce.splice(i, 1)[0].value;
            break;
        }
        case 'buy': {
            const o = s.shop.offers.find(x => x.id === cmd.offer);
            if (!o || o.stock <= 0)
                throw Error('商品已售罄或已刷新');
            if (s.coins < o.price)
                throw Error('花园币不足');
            s.coins -= o.price;
            o.stock--;
            if (o.kind === 'seed')
                s.seeds.push({ id: rng.id(), species: o.item as Species, genes: [], bred: false });
            else
                s.fertilizers[o.item as keyof typeof FERTILIZERS]++;
            break;
        }
        case 'claim': {
            const keys = s.discovered.filter(k => !s.claimed.includes(k));
            if (!keys.length)
                throw Error('没有待领取的图鉴积分');
            points = keys.length * DISCOVERY_POINTS;
            for (const key of keys)
                s.xp[key.split(':')[0] as Species] += DISCOVERY_POINTS;
            s.claimed.push(...keys);
            reveal = { title: '收集的快乐！', message: `领取 ${points} 积分，各物种同时获得图鉴经验。` };
            break;
        }
        case 'box': {
            points = -500;
            boxes = -1;
            const sp = species[Math.floor(rng.random() * species.length)];
            const f = (Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[])[Math.floor(rng.random() * 3)];
            s.seeds.push({ id: rng.id(), species: sp, genes: [], bred: false });
            s.fertilizers[f]++;
            reveal = { title: '花园补给到了！', message: `${SPECIES[sp].name}种子 ×1 · ${FERTILIZERS[f].name} ×1` };
            break;
        }
        case 'mature':
            for (const p of s.plots)
                if (p)
                    p.readyAt = Math.min(p.readyAt, now);
            break;
        default: throw Error('不支持的花园操作');
    }
    return { state: s, reveal, points, boxes };
}
/** Reject incompatible/corrupt saves and recover a backup instead of silently losing items. */
export function validateGarden(raw: unknown): GardenState {
    const s = raw as GardenState;
    const number = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
    const known = (sp: string) => Object.hasOwn(SPECIES, sp);
    const traits = (ts: Trait[]) => Array.isArray(ts) && ts.every(t => Object.hasOwn(TRAITS, t));
    const produce = (p: Produce) => p && typeof p.id === 'string' && known(p.species) && traits(p.traits) && number(p.kg) && number(p.value) && typeof p.bred === 'boolean';
    if (!s || s.version !== 1 || !number(s.coins) || !Array.isArray(s.plots) || s.plots.length !== 6 ||
        !s.plots.every(p => p === null || (produce(p) && number(p.plantedAt) && number(p.readyAt) && Array.isArray(p.fertilizers) && p.fertilizers.every(f => Object.hasOwn(FERTILIZERS, f)))) ||
        !Array.isArray(s.seeds) || !s.seeds.every(p => p && typeof p.id === 'string' && known(p.species) && traits(p.genes) && typeof p.bred === 'boolean') ||
        !Array.isArray(s.produce) || !s.produce.every(produce) || !s.fertilizers || !Object.keys(FERTILIZERS).every(k => number(s.fertilizers[k as keyof typeof FERTILIZERS])) ||
        !s.xp || !species.every(sp => number(s.xp[sp])) || !Array.isArray(s.discovered) || !Array.isArray(s.claimed) ||
        ![...s.discovered, ...s.claimed].every(k => typeof k === 'string' && known(k.split(':')[0]) && (k.split(':')[1] === 'base' || Object.hasOwn(TRAITS, k.split(':')[1]))) ||
        !s.shop || !number(s.shop.refreshAt) || !Array.isArray(s.shop.offers) || !s.shop.offers.every(o => o && typeof o.id === 'string' && number(o.stock) && number(o.price) && (o.kind === 'seed' ? known(o.item) : o.kind === 'fertilizer' && Object.hasOwn(FERTILIZERS, o.item))))
        throw Error('花园存档格式不兼容或已损坏');
    return s;
}
