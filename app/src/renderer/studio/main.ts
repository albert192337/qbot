/** 生成配置页面：人设编辑 + 动作 prompt 查看 + 自定义动作 + 生成 Prompt 展示 */
import type { ActionId, AgentActionConfig, Manifest, ManifestAction, PlayableId, PromptData } from '@qbot/pipeline';

interface ActionInfo {
  id: string;
  label: string;
  status: string;
  frameUrl?: string;
  poseDesc: string;
  motionDesc: string;
  durationSec: number;
  isCustom: boolean;
}

async function main(): Promise<void> {
  const meta = await window.qbot.characters.getActive();
  if (!meta?.manifest) {
    document.getElementById('tab-actions')!.innerHTML = '<p>无激活角色，请先在桌宠中选择角色。</p>';
    return;
  }
  const m = meta.manifest;

  // 获取 prompt 重建数据
  let prompts: PromptData | undefined;
  try {
    prompts = await window.qbot.studio.getPrompts(meta.dirId);
  } catch {
    // state.json 缺失 → 无 prompt 数据，动作卡片仍正常显示
  }

  render(m, meta.dirId, prompts);

  // 渲染"生成 Prompt" tab
  if (prompts) {
    document.getElementById('tab-prompts')!.innerHTML = renderPrompts(prompts);
  } else {
    document.getElementById('tab-prompts')!.innerHTML =
      '<p style="color:#999">无法加载生成提示（.job/state.json 可能缺失）。</p>';
  }

  // Tab 切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = (btn as HTMLElement).dataset.tab!;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tabName}`)!.classList.add('active');
    });
  });
}

function render(m: Manifest, dirId: string, prompts?: PromptData): void {
  const actions: ActionInfo[] = [];
  const STD_LABELS: Partial<Record<ActionId, string>> = {
    idle: '待机', drag: '拖拽', sleep: '睡觉', tea: '喝茶',
    talk_happy: '聊天·开心', talk_annoyed: '聊天·嫌弃',
  };
  for (const [id, a] of Object.entries(m.actions) as [ActionId, ManifestAction][]) {
    const pa = prompts?.actions[id];
    actions.push({
      id,
      label: STD_LABELS[id] ?? id,
      status: a.status,
      poseDesc: pa?.poseDesc ?? '',
      motionDesc: pa?.motionDesc ?? '',
      durationSec: a.durationSec,
      isCustom: false,
    });
  }
  for (const [name, a] of Object.entries(m.customActions ?? {})) {
    actions.push({
      id: name,
      label: name,
      status: a.status,
      poseDesc: '',
      motionDesc: '',
      durationSec: a.durationSec,
      isCustom: true,
    });
  }

  let html = '';

  // ── persona ──
  html += `<h3>角色人设</h3>`;
  html += `<textarea id="persona" rows="3" placeholder="例：性格温柔体贴，喜欢关心人，说话轻声细语...">${esc(m.persona ?? '')}</textarea>`;
  html += `<div class="btn-row"><button id="save-persona" class="primary">保存人设</button></div>`;

  // ── Claude Code 联动配置 ──
  const ac = m.agentActions ?? ({} as AgentActionConfig);
  const activityActions = [
    { key: 'thinking', label: 'Claude 思考时' },
    { key: 'working', label: 'Claude 工作时' },
    { key: 'waiting', label: '等待用户时' },
    { key: 'error', label: '出错时' },
  ];
  const defaultAgentActions: Record<string, ActionId> = {
    thinking: 'tea', working: 'tea', waiting: 'talk_annoyed', error: 'talk_annoyed',
  };
  // 只列已生成完成的动作：未完成的选了也播不出来（状态机会退化成 idle）
  const actionOptions = actions
    .filter(a => a.status === 'done' && a.id !== 'idle' && a.id !== 'drag')
    .map(a => a.id);

  function actionSelect(curVal: PlayableId | undefined, defVal: string) {
    let s = `<select class="agent-action-select" data-activity="${esc(defVal)}" style="margin-left:8px">`;
    for (const id of actionOptions) {
      const label = STD_LABELS[id as ActionId] ?? id;
      const selected = (curVal ?? defaultAgentActions[defVal]) === id ? ' selected' : '';
      s += `<option value="${esc(id)}"${selected}>${esc(label ?? '')}</option>`;
    }
    s += `</select>`;
    return s;
  }

  html += `<h3>Claude Code 联动</h3>`;
  html += `<p style="font-size:11px;color:#999">配置 Claude Code 运行时桌宠播放哪个动作</p>`;
  html += `<div class="agent-config">`;
  for (const a of activityActions) {
    html += `<div style="display:flex;align-items:center;margin:6px 0">`;
    html += `<span style="flex:0 0 120px;font-size:12px;color:#555">${esc(a.label)}</span>`;
    html += actionSelect(ac[a.key as keyof AgentActionConfig] as ActionId | undefined, a.key);
    html += `</div>`;
  }
  // done action + loops
  html += `<div style="display:flex;align-items:center;margin:6px 0">`;
  html += `<span style="flex:0 0 120px;font-size:12px;color:#555">完成庆祝</span>`;
  html += actionSelect(ac.doneAction, 'doneAction');
  html += `<span style="font-size:12px;color:#555;margin-left:8px">遍数:</span>`;
  html += `<input id="done-loops" type="number" value="${ac.doneLoops ?? 1}" min="1" max="5" style="width:50px;margin-left:4px;text-align:center" />`;
  html += `</div>`;
  html += `<div class="btn-row"><button id="save-agent-config" class="primary">保存联动配置</button></div>`;
  html += `</div>`;

  // ── action list ──
  html += `<h3>动作列表</h3>`;
  for (const a of actions) {
    const frameUrl = a.status === 'done'
      ? `qbot-asset://${dirId}/actions/${a.id}.webm`
      : (a.frameUrl ?? '');
    html += `<div class="action-card" data-action="${esc(a.id)}" data-custom="${a.isCustom ? '1' : '0'}">`;
    html += `<div class="meta">`;
    html += `<b>${esc(a.label)}</b> (${esc(a.id)}) `;
    html += `<span class="status status-${a.status}">${a.status}</span> `;
    html += `时长 ${a.durationSec}s`;
    if (a.isCustom) html += ` <button class="del-action danger" data-id="${esc(a.id)}">删除</button>`;
    html += `</div>`;
    if (frameUrl) {
      html += `<video src="${frameUrl}" muted autoplay loop playsinline></video>`;
    }
    // 标准动作：可编辑的 poseDesc / motionDesc + 保存按钮
    if (!a.isCustom) {
      html += `<label>姿势描述 (poseDesc)</label>`;
      html += `<textarea class="pose-desc" rows="2">${esc(a.poseDesc)}</textarea>`;
      html += `<label>动作描述 (motionDesc)</label>`;
      html += `<textarea class="motion-desc" rows="2">${esc(a.motionDesc)}</textarea>`;
      html += `<div class="btn-row"><button class="save-prompt primary" data-id="${esc(a.id)}">保存 Prompt</button></div>`;
    }
    // 自定义动作：可编辑的 poseDesc / motionDesc（保持不变）
    if (a.isCustom) {
      html += `<label>姿势描述 (poseDesc)</label>`;
      html += `<textarea class="pose-desc" rows="2">${esc(a.poseDesc)}</textarea>`;
      html += `<label>动作描述 (motionDesc)</label>`;
      html += `<textarea class="motion-desc" rows="2">${esc(a.motionDesc)}</textarea>`;
    }
    html += `</div>`;
  }

  // ── add custom action ──
  html += `<h3>新增自定义动作</h3>`;
  html += `<label>动作名称（字母数字或中文）</label>`;
  html += `<input id="new-action-name" type="text" placeholder="例：摇摆 / dance" />`;
  html += `<label>姿势描述 (poseDesc)</label>`;
  html += `<textarea id="new-pose" rows="2" placeholder="角色站立挥手示意..."></textarea>`;
  html += `<label>动作描述 (motionDesc)</label>`;
  html += `<textarea id="new-motion" rows="2" placeholder="角色举起手左右挥动..."></textarea>`;
  html += `<label>时长 (秒)</label>`;
  html += `<input id="new-duration" type="number" value="5" min="3" max="10" />`;
  html += `<div class="btn-row"><button id="add-action" class="primary">新增并生成</button></div>`;

  html += `<p style="margin-top:16px;font-size:11px;color:#999">`
    + `提示：修改人设后，之后生成的每个动作都会注入人设。`
    + `旧动作需手动 redo 才会应用新人设。</p>`;

  document.getElementById('tab-actions')!.innerHTML = html;
  bindEvents(dirId, m);
}

/** 渲染"生成 Prompt" tab：三视图 + 每个动作的首帧/视频 prompt */
function renderPrompts(prompts: PromptData): string {
  let html = '<h3>生成参数</h3>';
  html += `<div class="config-params">`;
  html += `<p><b>角色形态:</b> ${prompts.characterForm ?? '默认 (humanoid)'}</p>`;
  html += `<p><b>生成风格:</b> ${prompts.characterStyle ?? '默认 (faithful)'}</p>`;
  html += `<p><b>生图后端:</b> ${prompts.imageProvider ?? 'seedream'}</p>`;
  html += `<p><b>角色人设:</b> ${prompts.persona ? esc(prompts.persona) : '(未设置)'}</p>`;
  html += `</div>`;

  // 三视图 prompt
  html += `<h3>三视图 Prompt</h3>`;
  html += `<div class="prompt-block"><pre>${esc(prompts.turnaroundPrompt)}</pre></div>`;

  // 每个动作的 prompt
  html += `<h3>动作 Prompt</h3>`;
  const STD_LABELS: Partial<Record<ActionId, string>> = {
    idle: '待机', drag: '拖拽', sleep: '睡觉', tea: '喝茶',
    talk_happy: '聊天·开心', talk_annoyed: '聊天·嫌弃',
  };
  for (const [id, p] of Object.entries(prompts.actions)) {
    html += `<div class="prompt-block">`;
    html += `<b>${STD_LABELS[id as ActionId] ?? id}</b> (${id})`;
    html += `<details><summary>首帧 Prompt</summary><pre>${esc(p.framePrompt)}</pre></details>`;
    html += `<details><summary>视频 Prompt</summary><pre>${esc(p.videoPrompt)}</pre></details>`;
    html += `</div>`;
  }

  html += `<p style="margin-top:12px;font-size:11px;color:#999">`;
  html += `提示：以上 Prompt 是根据 .job/state.json 中的参数重建的，`;
  html += `反映了该角色的实际生成配置。</p>`;
  return html;
}

function bindEvents(dirId: string, m: Manifest): void {
  // 保存 persona
  document.getElementById('save-persona')?.addEventListener('click', async () => {
    const ta = document.getElementById('persona') as HTMLTextAreaElement;
    await window.qbot.studio.savePersona(dirId, ta.value);
    alert('人设已保存');
  });

  // 保存 Claude Code 联动配置
  document.getElementById('save-agent-config')?.addEventListener('click', async () => {
    const selects = document.querySelectorAll<HTMLSelectElement>('.agent-action-select[data-activity]');
    const config: AgentActionConfig = {};
    selects.forEach(s => {
      const key = s.dataset.activity!;
      if (key === 'doneAction') {
        config.doneAction = s.value as ActionId;
      } else {
        (config as Record<string, ActionId>)[key] = s.value as ActionId;
      }
    });
    const doneLoops = parseInt((document.getElementById('done-loops') as HTMLInputElement)?.value ?? '1', 10);
    config.doneLoops = doneLoops > 0 ? doneLoops : 1;
    await window.qbot.studio.saveAgentActions(dirId, config);
    alert('Claude Code 联动配置已保存');
  });

  // 删除自定义动作
  document.querySelectorAll('.del-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id!;
      if (!confirm(`确定删除自定义动作 "${id}"？`)) return;
      await window.qbot.studio.deleteCustomAction(dirId, id);
      location.reload();
    });
  });

  // 保存标准动作的自定义 prompt
  document.querySelectorAll('.save-prompt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id!;
      const card = btn.closest('.action-card')!;
      const poseTa = card.querySelector('.pose-desc') as HTMLTextAreaElement;
      const motionTa = card.querySelector('.motion-desc') as HTMLTextAreaElement;
      await window.qbot.studio.saveActionPrompt(dirId, id, poseTa?.value ?? '', motionTa?.value ?? '');
      alert(`已保存 ${id} 的自定义 prompt`);
    });
  });

  // 新增自定义动作
  document.getElementById('add-action')?.addEventListener('click', async () => {
    const btn = document.getElementById('add-action') as HTMLButtonElement;
    const nameEl = document.getElementById('new-action-name') as HTMLInputElement;
    const name = nameEl.value.trim();
    const pose = (document.getElementById('new-pose') as HTMLTextAreaElement).value.trim();
    const motion = (document.getElementById('new-motion') as HTMLTextAreaElement).value.trim();
    const dur = parseInt((document.getElementById('new-duration') as HTMLInputElement).value, 10);
    if (!name || !pose || !motion) { alert('请填写所有字段'); return; }
    // 中文动作名合法（用作文件名），只禁路径分隔符等特殊字符
    if (!/^[\w一-鿿]+$/.test(name)) {
      alert('动作名称只能包含字母、数字、下划线或中文（不能有空格和符号）');
      return;
    }
    btn.disabled = true;
    btn.textContent = '提交中…';
    try {
      // 主进程写完 pending 条目就返回，生成在后台跑（数分钟）
      await window.qbot.studio.addCustomAction(dirId, name, pose, motion, dur);
      alert(`已开始生成「${name}」，需要几分钟。生成完成后本页会自动刷新，届时即可在上方联动配置里选用。`);
      location.reload();
    } catch (err) {
      // 常见原因：未配置 API key（托盘 → 设置）、动作名重复
      alert(`提交失败：${err instanceof Error ? err.message : String(err)}`);
      btn.disabled = false;
      btn.textContent = '新增并生成';
    }
  });

  // 后台生成完成/失败 → 刷新本页（动作卡片状态、联动下拉选项都要更新）
  window.qbot.studio.onCustomAction((ev) => {
    if (ev.dirId !== dirId) return;
    if (ev.status === 'done') {
      location.reload();
    } else if (ev.status === 'failed') {
      alert(`动作「${ev.name}」生成失败：${ev.error ?? '未知错误'}`);
      location.reload();
    }
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main();
