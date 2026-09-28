import { SPECIES, type Species } from '../../shared/garden';
import { SPRAYS, FOOD_ICONS, nextGardenDay, type GardenVisit, type SprayKind } from '../../shared/garden-life';
import type { ContactPerson, ContactSnapshot, SocialApi, ContactAction } from '../../shared/social';

const recent = (p: ContactPerson) => !!p.interactedAt && Date.now() - p.interactedAt < 30 * 86400000;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };

export function mountContacts(host: HTMLElement, steam: HTMLElement, api: SocialApi, toast: (s: string) => void, canInvite: () => boolean, changed: () => void) {
  let state: ContactSnapshot = {available:false,reason:'点击刷新，找回一起玩过的朋友',people:[],invitations:[]};
  let tab = 'online', busy = false, disposed = false, revision = 0;
  host.innerHTML = '<div class="section-heading"><div><span class="eyebrow">一起玩</span><h2>在线好友 <span id="online-count" class="badge"></span></h2></div><button id="refresh-contacts">刷新</button></div><div class="friend-tabs" role="tablist"><button data-contact-tab="online">在线</button><button data-contact-tab="friends">全部好友</button><button data-contact-tab="recent">最近见过</button><button data-contact-tab="steam">Steam 好友</button></div><p class="muted" id="contact-status"></p><div id="contact-invitations"></div><div id="contact-people"></div><div id="contact-steam" hidden></div>';
  host.querySelector('#contact-steam')!.append(steam);
  const expanded=new Set<string>();
  const visits=new Map<string,GardenVisit>();
  const pending=new Set<string>();
  const failures=new Set<string>();
  const list = host.querySelector<HTMLElement>('#contact-people')!;
  async function action(fn: () => Promise<unknown>, message?: string) {
    if (busy) return;
    busy = true; render();
    try { await fn(); if(message)toast(message); changed(); }
    catch(e) { toast(String(e)); }
    finally { busy = false; if(!disposed)render(); }
  }
  function button(label: string, fn: () => Promise<unknown>, enabled = true, message?: string) {
    const b = el('button', label); b.disabled = busy || !enabled;
    b.onclick = () => void action(fn, message);if(label==='邀请来玩')b.title=enabled?'邀请朋友到当前小屋；还没有房间时会先创建私密小屋':'请连接服务、退出本地试演，并确认好友在线';return b;
  }
  function contactAction(p: ContactPerson, command: ContactAction) { return api.contactAction(p.id, command); }
  async function loadVisit(id:string) {
    if(pending.has(id))return;pending.add(id);failures.delete(id);
    try { visits.set(id,await window.qbot.garden.visit(id,true)); }
    catch { failures.add(id); }
    finally {pending.delete(id);if(!disposed)render();}
  }
  function detail(p:ContactPerson) {
    const panel=el('div');panel.className='friend-detail';panel.id='friend-detail-'+p.id;
    panel.append(el('h3','今日商店'));
    const v=visits.get(p.id);
    if(failures.has(p.id)){panel.append(el('p','暂时无法读取商店'),button('重试',()=>loadVisit(p.id)));return panel;}
    if(!v){panel.append(el('p','正在查看今日货架…'));return panel;}
    panel.append(el('small',(v.actorName||p.character)+' · Lv.'+v.actorLevel));
    if(v.shopOpen===false)panel.append(el('p','朋友暂未开放商店'));
    else {
      const shelf=el('div');shelf.className='friend-shelf';
      for(const o of v.offers){const item=el('div');item.className='friend-offer'+(o.kind==='spray'?' special':'');
        item.append(el('span',o.kind==='spray'?'🧴':FOOD_ICONS[o.item as Species]),el('strong',o.kind==='spray'?SPRAYS[o.item as SprayKind].name:SPECIES[o.item as Species].name+'种子'),el('small','◉ '+o.price));shelf.append(item);}
      panel.append(shelf);if(!v.offers.length)panel.append(el('p','今日暂无商品'));
      panel.append(el('small','每日 04:00 换新 · 下次 '+new Date(nextGardenDay(v.day)).toLocaleString('zh-CN')));
    }
    const actions=el('div');actions.className='detail-actions';
    if(v.landOpen!==false||v.shopOpen!==false)actions.append(button('拜访花园 / 商店',async()=>window.qbot.garden.open('visit:'+p.id),state.available));
    if(p.relation==='friend')actions.append(button('删除好友',async()=>{if(confirm('不再将 '+p.nickname+' 列为游戏好友？'))await contactAction(p,'remove');},state.available));
    panel.append(actions);return panel;
  }
  function render() {
    if(disposed)return;
    host.querySelectorAll<HTMLButtonElement>('[data-contact-tab]').forEach(b=>{b.classList.toggle('selected', b.dataset.contactTab===tab);b.setAttribute('aria-selected',String(b.dataset.contactTab===tab));});
    host.querySelector<HTMLElement>('#contact-steam')!.hidden = tab !== 'steam';
    list.hidden = tab === 'steam';
    const requests=state.people.filter(p=>p.relation==='incoming').length;
    host.querySelector('[data-contact-tab=friends]')!.textContent=requests?'全部好友 · '+requests+' 个申请':'全部好友';
    host.querySelector('#contact-status')!.textContent = state.reason || '';
    host.querySelector('#online-count')!.textContent=state.available?String(state.people.filter(p=>p.relation==='friend'&&p.online).length):'状态未知';
    const invitations=host.querySelector('#contact-invitations')!; invitations.replaceChildren();
    for(const invite of state.invitations.filter(x=>x.expiresAt>Date.now())){
      if(invite.pair){const row=el('div');row.className='contact-invitation';row.append(el('span',`${invite.nickname} 想和你${invite.pair.label}`),button(invite.pair.kind==='relay'?'开心接力':'一起玩',()=>window.qbot.garden.answerInteraction(invite.id,true,invite.pair?.kind==='relay'?'happy':undefined),state.available),button('暂时不了',()=>window.qbot.garden.answerInteraction(invite.id,false),state.available));if(invite.pair.kind==='relay')row.append(button('用小心心接力',()=>window.qbot.garden.answerInteraction(invite.id,true,'heart'),state.available),button('挥手回应',()=>window.qbot.garden.answerInteraction(invite.id,true,'wave'),state.available));invitations.append(row);continue;}
      if(invite.garden){const row=el('div');row.className='contact-invitation';row.append(el('span',`${invite.nickname} 邀你培育：${invite.garden.label}`),button('看果实 · 一起培育',async()=>{window.qbot.garden.open('visit:'+invite.garden!.owner+(invite.garden!.plant?':'+invite.garden!.plot+':'+invite.garden!.plant:''));},state.available),button('收起',()=>api.contactInvitation(invite.id,false),state.available));invitations.append(row);continue;}
      const row=el('div');row.className='contact-invitation';row.append(el('span',`${invite.nickname} 邀请你去小屋坐坐`),button('接受邀请',()=>api.contactInvitation(invite.id,true),state.available),button('忽略',()=>api.contactInvitation(invite.id,false),state.available));invitations.append(row);
    }
    list.replaceChildren();
    let people = state.people.filter(p => tab==='online' ? p.relation==='friend'&&p.online&&state.available : tab==='recent' ? !!p.seenAt : p.relation !== 'none');
    people.sort((a,b)=>tab==='recent' ? Number(recent(b))-Number(recent(a)) || (recent(a)&&recent(b)?(b.interactedAt||0)-(a.interactedAt||0):0) || (b.seenAt||0)-(a.seenAt||0) : Number(b.relation==='incoming')-Number(a.relation==='incoming') || Number(b.online)-Number(a.online) || a.nickname.localeCompare(b.nickname));
    if(!people.length) { const empty=el('p',tab==='online'?'暂时没有好友在线，可以到下方世界广场逛逛。':tab==='recent'?'还没有见过的玩家。去世界广场加入一间小屋吧。':'还没有游戏好友。在房间成员或「最近见过」里向朋友发出申请。');empty.className='empty';list.append(empty); }
    for(const p of people){
      const row=el('article');row.className='contact-row';row.dataset.contactId=p.id;
      const avatar=el('span',p.nickname.slice(0,1)||'友');avatar.className='avatar-dot'+(p.online&&state.available?' online':'');
      const info=el('div');info.className='contact-info';const name=el('button',p.nickname+' ›');name.className='contact-name';name.setAttribute('aria-expanded',String(expanded.has(p.id)));name.setAttribute('aria-controls','friend-detail-'+p.id);name.onclick=()=>{if(expanded.has(p.id))expanded.delete(p.id);else{expanded.add(p.id);void loadVisit(p.id);}render();};info.append(name);
      if(tab==='recent'&&recent(p)){const badge=el('span','最近互动过');badge.className='interaction-badge';info.append(badge);}
      info.append(el('small',`${state.available?(p.online?'在线':'离线'):'状态未知'}${p.character?' · '+p.character:''}`));
      const title=el('span',p.title);title.className='title-slot';info.append(title);
      if(tab==='recent'&&p.seenAt) info.append(el('small',`最近见于 ${new Date(p.seenAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`));
      const actions=el('div');actions.className='contact-actions';

      if(p.relation==='incoming') { info.append(el('small','想成为你的好友'));actions.append(button('接受',()=>contactAction(p,'accept'),state.available,'已成为游戏好友'),button('拒绝',()=>contactAction(p,'reject'),state.available)); }
      else if(p.relation==='outgoing') { info.append(el('small','等待对方接受'));actions.append(button('取消申请',()=>contactAction(p,'cancel'),state.available)); }
      else if(p.relation==='friend') { actions.append(button('邀请来玩',()=>contactAction(p,'invite'),state.available&&p.online&&canInvite(),'邀请已送达，等待朋友接受')); }
      else actions.append(button('加好友',()=>contactAction(p,'request'),state.available,'好友申请已发送'));
      if(!p.online || !state.available) actions.append(button('角色试演',()=>api.rehearseContact(p.id),true,'邀请的是缓存角色，回应为本地模拟'));
      row.append(avatar,info,actions);const card=el('div');card.className='contact-card';card.append(row);if(expanded.has(p.id))card.append(detail(p));list.append(card);
    }
    host.querySelector<HTMLButtonElement>('#refresh-contacts')!.disabled=busy;
  }
  const off=api.onContacts(value=>{revision++;state=value;render();});
  host.querySelectorAll<HTMLButtonElement>('[data-contact-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.contactTab!;render();});
  host.querySelector<HTMLButtonElement>('#refresh-contacts')!.onclick=()=>void action(async()=>{state=await api.contacts(true);});
  const version=revision;void api.contacts().then(value=>{if(revision===version){state=value;render();}}).catch(e=>toast(String(e)));
  render();
  const expiryTimer=setInterval(render,30000);
  return {refresh:render, dispose(){disposed=true;clearInterval(expiryTimer);off();}};
}
