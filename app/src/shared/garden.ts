/** Garden demo contract. No Electron or existing game dependencies. */
export const SPECIES = {
    lotus: { name: '莲花', minutes: 8, price: 65, kg: 0.6 },
    strawberry: { name: '草莓', minutes: 3, price: 30, kg: 0.2 },
    sunflower: { name: '向日葵', minutes: 5, price: 45, kg: 0.4 },
} as const;
export type Species = keyof typeof SPECIES;
export const TRAITS = {
    shiny: { name: '闪亮', category: 'accessory', tier: 'blue', level: 1, chance: .08, multiplier: 1.5 },
    purple: { name: '异色·紫色', category: 'body', tier: 'purple', level: 1, chance: .13, multiplier: 2 },
    giant: { name: '巨大化', category: 'body', tier: 'gold', level: 1, chance: .09, multiplier: 2.5 },
    twin: { name: '双生', category: 'body', tier: 'purple', level: 1, chance: .1, multiplier: 1.8 },
    golden: { name: '鎏金', category: 'body', tier: 'gold', level: 2, chance: .06, multiplier: 3 },
    rainbow: { name: '虹彩', category: 'body', tier: 'rainbow', level: 3, chance: .035, multiplier: 5 },
    mint: { name: '薄荷', category: 'body', tier: 'blue', level: 1, chance: .08, multiplier: 1.4 },
    coral: { name: '珊瑚', category: 'body', tier: 'blue', level: 1, chance: .08, multiplier: 1.4 },
    punk: { name: '朋克', category: 'accessory', tier: 'purple', level: 1, chance: .08, multiplier: 1.8 },
    classical: { name: '古典', category: 'accessory', tier: 'purple', level: 1, chance: .08, multiplier: 1.8 },
    firefly: { name: '萤火', category: 'accessory', tier: 'blue', level: 1, chance: .08, multiplier: 1.4 },
    petals: { name: '花雨', category: 'accessory', tier: 'blue', level: 1, chance: .08, multiplier: 1.4 },
} as const;
export type Trait = keyof typeof TRAITS;
export type Tier = 'normal' | 'blue' | 'purple' | 'gold' | 'rainbow';
export const TIER_NAMES: Record<Tier, string> = { normal: '普通', blue: '蓝色 · 精良', purple: '紫色 · 稀有', gold: '金色 · 史诗', rainbow: '彩色 · 传奇' };
export const FERTILIZERS = { speed: { name: '加速肥料', description: '剩余生长时间减半' }, mutation: { name: '变异肥料', description: '额外一次词条变异机会' }, weight: { name: '增重肥料', description: '最终重量增加 50%' } } as const;
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
    id: string;
    species: Species;
    traits: Trait[];
    kg: number;
    value: number;
    bred: boolean;
}
export interface Plant extends Produce {
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
export type GardenCommand = {
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
    const order: Tier[] = ['normal', 'blue', 'purple', 'gold', 'rainbow'];
    return traits.reduce<Tier>((a, t) => order.indexOf(TRAITS[t].tier) > order.indexOf(a) ? TRAITS[t].tier : a, 'normal');
}
export function growth(p: Plant, now = Date.now()): number { return Math.max(0, Math.min(1, (now - p.plantedAt) / Math.max(1, p.readyAt - p.plantedAt))); }
