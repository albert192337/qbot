import { describe,it,expect } from 'vitest';
import { initialGarden,transition,validateGarden } from '../src/main/garden/rules';
import { enableV3,makeV3Plant,breedV3,advanceV3 } from '../src/main/garden/v3-rules';
import { ensureLife } from '../src/main/garden/life-rules';
import { canBreed,SPECIES,type Produce } from '../src/shared/garden';
import { geneSlots } from '../src/shared/garden-v3';
import { furnitureOffers,nativeSocialWeather,CROPS } from '../src/shared/social-economy';
import { unlockedPlots } from '../src/shared/garden-progression';
const now=1790630400000;let id=0;
const rng=(roll=.99)=>({random:()=>roll,id:()=>`test-${++id}`});
function garden(){const r=rng(),s=initialGarden(now,r);ensureLife(s,now,r,'pet');enableV3(s,now);return s;}
function parent(id:string):Produce {return {id,species:'strawberry',traits:['starcore','golden'],slots:geneSlots(['starcore','golden']),kg:.2,value:36,bred:false,revealed:true,growthVersion:3};}
describe('social economy runtime',()=>{
  it('delivers seed and fertilizer rewards to usable inventories without creating gold genes',()=>{
    let s=garden();ensureLife(s,now,rng(),'pet');s.economy!.tokens=600;const seeds=s.seeds.length,fertilizer=s.fertilizers.speed;
    s=transition(s,{type:'capsuleDraw',count:1},now,rng(0)).state;
    expect(s.seeds).toHaveLength(seeds+3);expect(s.seeds.slice(-3).every(x=>x.species==='strawberry'&&x.genes.length===0)).toBe(true);
    const values=[0,.7];let i=0;s=transition(s,{type:'capsuleDraw',count:1},now,{id:rng().id,random:()=>values[i++]??0}).state;
    expect(s.fertilizers.speed).toBe(fertilizer+3);expect(s.economy!.lastCapsule!.rewards[0].kind).toBe('fertilizer');expect(s.economy!.tokens).toBe(480);
  });
  it('retires old inventory and quotes once while preserving currency and pity progress',()=>{
    const s=garden();delete s.economy!.capsuleRevision;s.economy!.furniture={lantern:4,'kyoto-lantern':1,'moss-stool':2};s.economy!.tokens=240;s.economy!.epicMisses=7;
    s.economy!.furnitureReservation={owner:s.life!.owner,item:'screen',price:9000,expiresAt:now+100000};validateGarden(s);enableV3(s,now);
    expect(s.economy!.furniture).toEqual({'moss-stool':2});expect(s.economy!.furnitureReservation).toBeUndefined();expect(s.economy!.tokens).toBe(240);expect(s.economy!.epicMisses).toBe(7);expect(enableV3(s,now)).toBe(false);
  });
  it('preserves old collections and migrates exactly once without a level gate',()=>{const s=garden();s.produce.push(parent('old'));const before=structuredClone(s);expect(enableV3(s,now)).toBe(false);expect(s).toEqual(before);expect(unlockedPlots(s)).toBe(4);expect(validateGarden(JSON.parse(JSON.stringify(s)))).toEqual(s);});
  it('grants one gold pair and one accelerator, and keeps gold as the breeding requirement',()=>{
    let s=transition(garden(),{type:'socialStarter'},now,rng()).state;
    expect(()=>transition(s,{type:'socialStarter'},now,rng())).toThrow('已经领取');
    const seed=s.economy!.tutorial.seed!;s=transition(s,{type:'plant',seed,plot:0},now,rng()).state;
    s=transition(s,{type:'tutorialSpeed',plot:0},now,rng()).state;
    expect(s.plots[0]!.readyAt).toBe(now+5000);expect(canBreed(s.plots[0]!)).toBe(true);
    expect(()=>transition(s,{type:'tutorialSpeed',plot:0},now,rng())).toThrow();
    expect(()=>transition(s,{type:'breed',first:seed,second:s.economy!.tutorial.parent!},now+4999,rng())).toThrow();
    const result=transition(s,{type:'breed',first:seed,second:s.economy!.tutorial.parent!,oil:'normal'},now+5000,rng());
    expect(result.reveal?.seed).toBeDefined();expect(result.state.economy!.tutorial.bred).toBe(true);
    expect(()=>breedV3(garden(),{...parent('a'),traits:['shiny'],slots:geneSlots(['shiny'])},parent('b'),{type:'breed',first:'a',second:'b'},now,rng())).toThrow('金色');
  });
  it('rich oil increases actual inheritance and shortens random pity without selecting a factor',()=>{
    const normal=garden(),rich=garden();rich.v3!.oils.rich=2;
    const command={type:'breed' as const,first:'a',second:'b'};
    expect(breedV3(normal,parent('a'),parent('b'),{...command,oil:'normal'},now,rng(.4)).genes).toHaveLength(0);
    expect(breedV3(rich,parent('c'),parent('d'),{...command,oil:'rich'},now,rng(.4)).genes).toHaveLength(2);
    rich.v3!.geneMisses=4;const seed=breedV3(rich,parent('e'),parent('f'),{...command,oil:'rich',firstGenes:['shiny']},now,rng(.99));
    expect(seed.genes).toHaveLength(1);expect(['starcore','golden']).toContain(seed.genes[0]);expect(seed.genes).not.toContain('shiny');
  });
  it('keeps gacha currency separate, persists pity and does not charge on insufficient balance',()=>{
    let s=garden(),coins=s.coins;s=transition(s,{type:'capsuleTopUp'},now,rng()).state;
    expect(s.economy!.tokens).toBe(300);expect(()=>transition(s,{type:'capsuleTopUp'},now,rng())).toThrow('已领取');
    expect(()=>transition(s,{type:'capsuleDraw',count:10},now,rng())).toThrow('不足');expect(s.economy!.tokens).toBe(300);
    s.economy!.epicMisses=19;s.economy!.rareMisses=9;
    s=transition(s,{type:'capsuleDraw',count:1},now,rng(0)).state;
    expect(s.economy!.furniture['moon-terrarium']).toBe(1);expect(s.economy!.epicMisses).toBe(0);expect(s.economy!.tokens).toBe(240);expect(s.coins).toBe(coins);
    const restored=validateGarden(JSON.parse(JSON.stringify(s)));expect(restored.economy).toEqual(s.economy);
  });
  it('purchases a real 2D furniture id atomically and refuses arbitrary shop owners',()=>{
    const s=garden(),owner=s.life!.owner;const r=transition(s,{type:'buyFurniture',owner,item:'moss-stool'},now,rng());
    expect(r.state.economy!.furniture['moss-stool']).toBe(1);expect(r.state.coins).toBe(60);expect(s.coins).toBe(180);
    expect(()=>transition(r.state,{type:'buyFurniture',owner,item:'moss-stool'},now,rng())).toThrow('买过');
    expect(()=>transition(s,{type:'buyFurniture',owner:'stranger',item:'moss-stool'},now,rng())).toThrow('好友商店');
  });
  it('new crops use bounded sale bonuses, one harvest and configured costs',()=>{
    let s=garden();const p=makeV3Plant(s,{id:'seed',species:'apple',genes:[],bred:false},0,now,rng());
    expect(p.harvestsLeft).toBe(1);expect(p.readyAt-now).toBe(CROPS.apple.minutes*60000);
    s=transition(s,{type:'readMutations'},now,rng()).state;expect(s.shop.offers.find(x=>x.item==='apple')?.price).toBe(54);
  });
  it('settles four checkpoints once, including save/reload and mature visits',()=>{
    const s=garden();s.plots[0]=makeV3Plant(s,{id:'seed',species:'strawberry',genes:[],bred:false},0,now,rng());
    advanceV3(s,now+6*60000);expect(s.plots[0]!.batch!.socialChecks).toBe(1);
    const restored=validateGarden(JSON.parse(JSON.stringify(s)));advanceV3(restored,now+24*60000);expect(restored.plots[0]!.batch!.socialChecks).toBe(4);
    const before=structuredClone(restored);expect(advanceV3(restored,now+86400000)).toBe(false);expect(restored.plots).toEqual(before.plots);expect(restored.economy!.notifications).toEqual(before.economy!.notifications);
  });
  it('shop and weather do not reroll on refresh',()=>{expect(furnitureOffers('alice',123)).toEqual(furnitureOffers('alice',123));expect(nativeSocialWeather(now,'alice')).toEqual(nativeSocialWeather(now+1,'alice'));});
  it('wish rewards require actual events and are capped across characters',()=>{
    let s=garden();expect(()=>transition(s,{type:'socialWish',kind:'harvest'},now,rng())).toThrow('先完成');
    s.v3!.counters.socialHarvest=1;s=transition(s,{type:'socialWish',kind:'harvest'},now,rng()).state;
    expect(s.coins).toBe(200);expect(()=>transition(s,{type:'socialWish',kind:'harvest'},now,rng(),{actor:'another'})).toThrow('已领取');
  });
  it('dispatches two characters for one price and awards regional furniture only at earned milestones',()=>{
    let s=garden();s.coins=10000;ensureLife(s,now,rng(),'second');
    s=transition(s,{type:'tripStart',city:'kyoto',actors:['pet','second']},now,rng()).state;
    expect(s.coins).toBe(9880);const first=s.economy!.travel!.active!;
    expect(()=>transition(s,{type:'tripStart',city:'paris',actors:['pet']},now,rng())).toThrow('上一队');
    expect(()=>transition(s,{type:'tripClaim',id:first.id},first.readyAt-1,rng())).toThrow('路上');
    s=transition(s,{type:'tripClaim',id:first.id},first.readyAt,rng()).state;
    expect(s.seeds.filter(x=>x.origin==='kyoto')).toHaveLength(1);expect(s.economy!.furniture['kyoto-sprout']).toBeUndefined();
    expect(()=>transition(s,{type:'tripClaim',id:first.id},first.readyAt,rng())).toThrow('结算');
    s=transition(s,{type:'tripStart',city:'kyoto',actors:['pet']},first.readyAt,rng()).state;
    const second=s.economy!.travel!.active!;s=transition(s,{type:'tripClaim',id:second.id},second.readyAt,rng()).state;
    expect(()=>transition(s,{type:'tripStart',city:'kyoto',actors:['pet']},second.readyAt,rng())).toThrow('本周');
    s=transition(s,{type:'tripStart',city:'kyoto',actors:['pet']},now+7*86400000,rng()).state;
    const third=s.economy!.travel!.active!;s=transition(s,{type:'tripClaim',id:third.id},third.readyAt,rng()).state;
    expect(s.economy!.furniture['kyoto-sprout']).toBe(1);expect(s.economy!.travel!.counts.kyoto).toBe(3);
    expect(validateGarden(JSON.parse(JSON.stringify(s))).economy).toEqual(s.economy);
  });
  it('requires the requested furniture and lets the player replace an expensive wish for free',()=>{
    let s=transition(garden(),{type:'readMutations'},now,rng()).state;
    const wish=s.economy!.wishes!.find(w=>w.kind==='furniture')!;s.v3!.counters.furniture=1;
    expect(()=>transition(s,{type:'socialWish',kind:'furniture'},now,rng())).toThrow('那件家具');
    s=transition(s,{type:'rerollSocialWish',id:wish.id},now,rng()).state;
    expect(s.economy!.wishes!.some(w=>w.kind==='feed')).toBe(true);expect(s.coins).toBe(180);
    expect(s.economy!.wishRerolls).toBe(1);
  });
  it('honors a rare furniture reservation across daily refresh without extending it on retries',()=>{
    let s=garden();s.coins=20000;const day=s.economy!.day;
    let owner='';for(let i=0;i<1000;i++)if(furnitureOffers('shop'+i,day).some(x=>x.tier!=='common')){owner='shop'+i;break;}
    const rare=furnitureOffers(owner,day).find(x=>x.tier!=='common')!;
    s=transition(s,{type:'reserveFurniture',owner,item:rare.id},now,rng(),{shopOwner:owner}).state;
    const end=s.economy!.furnitureReservation!.expiresAt;
    s=transition(s,{type:'reserveFurniture',owner,item:rare.id},now+1000,rng(),{shopOwner:owner}).state;
    expect(s.economy!.furnitureReservation!.expiresAt).toBe(end);
    s=transition(s,{type:'buyFurniture',owner,item:rare.id},now+86400000,rng(),{shopOwner:owner}).state;
    expect(s.economy!.furniture[rare.id]).toBe(1);expect(s.coins).toBe(20000-rare.price);expect(s.economy!.furnitureReservation).toBeUndefined();
  });
});


