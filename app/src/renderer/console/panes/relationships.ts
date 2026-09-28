import { EMPTY_RELATIONSHIP_SETTINGS, relationshipStage, type RelationshipPerson, type RelationshipSnapshot } from '../../../shared/relationships';
import { PAIR_INTERACTIONS } from '../../../shared/pair-interaction';
import { esc, guard, hasDirtyControls, trackDirtyControls, confirmBox } from './_studio-shared';
import { getSelectedCharacterId } from '../workspace';
import './relationships.css';

let root: HTMLElement;
let data: RelationshipSnapshot = {people:[],relationships:[]};
let from = '', selected = '', query = '', filter = 'all', revision = 0, saving = false;
export async function mount(host: HTMLElement): Promise<void> { root = host; await refresh(); }
export function hasUnsavedChanges(): boolean { return saving || hasDirtyControls(root); }
export async function discardChanges(): Promise<void> { render(); }
export async function onVisible(): Promise<void> { if (!hasUnsavedChanges()) await refresh(); }
async function refresh(): Promise<void> {
  const request = ++revision;
  const next = await window.qbot.relationships.get();
  if (request !== revision) return;
  data = next;
  const editing = data.people.find(p => p.source==='local' && p.dirId===getSelectedCharacterId());
  if (!from || !data.people.some(p=>p.id===from)) from = editing?.id || data.activeId || data.people.find(p=>p.source==='local')?.id || '';
  render();
}
const pair = (to: string) => data.relationships.find(r=>r.people.includes(from)&&r.people.includes(to));
const preferences = (to: string) => pair(to)?.settings[from] || EMPTY_RELATIONSHIP_SETTINGS;
const portrait = (p: RelationshipPerson) => `<div class="rel-portrait"><span aria-hidden="true">✦</span><img src="qbot-asset://${esc(p.dirId)}/__portrait.png" alt="${esc(p.name)}" /></div>`;
const source = (p: RelationshipPerson) => p.source==='local' ? '我的角色' : `${p.owner || '朋友'}的角色`;
const date = (at: number) => new Date(at).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
async function leave(action:()=>void): Promise<void> {
  if (saving) return;
  if (hasUnsavedChanges() && !(await confirmBox(root,'离开前放弃尚未保存的关系设置？'))) return;
  action();
}
function bindImages(): void { root.querySelectorAll<HTMLImageElement>('.rel-portrait img').forEach(img=>{img.onerror=()=>{img.hidden=true;};}); }
function render(): void {
  const me = data.people.find(p=>p.id===from);
  root.innerHTML = `<div class="relationship-book"><header class="rel-heading"><div><p class="eyebrow">把每一次相处，留在手账里</p><h2>关系手账</h2><p>双人互动每次 +5 好感度，让熟悉慢慢变成默契。</p></div><button class="btn" data-refresh>刷新</button></header>
    <label class="rel-picker">以谁的视角翻开 <select data-from data-transient aria-label="查看谁的关系">${data.people.filter(p=>p.source==='local').map(p=>`<option value="${esc(p.id)}" ${p.id===from?'selected':''}>${esc(p.name)}${p.id===data.activeId?' · 当前桌宠':''}</option>`).join('')}</select></label>
    ${me ? `<div class="rel-layout"><aside class="rel-self">${portrait(me)}<h3>${esc(me.name)}</h3><p>认识 ${data.people.filter(p=>p.id!==from).length} 位角色</p><p class="rel-small">关系称呼由你设定<br>默契由日常相处积累</p></aside><section class="rel-paper" aria-label="关系内容"></section></div>` : '<div class="rel-empty">先迎接一位自己的角色，再来记录彼此的故事吧。</div>'}
    <p class="rel-footnote">手账保存在本机。会收录自己的角色和见过的房友角色；朋友离线后仍可查看。好友的缓存试演不增加联机好感度。</p></div>`;
  root.querySelector<HTMLButtonElement>('[data-refresh]')!.onclick=()=>void leave(()=>{void guard(root,root.querySelector('[data-refresh]')!,'刷新中…',refresh);});
  const picker=root.querySelector<HTMLSelectElement>('[data-from]')!;
  picker.onchange=()=>{const next=picker.value;picker.value=from;void leave(()=>{from=next;selected='';render();});};
  if(me) renderPaper();
  bindImages();
}
function renderPaper(): void {
  const paper=root.querySelector<HTMLElement>('.rel-paper')!;
  const friend = data.people.find(p=>p.id===selected && p.id!==from);
  if (!friend) {
    paper.innerHTML=`<div class="rel-list-heading"><h3>我认识的人</h3><input data-search data-transient aria-label="搜索角色" placeholder="找一位朋友…" value="${esc(query)}" /><select data-filter data-transient aria-label="角色来源"><option value="all">全部角色</option><option value="local">我的角色</option><option value="peer">朋友的角色</option><option value="favorite">特别关注</option></select></div><div class="rel-list"></div>`;
    const search=paper.querySelector<HTMLInputElement>('[data-search]')!;
    const filters=paper.querySelector<HTMLSelectElement>('[data-filter]')!;filters.value=filter;
    search.oninput=()=>{query=search.value;renderList();};filters.onchange=()=>{filter=filters.value;renderList();};renderList();
    return;
  }
  const rel=pair(friend.id), prefs=preferences(friend.id), stage=relationshipStage(rel?.points||0);
  const me=data.people.find(p=>p.id===from)!;
  const points=rel?.points||0;
  paper.innerHTML=`<button class="btn ghost" data-back>← 所有认识的人</button><h3>与 ${esc(friend.name)} 的关系</h3>
    <div class="rel-duo">${portrait(me)}<div><span class="rel-heart">♥</span><strong>${esc(stage.label)}</strong><span>${points} 好感度</span></div>${portrait(friend)}</div>
    <p class="rel-owner">${esc(source(friend))}</p><progress aria-label="关系阶段进度" max="${stage.next ? stage.next-stage.start : 1}" value="${stage.next ? points-stage.start : 1}"></progress><p class="rel-small">${stage.next?`再积累 ${stage.next-points} 点，走向下一个阶段`:'已经长久相伴，故事仍在继续'} · 一起互动 ${rel?.count||0} 次</p>
    <form class="rel-form"><label>关系称呼<input name="label" maxlength="24" placeholder="例如：搭档、家人、挚友" value="${esc(prefs.label)}" /></label><label>对 TA 的专属昵称<input name="nickname" maxlength="24" placeholder="只有你们之间的小称呼" value="${esc(prefs.nickname)}" /></label><label class="rel-wide">相处手记<textarea name="note" maxlength="500" rows="3" placeholder="想一起做的事、初印象，或一个小约定…">${esc(prefs.note)}</textarea></label><label class="rel-check"><input type="checkbox" name="favorite" ${prefs.favorite?'checked':''} /> 特别关注</label><div class="rel-wide btn-row"><button class="btn primary" type="submit">保存关系设置</button><span role="status" data-status></span></div></form>
    <p class="rel-small">称呼、昵称与手记仅保存在你的手账里，不修改对方的设定。</p><h4>一起做过的事</h4><ol class="rel-memories">${rel?.memories.length?rel.memories.map(m=>`<li><span>${esc(PAIR_INTERACTIONS.find(k=>k.id===m.kind)?.label||'双人互动')}</span><time>${date(m.at)}</time><b>+5</b></li>`).join(''):'<li>故事还没开始。去和 TA 喝茶、聊天或打个招呼吧。</li>'}</ol>`;
  paper.querySelector<HTMLButtonElement>('[data-back]')!.onclick=()=>void leave(()=>{selected='';renderPaper();});
  const form=paper.querySelector<HTMLFormElement>('form')!;
  trackDirtyControls(form);
  form.onsubmit=event=>{event.preventDefault();void guard(root,form.querySelector('[type=submit]')!,'保存中…',async()=>{
    const values=new FormData(form);
    const settings={label:String(values.get('label')||''),nickname:String(values.get('nickname')||''),note:String(values.get('note')||''),favorite:values.has('favorite')};
    const controls=Array.from(form.elements) as (HTMLInputElement|HTMLButtonElement)[];
    saving=true;
    controls.forEach(c=>c.disabled=true);
    try {await window.qbot.relationships.save(from,friend.id,settings);data=await window.qbot.relationships.get();trackDirtyControls(form);paper.querySelector('[data-status]')!.textContent='已记在手账里';}
    finally{saving=false;controls.forEach(c=>c.disabled=false);}
  });};bindImages();
}
function renderList(): void {
  const list=root.querySelector<HTMLElement>('.rel-list')!;
  const people=data.people.filter(p=>p.id!==from&&(filter==='all'||filter===p.source||filter==='favorite'&&preferences(p.id).favorite)&&`${p.name} ${p.owner||''} ${preferences(p.id).nickname}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b)=>Number(preferences(b.id).favorite)-Number(preferences(a.id).favorite)||(pair(b.id)?.points||0)-(pair(a.id)?.points||0)||a.name.localeCompare(b.name,'zh-CN'));
  list.innerHTML=people.length?people.map(p=>{const rel=pair(p.id),prefs=preferences(p.id);return `<button class="rel-card" data-person="${esc(p.id)}">${portrait(p)}<span><strong>${prefs.favorite?'★ ':''}${esc(p.name)}</strong><small>${esc(source(p))}</small><span>${esc(prefs.label||relationshipStage(rel?.points||0).label)}</span></span><span class="rel-score">♥ ${rel?.points||0}<small>${rel?.count||0} 次相处</small></span><span aria-hidden="true">›</span></button>`;}).join(''):'<div class="rel-empty">这一页还空着<br><small>换个筛选，或带自己的角色与朋友见面吧。</small></div>';
  list.querySelectorAll<HTMLButtonElement>('[data-person]').forEach(b=>b.onclick=()=>{selected=b.dataset.person!;renderPaper();});bindImages();
}
