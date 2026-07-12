/** hatch 渲染进程：drop → brewing → pick → progress → certificate 五屏线性流转 */
import type { ActionId, ActionStatus, ImageProvider } from '@qbot/pipeline';
import type { HatchProgress, HatchStatus } from '../../shared/ipc-types';

const ACTION_LABELS: Record<ActionId, string> = {
  idle: '呼吸',
  drag: '悬空',
  sleep: '睡觉',
  tea: '喝茶',
  talk_happy: '聊天·开心',
  talk_annoyed: '聊天·嫌弃',
};

/** 子阶段文案（spec §5.2） */
const STATUS_LABELS: Record<ActionStatus, string> = {
  pending: '排队中',
  generating_frame: '首帧生成中',
  frame_qc: '首帧质检',
  generating_video: '视频生成中',
  keying: '抠像转码中',
  done: '完成',
  failed: '失败',
};

/** 各状态映射的固定进度点（视频任务 API 无百分比，只能按阶段权重折算，spec §5.3） */
const STATUS_PROGRESS: Record<ActionStatus, number> = {
  pending: 0,
  generating_frame: 5,
  frame_qc: 25,
  generating_video: 30,
  keying: 85,
  done: 100,
  failed: 100,
};

/** 进行中状态（卡片显示"已等 m:ss"的那些） */
const WORKING_STATUSES: ReadonlySet<ActionStatus> = new Set([
  'generating_frame',
  'frame_qc',
  'generating_video',
  'keying',
]);

let currentDirId: string | null = null;
let currentProvider: ImageProvider | undefined;
/** brewing 屏计时起点；null = 不在 brewing */
let brewingSince: number | null = null;
/** actions 阶段计时起点（本地会话内计时，重开窗口从零起算，spec §六） */
let actionsSince: number | null = null;
/** 每动作当前状态与进入该状态的时刻 */
const cellStates = new Map<ActionId, { status: ActionStatus; since: number }>();
let packageDone = false;

// ── 屏幕切换 ─────────────────────────────────────────────
type ScreenName = 'drop' | 'brewing' | 'pick' | 'progress' | 'certificate' | 'settings';
function showScreen(name: ScreenName): void {
  if (name !== 'brewing') brewingSince = null;
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
  const style = (
    document.querySelector('input[name="character-style"]:checked') as HTMLInputElement
  )?.value;
  try {
    currentDirId = await window.qbot.hatch.start(
      refPath,
      provider === 'gpt-image-2' ? 'gpt-image-2' : undefined,
      form === 'abstract' ? 'abstract' : undefined,
      // 抽象档无头身比概念，不传风格
      form === 'abstract' ? undefined : style === 'faithful' ? 'faithful' : 'chibi',
    );
  } catch (err) {
    showError(String(err instanceof Error ? err.message : err));
    return;
  }
  currentProvider = provider === 'gpt-image-2' ? 'gpt-image-2' : 'seedream';
  showBrewing(); // 三视图生成中；awaiting_pick 事件到达后切 pick 屏
});

// 抽象档没有头身比概念 → 隐藏生成风格选项
for (const radio of document.querySelectorAll<HTMLInputElement>(
  'input[name="character-form"]',
)) {
  radio.addEventListener('change', () => {
    const form = (
      document.querySelector('input[name="character-form"]:checked') as HTMLInputElement
    )?.value;
    document.getElementById('style-row')!.style.display = form === 'abstract' ? 'none' : '';
  });
}

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
      await window.qbot.hatch.resume(c.dirId);
      // resume 只是把 job 挂起来跑，立刻返回；快照铺底后事件接管
      await seedFromStatus(c.dirId);
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
      // 铺当前状态（done 的显示完成、failed 的马上被 redo 重置为排队中）
      const st = await window.qbot.hatch.getStatus(c.dirId);
      if (st) {
        actionsSince = Date.now();
        seedCells(st);
      }
      // redo 的 promise 到整轮跑完才回来，不能 await；期间靠事件驱动 UI
      window.qbot.hatch.redo(c.dirId).catch((err) => {
        showError(String(err instanceof Error ? err.message : err));
      });
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
  brewingSince = null; // 重新生成一轮，计时清零
  showBrewing();
  await window.qbot.hatch.pickTurnaround(currentDirId!, -1);
});

// ── brewing 屏（三视图生成等待，spec §5.1） ──────────────
function showBrewing(): void {
  if (brewingSince === null) brewingSince = Date.now();
  document.getElementById('brewing-hint')!.textContent =
    currentProvider === 'gpt-image-2'
      ? '同时画 3 张候选。gpt-image-2 比较慢，通常 5–10 分钟，去喝杯茶吧'
      : '同时画 3 张候选，通常 1 分钟左右，画好就让你挑';
  document.getElementById('brewing-elapsed')!.textContent = '0:00';
  showScreen('brewing');
}

// ── progress 屏 ──────────────────────────────────────────
function buildProgressGrid(): void {
  const grid = document.getElementById('action-grid')!;
  grid.replaceChildren();
  cellStates.clear();
  actionsSince = null;
  packageDone = false;
  for (const [id, label] of Object.entries(ACTION_LABELS)) {
    const cell = document.createElement('div');
    cell.className = 'action-cell';
    cell.id = `cell-${id}`;
    cell.innerHTML =
      '<div class="thumb"><span class="dot">🥚</span><img hidden alt="" /><span class="badge" hidden>🐣</span></div>' +
      `<div>${label}</div><div class="substatus">排队中</div><div class="elapsed"></div>`;
    grid.appendChild(cell);
  }
  updateOverall();
}

function updateCell(
  action: ActionId,
  status: ActionStatus,
  frameUrl?: string,
  error?: string,
): void {
  const cell = document.getElementById(`cell-${action}`);
  if (!cell) return;
  const prev = cellStates.get(action);
  if (!prev || prev.status !== status) {
    cellStates.set(action, { status, since: Date.now() });
  }
  cell.classList.remove('done', 'failed', 'working');
  if (status === 'done') cell.classList.add('done');
  else if (status === 'failed') cell.classList.add('failed');
  else if (status !== 'pending') cell.classList.add('working');

  const dot = cell.querySelector<HTMLElement>('.dot')!;
  const img = cell.querySelector('img')!;
  const badge = cell.querySelector<HTMLElement>('.badge')!;
  if (frameUrl && img.getAttribute('src') !== frameUrl) {
    img.onload = () => {
      img.hidden = false;
      dot.style.display = 'none';
    };
    img.onerror = () => {
      // 缩略图加载失败回退 🥚（spec §六）
      img.hidden = true;
      dot.style.display = '';
    };
    img.src = frameUrl;
  }
  dot.textContent = status === 'failed' ? '💔' : '🥚';
  badge.hidden = status !== 'done';
  cell.querySelector('.substatus')!.textContent = STATUS_LABELS[status] ?? status;
  // failed 卡片 hover 直接看到错误原因，不用翻日志
  cell.title = status === 'failed' && error ? error : '';
  renderTimers();
  updateOverall();
}

/** 快照铺格子（进度屏刚进入时；之后增量事件幂等覆盖） */
function seedCells(st: HatchStatus): void {
  for (const id of Object.keys(ACTION_LABELS) as ActionId[]) {
    const a = st.actions[id];
    if (a) updateCell(id, a.status, a.frameUrl, a.error);
  }
}

/**
 * 快照恢复：进入进度相关屏幕的所有路径先播快照再消费增量事件（spec §5.4）。
 * 续跑/中途重开窗口都从这里进，按 stage 落到正确的屏。
 */
async function seedFromStatus(dirId: string): Promise<void> {
  const st = await window.qbot.hatch.getStatus(dirId);
  if (!st) {
    showError('找不到该孵化任务的状态文件');
    showScreen('drop');
    return;
  }
  currentProvider = st.imageProvider ?? currentProvider;
  switch (st.stage) {
    case 'turnaround':
      showBrewing();
      break;
    case 'awaiting_pick':
      if (st.candidateUrls?.length) renderCandidates(st.candidateUrls);
      else showBrewing(); // 候选丢失时管线会回退重新生成
      break;
    case 'done':
      void showCertificate();
      break;
    default: // actions / package / failed（failed 续跑会重置重跑，先铺现状）
      buildProgressGrid();
      actionsSince = Date.now();
      seedCells(st);
      showScreen('progress');
  }
}

// ── 总进度 + 计时（spec §5.3） ────────────────────────────
function cellStatus(id: ActionId): ActionStatus {
  return cellStates.get(id)?.status ?? 'pending';
}

function updateOverall(): void {
  const ids = Object.keys(ACTION_LABELS) as ActionId[];
  const mean =
    ids.reduce((sum, id) => sum + STATUS_PROGRESS[cellStatus(id)], 0) / ids.length;
  const pct = packageDone ? 100 : mean * 0.95;
  document.getElementById('progress-bar-fill')!.style.width = `${pct}%`;
  renderProgressText();
}

function renderProgressText(): void {
  const ids = Object.keys(ACTION_LABELS) as ActionId[];
  const done = ids.filter((id) => cellStatus(id) === 'done').length;
  const failed = ids.filter((id) => cellStatus(id) === 'failed').length;
  let text = `${done}/${ids.length} 个动作完成`;
  if (failed) text += `（${failed} 个失败）`;
  if (actionsSince !== null) text += ` · 已用时 ${fmtElapsed(Date.now() - actionsSince)}`;
  document.getElementById('progress-text')!.textContent = text;
}

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 视频轮询超过这个时长，子阶段文字追加安抚（管线 15 分钟才超时，spec §六） */
const SLOW_VIDEO_MS = 10 * 60 * 1000;

/** 每秒刷新所有计时文本（brewing 已用时 / 卡片已等时长 / 总耗时） */
function renderTimers(): void {
  if (brewingSince !== null) {
    document.getElementById('brewing-elapsed')!.textContent = fmtElapsed(
      Date.now() - brewingSince,
    );
  }
  for (const [action, st] of cellStates) {
    const cell = document.getElementById(`cell-${action}`);
    if (!cell) continue;
    const elapsedEl = cell.querySelector('.elapsed')!;
    if (!WORKING_STATUSES.has(st.status)) {
      elapsedEl.textContent = '';
      continue;
    }
    const waited = Date.now() - st.since;
    elapsedEl.textContent = `已等 ${fmtElapsed(waited)}`;
    if (st.status === 'generating_video' && waited > SLOW_VIDEO_MS) {
      cell.querySelector('.substatus')!.textContent = '视频生成中（比平时久，仍在等待）';
    }
  }
  renderProgressText();
}
setInterval(renderTimers, 1000);

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
  (document.getElementById('voice-enabled') as HTMLInputElement).checked =
    settings.voiceEnabled ?? true;
  (document.getElementById('voice-volume') as HTMLInputElement).value = String(
    settings.voiceVolume ?? 70,
  );
  updateVolumeLabel();
  (document.getElementById('talk-frequency') as HTMLSelectElement).value =
    settings.talkFrequency ?? 'normal';
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

// ── 语音设置：改动即生效（settings:changed 推给 pet 窗口） ──
function updateVolumeLabel(): void {
  const vol = document.getElementById('voice-volume') as HTMLInputElement;
  document.getElementById('voice-volume-value')!.textContent = vol.value;
}

document.getElementById('voice-enabled')!.addEventListener('change', async (e) => {
  await window.qbot.settings.set({ voiceEnabled: (e.target as HTMLInputElement).checked });
});

document.getElementById('voice-volume')!.addEventListener('input', async (e) => {
  updateVolumeLabel();
  await window.qbot.settings.set({
    voiceVolume: parseInt((e.target as HTMLInputElement).value, 10),
  });
});

document.getElementById('talk-frequency')!.addEventListener('change', async (e) => {
  await window.qbot.settings.set({
    talkFrequency: (e.target as HTMLSelectElement).value as 'quiet' | 'normal' | 'chatty',
  });
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
    case 'turnaround':
      showBrewing(); // 重新生成一轮 / 续跑仍在三视图阶段
      break;
    case 'awaiting_pick':
      if (ev.candidateUrls?.length) renderCandidates(ev.candidateUrls);
      break;
    case 'actions': {
      // setStage('actions') 的无 action 事件 = 动作阶段开始；中途重开窗口时格子可能还没铺
      if (!document.getElementById('action-grid')!.childElementCount) buildProgressGrid();
      actionsSince ??= Date.now();
      if (document.getElementById('screen-brewing')!.classList.contains('active')) {
        showScreen('progress');
      }
      if (ev.action && ev.status) updateCell(ev.action, ev.status, ev.frameUrl, ev.error);
      break;
    }
    case 'done':
      packageDone = true;
      updateOverall();
      void showCertificate();
      break;
    case 'failed':
      showError(`孵化失败：${ev.error ?? '未知错误'}（可回到首页重试）`);
      showScreen('drop');
      void offerResume();
      break;
  }
});
