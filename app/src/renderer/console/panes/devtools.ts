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

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  host.innerHTML = `
<div class="studio-body">
  <h2>开发者工具</h2>
  <p class="studio-hint">纯调试用。正常玩法里点数靠敲键盘（1 点/次）和 Claude Code 跑完一轮（10 点）攒，
  箱子靠挂机（15 分钟 1 个），调试时等不起。</p>

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
  const evEl = root?.querySelector<HTMLElement>('#dev-perc-events');
  const ledgerEl = root?.querySelector<HTMLElement>('#dev-perc-ledger');
  const decEl = root?.querySelector<HTMLElement>('#dev-perc-decisions');
  if (!evEl || !ledgerEl || !decEl) return;
  const snap = await window.qbot.perception.get();

  const time = (at: number) => new Date(at).toLocaleTimeString('zh-CN', { hour12: false });
  const events = snap.events.slice(0, 10);
  evEl.innerHTML =
    events.length === 0
      ? '<div>（事件流为空）</div>'
      : events
          .map((e) => {
            const detail =
              e.type === 'app_focus'
                ? `app: ${e.app}`
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
