import { regenerateWithReference } from './character-image-picker';
/** 创建角色 pane：从参考图到可上桌角色的完整生成流程。 */
import type { ActionId, ActionStatus, ImageProvider } from '@qbot/pipeline';
import type { HatchProgress, HatchStatus } from '../../../shared/ipc-types';
import { icon } from '../icons';
import { navigate, type ConsoleRoute } from '../workspace';
import { confirmBox } from './_studio-shared';

/** 动作中文标签。口径与 _studio-shared 的 STD_LABELS 统一 */
const ACTION_LABELS: Record<ActionId, string> = {
  perch_sit: '坐窗沿',
  perch_lie: '趴窗沿',
  idle: '待机',
  drag: '拖拽',
  sleep: '睡觉',
  tea: '喝茶',
  talk_happy: '聊天·开心',
  talk_annoyed: '聊天·嫌弃',
  wave: '挥手问候',
  stretch: '伸懒腰',
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  pending: '排队中',
  generating_frame: '首帧生成中',
  frame_qc: '首帧质检',
  generating_video: '视频生成中',
  keying: '抠像转码中',
  done: '完成',
  failed: '失败',
};

/** 各状态映射的固定进度点 */
const STATUS_PROGRESS: Record<ActionStatus, number> = {
  pending: 0,
  generating_frame: 5,
  frame_qc: 25,
  generating_video: 30,
  keying: 85,
  done: 100,
  failed: 100,
};

const WORKING_STATUSES: ReadonlySet<ActionStatus> = new Set([
  'generating_frame',
  'frame_qc',
  'generating_video',
  'keying',
]);

const SLOW_VIDEO_MS = 10 * 60 * 1000;

let root: HTMLElement | null = null;
let currentDirId: string | null = null;
let currentProvider: ImageProvider | undefined;
let brewingSince: number | null = null;
let actionsSince: number | null = null;
const cellStates = new Map<ActionId, { status: ActionStatus; since: number }>();
let packageDone = false;
let timerHandle: number | null = null;
let unsubProgress: (() => void) | null = null;
let unsubCloud: (() => void) | null = null;
let generationMode: 'cloud' | 'local' = 'cloud';
let selectedSourceFile: File | null = null;
let selectedSourceUrl: string | null = null;
let pendingCharacterName = '';

type ScreenName = 'drop' | 'brewing' | 'pick' | 'progress' | 'certificate';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null =>
  root?.querySelector<T>(sel) ?? null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  host.innerHTML = TEMPLATE;

  // 绑定所有交互事件
  bindGlobalEvents();
  bindDropzone();
  bindConfigOptions();
  bindActionButtons();

  // 订阅进度事件
  unsubProgress?.();
  unsubProgress = window.qbot.hatch.onProgress(onProgress);

  unsubCloud = window.qbot.hatch.onCloudStatus(({dirId,status}) => {
    if (dirId === currentDirId) void renderStatus(dirId,status);
  });
  generationMode = (await window.qbot.settings.get()).generationMode ?? 'cloud';
  const mode = $<HTMLSelectElement>('#hatch-mode'); if (mode) mode.value = generationMode;
  $('#hatch-mode')?.addEventListener('change', async () => {
    generationMode = $<HTMLSelectElement>('#hatch-mode')!.value === 'local' ? 'local' : 'cloud';
    await window.qbot.settings.set({generationMode}); await refreshCloudAccount();
  });
  $('#hatch-connect')?.addEventListener('click', async () => {
    const button = $<HTMLButtonElement>('#hatch-connect')!; button.disabled = true;
    try { await window.qbot.hatch.cloudAccount($<HTMLInputElement>('#hatch-invite')!.value); $<HTMLInputElement>('#hatch-invite')!.value = ''; await refreshCloudAccount(); }
    catch(e) { showError(e instanceof Error ? e.message : String(e)); }
    finally { button.disabled = false; }
  });
  await refreshCloudAccount();
  // 启动计时器
  startTimer();

  // 加载历史任务
  await loadHistoricalTasks();

}

export function unmount(): void {
  unsubProgress?.();
  unsubCloud?.();
  stopTimer();
  if (selectedSourceUrl) URL.revokeObjectURL(selectedSourceUrl);
  selectedSourceFile = null;
  selectedSourceUrl = null;
  root = null;
}

export async function onVisible(): Promise<void> {
  if (!root) return;

  if (currentDirId) {
    await seedFromStatus(currentDirId);
    return;
  }
  await loadHistoricalTasks();

}

export async function onNavigate(route: ConsoleRoute): Promise<void> {
  showError(null);
  if (route.taskId) {
    currentDirId = route.taskId;
    packageDone = false; cellStates.clear();
    const name = $<HTMLInputElement>('#hatch-pet-name'); if (name) name.value = '';
    pendingCharacterName = localStorage.getItem(`qbot:creation-name:${currentDirId}`) ?? '';
    await seedFromStatus(currentDirId);
  } else {
    currentDirId = null; packageDone = false; cellStates.clear();
    disableAllInputs(false); showScreen('drop');
    const start = $<HTMLButtonElement>('#hatch-btn-start'); if (start) start.disabled = !selectedSourceFile;
  }
}

async function refreshCloudAccount(): Promise<void> {
  const panel = $('#hatch-cloud'); if (panel) panel.hidden = generationMode !== 'cloud';
  const label = $('#hatch-cloud-account'); if (!label || generationMode !== 'cloud') return;
  try {
    const account = await window.qbot.hatch.cloudAccount();
    label.textContent = account.connected ? '已连接 · 不限次数创建角色、换方案和失败重试' : '内测期间输入邀请码，无需配置模型 Key。';
  } catch(e) { label.textContent = e instanceof Error ? e.message : '暂时无法连接'; }
}

// ───────────────────────── 核心功能 ─────────────────────────

async function startHatch(file: File): Promise<void> {
  showError(null);

  try {
    const refPath = window.qbot.hatch.getPathForFile(file);
    const provider = getSelectedProvider();
    const form = getSelectedForm();
    const style = getSelectedStyle();
    const name = $<HTMLInputElement>('#hatch-draft-name')?.value.trim() || '';
    if (!name) {
      showError('先给桌宠起个名字，再开始创建。');
      $<HTMLInputElement>('#hatch-draft-name')?.focus();
      return;
    }
    const settings = await window.qbot.settings.get();
    const cloud = generationMode === 'cloud';
    if (cloud) {
      const account = await window.qbot.hatch.cloudAccount();
      if (!account.connected) { showError('请先输入邀请码并连接。'); return; }
    }
    const hasKey = cloud || (!!settings.arkApiKey && (provider !== 'gpt-image-2' || !!settings.gptImageApiKey));
    if (!hasKey) {
      showError(`尚未配置${provider === 'gpt-image-2' ? ' GPT-Image-2' : '火山方舟'} API Key，请先到「设置 → 模型与 API」完成配置。`);
      return;
    }
    const confirmed = await confirmBox(
      root!,
      `开始创建「${name}」？\n\n将先生成 1 个角色方案；确认后，再生成${cloud ? '一套基础动作' : ' 10 个常用动作'}。\n` +
        `模型：${provider === 'gpt-image-2' ? 'gpt-image-2' : 'Seedream'}\n` +
        `预计时间：${provider === 'gpt-image-2' ? '约 45–80 分钟' : '约 35–60 分钟'}\n` +
        (cloud ? '有效邀请码可不限次数创建、换方案和失败重试。\n角色图片会上传至 QBot 服务器并交给模型服务生成；只上传所选图片、角色名字和形象选项。关闭客户端后任务仍会继续，完成后回来领取。' : '预计消耗：1 张角色方案 + 10 个动作。任务提交后，已发出的 API 请求无法撤回。'),
    );
    if (!confirmed) return;

    pendingCharacterName = name;
    disableAllInputs(true);

    currentDirId = await window.qbot.hatch.start(
      refPath,
      provider === 'gpt-image-2' ? 'gpt-image-2' : undefined,
      form === 'abstract' ? 'abstract' : undefined,
      form === 'abstract' ? undefined : style === 'faithful' ? 'faithful' : 'chibi',
      name,
    );

    localStorage.setItem(`qbot:creation-name:${currentDirId}`, name);
    currentProvider = provider === 'gpt-image-2' ? 'gpt-image-2' : 'seedream';
    showScreen('brewing');
    await seedFromStatus(currentDirId);

  } catch (err) {
    showError(String(err instanceof Error ? err.message : err));
    disableAllInputs(false);
  }
}

async function resumeHatch(dirId: string): Promise<void> {
  try {
    disableAllInputs(true);
    currentDirId = dirId;
    await window.qbot.hatch.resume(dirId);
    await seedFromStatus(dirId);
  } catch (err) {
    showError(String(err instanceof Error ? err.message : err));
    disableAllInputs(false);
  }
}

async function regenerateAction(actionId: ActionId): Promise<void> {
  if (!currentDirId) return;

  try {
    if (!(await confirmBox(root!, `重试「${ACTION_LABELS[actionId]}」？只重新生成这一个动作，会调用模型服务并产生费用。`))) return;
    if (!await regenerateWithReference(root!, currentDirId, actionId)) return;
    await seedFromStatus(currentDirId);
  } catch (err) {
    showError(String(err instanceof Error ? err.message : err));
  }
}

// ───────────────────────── 界面渲染 ─────────────────────────

function showScreen(screen: ScreenName): void {
  if (screen !== 'brewing') brewingSince = null;

  // 隐藏所有屏幕
  root?.querySelectorAll('.hatch-screen').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('active');
  });

  // 显示目标屏幕
  const target = $(`#hatch-screen-${screen}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  const title = root?.querySelector<HTMLElement>('.header-title h1');
  if (title) title.textContent = screen === 'drop' ? '创建一个会动的桌宠' : screen === 'certificate' ? '角色已生成' : '角色生成进度';
  const taskBack = $('#hatch-task-back'); if (taskBack) taskBack.hidden = screen === 'drop';
  const taskResume = $('#hatch-task-resume'); if (taskResume && screen === 'drop') taskResume.hidden = true;
  updateStepNavigation(screen);
}

function showBrewing(): void {
  if (brewingSince === null) brewingSince = Date.now();
  const providerName = $('#hatch-provider-name');
  if (providerName) {
    providerName.textContent = currentProvider === 'gpt-image-2' ? 'gpt-image-2' : 'Seedream';
  }
  const hint = $('#hatch-brewing-hint');
  if (hint) {
    hint.textContent =
      currentProvider === 'gpt-image-2'
        ? '正在生成 1 个角色方案。gpt-image-2 通常需要 5–10 分钟'
        : '正在生成 1 个角色方案，通常约 1 分钟';
  }
  const elapsed = $('#hatch-brewing-elapsed');
  if (elapsed) elapsed.textContent = '0:00';
  showScreen('brewing');
}

function updateStepNavigation(currentScreen: ScreenName): void {
  const steps = root?.querySelectorAll('.hatch-step') ?? [];
  const screenToStepIndex: Record<ScreenName, number> = {
    'drop': 0,
    'brewing': 1,
    'pick': 1,
    'progress': 2,
    'certificate': 3
  };

  steps.forEach((step, index) => {
    // 重置状态
    step.classList.remove('active', 'completed', 'disabled');

    if (index < screenToStepIndex[currentScreen]) {
      step.classList.add('completed');
    } else if (index === screenToStepIndex[currentScreen]) {
      step.classList.add('active');
    } else {
      step.classList.add('disabled');
    }
  });
}

function renderCandidates(urls: string[]): void {
  const container = $('#hatch-candidates-container');
  if (!container) return;

  container.innerHTML = '';
  urls.forEach((url, index) => {
    const card = createCandidateCard(url, index);
    container.appendChild(card);
  });

  showScreen('pick');
  root?.querySelectorAll<HTMLButtonElement>('.btn-select, #hatch-btn-regen').forEach((button) => { button.disabled = false; });
}

function createCandidateCard(url: string, index: number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'candidate-card';
  card.innerHTML = `
    <div class="candidate-thumbnail">
      <img src="${url}" alt="角色三视图方案" loading="lazy" />
      <div class="candidate-overlay">
        <button class="btn-select">使用这个方案</button>
      </div>
    </div>
  `;

  card.addEventListener('click', async () => {
    if (!currentDirId) return;

    const grid = $('#hatch-action-grid');
    if (!grid?.childElementCount) buildProgressGrid();

    showScreen('progress');
    try { await window.qbot.hatch.pickTurnaround(currentDirId, index); }
    catch (error) { showError(String(error)); showScreen('pick'); }
  });

  return card;
}

function buildProgressGrid(): void {
  const grid = $('#hatch-action-grid');
  if (!grid) return;

  grid.innerHTML = '';
  cellStates.clear();
  actionsSince = null;
  packageDone = false;

  for (const [id, label] of Object.entries(ACTION_LABELS)) {
    const cell = createActionCell(id as ActionId, label);
    grid.appendChild(cell);
  }

  updateOverallProgress();
}

function createActionCell(actionId: ActionId, label: string): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'action-cell';
  cell.id = `hatch-cell-${actionId}`;
  cell.innerHTML = `
    <div class="action-thumbnail">
        <span class="status-icon">○</span>
      <img hidden alt="${label}" />
      <span class="status-badge" hidden>✅</span>
    </div>
    <div class="action-name">${label}</div>
    <div class="action-status">排队中</div>
    <div class="action-elapsed"></div>
  `;

  return cell;
}

function updateCell(action: ActionId, status: ActionStatus, frameUrl?: string, error?: string): void {
  const cell = $(`#hatch-cell-${action}`);
  if (!cell) return;

  const prev = cellStates.get(action);
  if (!prev || prev.status !== status) {
    cellStates.set(action, { status, since: Date.now() });
  }

  // 更新状态类
  cell.classList.remove('done', 'failed', 'working');
  if (status === 'done') cell.classList.add('done');
  else if (status === 'failed') cell.classList.add('failed');
  else if (status !== 'pending') cell.classList.add('working');

  // 更新图标和内容
  const icon = cell.querySelector<HTMLElement>('.status-icon')!;
  const img = cell.querySelector<HTMLImageElement>('img')!;
  const badge = cell.querySelector<HTMLElement>('.status-badge')!;
  const statusText = cell.querySelector<HTMLElement>('.action-status')!;
  const elapsedText = cell.querySelector<HTMLElement>('.action-elapsed')!;

  // 更新缩略图
  if (frameUrl && img.src !== frameUrl) {
    img.onload = () => {
      img.hidden = false;
      icon.style.display = 'none';
    };
    img.onerror = () => {
      img.hidden = true;
      icon.style.display = '';
    };
    img.src = frameUrl;
  }

  // 更新状态显示
  icon.textContent = getStatusIcon(status);
  badge.hidden = status !== 'done';
  statusText.textContent = STATUS_LABELS[status] ?? status;
  cell.title = status === 'failed' && error ? error : '';

  renderTimers();
  updateOverallProgress();
}

function getStatusIcon(status: ActionStatus): string {
  const icons: Record<ActionStatus, string> = {
    'pending': '○',
    'generating_frame': '↻',
    'frame_qc': '?',
    'generating_video': '▶',
    'keying': '◇',
    'done': '✓',
    'failed': '!'
  };
  return icons[status] || '·';
}

async function seedFromStatus(dirId: string): Promise<void> {
  const st = await window.qbot.hatch.getStatus(dirId);
  if (!st) {
    showScreen('drop');
    return;
  }

  await renderStatus(dirId,st);
}

async function renderStatus(dirId: string, st: HatchStatus): Promise<void> {
  if (dirId !== currentDirId) return;
  const resume = $<HTMLButtonElement>('#hatch-task-resume');
  if (resume) resume.hidden = !!st.running || st.stage === 'done';
  currentProvider = st.imageProvider ?? currentProvider;
  showError(st.error ?? null);
  const cloudHint = $('#hatch-cloud-task');
  if (cloudHint) {
    cloudHint.hidden = !st.cloud;
    cloudHint.textContent = st.cloudPhase === 'queued' ? `正在云端排队（第 ${st.queuePosition || 1} 位），可离开此页面。` : '云端任务会在关闭客户端后继续；完成后返回本任务领取。';
  }

  if (st.stage !== 'done') packageDone = false;
  switch (st.stage) {
    case 'turnaround':
      showBrewing();
      break;
    case 'awaiting_pick':
      if (st.candidateUrls?.length) {
        renderCandidates(st.candidateUrls);
        if (!st.running) root?.querySelectorAll<HTMLButtonElement>('.btn-select, #hatch-btn-regen').forEach((button) => { button.disabled = true; });
      }
      else showBrewing();
      break;
    case 'done':
      if (packageDone) break;
      buildProgressGrid();
      seedCells(st);
      packageDone = true;
      await showCertificate();
      break;
    default:
      buildProgressGrid();
      actionsSince ??= Date.now();
      seedCells(st);
      showScreen('progress');
  }
}

function seedCells(st: HatchStatus): void {
  for (const id of Object.keys(ACTION_LABELS) as ActionId[]) {
    const a = st.actions[id];
    if (a) updateCell(id, a.status, a.frameUrl, a.error);
  }
}

function cellStatus(id: ActionId): ActionStatus {
  return cellStates.get(id)?.status ?? 'pending';
}

function updateOverallProgress(): void {
  const ids = Object.keys(ACTION_LABELS) as ActionId[];
  const mean = ids.reduce((sum, id) => sum + STATUS_PROGRESS[cellStatus(id)], 0) / ids.length;
  const pct = packageDone ? 100 : mean * 0.95;

  const fill = $('#hatch-progress-fill');
  if (fill) fill.style.width = `${pct}%`;

  renderProgressText();
}

function renderProgressText(): void {
  const el = $('#hatch-progress-text');
  if (!el) return;

  const ids = Object.keys(ACTION_LABELS) as ActionId[];
  const done = ids.filter((id) => cellStatus(id) === 'done').length;
  const failed = ids.filter((id) => cellStatus(id) === 'failed').length;

  let text = `${done}/${ids.length} 个动作完成`;
  if (failed) text += `（${failed} 个失败）`;
  if (actionsSince !== null) text += ` · 已用时 ${fmtElapsed(Date.now() - actionsSince)}`;

  el.textContent = text;
}

function renderTimers(): void {
  if (!root) return;

  // 更新孵化计时
  if (brewingSince !== null) {
    const el = $('#hatch-brewing-elapsed');
    if (el) el.textContent = fmtElapsed(Date.now() - brewingSince);
  }

  // 更新每个动作的计时
  for (const [action, st] of cellStates) {
    const cell = $(`#hatch-cell-${action}`);
    if (!cell) continue;

    const elapsedEl = cell.querySelector('.action-elapsed')!;
    if (!WORKING_STATUSES.has(st.status)) {
      elapsedEl.textContent = '';
      continue;
    }

    const waited = Date.now() - st.since;
    elapsedEl.textContent = `已等 ${fmtElapsed(waited)}`;

    // 慢任务提示
    if (st.status === 'generating_video' && waited > SLOW_VIDEO_MS) {
      const subStatus = cell.querySelector('.action-status')!;
      subStatus.textContent = '视频生成中（比平时久）';
    }
  }

  renderProgressText();
}

async function showCertificate(): Promise<void> {
  const source = $<HTMLImageElement>('#hatch-card-source');
  if (source && currentDirId) {
    source.src = `qbot-asset://${currentDirId}/source.png?v=${Date.now()}`;
  }

  const container = $('#hatch-card-actions');
  if (!container || !currentDirId) return;

  const requestedDirId = currentDirId;
  const meta = (await window.qbot.characters.list()).find((c) => c.dirId === requestedDirId);
  if (requestedDirId !== currentDirId) return;
  const nameInput = $<HTMLInputElement>('#hatch-pet-name');
  if (nameInput && !nameInput.value) {
    nameInput.value = pendingCharacterName || meta?.manifest?.name || '';
  }
  if (pendingCharacterName && meta?.manifest && meta.manifest.name !== pendingCharacterName) {
    await window.qbot.characters.rename(currentDirId, pendingCharacterName);
  }
  const failedCount = Object.values(meta?.manifest?.actions ?? {}).filter((action) => action.status === 'failed').length;
  const heading = root?.querySelector<HTMLElement>('#hatch-screen-certificate h3');
  if (heading) heading.textContent = failedCount ? `角色已生成，${failedCount} 个动作需要修复` : '你的桌宠准备好了';
  const figs: HTMLElement[] = [];

  for (const [id, action] of Object.entries(meta?.manifest?.actions ?? {})) {
    if (action.status !== 'done') continue;

    const fig = document.createElement('figure');
    fig.className = 'certificate-figure';

    const video = document.createElement('video');
    video.src = `qbot-asset://${currentDirId}/${action.webm}?v=${Date.now()}`;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.className = 'certificate-video';

    // 处理自动播放
    video.play().catch(() => {
      const playBtn = document.createElement('button');
      playBtn.className = 'btn-play';
      playBtn.innerHTML = icon('actions');
      playBtn.setAttribute('aria-label', '播放动作预览');
      playBtn.addEventListener('click', () => {
        video.play().then(() => playBtn.remove()).catch(console.error);
      });
      fig.appendChild(playBtn);
    });

    const caption = document.createElement('figcaption');
    caption.textContent = ACTION_LABELS[id as ActionId] ?? id;

    fig.append(video, caption);
    figs.push(fig);
  }

  container.replaceChildren(...figs);
  showScreen('certificate');
  disableAllInputs(true);
}

async function saveCertificateCard(): Promise<void> {
  const card = $('.certificate-card');
  if (!card) return;

  card.scrollIntoView({ block: 'center' });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const rect = card.getBoundingClientRect();
  const saved = await window.qbot.hatch.saveCard({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });
  if (saved) showError(null);
}

async function activatePet(): Promise<void> {
  if (!currentDirId) return;
  const name = $<HTMLInputElement>('#hatch-pet-name')?.value.trim();
  if (name) await window.qbot.characters.rename(currentDirId, name);
  await window.qbot.characters.activate(currentDirId);
  localStorage.removeItem(`qbot:creation-name:${currentDirId}`);
  navigate({ pane: 'profile', dirId: currentDirId });
}

function onProgress(ev: HatchProgress): void {
  if (!root) return;
  if (!currentDirId || ev.dirId !== currentDirId) return;
  switch (ev.stage) {
    case 'turnaround':
      showBrewing();
      break;
    case 'awaiting_pick':
      if (ev.candidateUrls?.length) renderCandidates(ev.candidateUrls);
      break;
    case 'actions':
      if (!$('#hatch-action-grid')?.childElementCount) buildProgressGrid();
      actionsSince ??= Date.now();
      showScreen('progress');
      if (ev.action && ev.status) updateCell(ev.action, ev.status, ev.frameUrl, ev.error);
      break;
    case 'done':
      packageDone = true;
      updateOverallProgress();
      void showCertificate().catch((error) => showError(String(error)));
      break;
    case 'failed':
      showError(`创建失败：${ev.error ?? '未知错误'}（可从任务列表继续或重试）`);
      showScreen('progress');
      const resume = $<HTMLButtonElement>('#hatch-task-resume'); if (resume) resume.hidden = false;
      break;
  }
}

// ───────────────────────── 事件绑定 ─────────────────────────

function bindGlobalEvents(): void {
  // 窗口大小变化响应
  window.addEventListener('resize', handleResize);
}

function bindDropzone(): void {
  const dropzone = $('#hatch-dropzone');
  if (!dropzone) return;

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');

    const file = (e as DragEvent).dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      showError('请拖入一张图片文件');
      return;
    }

    selectSourceFile(file);
  });

  // 点击选择文件
  const fileInput = $('#hatch-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) selectSourceFile(file);
    });
  }

  $('#hatch-btn-browse')?.addEventListener('click', () => {
    $<HTMLInputElement>('#hatch-file-input')?.click();
  });

  $('#hatch-btn-start')?.addEventListener('click', () => {
    if (selectedSourceFile) void startHatch(selectedSourceFile);
  });
}

function selectSourceFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    showError('请选择 PNG、JPG 或 WebP 图片。');
    return;
  }
  if (selectedSourceUrl) URL.revokeObjectURL(selectedSourceUrl);
  selectedSourceFile = file;
  selectedSourceUrl = URL.createObjectURL(file);
  showError(null);

  const preview = $<HTMLImageElement>('#hatch-source-preview');
  if (preview) {
    preview.src = selectedSourceUrl;
    preview.hidden = false;
  }
  $('#hatch-drop-placeholder')?.setAttribute('hidden', '');
  const name = $('#hatch-selected-file');
  if (name) name.textContent = file.name;
  const start = $<HTMLButtonElement>('#hatch-btn-start');
  if (start) start.disabled = false;
  $('#hatch-dropzone')?.classList.add('has-file');
}

function bindConfigOptions(): void {
  // 角色形态切换
  root?.querySelectorAll<HTMLInputElement>('input[name="character-form"]').forEach(radio => {
    radio.addEventListener('change', updateStyleOptions);
  });

  root?.querySelectorAll<HTMLInputElement>('input[name="image-provider"]').forEach(radio => {
    radio.addEventListener('change', updateProviderSummary);
  });

  updateStyleOptions();
  updateProviderSummary();
}

function bindActionButtons(): void {
  // 重新生成按钮
  $('#hatch-btn-regen')?.addEventListener('click', async () => {
    if (!currentDirId) return;
    brewingSince = null;
    showBrewing();
    try { await window.qbot.hatch.pickTurnaround(currentDirId, -1); }
    catch (error) { showError(String(error)); showScreen('pick'); }
  });

  for (const id of ['#hatch-btn-cancel', '#hatch-btn-cancel-progress', '#hatch-btn-back', '#hatch-task-back']) {
    $(id)?.addEventListener('click', () => navigate({ pane: 'tasks' }));
  }
  $('#hatch-btn-back-progress')?.addEventListener('click', () => showScreen('progress'));
  $('#hatch-btn-workspace')?.addEventListener('click', () => {
    if (currentDirId) navigate({ pane: 'profile', dirId: currentDirId });
  });
  $('#hatch-btn-another')?.addEventListener('click', () => { void onNavigate({ pane: 'hatch', fresh: true }); });
  $('#hatch-task-resume')?.addEventListener('click', () => {
    if (currentDirId) void resumeHatch(currentDirId);
  });

  // 保存卡片按钮
  $('#hatch-btn-save')?.addEventListener('click', () => { void saveCertificateCard().catch((error) => showError(String(error))); });

  // 上桌按钮
  $('#hatch-btn-activate')?.addEventListener('click', () => { void activatePet().catch((error) => showError(String(error))); });
}

function updateStyleOptions(): void {
  const form = $<HTMLInputElement>('input[name="character-form"]:checked')?.value;
  const styleRow = $('#hatch-style-row');

  if (styleRow) {
    styleRow.style.display = form === 'abstract' ? 'none' : 'flex';
  }
}

function updateProviderSummary(): void {
  const summary = $('#hatch-provider-summary');
  if (!summary) return;
  summary.textContent = getSelectedProvider() === 'gpt-image-2' ? 'GPT-Image-2 · 精细' : 'Seedream · 推荐';
}

async function loadHistoricalTasks(): Promise<void> {
  const area = $('#hatch-history-tasks'); if (!area) return;
  area.hidden = false;
  area.innerHTML = '<p>已经开始的创建和修复任务，可以在生成任务中继续。</p><button class="btn-secondary" id="hatch-open-tasks">查看生成任务</button>';
  $('#hatch-open-tasks')?.addEventListener('click', () => navigate({ pane: 'tasks' }));
}

// ───────────────────────── 工具函数 ─────────────────────────

function getSelectedProvider(): ImageProvider {
  const value = $<HTMLInputElement>('input[name="image-provider"]:checked')?.value;
  return value === 'gpt-image-2' ? 'gpt-image-2' : 'seedream';
}

function getSelectedForm(): string {
  return $<HTMLInputElement>('input[name="character-form"]:checked')?.value || 'humanoid';
}

function getSelectedStyle(): string {
  return $<HTMLInputElement>('input[name="character-style"]:checked')?.value || 'chibi';
}

function disableAllInputs(disabled: boolean): void {
  const buttons = root?.querySelectorAll<HTMLButtonElement>('button') ?? [];
  const inputs = root?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [];

  buttons.forEach(btn => {
    if (!btn.classList.contains('no-disable')) {
      btn.disabled = disabled;
    }
  });

  inputs.forEach(input => {
    input.disabled = disabled;
  });
}

function showError(message: string | null): void {
  const banner = $('#hatch-error-banner');
  if (!banner) return;

  banner.textContent = message ?? '';
  banner.style.display = message ? 'flex' : 'none';
}

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function startTimer(): void {
  if (timerHandle !== null) stopTimer();
  timerHandle = window.setInterval(renderTimers, 1000);
}

function stopTimer(): void {
  if (timerHandle !== null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function handleResize(): void {
  // 响应式布局调整
  const width = window.innerWidth;
  const container = $('#hatch-candidates-container');

  if (container && width < 768) {
    container.className = 'candidates-grid mobile';
  } else if (container) {
    container.className = 'candidates-grid';
  }
}

// ───────────────────────── 模板 ─────────────────────────

const TEMPLATE = `
<div class="hatch-container">
  <!-- 头部区域 -->
  <p id="hatch-cloud-task" hidden></p>
  <div class="btn-row"><button class="btn ghost no-disable" id="hatch-task-back">生成任务</button><button class="btn no-disable" id="hatch-task-resume" hidden>继续这个任务</button></div>
  <header class="hatch-header">
    <div class="header-title">
      <p class="eyebrow">创建角色</p>
      <h1>创建一个会动的桌宠</h1>
      <p>从一张角色图开始，确认形象后生成常用动作，完成后可直接放到桌面。</p>
    </div>
    <div class="creation-outcome" aria-label="创建结果说明">
      <span><b>8</b> 个常用动作</span>
      <span><b>分步确认</b>形象与动作</span>
      <span><b>可后台</b>继续运行</span>
    </div>
  </header>

  <!-- 步骤导航 -->
  <div class="hatch-steps">
    <div class="hatch-step" data-step="drop">
      <span class="step-number">1</span>
      <span class="step-text">选择形象</span>
    </div>
    <div class="hatch-step" data-step="brewing">
      <span class="step-number">2</span>
      <span class="step-text">确认角色</span>
    </div>
    <div class="hatch-step" data-step="progress">
      <span class="step-number">3</span>
      <span class="step-text">生成动作</span>
    </div>
    <div class="hatch-step" data-step="certificate">
      <span class="step-number">4</span>
      <span class="step-text">完成上桌</span>
    </div>
  </div>

  <!-- 错误提示 -->
  <div id="hatch-error-banner" class="error-banner">
    <span class="error-icon">!</span>
    <span class="error-message"></span>
  </div>

  <!-- 主内容区域 -->
  <main class="hatch-main">
    <!-- 步骤1: 上传参考图 -->
    <section id="hatch-screen-drop" class="hatch-screen active">
      <div class="drop-container">
        <div class="creation-layout">
          <div class="creation-source">
            <div class="creation-section-heading">
              <span class="creation-kicker">原图</span>
              <div><h3>选择一张角色原图</h3><p>正面、全身、背景干净的图片效果最好。</p></div>
            </div>
            <div id="hatch-dropzone" class="dropzone">
              <img id="hatch-source-preview" alt="已选择的角色原图" hidden />
              <div id="hatch-drop-placeholder">
                <div class="dropzone-icon">${icon('create')}</div>
                <h3>把角色图片拖到这里</h3>
                <p>支持 PNG、JPG、WebP</p>
              </div>
              <input type="file" id="hatch-file-input" accept="image/png,image/jpeg,image/webp" hidden />
              <button class="btn-secondary" id="hatch-btn-browse">选择图片</button>
              <span id="hatch-selected-file" class="selected-file">尚未选择图片</span>
            </div>
            <div class="source-guidance">
              <span>建议：完整身体</span><span>建议：单一角色</span><span>避免：复杂背景</span>
            </div>
          </div>

          <aside class="config-panel">
            <div class="creation-section-heading compact">
              <span class="creation-kicker">设定</span>
              <div><h3>确认桌宠设定</h3><p>这些信息会影响最终形象。</p></div>
            </div>

            <div class="config-group" id="hatch-cloud">
              <p id="hatch-cloud-account">正在验证邀请码…</p>
              <label class="config-label" for="hatch-invite">内测邀请码</label>
              <input class="input-primary" id="hatch-invite" type="password" autocomplete="off" placeholder="输入邀请码" />
              <button class="btn" id="hatch-connect">连接邀请码</button>
            </div>
            <div class="config-group">
              <label class="config-label" for="hatch-draft-name">桌宠名字</label>
              <input class="input-primary" id="hatch-draft-name" type="text" maxlength="24" placeholder="例如：小青" />
            </div>

            <div class="config-group">
              <span class="config-label">角色形态</span>
              <div class="radio-group compact-options">
                <label class="radio-option">
                  <input type="radio" name="character-form" value="humanoid" checked />
                  <span class="radio-custom"></span>
                  <span class="radio-text"><b>有四肢</b><small>人物、动物和拟人角色</small></span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="character-form" value="abstract" />
                  <span class="radio-custom"></span>
                  <span class="radio-text"><b>无四肢</b><small>团子、物品和抽象形象</small></span>
                </label>
              </div>
            </div>

            <div class="config-group" id="hatch-style-row">
              <span class="config-label">形象风格</span>
              <div class="radio-group compact-options">
                <label class="radio-option">
                  <input type="radio" name="character-style" value="chibi" checked />
                  <span class="radio-custom"></span>
                  <span class="radio-text"><b>桌宠化</b><small>转换为适合桌面的 Q 版比例</small></span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="character-style" value="faithful" />
                  <span class="radio-custom"></span>
                  <span class="radio-text"><b>保持原样</b><small>尽量保留原图比例和特征</small></span>
                </label>
              </div>
            </div>

            <details class="advanced-settings">
              <summary>高级生成设置 <span id="hatch-provider-summary">Seedream · 推荐</span></summary>
              <div class="config-group">
                <label class="config-label" for="hatch-mode">生成方式</label>
                <select id="hatch-mode"><option value="cloud">云端创建 · 无需 Key</option><option value="local">本地高级生成 · 自备 Key</option></select>
                <span class="config-label">形象生成模型</span>
                <div class="radio-group compact-options">
                  <label class="radio-option">
                    <input type="radio" name="image-provider" value="seedream" checked />
                    <span class="radio-custom"></span>
                    <span class="radio-text"><b>Seedream</b><small>速度更快，推荐</small></span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" name="image-provider" value="gpt-image-2" />
                    <span class="radio-custom"></span>
                    <span class="radio-text"><b>GPT-Image-2</b><small>更慢，细节更丰富</small></span>
                  </label>
                </div>
              </div>
            </details>

            <div class="creation-submit">
              <p>开始后先生成 1 个角色方案供你确认，不满意可重新生成，不会直接生成全部动作。</p>
              <button class="btn-primary" id="hatch-btn-start" disabled>开始创建桌宠</button>
            </div>
          </aside>
        </div>

        <div class="history-panel" id="hatch-history-tasks" hidden></div>
      </div>
    </section>

    <!-- 步骤2: 生成中 -->
    <section id="hatch-screen-brewing" class="hatch-screen hidden">
      <div class="brewing-container">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <h3>正在准备角色方案...</h3>
        <p id="hatch-brewing-hint" class="hint-text">
          正在使用 <span id="hatch-provider-name">Seedream</span> 生成角色方案
        </p>
        <p class="hint-text">
          已用时 <span id="hatch-brewing-elapsed">0:00</span>
        </p>
        <div class="progress-bar">
          <div class="progress-indeterminate"></div>
        </div>
        <button class="btn-secondary no-disable" id="hatch-btn-cancel">返回任务列表，后台继续</button>
      </div>
    </section>

    <!-- 步骤3: 选择三视图 -->
    <section id="hatch-screen-pick" class="hatch-screen hidden">
      <div class="pick-container">
        <h3>确认角色方案</h3>
        <p class="hint-text">满意就继续生成动作，不满意可重新生成一张。</p>

        <div id="hatch-candidates-container" class="candidates-grid"></div>

        <div class="action-bar">
          <button class="btn-secondary no-disable" id="hatch-btn-back">返回任务列表</button>
          <button class="btn-primary no-disable" id="hatch-btn-regen">重新生成</button>
        </div>
      </div>
    </section>

    <!-- 步骤4: 动作生成 -->
    <section id="hatch-screen-progress" class="hatch-screen hidden">
      <div class="progress-container">
        <div class="progress-header">
          <h3>正在生成动作...</h3>
          <p id="hatch-progress-text"></p>
        </div>

        <div class="progress-track">
          <div id="hatch-progress-fill" class="progress-fill" style="width: 0%"></div>
        </div>

        <div id="hatch-action-grid" class="actions-grid"></div>

        <div class="progress-footer">
          <p class="hint-text">
            生成在后台运行，关闭窗口也不会中断
          </p>
          <button class="btn-secondary no-disable" id="hatch-btn-cancel-progress">返回任务列表，后台继续</button>
        </div>
      </div>
    </section>

    <!-- 步骤5: 完成 -->
    <section id="hatch-screen-certificate" class="hatch-screen hidden">
      <div class="certificate-container">
        <h3>你的桌宠准备好了</h3>

        <div class="certificate-card">
          <img id="hatch-card-source" alt="角色原图" class="certificate-source" />
          <div id="hatch-card-actions" class="certificate-actions"></div>
        </div>

        <div class="certificate-form">
          <label for="hatch-pet-name">角色名字</label>
          <input
            type="text"
            id="hatch-pet-name"
            placeholder="未命名"
            maxlength="24"
            class="input-primary"
          />
        </div>

        <div class="certificate-actions">
          <button class="btn-secondary no-disable" id="hatch-btn-back-progress">返回查看</button>
          <button class="btn-secondary no-disable" id="hatch-btn-save">保存卡片</button><button class="btn-secondary no-disable" id="hatch-btn-workspace">编辑角色</button><button class="btn-secondary no-disable" id="hatch-btn-another">再创建一只</button>
          <button class="btn-primary no-disable" id="hatch-btn-activate">放到桌面</button>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
@scope ([data-pane="hatch"]) {
:scope {
  --primary-hover: #aeea00;
  --text-primary: var(--tertiary);
  --text-secondary: var(--secondary);
  --text-muted: var(--muted);
  --background: #f9f8f5;
  --card-background: var(--card);
  --danger: var(--error);
}
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 颜色变量 */
/* 容器样式 */
.hatch-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 头部样式 */
.hatch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-icon {
  font-size: 32px;
}

.header-title h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.header-title p {
  font-size: 14px;
  color: var(--text-muted);
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background-color: var(--background);
  color: var(--text-primary);
}

/* 步骤导航 */
.hatch-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 32px;
  padding: 16px;
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.hatch-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.5;
}

.hatch-step.active {
  opacity: 1;
  background-color: var(--primary);
  color: white;
}

.hatch-step.completed {
  opacity: 1;
  color: var(--success);
}

.hatch-step.disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.step-icon {
  font-size: 20px;
}

.step-text {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

/* 错误提示 */
.error-banner {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
  background-color: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  color: var(--danger);
}

.error-icon {
  font-size: 16px;
}

.error-message {
  flex: 1;
  font-size: 14px;
}

/* 主内容区域 */
.hatch-main {
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 32px;
}

.hatch-screen {
  display: none;
}

.hatch-screen.active {
  display: block;
}

/* 上传步骤 */
.drop-container {
  max-width: 800px;
  margin: 0 auto;
}

.dropzone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
  margin-bottom: 32px;
}

.dropzone.dragover {
  border-color: var(--primary);
  background-color: #EFF6FF;
}

.dropzone-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.dropzone h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.dropzone p {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

#hatch-btn-browse {
  padding: 10px 20px;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

#hatch-btn-browse:hover {
  background-color: var(--primary-hover);
}

/* 配置面板 */
.config-panel {
  background-color: var(--background);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
}

.config-panel h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.config-group {
  margin-bottom: 20px;
}

.config-group:last-child {
  margin-bottom: 0;
}

.config-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: all 0.2s;
}

.radio-option:hover {
  border-color: var(--primary);
  background-color: #EFF6FF;
}

.radio-option input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-custom {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: 50%;
  position: relative;
}

.radio-option input[type="radio"]:checked + .radio-custom {
  border-color: var(--primary);
}

.radio-option input[type="radio"]:checked + .radio-custom::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background-color: var(--primary);
  border-radius: 50%;
}

.radio-text {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 历史任务 */
.history-panel {
  background-color: var(--background);
  border-radius: 12px;
  padding: 24px;
}

.history-panel h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.empty-history {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
  font-size: 14px;
}

.btn-history {
  display: block;
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  text-align: left;
  background-color: var(--card-background);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-history:hover {
  border-color: var(--primary);
  background-color: #EFF6FF;
}

.btn-history:last-child {
  margin-bottom: 0;
}

/* 生成中步骤 */
.brewing-container {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: 48px 24px;
}

.loading-spinner {
  margin-bottom: 32px;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.brewing-container h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.hint-text {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--border);
  border-radius: 4px;
  overflow: hidden;
  margin: 32px 0;
}

.progress-indeterminate {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, #60A5FA 50%, var(--border) 100%);
  background-size: 200% 100%;
  animation: progress 1.5s ease-in-out infinite;
}

@keyframes progress {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* 选择三视图步骤 */
.pick-container {
  max-width: 1000px;
  margin: 0 auto;
}

.pick-container h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  text-align: center;
}

.pick-container .hint-text {
  text-align: center;
  margin-bottom: 32px;
}

.candidates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.candidates-grid.mobile {
  grid-template-columns: 1fr;
}

.candidate-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.candidate-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.candidate-thumbnail {
  position: relative;
  padding-top: 100%;
  background-color: var(--background);
}

.candidate-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.candidate-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

.candidate-card:hover .candidate-overlay {
  opacity: 1;
}

.btn-select {
  width: 100%;
  padding: 8px 16px;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.candidate-index {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  background-color: var(--card-background);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

/* 进度步骤 */
.progress-container {
  max-width: 1000px;
  margin: 0 auto;
}

.progress-header {
  margin-bottom: 24px;
}

.progress-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

#hatch-progress-text {
  font-size: 14px;
  color: var(--text-muted);
}

.progress-track {
  height: 8px;
  background-color: var(--border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 32px;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary);
  width: 0%;
  transition: width 0.3s ease;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.action-cell {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
}

.action-cell:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.action-cell.done {
  background-color: #F0FDF4;
  border-color: #BBF7D0;
}

.action-cell.failed {
  background-color: #FEF2F2;
  border-color: #FECACA;
}

.action-cell.working {
  background-color: #EFF6FF;
  border-color: #93C5FD;
}

.action-thumbnail {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  font-size: 32px;
}

.action-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.status-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 16px;
}

.action-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.action-status {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.action-elapsed {
  font-size: 11px;
  color: #9CA3AF;
}

.progress-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.progress-footer .hint-text {
  margin-bottom: 16px;
  text-align: center;
}

/* 完成步骤 */
.certificate-container {
  max-width: 800px;
  margin: 0 auto;
}

.certificate-container h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 32px;
  text-align: center;
}

.certificate-card {
  background-color: var(--background);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
}

.certificate-source {
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 24px;
}

.certificate-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.certificate-figure {
  position: relative;
  text-align: center;
}

.certificate-video {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  background-color: var(--card-background);
}

.certificate-figure figcaption {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

.btn-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background-color: rgba(0,0,0,0.7);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.certificate-form {
  margin-bottom: 24px;
}

.certificate-form label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.input-primary {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.input-primary:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.certificate-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 按钮样式 */
.btn-primary {
  padding: 12px 24px;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.btn-secondary {
  padding: 12px 24px;
  background-color: var(--card-background);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--background);
  border-color: var(--primary);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 创建桌宠：面向任务的首屏与步骤层级 */
.hatch-container { max-width: 1080px; padding: 30px 36px 56px; }
.hatch-header { align-items: flex-end; gap: 28px; margin-bottom: 24px; padding-bottom: 22px; }
.header-title { max-width: 650px; }
.header-title h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.15; }
.header-title > p:not(.eyebrow) { margin: 0; color: var(--text-secondary); line-height: 1.6; }
.creation-outcome { display: flex; gap: 14px; margin-left: auto; color: var(--text-secondary); font-size: 11px; white-space: nowrap; }
.creation-outcome span { display: flex; flex-direction: column; gap: 2px; padding-left: 14px; border-left: 1px solid var(--border); }
.creation-outcome b { color: var(--text-primary); font-size: 14px; }
.hatch-steps { position: relative; justify-content: stretch; gap: 0; padding: 0; margin-bottom: 26px; background: transparent; box-shadow: none; }
.hatch-steps::before { content: ''; position: absolute; left: 11%; right: 11%; top: 17px; height: 1px; background: var(--border); }
.hatch-step { position: relative; z-index: 1; flex: 1; flex-direction: row; justify-content: center; gap: 8px; padding: 8px; background: transparent; opacity: 1; cursor: default; }
.hatch-step.active { background: transparent; color: var(--text-primary); }
.hatch-step.completed { color: #587a00; }
.hatch-step.disabled { opacity: .45; cursor: default; }
.step-number { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; border: 1px solid #c9c6bd; background: #f9f8f5; color: var(--text-secondary); font-size: 11px; font-weight: 800; }
.hatch-step.active .step-number { border-color: var(--primary); background: var(--primary); color: var(--on-primary); }
.hatch-step.completed .step-number { border-color: #759900; background: #ecf8d2; color: #496400; }
.step-text { font-size: 12px; font-weight: 700; }
.hatch-main { padding: 0; background: transparent; border-radius: 0; box-shadow: none; }
.drop-container { max-width: none; }
.creation-layout { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, .75fr); gap: 18px; align-items: start; }
.creation-source, .config-panel { border: 1px solid var(--border); border-radius: 16px; background: var(--card-background); }
.creation-source { padding: 22px; }
.config-panel { margin: 0; padding: 22px; }
.creation-section-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.creation-section-heading.compact { margin-bottom: 22px; }
.creation-section-heading h3 { margin: 0 0 4px; font-size: 17px; }
.creation-section-heading p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
.creation-kicker { flex: none; padding: 4px 7px; border-radius: 6px; background: #eef8d7; color: #557400; font-size: 10px; font-weight: 800; }
.dropzone { min-height: 330px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0; padding: 24px; border-color: #c8c5bc; background: #f7f6f2; overflow: hidden; }
.dropzone:hover { border-color: #8d8a82; background: #f2f0ea; }
.dropzone.dragover { border-color: #759900; background: #f3fbdc; }
.dropzone.has-file { border-style: solid; background: #efeee9; }
.dropzone-icon { width: 44px; height: 44px; display: grid; place-items: center; margin: 0 auto 12px; border-radius: 14px; background: white; color: #557400; }
.dropzone-icon .ui-icon { width: 22px; height: 22px; }
.dropzone h3 { margin-bottom: 5px; font-size: 17px; }
.dropzone p { margin-bottom: 18px; }
#hatch-source-preview { width: min(100%, 300px); height: 220px; object-fit: contain; margin-bottom: 14px; border-radius: 12px; background: white; }
.selected-file { max-width: 100%; margin-top: 9px; overflow: hidden; color: var(--text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.source-guidance { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.source-guidance span { padding: 5px 8px; border-radius: 6px; background: #f0efea; color: var(--text-secondary); font-size: 10px; }
.config-group { margin-bottom: 18px; }
.config-label { margin-bottom: 8px; color: var(--text-primary); font-weight: 700; }
.compact-options { gap: 7px; }
.radio-option { align-items: flex-start; padding: 10px; background: white; }
.radio-option:has(input:checked) { border-color: #789d00; background: #f4fbdc; }
.radio-text { display: flex; flex-direction: column; gap: 2px; }
.radio-text b { color: var(--text-primary); font-size: 12px; }
.radio-text small { color: var(--text-muted); font-size: 10px; line-height: 1.35; }
.advanced-settings { margin-top: 4px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.advanced-settings summary { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; color: var(--text-primary); font-size: 12px; font-weight: 700; cursor: pointer; }
.advanced-settings summary span { color: var(--text-secondary); font-weight: 500; }
.advanced-settings .config-group { padding-top: 4px; }
.creation-submit { padding-top: 18px; }
.creation-submit p { margin: 0 0 12px; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.creation-submit .btn-primary { width: 100%; color: var(--on-primary); font-weight: 750; }
.history-panel { margin-top: 18px; border: 1px solid var(--border); background: var(--card-background); }
.history-panel[hidden] { display: none; }
.history-section + .history-section { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border); }

/* 响应式适配 */
@media (max-width: 768px) {
  .hatch-container {
    padding: 16px;
  }

  .hatch-main {
    padding: 0;
  }

  .hatch-header { align-items: flex-start; }
  .creation-outcome { display: none; }
  .creation-layout { grid-template-columns: 1fr; }
  .dropzone { min-height: 260px; }

  .hatch-steps {
    flex-wrap: wrap;
    gap: 8px;
  }

  .hatch-step {
    flex: 1;
    min-width: 80px;
  }

  .step-text {
    font-size: 11px;
  }

  .actions-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }

  .certificate-actions {
    flex-direction: column;
  }

  .action-bar {
    flex-direction: column;
  }
}
}
</style>
`;
