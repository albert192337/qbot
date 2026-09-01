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
  loadStudioContext,
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
    if (ev.status !== 'pending') void refresh();
  });
  await refresh();
}

export function unmount(): void {
  unsubCustomAction?.();
  unsubCustomAction = null;
  paneRoot = null;
  boundDirId = null;
}

async function refresh(): Promise<void> {
  const root = paneRoot;
  if (!root) return;
  bumpAssetNonce(); // 重生动作后要击穿 <video> 缓存
  const ctx = await loadStudioContext(root);
  if (!ctx) {
    boundDirId = null;
    return;
  }
  boundDirId = ctx.dirId;
  const actions = collectActions(ctx.m, ctx.prompts);

  let html = '<div class="studio-body">';
  html += `<h2>人设与动作</h2>`;

  // ── persona ──
  html += `<h3>角色人设</h3>`;
  html += `<p class="studio-hint">人设会注入之后生成的每个动作的 prompt；已生成的动作需重新生成才会应用。</p>`;
  html += `<textarea id="persona" rows="3" placeholder="例：性格温柔体贴，喜欢关心人，说话轻声细语...">${esc(ctx.m.persona ?? '')}</textarea>`;
  html += `<div class="btn-row"><button id="save-persona" class="btn">保存人设</button></div>`;

  // ── action list ──
  html += `<h3>动作列表</h3>`;
  for (const a of actions) {
    const frameUrl =
      a.status === 'done'
        ? `qbot-asset://${ctx.dirId}/actions/${a.id}.webm?v=${getAssetNonce()}`
        : '';
    html += `<div class="action-card" data-action="${esc(a.id)}" data-custom="${a.isCustom ? '1' : '0'}">`;
    html += `<div class="meta">`;
    html += `<b>${esc(a.label)}</b> (${esc(a.id)}) `;
    html += `<span class="status status-${a.status}">${a.status}</span> `;
    html += `时长 ${a.durationSec}s`;
    if (a.isCustom) html += ` <button class="del-action btn danger" data-id="${esc(a.id)}">删除</button>`;
    html += `</div>`;
    if (frameUrl) html += `<video src="${frameUrl}" muted autoplay loop playsinline></video>`;
    html += `<label>姿势描述 (poseDesc)</label>`;
    html += `<textarea class="pose-desc" rows="2">${esc(a.poseDesc)}</textarea>`;
    html += `<label>动作描述 (motionDesc)</label>`;
    html += `<textarea class="motion-desc" rows="2">${esc(a.motionDesc)}</textarea>`;
    // 标准动作可存 prompt；自定义动作的 prompt 存在 manifest 里，暂只读展示（同旧实现）
    if (!a.isCustom) {
      html += `<div class="btn-row"><button class="save-prompt btn" data-id="${esc(a.id)}">保存 Prompt</button></div>`;
    }
    html += `</div>`;
  }

  // ── M 档表现力动作 ──
  const expressions = collectExpressionActions(ctx.m);
  html += `<h3>表现力动作（M 档）</h3>`;
  html += `<p class="studio-hint">一次性表演动作（得意坏笑/指认/背过身/庆祝欢呼），桌宠的吐槽、庆祝、闹别扭都靠它们演出。
  按需生成（每个约 ¥1、5 分钟左右），生成后规则与 AI 的即兴行为会自动用上。</p>`;
  html += `<div class="expr-grid">`;
  for (const ex of expressions) {
    const frameUrl =
      ex.status === 'done' ? `qbot-asset://${ctx.dirId}/actions/${ex.id}.webm?v=${getAssetNonce()}` : '';
    html += `<div class="action-card expr-card" data-expr="${esc(ex.id)}">`;
    html += `<div class="meta"><b>${esc(ex.label)}</b> (${esc(ex.id)}) `;
    html += `<span class="status status-${ex.status}">${ex.status === 'none' ? '未生成' : ex.status}</span></div>`;
    if (frameUrl) html += `<video src="${frameUrl}" muted autoplay loop playsinline></video>`;
    if (ex.status !== 'done') {
      html += `<div class="btn-row"><button class="gen-expr btn" data-id="${esc(ex.id)}">生成（约 ¥1）</button></div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // ── add custom action ──
  html += `<h3>新增自定义动作</h3>`;
  html += `<p class="studio-hint">提交后在后台生成，需要几分钟；完成后本页自动刷新，届时可在「场景动作」里选用。</p>`;
  html += `<label>动作名称（字母数字或中文）</label>`;
  html += `<input id="new-action-name" type="text" placeholder="例：摇摆 / dance" />`;
  html += `<label>姿势描述 (poseDesc)</label>`;
  html += `<textarea id="new-pose" rows="2" placeholder="角色站立挥手示意..."></textarea>`;
  html += `<label>动作描述 (motionDesc)</label>`;
  html += `<textarea id="new-motion" rows="2" placeholder="角色举起手左右挥动..."></textarea>`;
  html += `<label>时长 (秒)</label>`;
  html += `<input id="new-duration" type="number" value="5" min="3" max="10" />`;
  html += `<div class="btn-row"><button id="add-action" class="btn">新增并生成</button></div>`;
  html += '</div>';

  root.innerHTML = html;
  bind(root, ctx.dirId);
}

function bind(root: HTMLElement, dirId: string): void {
  // 保存 persona
  root.querySelector<HTMLButtonElement>('#save-persona')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const ta = root.querySelector<HTMLTextAreaElement>('#persona')!;
    void guard(root, btn, '保存中…', async () => {
      await window.qbot.studio.savePersona(dirId, ta.value);
      toast(root, '人设已保存 ✓');
    });
  });

  // 生成 M 档表现力动作
  root.querySelectorAll<HTMLButtonElement>('.gen-expr').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      void guard(root, btn, '提交中…', async () => {
        // 主进程写完 pending 条目就返回，生成在后台跑（数分钟）
        await window.qbot.studio.generateExpressionAction(dirId, id);
        toast(root, `已开始生成「${id}」，约 5 分钟，完成后本页自动刷新`);
        await refresh();
      });
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
          await refresh();
        });
      })();
    });
  });

  // 保存标准动作的自定义 prompt
  root.querySelectorAll<HTMLButtonElement>('.save-prompt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id!;
      const card = btn.closest('.action-card')!;
      const pose = card.querySelector<HTMLTextAreaElement>('.pose-desc')?.value ?? '';
      const motion = card.querySelector<HTMLTextAreaElement>('.motion-desc')?.value ?? '';
      void guard(root, btn, '保存中…', async () => {
        await window.qbot.studio.saveActionPrompt(dirId, id, pose, motion);
        toast(root, `已保存「${id}」的 prompt（重新生成后才会体现在画面上）`);
      });
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
    void guard(root, btn, '提交中…', async () => {
      // 主进程写完 pending 条目就返回，生成在后台跑（数分钟）
      await window.qbot.studio.addCustomAction(dirId, name, pose, motion, dur);
      toast(root, `已开始生成「${name}」，需要几分钟，完成后本页会自动刷新`);
      await refresh();
    });
  });
}
