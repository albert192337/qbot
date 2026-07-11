/** hatch 渲染进程：drop → pick → progress → certificate 四屏线性流转 */
import type { ActionId } from '@qbot/pipeline';
import type { HatchProgress } from '../../shared/ipc-types';

const ACTION_LABELS: Record<ActionId, string> = {
  idle: '呼吸',
  drag: '悬空',
  sleep: '睡觉',
  tea: '喝茶',
  talk_happy: '聊天·开心',
  talk_annoyed: '聊天·嫌弃',
};

let currentDirId: string | null = null;

// ── 屏幕切换 ─────────────────────────────────────────────
type ScreenName = 'drop' | 'pick' | 'progress' | 'certificate' | 'settings';
function showScreen(name: ScreenName): void {
  for (const s of document.querySelectorAll<HTMLElement>('.screen')) {
    s.classList.toggle('active', s.id === `screen-${name}`);
  }
}

function showError(msg: string | null): void {
  const banner = document.getElementById('error-banner')!;
  banner.textContent = msg ?? '';
  banner.style.display = msg ? 'block' : 'none';
}

// ── drop 屏 ──────────────────────────────────────────────
const dropzone = document.getElementById('dropzone')!;
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('over');
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) {
    showError('请拖入一张图片文件');
    return;
  }
  showError(null);
  const refPath = window.qbot.hatch.getPathForFile(file);
  const provider = (
    document.querySelector('input[name="image-provider"]:checked') as HTMLInputElement
  )?.value;
  const form = (
    document.querySelector('input[name="character-form"]:checked') as HTMLInputElement
  )?.value;
  try {
    currentDirId = await window.qbot.hatch.start(
      refPath,
      provider === 'gpt-image-2' ? 'gpt-image-2' : undefined,
      form === 'abstract' ? 'abstract' : undefined,
    );
  } catch (err) {
    showError(String(err instanceof Error ? err.message : err));
    return;
  }
  buildProgressGrid();
  showScreen('progress'); // 三视图生成中；awaiting_pick 事件到达后切 pick 屏
});

/** 启动时检查未完成孵化与失败动作，提供续跑/修复入口 */
async function offerResume(): Promise<void> {
  const characters = await window.qbot.characters.list();
  const area = document.getElementById('resume-area')!;
  area.replaceChildren();
  for (const c of characters.filter((c) => c.hasUnfinishedJob)) {
    const btn = document.createElement('button');
    btn.textContent = `继续上次的孵化（${c.dirId.slice(0, 8)}…）`;
    btn.addEventListener('click', async () => {
      currentDirId = c.dirId;
      buildProgressGrid();
      showScreen('progress');
      await window.qbot.hatch.resume(c.dirId);
    });
    area.appendChild(btn);
  }
  // 已完成但有失败动作的角色 → 修复入口（重置 failed 后走同一 actions 流程）
  for (const c of characters.filter((c) => c.manifest)) {
    const failed = Object.values(c.manifest.actions).filter(
      (a) => a.status === 'failed',
    ).length;
    if (!failed) continue;
    const btn = document.createElement('button');
    btn.textContent = `修复「${c.manifest.name}」的 ${failed} 个失败动作`;
    btn.addEventListener('click', async () => {
      currentDirId = c.dirId;
      buildProgressGrid();
      showScreen('progress');
      await window.qbot.hatch.redo(c.dirId);
    });
    area.appendChild(btn);
  }
}
void offerResume();

// ── pick 屏 ──────────────────────────────────────────────
function renderCandidates(urls: string[]): void {
  const box = document.getElementById('candidates')!;
  box.replaceChildren();
  urls.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    img.title = `候选 ${i + 1}`;
    img.addEventListener('click', async () => {
      buildProgressGrid();
      showScreen('progress');
      await window.qbot.hatch.pickTurnaround(currentDirId!, i);
    });
    box.appendChild(img);
  });
  showScreen('pick');
}

document.getElementById('regen')!.addEventListener('click', async () => {
  buildProgressGrid();
  showScreen('progress');
  await window.qbot.hatch.pickTurnaround(currentDirId!, -1);
});

// ── progress 屏 ──────────────────────────────────────────
function buildProgressGrid(): void {
  const grid = document.getElementById('action-grid')!;
  grid.replaceChildren();
  for (const [id, label] of Object.entries(ACTION_LABELS)) {
    const cell = document.createElement('div');
    cell.className = 'action-cell';
    cell.id = `cell-${id}`;
    cell.innerHTML = `<div class="dot">🥚</div><div>${label}</div>`;
    grid.appendChild(cell);
  }
}

function updateCell(action: ActionId, status: string): void {
  const cell = document.getElementById(`cell-${action}`);
  if (!cell) return;
  cell.classList.remove('done', 'failed', 'working');
  const dot = cell.querySelector('.dot')!;
  if (status === 'done') {
    cell.classList.add('done');
    dot.textContent = '🐣';
  } else if (status === 'failed') {
    cell.classList.add('failed');
    dot.textContent = '💔';
  } else {
    cell.classList.add('working');
    dot.textContent = '🥚';
  }
}

// ── certificate 屏 ───────────────────────────────────────
/** 全动作画廊：生成完的每个动作一个小视频，确认满意再上桌 */
async function showCertificate(): Promise<void> {
  const source = document.getElementById('card-source') as HTMLImageElement;
  source.src = `qbot-asset://${currentDirId}/source.png`;
  const box = document.getElementById('card-actions')!;
  const meta = (await window.qbot.characters.list()).find((c) => c.dirId === currentDirId);
  const figs: HTMLElement[] = [];
  for (const [id, action] of Object.entries(meta?.manifest?.actions ?? {})) {
    if (action.status !== 'done') continue;
    const fig = document.createElement('figure');
    const video = document.createElement('video');
    video.src = `qbot-asset://${currentDirId}/${action.webm}`;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    const cap = document.createElement('figcaption');
    cap.textContent = ACTION_LABELS[id as ActionId] ?? id;
    fig.append(video, cap);
    figs.push(fig);
  }
  // 一次性原子替换：done 事件重复触发时两次 await 交错也不会翻倍
  box.replaceChildren(...figs);
  showScreen('certificate');
}

document.getElementById('save-card')!.addEventListener('click', async () => {
  const card = document.getElementById('card')!;
  const r = card.getBoundingClientRect();
  const saved = await window.qbot.hatch.saveCard({
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: Math.round(r.width),
    height: Math.round(r.height),
  });
  if (saved) showError(null);
});

document.getElementById('go-desk')!.addEventListener('click', async () => {
  // 命名后上桌；空名保持管线默认
  const name = (document.getElementById('pet-name') as HTMLInputElement).value.trim();
  if (name) await window.qbot.characters.rename(currentDirId!, name);
  await window.qbot.characters.activate(currentDirId!);
});

// ── settings 屏 ──────────────────────────────────────────
async function openSettings(): Promise<void> {
  const input = document.getElementById('api-key') as HTMLInputElement;
  const gptInput = document.getElementById('gpt-image-key') as HTMLInputElement;
  const scale = document.getElementById('pet-scale') as HTMLInputElement;
  const settings = await window.qbot.settings.get();
  input.value = settings.arkApiKey ?? '';
  gptInput.value = settings.gptImageApiKey ?? '';
  scale.value = String(settings.petScale ?? 1);
  updateScaleLabel();
  document.getElementById('settings-status')!.textContent = '';
  showScreen('settings');
}

function updateScaleLabel(): void {
  const scale = document.getElementById('pet-scale') as HTMLInputElement;
  document.getElementById('pet-scale-value')!.textContent =
    `${Math.round(parseFloat(scale.value) * 100)}%`;
}

// 拖滑块实时生效（窗口即画布，直接看到大小变化）
document.getElementById('pet-scale')!.addEventListener('input', async () => {
  const scale = document.getElementById('pet-scale') as HTMLInputElement;
  updateScaleLabel();
  await window.qbot.settings.set({ petScale: parseFloat(scale.value) });
});

document.getElementById('settings-save')!.addEventListener('click', async () => {
  const input = document.getElementById('api-key') as HTMLInputElement;
  const gptInput = document.getElementById('gpt-image-key') as HTMLInputElement;
  await window.qbot.settings.set({
    arkApiKey: input.value.trim(),
    gptImageApiKey: gptInput.value.trim(),
  });
  document.getElementById('settings-status')!.textContent = '已保存 ✓';
});

document.getElementById('settings-back')!.addEventListener('click', () => {
  showScreen('drop');
  void offerResume();
});

window.qbot.ui.onShowScreen((name) => {
  if (name === 'settings') void openSettings();
});

// ── 进度事件总线 ─────────────────────────────────────────
window.qbot.hatch.onProgress((ev: HatchProgress) => {
  if (currentDirId && ev.dirId !== currentDirId) return;
  currentDirId = ev.dirId;
  switch (ev.stage) {
    case 'awaiting_pick':
      if (ev.candidateUrls?.length) renderCandidates(ev.candidateUrls);
      break;
    case 'actions':
      if (ev.action && ev.status) updateCell(ev.action, ev.status);
      break;
    case 'done':
      void showCertificate();
      break;
    case 'failed':
      showError(`孵化失败：${ev.error ?? '未知错误'}（可回到首页重试）`);
      showScreen('drop');
      void offerResume();
      break;
  }
});
