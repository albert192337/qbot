import { mountContacts } from './contacts';
import './style.css';
import { ChatView } from './chat';
import {PAIR_INTERACTIONS} from '../../shared/pair-interaction';
import { mountSteam } from './steam';
import { DEFAULT_ROOM } from '../room/rooms/default';
import type { CreateRoomInput, RoomBrief, RoomSnapshot, RoomsStatus } from '../../shared/ipc-types';
import type { ContactSnapshot, SocialProfile, TestGuest } from '../../shared/social';

const api = window.qbot;
const compact = new URLSearchParams(location.search).get('compact') === '1';
document.body.classList.toggle('compact', compact);
const root=document.querySelector<HTMLDivElement>('#app')!;
const esc=(s: unknown) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const kinds:Record<string,string>={idle:'摸鱼小屋',study:'自习室',night:'夜猫小屋',coop:'联机小屋'};
const languages:Record<string,string>={all:'不限语言',zh:'中文',en:'English',ja:'日本語',ko:'한국어'};
const options=(values:Record<string,string>)=>Object.entries(values).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
let status: RoomsStatus={phase:'off'};
let room:RoomSnapshot|null=null;
let profile:SocialProfile|null=null;
let contacts:ContactSnapshot={available:false,reason:'',people:[],invitations:[]};
let rooms:RoomBrief[]=[];
let guests:TestGuest[]=[];
let page='home';
let refreshVersion=0;
let worldVersion=0;
let pin=false;
let busy=false;
let hiddenMembers:string[]=[];
api.desktop.onChanged(s=>{hiddenMembers=s.hiddenMembers;if(compact)renderMembers($('compact-members'));else if(room)renderRoom();});

root.innerHTML=`<header><div><span class="eyebrow">QBOT · LITTLE COMPANY</span><h1>${compact?'房间聊天':'一起玩'} <span class="leaf">❧</span></h1></div><div class="header-actions">${compact?'<button id="pin" title="保持在其他窗口上方">置顶</button><button id="open-main">一起玩</button>':'<span id="connection" class="badge">尚未连接</span>'}<button id="close" aria-label="关闭窗口">×</button></div></header>
<div id="room-strip"><span id="room-summary">一个人也很自在，有朋友更热闹。</span><div><button id="copy-code" hidden>复制房间码</button>${!compact?'<button id="open-chat">聊天小窗 ↗</button>':''}<button id="leave" hidden>退出房间</button></div></div>
${!compact?`<nav><button data-page="home" class="selected">一起玩</button><button data-page="friends">朋友</button><button data-page="world">世界广场</button><button data-page="room">当前房间</button><button data-page="test" class="test-tab">本地试演</button></nav>
<aside id="steam-join" hidden></aside><main><section id="home-page" class="page"><div class="welcome"><span class="eyebrow">留一把椅子，给你的朋友</span><h2>来我的小屋，坐一会儿。</h2><p>各自忙碌，也能安静地待在一起。</p><div class="entry-grid"><button id="invite" class="entry"><span class="entry-icon">✉</span><strong>邀请朋友来玩</strong><small>开一间会客房，分享房间码</small><span>一起坐坐 →</span></button><button id="publish" class="entry public"><span class="entry-icon">⌂</span><strong>公开我的房间</strong><small>让世界广场的朋友找到你</small><span>打开小屋的门 →</span></button></div></div><div class="home-grid"><article class="card"><h3>我的联机形象</h3><div id="my-character"></div><label>来做点什么<select id="pose"><option value="">随当前状态</option></select></label><p class="muted">只使用这个角色已有的动作。</p></article><article class="card steam-card" id="steam-card"></article></div></section>
<section id="friends-page" class="page" hidden><article class="card" id="friends-card"></article></section><section id="world-page" class="page" hidden><div class="world-grid"><article class="card discover"><div class="section-heading"><h2>逛逛大家的小屋</h2><button id="refresh">刷新</button></div><form id="join-form" class="join-row"><input id="room-code" maxlength="8" placeholder="输入八位房间码" aria-label="房间码"><button class="primary">敲门加入</button></form><div class="filters"><input id="search" placeholder="找一间小屋…" aria-label="搜索房名"><select id="kind" aria-label="房间类型"><option value="">全部类型</option>${options(kinds)}</select><select id="language" aria-label="首选语言">${options(languages)}</select><select id="chat-filter" aria-label="聊天筛选"><option value="">聊天不限</option><option value="yes">允许聊天</option><option value="no">安静陪伴</option></select><select id="sort" aria-label="排序"><option value="active">活跃优先</option><option value="recent">最近活动</option><option value="quiet">人少优先</option></select><label class="check"><input id="space" type="checkbox" checked>只看有空位</label><label class="check"><input id="favorite-only" type="checkbox">我的收藏</label></div><div id="room-list"></div></article><article class="card world-chat"><h3>世界闲聊 <span class="badge">公开频道</span></h3><div id="world-chat"></div></article></div></section>
<section id="room-page" class="page" hidden><div id="room-details"></div></section>
<section id="test-page" class="page" hidden><article class="test-banner"><span class="eyebrow">试演一下，随时散场</span><h2>把角色们请到同一间小屋</h2><p>邀请的是本机素材，不是玩家本人。所有回应均为模拟，不会发送邀请，也不写入真实互动记录。</p><button id="start-test" class="primary">开始本地试演</button></article><div class="section-heading"><h3>可邀请的角色</h3><button id="reload-guests">刷新角色</button></div><p class="muted">包括自己的其他角色、已下载的装扮角色和仍保留素材的房友缓存。</p><div id="guest-list" class="guest-grid"></div><div id="test-members"></div></section></main>`:`<div class="compact-tabs"><button id="show-chat" class="selected">聊天</button><button id="show-members">成员</button></div><div id="compact-chat"></div><div id="compact-members" hidden></div>`}
<div id="toast" role="status" hidden></div><dialog id="room-dialog"><form id="room-form"><div class="section-heading"><h2 id="form-title">公开我的房间</h2><button type="button" id="cancel-form" aria-label="关闭设置">×</button></div><div class="room-preview"><span>⌂</span><div><strong>当前小屋</strong><p>朋友将以你选定的角色姿态入场</p></div></div><button type="button" id="last-settings">使用上次设置</button><label>房间名称<input name="name" maxlength="24" required placeholder="给小屋起个名字"></label><label>介绍<textarea name="description" maxlength="200" rows="3" placeholder="例如：一起赶稿，偶尔聊两句。"></textarea></label><div class="form-grid"><label>房间类型<select name="kind">${options(kinds)}</select></label><label>最多几个人<input name="capacity" type="number" min="2" max="12" value="6" required></label><label>可见性<select name="listed"><option value="true">公开 · 世界可见</option><option value="false">房间码访问</option></select></label><label>首选语言<select name="language">${options(languages)}</select></label><label>聊天<select name="chatEnabled"><option value="true">可以聊天</option><option value="false">安静陪伴</option></select></label></div><p class="muted">Steam 文本过滤尚未接入。房间码访问不上世界列表，持有码的人可以加入。</p><div class="form-actions"><button type="button" id="cancel-settings">取消</button><button class="primary" id="save-room">打开小屋的门</button></div></form></dialog>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const click=(id:string,fn:()=>unknown)=>$(id)?.addEventListener('click',()=>{void run(fn);});
let toastTimer:ReturnType<typeof setTimeout>;
function toast(text:string):void { $('toast').textContent=text.replace(/^Error: (Error invoking remote method '[^']+': Error: )?/,'');$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000); }
async function run(fn:()=>unknown):Promise<void>{try{await fn();}catch(e){toast(String(e));}}
async function mutate(fn:()=>Promise<unknown>):Promise<void>{if(busy)return;busy=true;root.classList.add('busy');try{await fn();await sync();}finally{busy=false;root.classList.remove('busy');}}
const roomChat=compact?new ChatView($('compact-chat'),false,()=>status.memberId,toast):null;
const worldChat=!compact?new ChatView($('world-chat'),true,()=>status.memberId,toast):null;
async function sync():Promise<void>{
 const version=++refreshVersion;
 const cache=await api.rooms.getCache();if(version!==refreshVersion)return;
 status=cache.status;room=cache.room;
 renderStatus(); roomChat?.set(cache.chat);
 if(compact)renderMembers($('compact-members'));else {renderRoom();renderTestMembers();}
}
function renderStatus():void {
 $('room-summary').textContent=room?`${room.testing?'本地试演 · ':''}${room.name} · ${room.members.filter(m=>m.online).length}/${room.capacity} 人`:'一个人也很自在，有朋友更热闹。';
 $('copy-code').hidden=!room||!!room.testing;$('leave').hidden=!room;
 if($('connection'))$('connection').textContent=room?.testing?'本地试演':status.phase==='connecting'?'正在连接…':status.phase==='off'?'尚未连接':'房间服务已连接';
 roomChat?.configure(room?.roomId||'',room?`${room.testing?'本地试演 · ':''}发送到 ${room.name}${room.chatEnabled===false?' · 聊天已关闭':''}`:'加入房间后，就能在这里聊天',!!room&&room.chatEnabled!==false&&status.socialReady===true);
 if(room&&!status.socialReady)roomChat?.configure(room.roomId,'房间服务需更新后才能使用聊天小窗',false);
 if($('start-test')){($('start-test') as HTMLButtonElement).disabled=!!room;$('start-test').textContent=room?.testing?'试演进行中':room?'请先退出当前房间':'开始本地试演';}
}
function renderMembers(host:HTMLElement):void {
 host.replaceChildren();if(!room){host.innerHTML='<p class="empty">还没有加入房间。</p>';return;}
 for(const m of room.members){
  const row=document.createElement('div');row.className='member-row';
  row.innerHTML=`<span class="avatar-dot ${m.online?'online':''}">${esc(m.nickname.slice(0,1))}</span><div class="member-name"><strong>${esc(m.nickname)}</strong><small>${m.companion?'陪伴角色':m.testing?'测试角色 · 非本人在线':m.memberId===status.memberId?'我':m.online?'在线':'离线'}${m.memberId===room.ownerId?' · 房主':''}</small><span class="title-slot">${esc(m.title||'')}</span></div>`;
  row.title=`玩家 ID：${m.memberId}`;
  if(m.memberId!==status.memberId){const visibility=document.createElement('button');const hidden=hiddenMembers.includes(m.memberId);visibility.textContent=hidden?'显示在桌面':'隐藏';visibility.title=hidden?'已在本机隐藏 · 点击恢复':'只在我的桌面隐藏';visibility.onclick=()=>void run(()=>api.desktop.setMemberHidden(m.memberId,!hidden));row.append(visibility);}
  {const garden=document.createElement('button');garden.textContent='土地 / 商店';garden.onclick=()=>api.garden.open(m.memberId===status.memberId&&room?.testing?'plots':'visit:'+m.memberId);row.append(garden);}
  if(!m.testing&&!room.testing&&m.memberId!==status.memberId&&m.online){const select=document.createElement('select');select.setAttribute('aria-label','选择双人互动');select.append(new Option('邀请互动…',''));for(const kind of PAIR_INTERACTIONS)select.append(new Option(kind.label,kind.id));select.onchange=()=>{const kind=select.value as 'heart';if(kind)void run(async()=>{await api.garden.interact(m.memberId,kind);toast('邀请已发出，等待对方回应');select.value='';});};row.append(select);}
  if(m.memberId!==status.memberId&&m.online){
   const wave=document.createElement('button');wave.textContent=m.testing?'模拟招呼':'打招呼';wave.onclick=()=>void run(()=>m.testing?api.social.interactTest(m.memberId,'wave'):api.rooms.wave(m.memberId));row.append(wave);
   if(room.ownerId===status.memberId){const remove=document.createElement('button');remove.textContent=m.testing?'离场':'移出';remove.onclick=()=>void run(async()=>{if(m.testing)await api.social.removeTest(m.memberId);else if(confirm(`将 ${m.nickname} 移出房间？`))await api.rooms.kick(m.memberId);await sync();});row.append(remove);}
  }
  if(!m.testing&&!room.testing&&m.memberId!==status.memberId){const relation=contacts.people.find(p=>p.id===m.memberId)?.relation;const add=document.createElement('button');add.textContent=relation==='friend'?'已是好友':relation==='outgoing'?'已申请':relation==='incoming'?'接受好友':'加好友';add.disabled=relation==='friend'||relation==='outgoing';add.onclick=()=>void run(async()=>{await api.social.contacts(true);await api.social.contactAction(m.memberId,relation==='incoming'?'accept':'request');toast(relation==='incoming'?'已成为游戏好友':'好友申请已发送');});row.append(add);}
  host.append(row);
 }
}
function renderRoom():void {
 const host=$('room-details');
 if(!room){host.innerHTML='<div class="card empty"><span class="round-icon">⌂</span><h2>小屋还在等你</h2><p>邀请朋友来玩，或者去世界广场逛逛。</p></div>';return;}
 host.innerHTML=`<article class="card"><div class="section-heading"><div><span class="eyebrow">${room.testing?'LOCAL REHEARSAL':'OUR LITTLE ROOM'}</span><h2>${esc(room.name)}</h2></div>${room.ownerId===status.memberId?'<button id="edit-room">房间设置</button>':''}</div><p>${esc(room.description||'留一点时间，和朋友待在一起。')}</p><div class="room-tags"><span>${esc(kinds[room.kind])}</span><span>${room.testing?'本地试演':room.listed?'公开房间':'房间码访问'}</span><span>${esc(languages[room.language||'all'])}</span><span>${room.chatEnabled===false?'安静陪伴':'可以聊天'}</span></div><div class="display-control"><span>角色在哪里陪你？</span><button id="display-desktop">桌面</button><button id="display-room">房间场景</button><button id="details-chat" class="primary">打开聊天小窗 ↗</button></div><h3>房间成员 <small>${room.members.filter(m=>m.online).length}/${room.capacity}</small></h3><div id="members"></div></article>`;
 renderMembers($('members'));click('edit-room',()=>openForm(room!.listed));click('details-chat',()=>api.social.openChat());
 for(const mode of ['desktop','room'] as const)click(`display-${mode}`,async()=>{await api.rooms.setDisplayMode(mode);toast(mode==='desktop'?'角色现在陪在桌面上':'角色现在待在房间里');});
 void api.rooms.getDisplayMode().then(mode=>{for(const m of ['desktop','room'])$(`display-${m}`)?.classList.toggle('selected',mode===m);});
}
async function loadProfile():Promise<void>{
 profile=await api.social.profile();if(compact)return;
 const c=profile.character;
 $('my-character').innerHTML=c?`<img class="portrait" src="qbot-asset://${encodeURIComponent(c.dirId)}/${esc(c.coverImage||c.manifest.sourceImage)}" alt=""><div><strong>${esc(profile.nickname)}</strong><p>${esc(c.manifest.name)}</p></div>`:'<p class="muted">先在角色库选择一个角色吧。</p>';
 $('pose').innerHTML='<option value="">随当前状态</option>'+profile.actions.map(a=>`<option value="${esc(a.id)}">${esc(a.label)}</option>`).join('');
 ($('pose') as HTMLSelectElement).value=profile.pose;
}
async function showPage(next:string):Promise<void>{
 const previous=page;page=next;
 for(const p of ['home','friends','world','room','test'])$(`${p}-page`).hidden=p!==next;
 document.querySelectorAll<HTMLButtonElement>('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.page===next));
 if(previous==='world'&&next!=='world'){worldVersion++;void api.social.world(false).catch(()=>{});worldChat?.configure('world','世界频道已收起',false);}
 if(next==='world')await refreshWorld();
 if(next==='test')await loadGuests();
}
async function refreshWorld():Promise<void>{
 const version=++worldVersion; $('room-list').innerHTML='<p class="empty">正在寻找亮着灯的小屋…</p>';
 worldChat?.configure('world','正在连接世界频道…',false);
 try{
  rooms=await api.rooms.list();if(version!==worldVersion||page!=='world')return;renderRooms();
  await loadProfile();
  const messages=await api.social.world(true);
  if(version!==worldVersion||page!=='world'){void api.social.world(false).catch(()=>{});return;}
  worldChat?.configure('world','发送到世界 · 所有人可见',true);worldChat?.set(messages);
 }catch(e){if(version!==worldVersion)return;const text=String(e);if(!rooms.length)$('room-list').innerHTML='<p class="empty">暂时没能找到小屋，请稍后刷新。</p>';worldChat?.configure('world','世界聊天暂不可用',false);toast(text);}
}
function renderRooms():void{
 const query=($('search') as HTMLInputElement).value.trim().toLowerCase();
 const kind=($('kind') as HTMLSelectElement).value;const lang=($('language') as HTMLSelectElement).value;const chat=($('chat-filter') as HTMLSelectElement).value;
 const list=rooms.filter(r=>(!query||r.name.toLowerCase().includes(query))&&(!kind||r.kind===kind)&&(lang==='all'||r.language===lang)&&(!chat||(r.chatEnabled!==false)===(chat==='yes'))&&(!($('space') as HTMLInputElement).checked||r.online<r.capacity)&&(!($('favorite-only') as HTMLInputElement).checked||profile?.favorites.includes(r.roomId)));
 const sort=($('sort') as HTMLSelectElement).value;list.sort((a,b)=>sort==='recent'?b.lastActiveAt-a.lastActiveAt:sort==='quiet'?a.online-b.online:b.online-a.online||b.lastActiveAt-a.lastActiveAt);
 const host=$('room-list');host.replaceChildren();if(!list.length){host.innerHTML='<p class="empty">这里还很安静。换个筛选，或开一间自己的小屋。</p>';return;}
 for(const r of list){const card=document.createElement('article');card.className='room-card';card.innerHTML=`<div class="house-icon">⌂</div><div class="room-card-text"><strong>${esc(r.name)}</strong><p>${esc(r.description||kinds[r.kind])}</p><small>${esc(languages[r.language||'all'])} · ${r.chatEnabled===false?'安静陪伴':'可以聊天'}</small></div><div class="room-card-end"><span>${r.online}/${r.capacity}</span><button data-join ${r.online>=r.capacity?'disabled':''}>${r.online>=r.capacity?'已满':'拜访'}</button><button data-star aria-label="收藏房间">${profile?.favorites.includes(r.roomId)?'★':'☆'}</button></div>`;
  card.querySelector<HTMLButtonElement>('[data-join]')!.onclick=()=>void run(()=>enter(r.roomId));card.querySelector<HTMLButtonElement>('[data-star]')!.onclick=()=>void run(async()=>{const favorites=await api.rooms.toggleFavorite(r.roomId);if(profile)profile.favorites=favorites;renderRooms();});host.append(card);}
}
async function enter(code:string):Promise<void>{if(room&&room.roomId!==code&&!confirm('前往这间小屋会离开当前房间，继续吗？'))return;if(!(await api.social.prepareJoin()))return;await mutate(()=>api.rooms.join(code));await showPage('room');api.social.openChat();}
const dialog=$<HTMLDialogElement>('room-dialog');
const preview = document.querySelector('.room-preview > span');
if (preview) { const image=document.createElement('img');image.src=DEFAULT_ROOM.background;image.alt='当前房间场景';image.style.cssText='width:88px;height:88px;object-fit:contain';preview.replaceWith(image); }
if (!compact) {
  const filters=$('world-page').querySelector('.filters')!;
  const details=document.createElement('details'); details.className='filter-panel';
  const summary=document.createElement('summary');summary.textContent='筛选小屋';details.append(summary);
  filters.replaceWith(details);details.append(filters);
  details.open=false;
}
const form=$<HTMLFormElement>('room-form');
function fillForm(value:Partial<CreateRoomInput>):void{for(const [key,v] of Object.entries(value)){const el=form.elements.namedItem(key) as HTMLInputElement|null;if(el&&v!==undefined)el.value=String(v);}}
function openForm(listed:boolean):void{
 if(room&&room.ownerId!==status.memberId){toast('这是朋友的房间。先退出，再打开自己的小屋吧。');return;}
 form.reset();fillForm(room||{name:`${profile?.nickname||'我'}的小屋`,capacity:6,kind:'idle',language:'all',chatEnabled:true});fillForm({listed:room?.testing?false:listed});
 ($('last-settings') as HTMLButtonElement).disabled=!profile?.lastRoom;
 (form.elements.namedItem('listed') as HTMLSelectElement).disabled=!!room?.testing;
 $('form-title').textContent=room?'小屋设置':'公开我的房间';$('save-room').textContent=room?'保存设置':'创建房间';dialog.showModal();
}
async function loadGuests():Promise<void>{
 guests=await api.social.guests();const host=$('guest-list');host.replaceChildren();
 if(!guests.length){host.innerHTML='<p class="empty">还没有其他可播放的角色。先创建或下载一个角色，再回来试演。</p>';return;}
 for(const guest of guests){const card=document.createElement('article');card.className='card guest-card';card.innerHTML=`<img src="qbot-asset://${encodeURIComponent(guest.id)}/${esc(guest.character.manifest.sourceImage)}" alt=""><strong>${esc(guest.name)}</strong><small>${esc(guest.source)}${guest.owner?` · ${esc(guest.owner)}`:''}</small><button class="primary">邀请来试演</button>`;card.querySelector('button')!.onclick=()=>void run(()=>mutate(()=>api.social.inviteTest(guest.id)));host.append(card);}
}
function renderTestMembers():void{
 const host=$('test-members');if(!host)return;host.replaceChildren();if(!room?.testing)return;
 const title=document.createElement('h3');title.textContent='正在试演的访客';host.append(title);
 for(const m of room.members.filter(m=>m.testing)){const card=document.createElement('article');card.className='card test-member';card.innerHTML=`<div class="section-heading"><strong>${esc(m.nickname)} <span class="badge">测试角色</span></strong><button data-remove>离场</button></div><div class="interaction-row">${[['heart','送小心心'],['tea','请喝茶'],['chat','聊聊天'],['wave','打招呼']].map(([id,label])=>`<button data-interact="${id}">${label}</button>`).join('')}</div><form class="reply-row"><input maxlength="200" placeholder="让这个角色说一句测试台词" aria-label="模拟回复"><button>模拟回复</button></form>`;
  card.querySelector<HTMLButtonElement>('[data-remove]')!.onclick=()=>void run(()=>mutate(()=>api.social.removeTest(m.memberId)));
  card.querySelectorAll<HTMLButtonElement>('[data-interact]').forEach(b=>b.onclick=()=>void run(()=>api.social.interactTest(m.memberId,b.dataset.interact as 'wave')));
  card.querySelector('form')!.onsubmit=e=>{e.preventDefault();const input=card.querySelector('input')!;void run(async()=>{await api.social.replyTest(m.memberId,input.value);input.value='';});};host.append(card);}
}

click('close',()=>api.social.close());click('copy-code',async()=>{await api.social.copyCode();toast('房间码已复制，可以发给朋友了');});click('open-chat',()=>api.social.openChat());click('open-main',()=>api.rooms.open());
click('leave',()=>mutate(()=>api.rooms.leave()));click('pin',async()=>{await api.social.pin(!pin);pin=!pin;$('pin').textContent=pin?'已置顶':'置顶';$('pin').classList.toggle('selected',pin);});
click('show-chat',()=>{$('compact-chat').hidden=false;$('compact-members').hidden=true;$('show-chat').classList.add('selected');$('show-members').classList.remove('selected');});
click('show-members',()=>{$('compact-chat').hidden=true;$('compact-members').hidden=false;$('show-chat').classList.remove('selected');$('show-members').classList.add('selected');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open)api.social.close();});
if(!compact){
 document.querySelectorAll<HTMLButtonElement>('nav [data-page]').forEach(b=>b.onclick=()=>void run(()=>showPage(b.dataset.page!)));
 click('invite',async()=>{if(room){api.social.openChat();toast(room.testing?'本地试演请在试演页邀请角色':'复制上方房间码，邀请朋友来坐坐');return;}if(!(await api.social.prepareJoin()))return;await mutate(()=>api.rooms.create({name:`${profile?.nickname||'我'}的小屋`.slice(0,24),kind:'idle',capacity:6,listed:false}));await showPage('room');api.social.openChat();});
 click('publish',()=>openForm(true));click('refresh',refreshWorld);
 $('pose').addEventListener('change',()=>void run(async()=>{await api.social.pose(($('pose') as HTMLSelectElement).value);toast('联机姿态已保存');}));
 for(const id of ['search','kind','language','chat-filter','sort','space','favorite-only'])$(id).addEventListener(id==='search'?'input':'change',renderRooms);
 $('join-form').addEventListener('submit',e=>{e.preventDefault();void run(()=>enter(($('room-code') as HTMLInputElement).value.trim().toUpperCase()));});
 click('start-test',()=>mutate(async()=>{await api.social.startTest();api.social.openChat();}));click('reload-guests',loadGuests);
}
click('cancel-form',()=>dialog.close());click('cancel-settings',()=>dialog.close());click('last-settings',()=>{if(profile?.lastRoom)fillForm(profile.lastRoom);});
form.addEventListener('submit',e=>{e.preventDefault();void run(()=>mutate(async()=>{const d=new FormData(form);const input:CreateRoomInput={name:String(d.get('name')).trim(),description:String(d.get('description')),kind:String(d.get('kind')) as 'idle',capacity:Number(d.get('capacity')),listed:d.get('listed')==='true',chatEnabled:d.get('chatEnabled')==='true',language:String(d.get('language'))};if(room)await api.rooms.update(input);else {if(!(await api.social.prepareJoin()))return;await api.rooms.create(input);}dialog.close();await loadProfile();if(!compact)await showPage('room');toast('小屋设置已保存');}));});
api.rooms.onStatus(s=>{if(s.phase==='off'||s.phase==='connecting')worldChat?.configure('world','连接已断开，请刷新广场',false);void run(sync);});api.rooms.onMemberIn(()=>void run(sync));api.rooms.onMemberOut(()=>void run(sync));
api.rooms.onHistory(messages=>roomChat?.set(messages));api.rooms.onChat(msg=>roomChat?.add(msg));api.rooms.onChatDeleted(id=>roomChat?.remove(id));
api.rooms.onError(toast);api.rooms.onWave(w=>toast(`${w.fromNickname} 向你打了个招呼`));api.social.onWorld(messages=>{if(page==='world')worldChat?.set(messages);});
api.rooms.onKicked(()=>toast('你已离开这个房间'));
api.social.onContacts(value=>{contacts=value;const count=value.people.filter(p=>p.relation==='incoming').length+value.invitations.length;const entry=document.querySelector('[data-page=friends]');if(entry)entry.textContent=count?`朋友 · ${count}`:'朋友';void run(sync);});
api.characters.onActivated(()=>void run(async()=>{await loadProfile();if(contacts.available&&!room?.testing)await api.social.contacts(true);}));
if (!compact) {
 const friends=mountContacts($('friends-card'),$('steam-card'),api.social,toast,()=>!!room&&!room.testing,()=>{void run(sync);});
 const entry=document.createElement('article');entry.className='card';entry.innerHTML='<h3>朋友们</h3><p class="muted">游戏好友、最近见过的人和 Steam 好友，都在这里。</p><button id="find-friends">打开朋友列表 →</button>';$('home-page').querySelector('.home-grid')!.append(entry);click('find-friends',()=>showPage('friends'));
 api.rooms.onStatus(()=>friends.refresh());window.addEventListener('beforeunload',()=>friends.dispose(),{once:true});
 const offSteam = mountSteam($('steam-card'), $('steam-join'), api.social.steam, toast, async () => { await sync(); await showPage('room'); api.social.openChat(); });
 window.addEventListener('beforeunload', offSteam, {once:true});
}
void run(async()=>{await loadProfile();await sync();});


