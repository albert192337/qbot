/**
 * 孵化 pane：全新重设计版本
 * 遵循QBot设计系统规范，提供更专业的用户体验
 */
import type { ActionId, ActionStatus, ImageProvider } from '@qbot/pipeline';
import type { HatchProgress, HatchStatus } from '../../../shared/ipc-types';

/** 动作中文标签。口径与 _studio-shared 的 STD_LABELS 统一 */
const ACTION_LABELS: Record<ActionId, string> = {
  idle: '待机',
  drag: '拖拽',
  sleep: '睡觉',
  tea: '喝茶',
  talk_happy: '聊天·开心',
  talk_annoyed: '聊天·嫌弃',
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

  // 启动计时器
  startTimer();

  // 加载历史任务
  await loadHistoricalTasks();
}

export function unmount(): void {
  unsubProgress?.();
  stopTimer();
  root = null;
}

export async function onVisible(): Promise<void> {
  if (!root) return;

  if (currentDirId) {
    await seedFromStatus(currentDirId);
    return;
  }

  const characters = await window.qbot.characters.list();
  const unfinished = characters.find((c) => c.hasUnfinishedJob);

  if (unfinished) {
    currentDirId = unfinished.dirId;
    await seedFromStatus(unfinished.dirId);
  }
}

// ───────────────────────── 核心功能 ─────────────────────────

async function startHatch(file: File): Promise<void> {
  showError(null);

  try {
    const refPath = window.qbot.hatch.getPathForFile(file);
    const provider = getSelectedProvider();
    const form = getSelectedForm();
    const style = getSelectedStyle();
    const name = ($<HTMLInputElement>('#hatch-pet-name')?.value.trim() || '未命名');

    disableAllInputs(true);

    currentDirId = await window.qbot.hatch.start(
      refPath,
      provider === 'gpt-image-2' ? 'gpt-image-2' : undefined,
      form === 'abstract' ? 'abstract' : undefined,
      form === 'abstract' ? undefined : style === 'faithful' ? 'faithful' : 'chibi',
    );

    currentProvider = provider === 'gpt-image-2' ? 'gpt-image-2' : 'seedream';
    showScreen('brewing');

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
    await window.qbot.hatch.redo(currentDirId);
  } catch (err) {
    showError(String(err instanceof Error ? err.message : err));
  }
}

// ───────────────────────── 界面渲染 ─────────────────────────

function showScreen(screen: ScreenName): void {
  // 隐藏所有屏幕
  document.querySelectorAll('.hatch-screen').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('active');
  });

  // 显示目标屏幕
  const target = $(`#hatch-screen-${screen}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  updateStepNavigation(screen);
}

function updateStepNavigation(currentScreen: ScreenName): void {
  const steps = document.querySelectorAll('.hatch-step');
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
    const card = createCandidateCard(url, index + 1);
    container.appendChild(card);
  });

  showScreen('pick');
}

function createCandidateCard(url: string, index: number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'candidate-card';
  card.innerHTML = `
    <div class="candidate-thumbnail">
      <img src="${url}" alt="候选三视图 ${index}" loading="lazy" />
      <div class="candidate-overlay">
        <button class="btn-select">选择这张</button>
      </div>
    </div>
    <div class="candidate-index">${index}</div>
  `;

  card.addEventListener('click', async () => {
    if (!currentDirId) return;

    const grid = $('#hatch-action-grid');
    if (!grid?.childElementCount) buildProgressGrid();

    showScreen('progress');
    await window.qbot.hatch.pickTurnaround(currentDirId, index);
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
      <span class="status-icon">🥚</span>
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
    'pending': '🥚',
    'generating_frame': '⏳',
    'frame_qc': '🔍',
    'generating_video': '🎬',
    'keying': '✂️',
    'done': '✅',
    'failed': '❌'
  };
  return icons[status] || '⏱️';
}

async function seedFromStatus(dirId: string): Promise<void> {
  const st = await window.qbot.hatch.getStatus(dirId);
  if (!st) {
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
      else showBrewing();
      break;
    case 'done':
      await showCertificate();
      break;
    default:
      buildProgressGrid();
      actionsSince = Date.now();
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

  const meta = (await window.qbot.characters.list()).find((c) => c.dirId === currentDirId);
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
      playBtn.textContent = '▶️';
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

    void startHatch(file);
  });

  // 点击选择文件
  const fileInput = $('#hatch-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void startHatch(file);
    });
  }
}

function bindConfigOptions(): void {
  // 角色形态切换
  document.querySelectorAll<HTMLInputElement>('input[name="character-form"]').forEach(radio => {
    radio.addEventListener('change', updateStyleOptions);
  });

  updateStyleOptions();
}

function bindActionButtons(): void {
  // 重新生成按钮
  $('#hatch-btn-regen')?.addEventListener('click', async () => {
    if (!currentDirId) return;
    brewingSince = null;
    showBrewing();
    await window.qbot.hatch.pickTurnaround(currentDirId, -1);
  });

  // 取消按钮
  $('#hatch-btn-cancel')?.addEventListener('click', () => {
    if (confirm('确定要取消当前孵化吗？')) {
      currentDirId = null;
      disableAllInputs(false);
      showScreen('drop');
    }
  });

  // 保存卡片按钮
  $('#hatch-btn-save')?.addEventListener('click', saveCertificateCard);

  // 上桌按钮
  $('#hatch-btn-activate')?.addEventListener('click', activatePet);
}

function updateStyleOptions(): void {
  const form = $<HTMLInputElement>('input[name="character-form"]:checked')?.value;
  const styleRow = $('#hatch-style-row');

  if (styleRow) {
    styleRow.style.display = form === 'abstract' ? 'none' : 'flex';
  }
}

async function loadHistoricalTasks(): Promise<void> {
  const area = $('#hatch-history-tasks');
  if (!area) return;

  area.innerHTML = '';
  const characters = await window.qbot.characters.list();

  // 未完成任务
  const unfinished = characters.filter((c) => c.hasUnfinishedJob);
  if (unfinished.length > 0) {
    const section = document.createElement('div');
    section.className = 'history-section';
    section.innerHTML = '<h4>进行中的任务</h4>';

    unfinished.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'btn-history';
      btn.textContent = `继续 ${c.dirId.slice(0, 8)}…`;
      btn.addEventListener('click', () => resumeHatch(c.dirId));
      section.appendChild(btn);
    });

    area.appendChild(section);
  }

  // 失败任务
  const failed = characters.filter((c) => c.manifest && Object.values(c.manifest.actions).some(a => a.status === 'failed'));
  if (failed.length > 0) {
    const section = document.createElement('div');
    section.className = 'history-section';
    section.innerHTML = '<h4>需要修复的任务</h4>';

    failed.forEach(c => {
      const failedCount = Object.values(c.manifest!.actions).filter(a => a.status === 'failed').length;
      const btn = document.createElement('button');
      btn.className = 'btn-history';
      btn.textContent = `修复 ${c.manifest!.name} 的 ${failedCount} 个失败动作`;
      btn.addEventListener('click', async () => {
        currentDirId = c.dirId;
        buildProgressGrid();
        showScreen('progress');
        const st = await window.qbot.hatch.getStatus(c.dirId);
        if (st) {
          actionsSince = Date.now();
          seedCells(st);
        }
        window.qbot.hatch.redo(c.dirId).catch(showError);
      });
      section.appendChild(btn);
    });

    area.appendChild(section);
  }
}

// ───────────────────────── 工具函数 ─────────────────────────

function getSelectedProvider(): ImageProvider {
  return $<HTMLInputElement>('input[name="image-provider"]:checked')?.value || 'seedream';
}

function getSelectedForm(): string {
  return $<HTMLInputElement>('input[name="character-form"]:checked')?.value || 'humanoid';
}

function getSelectedStyle(): string {
  return $<HTMLInputElement>('input[name="character-style"]:checked')?.value || 'chibi';
}

function disableAllInputs(disabled: boolean): void {
  const buttons = document.querySelectorAll('button');
  const inputs = document.querySelectorAll('input[type="radio"]');

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
  <header class="hatch-header">
    <div class="header-left">
      <div class="app-icon">🤖</div>
      <div class="header-title">
        <h1>角色孵化</h1>
        <p>上传一张角色图片，AI 将自动生成完整动画角色</p>
      </div>
    </div>
    <button class="btn-close no-disable" id="hatch-btn-close">
      <span>×</span>
    </button>
  </header>

  <!-- 步骤导航 -->
  <div class="hatch-steps">
    <div class="hatch-step" data-step="drop">
      <span class="step-icon">📁</span>
      <span class="step-text">上传参考图</span>
    </div>
    <div class="hatch-step" data-step="brewing">
      <span class="step-icon">🎨</span>
      <span class="step-text">生成三视图</span>
    </div>
    <div class="hatch-step" data-step="progress">
      <span class="step-icon">🎬</span>
      <span class="step-text">动作生成</span>
    </div>
    <div class="hatch-step" data-step="certificate">
      <span class="step-icon">🎉</span>
      <span class="step-text">完成</span>
    </div>
  </div>

  <!-- 错误提示 -->
  <div id="hatch-error-banner" class="error-banner">
    <span class="error-icon">❌</span>
    <span class="error-message"></span>
  </div>

  <!-- 主内容区域 -->
  <main class="hatch-main">
    <!-- 步骤1: 上传参考图 -->
    <section id="hatch-screen-drop" class="hatch-screen active">
      <div class="drop-container">
        <!-- 拖放区域 -->
        <div id="hatch-dropzone" class="dropzone">
          <div class="dropzone-icon">🎨</div>
          <h3>拖放角色图片到这里</h3>
          <p>支持 PNG/JPG 格式，正面全身效果最好</p>
          <input type="file" id="hatch-file-input" accept="image/*" hidden />
          <button class="btn-primary" id="hatch-btn-browse">选择文件</button>
        </div>

        <!-- 配置选项 -->
        <div class="config-panel">
          <h4>生成配置</h4>

          <div class="config-group">
            <label class="config-label">生图模型</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="image-provider" value="seedream" checked />
                <span class="radio-custom"></span>
                <span class="radio-text">Seedream（快，约1分钟）</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="image-provider" value="gpt-image-2" />
                <span class="radio-custom"></span>
                <span class="radio-text">gpt-image-2（慢，5-10分钟）</span>
              </label>
            </div>
          </div>

          <div class="config-group">
            <label class="config-label">角色形态</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="character-form" value="humanoid" checked />
                <span class="radio-custom"></span>
                <span class="radio-text">人形</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="character-form" value="abstract" />
                <span class="radio-custom"></span>
                <span class="radio-text">抽象（无四肢）</span>
              </label>
            </div>
          </div>

          <div class="config-group" id="hatch-style-row">
            <label class="config-label">生成风格</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="character-style" value="chibi" checked />
                <span class="radio-custom"></span>
                <span class="radio-text">Q版（2-3头身）</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="character-style" value="faithful" />
                <span class="radio-custom"></span>
                <span class="radio-text">忠于原图</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 历史任务 -->
        <div class="history-panel" id="hatch-history-tasks">
          <h4>历史任务</h4>
          <div class="empty-history">
            <p>暂无历史孵化任务</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 步骤2: 生成中 -->
    <section id="hatch-screen-brewing" class="hatch-screen hidden">
      <div class="brewing-container">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <h3>正在生成三视图...</h3>
        <p id="hatch-brewing-hint" class="hint-text">
          正在使用 <span id="hatch-provider-name">Seedream</span> 生成3张候选图
        </p>
        <p class="hint-text">
          已用时 <span id="hatch-brewing-elapsed">0:00</span>
        </p>
        <div class="progress-bar">
          <div class="progress-indeterminate"></div>
        </div>
        <button class="btn-secondary no-disable" id="hatch-btn-cancel">取消孵化</button>
      </div>
    </section>

    <!-- 步骤3: 选择三视图 -->
    <section id="hatch-screen-pick" class="hatch-screen hidden">
      <div class="pick-container">
        <h3>选择一张三视图作为参考</h3>
        <p class="hint-text">这将作为所有动作的生成基础</p>

        <div id="hatch-candidates-container" class="candidates-grid"></div>

        <div class="action-bar">
          <button class="btn-secondary no-disable" id="hatch-btn-back">返回上一步</button>
          <button class="btn-primary no-disable" id="hatch-btn-regen">都不满意，重新生成</button>
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
          <button class="btn-secondary no-disable" id="hatch-btn-cancel-progress">取消孵化</button>
        </div>
      </div>
    </section>

    <!-- 步骤5: 完成 -->
    <section id="hatch-screen-certificate" class="hatch-screen hidden">
      <div class="certificate-container">
        <h3>角色孵化完成！</h3>

        <div class="certificate-card">
          <img id="hatch-card-source" alt="角色原图" class="certificate-source" />
          <div id="hatch-card-actions" class="certificate-actions"></div>
        </div>

        <div class="certificate-form">
          <label for="hatch-pet-name">给你的角色起个名字</label>
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
          <button class="btn-primary no-disable" id="hatch-btn-save">保存卡片</button>
          <button class="btn-primary no-disable" id="hatch-btn-activate">上桌！</button>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 颜色变量 */
:root {
  --primary: #3B82F6;
  --primary-hover: #2563EB;
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  --text-primary: #111827;
  --text-secondary: #374151;
  --text-muted: #6B7280;
  --border: #E5E7EB;
  --background: #F9FAFB;
  --card-background: #FFFFFF;
}

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

/* 响应式适配 */
@media (max-width: 768px) {
  .hatch-container {
    padding: 16px;
  }

  .hatch-main {
    padding: 20px;
  }

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
</style>
`;