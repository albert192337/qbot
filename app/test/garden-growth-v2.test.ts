import {expect,it} from 'vitest';
import {initialGarden,transition,validateGarden,value} from '../src/main/garden/rules';
import {applyWeatherMutations} from '../src/main/garden/weather-rules';
import {LEVEL_XP,level,needsReveal,canBreed,mutationMultiplier,TRAITS,type Trait} from '../src/shared/garden';
import {weatherEvents,WEATHER_CATALOG,WEATHER_FACTORS,weatherFactorChance} from '../src/shared/garden-weather';
let id=0;
const rng={random:()=>.99,id:()=>`growth-${id++}`};
const now=Date.parse('2026-09-22T07:00:00+08:00');
function plant(genes:Trait[]=[]){const s=initialGarden(now,rng);s.seeds[0].genes=genes;return transition(s,{type:'plant',plot:0,seed:s.seeds[0].id},now,rng).state;}
it('harvests give repeatable growth, levels unlock progressively and duration improves',()=>{
 const s=plant();const harvested=transition(s,{type:'harvest',plot:0},now+86400000,rng).state;
 expect(harvested.xp.lotus).toBe(10);expect(()=>transition(harvested,{type:'harvest',plot:0},now+86400000,rng)).toThrow();
 expect(LEVEL_XP.map(level)).toEqual([1,2,3,4,5,6,7,8]);expect(level(99999)).toBe(8);
 const high=initialGarden(now,rng);high.xp.lotus=960;
 const p=transition(high,{type:'plant',plot:0,seed:high.seeds[0].id},now,rng).state.plots[0]!;
 expect(p.readyAt-now).toBe(60*60000*.79);
});
it('rainbow remains sealed across saves, refuses harvesting and cannot skip its countdown',()=>{
 let s=plant(['rainbow']);s.plots[0]!.readyAt=now;
 expect(needsReveal(s.plots[0]!)).toBe(true);expect(canBreed(s.plots[0]!)).toBe(false);
 expect(()=>transition(s,{type:'harvest',plot:0},now,rng)).toThrow('培育');
 expect(()=>transition(s,{type:'harvestMany'},now,rng)).toThrow();
 expect(()=>transition(s,{type:'revealPlant',plot:0},now+60000,rng)).toThrow();
 s=transition(s,{type:'cultivate',plot:0},now,rng).state;
 expect(()=>transition(s,{type:'cultivate',plot:0},now+1,rng)).toThrow();
 expect(()=>transition(s,{type:'revealPlant',plot:0},now+179999,rng)).toThrow();
 s=transition(s,{type:'pauseCultivation',plot:0},now+12000,rng).state;
 expect(s.plots[0]!.cultivation).toEqual({remainingMs:168000});
 s=validateGarden(JSON.parse(JSON.stringify(s)));
 expect(()=>transition(s,{type:'revealPlant',plot:0},now+100000,rng)).toThrow();
 s=transition(s,{type:'cultivate',plot:0},now+100000,rng).state;
 const result=transition(s,{type:'revealPlant',plot:0},now+268000,rng);s=result.state;
 expect(needsReveal(s.plots[0]!)).toBe(false);expect(result.reveal?.title).toBe('惊喜揭晓！');
 expect(s.produce).toHaveLength(0);expect(canBreed(s.plots[0]!)).toBe(true);
 expect(transition(s,{type:'harvest',plot:0},now+268001,rng).state.produce).toHaveLength(1);
});
it('requires a mature field parent and a gold or better bag parent; consumes each opportunity once',()=>{
 const s=plant(['golden']);s.plots[0]!.readyAt=now;
 s.produce.push({...s.plots[0]!,id:'bag'});
 const result=transition(s,{type:'breed',first:s.plots[0]!.id,second:'bag'},now,{...rng,random:()=>.7});
 expect(result.reveal!.seed!.genes).toEqual(['golden']);
 expect(result.state.produce[0].bred).toBe(true);expect(result.state.plots[0]!.bred).toBe(true);
 expect(()=>transition(result.state,{type:'breed',first:s.plots[0]!.id,second:'bag'},now,rng)).toThrow();
 const low=structuredClone(s);low.produce[0].traits=['purple'];expect(()=>transition(low,{type:'breed',first:low.plots[0]!.id,second:'bag'},now,rng)).toThrow('金色');
 const bags=structuredClone(s);bags.produce.push({...bags.produce[0],id:'bag2'});expect(()=>transition(bags,{type:'breed',first:'bag',second:'bag2'},now,rng)).toThrow('地里');
});
it('expanded factors use capped additive pricing; legacy assets keep their old valuation',()=>{
 const p=plant(['golden','giant']).plots[0]!;
 expect(mutationMultiplier(Object.keys(TRAITS) as Trait[])).toBe(15);
 const legacy={...p,growthVersion:undefined};expect(value(legacy)).toBeGreaterThan(value(p));
 const s=plant();delete s.plots[0]!.growthVersion;s.plots[0]!.traits=['rainbow'];
 expect(needsReveal(validateGarden(s).plots[0]!)).toBe(false);
});
it('six weather types span three qualities and give growing plants one mutation opportunity',()=>{
 expect(Object.keys(WEATHER_CATALOG)).toHaveLength(6);expect(new Set(Object.values(WEATHER_CATALOG).map(w=>w.quality)).size).toBe(3);
 expect(Object.values(WEATHER_CATALOG).reduce((n,w)=>n+w.weight,0)).toBe(100);
 const events=weatherEvents(now,now+15*3600000);expect(events).toHaveLength(8);
 const s=plant();s.xp.lotus=960;s.plots[0]!.readyAt=now+2*86400000;
 const event=events[0];applyWeatherMutations(s,event.start,()=>0);
 expect(s.plots[0]!.traits).toEqual(WEATHER_FACTORS[event.kind].map(f=>f.trait));
 const snapshot=JSON.stringify(s.plots);applyWeatherMutations(s,event.start+1000,()=>0);expect(JSON.stringify(s.plots)).toBe(snapshot);
 const trait=WEATHER_FACTORS[event.kind][0].trait;expect(weatherFactorChance(event.kind,trait,8)).toBeCloseTo(WEATHER_FACTORS[event.kind][0].chance*1.42);
 const noLuck=plant();noLuck.xp.lotus=960;applyWeatherMutations(noLuck,event.start,()=>.999);expect(noLuck.plots[0]!.traits).toEqual([]);
});

it('a crop planted exactly at the saved weather checkpoint is evaluated once',()=>{
 const event=weatherEvents(now,now+3600000)[0];const s=plant();s.xp.lotus=960;s.plots[0]!.plantedAt=event.start;s.weatherCheckedAt=event.start;
 let calls=0;applyWeatherMutations(s,event.start,()=>{calls++;return .999;});expect(calls).toBeGreaterThan(0);
 const first=calls;applyWeatherMutations(s,event.start+1000,()=>{calls++;return 0;});expect(calls).toBe(first);expect(s.plots[0]!.traits).toEqual([]);
});
