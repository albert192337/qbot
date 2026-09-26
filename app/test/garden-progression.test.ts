import { describe, expect, it } from 'vitest';
import { initialGarden, transition, validateGarden } from '../src/main/garden/rules';
import { ensureLife } from '../src/main/garden/life-rules';
import { enableV3 } from '../src/main/garden/v3-rules';
import { CHARACTER_XP } from '../src/shared/garden-life';
import { emptyPlots, feedingWish, unlockedPlots, visiblePlot } from '../src/shared/garden-progression';

const now = Date.now(); let id = 0;
const rng = { random: () => .5, id: () => `progress-${++id}` };
function fresh() { const s = initialGarden(now, rng); enableV3(s, now); ensureLife(s, now, rng, 'first'); return s; }
describe('character garden progression', () => {
  it('unlocks 3/4/5/6/7 plots and stays capped through level 10', () => {
    const s = fresh();
    for (let i = 0; i < CHARACTER_XP.length; i++) { s.life!.characters.first.xp = CHARACTER_XP[i]; expect(unlockedPlots(s)).toBe(Math.min(7, i + 3)); }
  });
  it('rejects locked planting/soil upgrades without consuming seeds or money', () => {
    const s = fresh(), original = structuredClone(s);
    expect(() => transition(s, {type:'plant', plot:3, seed:s.seeds[0].id}, now, rng, {actor:'first'})).toThrow('尚未解锁');
    expect(() => transition(s, {type:'upgradeSoil', plot:3}, now, rng, {actor:'first'})).toThrow('尚未解锁');
    expect(s).toEqual(original);
  });
  it('batch plants only unlocked slots; level 5 can plant and improve the seventh plot', () => {
    let s = fresh(); s.seeds = Array.from({length:8}, () => ({id:rng.id(),species:'strawberry' as const,genes:[],bred:false}));
    s = transition(s, {type:'plantMany',seed:s.seeds[0].id},now,rng,{actor:'first'}).state;
    expect(s.plots.filter(Boolean)).toHaveLength(3); expect(s.seeds).toHaveLength(5); expect(emptyPlots(s)).toBe(0);
    s.life!.characters.first.xp = 200; s.coins = 1000;
    s = transition(s, {type:'plant',plot:6,seed:s.seeds[0].id},now,rng,{actor:'first'}).state;
    s = transition(s, {type:'upgradeSoil',plot:6},now,rng,{actor:'first'}).state;
    expect(s.plots[6]?.species).toBe('strawberry'); expect(s.v3!.soil[6]).toBe(2);
  });
  it('preserves old six-plot saves and crops when switching to a lower level', () => {
    let s = fresh(); s.life!.characters.first.xp = 200;
    s = transition(s,{type:'plant',plot:5,seed:s.seeds[0].id},now,rng,{actor:'first'}).state;
    s.plots.pop(); s.v3!.soil.pop(); const plant = structuredClone(s.plots[5]);
    s = validateGarden(s); ensureLife(s,now,rng,'new');
    expect(s.plots).toHaveLength(7); expect(s.v3!.soil).toHaveLength(7); expect(s.plots[5]).toEqual(plant);
    expect(unlockedPlots(s)).toBe(3); expect(visiblePlot(s,5)).toBe(true);
    s.plots[5]!.readyAt=now; s.plots[5]!.batch!.settled=true; s.plots[5]!.harvestsLeft=1; s.plots[5]!.revealed=true;
    s = transition(s,{type:'harvest',plot:5},now,rng,{actor:'new'}).state;
    expect(s.produce).toHaveLength(1); expect(visiblePlot(s,5)).toBe(false);
    expect(() => transition(s,{type:'plant',plot:5,seed:s.seeds[0].id},now,rng,{actor:'new'})).toThrow('尚未解锁');
  });
  it('feeds once, prioritizes matching trait wishes, rejects changed actors and protected fruit', () => {
    let s = fresh(); s.life!.characters.first.wishes=[{id:'basic',species:'strawberry',traits:[],xp:10,done:false},{id:'special',species:'strawberry',traits:['juicy'],xp:20,done:false}];
    const fruit = {id:'food',species:'strawberry' as const,traits:['juicy' as const],kg:.1,value:10,bred:false}; s.produce.push(fruit);
    expect(feedingWish(s,fruit)?.id).toBe('special'); expect(feedingWish(s,{...fruit,locked:true})).toBeUndefined();
    expect(() => transition(s,{type:'feed',produce:'food',wish:'special',actor:'other'},now,rng,{actor:'first'})).toThrow('角色已切换');
    const command = {type:'feed' as const,produce:'food',wish:'special',actor:'first'};
    s = transition(s,command,now,rng,{actor:'first'}).state;
    expect(s.life!.characters.first.xp).toBe(20); expect(unlockedPlots(s)).toBe(4); expect(s.produce).toHaveLength(0);
    expect(() => transition(s,command,now,rng,{actor:'first'})).toThrow();
  });
});
