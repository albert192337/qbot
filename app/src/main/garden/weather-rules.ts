import {createHash} from 'node:crypto';
import {TRAITS,level,type GardenState} from '../../shared/garden';
import {WEATHER_DAY_MS,WEATHER_FACTORS,LEGACY_WEATHER_FACTORS,weatherEvents,gardenWeather,weatherFactorChance} from '../../shared/garden-weather';
import {value} from './rules';
export function weatherRoll(key:string):number{return createHash('sha256').update(key).digest().readUInt32BE(0)/4294967296;}
/** Per-event winners persist even after harvest, so the guarantee cannot refill on new crops. */
export function applyWeatherMutations(s:GardenState,now:number,roll=weatherRoll):boolean{
 const migrated=s.weatherCheckedAt===undefined;
 if(migrated){const current=gardenWeather(now).current;s.weatherCheckedAt=current?current.start-1:now;if(!current)return true;}
 const checkpoint=s.weatherCheckedAt??now;
 if(now<checkpoint)return false;
 const from=Math.max(checkpoint,now-7*WEATHER_DAY_MS);
 const events=weatherEvents(from,now).map(event=>({event,since:checkpoint}));
 if(s.testWeather)events.push({event:s.testWeather,since:s.testWeather.checkedAt});
 events.sort((a,b)=>a.event.start-b.event.start||a.event.id.localeCompare(b.event.id));
 let checked=false;
 s.weatherGuarantees??={};
 for(const [id,record] of Object.entries(s.weatherGuarantees))if(record.end<now-7*WEATHER_DAY_MS)delete s.weatherGuarantees[id];
 for(const {event,since} of events){
  const manual=event===s.testWeather;
  const modern=event.id.startsWith('weather-v2:');
  const record=s.weatherGuarantees[event.id]??={end:event.end,winners:[]};
  if(modern)record.evaluated??=[];
  const candidates=s.plots.filter(p=>{
   if(!p || (modern && (p.cultivation || p.revealed)))return false;
   const eligible=Math.max(modern?p.plantedAt:p.readyAt,event.start);
   return (modern||eligible>=from)&&eligible<=now&&eligible<event.end&&p.plantedAt<=eligible;
  }).filter(p=>p!==null).sort((a,b)=>Math.max(modern?a.plantedAt:a.readyAt,event.start)-Math.max(modern?b.plantedAt:b.readyAt,event.start)||weatherRoll(event.id+a.id)-weatherRoll(event.id+b.id));
  for(const p of candidates){
   const eligible=Math.max(modern?p.plantedAt:p.readyAt,event.start);
   const fresh=modern?!record.evaluated!.includes(p.id):manual?!s.testWeather!.evaluated.includes(p.id):eligible>since;
   const factors=modern?WEATHER_FACTORS[event.kind]:LEGACY_WEATHER_FACTORS[event.kind as 'meteor'|'aurora'];
   const remaining=()=>factors.filter(f=>!p.traits.includes(f.trait)&&level(s.xp[p.species])>=TRAITS[f.trait].level);
   if(modern&&!fresh)continue;
   if(!fresh&&(record.winners.length>=2||record.winners.includes(p.id)||!remaining().length))continue;
   const before=p.traits.length;
   if(fresh){
    if(modern)record.evaluated!.push(p.id);
    if(manual)s.testWeather!.evaluated.push(p.id);
    for(const factor of remaining())if(roll(`${event.id}:${p.id}:${p.harvestIndex??0}:${factor.trait}`)<(modern?weatherFactorChance(event.kind,factor.trait,level(s.xp[p.species])):factor.chance))p.traits=[...p.traits,factor.trait];
   }
   if(!modern&&p.traits.length===before&&record.winners.length<2&&!record.winners.includes(p.id)){
    const pool=remaining();
    // Weighted selection preserves rarity: rainbow remains much rarer than frost.
    let ticket=weatherRoll(`${event.id}:${p.id}:guarantee`)*pool.reduce((sum,f)=>sum+f.chance,0);
    const factor=pool.find(f=>(ticket-=f.chance)<0);
    if(factor)p.traits=[...p.traits,factor.trait];
   }
   if(p.traits.length>before&&!record.winners.includes(p.id))record.winners.push(p.id);
   p.value=value(p);checked=true;
  }
 }
 const testChanged=!!s.testWeather&&s.testWeather.checkedAt<Math.min(now,s.testWeather.end);
 if(s.testWeather)s.testWeather.checkedAt=Math.max(s.testWeather.checkedAt,Math.min(now,s.testWeather.end));
 if(!migrated&&!checked&&!testChanged&&now-checkpoint<60000)return false;
 s.weatherCheckedAt=Math.max(now,checkpoint);return true;
}
