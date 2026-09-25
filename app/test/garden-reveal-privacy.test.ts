import {it,expect} from 'vitest';
import {publicGardenPlant,publicGardenState} from '../src/shared/garden-public';
import {needsReveal,canBreed,SPECIES,type Plant} from '../src/shared/garden';
import {initialGarden,transition} from '../src/main/garden/rules';
import {enableV3,makeV3Plant,advanceV3} from '../src/main/garden/v3-rules';
import {V3} from '../src/shared/garden-v3';
const now=Date.UTC(2026,8,25),rng={random:()=>.5,id:()=> 'secret'};
function fixture(){const s=initialGarden(now,rng);enableV3(s,now);const p=makeV3Plant(s,{id:'seed',species:'strawberry',genes:['starcore','rainbow','halo'],bred:false},0,now,rng);p.kg=SPECIES.strawberry.kg*2;p.readyAt=now;p.batch!.settled=true;p.batch!.seedlingEnd=now;p.baseTraits=[...p.traits];s.plots[0]=p;return s;}
it('redacts every outbound trait path and records without touching the authoritative crop',()=>{
 const s=fixture(),p=s.plots[0]!;s.v3!.records.push({at:now,kind:'settlement',message:'星瓤 虹彩 天光冠',plant:p.id});
 const original=structuredClone(s),view=publicGardenState(s),crop=view.plots[0]!;
 expect(needsReveal(crop)).toBe(true);expect(canBreed(crop)).toBe(false);
 expect(crop.traits).toEqual([]);expect(crop.kg).toBe(0);expect(crop.value).toBe(0);
 expect(crop.baseTraits).toBeUndefined();expect(crop.slots).toBeUndefined();expect(crop.batch!.slots).toEqual([null,null,null,null]);
 expect(JSON.stringify(view.plots)).not.toMatch(/starcore|rainbow"\]|halo/);expect(view.v3!.records.at(-1)!.message).toContain('？');expect(s).toEqual(original);
 p.revealed=true;expect(publicGardenPlant(p).traits).toEqual(p.traits);
});
it('requires all three minutes, preserves the roll on pause/reload, and reveals only on completion',()=>{
 let s=fixture();s=transition(s,{type:'cultivate',plot:0},now,rng).state;
 expect(s.plots[0]!.cultivation!.remainingMs).toBe(180000);
 expect(()=>transition(s,{type:'revealPlant',plot:0},now+179999,rng)).toThrow('读条');
 s=transition(s,{type:'pauseCultivation',plot:0},now+60000,rng).state;
 const traits=[...s.plots[0]!.traits];s=JSON.parse(JSON.stringify(s));
 s=transition(s,{type:'cultivate',plot:0},now+600000,rng).state;
 s=transition(s,{type:'revealPlant',plot:0},now+720000,rng).state;
 expect(needsReveal(s.plots[0]!)).toBe(false);expect(s.plots[0]!.traits).toEqual(traits);expect(s.produce).toHaveLength(0);
});
it('migrates an unfinished ten-minute crop to the new duration without losing its roll',()=>{
 const s=fixture(),p=s.plots[0]!;p.cultivation={remainingMs:500000};advanceV3(s,now);
 expect(p.cultivation.remainingMs).toBe(V3.cultivationMs);expect(needsReveal(p)).toBe(true);
});
