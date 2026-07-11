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
type ScreenName = 'drop' | 'pick' | 'progress' | 'certificate';
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
  currentDirId = await window.qbot.hatch.start(refPath);
  buildProgressGrid();
  showScreen('progress'); // 三视图生成中；awaiting_pick 事件到达后切 pick 屏
});

/** 启动时检查未完成孵化，提供续跑入口 */
async function offerResume(): Promise<void> {
  const unfinished = (await window.qbot.characters.list()).filter(
    (c) => c.hasUnfinishedJob,
  );
  const area = document.getElementById('resume-area')!;
  area.replaceChildren();
  for (const c of unfinished) {
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
function showCertificate(): void {
  const source = document.getElementById('card-source') as HTMLImageElement;
  const idle = document.getElementById('card-idle') as HTMLVideoElement;
  source.src = `qbot-asset://${currentDirId}/source.png`;
  idle.src = `qbot-asset://${currentDirId}/actions/idle.webm`;
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
      showCertificate();
      break;
    case 'failed':
      showError(`孵化失败：${ev.error ?? '未知错误'}（可回到首页重试）`);
      showScreen('drop');
      void offerResume();
      break;
  }
});
