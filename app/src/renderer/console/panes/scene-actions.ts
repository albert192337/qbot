import { pickActions } from './action-picker';
import { scenePool, resourceText } from '../../../shared/action-resources';
import { STICKER_SCENES } from '../../../shared/sticker-library';
/**
 * 场景动作 pane：为每个场景指定桌宠播放哪个动作。
 * 自 renderer/studio/main.ts 的「Claude Code 联动」区块拆出并正名（阶段 4）——
 * 它实际管三类场景（Claude 活动 / 听歌 / 飞书开会），原标题名不符实。
 *
 * 这里配的是**按角色**存在 manifest.agentActions 里的动作映射，
 * 与「连接」组的应用级开关（装不装 hooks、连不连机）语义不同，故分属两组。
 */
import type { ActionId, AgentActionConfig } from '@qbot/pipeline';
import { STD_LABELS, collectActions, esc, guard, hasDirtyControls, loadStudioContext, markControlsClean, trackDirtyControls, toast } from './_studio-shared';

/** 各场景缺省动作（与状态机 state-machine.ts 的 DEFAULT_* 保持一致） */
const DEFAULTS: Record<string, ActionId> = {
  thinking: 'tea',
  working: 'tea',
  waiting: 'talk_annoyed',
  error: 'talk_annoyed',
  doneAction: 'sleep',
  musicAction: 'talk_happy',
  meetingAction: 'tea',
};

const SCENES: { key: string; label: string; hint: string }[] = [
  { key: 'thinking', label: 'Claude 思考时', hint: 'UserPromptSubmit 后、开始干活前' },
  { key: 'working', label: 'Claude 工作时', hint: '正在读写文件、跑命令' },
  { key: 'waiting', label: '等待你处理时', hint: 'Claude 需要你确认或输入' },
  { key: 'error', label: '出错时', hint: '任务失败' },
];

let paneRoot: HTMLElement | null = null;
let boundDirId: string | null = null;
let poolsDirty = false;

export async function mount(root: HTMLElement): Promise<void> {
  paneRoot = root;
  await refresh();
}

export function unmount(): void {
  paneRoot = null;
}

export async function onVisible(): Promise<void> {
  if (!hasUnsavedChanges()) await refresh();
}

export function hasUnsavedChanges(): boolean {
  return poolsDirty || hasDirtyControls(paneRoot);
}

export async function discardChanges(): Promise<void> {
  await refresh(true);
}

async function refresh(force = false): Promise<void> {
  const root = paneRoot;
  if (!root) return;
  const ctx = await loadStudioContext(root);
  if (!ctx) return;
  if (!force && boundDirId === ctx.dirId && hasUnsavedChanges()) return;
  boundDirId = ctx.dirId;
  poolsDirty = false;
  const pools=Object.fromEntries(STICKER_SCENES.map(([id])=>[id,scenePool(ctx.m,id)]));
  const claudeConnected = await window.qbot.claude.getStatus();

  const ac = ctx.m.agentActions ?? ({} as AgentActionConfig);
  // 只列已生成完成的动作：未完成的选了也播不出来（状态机会退化成 idle）
  const options = collectActions(ctx.m, ctx.prompts)
    .filter((a) => a.status === 'done' && a.id !== 'idle' && a.id !== 'drag')
    ;

  const select = (id: string, cur: string | undefined, def: string): string => {
    let s = `<select id="scene-${esc(id)}" data-scene="${esc(id)}">`;
    if(!options.some(a=>a.id===(cur??def)))s+='<option value="" selected>未设置，请选择表情</option>';
    for (const opt of options) {
      const selected = (cur ?? def) === opt.id ? ' selected' : '';
      s += `<option value="${esc(opt.id)}"${selected}>${esc(opt.label)}${opt.motionDesc?' · '+esc(opt.motionDesc):''}</option>`;
    }
    return s + `</select>`;
  };

  let html = '<div class="studio-body">';
  html += `<div class="page-heading"><div><p class="eyebrow">角色工作台</p><h2>动作配置</h2><p class="page-summary">让桌宠根据工作、音乐与会议状态自动切换动作。</p></div></div>`;
  html += `<p class="studio-hint">桌宠在各场景下播放的动作。只列已生成完成的动作——没生成完的选了也播不出来。</p>`;
  html += `<div class="integration-strip"><span class="status-chip ${claudeConnected ? 'success' : 'muted'}">Claude Code ${claudeConnected ? '已接入' : '未接入'}</span><span class="status-chip ${navigator.platform.toLowerCase().includes('win') ? 'success' : 'muted'}">网易云监听 ${navigator.platform.toLowerCase().includes('win') ? '可用' : '仅 Windows'}</span><button class="text-action" id="open-claude-settings">管理连接</button></div>`;

  html += `<h3>基础场景</h3><p class="studio-hint">每个场景可选多个动作。待机缓慢轮换，其他场景触发时选择一个。</p><div class="scene-pool-list">${STICKER_SCENES.map(([id,label])=>`<article><h3>${label}</h3><p data-pool-summary="${id}">${pools[id].map(v=>esc(resourceText(ctx.m,v).name)).join('、')||'未设置'}</p><button class="btn ghost" data-pool="${id}">选择动作（${pools[id].length}）</button></article>`).join('')}</div><div class="btn-row"><button class="btn primary" data-save-pools>保存基础场景</button><button class="btn ghost" data-reset-pools>撤销修改</button></div>`;
  html += `<h3>Claude Code</h3>`;
  html += '<p class="studio-hint">新增工具失败监听：旧连接请在“管理连接”中断开再接入一次。工作、思考、等待和失败可分别选择不同的表情。</p>';
  html += `<div class="scene-grid">`;
  for (const s of SCENES) {
    html += `<div class="scene-row">`;
    html += `<span class="scene-label">${esc(s.label)}<i>${esc(s.hint)}</i></span>`;
    html += select(s.key, ac[s.key as keyof AgentActionConfig] as string | undefined, DEFAULTS[s.key]);
    html += `<button class="btn quiet test-scene" data-scene="${esc(s.key)}">测试</button>`;
    html += `</div>`;
  }
  // 完成庆祝：动作 + 遍数
  html += `<div class="scene-row">`;
  html += `<span class="scene-label">完成庆祝<i>跑完一轮后播放</i></span>`;
  html += select('doneAction', ac.doneAction, DEFAULTS.doneAction);
  html += `<span class="scene-extra">遍数 <input id="done-loops" type="number" value="${ac.doneLoops ?? 1}" min="1" max="5" /></span>`;
  html += `<button class="btn quiet test-scene" data-scene="doneAction">测试</button>`;
  html += `</div>`;
  html += `</div>`;

  html += `<h3>其他场景</h3>`;
  html += `<div class="scene-grid">`;
  html += `<div class="scene-row">`;
  html += `<span class="scene-label">听歌摇摆<i>网易云播放中（Windows）</i></span>`;
  html += select('musicAction', ac.musicAction, DEFAULTS.musicAction);
  html += `<button class="btn quiet test-scene" data-scene="musicAction">测试</button>`;
  html += `</div>`;
  html += `<div class="scene-row">`;
  html += `<span class="scene-label">飞书开会时<i>检测到本机入会</i></span>`;
  html += select('meetingAction', ac.meetingAction, DEFAULTS.meetingAction);
  html += `<button class="btn quiet test-scene" data-scene="meetingAction">测试</button>`;
  html += `</div>`;
  html += `</div>`;

  html += `<div class="btn-row"><button id="save-scenes" class="btn">保存场景动作</button></div>`;
  html += '</div>';

  root.innerHTML = html;
  trackDirtyControls(root);
  root.querySelectorAll<HTMLButtonElement>('[data-pool]').forEach(b=>b.onclick=async()=>{
    const scene=b.dataset.pool!;
    const choices=collectActions(ctx.m,ctx.prompts).filter(a=>a.status==='done').map(a=>({id:a.id,name:a.label,meaning:a.motionDesc,tags:resourceText(ctx.m,a.id).tags,video:`qbot-asset://${ctx.dirId}/${a.webm}`,preview:a.gif?`qbot-asset://${ctx.dirId}/${a.gif}`:undefined}));
    const ids=await pickActions(root,scene,STICKER_SCENES.find(([id])=>id===scene)![1],choices,pools[scene]);
    if(ids===null)return;
    pools[scene]=ids;poolsDirty=true;b.textContent=`选择动作（${ids.length}）`;
    root.querySelector(`[data-pool-summary="${scene}"]`)!.textContent=ids.map(id=>choices.find(c=>c.id===id)?.name??id).join('、')||'未设置';
  });
  root.querySelector<HTMLButtonElement>('[data-reset-pools]')!.onclick=()=>void refresh(true);
  root.querySelector<HTMLButtonElement>('[data-save-pools]')!.onclick=e=>void guard(root,e.currentTarget as HTMLButtonElement,'保存中…',async()=>{
    await window.qbot.studio.saveScenePools(ctx.dirId,pools);poolsDirty=false;toast(root,'基础场景已保存');
  });

  root.querySelector<HTMLButtonElement>('#save-scenes')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const config: AgentActionConfig = {};
    root.querySelectorAll<HTMLSelectElement>('select[data-scene]').forEach((sel) => {
      if (!sel.value) return;
      (config as Record<string, string>)[sel.dataset.scene!] = sel.value;
    });
    const loops = parseInt(root.querySelector<HTMLInputElement>('#done-loops')?.value ?? '1', 10);
    config.doneLoops = loops > 0 ? loops : 1;
    void guard(root, btn, '保存中…', async () => {
      await window.qbot.studio.saveAgentActions(ctx.dirId, config);
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select').forEach((control) => markControlsClean(control));
      toast(root, '场景动作已保存 ✓（下次触发即生效）');
    });
  });
  root.querySelectorAll<HTMLButtonElement>('.test-scene').forEach((button) => {
    button.addEventListener('click', () => {
      const selectElement = root.querySelector<HTMLSelectElement>(`#scene-${CSS.escape(button.dataset.scene!)}`);
      if (!selectElement?.value) {
        toast(root, '当前场景还没有可播放的动作', 'warn');
        return;
      }
      if(root.closest('#house-book')){window.dispatchEvent(new CustomEvent('house:preview',{detail:{dirId:ctx.dirId,action:selectElement.value}}));return;}
      window.qbot.pet.previewAction(selectElement.value);
      toast(root, `正在桌面预览「${selectElement.selectedOptions[0]?.textContent ?? selectElement.value}」`);
    });
  });
  root.querySelector('#open-claude-settings')?.addEventListener('click', () => window.qbot.ui.openConsole('claude'));
}
