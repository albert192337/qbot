import type { TravelState, TravelCommand } from './travel';
/** Garden demo contract. No Electron or existing game dependencies. */
export const SPECIES = {
    lotus: { name: '莲花', minutes: 60, price: 65, kg: .6, harvests: 1, rarity: 'blue', chance: .5 },
    strawberry: { name: '草莓', minutes: 30, price: 30, kg: .2, harvests: 3, rarity: 'normal', chance: 1 },
    sunflower: { name: '向日葵', minutes: 15, price: 45, kg: .4, harvests: 1, rarity: 'green', chance: .8 },
    carrot: { name: '胡萝卜', minutes: 5, price: 12, kg: .15, harvests: 1, rarity: 'normal', chance: 1 },
    tomato: { name: '番茄', minutes: 30, price: 70, kg: .3, harvests: 3, rarity: 'green', chance: .65 },
    blueberry: { name: '蓝莓', minutes: 60, price: 110, kg: .15, harvests: 3, rarity: 'blue', chance: .4 },
    pineapple: { name: '菠萝', minutes: 240, price: 180, kg: 1.2, harvests: 3, rarity: 'purple', chance: .2 },
    apple: { name: '苹果', minutes: 480, price: 240, kg: .4, harvests: 3, rarity: 'gold', chance: .12 },
    tulip: { name: '郁金香', minutes: 60, price: 55, kg: .25, harvests: 1, rarity: 'green', chance: .7 },
} as const;
export type Species = keyof typeof SPECIES;
/** Unfertilized duration of each harvest; shared by shop and seed picker. */
export function growthLabel(species: Species): string {
    const { minutes, harvests } = SPECIES[species];
    const duration = minutes >= 60 ? `${minutes / 60} 小时` : `${minutes} 分钟`;
    return harvests > 1 ? `${duration} / 轮 · 可采 ${harvests} 次` : `${duration} 成熟`;
}
export const TRAITS = {
    shiny: { name: '闪亮', category: 'accessory', tier: 'blue', level: 1, chance: .008, multiplier: 1.5 },
    purple: { name: '异色·紫色', category: 'body', tier: 'purple', level: 1, chance: .013, multiplier: 2 },
    giant: { name: '巨大化', category: 'body', tier: 'gold', level: 1, chance: .009, multiplier: 2.5 },
    twin: { name: '双生', category: 'body', tier: 'purple', level: 1, chance: .01, multiplier: 1.8 },
    golden: { name: '鎏金', category: 'body', tier: 'gold', level: 2, chance: .006, multiplier: 3 },
    rainbow: { name: '虹彩', category: 'body', tier: 'rainbow', level: 3, chance: .0035, multiplier: 5 },
    mint: { name: '薄荷', category: 'body', tier: 'blue', level: 1, chance: .008, multiplier: 1.4 },
    coral: { name: '珊瑚', category: 'body', tier: 'blue', level: 1, chance: .008, multiplier: 1.4 },
    punk: { name: '朋克', category: 'accessory', tier: 'purple', level: 1, chance: .008, multiplier: 1.8 },
    classical: { name: '古典', category: 'accessory', tier: 'purple', level: 1, chance: .008, multiplier: 1.8 },
    firefly: { name: '萤火', category: 'accessory', tier: 'blue', level: 1, chance: .008, multiplier: 1.4 },
    petals: { name: '花雨', category: 'accessory', tier: 'blue', level: 1, chance: .008, multiplier: 1.4 },
    frost: { name: '冰冻', category: 'body', tier: 'purple', level: 1, chance: .0045, multiplier: 2 },
    thunder: { name: '雷击', category: 'accessory', tier: 'gold', level: 1, chance: .0025, multiplier: 2.5 },
} as const;
export type Trait = keyof typeof TRAITS;
export type Tier = 'normal' | 'green' | 'blue' | 'purple' | 'gold' | 'rainbow';
export const TIER_NAMES: Record<Tier, string> = { normal: '普通', green: '优良', blue: '精品', purple: '稀有', gold: '非凡', rainbow: '至臻' };
export const FERTILIZERS = {
    speed: { name: '初级加速', description: '生长时间减少 50%', effect: 'speed', strength: .5, grade: 1, price: 25, chance: .85 },
    mutation: { name: '初级变异', description: '每批果实额外一次变异机会', effect: 'mutation', strength: 1.5, grade: 1, price: 35, chance: .8 },
    weight: { name: '初级增重', description: '每批果实重量增加 50%', effect: 'weight', strength: 1.5, grade: 1, price: 30, chance: .85 },
    speed2: { name: '中级加速', description: '生长时间减少 65%', effect: 'speed', strength: .65, grade: 2, price: 75, chance: .35 },
    mutation2: { name: '中级变异', description: '每批果实获得更高变异机会', effect: 'mutation', strength: 2, grade: 2, price: 100, chance: .3 },
    weight2: { name: '中级增重', description: '每批果实重量增加 80%', effect: 'weight', strength: 1.8, grade: 2, price: 85, chance: .35 },
    speed3: { name: '高级加速', description: '生长时间减少 80%', effect: 'speed', strength: .8, grade: 3, price: 180, chance: .1 },
    mutation3: { name: '高级变异', description: '每批果实获得最高变异机会', effect: 'mutation', strength: 3, grade: 3, price: 240, chance: .08 },
    weight3: { name: '高级增重', description: '每批果实重量增加 120%', effect: 'weight', strength: 2.2, grade: 3, price: 210, chance: .1 },
} as const;
export type Fertilizer = keyof typeof FERTILIZERS;
export interface Seed {
    id: string;
    species: Species;
    genes: Trait[];
    bred: boolean;
    parents?: [
        Species,
        Species
    ];
}
export interface Produce {
    locked?: boolean;
    yieldCount?: number;
    id: string;
    species: Species;
    traits: Trait[];
    kg: number;
    value: number;
    bred: boolean;
}
export interface Plant extends Produce {
    baseTraits?: Trait[];
    harvestsLeft?: number;
    harvestIndex?: number;
    keep?: boolean;
    plantedAt: number;
    readyAt: number;
    fertilizers: Fertilizer[];
}
export interface Offer {
    id: string;
    kind: 'seed' | 'fertilizer';
    item: Species | Fertilizer;
    price: number;
    stock: number;
}
export interface GardenState {
    travel?: TravelState;
    journey?: { bought: number; planted: number; harvested: number; earned: number; appleBought: number };
    boxMisses?: number;
    version: 1;
    coins: number;
    plots: (Plant | null)[];
    seeds: Seed[];
    produce: Produce[];
    fertilizers: Record<Fertilizer, number>;
    discovered: string[];
    claimed: string[];
    xp: Record<Species, number>;
    shop: {
        refreshAt: number;
        offers: Offer[];
    };
}
export type GardenCommand = TravelCommand | {
    type: 'buyMany'; items: { offer: string; count: number }[];
} | { type: 'sellMany'; ids: string[];
} | { type: 'plantMany'; seed: string;
} | { type: 'harvestMany';
} | { type: 'keep'; plot: number;
} | { type: 'lock'; id: string;
} | {
    type: 'plant';
    plot: number;
    seed: string;
} | {
    type: 'fertilize';
    plot: number;
    fertilizer: Fertilizer;
} | {
    type: 'harvest';
    plot: number;
} | {
    type: 'breed';
    first: string;
    second: string;
} | {
    type: 'sell';
    id: string;
} | {
    type: 'buy';
    offer: string;
} | {
    type: 'claim';
} | {
    type: 'mature';
} | {
    type: 'box';
};
export interface GardenReveal {
    items?: GardenRewardItem[];
    harvests?: Produce[];
    title: string;
    produce?: Produce;
    seed?: Seed;
    message?: string;
}
export interface GardenRewardItem { kind: 'seed' | 'fertilizer'; id: string; name: string; count: number }
export type GardenResult = {
    ok: true;
    state: GardenState;
    reveal?: GardenReveal;
} | {
    ok: false;
    error: string;
};
export interface GardenApi {
    closeTravel(): void;
    onSpeechBounds(cb: (bounds: { left: number; right: number; top: number; bottom: number } | null) => void): () => void;
    onPerformance(cb: (action: string | null) => void): () => void;
    cancelPerformance(restore?: boolean): void;
    get(): Promise<GardenState>;
    act(command: GardenCommand): Promise<GardenResult>;
    toggle(): void;
    open(page: string): void;
    ignoreMouse(ignore: boolean): void;
    onAnchor(cb: (anchor: {
        top?: number;
        side?: 'left' | 'right';
        left: number;
        right: number;
        bottom: number;
    }) => void): () => void;
    onChanged(cb: () => void): () => void;
    onPage(cb: (page: string) => void): () => void;
}
export function level(xp: number): number { return Math.min(3, 1 + Math.floor(xp / 40)); }
export function tier(traits: Trait[]): Tier {
    const order: Tier[] = ['normal', 'green', 'blue', 'purple', 'gold', 'rainbow'];
    return traits.reduce<Tier>((a, t) => order.indexOf(TRAITS[t].tier) > order.indexOf(a) ? TRAITS[t].tier : a, 'normal');
}
export function growth(p: Plant, now = Date.now()): number { return Math.max(0, Math.min(1, (now - p.plantedAt) / Math.max(1, p.readyAt - p.plantedAt))); }

export function gardenQuest(s: GardenState): { text: string; page: string } {
    const j = s.journey ?? { bought: 0, planted: 0, harvested: 0, earned: 0, appleBought: 0 };
    if (!j.bought) return { text: '购买一份种子（0/1）', page: 'shop' };
    if (!j.planted) return { text: '种下一株植物（0/1）', page: 'plots' };
    if (!j.harvested) return { text: '完成首次采摘（0/1）', page: 'plots' };
    if (j.earned < 240) return { text: `出售收获（${Math.floor(j.earned)}/240 币）`, page: 'bag' };
    if (!j.appleBought) return { text: '购买苹果种子（0/1）', page: 'shop' };
    const count = s.discovered.filter(k => k.endsWith(':base')).length;
    return { text: count < Object.keys(SPECIES).length ? `收集不同植物（${count}/${Object.keys(SPECIES).length}）` : '植物图鉴已集齐 · 去看看新的词条', page: 'book' };
}
