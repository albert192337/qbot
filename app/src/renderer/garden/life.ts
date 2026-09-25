import {SPECIES,growthLabel,TRAITS,TIER_NAMES,traitSlot,needsReveal,canBreed,type GardenState,type GardenCommand,type Produce,type Trait,type Plant} from '../../shared/garden';
import {COOP_RULES,SPRAYS,DYE_COLORS,FOOD_ICONS,CHARACTER_XP,CHARACTER_UNLOCKS,characterLevel,currentGrowth,dailyOffers,nextGardenDay,sprayPool,wishMatches,wishLabel,coopRareChance,type SprayKind,type GardenVisit} from '../../shared/garden-life';
import './life.css';
type Context={state:GardenState;act:(c:GardenCommand)=>Promise<void>;go:(p:string)=>void;refresh:()=>Promise<void>;notice:(s:string)=>void;busy:boolean;plantArt:(p:Plant)=>HTMLElement};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
function btn(text:string,fn:()=>unknown,disabled=false){const b=el('button',text);b.disabled=disabled;b.onclick=()=>{const result=fn();if(result instanceof Promise)void result.catch(e=>alert(String(e)));};return b;}
function card(title:string,description:string){const c=el('article','','card life-card');c.append(el('h3',title),el('p',description,'muted'));return c;}
function poolDetails(kind:SprayKind):HTMLElement {const pool=sprayPool(kind),total=pool.reduce((n,p)=>n+p.weight,0),details=el('details');details.append(el('summary','可能获得与概率'));for(const p of pool)details.append(el('p',`${p.trait?TRAITS[p.trait].name:DYE_COLORS[p.dye!].name} · ${(100*p.weight/total).toFixed(1)}%`));return details;}
function badge(p:Produce){return `${FOOD_ICONS[p.species]} ${SPECIES[p.species].name} · ${p.traits.map(t=>TRAITS[t].name).join(' / ')||'原生'}`;}
export function applyDye(node:HTMLElement,p:Produce):HTMLElement {if(p.dye&&DYE_COLORS[p.dye]){node.dataset.dye=p.dye;node.style.setProperty('--dye-hue',DYE_COLORS[p.dye].hue+'deg');node.title=DYE_COLORS[p.dye].name+'染色';}return node;}
export function renderDaily(host:HTMLElement,c:Context,owner=c.state.life?.owner,visit?:GardenVisit):void{
  const l=c.state.life;if(!l||!owner){host.append(el('p','请重新打开花园，初始化每日商店。'));return;}
  const day=visit?.day??l.day;
  if(!visit&&c.state.v3)host.append(el('p','每天为你留一包免费的草莓种子，已经放进背包。基础种植可以慢慢来。','muted'));
  host.append(el('h2',visit?`${visit.name}的今日商店`:'今日小店'),el('p',`每日 04:00 换新 · 下次 ${new Date(nextGardenDay(day)).toLocaleString('zh-CN')} · 今日珍稀喷雾 ${l.rareBought}/3`,'muted'));
  const grid=el('div','','grid');
  for(const o of visit?.offers??dailyOffers(owner,day)){
    const used=l.purchases[`${owner}/${o.id}`]??0,remaining=Math.max(0,o.limit-used),spray=o.kind==='spray'?SPRAYS[o.item as SprayKind]:undefined;
    const item=card(spray?'🧴 '+spray.name:FOOD_ICONS[o.item as keyof typeof SPECIES]+' '+SPECIES[o.item as keyof typeof SPECIES].name+'种子',spray?.description??'带回自己的花园种下');
    if(spray)item.append(poolDetails(o.item as SprayKind));else item.append(el('small',growthLabel(o.item as keyof typeof SPECIES,c.state)));
    item.append(el('small',`你还可买 ${remaining} 份`),btn(`◉ ${o.price} · 带回家`,()=>c.act({type:'buyDaily',owner,offer:o.id}),c.busy||!remaining||c.state.coins<o.price||!!spray&&l.rareBought>=3));grid.append(item);
  }
  host.append(grid);
  if(!visit)host.append(btn('去朋友的小店看看',()=>c.go('friends')));
}
const settlingSprays=new Set<string>();
export function renderSprays(host:HTMLElement,c:Context,target?:string):void{
  const l=c.state.life;if(!l)return;
  host.append(el('h2','给地里的作物换个模样'),el('p','使用后随机结果立即生效，同槽位满时自动替换最早的词条。纯染色不增加词条或售价。','muted'));
  const pending=l.pending;
  if(pending){
    host.append(el('p','正在应用已保存的喷雾结果…'));
    if(!settlingSprays.has(pending.id)){
      settlingSprays.add(pending.id);
      const p=c.state.produce.find(p=>p.id===pending.target)??c.state.plots.find(p=>p?.id===pending.target);
      const replace=pending.trait?p?.traits.find(t=>traitSlot(t)===traitSlot(pending.trait!)):undefined;
      queueMicrotask(()=>void c.act({type:'resolveSpray',id:pending.id,accept:true,replace}).finally(()=>settlingSprays.delete(pending.id)));
    }
    return;
  }  const plant=c.state.plots.find(p=>p?.id===target);
  if(!plant){host.append(el('p','点击地里成熟的作物，在详情中选择「使用喷雾」。收获篮中的果实不能喷雾。'),btn('去我的土地',()=>c.go('plots')));return;}

  const grid=el('div','','grid');
  for(const kind of Object.keys(SPRAYS) as SprayKind[]){const n=l.sprays[kind]??0;if(!n)continue;const spray=SPRAYS[kind],item=card(`🧴 ${spray.name} ×${n}`,spray.description);
    item.append(poolDetails(kind));
    item.append(btn('使用'+spray.name,()=>c.act({type:'spray',kind,target:plant.id}),c.busy||plant.readyAt>Date.now()||!!plant.locked||needsReveal(plant)||!!plant.cultivation));grid.append(item);
  }
  if(!grid.children.length)grid.append(el('p','还没有喷雾。去每日商店看看，或参加朋友的培育。','empty'));host.append(grid,btn('逛今日商店',()=>c.go('daily')));
}
export function renderFeeding(host:HTMLElement,c:Context):void{
  const growth=currentGrowth(c.state);host.append(el('h2','今天想吃点什么？'));
  if(!growth){host.append(el('p','先在角色管理中选择自己的角色，再来看看它的心愿。'));return;}
  const lv=characterLevel(growth.xp);host.append(el('h3',`角色 Lv.${lv} · ${growth.xp} 经验`));
  const identity=el('p','当前角色的心愿','muted');host.append(identity);void window.qbot.characters.getActive().then(meta=>{if(identity.isConnected&&meta&&meta.dirId===c.state.activeActor)identity.textContent=meta.manifest.name+'今天的心愿';}).catch(()=>{});
  const progress=el('progress');progress.max=lv<CHARACTER_XP.length?CHARACTER_XP[lv]-CHARACTER_XP[lv-1]:1;progress.value=lv<CHARACTER_XP.length?growth.xp-CHARACTER_XP[lv-1]:1;host.append(progress,el('p','每天两份日常心愿＋一份词条心愿。错过不掉级，每天可以免费换一份。','muted'));
  const grid=el('div','','grid');
  for(const w of growth.wishes){const item=card(`${FOOD_ICONS[w.species]} ${wishLabel(w)}`,w.done?'今天已经吃到了，真开心！':`完成获得 ${w.xp} 角色经验`);
    if(!w.done){const choices=c.state.produce.filter(p=>wishMatches(w,p)&&c.state.life?.pending?.target!==p.id&&(!c.state.v3?.appraisals[p.id]||c.state.v3.appraisals[p.id].done)).sort((a,b)=>a.value-b.value);const select=el('select');select.setAttribute('aria-label',wishLabel(w)+'提交果实');select.append(new Option(choices.length?'选择要投喂的果实':'还缺符合要求的收获',''));
      for(const p of choices)select.append(new Option(`${badge(p)} · 售价 ${p.value} · ${p.kg.toFixed(2)}kg${canBreed(p)?' · 可繁育亲本':''}`,p.id));
      const feed=btn('投喂这颗果实',async()=>{const p=choices.find(x=>x.id===select.value);if(p&&confirm(`把这颗${badge(p)}喂给当前角色？\n会消耗该果实，获得 ${w.xp} 经验。`))await c.act({type:'feed',wish:w.id,produce:p.id});},true);
      select.onchange=()=>{feed.disabled=c.busy||!select.value;};item.append(select,feed);
      if(!choices.length){const same=c.state.produce.some(p=>p.species===w.species&&!p.locked&&!needsReveal(p));item.append(el('small',same&&w.traits.length?'已有这种水果，还缺词条：'+w.traits.map(t=>TRAITS[t].name).join('＋'):'还没有可投喂的'+SPECIES[w.species].name),btn('找种子和喷雾',()=>c.go('daily')));}
      item.append(btn('换个心愿',()=>c.act({type:'rerollWish',wish:w.id}),c.busy||growth.rerolled));
    }grid.append(item);
  }host.append(grid,el('h2','一起玩的新方式'));
  const previews={flower:'🌷 一朵花慢慢来到朋友身边，对方开心回应',photo:'📷 两位角色在相框里留下这一刻',relay:'💬 你先表达，朋友选开心、心心或挥手来接力',celebrate:'🎉 一起用动作和彩纸庆祝小小成果'};
  const unlocks=el('div','','unlock-grid');for(const u of CHARACTER_UNLOCKS){const item=card(`${lv>=u.level?'✦':'○'} Lv.${u.level} · ${u.name}`,previews[u.kind]);item.append(el('small',`从零开始：每天完成基础心愿约 ${Math.ceil(CHARACTER_XP[u.level-1]/20)} 天，全部完成约 ${Math.ceil(CHARACTER_XP[u.level-1]/40)} 天（需要备好水果）`));if(lv>=u.level)item.append(btn('找朋友一起玩',()=>window.qbot.rooms.open()));unlocks.append(item);}host.append(unlocks);
}
export function renderFriends(host:HTMLElement,c:Context):void{
  host.append(el('h2','朋友的花园与小店'));
  for(const t of c.state.cooperations??[])if(t.done){const reward=card('共同培育完成了','即使主人已经收获，你的助育奖励仍可领取。');reward.append(btn('领取助育奖励',async()=>{await window.qbot.garden.cooperate(t.owner,t.plot,'claim',undefined,t.id);await c.refresh();},c.busy));host.append(reward);}
  if(c.state.rehearsal){host.append(el('p','本地试演：自己的土地使用本地收藏副本，其他角色使用虚拟花园；操作不会写回正式存档。'),btn('我的模拟土地',()=>c.go('plots')));for(const m of c.state.rehearsal.members.filter(m=>m.id!==c.state.life?.owner)){const row=card(m.name,'测试角色 · 虚拟花园与商店');row.append(btn('看土地 / 逛商店',()=>c.go('visit:'+m.id)));host.append(row);}return;}
  if(!c.state.online){host.append(el('p','联机花园由服务器保存，每个人都有自己的每日货架。现有本地收藏会完整保留，开通后从新的联机花园开始。'),btn('开通 / 进入联机花园',async()=>{await window.qbot.garden.online(true);await c.refresh();},c.busy));return;}
  for(const scope of ['land','shop'] as const){const privacy=el('select');for(const [v,n] of [['private','仅自己'],['friends','仅好友'],['public','所有人']])privacy.append(new Option(n,v));privacy.value=(scope==='shop'?c.state.life?.shopVisibility:undefined)??c.state.life?.visibility??'friends';privacy.onchange=()=>void c.act({type:'gardenVisibility',scope,visibility:privacy.value as 'friends'});host.append(el('label',scope==='land'?'土地查看范围':'商店购物范围'),privacy);}host.append(btn('返回本地收藏花园',async()=>{await window.qbot.garden.online(false);await c.refresh();}));
  if(c.state.v3){host.append(el('h3',`向日葵伙伴 ${c.state.v3.sunPartners.length}/2`),el('p','双方接受后，朋友地里有向日葵时，为你下一轮果实增加 0.03 重量倍率，最多 +0.06。可以随时解除。'));for(const id of c.state.v3.sunPartners)host.append(btn('回访伙伴',()=>c.go('visit:'+id)),btn('解除绑定',()=>c.act({type:'sunRemove',target:id})));for(const id of c.state.v3.sunRequests??[])host.append(btn('看看邀请者',()=>c.go('visit:'+id)),btn('接受向日葵邀请',()=>c.act({type:'sunAnswer',target:id,accept:true})),btn('婉拒',()=>c.act({type:'sunAnswer',target:id,accept:false})));}
  const list=el('div','','grid');host.append(list);void window.qbot.social.contacts(true).then(s=>{if(!host.isConnected)return;for(const p of s.people.filter(p=>p.relation==='friend')){const row=card(p.nickname,p.online?'在线 · 去看看今日有什么':'离线 · 开放的商店仍可访问');row.append(btn('看土地 / 逛商店',()=>c.go('visit:'+p.id)));list.append(row);void window.qbot.garden.visit(p.id,true).then(v=>{if(!row.isConnected)return;row.append(el('small',`${v.actorName??p.character} · Lv.${v.actorLevel}`),el('p',v.shopOpen===false?'商店暂未开放':v.offers.filter(o=>o.kind==='spray').map(o=>{const left=o.limit-(c.state.life?.purchases[p.id+'/'+o.id]??0);return '🧴 '+SPRAYS[o.item as SprayKind].name+(left>0?' · 可购买':' · 已买过');}).join(' / ')));}).catch(()=>{if(row.isConnected)row.append(el('small','花园暂未开放'));});}if(!list.children.length)list.append(el('p','还没有游戏好友。在“一起玩”的朋友页认识伙伴吧。'));}).catch(e=>c.notice(String(e)));
}
export async function inviteGardenFriend(owner:string,plot:number,notice:(s:string)=>void):Promise<void>{
  const state=await window.qbot.garden.get();
  const friends=state.rehearsal?state.rehearsal.members.filter(m=>m.id!==state.life?.owner).map(m=>({id:m.id,nickname:m.name,online:true})):(await window.qbot.social.contacts(true)).people.filter(p=>p.relation==='friend');
  const dialog=el('dialog','','garden-invite-dialog');dialog.append(el('h2','邀请朋友一起培育'),el('p','消息只展示神秘果实，特性在培育完成后揭晓。','muted'));
  if(!friends.length)dialog.append(el('p','还没有游戏好友，去“一起玩”认识伙伴吧。'));
  for(const p of friends)dialog.append(btn(p.nickname+(p.online?' · 在线':' · 离线'),async()=>{try{await window.qbot.garden.cooperate(owner,plot,'invite',p.id);notice(state.rehearsal?'测试伙伴已加入待培育名单':'邀请已送达');dialog.close();dialog.remove();}catch(e){notice(String(e));}}));
  dialog.append(btn('关闭',()=>{dialog.close();dialog.remove();}));dialog.oncancel=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}
export function renderVisit(host:HTMLElement,c:Context,address:string):void{
  const [owner,,targetTask]=address.startsWith('test:')?[address]:address.split(':');
  host.append(el('h2','朋友的花园'),btn('← 返回朋友',()=>c.go('friends')));
  const body=el('div');host.append(body);let fetching=false,joined:number|undefined;
  const draw=(v:GardenVisit)=>{
    if(!host.isConnected)return;joined=v.tasks?.find(t=>!t.done&&(t.members[c.state.life?.owner??'']?.seenAt??0)+15000>Date.now())?.plot;body.replaceChildren(el('h2',v.name+'的花园名片'),el('p',`${v.actorName??'当前角色'} · Lv.${v.actorLevel} · 土地${v.landOpen===false?'未开放':'可查看'} · 商店${v.shopOpen===false?'未开放':'可购物'}`,'muted'));
    if(c.state.online&&!c.state.rehearsal&&owner!==c.state.life?.owner)body.append(btn('邀请成为向日葵伙伴',()=>c.act({type:'sunRequest',target:owner})));
    body.append(el('p',`今日还可领取 ${v.rewardsLeft??5} 次培育物资${v.rewardsLeft===0?'；仍可帮忙加速并留下共同记录':''}`));
    if(!c.state.online)body.append(el('p','你正在本地花园。进入联机花园后可购物和共同培育，本地收藏会保留。'),btn('进入联机花园',async()=>{await window.qbot.garden.online(true);await c.refresh();}));
    if(targetTask){const task=v.tasks?.find(t=>t.id===targetTask);if(task?.done){const done=card('这次共同培育已完成',task.fruit?badge(task.fruit):'果实已由主人收好');if(task.fruit)done.prepend(c.plantArt(task.fruit));done.append(el('p',`${Object.keys(task.members).length} 位伙伴留下了这段经历`),btn('领取我的助育奖励',async()=>{await window.qbot.garden.cooperate(owner,task.plot,'claim',undefined,task.id);await c.refresh();}));body.append(done);}else if(!v.plots.some(p=>p?.id===targetTask))body.append(el('p','这颗果实已不在地里，可以去朋友的花园看看近况。'));}
    const grid=el('div','','grid');v.plots.forEach((p,i)=>{if(targetTask&&p?.id!==targetTask)return;const item=card(`${i+1}号地 · ${p?FOOD_ICONS[p.species]+' '+SPECIES[p.species].name:'空土地'}`,p?needsReveal(p)?'？ ？ ？ · 培育后揭晓':p.traits.map(t=>TRAITS[t].name+'（'+TIER_NAMES[TRAITS[t].tier]+'）').join(' / ')||'原生':'还没有种下植物');if(p){item.prepend(c.plantArt(p));const t=v.tasks?.find(t=>t.plant===p.id);if(needsReveal(p)||t){const active=Object.values(t?.members??{}).filter(m=>m.seenAt+15000>Date.now()).length;item.append(el('p',t?.done?'已经揭晓':`？ 可一起培育 · ${active} 人正在参与 · ${Math.ceil((t?.remaining??COOP_RULES.work)/(360*Math.max(1,active)))} 秒${active?'':'（单人）'}`));
        const qualified=Object.values(t?.members??{}).filter(m=>m.seconds>=COOP_RULES.minSeconds&&m.work>=COOP_RULES.work*COOP_RULES.minContribution).length;item.append(el('small',`${qualified} 位已达标 · 好奖励 ${(100*coopRareChance(qualified)).toFixed(1)}%（最终以达标人数计算）`));
        const me=t?.members[c.state.life?.owner??''],needSeconds=Math.max(0,COOP_RULES.minSeconds-(me?.seconds??0),(COOP_RULES.work*COOP_RULES.minContribution-(me?.work??0))/360),remainingSeconds=(t?.remaining??COOP_RULES.work)/(360*Math.max(1,active+(joined===i?0:1)));
        if(!t?.done)item.append(el('small',remainingSeconds<needSeconds?'剩余工作可能不足奖励资格，仍欢迎来陪伴':`再参与约 ${Math.ceil(needSeconds)} 秒可达个人奖励资格`),btn(joined===i?'暂停参与':'培育',async()=>{const action=joined===i?'leave':'join';const next=await window.qbot.garden.cooperate(owner,i,action);joined=action==='join'?i:undefined;draw(next);},!c.state.online));
        else {const claimed=t.claimed.includes(c.state.life?.owner??''),eligible=!!me&&me.seconds>=COOP_RULES.minSeconds&&me.work>=COOP_RULES.work*COOP_RULES.minContribution;item.append(btn(claimed?'已领取':eligible?'领取我的助育奖励':'本次贡献未达到领取资格',async()=>{draw(await window.qbot.garden.cooperate(owner,i,'claim'));c.notice('奖励已经放入联机背包');},!c.state.online||claimed||!eligible||v.rewardsLeft===0));}
      }else item.append(el('p',p.readyAt<=Date.now()?'已经成熟':'正在生长'));}grid.append(item);});body.append(grid);if(c.state.online&&v.shopOpen!==false)renderDaily(body,c,owner,v);
  };
  const poll=async()=>{if(fetching||document.hidden)return;fetching=true;try{draw(await window.qbot.garden.visit(owner,false,targetTask));}catch(e){body.replaceChildren(el('p',String(e)),btn('重试',()=>poll()));joined=undefined;}finally{fetching=false;}};
  void poll();const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);if(joined!==undefined)void window.qbot.garden.cooperate(owner,joined,'leave').catch(()=>{});return;}void poll();},5000);
}
