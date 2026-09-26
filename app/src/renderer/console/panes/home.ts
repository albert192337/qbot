import { navigate } from '../workspace';
import type { AgentActivity, AgentStatus, CharacterMeta, Progress, Settings } from '../../../shared/ipc-types';
import { icon } from '../icons';
import { esc, toast } from './_studio-shared';

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
      <div><p class="eyebrow">QBot 工作台</p><h2>今天和桌宠一起做点什么？</h2><p class="page-summary">创建自己的角色，布置小屋，让它陪你度过今天。</p></div>
      <button class="btn primary" data-open="hatch">${icon('create')} 创建角色</button>
    </div>

    ${!settings.onboardingDismissed ? `<section class="summary-section" aria-label="新手引导">
      <div class="section-heading"><div><h3>第一次见面，先玩起来</h3></div><button class="text-action" id="home-dismiss-guide">收起引导</button></div>
      <p>可以拖动桌宠换个位置，右键打开操作菜单。喜欢安静的话，在设置中关闭语音即可。</p>
      <div class="summary-list">
        <div class="summary-row"><span><b>① 打开见面礼</b><small>${(latestProgress?.boxesOpened ?? 0) > 0 ? '已完成！获得的家具可以摆进小屋。' : '已送你开箱所需的点数，打开就能获得一件家具。'}</small></span><button class="btn" id="home-first-box" ${(latestProgress?.boxesOpened ?? 0) > 0 ? 'disabled' : ''}>${(latestProgress?.boxesOpened ?? 0) > 0 ? '已领取' : '打开箱子'}</button></div>
        <div class="summary-row"><span><b>② 布置自己的小屋</b><small>进入小屋后，右键打开「我的家具」，摆上刚得到的装饰。</small></span><button class="btn" id="home-guide-room">进入小屋</button></div>
        <div class="summary-row"><span><b>③ 换成你的专属角色</b><small>上传一张形象图，用邀请码创建。等待时可以继续玩。</small></span><button class="btn" data-open="hatch">创建角色</button></div>
      </div>
      <p class="empty-copy">每陪伴 15 分钟获得 1 个箱子和 500 点，满仓暂停。无需接入工作软件或开启窗口感知。</p>
    </section>` : ''}
    <section class="home-hero ${active ? '' : 'is-empty'}">
      ${active ? `
        <div class="home-pet-preview"><img src="qbot-asset://${esc(active.dirId)}/__portrait.png" alt="${esc(active.manifest.name || '当前角色')}" /></div>
        <div class="home-hero-copy"><span class="status-dot success"></span><span class="eyebrow">当前在桌面</span><h3>${esc(active.manifest.name || '未命名')}</h3><p>${activeDone} 个动作可用${active.hasUnfinishedJob ? ' · 有生成任务进行中' : ''}</p>
        <div class="btn-row"><button class="btn primary" data-open="profile" data-dir="${esc(active.dirId)}">编辑角色资料</button><button class="btn secondary" data-open="characters">切换角色</button></div></div>
      ` : `
        <div class="home-empty-mark">${icon('characters')}</div><div class="home-hero-copy"><span class="eyebrow">还没有角色</span><h3>创建第一只桌宠</h3><p>准备一张正面角色图，确认形象后生成一套基础动作。</p><button class="btn primary" data-open="hatch">创建桌宠</button></div>
      `}
    </section>

    <div class="home-grid">
      <section class="summary-section">
        <div class="section-heading"><div>${icon('task')}<h3>后台任务</h3></div><button class="text-action" data-open="tasks">查看全部</button></div>
        ${unfinished.length === 0 && failed.length === 0
          ? '<p class="empty-copy">当前没有需要处理的生成任务。</p>'
          : `<div class="summary-list">
              ${unfinished.map((character) => `<button class="summary-row" data-open="tasks"><span><b>${esc(character.manifest?.name || character.dirId.slice(0, 8))}</b><small>生成仍在后台运行</small></span><span class="status-chip running">进行中</span></button>`).join('')}
              ${failed.map((character) => `<button class="summary-row" data-open="tasks"><span><b>${esc(character.manifest.name || '未命名')}</b><small>存在失败动作，可继续修复</small></span><span class="status-chip danger">需处理</span></button>`).join('')}
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
        <div class="btn-row"><button class="btn primary" id="home-open-house">进入我的小屋</button><button class="btn secondary" id="home-open-rooms">打开联机空间</button><button class="btn quiet" data-open="settings">隐私设置</button></div>
      </section>
    </div>
  </div>`;
}

function bind(host: HTMLElement): void {
  host.querySelector('#home-dismiss-guide')?.addEventListener('click', async () => {
    await window.qbot.settings.set({onboardingDismissed:true}); await refresh();
  });
  for (const selector of ['#home-guide-room','#home-open-house']) host.querySelector(selector)?.addEventListener('click', () => window.qbot.room.openHome());
  host.querySelector<HTMLButtonElement>('#home-first-box')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
    try {
      const result = await window.qbot.progress.openBox();
      if (result.ok) { latestProgress = result.progress; await refresh(); toast(root!, `获得了${result.gardenReward ?? '礼物'}！可在花园背包查看。`); }
      else toast(host, result.error);
    } catch (e) { toast(host, e instanceof Error ? e.message : String(e)); }
    finally { button.disabled = false; }
  });
  host.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((button) => {
    button.addEventListener('click', () => navigate({ pane: button.dataset.open!, dirId: button.dataset.dir }));
  });
  host.querySelector<HTMLButtonElement>('#home-open-rooms')?.addEventListener('click', () => {
    window.qbot.rooms.open();
  });
}
