import { esc } from './_studio-shared';
import { recommendedFor } from '../../../shared/action-resources';
import './action-picker.css';

export interface ResourceChoice { id: string; name: string; meaning?: string; tags?: string[]; preview?: string; video?: string }
/** Isolated selection draft: confirmation returns IDs; cancellation never mutates the caller. */
export function pickActions(root: HTMLElement, scene: string, label: string, choices: ResourceChoice[], selected: string[], preview?: (id:string)=>Promise<string>): Promise<string[] | null> {
  return new Promise(resolve => {
    const focus = document.activeElement as HTMLElement | null;
    const mask = document.createElement('div'); mask.className = 'resource-picker';
    mask.innerHTML = `<section role="dialog" aria-modal="true" aria-label="${esc(label)}动作选择"><header><button class="btn ghost" data-back>返回</button><h2>${esc(label)} · 选择动作</h2></header><div class="resource-filters"><input type="search" data-query placeholder="搜索名称、含义或标签" aria-label="搜索动作"><select data-filter aria-label="筛选动作"><option value="all">全部</option><option value="recommended">推荐</option><option value="selected">已选</option></select></div><p>可选择多个。第一个为默认动作；推荐依据名称和标注，请预览确认。</p><div class="resource-results"></div><footer><span data-count></span><button class="btn ghost" data-cancel>取消</button><button class="btn primary" data-confirm>确认选择</button></footer></section>`;
    root.append(mask);
    let ids = [...new Set(selected)]; let page = 0; let version = 0; let closed = false;
    const query = mask.querySelector<HTMLInputElement>('[data-query]')!;
    const filter = mask.querySelector<HTMLSelectElement>('[data-filter]')!;
    const results = mask.querySelector<HTMLElement>('.resource-results')!;
    const close = (value: string[] | null) => { closed = true; version++; results.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); }); document.removeEventListener('keydown',key,true); mask.remove(); if(focus?.isConnected)focus.focus(); resolve(value); };
    const key = (e: KeyboardEvent) => {
      if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopImmediatePropagation();close(null);}
      if(e.key==='Tab'){const els=[...mask.querySelectorAll<HTMLElement>('button,input,select,video[controls]')].filter(e=>!(e as HTMLButtonElement).disabled);const i=els.indexOf(document.activeElement as HTMLElement);e.preventDefault();els[(i+(e.shiftKey?-1:1)+els.length)%els.length]?.focus();}
    };
    const count = () => { mask.querySelector('[data-count]')!.textContent = `已选 ${ids.length} 个`; };
    const render = () => {
      const revision = ++version;
      results.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});
      const rows = choices.filter(c => {
        const text = `${c.name} ${c.meaning??''} ${c.tags?.join(' ')??''}`;
        return text.toLowerCase().includes(query.value.trim().toLowerCase()) && (filter.value==='all'||filter.value==='selected'&&ids.includes(c.id)||filter.value==='recommended'&&recommendedFor(scene,text));
      });
      page = Math.max(0,Math.min(page,Math.ceil(rows.length/18)-1));
      results.innerHTML = `<div class="resource-grid">${rows.slice(page*18,page*18+18).map(c=>`<article>${c.video?`<video controls muted loop playsinline preload="none" src="${esc(c.video)}" ${c.preview?`poster="${esc(c.preview)}"`:''}></video>`:`<img data-preview="${esc(c.id)}" ${c.preview?`src="${esc(c.preview)}"`:''} alt="${esc(c.name)}" loading="lazy">`}<label><input type="checkbox" data-id="${esc(c.id)}" ${ids.includes(c.id)?'checked':''}>${esc(c.name)}</label><p>${esc(c.meaning||c.tags?.join(' · ')||'暂无标注')}</p><button class="btn quiet" data-default="${esc(c.id)}">${ids[0]===c.id?'默认动作':'设为默认'}</button></article>`).join('')||'<p>没有匹配的动作。</p>'}</div><div class="resource-pagination"><button class="btn ghost" data-prev ${page===0?'disabled':''}>上一页</button><span>${page+1} / ${Math.max(1,Math.ceil(rows.length/18))}</span><button class="btn ghost" data-next ${(page+1)*18>=rows.length?'disabled':''}>下一页</button></div>`;
      results.querySelectorAll<HTMLInputElement>('[data-id]').forEach(c=>c.onchange=()=>{ids=c.checked?[...ids,c.dataset.id!]:ids.filter(id=>id!==c.dataset.id);count();if(filter.value==='selected')render();});
      results.querySelectorAll<HTMLButtonElement>('[data-default]').forEach(b=>b.onclick=()=>{ids=[b.dataset.default!,...ids.filter(id=>id!==b.dataset.default)];render();});
      results.querySelector<HTMLButtonElement>('[data-prev]')!.onclick=()=>{page--;render();};
      results.querySelector<HTMLButtonElement>('[data-next]')!.onclick=()=>{page++;render();};
      if(preview)results.querySelectorAll<HTMLImageElement>('img:not([src])').forEach(img=>void preview(img.dataset.preview!).then(src=>{if(!closed&&revision===version)img.src=src;}).catch(()=>{img.alt+='（预览不可用）';}));
      count(); results.scrollTop=0;
    };
    query.oninput=()=>{page=0;render();};filter.onchange=()=>{page=0;render();};
    mask.querySelector<HTMLButtonElement>('[data-back]')!.onclick=()=>close(null);
    mask.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>close(null);
    mask.querySelector<HTMLButtonElement>('[data-confirm]')!.onclick=()=>close(ids);
    document.addEventListener('keydown',key,true);render();query.focus();
  });
}
