/**
 * Claude Code pane：hooks 安装开关 + 实时活动状态。
 * 自托盘 connectSection 的「接入 Claude Code 联动」迁入（阶段 6）。
 *
 * 状态读 claudeHooksPresent() 的磁盘真值，而非 settings.claudeHooksInstalled
 * 那个记忆位——用户手改 ~/.claude/settings.json 后两者会漂移。
 */
import type { AgentActivity, AgentStatus } from '../../../shared/ipc-types';
import { toast } from './_studio-shared';

const ACTIVITY_LABEL: Record<AgentActivity, string> = {
  idle: '空闲',
  thinking: '思考中',
  working: '干活中',
  waiting: '等你处理',
  done: '刚完成',
  error: '出错了',
};

let root: HTMLElement | null = null;
let unsubAgent: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  host.innerHTML = `
<div class="studio-body">
  <div class="page-heading"><div><p class="eyebrow">连接</p><h2>Claude Code</h2><p class="page-summary">让桌宠感知编码会话，并用动作和气泡反馈当前进度。</p></div></div>

  <div class="conn-card">
    <div class="conn-row">
      <span class="conn-label">联动状态</span>
      <span id="claude-state" class="conn-value">检测中…</span>
    </div>
    <div class="conn-row">
      <span class="conn-label">当前活动</span>
      <span id="claude-activity" class="conn-value">—</span>
    </div>
    <div class="conn-row">
      <span class="conn-label">配置文件</span>
      <span class="conn-value"><code>~/.claude/settings.json</code></span>
    </div>
    <div class="btn-row">
      <button id="claude-toggle" class="btn" disabled>检测中…</button>
      <button id="claude-scenes" class="btn ghost">配置状态动作</button>
    </div>
    <p class="studio-hint">安装会写入 <code>~/.claude/settings.json</code>（首次写入前自动备份），
    点击后会弹出系统确认框。卸载同样走这个按钮，幂等可反复切换。</p>
  </div>
</div>`;

  await refreshHooks();

  const st = await window.qbot.agent.getStatus();
  renderActivity(st);
  unsubAgent?.();
  unsubAgent = window.qbot.agent.onStatus(renderActivity);

  host.querySelector<HTMLButtonElement>('#claude-toggle')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    void (async () => {
      btn.disabled = true;
      btn.textContent = '处理中…';
      try {
        const installed = await window.qbot.claude.toggle();
        toast(host, installed ? 'Claude Code 联动已接入 ✓' : '已卸载 Claude Code 联动');
      } catch (err) {
        toast(host, `操作失败：${err instanceof Error ? err.message : String(err)}`, 'warn');
      } finally {
        await refreshHooks();
      }
    })();
  });
  host.querySelector<HTMLButtonElement>('#claude-scenes')?.addEventListener('click', () => {
    window.qbot.ui.openConsole('scene-actions');
  });
}

export function unmount(): void {
  unsubAgent?.();
  unsubAgent = null;
  root = null;
}

export async function onVisible(): Promise<void> {
  await refreshHooks();
}

async function refreshHooks(): Promise<void> {
  const host = root;
  if (!host) return;
  const present = await window.qbot.claude.getStatus();
  const state = host.querySelector<HTMLElement>('#claude-state');
  const btn = host.querySelector<HTMLButtonElement>('#claude-toggle');
  if (state) {
    state.textContent = present ? '已接入' : '未接入';
    state.classList.toggle('ok', present);
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = present ? '卸载联动' : '接入 Claude Code 联动';
    btn.classList.toggle('ghost', present);
  }
}

function renderActivity(st: AgentStatus): void {
  const el = root?.querySelector<HTMLElement>('#claude-activity');
  if (!el) return;
  const label = ACTIVITY_LABEL[st.activity] ?? st.activity;
  el.textContent = st.sessions > 0 ? `${label}（${st.sessions} 个会话）` : label;
}
