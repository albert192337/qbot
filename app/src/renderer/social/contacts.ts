import type { ContactPerson, ContactSnapshot, SocialApi, ContactAction } from '../../shared/social';

const recent = (p: ContactPerson) => !!p.interactedAt && Date.now() - p.interactedAt < 30 * 86400000;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };

export function mountContacts(host: HTMLElement, steam: HTMLElement, api: SocialApi, toast: (s: string) => void, canInvite: () => boolean, changed: () => void) {
  let state: ContactSnapshot = {available:false,reason:'点击刷新，找回一起玩过的朋友',people:[],invitations:[]};
  let tab = 'friends', busy = false, disposed = false, revision = 0;
  host.innerHTML = '<div class="section-heading"><div><span class="eyebrow">认识的人，记在这里</span><h2>朋友</h2></div><button id="refresh-contacts">刷新</button></div><div class="friend-tabs" role="tablist"><button data-contact-tab="friends">游戏好友</button><button data-contact-tab="recent">最近见过</button><button data-contact-tab="steam">Steam 好友</button></div><p class="muted" id="contact-status"></p><div id="contact-invitations"></div><div id="contact-people"></div><div id="contact-steam" hidden></div>';
  host.querySelector('#contact-steam')!.append(steam);
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
    b.onclick = () => void action(fn, message); return b;
  }
  function contactAction(p: ContactPerson, command: ContactAction) { return api.contactAction(p.id, command); }
  function render() {
    if(disposed)return;
    host.querySelectorAll<HTMLButtonElement>('[data-contact-tab]').forEach(b=>{b.classList.toggle('selected', b.dataset.contactTab===tab);b.setAttribute('aria-selected',String(b.dataset.contactTab===tab));});
    host.querySelector<HTMLElement>('#contact-steam')!.hidden = tab !== 'steam';
    list.hidden = tab === 'steam';
    host.querySelector('#contact-status')!.textContent = state.reason || (tab === 'recent' ? '真实同房的人会留在这里；近 30 天实际互动过的朋友优先展示。' : '双方确认后成为游戏好友，换角色也不会失联。');
    const invitations=host.querySelector('#contact-invitations')!; invitations.replaceChildren();
    for(const invite of state.invitations.filter(x=>x.expiresAt>Date.now())){
      const row=el('div');row.className='contact-invitation';row.append(el('span',`${invite.nickname} 邀请你去小屋坐坐`),button('接受邀请',()=>api.contactInvitation(invite.id,true),state.available),button('忽略',()=>api.contactInvitation(invite.id,false),state.available));invitations.append(row);
    }
    list.replaceChildren();
    let people = state.people.filter(p => tab==='recent' ? !!p.seenAt : p.relation !== 'none');
    people.sort((a,b)=>tab==='recent' ? Number(recent(b))-Number(recent(a)) || (recent(a)&&recent(b)?(b.interactedAt||0)-(a.interactedAt||0):0) || (b.seenAt||0)-(a.seenAt||0) : Number(b.relation==='incoming')-Number(a.relation==='incoming') || Number(b.online)-Number(a.online) || a.nickname.localeCompare(b.nickname));
    if(!people.length) { const empty=el('p',tab==='recent'?'还没有见过的玩家。去世界广场加入一间小屋吧。':'还没有游戏好友。在房间成员或「最近见过」里向朋友发出申请。');empty.className='empty';list.append(empty); }
    for(const p of people){
      const row=el('article');row.className='contact-row';row.dataset.contactId=p.id;
      const avatar=el('span',p.nickname.slice(0,1)||'友');avatar.className='avatar-dot'+(p.online&&state.available?' online':'');
      const info=el('div');info.className='contact-info';info.append(el('strong',p.nickname));
      if(tab==='recent'&&recent(p)){const badge=el('span','最近互动过');badge.className='interaction-badge';info.append(badge);}
      info.append(el('small',`${state.available?(p.online?'在线':'离线'):'状态未知'}${p.character?' · '+p.character:''}`));
      const title=el('span',p.title);title.className='title-slot';info.append(title);
      if(p.seenAt) info.append(el('small',`最近见于 ${new Date(p.seenAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`));
      const actions=el('div');actions.className='contact-actions';
      if(p.relation==='incoming') { info.append(el('small','想成为你的好友'));actions.append(button('接受',()=>contactAction(p,'accept'),state.available,'已成为游戏好友'),button('拒绝',()=>contactAction(p,'reject'),state.available)); }
      else if(p.relation==='outgoing') { info.append(el('small','等待对方接受'));actions.append(button('取消申请',()=>contactAction(p,'cancel'),state.available)); }
      else if(p.relation==='friend') { actions.append(button('邀请来玩',()=>contactAction(p,'invite'),state.available&&p.online&&canInvite(),'邀请已送达，等待朋友接受'),button('删除好友',async()=>{if(confirm(`不再将 ${p.nickname} 列为游戏好友？`))await contactAction(p,'remove');},state.available)); }
      else actions.append(button('加好友',()=>contactAction(p,'request'),state.available,'好友申请已发送'));
      if(!p.online || !state.available) actions.append(button('角色试演',()=>api.rehearseContact(p.id),true,'邀请的是缓存角色，回应为本地模拟'));
      row.append(avatar,info,actions);list.append(row);
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
