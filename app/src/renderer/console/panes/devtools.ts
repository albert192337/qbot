/**
 * 开发者工具 pane：游戏化数值的注水按钮 + 当前积累状态。
 * 自桌宠调试面板迁入（阶段 6）——那四个 debugGrant* IPC 此前只有面板一个调用点，
 * 面板删掉后这里是唯一入口。
 *
 * 事件日志与桌宠实时状态**没有迁**：它们活在桌宠渲染进程的模块作用域里，
 * 迁移需要新建 pet↔main↔console 双向 relay，成本最高、价值最低（已与用户确认丢弃）。
 */
import type { Progress } from '../../../shared/ipc-types';
import { toast } from './_studio-shared';

let root: HTMLElement | null = null;
let unsubProgress: (() => void) | null = null;
let unsubSettings: (() => void) | null = null;
let unsubPerception: (() => void) | null = null;
let brainTimer: ReturnType<typeof setInterval> | null = null;
let brainLimit = 20;
let brainSignature = '';
let brainLoading = false;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  host.innerHTML = `
<div class="studio-body">
  <div class="conn-card">
    <h3>桌宠模式</h3>
    <div class="btn-row" role="group" aria-label="桌宠模式">
      <button class="btn" data-pet-mode="companion" aria-pressed="false">陪伴模式</button>
      <button class="btn" data-pet-mode="free" aria-pressed="false">自由模式</button>
    </div>
    <p class="studio-hint" id="dev-mode-description"></p>
  </div>
  <div class="page-heading"><div><p class="eyebrow">仅限调试</p><h2>开发者工具</h2><p class="page-summary">检查行为、感知与游戏化状态；普通使用无需进入这里。</p></div></div>
  <div class="conn-card">
    <h3>LLM 脑调用日志</h3>
    <p class="studio-hint">完整记录本机新发生的调用。展开查看实际输入、原始输出、模型返回的思考与决策，以及动作/气泡执行情况。每 2 秒刷新；不记录 API Key。</p>
    <div id="dev-brain-status">读取中…</div>
    <div id="dev-brain-log"></div>
    <button class="btn ghost" id="dev-brain-more">显示更多历史调用</button>
  </div>
  <p class="studio-hint">正常玩法里点数靠敲键盘（1 点/次）和 Claude Code 跑完一轮（10 点）攒，箱子靠挂机（15 分钟 1 个）。</p>

  <div class="conn-card">
    <h3>当前积累</h3>
    <div id="dev-progress" class="dev-stats">读取中…</div>
  </div>

  <div class="conn-card">
    <h3>注水</h3>
    <div class="btn-row">
      <button class="btn ghost" data-dev="idle">挂机 +15 分钟</button>
      <button class="btn ghost" data-dev="box">箱子 +1</button>
      <button class="btn ghost" data-dev="points">点数 +500</button>
      <button class="btn ghost" data-dev="furniture">家具 +1</button>
    </div>
    <p class="studio-hint">开箱与合成在联机房间场景的「我的家具」里（开完箱紧接着就要摆，动线不拆开）。</p>
  </div>

  <div class="conn-card">
    <h3>行为规则引擎</h3>
    <div class="btn-row">
      <button class="btn ghost" data-behavior="refresh">刷新规则</button>
      <select data-behavior="trigger-select" class="dev-trigger-select">
        <option value="">— 选择 trigger 手动评估 —</option>
        <option value="startup">startup（启动）</option>
        <option value="app_switch">app_switch（切应用）</option>
        <option value="hour_chime">hour_chime（整点）</option>
        <option value="perception_tick">perception_tick（兜底 tick）</option>
        <option value="agent_stop">agent_stop（跑完一轮）</option>
        <option value="agent_error">agent_error（报错）</option>
        <option value="meeting_end">meeting_end（离会）</option>
        <option value="music_start">music_start（放歌）</option>
        <option value="pet_click">pet_click（戳了一下）</option>
      </select>
      <button class="btn ghost" data-behavior="trigger">触发评估</button>
      <button class="btn ghost" data-behavior="think">LLM 思考一次</button>
      <button class="btn danger" data-behavior="stop">停止所有行为</button>
    </div>
    <div id="dev-rules" class="dev-stats">读取中…</div>
    <p class="studio-hint">「试」播放内置规则的动作和台词，不调用 LLM；「触发评估」检查规则条件；只有「LLM 思考一次」主动请求模型，模型可以选择不说话。</p>
  </div>

  <div class="conn-card">
    <h3>前台应用记录</h3>
    <p class="studio-hint">在本机记录系统公开的应用名、窗口标题和进程元数据，原始记录保留 7 天。聊天和自动 LLM 脑会使用最近观察的应用名、窗口标题及带时间的对话作为上下文；不读取窗口正文，不同步到联机空间。</p>
    <div id="dev-foreground-current" class="dev-stats">读取中…</div>
    <div id="dev-foreground-events" class="dev-foreground-events">读取中…</div>
  </div>

  <div class="conn-card">
    <h3>感知数据（四流）</h3>
    <div class="btn-row">
      <button class="btn ghost" data-perc="refresh">刷新感知</button>
      <button class="btn ghost" data-perc="inject">注入假 app_focus</button>
    </div>
    <div id="dev-perc-events" class="dev-stats">读取中…</div>
    <div id="dev-perc-ledger" class="dev-stats"></div>
    <div id="dev-perc-decisions" class="dev-stats"></div>
  </div>
</div>`;
  const renderMode = (s: import('../../../shared/ipc-types').Settings) => {
    const free = s.behaviorMode === 'free';
    host.querySelectorAll<HTMLButtonElement>('[data-pet-mode]').forEach(b => {
      const active = (b.dataset.petMode === 'free') === free;
      b.setAttribute('aria-pressed', String(active)); b.classList.toggle('primary', active); b.classList.toggle('ghost', !active);
    });
    host.querySelector('#dev-mode-description')!.textContent = free
      ? '按人设主动说话、做动作，约每 90 秒思考一次。使用 LLM。'
      : '保持原有陪伴频率；LLM 脑开启时，台词仍由模型生成。';
  };
  renderMode(await window.qbot.settings.get());
  unsubSettings?.(); unsubSettings = window.qbot.settings.onChanged(renderMode);
  host.querySelectorAll<HTMLButtonElement>('[data-pet-mode]').forEach(b => b.addEventListener('click', async () => {
    const buttons = host.querySelectorAll<HTMLButtonElement>('[data-pet-mode]'); buttons.forEach(x => x.disabled = true);
    try {
      const behaviorMode = b.dataset.petMode === 'free' ? 'free' : 'companion';
      await window.qbot.settings.set({ behaviorMode, ...(behaviorMode === 'free' ? { freeMode: true } : {}) });
      renderMode(await window.qbot.settings.get());
    } catch { toast(host, '模式保存失败，请重试'); }
    finally { buttons.forEach(x => x.disabled = false); }
  }));

  const p = await window.qbot.progress.get();
  renderProgress(p);
  unsubProgress?.();
  unsubProgress = window.qbot.progress.onChanged(renderProgress);
  unsubPerception?.();
  unsubPerception = window.qbot.perception.onChanged(() => void refreshPerception());

  await refreshRules();
  await refreshPerception();
  brainSignature = '';
  await refreshBrain();
  if (brainTimer) clearInterval(brainTimer);
  brainTimer = setInterval(() => { if (root?.getClientRects().length) void refreshBrain(); }, 2000);
  host.querySelector('#dev-brain-more')?.addEventListener('click', () => { brainLimit += 20; brainSignature = ''; void refreshBrain(); });

  host.querySelectorAll<HTMLButtonElement>('[data-perc]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void (async () => {
        if (btn.dataset.perc === 'refresh') {
          await refreshPerception();
        } else if (btn.dataset.perc === 'inject') {
          await window.qbot.perception.injectTest();
          await refreshPerception();
          toast(host, '已注入假 app_focus 事件');
        }
      })();
    });
  });

  host.querySelectorAll<HTMLButtonElement>('[data-behavior]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void (async () => {
        const action = btn.dataset.behavior;
        if (action === 'refresh') {
          await refreshRules();
          toast(host, '规则已刷新');
        } else if (action === 'trigger') {
          const sel = host.querySelector<HTMLSelectElement>('[data-behavior="trigger-select"]');
          const t = sel?.value;
          if (!t) {
            toast(host, '先选一个 trigger');
            return;
          }
          await window.qbot.behavior.trigger(t);
          toast(host, `已触发 ${t} 评估（看桌宠反应 / 决策日志）`);
        } else if (action === 'think') {
          btn.disabled = true;
          try {
            await window.qbot.behavior.debugThink();
            toast(host, '已让 LLM 脑思考一次（看决策日志 llm: 开头条目；需开自由模式 + 有 Key）');
            await refreshRules();
          } finally {
            btn.disabled = false;
          }
        } else if (action === 'stop') {
          await window.qbot.behavior.stopAll();
          toast(host, '已停止所有行为');
        }
      })();
    });
  });
}

async function refreshRules(): Promise<void> {
  const el = root?.querySelector<HTMLElement>('#dev-rules');
  if (!el) return;
  const rules = await window.qbot.behavior.getRules();
  const state = await window.qbot.behavior.getExecutorState();
  const cur = state.current
    ? `正在执行：<b>${state.current.id}</b>（第 ${state.current.step + 1} 步，优先级 ${state.current.priority}）`
    : '当前空闲';
  const q = state.queue.length > 0 ? ` · 队列 ${state.queue.length} 条` : '';
  el.innerHTML =
    `<div class="dev-exec">${cur}${q}</div>` +
    rules
      .map(
        (r) =>
          `<div class="dev-rule"><b>${r.name}</b>（权重 ${r.weight}）<button class="btn ghost dev-try" data-rule-id="${r.id}">试</button></div>`,
      )
      .join('');
  el.querySelectorAll<HTMLButtonElement>('.dev-try').forEach((btn) => {
    btn.addEventListener('click', () => {
      void window.qbot.behavior.debugTrigger(btn.dataset.ruleId!).then(() => {
        toast(el, '已立即重播（无冷却，不排队）');
      });
    });
  });
}

export function unmount(): void {
  unsubSettings?.(); unsubSettings = null;
  if (brainTimer) clearInterval(brainTimer);
  brainTimer = null;
  unsubProgress?.();
  unsubProgress = null;
  unsubPerception?.();
  unsubPerception = null;
  root = null;
}

function renderProgress(p: Progress): void {
  const el = root?.querySelector<HTMLElement>('#dev-progress');
  if (!el) return;
  const owned = Object.values(p.inventory).reduce((a, b) => a + b, 0);
  const kinds = Object.keys(p.inventory).length;
  const mins = Math.floor(p.idleMs / 60_000);
  const secs = Math.floor((p.idleMs % 60_000) / 1000);
  el.innerHTML =
    `<div>点数 <b>${p.points}</b> · 箱子 <b>${p.boxes}</b> · 挂机 ${mins}分${String(secs).padStart(2, '0')}秒 / 15分</div>` +
    `<div>家具 ${owned} 件 / ${kinds} 种 · 开箱 ${p.boxesOpened} 次 · 合成 ${p.crafted} 次</div>` +
    `<div>键盘 ${p.keysCounted} 下 · Claude Code 跑完 ${p.runsCounted} 轮</div>`;
}

/** 感知四流简化视图：最近事件 / 今日账本 / 最近决策（手动刷新，调试够用） */
async function refreshPerception(): Promise<void> {
  const foregroundEl = root?.querySelector<HTMLElement>('#dev-foreground-current');
  const foregroundEventsEl = root?.querySelector<HTMLElement>('#dev-foreground-events');
  const evEl = root?.querySelector<HTMLElement>('#dev-perc-events');
  const ledgerEl = root?.querySelector<HTMLElement>('#dev-perc-ledger');
  const decEl = root?.querySelector<HTMLElement>('#dev-perc-decisions');
  if (!foregroundEl || !foregroundEventsEl || !evEl || !ledgerEl || !decEl) return;
  const snap = await window.qbot.perception.get();

  const time = (at: number) => new Date(at).toLocaleTimeString('zh-CN', { hour12: false });
  const monitor = snap.foregroundMonitor;
  const monitorStatus =
    monitor.status === 'running'
      ? '正常'
      : monitor.status === 'degraded'
        ? '部分可用'
        : monitor.status === 'disabled'
          ? '未开启（可在设置中开启）'
          : monitor.status === 'unsupported'
            ? '当前平台不支持'
            : monitor.status === 'error'
              ? '采集失败'
              : '未启动';
  const foreground = snap.foreground;
  foregroundEl.innerHTML = foreground
    ? `<div><b>${escapeHtml(foreground.app)}</b> · ${escapeHtml(monitorStatus)} · ${escapeHtml(foreground.platform)}</div>` +
      `<div>窗口：${escapeHtml(foreground.windowTitle ?? '（标题不可用）')}</div>` +
      `<div>进程：${escapeHtml(foreground.processName ?? '未知')}${foreground.processId ? ` · PID ${foreground.processId}` : ''}</div>` +
      (foreground.windowBounds
        ? `<div>窗口：${foreground.windowBounds.width}×${foreground.windowBounds.height} @ ${foreground.windowBounds.x}, ${foreground.windowBounds.y}${foreground.windowState ? ` · ${escapeHtml(foreground.windowState)}` : ''}</div>`
        : foreground.windowState
          ? `<div>窗口状态：${escapeHtml(foreground.windowState)}</div>`
          : '') +
      (typeof foreground.isResponding === 'boolean'
        ? `<div>响应状态：${foreground.isResponding ? '正常' : '无响应'}</div>`
        : '') +
      (foreground.bundleId ? `<div>Bundle ID：${escapeHtml(foreground.bundleId)}</div>` : '') +
      (foreground.executablePath ? `<div class="dev-foreground-path">路径：${escapeHtml(foreground.executablePath)}</div>` : '') +
      `<div>来源：${escapeHtml(foreground.source)} · ${foreground.detailLevel === 'full' ? '完整窗口元数据' : '仅应用级元数据'} · ${time(foreground.at)}</div>` +
      (monitor.lastError ? `<div class="dev-perc-skip">${escapeHtml(monitor.lastError)}</div>` : '')
    : `<div><b>${escapeHtml(monitorStatus)}</b> · ${escapeHtml(monitor.platform)}</div>` +
      (monitor.lastError ? `<div class="dev-perc-skip">${escapeHtml(monitor.lastError)}</div>` : '');

  const foregroundEvents = snap.events
    .filter((e) => e.type === 'app_focus' || e.type === 'foreground_change')
    .slice(0, 30);
  foregroundEventsEl.innerHTML =
    foregroundEvents.length === 0
      ? '<div class="dev-perc-skip">（暂无前台切换记录）</div>'
      : foregroundEvents
          .map(
            (e) =>
              `<div class="dev-foreground-row"><span>${time(e.at)}</span><b>${escapeHtml(e.app)}</b><span>${escapeHtml(e.windowTitle || '（无窗口标题）')}</span></div>`,
          )
          .join('');

  const events = snap.events.slice(0, 10);
  evEl.innerHTML =
    events.length === 0
      ? '<div>（事件流为空）</div>'
      : events
          .map((e) => {
            const detail =
              e.type === 'app_focus' || e.type === 'foreground_change'
                ? `app: ${escapeHtml(e.app)}${e.windowTitle ? ` · ${escapeHtml(e.windowTitle)}` : ''}`
                : e.type === 'agent'
                  ? `activity: ${e.activity} · sessions: ${e.sessions}`
                  : e.type === 'meeting'
                    ? `inMeeting: ${e.inMeeting}`
                    : e.type === 'music'
                      ? `playing: ${e.playing}${e.title ? ` · ${e.title}` : ''}`
                      : e.type === 'interact'
                        ? e.kind
                        : '';
            return `<div>${time(e.at)} <b>${e.type}</b> ${detail}</div>`;
          })
          .join('');

  const apps = Object.entries(snap.ledger.apps)
    .sort((a, b) => b[1].switches - a[1].switches)
    .slice(0, 6);
  ledgerEl.innerHTML =
    `<div>账本 ${snap.ledgerDate}：切换 <b>${snap.ledger.totalSwitches}</b> 次 · 事件 ${snap.ledger.eventCount} 条` +
    (snap.ledger.firstActivityAt
      ? ` · 首次活动 ${time(snap.ledger.firstActivityAt)}`
      : '') +
    `</div>` +
    apps.map(([name, s]) => `<div>${name}: ${s.switches} 次</div>`).join('');

  const decs = snap.decisions.slice(0, 6);
  decEl.innerHTML =
    decs.length === 0
      ? '<div>（暂无决策日志）</div>'
      : decs
          .map(
            (d) =>
              `<div>${time(d.at)} <b>${d.trigger}</b> → ${
                d.selected ? `已选定 ${escapeHtml(d.selected.action)}${d.selected.text ? `「${escapeHtml(d.selected.text)}」` : ''}（决策记录）` : `<span class="dev-perc-skip">未执行</span>`
              }${d.skippedReason ? ` <span class="dev-perc-skip">(${d.skippedReason})</span>` : ''}</div>`,
          )
          .join('');
  const sent = snap.behaviors.filter((b) => b.kind === 'say').slice(0, 3);
  decEl.innerHTML += sent.map((b) =>
    `<div>${time(b.at)} 气泡已发送「${escapeHtml(b.detail ?? '')}」</div>`,
  ).join('');
}

async function refreshBrain(): Promise<void> {
  const host = root;
  const status = host?.querySelector<HTMLElement>('#dev-brain-status');
  const list = host?.querySelector<HTMLElement>('#dev-brain-log');
  if (!status || !list || brainLoading) return;
  brainLoading = true;
  try {
    const snapshot = await window.qbot.behavior.getBrainLog();
    if (host !== root) return;
    status.textContent = `${snapshot.gate?.reason ?? '尚未触发调用'}${snapshot.gate?.nextAt ? ` · 最早再次调用：${new Date(snapshot.gate.nextAt).toLocaleTimeString()}` : ''} · 共 ${snapshot.calls.length} 次调用${snapshot.storageError ? ` · 保存失败：${snapshot.storageError}` : ''}`;
    const visible = snapshot.calls.slice(0, brainLimit);
    const signature = JSON.stringify(visible);
    if (signature === brainSignature) return;
    brainSignature = signature;
    const opened = new Set([...list.querySelectorAll<HTMLDetailsElement>('details[open]')].map(el => el.dataset.call));
    const field = (title: string, value: unknown) => `<h4>${title}</h4><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto;user-select:text">${escapeHtml(typeof value === 'string' ? value : JSON.stringify(value ?? '尚无', null, 2))}</pre>`;
    list.innerHTML = visible.map(call => `<details data-call="${escapeHtml(call.id)}" ${opened.has(call.id) ? 'open' : ''} style="margin:12px 0"><summary>${new Date(call.at).toLocaleString()} · ${escapeHtml(call.trigger)} · ${escapeHtml(call.events.at(-1)?.stage ?? '准备中')}</summary>${field('完整输入（消息与上下文）', call.input)}${field('原始输出', call.raw)}${field('思考 / 是否行动 / 动作 / 说话', call.decision)}${field('执行过程', call.events.map(ev => `${new Date(ev.at).toLocaleTimeString()} ${ev.stage}${ev.detail ? `：${ev.detail}` : ''}`).join('\n'))}</details>`).join('') || '<p>暂无完整调用记录。旧的决策摘要仍在下方感知日志里。</p>';
    const more = host?.querySelector<HTMLButtonElement>('#dev-brain-more');
    if (more) more.hidden = snapshot.calls.length <= brainLimit;
  } catch (e) { status.textContent = `读取 LLM 日志失败：${String(e)}`; }
  finally { brainLoading = false; }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
