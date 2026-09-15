import { describe, expect, it } from 'vitest';
import { initialGarden, transition, validateGarden, REFRESH_MS } from '../src/main/garden/rules';
import { SPECIES, FERTILIZERS, gardenQuest, type GardenState, type GardenCommand } from '../src/shared/garden';
let id=0;
const rng=(r=.99)=>({random:()=>r,id:()=>`exp-${id++}`});
const now=1000000;
const run=(s:GardenState,c:GardenCommand,t=now,r=.99)=>transition(s,c,t,rng(r)).state;
function strawberry() { const s=initialGarden(now,rng()); const seed=s.seeds.find(s=>s.species==='strawberry')!; seed.genes=['golden'];return run(s,{type:'plant',plot:0,seed:seed.id}); }
describe('expanded garden economy',()=>{
  it('preserves the current saved timer and schedules the next full workday cycle',()=>{
    let s=strawberry();s.plots[0]!.readyAt=now+120000;
    const restored=validateGarden(JSON.parse(JSON.stringify(s)));
    expect(restored.plots[0]!.readyAt).toBe(now+120000);
    s=run(restored,{type:'harvest',plot:0},now+120000);
    expect(s.plots[0]!.readyAt).toBe(now+120000+30*60000);
  });
  it('overnight crops mature offline and late acceleration cuts only remaining time',()=>{
    let s=initialGarden(now,rng());s.seeds.push({id:'overnight',species:'apple',genes:[],bred:false});
    s=run(s,{type:'plant',plot:0,seed:'overnight'});
    expect(s.plots[0]!.readyAt).toBe(now+8*3600000);
    s=run(s,{type:'fertilize',plot:0,fertilizer:'speed'},now+2*3600000);
    expect(s.plots[0]!.readyAt).toBe(now+5*3600000);
    s=run(s,{type:'harvest',plot:0},now+12*3600000);
    expect(s.produce).toHaveLength(1);
    expect(s.plots[0]!.readyAt).toBe(now+16*3600000);
  });
  it('three harvests keep the base, reroll extras, preserve fertilizer and use distinct fruit ids',()=>{
    let s=strawberry();s.fertilizers.weight3=1;
    s=run(s,{type:'fertilize',plot:0,fertilizer:'weight3'});
    expect(()=>run(s,{type:'fertilize',plot:0,fertilizer:'speed'})).toThrow('一次');
    s=run(s,{type:'mature'});
    s=run(s,{type:'harvest',plot:0},now,0);
    expect(s.plots[0]!.traits).toContain('golden');expect(s.plots[0]!.traits).toContain('shiny');
    expect(s.plots[0]!.harvestsLeft).toBe(2);expect(s.plots[0]!.fertilizers).toEqual(['weight3']);
    const duration=s.plots[0]!.readyAt-now;expect(duration).toBe(SPECIES.strawberry.minutes*60000);
    s=run(s,{type:'mature'});s=run(s,{type:'harvest',plot:0});
    expect(s.plots[0]!.traits).toEqual(['golden']);expect(s.plots[0]!.harvestsLeft).toBe(1);
    s=run(s,{type:'mature'});s=run(s,{type:'harvest',plot:0});
    expect(s.plots[0]).toBeNull();expect(new Set(s.produce.map(p=>p.id)).size).toBe(3);
    expect(s.produce.every(p=>p.traits.includes('golden'))).toBe(true);
  });
  it('speed grade covers later growth cycles without consuming more fertilizer',()=>{
    let s=strawberry();s.fertilizers.speed3=1;s=run(s,{type:'fertilize',plot:0,fertilizer:'speed3'});s=run(s,{type:'mature'});s=run(s,{type:'harvest',plot:0});
    expect(s.plots[0]!.readyAt-now).toBeCloseTo(30*60000*.2);expect(s.fertilizers.speed3).toBe(0);
  });
  it('batch purchase is atomic for short balance, duplicate offers and stale selections',()=>{
    const s=initialGarden(now,rng()),o=s.shop.offers[0];const before=structuredClone(s);
    expect(()=>run(s,{type:'buyMany',items:[{offer:o.id,count:999}]})).toThrow();
    expect(()=>run(s,{type:'buyMany',items:[{offer:o.id,count:1},{offer:o.id,count:1}]})).toThrow();
    expect(()=>run(s,{type:'buyMany',items:[{offer:o.id,count:1}]},now+REFRESH_MS)).toThrow();
    expect(s).toEqual(before);
    const out=run(s,{type:'buyMany',items:[{offer:o.id,count:2}]});expect(out.coins).toBe(s.coins-o.price*2);expect(out.seeds.length).toBe(s.seeds.length+2);
    s.coins=0;expect(()=>run(s,{type:'buyMany',items:[{offer:o.id,count:1}]})).toThrow('不足');
  });
  it('batch planting respects seed genes; harvest skips keep, sale rejects collected items',()=>{
    let s=initialGarden(now,rng());s.seeds[0].genes=['golden'];
    s=run(s,{type:'plantMany',seed:s.seeds[0].id});expect(s.plots.filter(Boolean)).toHaveLength(1);
    s=run(s,{type:'plantMany',seed:s.seeds.find(s=>s.species==='strawberry')!.id});expect(s.plots.filter(Boolean)).toHaveLength(3);
    s=run(s,{type:'mature'});s=run(s,{type:'keep',plot:0});
    const result=transition(s,{type:'harvestMany'},now,rng());s=result.state;
    expect(result.reveal!.harvests).toHaveLength(2);expect(s.plots[0]!.keep).toBe(true);
    s=run(s,{type:'lock',id:s.produce[0].id});
    expect(()=>run(s,{type:'sellMany',ids:s.produce.map(p=>p.id)})).toThrow();
    const amount=s.produce[1].value;s=run(s,{type:'sellMany',ids:[s.produce[1].id]});expect(s.produce).toHaveLength(1);expect(s.journey!.earned).toBe(amount);
  });
  it('shop keeps basics, exposes stockouts, and supplies the mainline apple after earned currency',()=>{
    let s=initialGarden(now,rng());expect(s.shop.offers.find(o=>o.item==='carrot')!.stock).toBeGreaterThan(0);expect(s.shop.offers.find(o=>o.item==='apple')!.stock).toBe(0);
    s.journey={bought:1,planted:1,harvested:1,earned:230,appleBought:0};s.produce.push({id:'sale',species:'lotus',traits:[],kg:.6,value:20,bred:false});
    s=run(s,{type:'sell',id:'sale'});expect(gardenQuest(s).text).toContain('苹果');expect(s.shop.offers.find(o=>o.item==='apple')!.stock).toBe(1);
    expect(s.journey!.earned).toBe(250);
  });
  it('box has real rarity tiers and the twentieth miss guarantees a rare supply',()=>{
    const s=initialGarden(now,rng());
    const special=transition(s,{type:'box'},now,rng(0));expect(special.state.seeds.at(-1)!.genes).toEqual(['golden']);expect(special.state.boxMisses).toBe(0);
    s.boxMisses=19;const pity=transition(s,{type:'box'},now,rng(.99));expect(SPECIES[pity.state.seeds.at(-1)!.species].chance).toBeLessThan(.3);expect(pity.state.boxMisses).toBe(0);
    expect(pity.reveal!.items!.some(i=>i.kind==='fertilizer'&&FERTILIZERS[i.id as keyof typeof FERTILIZERS].grade===3)).toBe(true);
  });
  it('legacy saves preserve balances, inventory and planted rewards',()=>{
    const s=strawberry(),saved=s as any;
    delete saved.journey;delete saved.boxMisses;
    for(const key of ['carrot','tomato','blueberry','pineapple','apple','tulip']) delete saved.xp[key];
    for(const key of ['speed2','speed3','weight2','weight3','mutation2','mutation3']) delete saved.fertilizers[key];
    delete saved.plots[0].baseTraits;delete saved.plots[0].harvestsLeft;delete saved.plots[0].harvestIndex;delete saved.plots[0].yieldCount;
    saved.plots[0].value *= 3;
    const before=JSON.stringify(saved.plots[0].traits),coins=s.coins;
    const migrated=validateGarden(saved);expect(migrated.coins).toBe(coins);expect(JSON.stringify(migrated.plots[0]!.traits)).toBe(before);expect(migrated.plots[0]!.harvestsLeft).toBe(1);expect(migrated.xp.apple).toBe(0);
    const oldValue=migrated.plots[0]!.value;
    // Weight and coin values round separately; legacy pricing must remain ~1.5x, not /3.
    expect(run(migrated,{type:'fertilize',plot:0,fertilizer:'weight'}).plots[0]!.value).toBeCloseTo(oldValue*1.5,-1);
    migrated.boxMisses=-1;expect(()=>validateGarden(migrated)).toThrow();
  });
});
