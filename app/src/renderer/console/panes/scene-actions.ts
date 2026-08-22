/**
 * 场景动作 pane：为每个场景指定桌宠播放哪个动作。
 * 自 renderer/studio/main.ts 的「Claude Code 联动」区块拆出并正名（阶段 4）——
 * 它实际管三类场景（Claude 活动 / 听歌 / 飞书开会），原标题名不符实。
 *
 * 这里配的是**按角色**存在 manifest.agentActions 里的动作映射，
 * 与「连接」组的应用级开关（装不装 hooks、连不连机）语义不同，故分属两组。
 */
import type { ActionId, AgentActionConfig } from '@qbot/pipeline';
import { STD_LABELS, collectActions, esc, guard, loadStudioContext, toast } from './_studio-shared';

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

export async function mount(root: HTMLElement): Promise<void> {
  paneRoot = root;
  await refresh();
}

export function unmount(): void {
  paneRoot = null;
}

async function refresh(): Promise<void> {
  const root = paneRoot;
  if (!root) return;
  const ctx = await loadStudioContext(root);
  if (!ctx) return;

  const ac = ctx.m.agentActions ?? ({} as AgentActionConfig);
  // 只列已生成完成的动作：未完成的选了也播不出来（状态机会退化成 idle）
  const options = collectActions(ctx.m, ctx.prompts)
    .filter((a) => a.status === 'done' && a.id !== 'idle' && a.id !== 'drag')
    .map((a) => a.id);

  const select = (id: string, cur: string | undefined, def: string): string => {
    let s = `<select id="scene-${esc(id)}" data-scene="${esc(id)}">`;
    if (options.length === 0) s += `<option value="">（暂无可用动作）</option>`;
    for (const opt of options) {
      const label = STD_LABELS[opt as ActionId] ?? opt;
      const selected = (cur ?? def) === opt ? ' selected' : '';
      s += `<option value="${esc(opt)}"${selected}>${esc(label)}</option>`;
    }
    return s + `</select>`;
  };

  let html = '<div class="studio-body">';
  html += `<h2>场景动作</h2>`;
  html += `<p class="studio-hint">桌宠在各场景下播放的动作。只列已生成完成的动作——没生成完的选了也播不出来。</p>`;

  html += `<h3>Claude Code</h3>`;
  html += `<div class="scene-grid">`;
  for (const s of SCENES) {
    html += `<div class="scene-row">`;
    html += `<span class="scene-label">${esc(s.label)}<i>${esc(s.hint)}</i></span>`;
    html += select(s.key, ac[s.key as keyof AgentActionConfig] as string | undefined, DEFAULTS[s.key]);
    html += `</div>`;
  }
  // 完成庆祝：动作 + 遍数
  html += `<div class="scene-row">`;
  html += `<span class="scene-label">完成庆祝<i>跑完一轮后播放</i></span>`;
  html += select('doneAction', ac.doneAction, DEFAULTS.doneAction);
  html += `<span class="scene-extra">遍数 <input id="done-loops" type="number" value="${ac.doneLoops ?? 1}" min="1" max="5" /></span>`;
  html += `</div>`;
  html += `</div>`;

  html += `<h3>其他场景</h3>`;
  html += `<div class="scene-grid">`;
  html += `<div class="scene-row">`;
  html += `<span class="scene-label">听歌摇摆<i>网易云播放中（Windows）</i></span>`;
  html += select('musicAction', ac.musicAction, DEFAULTS.musicAction);
  html += `</div>`;
  html += `<div class="scene-row">`;
  html += `<span class="scene-label">飞书开会时<i>检测到本机入会</i></span>`;
  html += select('meetingAction', ac.meetingAction, DEFAULTS.meetingAction);
  html += `</div>`;
  html += `</div>`;

  html += `<div class="btn-row"><button id="save-scenes" class="btn">保存场景动作</button></div>`;
  html += '</div>';

  root.innerHTML = html;

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
      toast(root, '场景动作已保存 ✓（下次触发即生效）');
    });
  });
}
