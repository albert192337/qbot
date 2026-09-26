import { pickActions, type ResourceChoice } from './action-picker';
import { recommendedFor } from '../../../shared/action-resources';
import './sticker-create.css';
import type { Manifest } from '@qbot/pipeline';
import type { StickerDraft, StickerLibrary } from '../../../shared/sticker-library';
import { STICKER_SCENES } from '../../../shared/sticker-library';
import { confirmBox, esc } from './_studio-shared';
import { getSelectedCharacterId, selectCharacter, navigate } from '../workspace';

const api = () => window.qbot.stickerLibrary;
let root: HTMLElement;
let draft: StickerDraft|null = null;
let library: StickerLibrary = { version:1,items:[],scenes:{},referenceId:'' };
let dirId = '';
let name = '新角色';
let query = '';
let page = 0;
let selected = '';
let dirty = false;
let busy = false;
let stage = 1;
let notice = '';
let manifest: Manifest|null = null;
let off: (()=>void)|undefined;
let offAction: (()=>void)|undefined;
let renderVersion = 0;
const previews = new Map<string,string>();
interface GenerationForm { method: string; seconds: string; description: string; frame?: string; submittedId?: string; message: string; error: boolean }
const generationForms = new Map<string, GenerationForm>();
function generationForm(): GenerationForm {
  const key = `${dirId}:${selected}`;
  let form = generationForms.get(key);
  if (!form) { form = { method:'original', seconds:'0', description:'', message:'', error:false }; generationForms.set(key, form); }
  return form;
}
function generationPending(form: GenerationForm): boolean {
  if (!form.submittedId) return false;
  const status=manifest?.customActions?.[form.submittedId]?.status;
  return !status || status==='pending';
}
function generationFeedback(form: GenerationForm, message: string, error = false): void {
  form.message = message; form.error = error;
  if (generationForm() !== form) return;
  const line = root.querySelector<HTMLElement>('[data-generation-feedback]');
  if (line) { line.textContent = message; line.dataset.error = String(error); }
}
function variantsHtml(): string {
  return `<h3>新版本 · 预览后再采用</h3>${Object.entries(library.variants ?? {}).map(([id,v])=>{
    const a=manifest?.customActions?.[id];
    return `<div data-version="${esc(id)}"><p>${esc(v.description)} · ${a?.status==='done'?'已完成':a?.status==='pending'?'生成中':a?.status==='failed'?'生成失败':'尚未提交成功'}</p>${a?.status==='done'?`<video controls muted loop playsinline preload="none" src="qbot-asset://${dirId}/${esc(a.webm)}"></video><label><input type="checkbox" data-variant="${esc(id)}" ${v.enabled?'checked':''}>加入自由表达（也可只在场景里选用）</label>`:''}</div>`;
  }).join('')||'<p>还没有新版本。点一张表情，选择动作来源。</p>'}`;
}
function bindVariants(): void {
  root.querySelectorAll<HTMLInputElement>('[data-variant]').forEach(b=>b.onchange=()=>{library.variants![b.dataset.variant!].enabled=b.checked;dirty=true;});
}
const PAGE_SIZE = 18;
export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  off = api().onProgress(p => {
    notice = `正在收集 ${p.completed} / ${p.total} · ${p.current}${p.failed ? ` · ${p.failed} 个失败` : ''}`;
    const line = root.querySelector('[data-progress]');
    if (line) line.textContent = notice;
  });
  offAction = window.qbot.studio.onCustomAction(ev => {
    if (ev.dirId !== dirId) return;
    void reload().then(() => {
      if (ev.dirId !== dirId) return;
      const versions = root.querySelector('[data-versions]');
      if (versions) { versions.innerHTML = variantsHtml(); bindVariants(); }
      for (const form of generationForms.values()) if (form.submittedId === ev.name) {
        generationFeedback(form, ev.status === 'done' ? '生成完成。可以查看新版本，再到“待机”中选用。' : ev.status === 'failed' ? `生成失败：${ev.error || '请稍后重试'}` : '已提交，正在生成，原动作保持不变。', ev.status === 'failed');
      }
      const button = root.querySelector<HTMLButtonElement>('[data-generate]');
      if (button) { button.disabled = busy || generationPending(generationForm()); button.textContent = generationPending(generationForm()) ? '正在生成…' : '确认费用并生成新版本'; }
    }).catch(() => { notice = '状态刷新失败，请点击“刷新版本”重试。'; });
  });
  await onVisible();
}
export function unmount(): void { off?.(); offAction?.(); }
export function hasUnsavedChanges(): boolean { return dirty || busy; }
export function discardChanges(): void { if (!busy) { dirty=false; draft=null; dirId=''; } }
export async function onVisible(): Promise<void> {
  if (!draft && !dirty && !busy) {
    const id = getSelectedCharacterId();
    if (id) {
      const m = (await window.qbot.characters.list()).find(c => c.dirId === id)?.manifest;
      const existing = (m as (Manifest & { stickerLibrary?:StickerLibrary })|undefined)?.stickerLibrary;
      if (existing) { dirId=id; library=structuredClone(existing); manifest=m!; name=m!.name; stage=2; }
    }
  }
  render();
}
async function run(work: ()=>Promise<void>, onError?: (message:string)=>void): Promise<void> {
  if (busy) return;
  busy=true; render();
  try { await work(); }
  catch (e) { notice=e instanceof Error ? e.message : String(e); onError?.(notice); }
  finally { busy=false; render(); }
}
async function reload(): Promise<void> {
  const id=dirId; const characters=await window.qbot.characters.list();
  if(id!==dirId)return;
  manifest = characters.find(c => c.dirId === id)?.manifest ?? null;
  const remote = (manifest as (Manifest & { stickerLibrary?:StickerLibrary })|null)?.stickerLibrary;
  if(remote?.variants) library.variants = { ...remote.variants, ...library.variants };
}
function options(value: string, allowEmpty = true): string {
  const items = library.items.map(i => [i.id, i.name] as const);
  for (const [id,a] of Object.entries(manifest?.customActions ?? {})) {
    if (!items.some(([key])=>key===id) && a.status === 'done') items.push([id,`新版本 · ${a.poseDesc || id}`]);
  }
  return (allowEmpty ? '<option value="">暂不设置</option>' : '') + items.filter(([id])=>!dirId || manifest?.customActions?.[id]?.status === 'done')
    .map(([id,label])=>`<option value="${esc(id)}" ${value===id?'selected':''}>${esc(label)}</option>`).join('');
}
function render(): void {
  const revision = ++renderVersion;
  const filtered = library.items.filter(i=>`${i.name} ${i.meaning??''} ${i.tags.join(' ')}`.includes(query));
  page=Math.max(0,Math.min(page,Math.ceil(filtered.length/PAGE_SIZE)-1));
  const shown=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  root.innerHTML=`<section class="sticker-workshop">
    <header><span class="sw-stamp">GIF</span><div><h2>导入表情包</h2><p>将一组 GIF 创建为角色，并配置动作。</p></div></header>
    <nav class="sw-steps">${[[1,'选择素材'],[2,'配置动作'],[3,'完成']].map(([n,label])=>`<button data-step="${n}" ${stage===n?'aria-current="step"':''}>${n} · ${label}</button>`).join('')}</nav>
    <p class="sw-notice" data-progress role="status">${esc(notice || '本地导入无需生成费用。')}</p>
    <fieldset ${busy?'disabled':''}>
    ${stage!==1?'<button type="button" data-import-another>导入另一组表情包</button>':''}
    ${stage===1 ? `<div class="sw-row"><button class="sw-primary" data-scan>选择表情包文件夹</button><label>角色名称 <input data-name maxlength="80" value="${esc(name)}"></label></div>
      <p>只读取选中的文件夹，不混入父目录或其他角色。标签先沿用文件名，可自行修改；尚未做视觉识别。</p>` : ''}
    ${stage===2 && library.items.length ? `<div class="sw-paper"><h3>场景动作</h3><p>每个场景可以选择多个动作。推荐来自名称和标注，请预览确认。</p><div class="sw-scenes">${STICKER_SCENES.map(([id,label])=>`<label>${label}<button type="button" data-scene-pick="${id}">${sceneIds(id).length ? `已选 ${sceneIds(id).length} 个 · ${esc(library.items.find(i=>i.id===sceneIds(id)[0])?.name ?? '默认动作')}` : '选择动作'}</button></label>`).join('')}</div></div>` : ''}
    ${library.items.length ? `<div class="sw-row"><input data-search placeholder="搜索表情或标签" value="${esc(query)}"><span>${library.items.length} 张 · ${library.items.filter(i=>i.enabled&&!i.error).length} 张参与自由表达</span></div>` : '<div class="sw-empty">选择包含单个角色 GIF 的文件夹开始。</div>'}
    ${stage!==3 && library.items.length ? `<div class="sw-row"><button data-enable="yes">本页加入自由表达</button><button data-enable="no">本页暂不调用</button><input data-batch-tags placeholder="本页追加标签，逗号分隔"><button data-tags>追加标签</button></div>
    <div class="sw-grid">${shown.map(i=>`<article class="sw-card ${selected===i.id?'selected':''}"><button data-select="${i.id}" aria-label="编辑 ${esc(i.name)}"><img data-preview="${i.id}" alt="${esc(i.name)}"><strong>${esc(i.name)}</strong></button><label><input type="checkbox" data-enabled="${i.id}" ${i.enabled?'checked':''}> 自由表达</label>${i.error?'<small class="sw-error">转码失败，原件保留</small>':''}<small>${esc(i.tags.join(' · '))}</small></article>`).join('')}</div>
    <div class="sw-row"><button data-prev ${page===0?'disabled':''}>上一页</button><span>${page+1} / ${Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))}</span><button data-next ${(page+1)*PAGE_SIZE>=filtered.length?'disabled':''}>下一页</button></div>` : ''}

    ${stage===2 && dirId ? `<div class="sw-paper" data-versions>${variantsHtml()}</div>`:''}
    ${selected && stage!==3 ? detail() : ''}
    ${stage===1 && library.items.length ? `<div class="sw-paper"><label>主形象（首帧） <select data-reference>${options(library.referenceId,false)}</select></label><p>选择单角色、全身清晰的一张；不要把双角色表情当主形象。透明背景保留原样，不把白色身体当背景删除。</p><button data-next-stage class="sw-primary">下一步：配置动作</button></div>` : ''}
    ${stage===2 && library.items.length ? `<div class="sw-row">${dirId?'<button data-analyze>AI 分析整库语义</button><button class="sw-primary" data-save>保存表达与场景</button><button data-refresh>刷新版本</button><button data-finish>下一步：完成</button>':'<button class="sw-primary" data-create>导入并创建角色</button>'}</div>` : ''}
    ${stage===3 ? `<div class="sw-paper"><h3>${esc(name)}的素材</h3><p>本地原件不会上传。公开包包含角色昵称、人设、可播放动作与表达标签，不带生成提示词或本地路径。</p><button data-check>检查上传包</button><button data-activate>放到桌面</button><button data-upload>确认后发布到装扮市场</button><p>只有拥有分享授权的素材才可以公开发布；本地使用不等于获准公开。</p></div>` : ''}
    </fieldset></section>`;
  const bind=(q:string,fn:(e:Event)=>void)=>root.querySelector(q)?.addEventListener('click',fn);
  root.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.onclick=()=>{if (!busy) {if (b.dataset.step==='3'&&!dirId) {notice='请先导入素材并创建角色。';render();return;}stage=Number(b.dataset.step);render();}});
  bind('[data-import-another]',()=>{stage=1;render();});
  bind('[data-scan]',()=>void run(async()=>{
    if ((dirty||dirId) && !await confirmBox(root,'导入另一组表情包？已创建的角色会保留，当前未保存的选择将放弃。')) return;
    const scanned=await api().scan(); if (!scanned) return;
    draft=scanned;dirId='';manifest=null;previews.clear();selected='';page=0;dirty=true;
    library={version:1,items:scanned.names.map(i=>({...i,raw:'',tags:[i.name],enabled:true})),scenes:{},sceneCandidates:{},referenceId:scanned.names[0].id};
    for(const [scene] of STICKER_SCENES){const ids=library.items.filter(i=>recommendedFor(scene,`${i.name} ${i.tags.join(' ')}`)).map(i=>i.id);library.sceneCandidates![scene]=ids;library.scenes[scene]=ids[0]??'';}
    library.idleCandidates=library.sceneCandidates!.idle;
    notice=`找到 ${scanned.names.length} 张表情。请选择主形象与待机，再创建。`;
  }));
  root.querySelector<HTMLInputElement>('[data-name]')?.addEventListener('input',e=>{name=(e.target as HTMLInputElement).value;dirty=true;});
  root.querySelector<HTMLInputElement>('[data-search]')?.addEventListener('change',e=>{query=(e.target as HTMLInputElement).value;page=0;render();});
  root.querySelector<HTMLSelectElement>('[data-reference]')?.addEventListener('change',e=>{library.referenceId=(e.target as HTMLSelectElement).value;dirty=true;});
  root.querySelectorAll<HTMLButtonElement>('[data-select]').forEach(b=>b.onclick=()=>{selected=b.dataset.select!;render();root.querySelector('[data-detail]')?.scrollIntoView({block:'start',behavior:'smooth'});});
  root.querySelectorAll<HTMLInputElement>('[data-enabled]').forEach(b=>b.onchange=()=>{library.items.find(i=>i.id===b.dataset.enabled)!.enabled=b.checked;dirty=true;});
  root.querySelectorAll<HTMLButtonElement>('[data-scene-pick]').forEach(b=>b.onclick=async()=>{
    const scene=b.dataset.scenePick!;
    const choices:ResourceChoice[]=library.items.filter(i=>!dirId||manifest?.customActions?.[i.id]?.status==='done').map(i=>({id:i.id,name:i.name,meaning:i.meaning,tags:i.tags,preview:dirId&&i.raw?`qbot-asset://${dirId}/${i.raw}`:undefined,video:dirId?`qbot-asset://${dirId}/${manifest?.customActions?.[i.id]?.webm}`:undefined}));
    for(const [id,a]of Object.entries(manifest?.customActions??{}))if(a.status==='done'&&!choices.some(c=>c.id===id))choices.push({id,name:manifest?.resourceAnnotations?.[id]?.name||library.variants?.[id]?.description||id,meaning:manifest?.resourceAnnotations?.[id]?.meaning,video:`qbot-asset://${dirId}/${a.webm}`});
    const ids=await pickActions(root,scene,STICKER_SCENES.find(([id])=>id===scene)![1],choices,sceneIds(scene),draft?id=>api().preview(draft!.token,id):undefined);
    if(ids===null)return;
    library.sceneCandidates={...library.sceneCandidates,[scene]:ids};library.scenes[scene]=ids[0]??'';
    if(scene==='idle')library.idleCandidates=ids;
    dirty=true;render();
  });
  bindVariants();
  root.querySelector<HTMLInputElement>('[data-idle-candidate]')?.addEventListener('change',e=>{const ids=new Set(library.idleCandidates??[]);if((e.target as HTMLInputElement).checked)ids.add(selected);else ids.delete(selected);library.idleCandidates=[...ids];library.sceneCandidates={...library.sceneCandidates,idle:[...ids]};library.scenes.idle=[...ids][0]??'';dirty=true;});
  root.querySelectorAll<HTMLButtonElement>('[data-enable]').forEach(b=>b.onclick=()=>{shown.forEach(i=>i.enabled=b.dataset.enable==='yes');dirty=true;render();});
  bind('[data-tags]',()=>{const tags=(root.querySelector<HTMLInputElement>('[data-batch-tags]')!.value).split(/[,，、]/).map(t=>t.trim()).filter(Boolean);shown.forEach(i=>i.tags=[...new Set([...i.tags,...tags])]);dirty=true;render();});
  bind('[data-prev]',()=>{page--;render();});bind('[data-next]',()=>{page++;render();});
  bind('[data-next-stage]',()=>{stage=2;render();});
  bind('[data-create]',()=>void run(async()=>{
    if (!draft) return;
    if (!library.scenes.idle) throw new Error('请先为“待机”选一张表情。');
    const result=await api().create({token:draft.token,name,referenceId:library.referenceId,items:library.items,scenes:library.scenes,sceneCandidates:library.sceneCandidates});
    dirId=result.dirId;draft=null;dirty=false;selectCharacter(dirId);window.dispatchEvent(new Event('console:characters-changed'));await reload();
    library=structuredClone((manifest as Manifest & {stickerLibrary:StickerLibrary}).stickerLibrary);
    notice=`角色已创建。${library.items.length-result.failed.length} 张已导入${result.failed.length?`，${result.failed.length} 张失败，可保留后重试`:''}；尚未激活或发布。`;
  }));
  bind('[data-save]',()=>void run(async()=>{await api().save(dirId,library);dirty=false;notice='已保存，下次自由表达即可选择这些表情。';await reload();}));
  bind('[data-refresh]',()=>void run(async()=>{await reload();notice='版本已刷新；完成的新版本可在场景列表中选用。';}));
  bind('[data-analyze]',()=>void run(async()=>{
    if(!await confirmBox(root,`将从 ${library.items.length} 张表情抽取关键帧，发送到已配置的视觉模型，产生识别费用。返回开放标签、循环适合度和多角色提醒；只给建议，不自动覆盖你的标签。继续？`))return;
    const result=await api().analyze(dirId);
    for(const item of library.items)item.suggestion=result.suggestions[item.id]??item.suggestion;
    dirty=true;notice=`完成 ${Object.keys(result.suggestions).length} 张语义建议，${result.failed} 张未完成。点表情查看并采用标签。`;
  }));
  bind('[data-finish]',()=>void run(async()=>{await api().save(dirId,library);dirty=false;stage=3;}));
  bind('[data-check]',()=>void run(async()=>{const p=await api().package(dirId);notice=`上传包 ${(p.bytes/1024/1024).toFixed(1)} MB · ${p.files-1} 个媒体文件。${p.fitsMarket?'符合市场 50 MB 限制。':'超过市场 50 MB 限制，暂不能上传。'}`;}));
  bind('[data-activate]',()=>void run(async()=>{await window.qbot.characters.activate(dirId);notice='已经放到桌面。';}));
  bind('[data-upload]',()=>void run(async()=>{
    if (!dirId) throw new Error('请先创建角色。');
    const p=await api().package(dirId);if (!p.fitsMarket) throw new Error('上传包超过 50 MB，请精简后发布。');
    if (!await confirmBox(root,`将公开发布“${name}”的可播放素材与表达标签（${(p.bytes/1024/1024).toFixed(1)} MB），其他人可以下载。请确认你拥有这些素材的公开分享授权。确定发布？`)) return;
    await window.qbot.market.upload(dirId);notice='已发布到装扮市场。';
  }));
  bindDetail();
  // Only the visible page requests GIF bytes. Never inline/decode an entire large pack.
  root.querySelectorAll<HTMLImageElement>('[data-preview]').forEach(img=>{
    const id=img.dataset.preview!;
    if (dirId) {img.src=`qbot-asset://${dirId}/${library.items.find(i=>i.id===id)!.raw}`;return;}
    if (previews.has(id)) {img.src=previews.get(id)!;return;}
    if (draft) void api().preview(draft.token,id).then(url=>{if(revision===renderVersion){previews.set(id,url);img.src=url;}}).catch(()=>{});
  });
}
function detail(): string {
  const item=library.items.find(i=>i.id===selected);if(!item)return '';
  const form=generationForm();
  return `<div class="sw-paper" data-detail><h3>编辑资源</h3><label>名称<input data-item-name maxlength="80" value="${esc(item.name)}"></label><label>含义说明<textarea data-item-meaning maxlength="500" placeholder="描述这个表情表达什么，适合什么情况">${esc(item.meaning??'')}</textarea></label><label>语义标签（可多个，逗号分隔）<input data-item-tags value="${esc(item.tags.join('，'))}"></label>
    <label class="sw-inline"><input type="checkbox" data-idle-candidate ${(library.idleCandidates??[]).includes(item.id)?'checked':''}>加入待机候选（当前 ${(library.idleCandidates??[]).length} 张；AI 按情境选择，规则模式每 3～7 分钟轮换）</label>
    ${library.sceneNotes?.garden_sow?`<p>${esc(library.sceneNotes.garden_sow)}</p>`:''}
    <div class="sw-row"><select data-use-scene aria-label="把这张表情用于哪个场景">${STICKER_SCENES.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><button data-use-original>把原片用于此场景</button><button data-back-library>返回表情列表</button></div>
    ${item.suggestion?`<p>建议：${esc(item.suggestion.tags.join(' · '))}<br>${esc(item.suggestion.note)}<br>循环：${{yes:'可能适合，仍需预览',no:'不建议直接循环',uncertain:'待人工确认'}[item.suggestion.loop]} · 主体：${{single:'单角色',multiple:'多个角色，请核对',uncertain:'待确认'}[item.suggestion.subjects]}</p><button data-adopt-tags>采用建议标签</button>`:''}
    <p>保留原片可直接使用；需要更平缓的动作，再生成一个新版本。</p>
    ${dirId ? `<video controls loop muted playsinline preload="none" src="qbot-asset://${dirId}/${manifest?.customActions?.[selected]?.webm||''}"></video>
    <label>动作来源 <select data-method>${[['original','用原本的表情'],['frame','选一帧，生成平缓循环'],['new','按主形象全新生成']].map(([id,label])=>`<option value="${id}" ${form.method===id?'selected':''}>${label}</option>`).join('')}</select></label>
    <div data-generation ${form.method==='original'?'hidden':''}><label>原片时间（秒，仅取帧时使用）<input data-seconds type="number" min="0" step="0.1" value="${esc(form.seconds)}"></label><button data-frame>查看这一帧</button><img class="sw-frame" data-frame-image ${form.frame?`src="${esc(form.frame)}"`:'hidden'}>
    <label>想要的动作 <textarea data-description maxlength="1200" placeholder="例如：保持这张图的姿势，轻轻晃动，偶尔眨眼，适合待机时循环">${esc(form.description)}</textarea></label>
    <button data-generate ${generationPending(form)?'disabled':''}>${generationPending(form)?'正在生成…':'确认费用并生成新版本'}</button>
    <p data-generation-feedback role="status" aria-live="polite" data-error="${form.error}">${esc(form.message)}</p>
    ${form.submittedId?'<div class="sw-row"><button data-generation-tasks>查看生成任务</button><button data-generation-result>查看新版本</button></div>':''}
    <p>使用已配置的本地生成 API；会外发参考图并产生费用，不会自动采用结果。</p></div>` : '<p>创建后可对这张表情取帧并生成新版本。</p>'}</div>`;
}
function bindDetail(): void {
  root.querySelector<HTMLInputElement>('[data-item-name]')?.addEventListener('input',e=>{library.items.find(i=>i.id===selected)!.name=(e.target as HTMLInputElement).value;dirty=true;});
  root.querySelector<HTMLTextAreaElement>('[data-item-meaning]')?.addEventListener('input',e=>{library.items.find(i=>i.id===selected)!.meaning=(e.target as HTMLTextAreaElement).value;dirty=true;});
  root.querySelector<HTMLButtonElement>('[data-back-library]')?.addEventListener('click',()=>root.querySelector('.sw-grid')?.scrollIntoView({block:'start',behavior:'smooth'}));
  root.querySelector<HTMLButtonElement>('[data-use-original]')?.addEventListener('click',()=>{const scene=root.querySelector<HTMLSelectElement>('[data-use-scene]')!.value;const ids=[...new Set([...sceneIds(scene),selected])];library.sceneCandidates={...library.sceneCandidates,[scene]:ids};library.scenes[scene]=ids[0];if(scene==='idle')library.idleCandidates=ids;dirty=true;notice='已选用原片；创建角色或点击保存后生效。';render();});
  root.querySelector<HTMLButtonElement>('[data-adopt-tags]')?.addEventListener('click',()=>{const item=library.items.find(i=>i.id===selected)!;item.tags=[...new Set([...item.tags,...item.suggestion!.tags])];dirty=true;render();});
  root.querySelector<HTMLInputElement>('[data-item-tags]')?.addEventListener('change',e=>{library.items.find(i=>i.id===selected)!.tags=(e.target as HTMLInputElement).value.split(/[,，、]/).map(t=>t.trim()).filter(Boolean);dirty=true;});
  const method=root.querySelector<HTMLSelectElement>('[data-method]');
  if(!method)return;
  const form=generationForm();
  const seconds=root.querySelector<HTMLInputElement>('[data-seconds]')!;
  const description=root.querySelector<HTMLTextAreaElement>('[data-description]')!;
  method.onchange=()=>{form.method=method.value;root.querySelector<HTMLElement>('[data-generation]')!.hidden=method.value==='original';};
  seconds.oninput=()=>{form.seconds=seconds.value;};
  description.oninput=()=>{form.description=description.value;if(form.error)generationFeedback(form,'');};
  root.querySelector<HTMLButtonElement>('[data-generation-tasks]')?.addEventListener('click',()=>navigate({pane:'tasks'}));
  root.querySelector<HTMLButtonElement>('[data-generation-result]')?.addEventListener('click',()=>root.querySelector('[data-versions]')?.scrollIntoView({block:'start',behavior:'smooth'}));
  root.querySelector<HTMLButtonElement>('[data-frame]')!.onclick=async()=>{
    const requestedDir=dirId, requestedItem=selected;
    try {
      const url=await api().frame(requestedDir,requestedItem,Number(form.seconds));form.frame=url;
      if(dirId===requestedDir&&selected===requestedItem){const img=root.querySelector<HTMLImageElement>('[data-frame-image]');if(img){img.hidden=false;img.src=url;}}
    } catch(e){generationFeedback(form,`取帧失败：${String(e)}`,true);}
  };
  root.querySelector<HTMLButtonElement>('[data-generate]')!.onclick=()=>{
    if(busy||generationPending(form))return;
    if(!form.description.trim()){generationFeedback(form,'请先填写“想要的动作”，例如：安静睡觉，轻微呼吸。',true);description.focus();return;}
    const requestedDir=dirId, source=form.method==='frame'?selected:null;
    let accepted=false;
    void run(async()=>{
      if(!await confirmBox(root,'这会把所选参考图发送到已配置的生成服务，产生一次图片和视频生成费用。保留原件，不自动替换。继续？'))return;
      generationFeedback(form,'正在提交生成请求…');
      await api().save(requestedDir,library);dirty=false;
      const id=await api().generate(requestedDir,source,Number(form.seconds),form.description);
      form.submittedId=id;
      accepted=true;
      generationFeedback(form,'已提交，正在生成。可在“生成任务”查看；完成后会保留在“新版本”中。');
      notice='新动作已提交，不会自动替换当前待机。';
      window.dispatchEvent(new Event('console:characters-changed'));
      await reload();
    },message=>generationFeedback(form,accepted?`请求已提交，但进度刷新失败：${message}。请刷新版本查看，无需重复提交。`:`提交失败：${message}。当前输入已保留。`,true)).then(()=>{
      if(generationForm()===form && form.message)root.querySelector('[data-generation-feedback]')?.scrollIntoView({block:'nearest'});
    });
  };
}

function sceneIds(scene:string):string[]{return library.sceneCandidates?.[scene] ?? (scene==='idle'?library.idleCandidates:undefined) ?? (library.scenes[scene]?[library.scenes[scene]]:[]);}
