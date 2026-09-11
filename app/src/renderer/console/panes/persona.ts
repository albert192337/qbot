import { navigate } from '../workspace';
/**
 * 人设与动作 pane：角色人设 + 动作列表（含 poseDesc/motionDesc 编辑、删除）+ 新增自定义动作。
 * 自 renderer/studio/main.ts 的「动作配置」tab 拆出（阶段 4）。
 *
 * 关键改造：7 处 location.reload() → refresh() 局部重渲染；
 * onCustomAction 订阅移出重渲染路径（原先挂在 bindEvents 里，每次重渲染都注册一次、
 * 从不 unsubscribe，靠 reload 销毁上下文兜底）。
 */
import {
  bumpAssetNonce,
  collectActions,
  collectExpressionActions,
  confirmBox,
  esc,
  getAssetNonce,
  guard,
  hasDirtyControls,
  loadStudioContext,
  markControlsClean,
  trackDirtyControls,
  toast,
} from './_studio-shared';

let unsubCustomAction: (() => void) | null = null;
let paneRoot: HTMLElement | null = null;
let boundDirId: string | null = null;

export async function mount(root: HTMLElement): Promise<void> {
  paneRoot = root;
  // 订阅注册一次；后台生成完成/失败只刷本 pane，别的 pane 未保存输入不受影响
  unsubCustomAction?.();
  unsubCustomAction = window.qbot.studio.onCustomAction((ev) => {
    if (!paneRoot || ev.dirId !== boundDirId) return;
    if (ev.status === 'failed') {
      toast(paneRoot, `动作「${ev.name}」生成失败：${ev.error ?? '未知错误'}`, 'warn');
    } else if (ev.status === 'done') {
      toast(paneRoot, `动作「${ev.name}」生成完成 ✓`);
    }
    if (ev.status !== 'pending' && !hasUnsavedChanges()) void refresh();
    else if (hasUnsavedChanges()) toast(paneRoot, '动作状态已更新。当前输入已保留，保存后可刷新查看。');
  });
  await refresh();
}

export function unmount(): void {
  unsubCustomAction?.();
  unsubCustomAction = null;
  paneRoot = null;
  boundDirId = null;
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

async function refresh(force = false): Promise<void> {
  const root = paneRoot;
  if (!root) return;
  bumpAssetNonce(); // 重生动作后要击穿 <video> 缓存
  const ctx = await loadStudioContext(root);
  if (!ctx) {
    boundDirId = null;
    return;
  }
  if (!force && boundDirId === ctx.dirId && (hasUnsavedChanges() || root.querySelector('.studio-confirm-mask'))) return;
  boundDirId = ctx.dirId;
  const actions = collectActions(ctx.m, ctx.prompts);

  let html = '<div class="studio-body">';
  html += `<div class="page-heading"><div><p class="eyebrow">角色工作台</p><h2>动作库</h2><p class="page-summary">预览已有动作，为角色添加更多表达。</p></div><button class="btn primary" id="action-add-menu" aria-expanded="false">添加动作</button></div>`;

  html += `<div id="action-create-options" class="btn-row" hidden><button class="btn" data-add="preset">选择预设动作</button><button class="btn" data-add="custom">自定义动作</button><button class="btn" id="import-actions">导入 GIF</button></div>`;
  // ── 已拥有的动作 ──
  html += `<p class="studio-hint">默认动作、预设动作、自定义动作和导入 GIF 统一管理。点击视频预览，满意后可在场景联动中使用。</p>`;
  html += `<div class="action-toolbar"><input id="action-search" aria-label="搜索动作" data-transient type="search" placeholder="搜索动作名称或 ID" /><select id="action-status-filter" aria-label="按状态筛选" data-transient><option value="">全部状态</option><option value="done">可用</option><option value="pending">排队中</option><option value="failed">失败</option></select><select id="action-type-filter" aria-label="按来源筛选" data-transient><option value="">全部来源</option><option value="standard">随角色生成</option><option value="preset">预设动作</option><option value="custom">自定义动作</option><option value="imported">导入 GIF</option></select></div>`;
  html += '<div class="action-library-grid">';
  for (const a of actions) {
    const frameUrl =
      a.status === 'done'
        ? `qbot-asset://${ctx.dirId}/${a.webm}?v=${getAssetNonce()}`
        : '';
    const actionKind = a.isImported ? 'imported' : a.isCustom ? 'custom' : a.isExpression ? 'preset' : 'standard';
    html += `<div class="action-card" data-action="${esc(a.id)}" data-label="${esc(a.label.toLowerCase())}" data-status="${esc(a.status)}" data-kind="${actionKind}">`;
    html += `<div class="meta">`;
    html += `<b>${esc(a.label)}</b> `;
    html += `<span class="status status-${a.status}">${({ done: '可用', pending: '生成中', failed: '生成失败' } as Record<string, string>)[a.status] ?? a.status}</span> `;
    html += `时长 ${a.durationSec}s`;
    if (a.isCustom) html += ` <button class="del-action btn danger" data-id="${esc(a.id)}">删除</button>`;
    html += `</div>`;
    if(a.motionDesc)html+=`<p class="studio-hint">${esc(a.motionDesc)}</p>`;
    if (frameUrl) html += `<video src="${frameUrl}" poster="qbot-asset://${ctx.dirId}/${esc(a.gif ?? ctx.m.sourceImage)}" aria-label="${esc(a.label)}动作预览" muted controls loop playsinline preload="none"></video>`;
    html += `<p class="studio-hint">${a.isImported ? '导入 GIF' : a.isCustom ? '自定义动作' : a.isExpression ? '预设动作' : '随角色生成'}</p>`;
    if (a.status === 'done') html += `<button class="preview-action btn ghost" data-id="${esc(a.id)}">${root.closest('#house-book') ? '上台练习' : '在桌面播放'}</button>`;
    if (!a.isImported && !a.isCustom && !a.isExpression && a.status !== 'pending') html += `<button class="regenerate-action btn" data-id="${esc(a.id)}">${a.status === 'failed' ? '重试生成' : '重新生成'}</button>`;
    if (a.isCustom && a.status === 'failed') html += `<p class="studio-hint">删除失败项后，可在下方重新描述并创建。</p>`;
    html += `</div>`;
  }

  html += '</div><p id="action-no-results" class="pane-placeholder" hidden>没有匹配的动作，请调整筛选条件。</p>';

  // ── 可选预设动作 ──
  const expressions = collectExpressionActions(ctx.m).filter((ex) => ex.status !== 'done');
  html += `<details class="action-add-section" data-add-section="preset"><summary>添加预设动作 <small>从常用情绪和互动中选择</small></summary>`;
  html += `<p class="studio-hint">按需补充情绪和互动动作。它们不会增加首次创建成本，生成后会自动加入上方动作库。</p>`;
  const generatable = expressions.filter((ex) => ex.status === 'none' || ex.status === 'failed');
  if (generatable.length > 0) {
    html += `<div class="btn-row"><button id="gen-all-expr" class="btn">生成可选的 ${generatable.length} 个预设动作</button></div>`;
  }
  if (expressions.length === 0) {
    html += `<p class="studio-hint">全部预设动作已加入动作库。</p>`;
  } else {
    html += `<div class="expr-grid">`;
    for (const ex of expressions) {
      html += `<div class="action-card expr-card" data-expr="${esc(ex.id)}">`;
      html += `<div class="meta"><b>${esc(ex.label)}</b> (${esc(ex.id)}) `;
      html += `<span class="status status-${ex.status}">${ex.status === 'none' ? '未生成' : ex.status}</span></div>`;
      if (ex.status === 'none' || ex.status === 'failed') {
        html += `<div class="btn-row"><button class="gen-expr btn" data-id="${esc(ex.id)}">生成（约 ¥1）</button></div>`;
      } else {
        html += `<p class="studio-hint">正在后台生成，完成后会自动加入上方动作库。</p>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ── add custom action ──
  html += `</details><details class="action-add-section" data-add-section="custom"><summary>自定义一个动作 <small>用文字描述新的表现</small></summary>`;
  html += `<p class="studio-hint">提交后在后台生成，需要几分钟；完成后本页自动刷新，届时可在「场景动作」里选用。</p>`;
  html += `<label>动作名称（字母数字或中文）</label>`;
  html += `<input id="new-action-name" type="text" placeholder="例：摇摆 / dance" />`;
  html += `<label>起始姿势</label>`;
  html += `<textarea id="new-pose" rows="2" placeholder="角色站立挥手示意..."></textarea>`;
  html += `<label>动作过程</label>`;
  html += `<textarea id="new-motion" rows="2" placeholder="角色举起手左右挥动..."></textarea>`;
  html += `<label>时长 (秒)</label>`;
  html += `<input id="new-duration" type="number" value="5" min="5" max="10" />`;
  html += `<div class="btn-row"><button id="add-action" class="btn">新增并生成</button></div>`;
  html += '</details></div>';

  root.innerHTML = html;
  bind(root, ctx.dirId);
  trackDirtyControls(root);
}

function bind(root: HTMLElement, dirId: string): void {
  const filterActions = (): void => {
    const query = root.querySelector<HTMLInputElement>('#action-search')?.value.trim().toLowerCase() ?? '';
    const status = root.querySelector<HTMLSelectElement>('#action-status-filter')?.value ?? '';
    const kind = root.querySelector<HTMLSelectElement>('#action-type-filter')?.value ?? '';
    root.querySelectorAll<HTMLElement>('.action-card[data-action]').forEach((card) => {
      const matchesQuery = !query || `${card.dataset.label} ${card.dataset.action}`.includes(query);
      const matchesStatus = !status || card.dataset.status === status;
      const matchesKind = !kind || card.dataset.kind === kind;
      card.hidden = !(matchesQuery && matchesStatus && matchesKind);
    });
    const empty = root.querySelector<HTMLElement>('#action-no-results');
    if (empty) empty.hidden = Array.from(root.querySelectorAll<HTMLElement>('[data-action]')).some((card) => !card.hidden);
  };
  root.querySelector('#action-add-menu')?.addEventListener('click', (event) => {
    const options = root.querySelector<HTMLElement>('#action-create-options')!;
    options.hidden = !options.hidden;
    (event.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!options.hidden));
  });
  root.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((button) => button.addEventListener('click', () => {
    const section = root.querySelector<HTMLDetailsElement>(`[data-add-section="${button.dataset.add}"]`)!;
    section.open = true; section.scrollIntoView({ block: 'start', behavior: 'smooth' });
    section.querySelector<HTMLElement>('summary')?.focus();
  }));
  root.querySelector('#import-actions')?.addEventListener('click', () => navigate({ pane: 'stickers' }));
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('#action-search, #action-status-filter, #action-type-filter').forEach((control) => {
    control.addEventListener('input', filterActions);
    control.addEventListener('change', filterActions);
  });
  root.querySelectorAll<HTMLButtonElement>('.preview-action').forEach((button) => {
    button.addEventListener('click', () => {
      void guard(root, button, '准备播放…', async () => {
        if(root.closest('#house-book')){window.dispatchEvent(new CustomEvent('house:preview',{detail:{dirId,action:button.dataset.id!}}));return;}
        const active = await window.qbot.characters.getActive();
        if (active?.dirId !== dirId) {
          if (!(await confirmBox(root, '要在桌面播放，请先将正在编辑的角色放到桌面。现在切换？'))) return;
          await window.qbot.characters.activate(dirId);
        }
        window.qbot.pet.previewAction(button.dataset.id!);
      });
    });
  });
  root.querySelectorAll<HTMLButtonElement>('.regenerate-action').forEach((button) => button.addEventListener('click', () => {
    void (async () => {
      if (!(await confirmBox(root, '重新生成这个动作？会生成新的首帧和视频并产生模型费用，完成后替换当前动作。'))) return;
      await guard(root, button, '生成中…', async () => {
        await window.qbot.studio.regenerateActions(dirId, [button.dataset.id!]);
        if (!hasUnsavedChanges()) await refresh();
        else toast(root, '动作已更新，当前输入已保留。');
      });
    })();
  }));
  // 生成可选预设动作
  root.querySelectorAll<HTMLButtonElement>('.gen-expr').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      void guard(root, btn, '提交中…', async () => {
        // 主进程写完 pending 条目就返回，生成在后台跑（数分钟）
        await window.qbot.studio.generateExpressionAction(dirId, id);
        toast(root, `已开始生成「${id}」，约 5 分钟，完成后本页自动刷新`);
        if (!hasUnsavedChanges()) await refresh();
      });
    });
  });

  // 生成全部可选预设动作（只提交未生成/失败项，done/pending 跳过避免重复扣费）
  const genAllBtn = root.querySelector<HTMLButtonElement>('#gen-all-expr');
  genAllBtn?.addEventListener('click', () => {
    const toGen = Array.from(root.querySelectorAll<HTMLElement>('.expr-card'))
      .map((c) => (c.dataset.expr!))
      .filter((id) => {
        const card = root.querySelector<HTMLElement>(`.expr-card[data-expr="${id}"]`);
        const st = card?.querySelector('.status')?.textContent;
        return st === '未生成' || st === 'failed';
      });
    if (toGen.length === 0) {
      toast(root, '没有需要生成的预设动作');
      return;
    }
    void guard(root, genAllBtn, '生成中…', async () => {
      for (const id of toGen) {
        await window.qbot.studio.generateExpressionAction(dirId, id);
        toast(root, `已提交「${id}」`);
      }
      toast(root, `已提交 ${toGen.length} 个，约 5 分钟/个，完成后本页自动刷新`);
      if (!hasUnsavedChanges()) await refresh();
    });
  });

  // 删除自定义动作
  root.querySelectorAll<HTMLButtonElement>('.del-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      void (async () => {
        if (!(await confirmBox(root, `确定删除自定义动作「${id}」？`))) return;
        await guard(root, btn, '删除中…', async () => {
          await window.qbot.studio.deleteCustomAction(dirId, id);
          if (!hasUnsavedChanges()) await refresh();
        });
      })();
    });
  });

  // 新增自定义动作
  root.querySelector<HTMLButtonElement>('#add-action')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const name = root.querySelector<HTMLInputElement>('#new-action-name')!.value.trim();
    const pose = root.querySelector<HTMLTextAreaElement>('#new-pose')!.value.trim();
    const motion = root.querySelector<HTMLTextAreaElement>('#new-motion')!.value.trim();
    const dur = parseInt(root.querySelector<HTMLInputElement>('#new-duration')!.value, 10);
    if (!name || !pose || !motion) {
      toast(root, '请填写动作名称、姿势描述和动作描述', 'warn');
      return;
    }
    // 中文动作名合法（用作文件名），只禁路径分隔符等特殊字符
    if (!/^[\w一-鿿]+$/.test(name)) {
      toast(root, '动作名称只能包含字母、数字、下划线或中文（不能有空格和符号）', 'warn');
      return;
    }
    if (!Number.isFinite(dur) || dur < 5 || dur > 10) { toast(root, '时长应为 5–10 秒', 'warn'); return; }
    void guard(root, btn, '提交中…', async () => {
      // 主进程写完 pending 条目就返回，生成在后台跑（数分钟）
      await window.qbot.studio.addCustomAction(dirId, name, pose, motion, dur);
      markControlsClean(...Array.from(root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('#new-action-name, #new-pose, #new-motion, #new-duration')));
      toast(root, `已开始生成「${name}」，需要几分钟，完成后本页会自动刷新`);
      if (!hasUnsavedChanges()) await refresh();
    });
  });
}
