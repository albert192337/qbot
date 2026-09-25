import {describe,it,expect} from 'vitest';
import {initialGarden,transition,validateGarden} from '../src/main/garden/rules';
import {ensureLife} from '../src/main/garden/life-rules';
import {gardenDay,dailyOffers,sprayPool,characterLevel,wishMatches,coopRareChance} from '../src/shared/garden-life';
import {TRAITS,traitSlot,type Trait,type Produce,type Plant} from '../src/shared/garden';
let seq=0;const rng={random:()=>.1,id:()=>`item-${++seq}`};
const now=Date.UTC(2026,8,22,8);
function garden(){const s=initialGarden(now,rng);ensureLife(s,now,rng,'pet-a');s.coins=10000;return s;}
const fruit=(id='fruit'):Produce=>({id,species:'strawberry',traits:['honey'],kg:.2,value:20,bred:false,growthVersion:2,revealed:true});
const plant=():Plant=>({...fruit(),plantedAt:now-60000,readyAt:now,fertilizers:[],harvestsLeft:1});

describe('garden daily life',()=>{
  it('rejects immature field targets but can finish a saved legacy basket result',()=>{
    const s=garden();s.plots[0]={...plant(),readyAt:now+1000};s.life!.sprays.color=1;
    expect(()=>transition(s,{type:'spray',kind:'color',target:'fruit'},now,rng)).toThrow('成熟');
    expect(s.life!.sprays.color).toBe(1);
    s.plots[0]=null;s.produce=[fruit()];s.life!.pending={id:'old-result',target:'fruit',kind:'color',dye:'pink'};
    const next=transition(s,{type:'resolveSpray',id:'old-result',accept:true},now,rng).state;
    expect(next.produce[0].dye).toBe('pink');expect(next.life!.pending).toBeUndefined();
  });
  it('has 60 unique factors and every spray references real factors',()=>{expect(Object.keys(TRAITS)).toHaveLength(60);for(const k of ['color','fruit','material','charm','moon'] as const)for(const p of sprayPool(k))if(p.trait)expect(TRAITS[p.trait]).toBeDefined();});
  it('makes every non-size factor obtainable and raises rare loot with participation',()=>{
    const obtainable=new Set(['fruit','material','charm','moon'].flatMap(k=>sprayPool(k as 'fruit').map(p=>p.trait)));
    for(const t of Object.keys(TRAITS) as Trait[])if(traitSlot(t)!=='size')expect(obtainable.has(t),t).toBe(true);
    expect(obtainable.size).toBe(56);expect(coopRareChance(1)).toBe(.18);expect(coopRareChance(8)).toBe(.27);expect(coopRareChance(99)).toBe(.27);
  });
  it('uses 04:00 UTC+8, stable independent shelves, and does not reset on clock rollback',()=>{
    const boundary=Date.UTC(2026,8,21,20);expect(gardenDay(boundary)-gardenDay(boundary-1)).toBe(1);
    expect(dailyOffers('a',1)).toEqual(dailyOffers('a',1));expect(dailyOffers('a',1)).not.toEqual(dailyOffers('b',1));
    const s=garden();s.life!.rareBought=3;ensureLife(s,now-86400000,rng,'pet-a');expect(s.life!.rareBought).toBe(3);
    ensureLife(s,now+86400000,rng,'pet-a');expect(s.life!.rareBought).toBe(0);
  });
  it('requires an authorized remote shop and enforces shared rare purchase budget',()=>{
    let s=garden();const day=s.life!.day;
    const cmd={type:'buyDaily' as const,owner:'friend',offer:dailyOffers('friend',day)[0].id};
    expect(()=>transition(s,cmd,now,rng)).toThrow('好友商店');
    s=transition(s,cmd,now,rng,{shopOwner:'friend'}).state;
    expect(s.life!.rareBought).toBe(1);expect(()=>transition(s,cmd,now,rng,{shopOwner:'friend'})).toThrow('限购');
    s.life!.rareBought=3;const next={...cmd,offer:dailyOffers('friend',day)[1].id};expect(()=>transition(s,next,now,rng,{shopOwner:'friend'})).toThrow('3 瓶');
    const seed={...cmd,offer:dailyOffers('friend',day)[2].id};s=transition(s,seed,now,rng,{shopOwner:'friend'}).state;expect(s.journey!.bought).toBe(1);
  });
  it('applies one random result immediately and allows harvesting without confirmation',()=>{
    let s=garden();s.plots[0]=plant();s.life!.sprays.fruit=1;
    s=transition(s,{type:'spray',kind:'fruit',target:'fruit'},now,rng).state;
    expect(s.plots[0]!.traits).toEqual(['sugar']);expect(s.life!.pending).toBeUndefined();expect(s.life!.sprays.fruit).toBe(0);
    expect(()=>transition(s,{type:'spray',kind:'fruit',target:'fruit'},now,rng)).toThrow('喷雾不足');
    const restored=validateGarden(JSON.parse(JSON.stringify(s)));
    expect(transition(restored,{type:'harvest',plot:0},now,rng).state.produce.at(-1)!.traits).toEqual(['sugar']);
  });
  it('applies saved legacy results once without rerolling or spending another spray',()=>{
    const s=garden();s.plots[0]=plant();s.life!.sprays.fruit=2;
    s.life!.pending={id:'saved',target:'fruit',kind:'fruit',trait:'milky'};
    ensureLife(s,now,rng);expect(s.plots[0]!.traits).toEqual(['milky']);expect(s.life!.pending).toBeUndefined();
    const snapshot=JSON.stringify(s);ensureLife(s,now,rng);expect(JSON.stringify(s)).toBe(snapshot);expect(s.life!.sprays.fruit).toBe(2);
  });  it('applies same-slot replacement, preserves dye after harvest and does not inherit dye next batch',()=>{
    let s=garden();s.plots[0]=plant();s.life!.sprays.fruit=1;
    s=transition(s,{type:'spray',kind:'fruit',target:'fruit'},now,rng).state;

    expect(s.plots[0]!.traits).toEqual(['sugar']);
    expect(s.discovered).toContain('strawberry:sugar');
    s.plots[0]=null;
    s=transition(s,{type:'plant',plot:0,seed:s.seeds.find(x=>x.species==='strawberry')!.id},now,rng).state;
    s.plots[0]!.readyAt=now;s.plots[0]!.dye='pink';s.plots[0]!.revealed=true;
    s=transition(s,{type:'harvest',plot:0},now,rng).state;expect(s.produce.at(-1)!.dye).toBe('pink');expect(s.plots[0]!.dye).toBeUndefined();
  });
  it('rejects incorrect traits, locked fruit, and repeat feeding without consuming anything',()=>{
    let s=garden();const w=s.life!.characters['pet-a'].wishes[2];w.species='strawberry';w.traits=['honey'];s.produce=[{...fruit(),traits:[]}];
    const cmd={type:'feed' as const,wish:w.id,produce:'fruit'};
    expect(()=>transition(s,cmd,now,rng,{actor:'pet-a'})).toThrow('正确的水果');expect(s.produce).toHaveLength(1);
    s.produce=[{...fruit(),locked:true}];expect(wishMatches(w,s.produce[0])).toBe(false);
    s.produce=[fruit()];s=transition(s,cmd,now,rng,{actor:'pet-a'}).state;
    expect(s.produce).toHaveLength(0);expect(s.life!.characters['pet-a'].xp).toBe(20);expect(characterLevel(20)).toBe(2);
    expect(()=>transition(s,cmd,now,rng,{actor:'pet-a'})).toThrow();
  });
  it('keeps separate character growth and fixed requests on switching and restarting',()=>{
    const s=garden();s.life!.characters['pet-a'].xp=120;const wishes=structuredClone(s.life!.characters['pet-a'].wishes);
    ensureLife(s,now,rng,'pet-b');expect(s.life!.characters['pet-b'].xp).toBe(0);
    ensureLife(s,now,rng,'pet-a');expect(s.life!.characters['pet-a'].wishes).toEqual(wishes);expect(s.life!.characters['pet-a'].xp).toBe(120);
    const restored=validateGarden(JSON.parse(JSON.stringify(s)));ensureLife(restored,now+86400000,rng,'pet-a');expect(restored.life!.characters['pet-a'].xp).toBe(120);
  });
});
