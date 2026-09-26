import { SPECIES, TRAITS, needsReveal, traitSlot, level, type GardenState, type GardenCommand, type Trait, type Produce, type GardenReveal, type Species } from '../../shared/garden';
import { FRUITS, SPRAYS, DYE_COLORS, dailyOffers, dailyRandom, gardenDay, sprayPool, wishMatches, characterLevel, CHARACTER_UNLOCKS, type GardenLife, type CharacterGrowth, type FoodWish, type SprayKind } from '../../shared/garden-life';
import { value, type Random } from './rules';
import {stableSlots,speciesLevel,recordGarden,fits} from '../../shared/garden-v3';

const safeKey=(s:string)=>typeof s==='string'&&s.length>0&&s.length<=160&&!['__proto__','constructor','prototype'].includes(s);
export function ensureLife(s:GardenState,now:number,rng:Random,actor?:string,migrate=true):boolean {
  const before=JSON.stringify(s.life);
  s.life??={owner:rng.id(),day:gardenDay(now),sprays:{},purchases:{},rareBought:0,characters:{},visibility:'friends'};
  if(migrate)settlePendingSpray(s,now);
  const l=s.life,day=Math.max(l.day,gardenDay(now));
  if(day!==l.day){l.day=day;l.purchases={};l.rareBought=0;}
  if(s.v3&&l.supplyDay!==day){s.seeds.push({id:rng.id(),species:'strawberry',genes:[],bred:false});l.supplyDay=day;recordGarden(s,now,'dailySeed','小店留了一包草莓种子，想种的时候再种。');}
  if(actor&&safeKey(actor)){
    s.activeActor=actor;
    let c=l.characters[actor];
    if(!c)c=l.characters[actor]={xp:0,day,wishes:[],rerolled:false};
    if(c.day<day||!c.wishes.length){c.day=day;c.rerolled=false;c.wishes=makeWishes(s,actor,day);recordGarden(s,now,'wishes','角色有了三份新的食物心愿');}
  }else delete s.activeActor;
  return before!==JSON.stringify(s.life);
}
function makeWishes(s:GardenState,actor:string,day:number):FoodWish[]{
  const random=dailyRandom(`wish:${s.life!.owner}:${actor}:${day}`);
  const known=FRUITS.filter(sp=>sp==='strawberry'||s.discovered.includes(`${sp}:base`));
  const choose=()=>known[Math.floor(random()*known.length)];
  const everyday=known.filter(sp=>sp==='strawberry'||sp==='tomato');
  const result:FoodWish[]=[0,1].map(i=>({id:`${day}:${i}`,species:everyday[Math.floor(random()*everyday.length)],traits:[],xp:10,done:false}));
  const sp=choose();
  const eligible=(['sugar','honey','purple','twin','mint','shiny','golden','punk','coral'] as Trait[]).filter(t=>TRAITS[t].level<=(s.v3?speciesLevel(s.xp[sp]):level(s.xp[sp])));
  result.push({id:`${day}:2`,species:sp,traits:[eligible[Math.floor(random()*eligible.length)]],xp:20,done:false});
  if(characterLevel(s.life!.characters[actor]?.xp??0)>=5){const seen=eligible.filter(t=>s.discovered.includes(`${sp}:${t}`)&&fits(result[2].traits,t));if(seen.length)result[2].traits.push(seen[Math.floor(random()*seen.length)]);}
  return result;
}
export function validateLife(s:GardenState):void {
  const l=s.life;if(!l)return;
  const nonneg=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
  if(!safeKey(l.owner)||!nonneg(l.day)||!['private','friends','public'].includes(l.visibility)||!l.sprays||!l.purchases||!l.characters||!nonneg(l.rareBought))throw Error('花园生活存档损坏');
  if(l.shopVisibility!==undefined&&!['private','friends','public'].includes(l.shopVisibility))throw Error('商店权限损坏');
  for(const [k,n] of Object.entries(l.sprays))if(!Object.hasOwn(SPRAYS,k)||!nonneg(n))throw Error('喷雾库存损坏');
  if(Object.values(l.purchases).some(n=>!nonneg(n)))throw Error('商店记录损坏');
  for(const [id,c] of Object.entries(l.characters))if(!safeKey(id)||!nonneg(c.xp)||!nonneg(c.day)||typeof c.rerolled!=='boolean'||!Array.isArray(c.wishes)||c.wishes.length>3||c.wishes.some(w=>typeof w.id!=='string'||!FRUITS.includes(w.species)||!Array.isArray(w.traits)||w.traits.some(t=>!Object.hasOwn(TRAITS,t))||![10,20].includes(w.xp)||typeof w.done!=='boolean'))throw Error('角色成长存档损坏');
  if(l.pending&&(!safeKey(l.pending.id)||typeof l.pending.target!=='string'||!Object.hasOwn(SPRAYS,l.pending.kind)||!(l.pending.trait?Object.hasOwn(TRAITS,l.pending.trait):l.pending.dye&&Object.hasOwn(DYE_COLORS,l.pending.dye))))throw Error('喷雾结果损坏');
}
export const sprayConflicts=(a:Trait,b:Trait)=>[['firefly','glowring'],['breezy','snowbell','goldbell']].some(g=>g.includes(a)&&g.includes(b));
/** Apply the saved roll once; replace conflicts first, then the oldest full-slot entry. */
export function settlePendingSpray(s:GardenState,now:number):Produce|undefined {
  const candidate=s.life?.pending;if(!candidate)return;
  const p=s.produce.find(p=>p.id===candidate.target)??s.plots.find(p=>p?.id===candidate.target);
  if(!p){delete s.life!.pending;return;}
  if(candidate.dye)p.dye=candidate.dye;
  if(candidate.trait){
    const t=candidate.trait,slot=traitSlot(t),capacity=slot==='accessory'?2:1;
    let traits=p.traits.filter(x=>!sprayConflicts(x,t)||x===t);
    if(!traits.includes(t)){
      while(traits.filter(x=>traitSlot(x)===slot).length>=capacity){
        const old=traits.find(x=>traitSlot(x)===slot)!;traits=traits.filter(x=>x!==old);
      }
      traits.push(t);
    }
    p.traits=traits;p.revealed=true;
    if(p.growthVersion===3)p.slots=stableSlots(p.traits,p.slots);
    const key=`${p.species}:${t}`;if(!s.discovered.includes(key))s.discovered.push(key);
  }
  p.value=value(p);
  recordGarden(s,now,'sprayAccept','喷雾的新结果已直接生效',undefined,p.id);
  delete s.life!.pending;return p;
}
export function protectPending(s:GardenState,c:GardenCommand):void {
  const id=s.life?.pending?.target;if(!id||c.type==='resolveSpray')return;
  if(('id'in c&&c.id===id)||('ids'in c&&c.ids.includes(id))||('produce'in c&&c.produce===id)||('target'in c&&c.target===id)||('first'in c&&(c.first===id||c.second===id))||('plot'in c&&s.plots[c.plot]?.id===id)||c.type==='harvestMany'||c.type==='sellMany')throw Error('请先处理已经揭晓的喷雾结果');
}
/** Pure mutation inside the caller's cloned, atomic transaction. */
export function lifeTransition(s:GardenState,cmd:GardenCommand,now:number,rng:Random,actor?:string,shopOwner?:string):{handled:boolean;reveal?:GardenReveal;changed?:Produce} {
  if(!['buyDaily','spray','resolveSpray','feed','rerollWish','gardenVisibility'].includes(cmd.type))return {handled:false};
  ensureLife(s,now,rng,actor,cmd.type!=='resolveSpray');const l=s.life!;
  switch(cmd.type){
    case 'buyDaily':{
      if(cmd.owner!==l.owner&&cmd.owner!==shopOwner)throw Error('请从好友商店购买');
      const o=dailyOffers(cmd.owner,l.day).find(o=>o.id===cmd.offer);if(!o)throw Error('货架已刷新，请重新查看');
      const key=`${cmd.owner}/${o.id}`;
      if((l.purchases[key]??0)>=o.limit)throw Error('今日这件商品已达到限购数量');
      if(o.kind==='spray'&&l.rareBought>=3)throw Error('今日珍稀喷雾已购满 3 瓶，明天再来');
      if(s.coins<o.price)throw Error('花园币不足');
      s.coins-=o.price;l.purchases[key]=(l.purchases[key]??0)+1;
      if(o.kind==='spray'){const k=o.item as SprayKind;l.sprays[k]=(l.sprays[k]??0)+1;l.rareBought++;}
      else {s.seeds.push({id:rng.id(),species:o.item as Species,genes:[],bred:false});if(s.journey){s.journey.bought++;if(o.item==='apple')s.journey.appleBought++;}}
      recordGarden(s,now,cmd.owner===l.owner?'shop':'friendShop',`带回${o.kind==='spray'?SPRAYS[o.item as SprayKind].name:SPECIES[o.item as Species].name+'种子'} · ${o.price}币`,cmd.owner===l.owner?undefined:cmd.owner);
      return {handled:true,reveal:{title:'带回来了',message:o.kind==='spray'?SPRAYS[o.item as SprayKind].name:SPECIES[o.item as Species].name+'种子'}};
    }
    case 'spray':{
      if(l.pending)throw Error('请先处理上次喷雾结果');
      if(!Object.hasOwn(SPRAYS,cmd.kind)||!(l.sprays[cmd.kind]!>0))throw Error('喷雾不足');
      const p=s.plots.find(p=>p?.id===cmd.target&&p.readyAt<=now);
      if(!p||p.locked||needsReveal(p)||p.cultivation)throw Error('请点击地里成熟、已揭晓且未收藏锁定的作物使用喷雾');
      const pool=sprayPool(cmd.kind);let n=rng.random()*pool.reduce((v,x)=>v+x.weight,0);const out=pool.find(x=>(n-=x.weight)<0)??pool.at(-1)!;
      l.sprays[cmd.kind]!--;l.pending={id:rng.id(),target:p.id,kind:cmd.kind,trait:out.trait,dye:out.dye};
      recordGarden(s,now,'spray',`用了一瓶${SPRAYS[cmd.kind].name}`,undefined,p.id);
      const changed=settlePendingSpray(s,now)!;
      return {handled:true,changed,reveal:{title:'喷雾生效！',message:out.trait?TRAITS[out.trait].name:DYE_COLORS[out.dye!].name}};
    }
    case 'resolveSpray':{
      const candidate=l.pending;if(!candidate||candidate.id!==cmd.id||typeof cmd.accept!=='boolean')throw Error('喷雾结果已处理');
      const changed=settlePendingSpray(s,now)!;
      return {handled:true,changed,reveal:{title:'喷雾生效！',message:candidate.trait?TRAITS[candidate.trait].name:DYE_COLORS[candidate.dye!].name}};
    }
    case 'feed':{
      if(cmd.actor!==undefined&&cmd.actor!==actor)throw Error('角色已切换，请重新投喂');
      const c=actor&&l.characters[actor];if(!c)throw Error('请先选择自己的角色');
      const w=c.wishes.find(w=>w.id===cmd.wish),i=s.produce.findIndex(p=>p.id===cmd.produce);
      if(!w||i<0||!wishMatches(w,s.produce[i]))throw Error('需要正确的水果和全部指定词条，且果实未收藏锁定');
      const old=characterLevel(c.xp),food=s.produce[i];recordGarden(s,now,'feed',`投喂${SPECIES[food.species].name} · 放下${food.value}币出售收益，获得${w.xp}角色经验`);s.produce.splice(i,1);w.done=true;c.xp+=w.xp;
      const lv=characterLevel(c.xp),unlocked=CHARACTER_UNLOCKS.filter(x=>x.level>old&&x.level<=lv).map(x=>x.name);
      return {handled:true,reveal:{title:lv>old?`升到 Lv.${lv} 了！`:'吃到了，好开心！',message:`+${w.xp} 角色经验${unlocked.length?' · 解锁 '+unlocked.join('、'):''}`}};
    }
    case 'rerollWish':{
      const c=actor&&l.characters[actor];if(!c||c.rerolled)throw Error('今日已更换过心愿');
      const w=c.wishes.find(w=>w.id===cmd.wish);if(!w||w.done)throw Error('这份心愿已经完成');
      const available=FRUITS.filter(sp=>sp==='strawberry'||sp==='tomato'&&s.discovered.includes(`${sp}:base`));
      // The fallback stays attainable, while keeping the original daily experience budget.
      w.species=available[Math.floor(rng.random()*available.length)];w.traits=[];c.rerolled=true;recordGarden(s,now,'reroll','换了一份更容易完成的心愿');return {handled:true};
    }
    case 'gardenVisibility':
      if(!['private','friends','public'].includes(cmd.visibility))throw Error('未知可见范围');if(cmd.scope==='shop')l.shopVisibility=cmd.visibility;else {if(cmd.scope==='land')l.shopVisibility??=l.visibility;l.visibility=cmd.visibility;}return {handled:true};
  }
  return {handled:false};
}
