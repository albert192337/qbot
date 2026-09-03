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
let unsubPerception: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  host.innerHTML = `
<div class="studio-body">
  <div class="page-heading"><div><p class="eyebrow">仅限调试</p><h2>开发者工具</h2><p class="page-summary">检查行为、感知与游戏化状态；普通使用无需进入这里。</p></div></div>
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
    <p class="studio-hint">开箱与合成在小房间的「我的家具」里（开完箱紧接着就要摆，动线不拆开）。</p>
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
    <p class="studio-hint">「触发评估」走完整链路（条件 + 仲裁 + 决策日志）；点单条规则的「试」绕过条件直接执行。</p>
  </div>

  <div class="conn-card">
    <h3>前台应用记录</h3>
    <p class="studio-hint">只在本机记录系统公开的应用名、窗口标题和进程元数据，不读取窗口正文，也不会同步到公共房间。原始记录随感知事件保留 7 天。</p>
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

  const p = await window.qbot.progress.get();
  renderProgress(p);
  unsubProgress?.();
  unsubProgress = window.qbot.progress.onChanged(renderProgress);
  unsubPerception?.();
  unsubPerception = window.qbot.perception.onChanged(() => void refreshPerception());

  await refreshRules();
  await refreshPerception();

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
        toast(el, '已触发（绕过条件检查）');
      });
    });
  });
}

export function unmount(): void {
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
                d.selected ? `${d.selected.action}${d.selected.text ? `「${d.selected.text}」` : ''}` : `<span class="dev-perc-skip">未执行</span>`
              }${d.skippedReason ? ` <span class="dev-perc-skip">(${d.skippedReason})</span>` : ''}</div>`,
          )
          .join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
