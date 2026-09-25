import type { TravelState, TravelCommand } from './travel';
import {qualityOf,speciesLevel} from './garden-v3';
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
export function sowingMinutes(species:Species,state?:GardenState):number {
    return SPECIES[species].minutes * (state?.v3 ? 1-.01*(speciesLevel(state.xp[species])-1) : state ? 1-.03*(level(state.xp[species])-1) : 1);
}
export function growthLabel(species: Species,state?:GardenState): string {
    const minutes=Number(sowingMinutes(species,state).toFixed(2)),harvests=SPECIES[species].harvests;
    return `${minutes} 分钟成熟${harvests>1?` / 轮 · 可采 ${harvests} 次`:''}`;
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
    dew: { name: '凝露', category: 'body', tier: 'purple', level: 2, chance: .006, multiplier: 1.6 },
    striped: { name: '斑纹', category: 'body', tier: 'purple', level: 2, chance: .006, multiplier: 1.6 },
    honey: { name: '蜜心', category: 'body', tier: 'purple', level: 3, chance: .005, multiplier: 1.8 },
    breezy: { name: '风铃', category: 'accessory', tier: 'purple', level: 3, chance: .005, multiplier: 1.8 },
    jade: { name: '玉润', category: 'body', tier: 'gold', level: 4, chance: .003, multiplier: 2.8 },
    crystal: { name: '晶透', category: 'body', tier: 'gold', level: 4, chance: .003, multiplier: 2.8 },
    moon: { name: '月华', category: 'accessory', tier: 'gold', level: 5, chance: .0025, multiplier: 3 },
    amber: { name: '琥珀', category: 'body', tier: 'gold', level: 5, chance: .0025, multiplier: 3 },
    stardust: { name: '星尘', category: 'accessory', tier: 'rainbow', level: 6, chance: .001, multiplier: 4.5 },
    prism: { name: '棱光', category: 'body', tier: 'rainbow', level: 6, chance: .001, multiplier: 4.5 },
    nebula: { name: '星云', category: 'body', tier: 'rainbow', level: 7, chance: .0008, multiplier: 5 },
    halo: { name: '天光冠', category: 'accessory', tier: 'rainbow', level: 8, chance: .0006, multiplier: 5 },
    sugar: {name:'糖心',category:'body',tier:'blue',level:1,chance:0,multiplier:1.4},
    fragrant: {name:'清香',category:'body',tier:'blue',level:1,chance:0,multiplier:1.4},
    juicy: {name:'多汁',category:'body',tier:'blue',level:1,chance:0,multiplier:1.4},
    nectar: {name:'饱蜜',category:'body',tier:'purple',level:2,chance:0,multiplier:1.8},
    milky: {name:'奶香',category:'body',tier:'purple',level:2,chance:0,multiplier:1.8},
    softcore: {name:'糯心',category:'body',tier:'purple',level:3,chance:0,multiplier:1.8},
    delicate: {name:'玲珑',category:'body',tier:'gold',level:4,chance:0,multiplier:2.8},
    abundant: {name:'丰穗',category:'body',tier:'gold',level:4,chance:0,multiplier:2.8},
    starcore: {name:'星瓤',category:'body',tier:'gold',level:5,chance:0,multiplier:3},
    glassheart: {name:'琉璃心',category:'body',tier:'rainbow',level:7,chance:0,multiplier:5},
    galaxycore: {name:'星河芯',category:'body',tier:'rainbow',level:8,chance:0,multiplier:5},
    velvet: {name:'绒霜',category:'body',tier:'blue',level:1,chance:0,multiplier:1.4},
    celadon: {name:'青瓷',category:'body',tier:'purple',level:2,chance:0,multiplier:1.8},
    wax: {name:'蜜蜡',category:'body',tier:'purple',level:3,chance:0,multiplier:1.8},
    pearl: {name:'珠光',category:'body',tier:'purple',level:3,chance:0,multiplier:1.8},
    nightdye: {name:'夜染',category:'body',tier:'purple',level:3,chance:0,multiplier:1.8},
    redgold: {name:'赤金',category:'body',tier:'gold',level:4,chance:0,multiplier:3},
    silver: {name:'秘银',category:'body',tier:'gold',level:5,chance:0,multiplier:3},
    obsidian: {name:'曜石',category:'body',tier:'gold',level:5,chance:0,multiplier:3},
    iridescent: {name:'幻彩',category:'body',tier:'rainbow',level:7,chance:0,multiplier:5},
    daylight: {name:'极昼',category:'body',tier:'rainbow',level:8,chance:0,multiplier:5},
    mist: {name:'晨雾',category:'accessory',tier:'blue',level:1,chance:0,multiplier:1.4},
    raindrop: {name:'雨珠',category:'accessory',tier:'blue',level:1,chance:0,multiplier:1.4},
    leafwhistle: {name:'叶哨',category:'accessory',tier:'blue',level:1,chance:0,multiplier:1.4},
    flowerknot: {name:'花结',category:'accessory',tier:'purple',level:2,chance:0,multiplier:1.8},
    butterfly: {name:'蝶舞',category:'accessory',tier:'purple',level:3,chance:0,multiplier:1.8},
    snowbell: {name:'雪铃',category:'accessory',tier:'purple',level:3,chance:0,multiplier:1.8},
    glowring: {name:'流萤',category:'accessory',tier:'gold',level:5,chance:0,multiplier:3},
    goldbell: {name:'金铃',category:'accessory',tier:'gold',level:5,chance:0,multiplier:3},
    meteorRing: {name:'流星环',category:'accessory',tier:'rainbow',level:7,chance:0,multiplier:5},
    dreambutterfly: {name:'幻蝶',category:'accessory',tier:'rainbow',level:8,chance:0,multiplier:5},
    mini: {name:'迷你',category:'body',tier:'blue',level:1,chance:0,multiplier:1},
    plump: {name:'饱满',category:'body',tier:'purple',level:1,chance:0,multiplier:1},
    large: {name:'大型',category:'body',tier:'gold',level:1,chance:0,multiplier:1},
} as const;
export type Trait = keyof typeof TRAITS;
export type Tier = 'normal' | 'green' | 'blue' | 'purple' | 'gold' | 'rainbow';
export const TIER_NAMES: Record<Tier, string> = { normal: '普通', green: '优良', blue: '精品', purple: '紫色', gold: '金色', rainbow: '彩色' };
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
    speed4:{name:'特级加速',description:'本轮剩余时间减少 50%',effect:'speed',strength:.5,grade:4,price:45,chance:.05},
    mutation4:{name:'特级变异',description:'幼苗变异强度 +1.29',effect:'mutation',strength:1.29,grade:4,price:70,chance:.05},
    weight4:{name:'特级增重',description:'最终重量倍率 +0.8～1.2',effect:'weight',strength:1.2,grade:4,price:55,chance:.05},
} as const;
export type Fertilizer = keyof typeof FERTILIZERS;
export interface Seed {
    slots?:import('./garden-v3').GeneSlots;
    massGene?:Trait;
    lineage?:import('./garden-v3').Lineage;
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
    dye?: import('./garden-life').Dye;
    growthVersion?: 2|3;
    slots?:import('./garden-v3').GeneSlots;
    lineage?:import('./garden-v3').Lineage;
    appraised?:boolean;
    publicQuality?:import('./garden-v3').FactorQuality;
    revealed?: boolean;
    cultivation?: { remainingMs: number; startedAt?: number };
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
    legacyLevel?:number;
    batch?:import('./garden-v3').BatchV3;
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
    cultivationVisit?: {owner:string;plot:number};
    rehearsal?: { members: {id:string;name:string}[] };
    cooperationRewardsLeft?:number;
    v3?:import('./garden-v3').GardenV3;
    life?: import('./garden-life').GardenLife;
    activeActor?: string;
    online?: boolean;
    cooperations?: import('./garden-life').CoopTask[];
    journalEvents?: {at:number;actor:string;summary:string}[];
    weatherCheckedAt?: number;
    weatherGuarantees?: Record<string,{end:number;winners:string[];evaluated?:string[]}>;
    testWeather?: import('./garden-weather').WeatherEvent & {checkedAt:number; evaluated:string[]};
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
export type GardenCommand = import('./garden-v3').V3Command | import('./garden-life').LifeCommand | TravelCommand | { type: 'cultivate' | 'pauseCultivation' | 'revealPlant'; plot: number } | {
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
    oil?:'normal'|'rich';
    firstGenes?:Trait[];
    secondGenes?:Trait[];
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
    interact(target:string,kind:import('./pair-interaction').PairKind):Promise<void>;
    answerInteraction(id:string,accept:boolean,response?:'happy'|'heart'|'wave'):Promise<void>;
    onInteraction(cb:(event:{kind:string;caption:string;effect:string})=>void):()=>void;
    online(enable: boolean): Promise<void>;
    visit(owner: string,preview?:boolean,task?:string): Promise<import('./garden-life').GardenVisit>;
    cooperate(owner: string, plot: number, action: 'join'|'leave'|'claim'|'share'|'invite', target?:string, task?:string): Promise<import('./garden-life').GardenVisit>;
    saveRehearsal(request: import('./travel').RehearsalRequest): Promise<import('./travel').JournalResult<import('./travel').TravelRehearsal>>;
    journalStatus(): Promise<import('./travel').JournalStatus>;
    rewriteDiary(request: import('./travel').DiaryRequest): Promise<import('./travel').JournalResult<import('./travel').TravelDiary>>;
    generateMoment(requestId: string): Promise<import('./travel').JournalResult<import('./travel').DailyMoment>>;
    weather(): Promise<import('./garden-weather').GardenWeatherStatus>;
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
        performer?: {left:number;right:number;top:number;bottom:number};
        top?: number;
        side?: 'left' | 'right';
        left: number;
        right: number;
        bottom: number;
    }) => void): () => void;
    onChanged(cb: () => void): () => void;
    onPage(cb: (page: string) => void): () => void;
}
/** QBot project design, not original-game values. */
export const LEVEL_XP = [0, 40, 80, 160, 280, 440, 660, 960] as const;
export const CULTIVATION_MS = 180_000;
export const HARVEST_XP = 10;
export function level(xp: number): number { return Math.max(1, LEVEL_XP.filter(n => xp >= n).length); }
export const SLOT_NAMES = { fruit: '果实', skin: '果皮', accessory: '挂饰', size:'体型' } as const;
export function traitSlot(t: Trait): keyof typeof SLOT_NAMES {
    if ((['giant','mini','plump','large'] as Trait[]).includes(t)) return 'size';
    if (TRAITS[t].category === 'accessory') return 'accessory';
    return (['twin', 'honey', 'nebula','sugar','fragrant','juicy','nectar','milky','softcore','delicate','abundant','starcore','glassheart','galaxycore'] as Trait[]).includes(t) ? 'fruit' : 'skin';
}
export function fruitQuality(ts: Trait[],p?:Pick<Produce,'growthVersion'|'traits'|'species'|'kg'|'publicQuality'>): 'normal' | 'blue' | 'purple' | 'gold' | 'rainbow' {
    if(p?.publicQuality)return p.publicQuality;
    if(p?.growthVersion===3)return qualityOf(p);
    const t = tier(ts); return t === 'blue' || t === 'green' ? 'normal' : t;
}
export function needsReveal(p: Produce): boolean { return (p.growthVersion === 2||p.growthVersion===3) && !p.revealed && fruitQuality(p.traits,p) === 'rainbow'; }
export function canBreed(p: Produce): boolean { return !p.bred && !p.locked && !needsReveal(p) && ['gold','rainbow'].includes(fruitQuality(p.traits,p)); }
export function cultivationRemaining(p: Produce, now: number): number {
    const c = p.cultivation; return c ? Math.max(0, c.remainingMs - (c.startedAt === undefined ? 0 : Math.max(0,now-c.startedAt))) : p.growthVersion===3?180000:CULTIVATION_MS;
}
export function mutationMultiplier(ts: Trait[]): number {
    return Math.min(15, 1 + [...new Set(ts)].reduce((sum,t)=>sum+TRAITS[t].multiplier-1,0));
}
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
