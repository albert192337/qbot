import { travelTransition, validateTravel } from '../../shared/travel';
import { SPECIES, TRAITS, FERTILIZERS, level, HARVEST_XP, CULTIVATION_MS, needsReveal, canBreed, cultivationRemaining, mutationMultiplier, type Species, type Trait, type GardenState, type GardenCommand, type GardenReveal, type Seed, type Produce, type Plant, type Fertilizer } from '../../shared/garden';
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
    const appleRequired = (s.journey?.earned ?? 0) >= 240 && !s.journey?.appleBought;
    s.shop = { refreshAt: now + REFRESH_MS, offers: [
        ...[...species].sort((a,b)=>SPECIES[a].price-SPECIES[b].price).map(item => ({ id: rng.id(), kind: 'seed' as const, item, price: SPECIES[item].price,
            stock: (item === 'apple' && appleRequired) || rng.random() < SPECIES[item].chance ? 1 + Math.floor(rng.random() * (SPECIES[item].chance >= .65 ? 5 : 2)) : 0 })),
        ...(Object.keys(FERTILIZERS) as Fertilizer[]).map(item => ({ id: rng.id(), kind: 'fertilizer' as const, item, price: FERTILIZERS[item].price,
            stock: rng.random() < FERTILIZERS[item].chance ? 1 + Math.floor(rng.random() * (FERTILIZERS[item].grade === 1 ? 3 : 1)) : 0 })),
    ] };
}
export function initialGarden(now: number, rng: Random): GardenState {
    const s: GardenState = { version: 1, weatherCheckedAt: now, coins: 180, plots: Array(6).fill(null), seeds: (['lotus', 'strawberry', 'sunflower'] as Species[]).flatMap(sp => [0, 1].map(() => ({ id: rng.id(), species: sp, genes: [], bred: false }))), produce: [], fertilizers: Object.fromEntries(Object.keys(FERTILIZERS).map(f => [f, FERTILIZERS[f as Fertilizer].grade === 1 ? 2 : 0])) as GardenState['fertilizers'], discovered: [], claimed: [], xp: Object.fromEntries(species.map(sp => [sp, 0])) as GardenState['xp'], journey: { bought: 0, planted: 0, harvested: 0, earned: 0, appleBought: 0 }, boxMisses: 0, shop: { refreshAt: 0, offers: [] } };
    refreshShop(s, now, rng);
    return s;
}
export function value(p: Pick<Produce, 'species' | 'kg' | 'traits' | 'yieldCount' | 'growthVersion'>): number {
    return Math.round(SPECIES[p.species].price * 2 / (p.yieldCount ?? SPECIES[p.species].harvests) * p.kg / SPECIES[p.species].kg * (p.growthVersion === 2 ? mutationMultiplier(p.traits) : p.traits.reduce((m, t) => m * TRAITS[t].multiplier, 1)));
}
export function rollTraits(s: GardenState, sp: Species, rng: Random, boost = 1, musicPlaying = false): Trait[] {
    return (Object.keys(TRAITS) as Trait[]).filter(t => TRAITS[t].level <= level(s.xp[sp]) && rng.random() < Math.min(1, TRAITS[t].chance * boost * (musicPlaying && (t === 'punk' || t === 'classical') ? 3 : 1)));
}
export function transition(input: GardenState, cmd: GardenCommand, now: number, rng: Random, context: { musicPlaying?: boolean } = {}): {
    state: GardenState;
    reveal?: GardenReveal;
    points?: number;
    boxes?: number;
} {
    const s = validateGarden(structuredClone(input));
    const j = s.journey!;
    refreshShop(s, now, rng);
    let reveal: GardenReveal | undefined, points: number | undefined, boxes: number | undefined;
    const plot = (index: number) => { if (!Number.isInteger(index) || index < 0 || index >= 6)
        throw Error('土地不存在'); return s.plots[index]; };
    const parent = (id: string) => s.produce.find(p => p.id === id) ?? s.plots.find(p => p?.id === id && p.readyAt <= now);
    switch (cmd.type) {
        case 'travelExperience': case 'travelNext': case 'travelLike': case 'travelMomentLike': case 'travelRehearsalLike':
            travelTransition(s, cmd, now); break;
        case 'buyMany': {
            if (!Array.isArray(cmd.items) || !cmd.items.length || cmd.items.length > 100 || new Set(cmd.items.map(x => x.offer)).size !== cmd.items.length) throw Error('请选择商品');
            let cost = 0;
            for (const item of cmd.items) {
                const offer = s.shop.offers.find(o => o.id === item.offer);
                if (!offer || !Number.isSafeInteger(item.count) || item.count < 1 || item.count > offer.stock) throw Error('库存不足或商店已刷新');
                cost += offer.price * item.count;
            }
            if (cost > s.coins) throw Error('花园币不足');
            let next = s;
            for (const item of cmd.items) for (let i = 0; i < item.count; i++) next = transition(next, { type: 'buy', offer: item.offer }, now, rng, context).state;
            return { state: next };
        }
        case 'sellMany': {
            if (!Array.isArray(cmd.ids) || !cmd.ids.length || new Set(cmd.ids).size !== cmd.ids.length || cmd.ids.some(id => !s.produce.some(p => p.id === id && !p.locked))) throw Error('请选择未收藏的收获');
            let next = s;
            for (const id of cmd.ids) next = transition(next, { type: 'sell', id }, now, rng, context).state;
            return { state: next };
        }
        case 'plantMany': {
            const seed = s.seeds.find(x => x.id === cmd.seed);
            if (!seed) throw Error('种子已用完');
            const same = (x: Seed) => x.species === seed.species && x.bred === seed.bred && JSON.stringify([...x.genes].sort()) === JSON.stringify([...seed.genes].sort()) && JSON.stringify(x.parents) === JSON.stringify(seed.parents);
            const available = s.seeds.filter(same);
            let next = s, count = 0;
            for (let i = 0; i < s.plots.length && count < available.length; i++) if (!s.plots[i]) next = transition(next, { type: 'plant', plot: i, seed: available[count++].id }, now, rng, context).state;
            if (!count) throw Error('没有空地');
            return { state: next };
        }
        case 'harvestMany': {
            let next = s; const harvests: Produce[] = [];
            for (let i = 0; i < s.plots.length; i++) if (s.plots[i] && s.plots[i]!.readyAt <= now && !s.plots[i]!.keep && !needsReveal(s.plots[i]!)) {
                const result = transition(next, { type: 'harvest', plot: i }, now, rng, context);
                next = result.state; harvests.push(result.reveal!.produce!);
            }
            if (!harvests.length) throw Error('没有可采摘的植物');
            const best = [...harvests].sort((a,b) => b.value-a.value)[0];
            return { state: next, reveal: { title: `收获 ${harvests.length} 份`, produce: best, harvests, message: `合计 ◉ ${harvests.reduce((v,p)=>v+p.value,0)}` } };
        }
        case 'keep': {
            const p = plot(cmd.plot); if (!p) throw Error('土地是空的'); p.keep = !p.keep; break;
        }
        case 'lock': {
            const p = s.produce.find(p => p.id === cmd.id); if (!p) throw Error('收获不存在'); p.locked = !p.locked; break;
        }
        case 'plant': {
            if (plot(cmd.plot))
                throw Error('先收获这块土地');
            const i = s.seeds.findIndex(x => x.id === cmd.seed);
            if (i < 0)
                throw Error('种子已用完');
            const seed = s.seeds.splice(i, 1)[0];
            const traits = [...new Set([...seed.genes, ...rollTraits(s, seed.species, rng, 1, context.musicPlaying)])];
            const kg = Math.round(SPECIES[seed.species].kg * (.65 + rng.random() * 1.7) * (traits.includes('giant') ? 4 : 1) * 1000) / 1000;
            const p: Plant = { growthVersion: 2, id: rng.id(), species: seed.species, traits, kg, value: 0, bred: false, plantedAt: now, readyAt: now + SPECIES[seed.species].minutes * 60000 * (1 - .03 * (level(s.xp[seed.species])-1)), fertilizers: [], baseTraits: traits.filter(t => TRAITS[t].category === 'body'), harvestsLeft: SPECIES[seed.species].harvests, harvestIndex: 0 };
            p.yieldCount = SPECIES[seed.species].harvests;
            p.value = value(p);
            s.plots[cmd.plot] = p;
            j.planted++;
            break;
        }
        case 'fertilize': {
            const p = plot(cmd.plot);
            if (!p || p.readyAt <= now)
                throw Error('只有生长中的植物可以施肥');
            if (!Object.hasOwn(FERTILIZERS, cmd.fertilizer) || !(s.fertilizers[cmd.fertilizer] > 0))
                throw Error('肥料不足');
            if (p.fertilizers.length)
                throw Error('每株一生只能施肥一次');
            s.fertilizers[cmd.fertilizer]--;
            p.fertilizers.push(cmd.fertilizer);
            const fertilizer = FERTILIZERS[cmd.fertilizer];
            if (fertilizer.effect === 'speed')
                p.readyAt = now + (p.readyAt - now) * (1 - fertilizer.strength);
            if (fertilizer.effect === 'weight')
                p.kg = Math.round(p.kg * fertilizer.strength * 1000) / 1000;
            if (fertilizer.effect === 'mutation') {
                const wasGiant = p.traits.includes('giant');
                p.traits = [...new Set([...p.traits, ...rollTraits(s, p.species, rng, fertilizer.strength, context.musicPlaying)])];
                if (!wasGiant && p.traits.includes('giant'))
                    p.kg *= 4;
            }
            p.value = value(p);
            break;
        }
        case 'cultivate': {
            const p = plot(cmd.plot);
            if (!p || p.readyAt > now || !needsReveal(p)) throw Error('只有成熟的彩色问号果实需要培育');
            if (s.plots.some(x => x?.cultivation?.startedAt !== undefined)) throw Error('角色正在照料另一株植物');
            p.cultivation = { remainingMs: p.cultivation?.remainingMs ?? CULTIVATION_MS, startedAt: now };
            break;
        }
        case 'pauseCultivation': {
            const p = plot(cmd.plot);
            if (p?.cultivation?.startedAt !== undefined) p.cultivation = { remainingMs: cultivationRemaining(p,now) };
            break;
        }
        case 'revealPlant': {
            const p = plot(cmd.plot);
            if (!p || !needsReveal(p) || p.cultivation?.startedAt === undefined || cultivationRemaining(p,now) > 0) throw Error('请先完成培育读条');
            p.revealed = true; delete p.cultivation;
            reveal = { title: '惊喜揭晓！', produce: { ...p }, message: '果实仍留在地里，可以收获或与背包金色以上果实繁育。' };
            break;
        }
        case 'harvest': {
            const p = plot(cmd.plot);
            if (!p || p.readyAt > now)
                throw Error('还没有成熟');
            if (needsReveal(p)) throw Error('彩色果实需要先培育揭晓');
            const item: Produce = { growthVersion: p.growthVersion, revealed: p.revealed, id: p.id, species: p.species, traits: p.traits, kg: p.kg, value: p.value, bred: p.bred, yieldCount: p.yieldCount };
            s.produce.push(item);
            if ((p.harvestsLeft ?? 1) > 1) {
                const next = nextBatch(s, p, now, rng, !!context.musicPlaying);
                // Every harvest has its own identity; a regrowing plant cannot alias a stored fruit.
                s.plots[cmd.plot] = next;
            } else s.plots[cmd.plot] = null;
            j.harvested++;
            s.xp[p.species] += HARVEST_XP;
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
            if (!a || !b || !canBreed(a) || !canBreed(b)) throw Error('双方需要已揭晓、未繁育过的金色或彩色果实');
            if (!((s.plots.some(p=>p?.id===a.id) && s.produce.some(p=>p.id===b.id)) || (s.plots.some(p=>p?.id===b.id) && s.produce.some(p=>p.id===a.id)))) throw Error('请选择一株地里的植物与一颗背包果实');
            const genes = [...new Set([...a.traits, ...b.traits])].filter(t => rng.random() < (a.traits.includes(t) && b.traits.includes(t) ? .8 : .4));
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
            if (s.produce[i].locked) throw Error('请先取消收藏');
            const amount = s.produce.splice(i, 1)[0].value;
            s.coins += amount; j.earned += amount;
            // The next mainline purchase must not be blocked behind a random shop roll.
            if (j.earned >= 240 && !j.appleBought) {
                const apple = s.shop.offers.find(o => o.kind === 'seed' && o.item === 'apple');
                if (apple && !apple.stock) apple.stock = 1;
                else if (!apple) s.shop.offers.push({ id: rng.id(), kind: 'seed', item: 'apple', price: SPECIES.apple.price, stock: 1 });
            }
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
            if (o.kind === 'seed') {
                s.seeds.push({ id: rng.id(), species: o.item as Species, genes: [], bred: false });
                j.bought++; if (o.item === 'apple') j.appleBought++;
            }
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
            const roll = rng.random();
            const grade = roll < .01 ? 4 : roll < .1 || s.boxMisses! >= 19 ? 3 : roll < .35 ? 2 : 1;
            s.boxMisses = grade >= 3 ? 0 : s.boxMisses! + 1;
            const pool: Species[] = grade >= 3 ? ['pineapple', 'apple'] : grade === 2 ? ['lotus', 'blueberry', 'tomato'] : ['strawberry', 'sunflower', 'carrot', 'tulip'];
            const sp = pool[Math.floor(rng.random() * pool.length)];
            const keys = (Object.keys(FERTILIZERS) as Fertilizer[]).filter(f => FERTILIZERS[f].grade === Math.min(3, grade));
            const f = keys[Math.floor(rng.random() * keys.length)];
            const count = grade === 1 ? 1 + Math.floor(rng.random() * 2) : 1;
            for (let i=0;i<count;i++) s.seeds.push({ id: rng.id(), species: sp, genes: grade === 4 ? ['golden'] : [], bred: false });
            s.fertilizers[f]++;
            const seedName = `${grade === 4 ? '鎏金·' : ''}${SPECIES[sp].name}种子`;
            reveal = { title: grade >= 3 ? '发现珍稀补给！' : '花园补给到了！', message: `${seedName} ×${count} · ${FERTILIZERS[f].name} ×1`, items: [
                {kind:'seed',id:sp,name:seedName,count},
                {kind:'fertilizer',id:f,name:FERTILIZERS[f].name,count:1},
            ] };
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
    if (s && s.version === 1) {
        if (s.xp && typeof s.xp === 'object') for (const sp of species) if (!(sp in s.xp) && !['lotus','strawberry','sunflower'].includes(sp)) s.xp[sp] = 0;
        if (s.fertilizers && typeof s.fertilizers === 'object') for (const f of Object.keys(FERTILIZERS) as Fertilizer[]) if (!(f in s.fertilizers) && FERTILIZERS[f].grade > 1) s.fertilizers[f] = 0;
        if (s.boxMisses === undefined) s.boxMisses = 0;
        if (s.journey === undefined) s.journey = { bought: 0, planted: Array.isArray(s.plots) ? s.plots.filter(Boolean).length : 0, harvested: Array.isArray(s.produce) ? s.produce.length : 0, earned: 0, appleBought: 0 };
        if (Array.isArray(s.plots)) for (const p of s.plots) if (p && Array.isArray(p.traits)) {
            if (p.baseTraits === undefined) p.baseTraits = p.traits.filter(t => TRAITS[t]?.category === 'body');
            // Existing crops retain their promised harvest rather than multiplying existing assets.
            if (p.harvestsLeft === undefined) { p.harvestsLeft = 1; p.yieldCount ??= 1; }
            if (p.harvestIndex === undefined) p.harvestIndex = 0;
        }
    }
    const number = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
    const known = (sp: string) => Object.hasOwn(SPECIES, sp);
    const traits = (ts: Trait[]) => Array.isArray(ts) && ts.every(t => Object.hasOwn(TRAITS, t));
    const produce = (p: Produce) => p && typeof p.id === 'string' && known(p.species) && traits(p.traits) && number(p.kg) && number(p.value) && typeof p.bred === 'boolean' && (p.growthVersion === undefined || p.growthVersion === 2) && (p.revealed === undefined || typeof p.revealed === 'boolean') && (p.cultivation === undefined || (p.cultivation && number(p.cultivation.remainingMs) && p.cultivation.remainingMs <= CULTIVATION_MS && (p.cultivation.startedAt === undefined || number(p.cultivation.startedAt)))) && (p.locked === undefined || typeof p.locked === 'boolean') && (p.yieldCount === undefined || Number.isInteger(p.yieldCount) && p.yieldCount >= 1 && p.yieldCount <= 3);
    if (!s || s.version !== 1 || !number(s.boxMisses) || !s.journey || !['bought','planted','harvested','earned','appleBought'].every(k => number(s.journey![k as keyof NonNullable<GardenState['journey']>])) || !number(s.coins) || !Array.isArray(s.plots) || s.plots.length !== 6 ||
        !s.plots.every(p => p === null || (produce(p) && number(p.plantedAt) && number(p.readyAt) && traits(p.baseTraits!) && Number.isSafeInteger(p.harvestsLeft) && p.harvestsLeft! >= 1 && p.harvestsLeft! <= SPECIES[p.species].harvests && Number.isSafeInteger(p.harvestIndex) && p.harvestIndex! >= 0 && (p.keep === undefined || typeof p.keep === 'boolean') && Array.isArray(p.fertilizers) && p.fertilizers.every(f => Object.hasOwn(FERTILIZERS, f)))) ||
        !Array.isArray(s.seeds) || !s.seeds.every(p => p && typeof p.id === 'string' && known(p.species) && traits(p.genes) && typeof p.bred === 'boolean') ||
        !Array.isArray(s.produce) || !s.produce.every(produce) || !s.fertilizers || !Object.keys(FERTILIZERS).every(k => number(s.fertilizers[k as keyof typeof FERTILIZERS])) ||
        !s.xp || !species.every(sp => number(s.xp[sp])) || !Array.isArray(s.discovered) || !Array.isArray(s.claimed) ||
        ![...s.discovered, ...s.claimed].every(k => typeof k === 'string' && known(k.split(':')[0]) && (k.split(':')[1] === 'base' || Object.hasOwn(TRAITS, k.split(':')[1]))) ||
        !s.shop || !number(s.shop.refreshAt) || !Array.isArray(s.shop.offers) || !s.shop.offers.every(o => o && typeof o.id === 'string' && number(o.stock) && number(o.price) && (o.kind === 'seed' ? known(o.item) : o.kind === 'fertilizer' && Object.hasOwn(FERTILIZERS, o.item))))
        throw Error('花园存档格式不兼容或已损坏');
    if(s.weatherCheckedAt!==undefined&&!number(s.weatherCheckedAt))throw Error('天气记录无效');
    if(s.weatherGuarantees!==undefined&&(!s.weatherGuarantees||typeof s.weatherGuarantees!=='object'||Array.isArray(s.weatherGuarantees)||!Object.values(s.weatherGuarantees).every(r=>r&&number(r.end)&&Array.isArray(r.winners)&&r.winners.every(id=>typeof id==='string')&&new Set(r.winners).size===r.winners.length&&(r.evaluated===undefined||(Array.isArray(r.evaluated)&&r.evaluated.every(id=>typeof id==='string'))))))throw Error('天气保底记录无效');
    if(s.testWeather){const e=s.testWeather;if(!Array.isArray(e.evaluated)||!e.evaluated.every(id=>typeof id==='string')||typeof e.id!=='string'||!e.id.startsWith('weather-test:')||!['meteor','aurora'].includes(e.kind)||![e.start,e.end,e.checkedAt].every(number)||e.end<=e.start||e.checkedAt<e.start-1||e.checkedAt>e.end)throw Error('测试天气记录无效');}
    if (s.travel !== undefined) validateTravel(s.travel);
    if(s.journalEvents!==undefined&&(!Array.isArray(s.journalEvents)||s.journalEvents.some(e=>!e||!Number.isFinite(e.at)||typeof e.actor!=='string'||typeof e.summary!=='string')))throw Error('花园记录已损坏');
    return s;
}

function nextBatch(s: GardenState, p: Plant, now: number, rng: Random, music: boolean): Plant {
    const fertilizer = p.fertilizers[0] ? FERTILIZERS[p.fertilizers[0]] : undefined;
    let traits = [...new Set([...p.baseTraits!, ...rollTraits(s, p.species, rng, 1, music)])];
    if (fertilizer?.effect === 'mutation') traits = [...new Set([...traits, ...rollTraits(s,p.species,rng,fertilizer.strength,music)])];
    const kg = Math.round(SPECIES[p.species].kg * (.65+rng.random()*1.7) * (traits.includes('giant')?4:1) * (fertilizer?.effect === 'weight' ? fertilizer.strength : 1) * 1000)/1000;
    const duration = SPECIES[p.species].minutes * 60000 * (p.growthVersion === 2 ? 1-.03*(level(s.xp[p.species])-1) : 1) * (fertilizer?.effect === 'speed' ? 1-fertilizer.strength : 1);
    const next: Plant = { ...p, revealed: undefined, cultivation: undefined, id: rng.id(), traits, kg, value: 0, plantedAt: now, readyAt: now+duration, harvestsLeft: p.harvestsLeft!-1, harvestIndex: p.harvestIndex!+1 };
    next.value = value(next); return next;
}
