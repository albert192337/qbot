import { SPECIES, TRAITS, type GardenState, type Trait } from '../../shared/garden';
import { dailyRandom } from '../../shared/garden-life';
import { WEATHER_CHECKS, WEATHER_CHANCE, nativeSocialWeather, socialWeatherPool } from '../../shared/social-economy';
import { V3_WEATHER, withSize, geneSlots, qualityOf, recordGarden, v3Value } from '../../shared/garden-v3';
import { settleFactors } from './v3-rules';

/** Persist each checkpoint: visits, accelerators and retries cannot reroll an earlier result. */
export function advanceSocialPlants(s:GardenState,now:number):boolean {
  const e=s.economy;if(!e)return false;let changed=false;
  for(const p of s.plots){
    if(!p?.batch)continue;
    if(p.cultivation&&p.cultivation.remainingMs>180000){p.cultivation.remainingMs=180000;changed=true;}
    if(p.batch.settled&&p.batch.candidates.length){p.traits=withSize(settleFactors([...p.traits,...p.batch.candidates]),p.kg/SPECIES[p.species].kg);p.slots=geneSlots(p.traits);p.batch.candidates=[];p.value=v3Value(p);changed=true;}
    if(p.batch.settled)continue;
    const b=p.batch;b.socialChecks??=0;
    const duration=(b.naturalReadyAt??p.readyAt)-p.plantedAt;
    while(b.socialChecks<4){
      const index=b.socialChecks,at=Math.max(p.plantedAt+duration*WEATHER_CHECKS[index],b.socialAdjustedAt??0);if(at>now)break;
      const shared=[...e.weatherHistory,...(e.weather?[e.weather]:[])].filter(w=>w.acceptedAt+120000<=at&&w.start<=at&&w.end>at).sort((a,b)=>b.acceptedAt-a.acceptedAt)[0];
      const weather=shared??nativeSocialWeather(at,s.life?.owner??'local');
      const random=dailyRandom(`checkpoint4:${p.id}:${b.seed}:${index}`),roll=random(),w=V3_WEATHER[weather.kind],chances=WEATHER_CHANCE[w.grade];
      let sum=0,tier:string|undefined;for(let i=0;i<4;i++){sum+=chances[i];if(roll<sum){tier=['blue','purple','gold','rainbow'][i];break;}}
      const pool=socialWeatherPool(weather.kind).filter(t=>TRAITS[t].tier===tier);
      if(pool.length){
        const t=pool[Math.floor(random()*pool.length)],old=[...p.traits];p.traits=withSize(settleFactors([...old,t]),p.kg/SPECIES[p.species].kg);p.slots=geneSlots(p.traits);
        if(p.traits.includes(t)&&!old.includes(t)){
          const text=`${SPECIES[p.species].name}受${shared?'伙伴共享的':''}${w.name}影响，长出了「${TRAITS[t].name}」`;
          e.notifications.push({id:`${p.id}:${index}`,at,text,read:false});e.notifications=e.notifications.slice(-100);
          recordGarden(s,at,'mutation',text,shared?.source,p.id);
        }
      }
      b.socialChecks++;changed=true;
    }
    if(b.socialChecks===4){
      const random=dailyRandom(`mass4:${p.id}:${b.seed}`),roll=random();
      const mass=b.massGene?({mini:.5,plump:1.8,large:3.5,giant:5.3} as Partial<Record<Trait,number>>)[b.massGene]??1:roll<.002?5.3:roll<.052?3.5:roll<.152?1.8:1;
      p.kg=Math.round(SPECIES[p.species].kg*mass*1000)/1000;p.traits=withSize(p.traits,mass);
      b.settled=true;b.candidates=[];p.value=v3Value(p);if(qualityOf(p)==='rainbow')p.readyAt=Math.min(p.readyAt,b.seedlingEnd);}
  }
  return changed;
}
