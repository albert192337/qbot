import { CROPS, CAPSULE, CAPSULE_POOL, RETIRED_FURNITURE, type CapsuleReward, FURNITURE_SHOP, furnitureOffers, SOCIAL_WISHES, SOCIAL_TRIPS, REGIONAL_FURNITURE } from '../../shared/social-economy';
import { gardenDay,dailyRandom } from '../../shared/garden-life';
import { SPECIES, type GardenState, type GardenCommand, type GardenReveal, type Trait } from '../../shared/garden';
import { geneSlots, recordGarden, v3Value,weekKey } from '../../shared/garden-v3';
import type { Random } from './rules';
import {appearance} from '../../shared/appearances';

export function enableSocialEconomy(s:GardenState,now:number):boolean {
  if(s.economy){const before=JSON.stringify(s.economy);refreshSocial(s,now);return before!==JSON.stringify(s.economy);}
  s.economy={version:4,furniture:{},day:gardenDay(now),purchases:{},rareBought:0,tokens:0,topUpDay:-1,
    rareMisses:0,epicMisses:0,draws:0,tutorial:{claimed:false,sped:false,fertilizer:0,bred:false},
    wishDay:gardenDay(now),wishClaims:[],wishBaseline:{...s.v3?.counters},notifications:[],weatherHistory:[],weatherSwitchAt:0};
  s.shop.refreshAt=0;
  // Keep old assets and experience as history; none of them gates the new four plots.
  for(const c of Object.values(s.life?.characters??{}))c.wishes=[];
  refreshSocial(s,now);
  return true;
}
export function refreshSocial(s:GardenState,now:number):void {
  const e=s.economy;if(!e)return;const day=Math.max(e.day,gardenDay(now));
  e.appearances??={owned:{},equipped:{}};
  if(e.capsuleRevision!==2){
    for(const id of RETIRED_FURNITURE)delete e.furniture[id];
    if(e.furnitureReservation&&RETIRED_FURNITURE.includes(e.furnitureReservation.item))delete e.furnitureReservation;
    if(e.wishes?.some(w=>w.kind==='furniture'&&RETIRED_FURNITURE.includes(w.target??'')))e.wishes=undefined;
    e.capsuleRevision=2;
  }
  e.travel??={week:weekKey(now),starts:0,tutorialDone:false,counts:{},history:[]};
  if(e.travel.week<weekKey(now)){e.travel.week=weekKey(now);e.travel.starts=0;}
  if(day>e.day){e.day=day;e.purchases={};e.rareBought=0;}
  if(day>e.wishDay){e.wishDay=day;e.wishClaims=[];e.wishBaseline={...s.v3?.counters};e.wishRerolls=0;e.wishes=undefined;}
  if(!e.wishes){
    const random=dailyRandom(`social-wish:${s.life?.owner}:${day}`),item=FURNITURE_SHOP.filter(x=>x.tier==='common'&&!e.furniture[x.id]);
    const furniture=item[Math.floor(random()*item.length)],peer=e.wishPeer;
    e.wishes=[{id:`${day}:harvest`,kind:'harvest',label:'想和你一起收获一株植物',createdAt:now,done:false},
      peer?{id:`${day}:visit`,kind:'visit',target:peer.id,label:`想找${peer.name}一起玩`,createdAt:now,done:false}:
      furniture?{id:`${day}:furniture`,kind:'furniture',target:furniture.id,label:`想给房间添一件${furniture.name}`,createdAt:now,done:false}:
      {id:`${day}:feed`,kind:'feed',label:'想和你分享一颗水果',createdAt:now,done:false}];
  }
}
export function socialTransition(s:GardenState,c:GardenCommand,now:number,rng:Random,shopOwner?:string):{handled:boolean;reveal?:GardenReveal} {
  const e=s.economy;if(!e)return {handled:false};refreshSocial(s,now);
  const reveal=(title:string,message:string):{handled:true;reveal:GardenReveal}=>({handled:true,reveal:{title,message}});
  switch(c.type){
    case 'buyAppearance':{
      const item=appearance(c.item);if(!item)throw Error('外观不存在');
      const inventory=e.appearances!;if(inventory.owned[item.id])throw Error('已经拥有这件外观');
      if(s.coins<item.price)throw Error('花园币不足');
      s.coins-=item.price;inventory.owned[item.id]=true;
      recordGarden(s,now,'appearance',`解锁${item.name}`);
      return reveal('新外观已入收藏',`${item.name}可装配给一位自己的角色。`);
    }
    case 'equipAppearance':{
      const item=appearance(c.item),inventory=e.appearances!;
      if(!item||!inventory.owned[item.id])throw Error('请先获得这件外观');
      if(c.actor!==null&&(typeof c.actor!=='string'||!Object.hasOwn(s.life!.characters,c.actor)))throw Error('请选择自己已有的角色');
      // A single item -> actor mapping makes reassignment atomic and exclusive.
      if(c.actor===null)delete inventory.equipped[item.id];else inventory.equipped[item.id]=c.actor;
      return reveal(c.actor?'外观已装配':'外观已卸下',c.actor?`${item.name}已转交给所选角色，同时只供一位角色使用。`:`${item.name}已放回收藏。`);
    }
    case 'travelExperience':case 'travelNext':throw Error('新版旅行请先选目的地和同行角色，再出发');
    case 'tripStart':{
      const t=e.travel!;
      if(!Object.hasOwn(SOCIAL_TRIPS,c.city)||!Array.isArray(c.actors)||c.actors.length<1||c.actors.length>2||new Set(c.actors).size!==c.actors.length||c.actors.some(id=>typeof id!=='string'||!Object.hasOwn(s.life!.characters,id)))throw Error('请选择一到两位已在花园出现过的自己的角色');
      if(t.active)throw Error('先迎接上一队旅行归来');
      if(c.tutorial&&t.tutorialDone)throw Error('初次短途旅行已经体验过');
      if(!c.tutorial&&t.starts>=2)throw Error('本周两次旅行已出发，下周再去新地方');
      const destination=SOCIAL_TRIPS[c.city],cost=c.tutorial?60:destination.cost,minutes=c.tutorial?10:destination.minutes;
      if(s.coins<cost)throw Error('花园币不足');
      s.coins-=cost;if(c.tutorial)t.tutorialDone=true;else t.starts++;
      t.active={id:rng.id(),city:c.city,actors:[...c.actors],startedAt:now,readyAt:now+minutes*60000,tutorial:!!c.tutorial};
      recordGarden(s,now,'tripStart',`派出 ${c.actors.length} 位角色前往${destination.name} · ${cost}金币`);
      return reveal('旅行出发了',`${minutes} 分钟后归来。可离线等待，同行人数不会倍增奖励。`);
    }
    case 'tripClaim':{
      const t=e.travel!,trip=t.active;if(!trip||trip.id!==c.id)throw Error('这次旅行已经结算');if(now<trip.readyAt)throw Error('伙伴还在路上');
      const destination=SOCIAL_TRIPS[trip.city];s.seeds.push({id:rng.id(),species:destination.seed,origin:trip.city,genes:[],bred:false});
      const gifts:string[]=[];
      if(!trip.tutorial){t.counts[trip.city]=(t.counts[trip.city]??0)+1;for(const gift of REGIONAL_FURNITURE.filter(x=>x.city===trip.city&&x.trips===t.counts[trip.city])){e.furniture[gift.id]=(e.furniture[gift.id]??0)+1;gifts.push(gift.name);}}
      t.history.push({...trip,claimedAt:now});t.history=t.history.slice(-100);delete t.active;
      recordGarden(s,now,'tripReturn',`从${destination.name}带回一包地区植物种子${gifts.length?'和'+gifts.join('、'):''}`);
      return reveal('旅行归来了',`${destination.name}植物种子 ×1${gifts.length?' · '+gifts.join('、'):''}。旅行记录已保存，地区家具可在茶室摆放。`);
    }
    case 'appraiseStart':case 'upgradeSoil':case 'spray':case 'buyDaily':throw Error('新版请使用种植补给、天气共享和家具小店');
    case 'box':throw Error('陪伴开箱已退役，请到家具商店或扭蛋机看看');
    case 'socialStarter':{
      if(e.tutorial.claimed)throw Error('新手礼物已经领取');
      const genes:Trait[]=['starcore','golden'],seed=rng.id(),parent=rng.id();
      s.seeds.push({id:seed,species:'strawberry',genes,slots:geneSlots(genes),bred:true});
      const p={id:parent,species:'strawberry' as const,traits:[...genes],kg:SPECIES.strawberry.kg,value:0,bred:false,growthVersion:3 as const,revealed:true,slots:geneSlots(genes),yieldCount:1};
      p.value=v3Value(p);s.produce.push(p);e.tutorial={claimed:true,sped:false,fertilizer:1,seed,parent,bred:false};
      s.v3!.oils.normal++;recordGarden(s,now,'starter','领到金色亲本、金色种子、新手加速肥和普通精油');
      return reveal('一起种下第一份期待','已放入金色亲本、金色草莓种子、新手加速肥 ×1、普通精油 ×1。先邀请伙伴，再种下金色种子试试繁育。');
    }
    case 'tutorialSpeed':{
      const p=s.plots[c.plot];if(!e.tutorial.claimed||e.tutorial.fertilizer!==1||!p||p.id!==e.tutorial.seed||p.readyAt<=now)throw Error('请对新手金色种子长出的植物使用');
      e.tutorial.fertilizer=0;e.tutorial.sped=true;
      // This one-off tutorial crop has fixed gold genes; no rare weather guarantee is consumed.
      p.readyAt=now+5000;p.batch!.seedlingEnd=p.readyAt;p.batch!.naturalReadyAt=p.readyAt;p.batch!.settled=true;
      p.value=v3Value(p);p.revealed=true;
      return reveal('伙伴送来了加速肥','这株新手金色草莓将在 5 秒后成熟。之后的种植使用普通加速肥。');
    }
    case 'reserveFurniture':case 'buyFurniture':{
      if(c.owner!==s.life!.owner&&c.owner!==shopOwner)throw Error('请从已开放的好友商店购买');
      const reservation=e.furnitureReservation;
      const reserved=c.type==='buyFurniture'&&reservation?.owner===c.owner&&reservation.item===c.item&&reservation.expiresAt>now;
      const item=reserved?FURNITURE_SHOP.find(x=>x.id===c.item):furnitureOffers(c.owner,e.day).find(x=>x.id===c.item);if(!item)throw Error('家具货架已刷新');
      if(c.type==='reserveFurniture'){
        if(item.tier==='common')throw Error('日常家具每天可以买，无需预留');
        if(reservation&&reservation.expiresAt>now&&reservation.owner===c.owner&&reservation.item===c.item)return reveal('已经替你留好了','报价有效时间不会因重复点击延长。');
        e.furnitureReservation={owner:c.owner,item:c.item,price:item.price,expiresAt:now+72*3600000};return reveal('替你留好这件家具','保留报价 72 小时，购买时再扣花园币。只能保留一件，新的预留会替换上一件。');
      }
      const key=`${c.owner}:${c.item}`;
      if(e.purchases[key])throw Error('今日已经在这家店买过这件家具');
      if(item.tier!=='common'&&e.rareBought>=1)throw Error('今天已购入一件珍稀家具，明天再来');
      const cost=reserved?reservation!.price:item.price;
      if(s.coins<cost)throw Error('花园币不足');
      s.coins-=cost;e.purchases[key]=1;e.furniture[item.id]=(e.furniture[item.id]??0)+1;
      if(reserved)delete e.furnitureReservation;
      if(item.tier!=='common')e.rareBought++;
      recordGarden(s,now,'furniture',`从${c.owner===s.life!.owner?'自己的':'朋友的'}小店带回${item.name}`,c.owner);
      return reveal('新家具到家了',`${item.name}已收入收藏，可以放进 2D 茶室。`);
    }
    case 'capsuleTopUp':{
      if(e.topUpDay>=e.day)throw Error('今天的模拟充值已领取');
      e.topUpDay=e.day;e.tokens+=CAPSULE.topUp;
      return reveal('模拟充值完成',`测试代币 +${CAPSULE.topUp}。没有真实付款，每天可测试一次。`);
    }
    case 'capsuleDraw':{
      if(c.count!==1&&c.count!==10)throw Error('请选择单抽或十连');
      const cost=c.count*CAPSULE.cost;if(e.tokens<cost)throw Error('测试代币不足，可使用模拟充值');
      const names:string[]=[],rewards:CapsuleReward[]=[];e.tokens-=cost;
      for(let i=0;i<c.count;i++){
        const roll=rng.random();let tier:'common'|'rare'|'epic'=roll<.70?'common':roll<.95?'rare':'epic';
        if(e.epicMisses>=CAPSULE.epicPity-1)tier='epic';else if(e.rareMisses>=CAPSULE.rarePity-1&&tier==='common')tier='rare';
        const pool=CAPSULE_POOL.filter(x=>x.tier===tier);let pick=rng.random()*100;const item=pool.find(x=>(pick-=x.weight)<0)??pool[pool.length-1];
        let duplicateTokens:number|undefined;
        if(item.kind==='appearance'){const cosmetic=appearance(item.item)!;if(e.appearances!.owned[cosmetic.id]){duplicateTokens=cosmetic.duplicateTokens;e.tokens+=duplicateTokens;}else e.appearances!.owned[cosmetic.id]=true;}
        else if(item.kind==='furniture'){e.furniture[item.item]=(e.furniture[item.item]??0)+item.count;recordGarden(s,now,'furniture',`扭蛋机带回${item.name}`);}
        else if(item.kind==='seed'){for(let n=0;n<item.count;n++)s.seeds.push({id:rng.id(),species:item.item as keyof typeof CROPS,genes:[],bred:false});}
        else s.fertilizers[item.item as keyof typeof s.fertilizers]=(s.fertilizers[item.item as keyof typeof s.fertilizers]??0)+item.count;
        e.rareMisses=tier==='common'?e.rareMisses+1:0;e.epicMisses=tier==='epic'?0:e.epicMisses+1;e.draws++;
        names.push(`${item.name} ×${item.count}${duplicateTokens?`（重复转换 ${duplicateTokens} 代币）`:''}`);rewards.push({...item,...(duplicateTokens?{duplicateTokens}:{})});
      }
      e.lastCapsule={id:rng.id(),at:now,rewards};
      return reveal('扭蛋打开了',names.join('、')+' · 已收入背包与收藏。');
    }
    case 'socialWish':{
      if(!Object.hasOwn(SOCIAL_WISHES,c.kind)||e.wishClaims.includes(c.kind)||e.wishClaims.length>=2)throw Error('今日心愿奖励已领取');
      const wish=e.wishes?.find(w=>w.kind===c.kind&&!w.done);if(!wish)throw Error('这份心愿已经更换或完成');
      const key=c.kind==='harvest'?'socialHarvest':c.kind;
      if((s.v3!.counters[key]??0)<=(e.wishBaseline[key]??0))throw Error('先完成这份心愿，再回来领取');
      if(wish.target&&c.kind==='furniture'&&!e.furniture[wish.target])throw Error('还没有找到角色期待的那件家具');
      if(wish.target&&c.kind==='visit'&&!s.v3!.records.some(r=>r.kind==='visit'&&r.peer===wish.target&&r.at>=wish.createdAt))throw Error('还没有去找这位朋友');
      e.wishClaims.push(c.kind);wish.done=true;s.coins+=20;recordGarden(s,now,'wish',wish.label+' · +20花园币');
      return reveal('又多了一段共同经历','花园币 +20。每天最多领取两份心愿奖励。');
    }
    case 'rerollSocialWish':{
      const wish=e.wishes?.find(w=>w.id===c.id&&!w.done);if(!wish)throw Error('心愿不存在或已经完成');
      if((e.wishRerolls??0)>=2)throw Error('今天两次免费更换已用完');
      const kind=['feed','harvest','breed'].find(k=>!e.wishes!.some(w=>w.kind===k)&&!e.wishClaims.includes(k)) as 'feed'|'harvest'|'breed'|undefined;
      if(!kind)throw Error('今天已没有新的心愿');
      wish.id+=`:r${e.wishRerolls??0}`;wish.kind=kind;wish.target=undefined;wish.label=SOCIAL_WISHES[kind];wish.createdAt=now;e.wishRerolls=(e.wishRerolls??0)+1;return {handled:true};
    }
    case 'readMutations':for(const n of e.notifications)n.read=true;return {handled:true};
    case 'leaveWeather':delete e.weather;return {handled:true};
    case 'shareWeather':throw Error('请在联机房间内选择共享天气');
  }
  return {handled:false};
}
export function validateSocial(s:GardenState):void {
  const e=s.economy;if(!e)return;
  const n=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0;
  if(e.appearances){const a=e.appearances;if(!a.owned||!a.equipped||Object.entries(a.owned).some(([id,v])=>!appearance(id)||v!==true)||Object.entries(a.equipped).some(([id,actor])=>!appearance(id)||!a.owned[id as keyof typeof a.owned]||typeof actor!=='string'||!Object.hasOwn(s.life?.characters??{},actor)))throw Error('外观收藏或装配记录损坏');}
  if(e.version!==4||!e.furniture||!e.purchases||!e.tutorial||!Array.isArray(e.notifications)||!Array.isArray(e.weatherHistory)||!Array.isArray(e.wishClaims)||!e.wishBaseline||!n(e.day)||!n(e.tokens)||!n(e.draws)||!n(e.rareMisses)||e.rareMisses>=10||!n(e.epicMisses)||e.epicMisses>=20||Object.values(e.furniture).some(x=>!n(x)))throw Error('新版社交经济存档损坏');
  if(e.furnitureReservation&&(!n(e.furnitureReservation.price)||e.furnitureReservation.price===0||!n(e.furnitureReservation.expiresAt)||(!FURNITURE_SHOP.some(x=>x.id===e.furnitureReservation!.item)&&!RETIRED_FURNITURE.includes(e.furnitureReservation.item))||typeof e.furnitureReservation.owner!=='string'))throw Error('家具预留记录损坏');
  if(e.wishes&&(!Array.isArray(e.wishes)||e.wishes.length>2||e.wishes.some(w=>!w||!Object.hasOwn(SOCIAL_WISHES,w.kind)||typeof w.id!=='string'||typeof w.label!=='string'||typeof w.done!=='boolean'||!n(w.createdAt))))throw Error('社交心愿记录损坏');
  if(e.travel){const t=e.travel;const trip=(p:NonNullable<typeof t.active>)=>p&&typeof p.id==='string'&&Object.hasOwn(SOCIAL_TRIPS,p.city)&&Array.isArray(p.actors)&&p.actors.length>=1&&p.actors.length<=2&&new Set(p.actors).size===p.actors.length&&p.actors.every(id=>typeof id==='string')&&n(p.startedAt)&&n(p.readyAt)&&p.readyAt>p.startedAt&&typeof p.tutorial==='boolean';if(!n(t.week)||!n(t.starts)||t.starts>2||!t.counts||Object.values(t.counts).some(x=>!n(x))||!Array.isArray(t.history)||t.history.length>100||t.history.some(p=>!trip(p)||!n(p.claimedAt))||t.active&&!trip(t.active))throw Error('旅行记录损坏');}
}
