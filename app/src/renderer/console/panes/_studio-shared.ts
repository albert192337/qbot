/**
 * studio 系 pane 的共享件（人设与动作 / 场景动作 / 生成 Prompt 三个 pane 共用）。
 *
 * 坑 12：renderer 只能 import type pipeline —— STD_LABELS 这类常量必须本地重声明，
 * 不能从 @qbot/pipeline value-import（会把整个 index 拖进浏览器包，构建直接失败）。
 */
import type { ActionId, Manifest, ManifestAction, PromptData } from '@qbot/pipeline';
import type { CharacterMeta } from '../../../shared/ipc-types';

/** 标准动作的中文标签（自定义动作直接用动作名）。
 *  口径统一：原先 hatch 叫「呼吸/悬空」、studio 叫「待机/拖拽」，收进同一窗会同屏出现。 */
export const STD_LABELS: Partial<Record<ActionId, string>> = {
  idle: '待机', drag: '拖拽', sleep: '睡觉', tea: '喝茶',
  talk_happy: '聊天·开心', talk_annoyed: '聊天·嫌弃',
};

export interface ActionInfo {
  id: string;
  label: string;
  status: string;
  poseDesc: string;
  motionDesc: string;
  durationSec: number;
  isCustom: boolean;
}

/**
 * 资产缓存击穿标记。原先是模块级 const，靠 location.reload() 才更新；
 * 改局部刷新后必须可变，否则重生动作后 URL 不变、Chromium 吃缓存显示旧动画。
 */
let assetNonce = Date.now();
export function bumpAssetNonce(): void {
  assetNonce = Date.now();
}
export function getAssetNonce(): number {
  return assetNonce;
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 汇总标准动作 + 自定义动作，供动作列表与联动下拉共用 */
export function collectActions(m: Manifest, prompts?: PromptData): ActionInfo[] {
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
  return actions;
}

export interface StudioContext {
  meta: CharacterMeta;
  m: Manifest;
  dirId: string;
  prompts?: PromptData;
}

/**
 * 拉取当前角色 + prompt 数据。无激活角色时写占位并返回 null——
 * 守卫只影响本 pane 内容，绝不能 return 掉控制台侧栏（旧 studio 就是这么变成死页的）。
 */
export async function loadStudioContext(root: HTMLElement): Promise<StudioContext | null> {
  const meta = await window.qbot.characters.getActive();
  if (!meta?.manifest) {
    root.innerHTML =
      '<div class="pane-placeholder">还没有激活的角色。先在「我的角色」里选一只，或去「孵化新角色」造一只。</div>';
    return null;
  }
  let prompts: PromptData | undefined;
  try {
    prompts = await window.qbot.studio.getPrompts(meta.dirId);
  } catch {
    // state.json 缺失（老角色/已清理）→ 无 prompt 数据，动作卡片仍正常显示
  }
  return { meta, m: meta.manifest, dirId: meta.dirId, prompts };
}

/**
 * 非阻塞提示条。替代原先的 alert：alert 会模态阻塞整个 renderer，
 * 而合并成单窗后这意味着所有 pane 一起冻住；由后台事件触发的那个更会凭空弹出。
 */
export function toast(root: HTMLElement, msg: string, kind: 'ok' | 'warn' = 'ok'): void {
  let el = root.querySelector<HTMLElement>('.studio-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'studio-toast';
    root.prepend(el);
  }
  el.textContent = msg;
  el.classList.toggle('warn', kind === 'warn');
  el.classList.add('show');
  window.setTimeout(() => el?.classList.remove('show'), 5_000);
}

/** 花钱操作的确认（pane 内非阻塞对话框，取代原生 confirm） */
export function confirmBox(root: HTMLElement, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    mask.className = 'studio-confirm-mask';
    const box = document.createElement('div');
    box.className = 'studio-confirm';
    const text = document.createElement('div');
    text.className = 'studio-confirm-text';
    text.textContent = message;
    const row = document.createElement('div');
    row.className = 'studio-confirm-row';
    const no = document.createElement('button');
    no.className = 'btn ghost';
    no.textContent = '取消';
    const yes = document.createElement('button');
    yes.className = 'btn danger';
    yes.textContent = '确定';
    const done = (v: boolean): void => {
      mask.remove();
      resolve(v);
    };
    no.addEventListener('click', () => done(false));
    yes.addEventListener('click', () => done(true));
    mask.addEventListener('click', (e) => {
      if (e.target === mask) done(false);
    });
    row.append(no, yes);
    box.append(text, row);
    mask.appendChild(box);
    root.appendChild(mask);
    yes.focus();
  });
}

/** 按钮忙态包装：禁用 + 改文案 + 出错走 toast，避免连点重复扣费 */
export async function guard(
  root: HTMLElement,
  btn: HTMLButtonElement,
  busyLabel: string,
  fn: () => Promise<void>,
): Promise<void> {
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = busyLabel;
  try {
    await fn();
  } catch (err) {
    toast(root, `失败：${err instanceof Error ? err.message : String(err)}`, 'warn');
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}
