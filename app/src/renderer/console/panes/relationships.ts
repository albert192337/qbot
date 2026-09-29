import { EMPTY_RELATIONSHIP_SETTINGS, relationshipStage, type RelationshipPerson, type RelationshipSnapshot } from '../../../shared/relationships';
import { PAIR_INTERACTIONS } from '../../../shared/pair-interaction';
import { esc, guard, hasDirtyControls, trackDirtyControls, confirmBox } from './_studio-shared';
import { getSelectedCharacterId, navigate } from '../workspace';
import './relationships.css';
import hearts from './relationship-art/hearts.png';
import handshake from './relationship-art/handshake.png';
import speech from './relationship-art/speech.png';
import heart from './relationship-art/heart.png';
import pencil from './relationship-art/pencil.png';
import tea from './relationship-art/tea.png';
import wave from './relationship-art/wave.png';

let root: HTMLElement;
let data: RelationshipSnapshot = {people:[],relationships:[]};
let from = '', selected = '', query = '', filter = 'all', revision = 0, saving = false;
let tab: 'partners' | 'memories' | 'relationship' = 'relationship';
export async function mount(host: HTMLElement): Promise<void> { root = host; await refresh(); }
export function unmount(): void { ++revision; }
export function hasUnsavedChanges(): boolean { return saving || !!root && hasDirtyControls(root); }
export async function discardChanges(): Promise<void> { render(); }
export async function onVisible(): Promise<void> { if (!hasUnsavedChanges()) await refresh(); }
async function refresh(): Promise<void> {
  const request = ++revision;
  const next = await window.qbot.relationships.get();
  if (request !== revision) return;
  data = next;
  const editing = data.people.find(p => p.source==='local' && p.dirId===getSelectedCharacterId());
  if (!from || !data.people.some(p=>p.id===from)) from = editing?.id || data.activeId || data.people.find(p=>p.source==='local')?.id || '';
  if (!selected || !data.people.some(p=>p.id===selected && p.id!==from)) selected = friends()[0]?.id || '';
  render();
}
const pair = (to: string) => data.relationships.find(r=>r.people.includes(from)&&r.people.includes(to));
const preferences = (to: string) => pair(to)?.settings[from] || EMPTY_RELATIONSHIP_SETTINGS;
const portrait = (p: RelationshipPerson) => `<div class="rel-portrait"><span aria-hidden="true">?</span><img src="qbot-asset://${esc(p.dirId)}/__portrait.png" alt="${esc(p.name)}" /></div>`;
const icon = (src: string) => `<img class="rel-icon" src="${src}" alt="" />`;
const source = (p: RelationshipPerson) => p.source==='local' ? '我的角色' : `${p.owner || '朋友'}的角色`;
const date = (at: number) => new Date(at).toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
const friends = () => data.people.filter(p=>p.id!==from).sort((a,b)=>Number(preferences(b.id).favorite)-Number(preferences(a.id).favorite)||(pair(b.id)?.points||0)-(pair(a.id)?.points||0)||a.name.localeCompare(b.name,'zh-CN'));
async function leave(action:()=>void): Promise<void> {
  if (saving) return;
  if (hasUnsavedChanges() && !(await confirmBox(root,'离开前放弃尚未保存的关系设置？'))) return;
  action();
}
function bindImages(): void { root.querySelectorAll<HTMLImageElement>('.rel-portrait img').forEach(img=>{img.onerror=()=>{img.hidden=true;};}); }
function render(): void {
  const me = data.people.find(p=>p.id===from);
  const friend = data.people.find(p=>p.id===selected && p.id!==from);
  const rel = friend ? pair(friend.id) : undefined;
  const stage = relationshipStage(rel?.points || 0);
  root.innerHTML = `<div class="relationship-book"><aside class="rel-rail"><h2>关系手账</h2><label class="rel-picker">以谁的视角翻开<select data-from data-transient aria-label="查看谁的关系">${data.people.filter(p=>p.source==='local').map(p=>`<option value="${esc(p.id)}" ${p.id===from?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><div class="rel-rail-friends">${friends().map(p=>`<button data-person="${esc(p.id)}" class="rel-rail-friend" aria-pressed="${p.id===selected}">${portrait(p)}<span>${esc(p.name)}<small>${esc(preferences(p.id).label || relationshipStage(pair(p.id)?.points || 0).label)}</small></span></button>`).join('')}</div><button class="rel-refresh" data-refresh>↻ 翻看最新手账</button><p class="rel-footnote">称呼和手记只记在你的本机手账里。</p></aside>
  <div class="rel-journal"><div class="rel-card-stage"><div class="rel-collectible"><span class="rel-heart-badge" aria-label="${rel?.points||0} 好感度">${rel?.points||0}</span><span class="rel-card-names">${esc(me?.name || '我的伙伴')}${friend ? ` × ${esc(friend.name)}` : ''}</span><div class="rel-card-pair">${me ? portrait(me) : ''}${friend ? portrait(friend) : ''}</div><span class="rel-card-stage-label">${friend ? stage.label : '等待一场相遇'}</span></div></div>
  <div class="rel-paper"><div class="rel-bindings" aria-hidden="true"></div><div class="rel-watermark" aria-hidden="true"></div><section class="rel-content" aria-label="关系内容"></section></div>
  <footer class="rel-game-tabs"><nav aria-label="手账页签">${[['partners','伙伴'],['memories','回忆'],['relationship','关系']].map(([id,label])=>`<button data-tab="${id}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}</nav><button class="rel-close" aria-label="合上关系手账">×</button></footer></div></div>`;
  root.querySelector<HTMLButtonElement>('[data-refresh]')!.onclick=()=>void leave(()=>{void guard(root,root.querySelector('[data-refresh]')!,'翻阅中…',refresh);});
  const picker=root.querySelector<HTMLSelectElement>('[data-from]')!;
  picker.onchange=()=>{const next=picker.value;picker.value=from;void leave(()=>{from=next;selected=friends()[0]?.id||'';render();});};
  root.querySelectorAll<HTMLButtonElement>('[data-person]').forEach(b=>b.onclick=()=>void leave(()=>{selected=b.dataset.person!;tab='relationship';render();}));
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>void leave(()=>{tab=b.dataset.tab as typeof tab;render();}));
  root.querySelector<HTMLButtonElement>('.rel-close')!.onclick=()=>void leave(()=>{const close=root.closest('#house-book')?.querySelector<HTMLButtonElement>('.book-head button');if(close)close.click();else navigate({pane:'home'});});
  if (!me) root.querySelector('.rel-content')!.innerHTML='<div class="rel-empty">先迎接一位自己的角色<br>再来记录彼此的故事吧。</div>';
  else if (tab==='partners' || !friend) renderListPage();
  else renderDetail(me,friend);
  bindImages();
}
function renderListPage(): void {
  const paper=root.querySelector<HTMLElement>('.rel-content')!;
  paper.innerHTML=`<h3 class="rel-section-title">我认识的伙伴</h3><div class="rel-list-heading"><input data-search data-transient aria-label="搜索角色" placeholder="找一位朋友…" value="${esc(query)}" /><select data-filter data-transient aria-label="角色来源"><option value="all">全部伙伴</option><option value="local">我的角色</option><option value="peer">朋友的角色</option><option value="favorite">特别关注</option></select></div><div class="rel-list"></div>`;
  const search=paper.querySelector<HTMLInputElement>('[data-search]')!;
  const filters=paper.querySelector<HTMLSelectElement>('[data-filter]')!;filters.value=filter;
  search.oninput=()=>{query=search.value;renderList();};filters.onchange=()=>{filter=filters.value;renderList();};renderList();
}
function memories(friend: RelationshipPerson): string {
  const rel=pair(friend.id);
  return `<h3 class="rel-section-title">一起做过的事</h3><ol class="rel-memories">${rel?.memories.length?rel.memories.slice(0,tab==='memories'?undefined:2).map(m=>`<li>${icon(m.kind==='tea'?tea:wave)}<span><time>${date(m.at)}</time>　${esc(PAIR_INTERACTIONS.find(k=>k.id===m.kind)?.label||'双人互动')}</span><b>+5</b></li>`).join(''):'<li><span>还没有共同经历。<br>去和 TA 喝茶、聊聊天吧。</span></li>'}</ol>`;
}
function renderDetail(me: RelationshipPerson, friend: RelationshipPerson): void {
  const paper=root.querySelector<HTMLElement>('.rel-content')!;
  if(tab==='memories'){paper.innerHTML=memories(friend);return;}
  const rel=pair(friend.id),prefs=preferences(friend.id),points=rel?.points||0,stage=relationshipStage(points);
  paper.innerHTML=`<form class="rel-form"><div class="rel-identity-row"><div class="rel-name-pill">${icon(hearts)}<span>${esc(me.name)} → ${esc(friend.name)}</span></div><label class="rel-favorite"><input type="checkbox" name="favorite" ${prefs.favorite?'checked':''}/><span aria-hidden="true">★</span>关注</label></div>
  <p class="rel-owner">${esc(source(friend))}</p><div class="rel-fields"><label>${icon(handshake)}<span>称呼</span><input name="label" aria-label="关系称呼" maxlength="24" placeholder="未设定" value="${esc(prefs.label)}"/></label><label>${icon(speech)}<span>昵称</span><input name="nickname" aria-label="专属昵称" maxlength="24" placeholder="未设定" value="${esc(prefs.nickname)}"/></label></div>
  <h3 class="rel-section-title">我们的默契</h3><div class="rel-bond">${icon(heart)}<strong>${stage.label}</strong><div class="rel-progress"><progress aria-label="关系阶段进度" max="${stage.next?stage.next-stage.start:1}" value="${stage.next?points-stage.start:1}"></progress><span>${stage.next?`${points} / ${stage.next}`:'长久相伴'}</span><small>一起互动 ${rel?.count||0} 次</small></div></div>
  <h3 class="rel-section-title">相处手记</h3><label class="rel-note"><span class="sr-only">相处手记</span><textarea name="note" aria-label="相处手记" maxlength="500" rows="3" placeholder="记下你们的小约定…">${esc(prefs.note)}</textarea><button type="button" class="rel-edit-note" aria-label="编辑手记">${icon(pencil)}</button></label>
  <div class="rel-save-row"><span role="status" data-status>点称呼、昵称或手记，就能修改</span><button class="rel-save" type="submit">记在手账里</button></div></form>${memories(friend)}`;
  const form=paper.querySelector<HTMLFormElement>('form')!;
  trackDirtyControls(form);
  paper.querySelector<HTMLButtonElement>('.rel-edit-note')!.onclick=()=>form.querySelector<HTMLTextAreaElement>('textarea')!.focus();
  form.addEventListener('input',()=>{paper.querySelector('[data-status]')!.textContent='有新的心事，记得保存';});
  form.onsubmit=event=>{event.preventDefault();if(saving)return;void guard(root,form.querySelector('[type=submit]')!,'记下了…',async()=>{
    const values=new FormData(form),request=revision;
    const settings={label:String(values.get('label')||''),nickname:String(values.get('nickname')||''),note:String(values.get('note')||''),favorite:values.has('favorite')};
    const controls=Array.from(form.elements) as (HTMLInputElement|HTMLButtonElement)[];
    saving=true;controls.forEach(c=>c.disabled=true);
    try {await window.qbot.relationships.save(from,friend.id,settings);const next=await window.qbot.relationships.get();if(request!==revision)return;data=next;trackDirtyControls(form);paper.querySelector('[data-status]')!.textContent='已记在手账里';}
    finally{saving=false;controls.forEach(c=>c.disabled=false);}
  });};
}
function renderList(): void {
  const list=root.querySelector<HTMLElement>('.rel-list')!;
  const people=friends().filter(p=>(filter==='all'||filter===p.source||filter==='favorite'&&preferences(p.id).favorite)&&`${p.name} ${p.owner||''} ${preferences(p.id).nickname}`.toLowerCase().includes(query.trim().toLowerCase()));
  list.innerHTML=people.length?people.map(p=>{const rel=pair(p.id),prefs=preferences(p.id);return `<button class="rel-card" data-person="${esc(p.id)}">${portrait(p)}<span><strong>${prefs.favorite?'★ ':''}${esc(p.name)}</strong><small>${esc(source(p))}</small><span>${esc(prefs.label||relationshipStage(rel?.points||0).label)}</span></span><span class="rel-score">♥ ${rel?.points||0}<small>${rel?.count||0} 次相处</small></span><span aria-hidden="true">›</span></button>`;}).join(''):'<div class="rel-empty">这一页还空着<br>换个筛选，或去认识一位新朋友吧。</div>';
  list.querySelectorAll<HTMLButtonElement>('[data-person]').forEach(b=>b.onclick=()=>{selected=b.dataset.person!;tab='relationship';render();});bindImages();
}
