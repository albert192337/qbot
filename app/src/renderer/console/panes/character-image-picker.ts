import type { ImageSelection } from '../../../shared/character-images';
import { esc, confirmBox } from './_studio-shared';

export async function pickCharacterImage(root: HTMLElement, dirId: string, purpose: 'cover'|'reference'): Promise<ImageSelection|null> {
  const choices = await window.qbot.studio.imageChoices(dirId);
  if (!choices.length) throw new Error('没有可用图片或动作');
  return new Promise(resolve => {
    const focus = document.activeElement as HTMLElement|null;
    const mask = document.createElement('div'); mask.className = 'studio-confirm-mask';
    mask.innerHTML = `<div class="studio-confirm" role="dialog" aria-modal="true" aria-label="选择${purpose==='cover'?'封面':'参考帧'}" style="max-height:85vh;overflow:auto;width:min(620px,90vw)">
      <h3>${purpose==='cover'?'选择封面':'选择本次生成的参考帧'}</h3>
      <p>${purpose==='cover'?'封面只用于展示，与生成参考图分开保存。':'保留原画风与身体结构；请选择姿态适合该动作、角色完整清楚的一帧。'}</p>
      <label>素材<select data-image-choice>${choices.map((c,i)=>`<option value="${i}">${esc(c.label)}</option>`).join('')}</select></label>
      <label data-time-row hidden>时间（秒）<input data-image-time type="number" min="0" max="600" step="0.05" value="0"></label>
      <img data-image-preview alt="所选图片预览" style="display:block;width:100%;height:240px;object-fit:contain;background:#ece8d9;margin:12px 0">
      <p data-image-error role="status"></p><div class="studio-confirm-row"><button class="btn ghost" data-cancel>取消</button><button class="btn primary" data-use disabled>${purpose==='cover'?'保存为封面':'使用这张参考图'}</button></div></div>`;
    root.append(mask);
    const select=mask.querySelector<HTMLSelectElement>('[data-image-choice]')!;
    const time=mask.querySelector<HTMLInputElement>('[data-image-time]')!;
    const use=mask.querySelector<HTMLButtonElement>('[data-use]')!;
    let version=0; let closed=false;
    const selection=(): ImageSelection => { const v=choices[Number(select.value)].selection; return v.kind==='action'?{...v,seconds:Number(time.value)}:v; };
    const finish=(v:ImageSelection|null)=>{closed=true;document.removeEventListener('keydown',onKey,true);mask.remove();if(focus?.isConnected)focus.focus();resolve(v);};
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopImmediatePropagation();finish(null);}
      if(e.key==='Tab'){const items=[...mask.querySelectorAll<HTMLElement>('select,input,button')].filter(el=>!el.closest('[hidden]')&&!(el as HTMLButtonElement).disabled);const i=items.indexOf(document.activeElement as HTMLElement);e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();}
    };
    const preview=async()=>{
      const v=++version; use.disabled=true;
      mask.querySelector<HTMLElement>('[data-time-row]')!.hidden=selection().kind!=='action';
      mask.querySelector('[data-image-error]')!.textContent='正在取帧…';
      try {const src=await window.qbot.studio.previewImage(dirId,selection());if(closed||v!==version)return;mask.querySelector<HTMLImageElement>('img')!.src=src;mask.querySelector('[data-image-error]')!.textContent='';use.disabled=false;}
      catch(e){if(!closed&&v===version)mask.querySelector('[data-image-error]')!.textContent=String(e);}
    };
    select.onchange=()=>{time.value='0';void preview();};time.oninput=()=>void preview();
    use.onclick=()=>finish(selection());mask.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>finish(null);
    document.addEventListener('keydown',onKey,true);select.focus();void preview();
  });
}

export async function regenerateWithReference(root:HTMLElement,dirId:string,id:string):Promise<boolean> {
  const meta=(await window.qbot.characters.list()).find(c=>c.dirId===dirId);
  if (!meta?.manifest || (!('stickerLibrary' in meta.manifest) && meta.manifest.generationMode!=='original')) {
    await window.qbot.studio.regenerateActions(dirId,[id]); return true;
  }
  let frame=await window.qbot.studio.pendingActionFrame(dirId,id);
  if (frame && !(await confirmBox(root,'有一张尚未确认的生成首帧。查看并继续使用？取消可重新选参考图。'))) frame=null;
  if (!frame) {
    const selection=await pickCharacterImage(root,dirId,'reference');if(!selection)return false;
    if(!await confirmBox(root,'先用这张参考图生成首帧，会产生一次生图费用。确认首帧后才生成视频。继续？'))return false;
    frame=await window.qbot.studio.prepareActionFrame(dirId,id,selection);
  }
  const reference=await window.qbot.studio.actionReference(dirId,id);
  const preview=document.createElement('div');
  preview.innerHTML=`<h3>检查形象和姿态</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><figure style="margin:0"><figcaption>本次参考图</figcaption><img alt="本次参考图" style="width:100%;height:min(240px,30vh);object-fit:contain;background:#ece8d9" src="${esc(reference)}"></figure><figure style="margin:0"><figcaption>生成首帧</figcaption><img alt="待确认的生成首帧" style="width:100%;height:min(240px,30vh);object-fit:contain;background:#ece8d9" src="${esc(frame)}"></figure></div>`;
  const question=confirmBox(root,'确认后生成视频并产生视频费用；取消会保留首帧和原动作。');
  const dialog=root.querySelector<HTMLElement>('.studio-confirm-mask:last-child .studio-confirm');
  if(dialog){dialog.style.width='min(660px,90vw)';dialog.style.maxHeight='85vh';dialog.style.overflow='auto';dialog.prepend(preview);}
  if(!await question)return false;
  await window.qbot.studio.approveActionFrame(dirId,id,frame);return true;
}
