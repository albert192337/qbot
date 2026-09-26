import type { ImageSelection } from '../../../shared/character-images';
import { esc, confirmBox } from './_studio-shared';

export async function pickCharacterImage(root: HTMLElement, dirId: string, purpose: 'cover'|'reference'): Promise<ImageSelection|null> {
  const available = await window.qbot.studio.imageChoices(dirId);
  const front = available.find(c => c.selection.kind === 'turnaround-front');
  const choices = purpose === 'cover' && front ? [front] : available;
  if (!choices.length) throw new Error('没有可用图片或动作');
  return new Promise(resolve => {
    const focus = document.activeElement as HTMLElement|null;
    const mask = document.createElement('div'); mask.className = 'studio-confirm-mask';
    mask.innerHTML = `<div class="studio-confirm frame-picker" role="dialog" aria-modal="true" aria-label="选择${purpose==='cover'?'封面':'参考帧'}" style="max-height:85vh;overflow:auto;width:min(620px,90vw)">
      <h3>${purpose==='cover'?'选择封面':'选择本次生成的参考帧'}</h3>
      <p>${purpose==='cover'?'封面只用于展示，与生成参考图分开保存。':'保留原画风与身体结构；请选择姿态适合该动作、角色完整清楚的一帧。'}</p>
      <label>素材<select data-image-choice>${choices.map((c,i)=>`<option value="${i}">${esc(c.label)}</option>`).join('')}</select></label>
      <div data-time-row hidden><label>时间轴<input data-image-slider aria-label="参考帧时间轴" type="range" min="0" max="1" step="0.01" value="0" style="width:100%"></label><label>时间（秒）<input data-image-time type="number" min="0" max="600" step="0.01" value="0"></label><output data-image-duration></output></div>
      <img data-image-preview hidden alt="所选图片预览" style="display:block;width:100%;height:240px;object-fit:contain;background:#ece8d9;margin:12px 0">
      <p data-image-error role="status"></p><div class="studio-confirm-row"><button class="btn ghost" data-cancel>取消</button><button class="btn primary" data-use disabled>${purpose==='cover'?'保存为封面':'使用这张参考图'}</button></div></div>`;
    root.append(mask);
    const select=mask.querySelector<HTMLSelectElement>('[data-image-choice]')!;
    const time=mask.querySelector<HTMLInputElement>('[data-image-time]')!;
    const slider=mask.querySelector<HTMLInputElement>('[data-image-slider]')!;
    let debounce:ReturnType<typeof setTimeout>|undefined;
    const use=mask.querySelector<HTMLButtonElement>('[data-use]')!;
    let version=0; let closed=false;
    const selection=(): ImageSelection => { const v=choices[Number(select.value)].selection; return v.kind==='action'?{...v,seconds:Number(time.value)}:v; };
    const finish=(v:ImageSelection|null)=>{closed=true;clearTimeout(debounce);document.removeEventListener('keydown',onKey,true);mask.remove();if(focus?.isConnected)focus.focus();resolve(v);};
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopImmediatePropagation();finish(null);}
      if(e.key==='Tab'){const items=[...mask.querySelectorAll<HTMLElement>('select,input,button')].filter(el=>!el.closest('[hidden]')&&!(el as HTMLButtonElement).disabled);const i=items.indexOf(document.activeElement as HTMLElement);e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();}
    };
    const preview=async()=>{
      const v=++version; use.disabled=true;
      mask.querySelector<HTMLElement>('[data-time-row]')!.hidden=selection().kind!=='action';
      mask.querySelector('[data-image-error]')!.textContent='正在取帧…';
      try {const src=await window.qbot.studio.previewImage(dirId,selection());if(closed||v!==version)return;const img=mask.querySelector<HTMLImageElement>('img')!;img.src=src;img.hidden=false;mask.querySelector('[data-image-error]')!.textContent='';use.disabled=false;}
      catch(e){if(!closed&&v===version)mask.querySelector('[data-image-error]')!.textContent=String(e);}
    };
    const selectClip=()=>{
      clearTimeout(debounce);version++;
      const duration=choices[Number(select.value)].durationSec;
      const max=duration&&Number.isFinite(duration)?Math.max(0,duration-0.05):0;
      time.max=slider.max=String(max);time.value=slider.value='0';
      mask.querySelector('[data-image-duration]')!.textContent=duration?`时长 ${duration.toFixed(2)} 秒`:'';
      void preview();
    };
    const seek=(value:string)=>{const n=Number(value);time.value=slider.value=String(Math.min(Number(slider.max),Math.max(0,Number.isFinite(n)?n:0)));version++;use.disabled=true;clearTimeout(debounce);debounce=setTimeout(()=>void preview(),160);};
    select.onchange=selectClip;time.oninput=()=>seek(time.value);slider.oninput=()=>seek(slider.value);
    use.onclick=()=>finish(selection());mask.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>finish(null);
    document.addEventListener('keydown',onKey,true);select.focus();selectClip();
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
