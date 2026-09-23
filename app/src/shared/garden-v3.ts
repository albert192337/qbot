import {SPECIES,TRAITS,FERTILIZERS,traitSlot,type Trait,type Species,type Produce,type Fertilizer,type GardenState} from './garden';
import {dailyRandom,gardenDay,traitSource} from './garden-life';

/** Original reference / project tuning are separate in docs/garden-v3-balance.md. */
export const V3={version:3,seedling:.8,lambda:1.1,affinity:.25,affinityMax:4,weatherPity:12,rainbowPity:32,cultivationMs:600000,weeklyBreeds:90,breedPity:9,hourIncome:24,dayXp:60} as const;
export const V3_XP=[0,20,50,100,170,260,380,540,740,1000] as const;
export function factorDefinition(id:Trait){const slot=traitSlot(id);return {id,name:TRAITS[id].name,slot,quality:TRAITS[id].tier,score:slot==='size'?0:FACTOR_SCORE[TRAITS[id].tier],source:traitSource(id),affinities:(Object.keys(AFFINITIES) as Species[]).filter(sp=>AFFINITIES[sp].includes(id)),conflicts:(Object.keys(TRAITS) as Trait[]).filter(other=>other!==id&&conflicts(id,other)),inheritance:slot==='size'?'independent-mass':'ordinary-slot',visual:{layer:slot==='fruit'?0:slot==='skin'?1:slot==='accessory'?2:3,effect:id},version:3,sourceStatus:'project-adaptation'};}
export const speciesLevel=(xp:number)=>Math.max(1,V3_XP.filter(n=>xp>=n).length);
export type FactorQuality='blue'|'purple'|'gold'|'rainbow';
export const FACTOR_SCORE:Record<string,number>={normal:0,green:0,blue:4,purple:12,gold:30,rainbow:60};
export const scoreOf=(p:Pick<Produce,'traits'|'kg'|'species'>)=>p.traits.reduce((sum,t)=>sum+(traitSlot(t)==='size'?0:FACTOR_SCORE[TRAITS[t].tier]),0)*p.kg/SPECIES[p.species].kg;
export function qualityOf(p:Pick<Produce,'traits'|'kg'|'species'>):FactorQuality {const score=scoreOf(p);return score>=150?'rainbow':score>=50?'gold':score>=25?'purple':'blue';}
export function sizeOf(ratio:number):Trait|undefined{return ratio<.6?'mini':ratio>=5?'giant':ratio>=3?'large':ratio>=1.5?'plump':undefined;}
export function withSize(ts:Trait[],ratio:number):Trait[]{const t=sizeOf(ratio);return [...ts.filter(t=>traitSlot(t)!=='size'),...(t?[t]:[])];}
export const conflicts=(a:Trait,b:Trait)=>[['firefly','glowring'],['breezy','snowbell','goldbell']].some(g=>g.includes(a)&&g.includes(b));
export function fits(ts:Trait[],t:Trait):boolean {const slot=traitSlot(t);return !ts.includes(t)&&!ts.some(x=>conflicts(x,t))&&ts.filter(x=>traitSlot(x)===slot).length<(slot==='accessory'?2:1);}
export function cappedTraits(ts:Trait[]):Trait[]{const out:Trait[]=[];for(const t of ts)if(fits(out,t))out.push(t);return out;}
export const AFFINITY_WEIGHTS:number[][]=[[94,5,1,0],[91,7,2,0],[88,9,3,0],[85,10,4,1],[82,12,4,2],[80,12,5,3],[78,13,5,4],[76,14,5,5],[74,15,6,5],[72,15,7,6]];
export const AFFINITIES:Record<Species,Trait[]>={
 strawberry:['sugar','fragrant','milky','honey','delicate','starcore','glassheart','dreambutterfly'],
 pineapple:['juicy','coral','honey','nectar','redgold','abundant','galaxycore','halo'],
 apple:['sugar','shiny','wax','striped','golden','amber','daylight','meteorRing'],
 blueberry:['mint','firefly','nightdye','dew','silver','moon','nebula','stardust'],
 tomato:['juicy','coral','twin','nectar','abundant','crystal','glassheart','prism'],
 carrot:['fragrant','leafwhistle','softcore','breezy','delicate','goldbell','galaxycore','halo'],
 lotus:['mist','raindrop','celadon','pearl','jade','moon','iridescent','dreambutterfly'],
 sunflower:['shiny','petals','flowerknot','milky','golden','amber','daylight','halo'],
 tulip:['velvet','petals','butterfly','classical','crystal','glowring','rainbow','meteorRing'],
};
export const V3_WEATHER={
 sunny:{name:'晴日',icon:'☀',grade:'R',pool:['sugar','juicy','shiny','honey','wax','golden','daylight'],mass:[0,.1]},
 breeze:{name:'花风',icon:'🍃',grade:'SR',pool:['fragrant','petals','breezy','flowerknot','delicate','halo'],mass:[.05,.2]},
 rain:{name:'甘霖',icon:'🌧',grade:'SR',pool:['raindrop','mint','dew','celadon','jade','glassheart'],mass:[.1,.35]},
 storm:{name:'雷暴',icon:'⚡',grade:'SR',pool:['shiny','mist','nightdye','purple','thunder','prism'],mass:[.1,.3]},
 snow:{name:'初雪',icon:'❄',grade:'SR',pool:['velvet','raindrop','frost','snowbell','silver','iridescent'],mass:[.05,.2]},
 honeywind:{name:'蜜风',icon:'🌼',grade:'SR',pool:['sugar','fragrant','nectar','milky','amber','galaxycore'],mass:[.15,.4]},
 meteor:{name:'流星夜',icon:'☄',grade:'SSR',pool:['breezy','pearl','moon','starcore','stardust','meteorRing'],mass:[.3,.8]},
 aurora:{name:'极光夜',icon:'🌌',grade:'SSR',pool:['frost','nightdye','crystal','silver','rainbow','iridescent'],mass:[.3,.9]},
 prismatic:{name:'幻光',icon:'🌈',grade:'SSR',pool:['purple','celadon','jade','crystal','prism','glassheart'],mass:[.3,.8]},
 daylight:{name:'极昼',icon:'🌅',grade:'SSR',pool:['milky','wax','golden','redgold','daylight','halo'],mass:[.35,.9]},
 starchart:{name:'星图',icon:'✨',grade:'SSR',pool:['butterfly','softcore','glowring','obsidian','nebula','galaxycore','dreambutterfly'],mass:[.4,1]},
} as const;
export type V3Weather=keyof typeof V3_WEATHER;
export interface Exposure {id:string;kind:V3Weather;start:number;end:number;ms:number}
export function hourlyWeather(hour:number,realm='garden'):V3Weather {
 const random=dailyRandom(`weather3:${realm}:${hour}`),sr=['breeze','rain','storm','snow','honeywind'] as const,ssr=['meteor','aurora','prismatic','daylight','starchart'] as const;
 // Persistent absolute-hour calendar: 12 ordinary hours then SSR, never rerolled by visits/restarts.
 if(((hour%13)+13)%13===12)return ssr[Math.floor(random()*ssr.length)];
 return random()<10/150?sr[Math.floor(random()*sr.length)]:'sunny';
}
export function exposures(from:number,to:number,realm:string):Exposure[]{const out:Exposure[]=[];for(let h=Math.floor(from/3600000);h<=Math.floor(to/3600000);h++){const start=Math.max(from,h*3600000),end=Math.min(to,(h+1)*3600000);if(end>start)out.push({id:`${realm}:${h}`,kind:hourlyWeather(h,realm),start,end,ms:end-start});}return out;}
export const weatherWeights=(kind:V3Weather)=>kind==='starchart'?[0,600,353,47]:V3_WEATHER[kind].grade==='SSR'?[0,66,30,4]:V3_WEATHER[kind].grade==='SR'?[400,400,200,4]:[700,200,100,2];
export const fertilizerV3=(f:Fertilizer)=>{
 const x=FERTILIZERS[f],i=x.grade-1;
 return {effect:x.effect,grade:x.grade,price:({speed:[5,12,24,45],mutation:[7,18,38,70],weight:[6,14,30,55]})[x.effect][i],speed:[.2,.3,.4,.5][i],lambda:[.23,.64,1.08,1.29][i],mass:([[0,.4],[.3,.6],[.5,1],[.8,1.2]])[i]};
};
export function fertilizerDescription(f:Fertilizer):string {const v=fertilizerV3(f);return v.effect==='speed'?`剩余生长时间缩短 ${Math.round(v.speed*100)}%，天气暴露也缩短`:v.effect==='mutation'?`变异强度 +${v.lambda}，按剩余幼苗覆盖折算`:`最终重量倍率 +${v.mass[0]}～${v.mass[1]}`;}
export type GeneSlots=[Trait|null,Trait|null,Trait|null,Trait|null];
export function geneSlots(ts:Trait[]):GeneSlots {const capped=cappedTraits(ts).filter(t=>traitSlot(t)!=='size');return [capped.find(t=>traitSlot(t)==='fruit')??null,capped.find(t=>traitSlot(t)==='skin')??null,...[0,1].map(i=>capped.filter(t=>traitSlot(t)==='accessory')[i]??null)] as GeneSlots;}
export function stableSlots(ts:Trait[],previous?:GeneSlots):GeneSlots {const next:GeneSlots=[null,null,null,null];for(let i=0;i<4;i++){const t=previous?.[i];if(t&&ts.includes(t))next[i]=t;}for(const t of ts){if(traitSlot(t)==='size'||next.includes(t))continue;const indices=traitSlot(t)==='fruit'?[0]:traitSlot(t)==='skin'?[1]:[2,3];const i=indices.find(i=>next[i]===null);if(i!==undefined)next[i]=t;}return next;}
export interface Lineage {parents:{id:string;species:Species;traits:Trait[]}[];at:number;owner?:string}
export interface BatchV3 {seedlingEnd:number;naturalReadyAt?:number;settled:boolean;seed:number;realm:string;exposure:Exposure[];candidates:Trait[];fertilizedAt?:number;slots:GeneSlots;massGene?:Trait;soil:number;sunBonus:number}
export interface Appraisal {row:number;factor:number;done:boolean;board:number[][];history:{row:number;column:number;multiplier:number}[];baseKg:number;maxRows:number}
export interface GardenV3 {version:3;realm?:string;sunActive?:number;sunRequests?:string[];day:number;xpToday:Partial<Record<Species,number>>;rainbowMisses:number;pityEvents:string[];week:number;breeds:number;geneMisses:number;sizeMisses:number;oils:{normal:number;rich:number};soil:number[];goal?:{species:Species;traits:Trait[]};records:{at:number;kind:string;message:string;peer?:string;plant?:string}[];counters:Record<string,number>;sunPartners:string[];appraisals:Record<string,Appraisal>}
export type V3Command={type:'sunRequest'|'sunRemove';target:string}|{type:'sunAnswer';target:string;accept:boolean}|{type:'resolveFactors';target:string;chosen:Trait[]}|{type:'collectionGoal';species:Species;traits:Trait[]}|{type:'clearCollectionGoal'}|{type:'buyOil';kind:'normal'|'rich'}|{type:'upgradeSoil';plot:number}|{type:'appraiseStart';target:string}|{type:'appraisePick';target:string;column:number}|{type:'appraiseStop';target:string};
export const weekKey=(now:number)=>Math.floor((gardenDay(now)-4)/7);
export function recordGarden(s:GardenState,now:number,kind:string,message:string,peer?:string,plant?:string):void {if(!s.v3)return;s.v3.records.push({at:now,kind,message,peer,plant});s.v3.records=s.v3.records.slice(-150);s.v3.counters[kind]=(s.v3.counters[kind]??0)+1;}
export function v3Value(p:Pick<Produce,'species'|'kg'|'traits'|'yieldCount'>):number {const sp=SPECIES[p.species],mass=Math.min(6,Math.max(.4,p.kg/sp.kg)),bonus=p.traits.reduce((sum,t)=>sum+(traitSlot(t)==='size'?0:FACTOR_SCORE[TRAITS[t].tier]),0);return Math.max(1,Math.round(sp.price/(p.yieldCount??sp.harvests)+V3.hourIncome*sp.minutes/60*(.7+.3*mass)*Math.min(3,1+bonus/100)));}
