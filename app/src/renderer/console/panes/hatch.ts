/**
 * 孵化 pane：drop → brewing → pick → progress → certificate 五屏线性流转。
 * 自 renderer/hatch/main.ts 迁入（阶段 5）。
 *
 * 关键改造：
 * - showScreen 的 querySelectorAll('.screen') 改 root 作用域（原为全文档，会误伤别的 pane）
 * - 模块顶层 DOM 断言 + 立即执行的 offerResume 收进 mount()
 * - setInterval 计时器随 mount/unmount 起停（原为顶层常驻，隐藏时空转且断言抛异常）
 * - onVisible 主动 seedFromStatus：懒挂载会错过 awaiting_pick 事件，必须靠快照兜底
 * - saveCard 截图前 scrollIntoView：capturePage 吃的是视口坐标，卡片被侧栏遮住会截错
 */
import type { ActionId, ActionStatus, ImageProvider } from '@qbot/pipeline';
import type { HatchProgress, HatchStatus } from '../../../shared/ipc-types';

/** 动作中文标签。口径与 _studio-shared 的 STD_LABELS 统一（原 hatch 叫「呼吸/悬空」，
 *  studio 叫「待机/拖拽」，收进同一窗会同屏出现，必须一致）。 */
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

/** 各状态映射的固定进度点（视频任务 API 无百分比，只能按阶段权重折算） */
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

/** 视频轮询超过这个时长，子阶段文字追加安抚（管线 15 分钟才超时） */
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
  bindDrop();
  bindPick();
  bindCertificate();

  unsubProgress?.();
  unsubProgress = window.qbot.hatch.onProgress(onProgress);

  // 计时器随 pane 生命周期起停，不再顶层常驻
  if (timerHandle !== null) clearInterval(timerHandle);
  timerHandle = window.setInterval(renderTimers, 1000);

  await offerResume();
}

export function unmount(): void {
  unsubProgress?.();
  unsubProgress = null;
  if (timerHandle !== null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
  root = null;
}

/**
 * pane 每次变可见时调用：主动拉快照。
 * 懒挂载 + 事件流的组合会丢 awaiting_pick（管线在 pane 挂载前就发了事件），
 * 而 getHatchStatus 能从 .job/state.json 重建含候选图 URL 的完整快照。
 */
export async function onVisible(): Promise<void> {
  if (!root) return;
  if (currentDirId) {
    await seedFromStatus(currentDirId);
    return;
  }
  // 没有在跑的任务：找一个未完成的 job 兜底（用户可能从别处触发了重生成）
  const characters = await window.qbot.characters.list();
  const unfinished = characters.find((c) => c.hasUnfinishedJob);
  if (unfinished) {
    currentDirId = unfinished.dirId;
    await seedFromStatus(unfinished.dirId);
  }
}

// ── 屏幕切换（root 作用域，不再全文档查询） ─────────────
type ScreenName = 'drop' | 'brewing' | 'pick' | 'progress' | 'certificate';

function showScreen(name: ScreenName): void {
  if (name !== 'brewing') brewingSince = null;
  root?.querySelectorAll<HTMLElement>('.hatch-screen').forEach((s) => {
    s.classList.toggle('active', s.id === `hatch-screen-${name}`);
  });
}

function showError(msg: string | null): void {
  const banner = $('#hatch-error');
  if (!banner) return;
  banner.textContent = msg ?? '';
  banner.style.display = msg ? 'block' : 'none';
}

// ── drop 屏 ──────────────────────────────────────────────
function bindDrop(): void {
  const dropzone = $('#hatch-dropzone');
  if (!dropzone) return;
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('over');
    const file = (e as DragEvent).dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      showError('请拖入一张图片文件');
      return;
    }
    void startHatch(file);
  });

  // 抽象档没有头身比概念 → 隐藏生成风格选项
  root?.querySelectorAll<HTMLInputElement>('input[name="character-form"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const form = $<HTMLInputElement>('input[name="character-form"]:checked')?.value;
      const styleRow = $('#hatch-style-row');
      if (styleRow) styleRow.style.display = form === 'abstract' ? 'none' : '';
    });
  });
}

async function startHatch(file: File): Promise<void> {
  showError(null);
  const refPath = window.qbot.hatch.getPathForFile(file);
  const provider = $<HTMLInputElement>('input[name="image-provider"]:checked')?.value;
  const form = $<HTMLInputElement>('input[name="character-form"]:checked')?.value;
  const style = $<HTMLInputElement>('input[name="character-style"]:checked')?.value;
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
  showBrewing();
}

/** 启动时检查未完成孵化与失败动作，提供续跑/修复入口 */
async function offerResume(): Promise<void> {
  const area = $('#hatch-resume');
  if (!area) return;
  const characters = await window.qbot.characters.list();
  area.replaceChildren();
  for (const c of characters.filter((c) => c.hasUnfinishedJob)) {
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
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
    const failed = Object.values(c.manifest.actions).filter((a) => a.status === 'failed').length;
    if (!failed) continue;
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.textContent = `修复「${c.manifest.name}」的 ${failed} 个失败动作`;
    btn.addEventListener('click', async () => {
      currentDirId = c.dirId;
      buildProgressGrid();
      showScreen('progress');
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

// ── pick 屏 ──────────────────────────────────────────────
function bindPick(): void {
  $('#hatch-regen')?.addEventListener('click', async () => {
    brewingSince = null; // 重新生成一轮，计时清零
    showBrewing();
    await window.qbot.hatch.pickTurnaround(currentDirId!, -1);
  });
}

function renderCandidates(urls: string[]): void {
  const box = $('#hatch-candidates');
  if (!box) return;
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

// ── brewing 屏 ───────────────────────────────────────────
function showBrewing(): void {
  if (brewingSince === null) brewingSince = Date.now();
  const hint = $('#hatch-brewing-hint');
  if (hint) {
    hint.textContent =
      currentProvider === 'gpt-image-2'
        ? '同时画 3 张候选。gpt-image-2 比较慢，通常 5–10 分钟，去喝杯茶吧'
        : '同时画 3 张候选，通常 1 分钟左右，画好就让你挑';
  }
  const elapsed = $('#hatch-brewing-elapsed');
  if (elapsed) elapsed.textContent = '0:00';
  showScreen('brewing');
}

// ── progress 屏 ──────────────────────────────────────────
function buildProgressGrid(): void {
  const grid = $('#hatch-action-grid');
  if (!grid) return;
  grid.replaceChildren();
  cellStates.clear();
  actionsSince = null;
  packageDone = false;
  for (const [id, label] of Object.entries(ACTION_LABELS)) {
    const cell = document.createElement('div');
    cell.className = 'action-cell';
    cell.id = `hatch-cell-${id}`;
    cell.innerHTML =
      '<div class="thumb"><span class="dot">🥚</span><img hidden alt="" /><span class="badge" hidden>🐣</span></div>' +
      `<div>${label}</div><div class="substatus">排队中</div><div class="elapsed"></div>`;
    grid.appendChild(cell);
  }
  updateOverall();
}

function updateCell(action: ActionId, status: ActionStatus, frameUrl?: string, error?: string): void {
  const cell = $(`#hatch-cell-${action}`);
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
      // 缩略图加载失败回退 🥚
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

/** 快照恢复：进入进度相关屏幕的所有路径先播快照再消费增量事件 */
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
      else showBrewing(); // 候选丢失时管线会回退重新生成
      break;
    case 'done':
      void showCertificate();
      break;
    default: // actions / package / failed
      buildProgressGrid();
      actionsSince = Date.now();
      seedCells(st);
      showScreen('progress');
  }
}

// ── 总进度 + 计时 ────────────────────────────────────────
function cellStatus(id: ActionId): ActionStatus {
  return cellStates.get(id)?.status ?? 'pending';
}

function updateOverall(): void {
  const ids = Object.keys(ACTION_LABELS) as ActionId[];
  const mean = ids.reduce((sum, id) => sum + STATUS_PROGRESS[cellStatus(id)], 0) / ids.length;
  const pct = packageDone ? 100 : mean * 0.95;
  const fill = $('#hatch-bar-fill');
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

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 每秒刷新所有计时文本；pane 未挂载时 $ 返回 null，天然空转不抛 */
function renderTimers(): void {
  if (!root) return;
  if (brewingSince !== null) {
    const el = $('#hatch-brewing-elapsed');
    if (el) el.textContent = fmtElapsed(Date.now() - brewingSince);
  }
  for (const [action, st] of cellStates) {
    const cell = $(`#hatch-cell-${action}`);
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

// ── certificate 屏 ───────────────────────────────────────
async function showCertificate(): Promise<void> {
  const source = $<HTMLImageElement>('#hatch-card-source');
  if (source) source.src = `qbot-asset://${currentDirId}/source.png`;
  const box = $('#hatch-card-actions');
  if (!box) return;
  const meta = (await window.qbot.characters.list()).find((c) => c.dirId === currentDirId);
  const figs: HTMLElement[] = [];
  for (const [id, action] of Object.entries(meta?.manifest?.actions ?? {})) {
    if (action.status !== 'done') continue;
    const fig = document.createElement('figure');
    const video = document.createElement('video');
    // 带 nonce：redo 重生后同名文件会被缓存住
    video.src = `qbot-asset://${currentDirId}/${action.webm}?v=${Date.now()}`;
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

function bindCertificate(): void {
  $('#hatch-save-card')?.addEventListener('click', async () => {
    const card = $('#hatch-card');
    if (!card) return;
    // capturePage 吃的是**视口坐标**：卡片滚出视口或被侧栏压住就会截错。
    // 先滚进来、等一帧布局稳定，再取 rect。
    card.scrollIntoView({ block: 'center' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = card.getBoundingClientRect();
    const saved = await window.qbot.hatch.saveCard({
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
    });
    if (saved) showError(null);
  });

  $('#hatch-go-desk')?.addEventListener('click', async () => {
    // 命名后上桌；空名保持管线默认
    const name = $<HTMLInputElement>('#hatch-pet-name')?.value.trim();
    if (name) await window.qbot.characters.rename(currentDirId!, name);
    await window.qbot.characters.activate(currentDirId!);
  });
}

// ── 进度事件总线 ─────────────────────────────────────────
function onProgress(ev: HatchProgress): void {
  if (!root) return;
  if (currentDirId && ev.dirId !== currentDirId) return;
  currentDirId = ev.dirId;
  switch (ev.stage) {
    case 'turnaround':
      showBrewing();
      break;
    case 'awaiting_pick':
      if (ev.candidateUrls?.length) renderCandidates(ev.candidateUrls);
      break;
    case 'actions': {
      if (!$('#hatch-action-grid')?.childElementCount) buildProgressGrid();
      actionsSince ??= Date.now();
      if ($('#hatch-screen-brewing')?.classList.contains('active')) showScreen('progress');
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
}

// ── 模板 ─────────────────────────────────────────────────
const TEMPLATE = `
<div class="hatch-body">
  <div id="hatch-error"></div>

  <section id="hatch-screen-drop" class="hatch-screen active">
    <h2>孵化新角色</h2>
    <div id="hatch-dropzone">
      <div class="dz-icon">🥚</div>
      <div>把一张角色图拖进来</div>
      <div class="dz-sub">PNG / JPG，正面全身效果最好</div>
    </div>
    <div class="opt-row" id="hatch-provider-row">
      <span class="opt-label">生图模型</span>
      <label><input type="radio" name="image-provider" value="seedream" checked /> Seedream（快，约 1 分钟）</label>
      <label><input type="radio" name="image-provider" value="gpt-image-2" /> gpt-image-2（慢，5–10 分钟）</label>
    </div>
    <div class="opt-row" id="hatch-form-row">
      <span class="opt-label">角色形态</span>
      <label><input type="radio" name="character-form" value="humanoid" checked /> 人形</label>
      <label><input type="radio" name="character-form" value="abstract" /> 抽象（无四肢）</label>
    </div>
    <div class="opt-row" id="hatch-style-row">
      <span class="opt-label">生成风格</span>
      <label><input type="radio" name="character-style" value="chibi" checked /> Q 版（2–3 头身）</label>
      <label><input type="radio" name="character-style" value="faithful" /> 忠于原图</label>
    </div>
    <div id="hatch-resume"></div>
  </section>

  <section id="hatch-screen-brewing" class="hatch-screen">
    <h2>正在画三视图…</h2>
    <div id="hatch-brewing-egg">🥚</div>
    <p id="hatch-brewing-hint" class="studio-hint"></p>
    <p class="studio-hint">已用时 <span id="hatch-brewing-elapsed">0:00</span></p>
  </section>

  <section id="hatch-screen-pick" class="hatch-screen">
    <h2>挑一张三视图</h2>
    <p class="studio-hint">这是所有动作的参考图，挑好就开始生成 6 个动作。</p>
    <div id="hatch-candidates"></div>
    <div class="btn-row"><button id="hatch-regen" class="btn ghost">都不满意，重新生成</button></div>
  </section>

  <section id="hatch-screen-progress" class="hatch-screen">
    <h2>正在生成动作…</h2>
    <div id="hatch-bar-track"><div id="hatch-bar-fill"></div></div>
    <p id="hatch-progress-text" class="studio-hint"></p>
    <div id="hatch-action-grid"></div>
    <p class="studio-hint">生成在后台跑，关掉这个窗口也不会中断；回来时会自动接上进度。</p>
  </section>

  <section id="hatch-screen-certificate" class="hatch-screen">
    <h2>出生证明</h2>
    <div id="hatch-card">
      <img id="hatch-card-source" alt="原图" />
      <div id="hatch-card-actions"></div>
    </div>
    <label for="hatch-pet-name">给它起个名字</label>
    <input id="hatch-pet-name" type="text" placeholder="未命名" maxlength="24" />
    <div class="btn-row">
      <button id="hatch-save-card" class="btn ghost">保存卡片</button>
      <button id="hatch-go-desk" class="btn">上桌！</button>
    </div>
  </section>
</div>
`;
