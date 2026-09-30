import type { Species, Trait } from './garden';
import { dailyRandom } from './garden-life';
import { V3_WEATHER, type V3Weather } from './garden-v3';

/** Runtime tuning for the social garden. Simulation currency never represents a payment. */
export const CROPS: Record<Species, { cost:number; sale:number; minutes:number }> = {
  strawberry:{cost:6,sale:30,minutes:30},sunflower:{cost:12,sale:55,minutes:60},
  lotus:{cost:12,sale:55,minutes:60},tulip:{cost:12,sale:55,minutes:60},
  pineapple:{cost:36,sale:150,minutes:240},apple:{cost:54,sale:220,minutes:480},
  carrot:{cost:3,sale:12,minutes:10},tomato:{cost:8,sale:36,minutes:30},blueberry:{cost:14,sale:60,minutes:60},
};
export const BREED_OILS = {
  normal:{name:'普通精油',price:35,single:.25,double:.30,pity:10,size:.20,cap:3},
  rich:{name:'浓缩精油',price:80,single:.40,double:.50,pity:5,size:.30,cap:4},
} as const;
export const FURNITURE_SHOP = [
  {id:'moss-stool',name:'苔绒小凳',price:120,tier:'common'},
  {id:'sprout-lamp',name:'铃兰落地灯',price:360,tier:'common'},
  {id:'potting-shelf',name:'花匠置物架',price:4000,tier:'rare'},
  {id:'fern-bench',name:'蕨叶双人椅',price:6000,tier:'rare'},
  {id:'moon-terrarium',name:'月光玻璃庭院',price:9000,tier:'epic'},
  {id:'cloud-fountain',name:'云朵叠泉',price:9000,tier:'epic'},
] as const;
export const RETIRED_FURNITURE=['lantern','plant','fan','clock','teapot','painting','calligraphy','shelf','window','screen','kyoto-lantern','kyoto-screen','paris-painting','paris-clock','island-plant','island-window'];
export type CapsuleTier='common'|'rare'|'epic';
export interface CapsuleReward {id:string;kind:'seed'|'fertilizer'|'furniture'|'appearance';item:string;name:string;count:number;tier:CapsuleTier;weight:number;duplicateTokens?:number}
/** Weights are conditional within a tier; every tier sums to 100. */
export const CAPSULE_POOL:CapsuleReward[]=[
 {id:'strawberry-pack',kind:'seed',item:'strawberry',name:'草莓种子',count:3,tier:'common',weight:25},
 {id:'flower-pack',kind:'seed',item:'tulip',name:'郁金香种子',count:2,tier:'common',weight:20},
 {id:'berry-pack',kind:'seed',item:'blueberry',name:'蓝莓种子',count:2,tier:'common',weight:15},
 {id:'speed-pack',kind:'fertilizer',item:'speed',name:'初级加速肥',count:3,tier:'common',weight:30},
 {id:'moss-stool',kind:'furniture',item:'moss-stool',name:'苔绒小凳',count:1,tier:'common',weight:10},
 {id:'apple-pack',kind:'seed',item:'apple',name:'苹果种子',count:2,tier:'rare',weight:20},
 {id:'pineapple-pack',kind:'seed',item:'pineapple',name:'菠萝种子',count:3,tier:'rare',weight:20},
 {id:'speed3-pack',kind:'fertilizer',item:'speed3',name:'高级加速肥',count:2,tier:'rare',weight:20},
 {id:'petal-steps',kind:'appearance',item:'petal-steps',name:'步生花',count:1,tier:'rare',weight:10},
 {id:'sprout-lamp',kind:'furniture',item:'sprout-lamp',name:'铃兰落地灯',count:1,tier:'rare',weight:15},
 {id:'potting-shelf',kind:'furniture',item:'potting-shelf',name:'花匠置物架',count:1,tier:'rare',weight:8},
 {id:'fern-bench',kind:'furniture',item:'fern-bench',name:'蕨叶双人椅',count:1,tier:'rare',weight:7},
 {id:'moon-terrarium',kind:'furniture',item:'moon-terrarium',name:'月光玻璃庭院',count:1,tier:'epic',weight:40},
 {id:'cloud-fountain',kind:'furniture',item:'cloud-fountain',name:'云朵叠泉',count:1,tier:'epic',weight:40},
 {id:'eclipse-portal',kind:'appearance',item:'eclipse-portal',name:'月蚀之门',count:1,tier:'epic',weight:20},
];
/** Older servers have not yet enabled appearances; display their actual historical odds. */
export const LEGACY_CAPSULE_POOL:CapsuleReward[]=CAPSULE_POOL.filter(x=>x.kind!=='appearance').map(x=>({...x,weight:x.id==='speed3-pack'?30:x.tier==='epic'?50:x.weight}));
export function furnitureOffers(owner:string,day:number) {
  const rand=dailyRandom(`furniture-v4:${owner}:${day}`);
  const basic=FURNITURE_SHOP.filter(x=>x.tier==='common');
  if(rand()>=.08)return [...basic];
  const r=rand(),pool=FURNITURE_SHOP.filter(x=>x.price===(r<.6?4000:r<.9?6000:9000));
  return [...basic,pool[Math.floor(rand()*pool.length)]];
}
export const CAPSULE = {cost:60,rarePity:10,epicPity:20,weights:[.70,.25,.05],topUp:300} as const;
export const SOCIAL_TRIPS = {
  kyoto:{name:'京都',cost:120,minutes:120,seed:'lotus' as Species},
  paris:{name:'巴黎',cost:220,minutes:180,seed:'tulip' as Species},
  island:{name:'海岛',cost:300,minutes:240,seed:'pineapple' as Species},
};
export type TripCity=keyof typeof SOCIAL_TRIPS;
export const REGIONAL_FURNITURE = [
  {id:'kyoto-sprout',name:'京都·晨露铃兰',base:'sprout-lamp',city:'kyoto',trips:3,tint:'hue-rotate(340deg)'},
  {id:'kyoto-moon',name:'京都·月庭',base:'moon-terrarium',city:'kyoto',trips:6,tint:'hue-rotate(340deg)'},
  {id:'paris-moss',name:'巴黎·花园绒凳',base:'moss-stool',city:'paris',trips:3,tint:'hue-rotate(20deg)'},
  {id:'paris-fern',name:'巴黎·午后长椅',base:'fern-bench',city:'paris',trips:6,tint:'hue-rotate(20deg)'},
  {id:'island-shelf',name:'海岛·繁花架',base:'potting-shelf',city:'island',trips:3,tint:'hue-rotate(30deg)'},
  {id:'island-cloud',name:'海岛·听潮叠泉',base:'cloud-fountain',city:'island',trips:6,tint:'hue-rotate(30deg)'},
] as const;
export interface SocialTrip {id:string;city:TripCity;actors:string[];startedAt:number;readyAt:number;tutorial:boolean}
export interface SocialWish {id:string;kind:'harvest'|'visit'|'furniture'|'breed'|'feed';target?:string;label:string;createdAt:number;done:boolean}
export interface SharedWeather {id:string;kind:V3Weather;start:number;end:number;source:string;room:string;acceptedAt:number}
export interface SocialEconomy {
  appearances?:import('./appearances').AppearanceInventory;
  capsuleRevision?:2;lastCapsule?:{id:string;at:number;rewards:CapsuleReward[]};
  version:4; furniture:Record<string,number>; day:number; purchases:Record<string,number>; rareBought:number;
  furnitureReservation?:{owner:string;item:string;price:number;expiresAt:number};
  tokens:number; topUpDay:number; rareMisses:number; epicMisses:number; draws:number;
  tutorial:{claimed:boolean;sped:boolean;fertilizer:number;seed?:string;parent?:string;bred:boolean;friendRefreshUsed?:boolean};
  wishDay:number; wishClaims:string[]; wishBaseline:Record<string,number>;
  wishes?:SocialWish[];wishRerolls?:number;wishPeer?:{id:string;name:string};
  notifications:{id:string;at:number;text:string;read:boolean}[];
  weather?:SharedWeather; weatherHistory:SharedWeather[]; weatherSwitchAt:number;
  travel?:{week:number;starts:number;tutorialDone:boolean;counts:Partial<Record<TripCity,number>>;active?:SocialTrip;history:(SocialTrip&{claimedAt:number})[]};
}
export type SocialCommand =
  {type:'buyAppearance';item:string} | {type:'equipAppearance';item:string;actor:string|null} |
  {type:'socialStarter'} | {type:'tutorialSpeed';plot:number} |
  {type:'buyFurniture';owner:string;item:string} | {type:'reserveFurniture';owner:string;item:string} | {type:'capsuleTopUp'} | {type:'capsuleDraw';count:1|10} |
  {type:'socialWish';kind:'harvest'|'visit'|'furniture'|'breed'|'feed'} | {type:'readMutations'} |
  {type:'rerollSocialWish';id:string} |
  {type:'shareWeather';source:string} | {type:'leaveWeather'} |
  {type:'tripStart';city:TripCity;actors:string[];tutorial?:boolean} | {type:'tripClaim';id:string};
export const WEATHER_CHECKS=[.2,.4,.6,.8] as const;
export const WEATHER_CHANCE = {R:[.08,.019,.001,0],SR:[.12,.05,.01,0],SSR:[.14,.12,.08,.01]} as const;
export function socialWeatherPool(kind:V3Weather):Trait[]{
  const blue:Partial<Record<V3Weather,Trait>>={aurora:'velvet',meteor:'mist',prismatic:'shiny',daylight:'sugar',starchart:'petals'};
  return [...V3_WEATHER[kind].pool,...(blue[kind]?[blue[kind]!]:[])] as Trait[];
}
export const SOCIAL_WISHES = {harvest:'想一起收获一株植物',visit:'想去朋友家玩',furniture:'想给房间添一件家具',breed:'想和你留下新的种子',feed:'想和你分享一颗水果'} as const;
export function nativeSocialWeather(now:number,owner:string) {
  const slot=Math.floor(now/1800000),rand=dailyRandom(`social-weather:${owner}:${slot}`),roll=rand();
  const rare=['aurora','meteor','prismatic','daylight','starchart'] as const;
  const seasonal=['breeze','rain','storm','snow','honeywind'] as const;
  // Personal fixed four-day guarantee; the random 2% draw is additional to it.
  const offset=Math.floor(dailyRandom(`weather-offset:${owner}`)()*96);
  const forced=((slot+offset)%96+96)%96===95;
  const kind:V3Weather=forced||roll<.02?rare[Math.floor(rand()*rare.length)]:roll<.10?seasonal[Math.floor(rand()*seasonal.length)]:'sunny';
  return {id:`social-weather:${owner}:${slot}`,kind,start:slot*1800000,end:(slot+1)*1800000,source:owner};
}
