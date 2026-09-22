import {expect,it} from 'vitest';
import {gardenWeather,weatherEvents,WEATHER_DURATION_MS,WEATHER_DAY_MS} from '../src/shared/garden-weather';
import {applyWeatherMutations,weatherRoll} from '../src/main/garden/weather-rules';
import {initialGarden,transition,value,validateGarden} from '../src/main/garden/rules';
const day=Date.parse('2026-09-16T00:00:00+08:00');
const events=weatherEvents(day,day+WEATHER_DAY_MS-1),event=events[0];
const rng={random:()=>.99,id:()=> 'plant-one'};
function garden(){let s=initialGarden(day,rng);s=transition(s,{type:'plant',plot:0,seed:s.seeds[0].id},day,rng).state;s.weatherCheckedAt=day;s.xp.lotus=80;return s;}
it('has exactly two 45-minute events daily and alternating types',()=>{
 expect(events).toHaveLength(2);expect(new Set(events.map(e=>e.kind)).size).toBe(2);
 expect(events.map(e=>(e.start-day)/3600000)).toEqual([12.5,20.5]);
 expect(events.every(e=>e.end-e.start===WEATHER_DURATION_MS)).toBe(true);
});
it('uses start inclusive / end exclusive and tomorrow after the last event',()=>{
 expect(gardenWeather(event.start-1).current).toBeNull();expect(gardenWeather(event.start).current?.id).toBe(event.id);
 expect(gardenWeather(event.end).current).toBeNull();expect(gardenWeather(events[1].end).next.start).toBeGreaterThan(day+WEATHER_DAY_MS);
});
it('settles mature plots once, changes value and leaves stored produce alone',()=>{
 const s=garden();const old=s.plots[0]!.value;s.produce=[{...s.plots[0]!,id:'bag'}];let calls=0;
 applyWeatherMutations(s,event.start,()=>{calls++;return 0;});expect(calls).toBe(2);expect(s.plots[0]!.traits).toHaveLength(2);
 expect(s.plots[0]!.value).toBeGreaterThan(old);expect(s.plots[0]!.value).toBe(value(s.plots[0]!));expect(s.produce[0].traits).toEqual([]);
 applyWeatherMutations(s,event.start+1000,()=>{calls++;return 0;});expect(calls).toBe(2);
});
it('gives a crop that matures during the event one chance, but none at end',()=>{
 const s=garden();s.plots[0]!.readyAt=event.start+10000;
 applyWeatherMutations(s,event.start,()=>0);expect(s.plots[0]!.traits).toEqual([]);
 applyWeatherMutations(s,event.start+10000,()=>0);expect(s.plots[0]!.traits).toHaveLength(2);
 const late=garden();late.plots[0]!.readyAt=event.end;applyWeatherMutations(late,event.end,()=>0);expect(late.plots[0]!.traits).toEqual([]);
});
it('offline settlement agrees with online and reload cannot reroll',()=>{
 const online=garden(),offline=garden();applyWeatherMutations(online,event.start);applyWeatherMutations(online,events[1].end);
 applyWeatherMutations(offline,events[1].end);expect(online).toEqual(offline);
 const copy=structuredClone(offline);applyWeatherMutations(copy,events[1].end+100);expect(copy.plots).toEqual(offline.plots);
 expect(weatherRoll('a')).toBe(weatherRoll('a'));expect(weatherRoll('a')).not.toBe(weatherRoll('b'));
});
it('does not retroactively mutate a legacy save or reroll when clock moves backwards',()=>{
 const s=garden();delete s.weatherCheckedAt;applyWeatherMutations(s,event.end,()=>0);expect(s.plots[0]!.traits).toEqual([]);
 applyWeatherMutations(s,event.start,()=>0);expect(s.weatherCheckedAt).toBe(event.end);expect(s.plots[0]!.traits).toEqual([]);
});
it('respects species level, rejects corrupt checkpoint and retains base traits for regrowth',()=>{
 const aurora=events.find(e=>e.kind==='aurora')!,s=garden();s.xp.lotus=0;s.weatherCheckedAt=aurora.start-1;
 applyWeatherMutations(s,aurora.start,()=>0);expect(s.plots[0]!.traits).toEqual(['frost']);expect(s.plots[0]!.baseTraits).toEqual([]);
 expect(()=>validateGarden({...s,weatherCheckedAt:NaN})).toThrow();
});
it('caps offline processing to seven days',()=>{
 const s=garden();const keys:string[]=[];const end=day+30*WEATHER_DAY_MS;applyWeatherMutations(s,end,key=>{keys.push(key);return .99;});expect(keys.length).toBeGreaterThan(0);expect(keys.every(key=>Number(key.split(':')[1])>=Math.floor((end-7*WEATHER_DAY_MS+8*3600000)/WEATHER_DAY_MS))).toBe(true);
});
it('manual weather really mutates once, including plants maturing later, and survives reload',()=>{
 const s=garden(),now=day+14*3600000;s.weatherCheckedAt=now;
 s.testWeather={id:'weather-test:one',kind:'meteor',start:now,end:now+180000,checkedAt:now-1,evaluated:[]};
 applyWeatherMutations(s,now,()=>0);expect(s.plots[0]!.traits).toEqual(['shiny','firefly']);
 const saved=validateGarden(JSON.parse(JSON.stringify(s)));let calls=0;
 applyWeatherMutations(saved,now+1000,()=>{calls++;return 0;});expect(calls).toBe(0);
 saved.plots[1]={...structuredClone(saved.plots[0]!),id:'later',traits:[],readyAt:now+2000};
 applyWeatherMutations(saved,now+1999,()=>0);expect(saved.plots[1]!.traits).toEqual([]);
 applyWeatherMutations(saved,now+2000,()=>0);expect(saved.plots[1]!.traits).toEqual(['shiny','firefly']);
});
