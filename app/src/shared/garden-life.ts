import { SPECIES, TRAITS, needsReveal, traitSlot, type Species, type Trait, type Produce, type GardenState } from './garden';
import {V3_WEATHER,AFFINITIES} from './garden-v3';

export const DAY_MS = 86400000;
// Up to 8 participants at 360 work/second. Qualified participants receive seeds;
// the chance of a seed carrying a crop trait rises from 18% to 27% with participation.
export const COOP_RULES={work:64800,speed:360,maxPlayers:8,leaseMs:15000,minSeconds:20,minContribution:.02,dailyRewards:5} as const;
export const coopRareChance=(participants:number)=>.18+.09*(Math.max(1,Math.min(8,participants))-1)/7;
/** 04:00 Asia/Shanghai. Persisted day keys never move backwards. */
export const gardenDay = (now: number) => Math.floor((now + 4 * 3600000) / DAY_MS);
export const nextGardenDay = (day: number) => (day + 1) * DAY_MS - 4 * 3600000;
export const CHARACTER_XP = [0, 20, 60, 120, 200, 300, 440, 620, 840, 1100] as const;
export const characterLevel = (xp: number) => CHARACTER_XP.filter(x => xp >= x).length;
export const CHARACTER_UNLOCKS = [{level:3,kind:'flower',name:'送花'}, {level:5,kind:'photo',name:'并排合影'}, {level:8,kind:'relay',name:'表情接力'}, {level:10,kind:'celebrate',name:'共同庆祝'}] as const;
export const FRUITS: Species[] = ['strawberry','tomato','blueberry','pineapple','apple'];
export const FOOD_ICONS: Record<Species,string> = {lotus:'🪷',strawberry:'🍓',sunflower:'🌻',carrot:'🥕',tomato:'🍅',blueberry:'🫐',pineapple:'🍍',apple:'🍎',tulip:'🌷'};
export const DYE_COLORS = {cream:{name:'奶油',hue:35},mint:{name:'薄荷绿',hue:105},pink:{name:'樱粉',hue:320},lilac:{name:'淡紫',hue:260},ocean:{name:'海蓝',hue:180}} as const;
export type Dye = keyof typeof DYE_COLORS;
export const SPRAYS = {
  color:{name:'色彩喷雾',price:90,description:'随机染成一种颜色 · 不增加词条或售价',pool:[] as Trait[]},
  fruit:{name:'果实喷雾',price:150,description:'果实槽随机获得一个词条',pool:['sugar','fragrant','juicy','twin','honey','nectar','milky','softcore','delicate','abundant','starcore','nebula','glassheart','galaxycore'] as Trait[]},
  material:{name:'材质喷雾',price:180,description:'果皮槽随机获得一个词条',pool:['mint','coral','velvet','purple','frost','dew','striped','celadon','wax','pearl','nightdye','golden','jade','crystal','amber','redgold','silver','obsidian','rainbow','prism','iridescent','daylight'] as Trait[]},
  charm:{name:'挂饰喷雾',price:180,description:'挂饰槽随机获得一个词条',pool:['shiny','firefly','petals','mist','raindrop','leafwhistle','punk','classical','breezy','flowerknot','butterfly','snowbell','thunder','moon','glowring','goldbell','stardust','halo','meteorRing','dreambutterfly'] as Trait[]},
  moon:{name:'月夜喷雾',price:260,description:'月夜主题随机词条',pool:['nightdye','moon','stardust'] as Trait[]},
} as const;
export type SprayKind = keyof typeof SPRAYS;
export function traitSource(t:Trait):string {
  if(traitSlot(t)==='size')return '最终重量派生 / 增重肥 / 重量鉴定'+(t==='mini'?'':' / 体型遗传');
  const sources:string[]=(Object.keys(SPRAYS) as SprayKind[]).filter(k=>SPRAYS[k].pool.includes(t)).map(k=>SPRAYS[k].name);
  for(const w of Object.values(V3_WEATHER))if((w.pool as readonly Trait[]).includes(t))sources.unshift(w.name);
  const species=Object.entries(AFFINITIES).filter(([,pool])=>pool.includes(t)).map(([sp])=>SPECIES[sp as Species].name);
  if(species.length)sources.push(species.join('、')+'亲和');sources.push('杂交遗传');
  return sources.join(' / ');
}
export function sprayPool(kind: SprayKind): {trait?:Trait; dye?:Dye; weight:number}[] {
  if(kind==='color') return (Object.keys(DYE_COLORS) as Dye[]).map(dye=>({dye,weight:1}));
  return SPRAYS[kind].pool.map(trait=>({trait,weight:({blue:60,purple:30,gold:9,rainbow:1,normal:60,green:60})[TRAITS[trait].tier]}));
}
export interface DailyOffer {id:string; kind:'seed'|'spray'; item:Species|SprayKind; price:number; limit:number}
export interface FoodWish {id:string; species:Species; traits:Trait[]; xp:number; done:boolean}
export interface CharacterGrowth {xp:number; day:number; wishes:FoodWish[]; rerolled:boolean}
export interface SprayCandidate {id:string; target:string; trait?:Trait; dye?:Dye; kind:SprayKind}
export interface GardenLife {
  owner:string; day:number; supplyDay?:number; sprays:Partial<Record<SprayKind,number>>; purchases:Record<string,number>; rareBought:number;
  characters:Record<string,CharacterGrowth>; pending?:SprayCandidate;
  visibility:'private'|'friends'|'public';
  shopVisibility?:'private'|'friends'|'public';
}
export type LifeCommand = {type:'buyDaily'; owner:string; offer:string} | {type:'spray'; target:string; kind:SprayKind} | {type:'resolveSpray'; id:string; replace?:Trait; accept:boolean} | {type:'feed'; wish:string; produce:string; actor?:string} | {type:'rerollWish'; wish:string} | {type:'gardenVisibility'; visibility:GardenLife['visibility'];scope?:'shop'|'land'};
/** Stable non-secret sampling for published shop offers and daily requests. */
export function dailyRandom(key:string):()=>number {
  let s=2166136261;for(const c of key)s=Math.imul(s^c.charCodeAt(0),16777619);
  return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function dailyOffers(owner:string,day:number):DailyOffer[] {
  const random=dailyRandom(`shop-v1:${owner}:${day}`);
  const kinds=(Object.keys(SPRAYS) as SprayKind[]).map(k=>({k,r:random()})).sort((a,b)=>a.r-b.r).slice(0,2).map(x=>x.k);
  const seeds=(Object.keys(SPECIES) as Species[]).map(k=>({k,r:random()})).sort((a,b)=>a.r-b.r).slice(0,3).map(x=>x.k);
  return [...kinds.map(k=>({id:`${day}:spray:${k}`,kind:'spray' as const,item:k,price:SPRAYS[k].price,limit:1})),...seeds.map(k=>({id:`${day}:seed:${k}`,kind:'seed' as const,item:k,price:SPECIES[k].price,limit:3}))];
}
export function wishMatches(w:FoodWish,p:Produce):boolean {return !w.done&&!p.locked&&!needsReveal(p)&&p.species===w.species&&w.traits.every(t=>p.traits.includes(t));}
export function wishLabel(w:FoodWish):string {return `${SPECIES[w.species].name} ×1${w.traits.length?' · '+w.traits.map(t=>TRAITS[t].name).join('＋'):''}`;}
export function currentGrowth(s:GardenState):CharacterGrowth|undefined {return s.activeActor?s.life?.characters[s.activeActor]:undefined;}
export interface GardenVisit {companion?:boolean;friend?:boolean;plotCount?:number;owner:string;name:string;plots:GardenState['plots'];offers:DailyOffer[];day:number;visibility:GardenLife['visibility'];actorLevel:number;actorName?:string;landOpen?:boolean;shopOpen?:boolean;rewardsLeft?:number;tasks?:CoopTask[]}
export interface CoopTask {workBudget?:number;id:string;owner:string;plant:string;plot:number;remaining:number;updatedAt:number;members:Record<string,{work:number;seconds:number;seenAt:number}>;done:boolean;claimed:string[];shared?:boolean;invited?:string[];room?:string;fruit?:import('./garden').Plant}
