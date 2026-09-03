import type { AgentActivity, AgentStatus, CharacterMeta, Progress, Settings } from '../../../shared/ipc-types';
import { icon } from '../icons';
import { esc } from './_studio-shared';

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
let unsubProgress: (() => void) | null = null;
let unsubCharacters: (() => void) | null = null;
let latestAgent: AgentStatus = { activity: 'idle', sessions: 0 };
let latestProgress: Progress | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  latestAgent = await window.qbot.agent.getStatus();
  latestProgress = await window.qbot.progress.get();
  unsubAgent = window.qbot.agent.onStatus((status) => {
    latestAgent = status;
    void refresh();
  });
  unsubProgress = window.qbot.progress.onChanged((progress) => {
    latestProgress = progress;
    void refresh();
  });
  unsubCharacters = window.qbot.characters.onActivated(() => void refresh());
  await refresh();
}

export function unmount(): void {
  unsubAgent?.();
  unsubProgress?.();
  unsubCharacters?.();
  unsubAgent = null;
  unsubProgress = null;
  unsubCharacters = null;
  root = null;
}

export async function onVisible(): Promise<void> {
  latestProgress = await window.qbot.progress.get();
  latestAgent = await window.qbot.agent.getStatus();
  await refresh();
}

async function refresh(): Promise<void> {
  const host = root;
  if (!host) return;
  const [characters, active, settings, hooks] = await Promise.all([
    window.qbot.characters.list(),
    window.qbot.characters.getActive(),
    window.qbot.settings.get(),
    window.qbot.claude.getStatus(),
  ]);
  host.innerHTML = template(characters, active, settings, hooks);
  bind(host);
}

function template(
  characters: CharacterMeta[],
  active: CharacterMeta | null,
  settings: Settings,
  hooks: boolean,
): string {
  const ready = characters.filter((character) => character.manifest);
  const unfinished = characters.filter((character) => character.hasUnfinishedJob);
  const failed = ready.filter((character) =>
    Object.values(character.manifest.actions).some((action) => action.status === 'failed'),
  );
  const activeDone = active
    ? Object.values(active.manifest.actions).filter((action) => action.status === 'done').length
    : 0;
  const furniture = latestProgress
    ? Object.values(latestProgress.inventory).reduce((total, count) => total + count, 0)
    : 0;

  return `<div class="studio-body home-body">
    <div class="page-heading">
      <div><p class="eyebrow">QBot 工作台</p><h2>今天想和谁一起工作？</h2><p class="page-summary">管理角色、处理生成任务，并确认连接与隐私状态。</p></div>
      <button class="btn primary" data-open="hatch">${icon('create')} 新建角色</button>
    </div>

    <section class="home-hero ${active ? '' : 'is-empty'}">
      ${active ? `
        <div class="home-pet-preview"><img src="qbot-asset://${esc(active.dirId)}/source.png" alt="${esc(active.manifest.name || '当前角色')}" /></div>
        <div class="home-hero-copy"><span class="status-dot success"></span><span class="eyebrow">当前在桌面</span><h3>${esc(active.manifest.name || '未命名')}</h3><p>${activeDone}/6 个基础动作可用${active.hasUnfinishedJob ? ' · 有生成任务进行中' : ''}</p>
        <div class="btn-row"><button class="btn primary" data-open="persona">打开角色工作台</button><button class="btn secondary" data-open="characters">切换角色</button></div></div>
      ` : `
        <div class="home-empty-mark">${icon('characters')}</div><div class="home-hero-copy"><span class="eyebrow">还没有角色</span><h3>先孵化第一只桌宠</h3><p>准备一张正面角色图，QBot 会生成三视图与基础动作。</p><button class="btn primary" data-open="hatch">开始孵化</button></div>
      `}
    </section>

    <div class="home-grid">
      <section class="summary-section">
        <div class="section-heading"><div>${icon('task')}<h3>后台任务</h3></div><button class="text-action" data-open="hatch">查看全部</button></div>
        ${unfinished.length === 0 && failed.length === 0
          ? '<p class="empty-copy">当前没有需要处理的生成任务。</p>'
          : `<div class="summary-list">
              ${unfinished.map((character) => `<button class="summary-row" data-open="hatch"><span><b>${esc(character.manifest?.name || character.dirId.slice(0, 8))}</b><small>生成仍在后台运行</small></span><span class="status-chip running">进行中</span></button>`).join('')}
              ${failed.map((character) => `<button class="summary-row" data-open="hatch"><span><b>${esc(character.manifest.name || '未命名')}</b><small>存在失败动作，可继续修复</small></span><span class="status-chip danger">需处理</span></button>`).join('')}
            </div>`}
      </section>

      <section class="summary-section">
        <div class="section-heading"><div>${icon('connection')}<h3>连接与行为</h3></div><button class="text-action" data-open="claude">管理</button></div>
        <div class="summary-list static">
          <div class="summary-row"><span><b>Claude Code</b><small>${latestAgent.sessions > 0 ? `${latestAgent.sessions} 个活跃会话` : '暂无活跃会话'}</small></span><span class="status-chip ${hooks ? 'success' : 'muted'}">${hooks ? ACTIVITY_LABEL[latestAgent.activity] : '未接入'}</span></div>
          <div class="summary-row"><span><b>自由模式</b><small>规则脑始终作为保底</small></span><span class="status-chip ${settings.freeMode ? 'success' : 'muted'}">${settings.freeMode ? '已开启' : '陪伴模式'}</span></div>
          <div class="summary-row"><span><b>前台感知</b><small>应用与窗口元数据仅保存在本机</small></span><span class="status-chip ${settings.foregroundObservationEnabled ? 'success' : 'muted'}">${settings.foregroundObservationEnabled ? '记录中' : '已关闭'}</span></div>
        </div>
      </section>

      <section class="summary-section">
        <div class="section-heading"><div>${icon('characters')}<h3>角色资产</h3></div><button class="text-action" data-open="characters">管理</button></div>
        <div class="metric-strip"><div><b>${ready.length}</b><span>只角色</span></div><div><b>${ready.reduce((sum, character) => sum + Object.values(character.manifest.actions).filter((action) => action.status === 'done').length, 0)}</b><span>个可用动作</span></div><div><b>${failed.length}</b><span>个异常角色</span></div></div>
      </section>

      <section class="summary-section">
        <div class="section-heading"><div>${icon('room')}<h3>陪伴与房间</h3></div></div>
        <div class="metric-strip"><div><b>${latestProgress?.points ?? 0}</b><span>点数</span></div><div><b>${latestProgress?.boxes ?? 0}</b><span>箱子</span></div><div><b>${furniture}</b><span>件家具</span></div></div>
        <div class="btn-row"><button class="btn secondary" id="home-open-rooms">打开公共房间</button><button class="btn quiet" data-open="settings">隐私设置</button></div>
      </section>
    </div>
  </div>`;
}

function bind(host: HTMLElement): void {
  host.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((button) => {
    button.addEventListener('click', () => window.qbot.ui.openConsole(button.dataset.open));
  });
  host.querySelector<HTMLButtonElement>('#home-open-rooms')?.addEventListener('click', () => {
    window.qbot.rooms.open();
  });
}
