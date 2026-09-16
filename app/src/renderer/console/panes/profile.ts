import { pickCharacterImage } from './character-image-picker';
import { collectActions, esc, guard, hasDirtyControls, loadStudioContext, markControlsClean, toast, trackDirtyControls } from './_studio-shared';
import { navigate } from '../workspace';
let root: HTMLElement | null = null;
let boundDirId: string | null = null;
export async function mount(host: HTMLElement): Promise<void> { root = host; await refresh(); }
export function hasUnsavedChanges(): boolean { return hasDirtyControls(root); }
export async function onVisible(): Promise<void> { if (!hasUnsavedChanges()) await refresh(); }
export async function discardChanges(): Promise<void> { await refresh(true); }
async function refresh(force = false): Promise<void> {
  if (!root) return;
  const host = root;
  const ctx = await loadStudioContext(host); if (!ctx) return;
  if (!force && boundDirId === ctx.dirId && hasUnsavedChanges()) return;
  boundDirId = ctx.dirId;
  const meta=ctx.meta;
  const actions = collectActions(ctx.m);
  const ready = actions.filter((a) => a.status === 'done').length;
  host.innerHTML = `<div class="studio-body profile-body">
    <div class="page-heading"><div><p class="eyebrow">角色工作台</p><h2>角色资料</h2><p class="page-summary">让它有自己的名字和性格，再为它添加动作。</p></div></div>
    <div class="profile-layout"><div class="profile-portrait"><img ${meta.coverImage ? `src="qbot-asset://${esc(ctx.dirId)}/${esc(meta.coverImage)}?v=${Date.now()}"` : 'hidden'} alt="${esc(ctx.m.name)}" /><p data-cover-empty ${meta.coverImage?'hidden':''}>尚未选择封面</p><p>${ready} 个可用动作</p><button class="btn" type="button" data-cover>选择封面</button></div>
    <form id="profile-form"><label for="profile-name">角色名字</label><input type="text" id="profile-name" maxlength="24" required value="${esc(ctx.m.name)}" />
    <label for="profile-persona">角色人设</label><textarea id="profile-persona" rows="5" placeholder="例如：温柔、慢热，喜欢喝茶和陪伴。">${esc(ctx.m.persona ?? '')}</textarea>
    <p class="studio-hint">人设用于之后生成的动作。保存不会自动重新生成已有动画。</p>
    <div class="btn-row"><button class="btn primary" type="submit">保存资料</button><span class="studio-hint" id="profile-feedback" role="status"></span></div></form></div>
    <div class="workspace-next"><div><h3>接下来，为它增加表达</h3><p>预览已有动作，添加新动作，或设置开会和工作时的表现。</p></div><div class="btn-row"><button class="btn" data-go="persona">管理动作</button><button class="btn ghost" data-go="scene-actions">设置场景联动</button></div></div>
  </div>`;
  host.querySelector<HTMLButtonElement>('[data-cover]')!.onclick=()=>void guard(host,host.querySelector('[data-cover]')!,'保存中…',async()=>{
    const selection=await pickCharacterImage(host,ctx.dirId,'cover');if(!selection)return;
    await window.qbot.studio.saveCover(ctx.dirId,selection);
    host.querySelector<HTMLImageElement>('.profile-portrait img')!.hidden=false;
    host.querySelector<HTMLElement>('[data-cover-empty]')!.hidden=true;
    host.querySelector<HTMLImageElement>('.profile-portrait img')!.src=`qbot-asset://${ctx.dirId}/cover.png?v=${Date.now()}`;
    window.dispatchEvent(new Event('console:characters-changed'));
  });
  trackDirtyControls(host);
  host.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((button) => button.addEventListener('click', () => navigate({ pane: button.dataset.go! })));
  host.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = host.querySelector<HTMLInputElement>('#profile-name')!;
    const persona = host.querySelector<HTMLTextAreaElement>('#profile-persona')!;
    const button = host.querySelector<HTMLButtonElement>('[type="submit"]')!;
    if (!name.value.trim()) { name.focus(); toast(host, '请填写角色名字', 'warn'); return; }
    void guard(host, button, '保存中…', async () => {
      const savedName = name.value.trim(); const savedPersona = persona.value;
      await window.qbot.characters.rename(ctx.dirId, savedName);
      if (name.value.trim() === savedName) markControlsClean(name);
      await window.qbot.studio.savePersona(ctx.dirId, savedPersona);
      if (persona.value === savedPersona) markControlsClean(persona);
      host.querySelector('#profile-feedback')!.textContent = '已保存';
      window.dispatchEvent(new Event('console:characters-changed'));
    });
  });
}
