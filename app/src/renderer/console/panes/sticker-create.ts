import './sticker-create.css';
import type { Manifest } from '@qbot/pipeline';
import type { StickerDraft, StickerLibrary } from '../../../shared/sticker-library';
import { STICKER_SCENES } from '../../../shared/sticker-library';
import { confirmBox, esc } from './_studio-shared';
import { getSelectedCharacterId, selectCharacter } from '../workspace';

const api = () => window.qbot.stickerLibrary;
let root: HTMLElement;
let draft: StickerDraft|null = null;
let library: StickerLibrary = { version:1,items:[],scenes:{},referenceId:'' };
let dirId = '';
let name = '小白狗';
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
const PAGE_SIZE = 18;
export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  off = api().onProgress(p => {
    notice = `正在收集 ${p.completed} / ${p.total} · ${p.current}${p.failed ? ` · ${p.failed} 个失败` : ''}`;
    const line = root.querySelector('[data-progress]');
    if (line) line.textContent = notice;
  });
  offAction = window.qbot.studio.onCustomAction(ev => {
    if (ev.dirId === dirId) {
      notice = '动作生成状态已更新；点击“刷新版本”查看，不会自动替换原件。';
      const line = root.querySelector('[data-progress]');
      if (line) line.textContent = notice;
    }
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
async function run(work: ()=>Promise<void>): Promise<void> {
  if (busy) return;
  busy=true; render();
  try { await work(); }
  catch (e) { notice=e instanceof Error ? e.message : String(e); }
  finally { busy=false; render(); }
}
async function reload(): Promise<void> {
  manifest = (await window.qbot.characters.list()).find(c => c.dirId === dirId)?.manifest ?? null;
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
  const filtered = library.items.filter(i=>`${i.name} ${i.tags.join(' ')}`.includes(query));
  page=Math.max(0,Math.min(page,Math.ceil(filtered.length/PAGE_SIZE)-1));
  const shown=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  root.innerHTML=`<section class="sticker-workshop">
    <header><span class="sw-stamp">🐾</span><div><h2>从贴纸里认识新朋友</h2><p>整本表情都是它的表达，不必挤进几个固定动作。</p></div></header>
    <nav class="sw-steps">${[[1,'收集表情'],[2,'安排动作'],[3,'带它出门']].map(([n,label])=>`<button data-step="${n}" ${stage===n?'aria-current="step"':''}>${n} · ${label}</button>`).join('')}</nav>
    <p class="sw-notice" data-progress role="status">${esc(notice || '本地收集不调用生成模型，也不会公开上传。')}</p>
    <fieldset ${busy?'disabled':''}>
    ${stage===1 ? `<div class="sw-row"><button data-scan>📂 选择表情包文件夹</button><label>朋友的名字 <input data-name maxlength="80" value="${esc(name)}"></label></div>
      <p>只读取选中的文件夹，不混入父目录或其他角色。标签先沿用文件名，可自行修改；尚未做视觉识别。</p>` : ''}
    ${library.items.length ? `<div class="sw-row"><input data-search placeholder="搜索表情或标签" value="${esc(query)}"><span>${library.items.length} 张 · ${library.items.filter(i=>i.enabled&&!i.error).length} 张参与自由表达</span></div>` : '<div class="sw-empty">选择“小白狗”文件夹开始。无需先生成三视图。</div>'}
    ${stage!==3 && library.items.length ? `<div class="sw-row"><button data-enable="yes">本页加入自由表达</button><button data-enable="no">本页暂不调用</button><input data-batch-tags placeholder="本页追加标签，逗号分隔"><button data-tags>追加标签</button></div>
    <div class="sw-grid">${shown.map(i=>`<article class="sw-card ${selected===i.id?'selected':''}"><button data-select="${i.id}" aria-label="编辑 ${esc(i.name)}"><img data-preview="${i.id}" alt="${esc(i.name)}"><strong>${esc(i.name)}</strong></button><label><input type="checkbox" data-enabled="${i.id}" ${i.enabled?'checked':''}> 自由表达</label>${i.error?'<small class="sw-error">转码失败，原件保留</small>':''}<small>${esc(i.tags.join(' · '))}</small></article>`).join('')}</div>
    <div class="sw-row"><button data-prev ${page===0?'disabled':''}>上一页</button><span>${page+1} / ${Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))}</span><button data-next ${(page+1)*PAGE_SIZE>=filtered.length?'disabled':''}>下一页</button></div>` : ''}
    ${stage===2 && library.items.length ? `<div class="sw-paper"><h3>固定场景 · 选一个适合的版本</h3><p>自由表达库可以一类多张、多类共用；下面只决定场景触发时播放哪张。原片不一定循环平滑，请先预览。</p><div class="sw-scenes">${STICKER_SCENES.map(([id,label])=>`<label>${label}<select data-scene="${id}">${options(library.scenes[id]||'')}</select></label>`).join('')}</div></div>` : ''}
    ${stage===2 && dirId ? `<div class="sw-paper"><h3>新版本 · 预览后再采用</h3>${Object.entries(library.variants ?? {}).map(([id,v])=>{const a=manifest?.customActions?.[id];return `<div><p>${esc(v.description)} · ${a?.status==='done'?'已完成':a?.status==='pending'?'生成中':'未完成，可重新发起'} </p>${a?.status==='done'?`<video controls muted loop playsinline preload="none" src="qbot-asset://${dirId}/${a.webm}"></video><label><input type="checkbox" data-variant="${id}" ${v.enabled?'checked':''}>加入自由表达（也可只在场景里选用）</label>`:''}</div>`;}).join('')||'<p>还没有新版本。点一张表情，选择动作来源。</p>'}</div>`:''}
    ${selected && stage!==3 ? detail() : ''}
    ${stage===1 && library.items.length ? `<div class="sw-paper"><label>主形象（首帧） <select data-reference>${options(library.referenceId,false)}</select></label><p>选择单角色、全身清晰的一张；不要把双角色表情当主形象。透明背景保留原样，不把白色身体当背景删除。</p><button data-next-stage>下一步：安排动作</button></div>` : ''}
    ${stage===2 && library.items.length ? `<div class="sw-row">${dirId?'<button data-analyze>AI 分析整库语义</button><button data-save>保存表达与场景</button><button data-refresh>刷新版本</button><button data-finish>下一步：带它出门</button>':'<button data-create>收集整库并创建角色</button>'}</div>` : ''}
    ${stage===3 ? `<div class="sw-paper"><h3>${esc(name)}的行李</h3><p>本地原件不会上传。公开包只带可播放动作与表达标签，不带人设、生成提示词或本地路径。</p><button data-check>检查上传包</button><button data-activate>放到桌面</button><button data-upload>确认后发布到装扮市场</button><p>只有拥有分享授权的素材才可以公开发布；本地使用不等于获准公开。</p></div>` : ''}
    </fieldset></section>`;
  const bind=(q:string,fn:(e:Event)=>void)=>root.querySelector(q)?.addEventListener('click',fn);
  root.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.onclick=()=>{if (!busy) {if (b.dataset.step==='3'&&!dirId) {notice='请先收集素材并创建角色。';render();return;}stage=Number(b.dataset.step);render();}});
  bind('[data-scan]',()=>void run(async()=>{
    if ((dirty||dirId) && !await confirmBox(root,'开始收集新朋友？已创建的角色会保留，当前未保存的选择将放弃。')) return;
    const scanned=await api().scan(); if (!scanned) return;
    draft=scanned;dirId='';manifest=null;previews.clear();selected='';page=0;dirty=true;
    library={version:1,items:scanned.names.map(i=>({...i,raw:'',tags:[i.name],enabled:true})),scenes:{},referenceId:scanned.names[0].id};
    notice=`找到 ${scanned.names.length} 张表情。请选择主形象与待机，再创建。`;
  }));
  root.querySelector<HTMLInputElement>('[data-name]')?.addEventListener('input',e=>{name=(e.target as HTMLInputElement).value;dirty=true;});
  root.querySelector<HTMLInputElement>('[data-search]')?.addEventListener('change',e=>{query=(e.target as HTMLInputElement).value;page=0;render();});
  root.querySelector<HTMLSelectElement>('[data-reference]')?.addEventListener('change',e=>{library.referenceId=(e.target as HTMLSelectElement).value;dirty=true;});
  root.querySelectorAll<HTMLButtonElement>('[data-select]').forEach(b=>b.onclick=()=>{selected=b.dataset.select!;render();root.querySelector('[data-detail]')?.scrollIntoView({block:'start',behavior:'smooth'});});
  root.querySelectorAll<HTMLInputElement>('[data-enabled]').forEach(b=>b.onchange=()=>{library.items.find(i=>i.id===b.dataset.enabled)!.enabled=b.checked;dirty=true;});
  root.querySelectorAll<HTMLSelectElement>('[data-scene]').forEach(b=>b.onchange=()=>{library.scenes[b.dataset.scene!]=b.value;dirty=true;});
  root.querySelectorAll<HTMLInputElement>('[data-variant]').forEach(b=>b.onchange=()=>{library.variants![b.dataset.variant!].enabled=b.checked;dirty=true;});
  root.querySelector<HTMLInputElement>('[data-idle-candidate]')?.addEventListener('change',e=>{const ids=new Set(library.idleCandidates??[]);if((e.target as HTMLInputElement).checked)ids.add(selected);else ids.delete(selected);library.idleCandidates=[...ids];dirty=true;});
  root.querySelectorAll<HTMLButtonElement>('[data-enable]').forEach(b=>b.onclick=()=>{shown.forEach(i=>i.enabled=b.dataset.enable==='yes');dirty=true;render();});
  bind('[data-tags]',()=>{const tags=(root.querySelector<HTMLInputElement>('[data-batch-tags]')!.value).split(/[,，、]/).map(t=>t.trim()).filter(Boolean);shown.forEach(i=>i.tags=[...new Set([...i.tags,...tags])]);dirty=true;render();});
  bind('[data-prev]',()=>{page--;render();});bind('[data-next]',()=>{page++;render();});
  bind('[data-next-stage]',()=>{stage=2;render();});
  bind('[data-create]',()=>void run(async()=>{
    if (!draft) return;
    if (!library.scenes.idle) throw new Error('请先为“待机”选一张表情。');
    const result=await api().create({token:draft.token,name,referenceId:library.referenceId,items:library.items,scenes:library.scenes});
    dirId=result.dirId;draft=null;dirty=false;selectCharacter(dirId);await reload();
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
  return `<div class="sw-paper" data-detail><h3>${esc(item.name)}</h3><label>语义标签（可多个，逗号分隔）<input data-item-tags value="${esc(item.tags.join('，'))}"></label>
    <label><input type="checkbox" data-idle-candidate ${(library.idleCandidates??[]).includes(item.id)?'checked':''}>加入待机候选（当前 ${(library.idleCandidates??[]).length} 张；AI 按情境选择，规则模式每 3～7 分钟轮换）</label>
    ${library.sceneNotes?.garden_sow?`<p>${esc(library.sceneNotes.garden_sow)}</p>`:''}
    <div class="sw-row"><select data-use-scene aria-label="把这张表情用于哪个场景">${STICKER_SCENES.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><button data-use-original>把原片用于此场景</button><button data-back-library>返回表情列表</button></div>
    ${item.suggestion?`<p>建议：${esc(item.suggestion.tags.join(' · '))}<br>${esc(item.suggestion.note)}<br>循环：${{yes:'可能适合，仍需预览',no:'不建议直接循环',uncertain:'待人工确认'}[item.suggestion.loop]} · 主体：${{single:'单角色',multiple:'多个角色，请核对',uncertain:'待确认'}[item.suggestion.subjects]}</p><button data-adopt-tags>采用建议标签</button>`:''}
    <p>保留原片可直接使用；需要更平缓的动作，再生成一个新版本。</p>
    ${dirId ? `<video controls loop muted playsinline preload="none" src="qbot-asset://${dirId}/${manifest?.customActions?.[selected]?.webm||''}"></video>
    <label>动作来源 <select data-method><option value="original">用原本的表情</option><option value="frame">选一帧，生成平缓循环</option><option value="new">按主形象全新生成</option></select></label>
    <div data-generation hidden><label>原片时间（秒，仅取帧时使用）<input data-seconds type="number" min="0" step="0.1" value="0"></label><button data-frame>查看这一帧</button><img class="sw-frame" data-frame-image hidden>
    <label>想要的动作 <textarea data-description placeholder="例如：保持这张图的姿势，轻轻晃动，偶尔眨眼，适合被拖拽时循环"></textarea></label>
    <button data-generate>确认费用并生成新版本</button><p>使用已配置的本地生成 API；会外发参考图并产生费用，不会自动采用结果。</p></div>` : '<p>创建后可对这张表情取帧并生成新版本。</p>'}</div>`;
}
function bindDetail(): void {
  root.querySelector<HTMLButtonElement>('[data-back-library]')?.addEventListener('click',()=>root.querySelector('.sw-grid')?.scrollIntoView({block:'start',behavior:'smooth'}));
  root.querySelector<HTMLButtonElement>('[data-use-original]')?.addEventListener('click',()=>{library.scenes[root.querySelector<HTMLSelectElement>('[data-use-scene]')!.value]=selected;dirty=true;notice='已选用原片；创建角色或点击保存后生效。';render();});
  root.querySelector<HTMLButtonElement>('[data-adopt-tags]')?.addEventListener('click',()=>{const item=library.items.find(i=>i.id===selected)!;item.tags=[...new Set([...item.tags,...item.suggestion!.tags])];dirty=true;render();});
  root.querySelector<HTMLInputElement>('[data-item-tags]')?.addEventListener('change',e=>{library.items.find(i=>i.id===selected)!.tags=(e.target as HTMLInputElement).value.split(/[,，、]/).map(t=>t.trim()).filter(Boolean);dirty=true;});
  const method=root.querySelector<HTMLSelectElement>('[data-method]');
  if(!method)return;
  method.onchange=()=>{root.querySelector<HTMLElement>('[data-generation]')!.hidden=method.value==='original';};
  root.querySelector<HTMLButtonElement>('[data-frame]')!.onclick=async()=>{
    const seconds=Number(root.querySelector<HTMLInputElement>('[data-seconds]')!.value);
    try {const url=await api().frame(dirId,selected,seconds);const img=root.querySelector<HTMLImageElement>('[data-frame-image]');if(img){img.hidden=false;img.src=url;}}
    catch(e){notice=String(e);root.querySelector('[data-progress]')!.textContent=notice;}
  };
  root.querySelector<HTMLButtonElement>('[data-generate]')!.onclick=()=>{
    const source=method.value==='frame'?selected:null;
    const seconds=Number(root.querySelector<HTMLInputElement>('[data-seconds]')!.value);
    const description=root.querySelector<HTMLTextAreaElement>('[data-description]')!.value;
    void run(async()=>{
      if(!description.trim())throw new Error('请先描述想要的动作。');
      if(!await confirmBox(root,'这会把所选参考图发送到已配置的生成服务，产生一次图片和视频生成费用。保留原件，不自动替换。继续？'))return;
      await api().save(dirId,library);dirty=false;
      const id=await api().generate(dirId,source,seconds,description);
      notice=`新版本 ${id} 已开始生成。可继续浏览；完成后刷新版本并手动选用。`;
      await reload();
    });
  };
}
