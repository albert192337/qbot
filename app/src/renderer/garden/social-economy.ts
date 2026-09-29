import type { CharacterMeta } from '../../shared/ipc-types';
import type { GardenState, GardenCommand } from '../../shared/garden';
import { CAPSULE, FURNITURE_SHOP, furnitureOffers, SOCIAL_WISHES, SOCIAL_TRIPS, REGIONAL_FURNITURE, type TripCity, nativeSocialWeather } from '../../shared/social-economy';
import { V3_WEATHER } from '../../shared/garden-v3';
import { furnitureThumbnail } from '../furniture/catalog';
import './social-economy.css';
type Act=(c:GardenCommand)=>Promise<void>;
const el=(tag:string,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const btn=(text:string,fn:()=>unknown,disabled=false)=>{const b=document.createElement('button');b.textContent=text;b.disabled=disabled;b.onclick=()=>{void fn();};return b;};
function thumbnail(id:string,name:string){return furnitureThumbnail(id,name);}
export function renderFurnitureShop(host:HTMLElement,s:GardenState,act:Act,owner=s.life?.owner,day=s.economy?.day){
  if(!s.economy||!owner||day===undefined)return;
  const e=s.economy,section=el('section','','social-economy');section.append(el('h2','家具小店'),el('p','每天 04:00 换新。珍稀家具出现率 8%；每天最多买一件珍稀家具。朋友货架的购买名额各自独立。'));
  const grid=el('div','','economy-grid');
  for(const item of furnitureOffers(owner,day)){
    const row=el('article','','economy-item');row.append(thumbnail(item.id,item.name),el('h3',item.name),el('p',`${item.tier==='common'?'日常家具':'珍稀家具'} · 已有 ${e.furniture[item.id]??0} 件`),btn(`购买 · ${item.price} 花园币`,()=>act({type:'buyFurniture',owner,item:item.id}),s.coins<item.price||!!e.purchases[`${owner}:${item.id}`]||item.tier!=='common'&&e.rareBought>=1));if(item.tier!=='common')row.append(btn('预留72小时 · 替换上次预留',()=>act({type:'reserveFurniture',owner,item:item.id})));grid.append(row);
  }
  section.append(grid);
  const hold=e.furnitureReservation;if(hold&&hold.expiresAt>Date.now()&&owner===s.life?.owner){const item=FURNITURE_SHOP.find(x=>x.id===hold.item);section.append(el('h3','替你留好的家具'),el('p',`${item?.name??hold.item} · ${new Date(hold.expiresAt).toLocaleString()} 前有效`),btn(`购买预留 · ${hold.price} 花园币`,()=>act({type:'buyFurniture',owner:hold.owner,item:hold.item}),s.coins<hold.price||e.rareBought>=1));}
  host.append(section);
}
export {renderCapsule} from './capsule';
export function renderSocialGuide(host:HTMLElement,s:GardenState,act:Act,go:(p:string)=>void){
  const e=s.economy;if(!e)return;const section=el('section','','social-economy social-guide');
  if(!e.tutorial.bred){
    const arrival=el('p');
    section.append(el('h2','先找伙伴，再一起种花'),el('p','邀请自己的角色上桌，或进入公共房间认识伙伴。陪伴角色会标明身份，也可以一个人继续。'),btn('邀请伙伴 / 进入公共房间',()=>window.qbot.rooms.open()),btn('第一次做客 · 陪伴角色房间',async()=>{
      arrival.textContent='正在找有空位的陪伴角色房间…';
      try{if(!(await window.qbot.social.prepareJoin())){arrival.textContent='准备好角色后，随时可以再来。';return;}
        const status=await window.qbot.rooms.getStatus();if(status.phase==='in-room'){window.qbot.rooms.open();arrival.textContent='你已经在房间里，可以邀请伙伴一起种植。';return;}
        const room=(await window.qbot.rooms.list()).find(r=>r.companion&&r.online<r.capacity);if(!room)throw Error('暂时没有空位，试试公共房间列表');
        await window.qbot.rooms.join(room.roomId);window.qbot.rooms.open();arrival.textContent='已经来到陪伴角色的房间。可以打招呼，也可以去看花园。';
      }catch(error){arrival.textContent=error instanceof Error?error.message:String(error);}
    }),arrival);
    if(!e.tutorial.claimed)section.append(btn('领取金色亲本与新手加速肥',()=>act({type:'socialStarter'})));
    else {const index=s.plots.findIndex(p=>p?.id===e.tutorial.seed);section.append(el('p','背包里的金色亲本留着繁育；种下金色种子，用新手加速肥，5 秒后就能和它繁育。金色门槛在后续仍然保留。'),btn('去种植',()=>go('plots')));if(index>=0&&e.tutorial.fertilizer)section.append(btn('使用新手加速肥',()=>act({type:'tutorialSpeed',plot:index})));}
  }
  section.append(el('h3',`今天想一起做的事 · 奖励 ${e.wishClaims.length}/2`));
  for(const wish of e.wishes??[]){
    const kind=wish.kind,key=kind==='harvest'?'socialHarvest':kind;
    const done=(s.v3?.counters[key]??0)>(e.wishBaseline[key]??0)&&(!wish.target||kind==='furniture'? !wish.target||!!e.furniture[wish.target]:s.v3?.records.some(r=>r.kind==='visit'&&r.peer===wish.target&&r.at>=wish.createdAt));
    const row=el('div');row.append(btn(`${wish.done?'✓ ':''}${wish.label}${done&&!wish.done?' · 领取20币':''}`,()=>act({type:'socialWish',kind}),!done||wish.done||e.wishClaims.length>=2));
    if(!wish.done){if(kind==='visit'&&wish.target)row.append(btn('去找这位朋友',()=>go('visit:'+wish.target)));if(kind==='furniture')row.append(btn('去小店看看',()=>go('daily')));row.append(btn('换一个',()=>act({type:'rerollSocialWish',id:wish.id}),(e.wishRerolls??0)>=2));}section.append(row);
  }
  const unread=e.notifications.filter(n=>!n.read);if(unread.length){section.append(el('h3',`花园发生了 ${unread.length} 件新变化`));for(const n of unread.slice(-3))section.append(el('p',n.text));section.append(btn('知道啦',()=>act({type:'readMutations'})));}
  host.append(section);
}
const tripArt={kyoto:new URL('./assets/travel/kyoto.png',import.meta.url).href,paris:new URL('./assets/travel/paris.png',import.meta.url).href,island:new URL('./assets/travel/island.png',import.meta.url).href};
export function renderSocialTravel(host:HTMLElement,s:GardenState,characters:CharacterMeta[],act:Act,go:(p:string)=>void){
  const e=s.economy;if(!e)return;const travel=e.travel;
  host.append(btn('← 返回花园',()=>go('plots')),el('h2','和谁一起去旅行'),el('p','选 1～2 位已在花园出现过的自己的角色。每周可出发两次，人数不增加费用或奖励；出游期间仍可在桌面陪伴。'));
  const active=travel?.active;
  if(active){const card=el('section','','social-economy'),clock=el('p'),claim=btn('迎接旅行归来',()=>act({type:'tripClaim',id:active.id}),true);card.append(el('h3',SOCIAL_TRIPS[active.city].name+' · '+active.actors.map(id=>characters.find(c=>c.dirId===id)?.manifest.name??'旅行伙伴').join('、')),clock,claim);host.append(card);
    const tick=()=>{const remaining=Math.max(0,active.readyAt-Date.now());clock.textContent=remaining?`还有 ${Math.ceil(remaining/60000)} 分钟 · 可离线等待`:'已经归来，等你收好纪念品';claim.disabled=remaining>0;};tick();const timer=setInterval(()=>{if(!card.isConnected){clearInterval(timer);return;}tick();},1000);
  }else{
    const selected=new Set<string>(s.activeActor?[s.activeActor]:[]),selection=el('div','','social-economy');
    for(const c of characters.filter(c=>Object.hasOwn(s.life?.characters??{},c.dirId))){const label=el('label'),input=document.createElement('input');input.type='checkbox';input.checked=selected.has(c.dirId);input.onchange=()=>{if(input.checked&&selected.size>=2){input.checked=false;return;}input.checked?selected.add(c.dirId):selected.delete(c.dirId);};label.append(input,document.createTextNode(c.manifest.name+' '));selection.append(label);}host.append(selection);
    const grid=el('div','','economy-grid');for(const [city,d] of Object.entries(SOCIAL_TRIPS)){
      const card=el('article','','social-economy'),image=document.createElement('img');image.src=tripArt[city as TripCity];image.alt=d.name;image.style.cssText='width:100%;max-height:220px;object-fit:cover;border-radius:14px';card.append(image,el('h3',d.name),el('p',`${d.cost} 金币 · ${d.minutes} 分钟 · 已完成 ${travel?.counts[city as TripCity]??0} 次`),el('p',REGIONAL_FURNITURE.filter(x=>x.city===city).map(x=>`${x.trips} 次：${x.name}`).join('；')),btn('派出这支旅行小队',()=>act({type:'tripStart',city:city as TripCity,actors:[...selected]}),s.coins<d.cost||(travel?.starts??0)>=2));
      if(!travel?.tutorialDone)card.append(btn('初次短途 · 60 金币 / 10分钟',()=>act({type:'tripStart',city:city as TripCity,actors:[...selected],tutorial:true}),s.coins<60));grid.append(card);
    }host.append(grid);
  }
  host.append(el('h3','旅行手账'));for(const trip of [...(travel?.history??[])].reverse().slice(0,12))host.append(el('p',`${new Date(trip.claimedAt).toLocaleDateString()} · ${SOCIAL_TRIPS[trip.city].name} · ${trip.actors.map(id=>characters.find(c=>c.dirId===id)?.manifest.name??'旅行伙伴').join('、')} · 带回一包地区植物种子${trip.tutorial?'（初次短途不计家具累计次数）':''}`));
}
export function renderSocialWeather(host:HTMLElement,s:GardenState,act:Act){
  if(!s.economy)return;const native=nativeSocialWeather(Date.now(),s.life?.owner??'local'),w=s.economy.weather;
  const current=w&&w.acceptedAt+120000<=Date.now()&&w.end>Date.now()?w:native;
  host.append(el('h2',`${V3_WEATHER[current.kind].icon} ${V3_WEATHER[current.kind].name}`),el('p','个人天气每 30 分钟变化；每四天有一个固定珍稀时段，其他时段有 2% 珍稀概率。'),el('p','生长到 20%、40%、60%、80% 时各结算一次。共享天气进入满 2 分钟才生效，成熟植物不会重抽。'));
  if(w&&w.end>Date.now())host.append(el('p',`共享来源：${w.source} · ${new Date(w.end).toLocaleTimeString()} 结束${w.acceptedAt+120000>Date.now()?' · 正在等待生效':''}`),btn('恢复自己的天气',()=>act({type:'leaveWeather'})));
  if(s.roomWeather){host.append(el('h3','房间天气'),el('p','访客可以提供自己的天气。房主选定后，每位成员可自行加入共享。'));
    for(const source of s.roomWeather.sources)host.append(btn(`${source.name} · ${V3_WEATHER[source.kind].name}${s.roomWeather.active===source.id?' · 房间已选定':''}`,()=>act({type:'shareWeather',source:source.id}),!s.roomWeather.isHost&&s.roomWeather.active!==source.id&&source.id!==s.life?.owner));
  }else host.append(btn('进入房间共享天气',()=>window.qbot.rooms.open()));
}

