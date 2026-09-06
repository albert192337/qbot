/**
 * 生成 Prompt pane：三视图 prompt + 每个动作的首帧/视频 prompt（可编辑、可恢复默认、可重生）。
 * 自 renderer/studio/main.ts 的「生成 Prompt」tab 迁入（阶段 4）。
 *
 * 重生成会调 API 花钱，确认框改成 pane 内非阻塞对话框（原生 confirm 会冻住整窗）。
 */
import type { ActionId } from '@qbot/pipeline';
import { STD_LABELS, confirmBox, esc, guard, hasDirtyControls, loadStudioContext, markControlsClean, trackDirtyControls, toast } from './_studio-shared';

let paneRoot: HTMLElement | null = null;
let boundDirId: string | null = null;

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
  return hasDirtyControls(paneRoot);
}

export async function discardChanges(): Promise<void> {
  await refresh(true);
}

async function refreshPreservingDrafts(): Promise<void> {
  if (!paneRoot) return;
  const drafts = Array.from(paneRoot.querySelectorAll<HTMLTextAreaElement>('textarea'))
    .filter((control) => control.dataset.initialValue !== control.value)
    .map((control) => ({ id: control.id, action: control.closest<HTMLElement>('[data-action]')?.dataset.action,
      className: control.className, value: control.value }));
  await refresh(true);
  for (const draft of drafts) {
    const selector = draft.id ? `#${CSS.escape(draft.id)}` : `[data-action="${CSS.escape(draft.action ?? '')}"] .${CSS.escape(draft.className)}`;
    const control = paneRoot.querySelector<HTMLTextAreaElement>(selector);
    if (control) { control.value = draft.value; control.closest('details')?.setAttribute('open', ''); }
  }
}

async function refresh(force = false): Promise<void> {
  const root = paneRoot;
  if (!root) return;
  const ctx = await loadStudioContext(root);
  if (!ctx) return;
  if (!force && boundDirId === ctx.dirId && hasUnsavedChanges()) return;
  boundDirId = ctx.dirId;
  if (!ctx.prompts) {
    root.innerHTML =
      '<div class="pane-placeholder">无法加载生成提示（.job/state.json 可能缺失，老角色或已清理）。</div>';
    return;
  }
  const prompts = ctx.prompts;

  let html = '<div class="studio-body">';
  html += `<div class="page-heading"><div><p class="eyebrow">角色工作台 · 高级</p><h2>高级生成</h2><p class="page-summary">需要精确控制动作生成时，再调整完整 Prompt 与生成参数。</p></div></div>`;

  html += `<h3>生成参数</h3>`;
  html += `<div class="config-params">`;
  html += `<p><b>角色形态：</b>${esc(prompts.characterForm ?? '默认 (humanoid)')}</p>`;
  html += `<p><b>生成风格：</b>${esc(prompts.characterStyle ?? '默认 (faithful)')}</p>`;
  html += `<p><b>生图后端：</b>${esc(prompts.imageProvider ?? 'seedream')}</p>`;
  html += `<p><b>角色人设：</b>${prompts.persona ? esc(prompts.persona) : '(未设置)'}</p>`;
  html += `</div>`;

  html += `<div class="warn-box">`;
  html += `改 prompt <b>不会</b>改变已生成的动画 —— 保存只影响之后的生成。`;
  html += `要让改动落到画面上必须重新生成，而重新生成会调用 API <b>产生费用</b>（每个动作约 ¥1）。`;
  html += `</div>`;

  // ── 三视图 prompt ──
  html += `<details class="prompt-block">`;
  html += `<summary><span><b>三视图 Prompt</b><small>所有动作共用的角色参考图</small></span>${prompts.turnaroundCustomized ? '<span class="badge-custom">已自定义</span>' : ''}</summary>`;
  html += `<textarea id="turnaround-prompt" rows="6">${esc(prompts.turnaroundPrompt)}</textarea>`;
  html += `<div class="btn-row">`;
  html += `<button id="save-turnaround" class="btn">保存</button>`;
  html += `<button id="reset-turnaround" class="btn ghost">恢复默认</button>`;
  html += `<button id="regen-turnaround" class="btn danger">保存并重生三视图（约 ¥6）</button>`;
  html += `</details>`;
  html += `<p class="studio-hint">三视图是所有动作的参考图 —— 换了它必须连带重新生成全部 8 个动作，`;
  html += `否则新旧风格对不上。生成后会切到「生成任务」确认新的角色方案。</p>`;

  // ── 每个动作的 prompt ──
  html += `<h3>动作 Prompt</h3>`;
  for (const [id, p] of Object.entries(prompts.actions)) {
    const label = STD_LABELS[id as ActionId] ?? id;
    const custom = p.framePromptCustomized || p.videoPromptCustomized;
    html += `<details class="prompt-block" data-action="${esc(id)}"${custom ? ' open' : ''}>`;
    html += `<summary><span><b>${esc(label)}</b><small>${esc(id)}</small></span>${custom ? '<span class="badge-custom">已自定义</span>' : ''}</summary>`;
    html += `<label>起始姿势</label><textarea class="pose-desc" rows="2">${esc(p.poseDesc)}</textarea>`;
    html += `<label>动作过程</label><textarea class="motion-desc" rows="2">${esc(p.motionDesc)}</textarea>`;
    html += `<button class="save-description btn" data-id="${esc(id)}">保存动作描述</button>`;
    html += `<p class="studio-hint">下方完整提示词是高级覆盖项；存在覆盖时，生成以完整提示词为准。</p>`;
    html += `<label>首帧 Prompt</label>`;
    html += `<textarea class="frame-prompt" rows="5">${esc(p.framePrompt)}</textarea>`;
    html += `<label>视频 Prompt</label>`;
    html += `<textarea class="video-prompt" rows="5">${esc(p.videoPrompt)}</textarea>`;
    html += `<p class="studio-hint">尾部 <code>--resolution / --duration / --camerafixed</code> 是必需参数，`;
    html += `删掉会导致生成失败 —— 缺失时会自动补回。</p>`;
    html += `<div class="btn-row">`;
    html += `<button class="save-full btn" data-id="${esc(id)}">保存</button>`;
    html += `<button class="reset-full btn ghost" data-id="${esc(id)}">恢复默认</button>`;
    html += `<button class="regen-action btn danger" data-id="${esc(id)}">保存并重新生成（约 ¥1）</button>`;
    html += `</details>`;
  }
  html += '</div>';

  root.innerHTML = html;
  bind(root, ctx.dirId);
  trackDirtyControls(root);
}

function bind(root: HTMLElement, dirId: string): void {
  const turnaroundTa = (): HTMLTextAreaElement =>
    root.querySelector<HTMLTextAreaElement>('#turnaround-prompt')!;

  root.querySelector<HTMLButtonElement>('#save-turnaround')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    void guard(root, btn, '保存中…', async () => {
      await window.qbot.studio.saveTurnaroundPrompt(dirId, turnaroundTa().value);
      markControlsClean(turnaroundTa());
      toast(root, '三视图 prompt 已保存（只在重新生成三视图时生效）');
    });
  });

  root.querySelector<HTMLButtonElement>('#reset-turnaround')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    void (async () => {
      if (!(await confirmBox(root, '恢复默认模板？你当前编辑的内容会丢失。'))) return;
      await guard(root, btn, '处理中…', async () => {
        await window.qbot.studio.saveTurnaroundPrompt(dirId, '');
        markControlsClean(turnaroundTa());
        await refreshPreservingDrafts();
      });
    })();
  });

  root.querySelector<HTMLButtonElement>('#regen-turnaround')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    void (async () => {
      const ok = await confirmBox(
        root,
        '这会重新生成一张三视图，并连带重新生成全部 8 个动作。\n\n' +
          '预计消耗：1 张三视图 + 8 张首帧 + 8 条视频。\n' +
          '过程中会切到「生成任务」让你确认新的角色方案。\n\n确定继续？',
      );
      if (!ok) return;
      await guard(root, btn, '已启动…', async () => {
        await window.qbot.studio.saveTurnaroundPrompt(dirId, turnaroundTa().value);
        markControlsClean(turnaroundTa());
        await window.qbot.studio.regenerateTurnaround(dirId);
        toast(root, '已开始重新生成，请到「生成任务」确认新的角色方案');
      });
    })();
  });

  root.querySelectorAll<HTMLButtonElement>('.save-description').forEach((button) => button.addEventListener('click', () => {
    const block = button.closest('.prompt-block')!;
    const pose = block.querySelector<HTMLTextAreaElement>('.pose-desc')!;
    const motion = block.querySelector<HTMLTextAreaElement>('.motion-desc')!;
    void guard(root, button, '保存中…', async () => {
      await window.qbot.studio.saveActionPrompt(dirId, button.dataset.id!, pose.value, motion.value);
      markControlsClean(pose, motion); toast(root, '动作描述已保存，重新生成时生效。');
    });
  }));

  const readBlock = (id: string): { frame: string; video: string } => {
    const block = root.querySelector(`.prompt-block[data-action="${CSS.escape(id)}"]`)!;
    return {
      frame: block.querySelector<HTMLTextAreaElement>('.frame-prompt')!.value,
      video: block.querySelector<HTMLTextAreaElement>('.video-prompt')!.value,
    };
  };

  root.querySelectorAll<HTMLButtonElement>('.save-full').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      const { frame, video } = readBlock(id);
      void guard(root, btn, '保存中…', async () => {
        await window.qbot.studio.saveFullPrompts(dirId, id, frame, video);
        const block = btn.closest('.prompt-block');
        markControlsClean(
          block?.querySelector<HTMLTextAreaElement>('.frame-prompt'),
          block?.querySelector<HTMLTextAreaElement>('.video-prompt'),
        );
        toast(root, `「${id}」的 prompt 已保存（需重新生成才生效）`);
      });
    });
  });

  root.querySelectorAll<HTMLButtonElement>('.reset-full').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      void (async () => {
        if (!(await confirmBox(root, `把「${id}」的 prompt 恢复成默认模板？`))) return;
        await guard(root, btn, '处理中…', async () => {
          await window.qbot.studio.saveFullPrompts(dirId, id, '', '');
          const block = btn.closest('.prompt-block');
          markControlsClean(block?.querySelector<HTMLTextAreaElement>('.frame-prompt'), block?.querySelector<HTMLTextAreaElement>('.video-prompt'));
          await refreshPreservingDrafts();
        });
      })();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('.regen-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      void (async () => {
        const ok = await confirmBox(
          root,
          `按当前 prompt 重新生成「${id}」。\n\n` +
            `会调用 API 产生费用（1 张首帧 + 1 条视频，约 ¥1），耗时几分钟。\n\n确定继续？`,
        );
        if (!ok) return;
        const { frame, video } = readBlock(id);
        await guard(root, btn, '生成中…', async () => {
          await window.qbot.studio.saveFullPrompts(dirId, id, frame, video);
          await window.qbot.studio.regenerateActions(dirId, [id]);
          toast(root, `「${id}」重新生成完成，桌宠已重新加载`);
          await refreshPreservingDrafts();
        });
      })();
    });
  });
}
