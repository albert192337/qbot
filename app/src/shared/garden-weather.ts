import type { Trait } from './garden';
import type { WeatherKind } from './weather';
export const WEATHER_DURATION_MS=45*60000;
export const WEATHER_DAY_MS=86400000;
export type GardenWeatherKind = WeatherKind | 'breeze' | 'rain' | 'storm' | 'prismatic';
export const WEATHER_CATALOG: Record<GardenWeatherKind,{name:string;icon:string;quality:'normal'|'purple'|'gold';weight:number}> = {
 breeze:{name:'花风',icon:'🍃',quality:'normal',weight:30}, rain:{name:'甘霖',icon:'🌧',quality:'normal',weight:30},
 meteor:{name:'流星夜',icon:'☄',quality:'purple',weight:15}, storm:{name:'雷暴',icon:'⚡',quality:'purple',weight:15},
 aurora:{name:'极光夜',icon:'🌌',quality:'gold',weight:6}, prismatic:{name:'幻光',icon:'🌈',quality:'gold',weight:4},
};
export const WEATHER_QUALITY_NAMES={normal:'普通天气',purple:'稀有天气',gold:'传说天气'};
/** Project v2: conditional factor chances, independent rolls per crop and event. */
export const WEATHER_FACTORS:Record<GardenWeatherKind,{trait:Trait;chance:number}[]>={
 breeze:[{trait:'petals',chance:.18},{trait:'breezy',chance:.12},{trait:'honey',chance:.06}],
 rain:[{trait:'dew',chance:.18},{trait:'striped',chance:.1},{trait:'jade',chance:.04}],
 storm:[{trait:'thunder',chance:.12},{trait:'amber',chance:.06},{trait:'crystal',chance:.04}],
 prismatic:[{trait:'rainbow',chance:.08},{trait:'prism',chance:.05},{trait:'nebula',chance:.03},{trait:'halo',chance:.02}],
 meteor:[{trait:'shiny',chance:.14},{trait:'firefly',chance:.08},{trait:'moon',chance:.05},{trait:'stardust',chance:.025}],
 aurora:[{trait:'frost',chance:.12},{trait:'crystal',chance:.08},{trait:'rainbow',chance:.04},{trait:'prism',chance:.025}],
};
export const LEGACY_WEATHER_FACTORS:Record<WeatherKind,{trait:Trait;chance:number}[]>={meteor:[{trait:'shiny',chance:.06},{trait:'firefly',chance:.03}],aurora:[{trait:'frost',chance:.04},{trait:'rainbow',chance:.005}]};
export interface WeatherEvent {id:string;kind:GardenWeatherKind;start:number;end:number}
export interface GardenWeatherStatus {now:number;current:WeatherEvent|null;next:WeatherEvent;preview?:WeatherKind|null;test?:WeatherEvent|null}
/** Fixed UTC+8 calendar: timezone changes cannot create a second event. */
export function weatherEvents(from:number,to:number):WeatherEvent[]{
 const offset=8*3600000,result:WeatherEvent[]=[];
 for(let day=Math.floor((from+offset)/WEATHER_DAY_MS);day<=Math.floor((to+offset)/WEATHER_DAY_MS);day++){
  const modern=day>=Math.floor((Date.UTC(2026,8,22)-offset+offset)/WEATHER_DAY_MS);
  for(const [slot,hour] of (modern?[8,10,12,14,16,18,20,22]:[12.5,20.5]).entries()){
   const start=day*WEATHER_DAY_MS-offset+hour*3600000;
   const kind:GardenWeatherKind=modern?scheduledKind(day,slot):(day+slot)%2===0?'meteor':'aurora';
   if(start+WEATHER_DURATION_MS>from&&start<=to)result.push({id:`weather-v${modern?2:1}:${day}:${slot}`,kind,start,end:start+WEATHER_DURATION_MS});
  }
 }
 return result;
}
export function gardenWeather(now=Date.now()):GardenWeatherStatus{
 const events=weatherEvents(now-WEATHER_DAY_MS,now+2*WEATHER_DAY_MS);
 return {now,current:events.find(e=>e.start<=now&&now<e.end)??null,next:events.find(e=>e.start>now)!};
}
export function weatherCountdown(ms:number):string{
 const minutes=Math.max(0,Math.ceil(ms/60000));
 return minutes>=60?`${Math.floor(minutes/60)} 小时 ${minutes%60} 分钟`:`${minutes} 分钟`;
}

function scheduledKind(day:number,slot:number):GardenWeatherKind {
 let hash=(Math.imul(day,1664525)^Math.imul(slot+1,1013904223))>>>0;
 hash=Math.imul(hash^(hash>>>16),2246822507)>>>0;hash=Math.imul(hash^(hash>>>13),3266489909)>>>0;hash=(hash^(hash>>>16))>>>0;
 let ticket=hash/4294967296*100;
 for(const [kind,config] of Object.entries(WEATHER_CATALOG))if((ticket-=config.weight)<0)return kind as GardenWeatherKind;
 return 'breeze';
}
export function weatherFactorChance(kind:GardenWeatherKind,trait:Trait,lv:number):number {
 return Math.min(1,(WEATHER_FACTORS[kind].find(f=>f.trait===trait)?.chance??0)*(1+.06*(lv-1)));
}
