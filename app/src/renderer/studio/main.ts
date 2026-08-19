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

/** 标准动作的中文标签（自定义动作直接用动作名） */
const STD_LABELS: Partial<Record<ActionId, string>> = {
  idle: '待机', drag: '拖拽', sleep: '睡觉', tea: '喝茶',
  talk_happy: '聊天·开心', talk_annoyed: '聊天·嫌弃',
};

/** 页面级缓存击穿标记（每次打开 studio 取一次新值） */
const ASSET_NONCE = Date.now();

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
    bindPromptEvents(meta.dirId); // 必须在 innerHTML 之后，否则拿不到元素
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
  // music action
  html += `<div style="display:flex;align-items:center;margin:6px 0">`;
  html += `<span style="flex:0 0 120px;font-size:12px;color:#555">听歌摇摆</span>`;
  html += `<select id="music-action" class="agent-action-select" style="margin-left:8px">`;
  for (const id of actionOptions) {
    const label = STD_LABELS[id as ActionId] ?? id;
    const selected = (ac.musicAction ?? 'talk_happy') === id ? ' selected' : '';
    html += `<option value="${esc(id)}"${selected}>${esc(label ?? '')}</option>`;
  }
  html += `</select>`;
  html += `</div>`;
  // meeting action
  html += `<div style="display:flex;align-items:center;margin:6px 0">`;
  html += `<span style="flex:0 0 120px;font-size:12px;color:#555">飞书开会时</span>`;
  html += `<select id="meeting-action" class="agent-action-select" style="margin-left:8px">`;
  for (const id of actionOptions) {
    const label = STD_LABELS[id as ActionId] ?? id;
    const selected = (ac.meetingAction ?? 'tea') === id ? ' selected' : '';
    html += `<option value="${esc(id)}"${selected}>${esc(label ?? '')}</option>`;
  }
  html += `</select>`;
  html += `</div>`;
  html += `<div class="btn-row"><button id="save-agent-config" class="primary">保存联动配置</button></div>`;
  html += `</div>`;

  // ── action list ──
  html += `<h3>动作列表</h3>`;
  for (const a of actions) {
    const frameUrl = a.status === 'done'
      // 带 nonce：重生动作后文件变了但 URL 不变，Chromium 会吃缓存显示旧动画
      ? `qbot-asset://${dirId}/actions/${a.id}.webm?v=${ASSET_NONCE}`
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

/** 渲染"生成 Prompt" tab：三视图 + 每个动作的首帧/视频 prompt（全部可编辑） */
function renderPrompts(prompts: PromptData): string {
  let html = '<h3>生成参数</h3>';
  html += `<div class="config-params">`;
  html += `<p><b>角色形态:</b> ${prompts.characterForm ?? '默认 (humanoid)'}</p>`;
  html += `<p><b>生成风格:</b> ${prompts.characterStyle ?? '默认 (faithful)'}</p>`;
  html += `<p><b>生图后端:</b> ${prompts.imageProvider ?? 'seedream'}</p>`;
  html += `<p><b>角色人设:</b> ${prompts.persona ? esc(prompts.persona) : '(未设置)'}</p>`;
  html += `</div>`;

  html += `<div class="warn-box">`;
  html += `改 prompt <b>不会</b>改变已生成的动画 —— 保存只影响之后的生成。`;
  html += `要让改动落到画面上必须重新生成，而重新生成会调用 API <b>产生费用</b>（每个动作约 ¥1）。`;
  html += `</div>`;

  // ── 三视图 prompt ──
  html += `<h3>三视图 Prompt ${prompts.turnaroundCustomized ? '<span class="badge-custom">已自定义</span>' : ''}</h3>`;
  html += `<div class="prompt-block">`;
  html += `<textarea id="turnaround-prompt" rows="6">${esc(prompts.turnaroundPrompt)}</textarea>`;
  html += `<div class="btn-row">`;
  html += `<button id="save-turnaround" class="primary">保存</button>`;
  html += `<button id="reset-turnaround">恢复默认</button>`;
  html += `<button id="regen-turnaround" class="danger">保存并重生三视图（约 ¥6）</button>`;
  html += `</div>`;
  html += `<p class="hint">三视图是所有动作的参考图 —— 换了它必须连带重新生成全部 6 个动作，`;
  html += `否则新旧风格对不上。挑图界面会弹出孵化窗。</p>`;
  html += `</div>`;

  // ── 每个动作的 prompt ──
  html += `<h3>动作 Prompt</h3>`;
  for (const [id, p] of Object.entries(prompts.actions)) {
    const label = STD_LABELS[id as ActionId] ?? id;
    const custom = p.framePromptCustomized || p.videoPromptCustomized;
    html += `<div class="prompt-block" data-action="${esc(id)}">`;
    html += `<b>${esc(label)}</b> (${esc(id)})`;
    html += custom ? ` <span class="badge-custom">已自定义</span>` : '';
    html += `<label>首帧 Prompt</label>`;
    html += `<textarea class="frame-prompt" rows="5">${esc(p.framePrompt)}</textarea>`;
    html += `<label>视频 Prompt</label>`;
    html += `<textarea class="video-prompt" rows="5">${esc(p.videoPrompt)}</textarea>`;
    html += `<p class="hint">尾部 <code>--resolution / --duration / --camerafixed</code> 是必需参数，`;
    html += `删掉会导致生成失败 —— 缺失时会自动补回。</p>`;
    html += `<div class="btn-row">`;
    html += `<button class="save-full primary" data-id="${esc(id)}">保存</button>`;
    html += `<button class="reset-full" data-id="${esc(id)}">恢复默认</button>`;
    html += `<button class="regen-action danger" data-id="${esc(id)}">保存并重新生成（约 ¥1）</button>`;
    html += `</div>`;
    html += `</div>`;
  }
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
    const musicAction = (document.getElementById('music-action') as HTMLSelectElement)?.value;
    if (musicAction) config.musicAction = musicAction as ActionId;
    const meetingAction = (document.getElementById('meeting-action') as HTMLSelectElement)?.value;
    if (meetingAction) config.meetingAction = meetingAction as ActionId;
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

/** 生成 Prompt tab 的保存 / 恢复默认 / 重新生成 */
function bindPromptEvents(dirId: string): void {
  const guard = async (btn: HTMLButtonElement, label: string, fn: () => Promise<void>) => {
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = label;
    try {
      await fn();
    } catch (err) {
      alert(`失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  };

  // ── 三视图 ──
  const turnaroundTa = () => document.getElementById('turnaround-prompt') as HTMLTextAreaElement;

  document.getElementById('save-turnaround')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    void guard(btn, '保存中…', async () => {
      await window.qbot.studio.saveTurnaroundPrompt(dirId, turnaroundTa().value);
      alert('三视图 prompt 已保存。它只在重新生成三视图时生效。');
    });
  });

  document.getElementById('reset-turnaround')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (!confirm('恢复默认模板？你当前编辑的内容会丢失。')) return;
    void guard(btn, '处理中…', async () => {
      await window.qbot.studio.saveTurnaroundPrompt(dirId, '');
      location.reload();
    });
  });

  document.getElementById('regen-turnaround')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (!confirm(
      '这会重新生成三视图，并且连带重新生成全部 6 个动作。\n\n' +
      '预计费用：3 张三视图候选 + 6 张首帧 + 6 条视频（约 ¥6 以上）。\n' +
      '过程中会弹出孵化窗让你挑三视图。\n\n确定继续？',
    )) return;
    void guard(btn, '已启动…', async () => {
      await window.qbot.studio.saveTurnaroundPrompt(dirId, turnaroundTa().value);
      await window.qbot.studio.regenerateTurnaround(dirId);
      alert('已开始重新生成。请在孵化窗里挑选三视图，之后 6 个动作会自动重跑。');
    });
  });

  // ── 各动作 ──
  const readBlock = (id: string) => {
    const block = document.querySelector(`.prompt-block[data-action="${CSS.escape(id)}"]`)!;
    return {
      frame: (block.querySelector('.frame-prompt') as HTMLTextAreaElement).value,
      video: (block.querySelector('.video-prompt') as HTMLTextAreaElement).value,
    };
  };

  document.querySelectorAll<HTMLButtonElement>('.save-full').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      const { frame, video } = readBlock(id);
      void guard(btn, '保存中…', async () => {
        await window.qbot.studio.saveFullPrompts(dirId, id, frame, video);
        alert(`${id} 的 prompt 已保存。已生成的动画不变，需重新生成才生效。`);
      });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.reset-full').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      if (!confirm(`把 ${id} 的 prompt 恢复成默认模板？`)) return;
      void guard(btn, '处理中…', async () => {
        await window.qbot.studio.saveFullPrompts(dirId, id, '', '');
        location.reload();
      });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.regen-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      if (!confirm(
        `按当前 prompt 重新生成「${id}」。\n\n` +
        `会调用 API 产生费用（1 张首帧 + 1 条视频，约 ¥1），耗时几分钟。\n\n确定继续？`,
      )) return;
      const { frame, video } = readBlock(id);
      void guard(btn, '生成中…', async () => {
        await window.qbot.studio.saveFullPrompts(dirId, id, frame, video);
        await window.qbot.studio.regenerateActions(dirId, [id]);
        alert(`「${id}」重新生成完成，桌宠已重新加载。`);
        location.reload();
      });
    });
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main();
