import '@fontsource-variable/nunito';
import './workspace.css';
import './theme.css';
import { getEditingCharacter, getSelectedCharacterId, selectCharacter, taskCharacters, type ConsoleRoute } from './workspace';
import { icon, type ConsoleIcon } from './icons';

export type PaneId =
  | 'sticker-create' | 'lounge' | 'rewards' | 'furnish' | 'memory'
  | 'profile'
  | 'tasks'
  | 'home'
  | 'characters'
  | 'hatch'
  | 'persona'
  | 'scene-actions'
  | 'stickers'
  | 'prompts'
  | 'market'
  | 'claude'
  | 'settings'
  | 'devtools';

interface PaneModule {
  mount: (root: HTMLElement) => void | Promise<void>;
  unmount?: () => void;
  onVisible?: () => void | Promise<void>;
  onNavigate?: (route: ConsoleRoute) => void | Promise<void>;
  hasUnsavedChanges?: () => boolean;
  discardChanges?: () => void | Promise<void>;
}

interface PaneDef {
  id: PaneId;
  label: string;
  icon: ConsoleIcon;
  group: string;
  load: () => Promise<PaneModule>;
  developerOnly?: boolean;
  hiddenFromSidebar?: boolean;
  navParent?: PaneId;
}

const GROUPS: { label: string; defs: Omit<PaneDef, 'group'>[] }[] = [
  {
    label: '工作台',
    defs: [
      { id: 'home', label: '总览', icon: 'home', load: () => import('./panes/home') },
    ],
  },
  {
    label: '角色',
    defs: [
      { id: 'characters', label: '角色库', icon: 'characters', load: () => import('./panes/characters') },
      { id: 'sticker-create', label: '导入表情包', icon: 'stickers', load: () => import('./panes/sticker-create') },
      { id: 'hatch', label: '创建角色', icon: 'create', load: () => import('./panes/hatch') },
      { id: 'profile', label: '角色资料', icon: 'persona', load: () => import('./panes/profile'), hiddenFromSidebar: true, navParent: 'characters' },
      { id: 'persona', label: '角色工作台', icon: 'actions', load: () => import('./panes/persona'), hiddenFromSidebar: true, navParent: 'characters' },
      { id: 'tasks', label: '生成任务', icon: 'task', load: () => import('./panes/tasks') },
      { id: 'scene-actions', label: '动作配置', icon: 'actions', load: () => import('./panes/scene-actions'), hiddenFromSidebar: true, navParent: 'characters' },
      { id: 'stickers', label: '导入动作', icon: 'stickers', load: () => import('./panes/stickers'), hiddenFromSidebar: true, navParent: 'characters' },
      { id: 'prompts', label: '高级生成', icon: 'prompts', load: () => import('./panes/prompts'), hiddenFromSidebar: true, navParent: 'characters' },
    ],
  },
  {
    label: '桌面与物品',
    defs: [
      { id: 'rewards', label: '物品', icon: 'home', load: () => import('../nursery/rewards') },
      { id: 'furnish', label: '布置房间', icon: 'room', load: () => import('../nursery/furnish') },
      { id: 'memory', label: '记忆', icon: 'persona', load: () => import('./panes/memory') },
    ],
  },
  {
    label: '连接与社区',
    defs: [
      { id: 'lounge', label: '联机房间', icon: 'room', load: () => import('./panes/lounge') },
      { id: 'claude', label: 'Claude Code', icon: 'connection', load: () => import('./panes/claude') },
      { id: 'market', label: '装扮市场', icon: 'market', load: () => import('./panes/market') },
    ],
  },
  {
    label: '系统',
    defs: [
      { id: 'settings', label: '设置', icon: 'settings', load: () => import('./panes/settings') },
      { id: 'devtools', label: '开发者工具', icon: 'developer', load: () => import('./panes/devtools'), developerOnly: true },
    ],
  },
];

const ALL_DEFS: PaneDef[] = GROUPS.flatMap((group) =>
  group.defs.map((definition) => ({ ...definition, group: group.label })),
);

const sidebar = document.getElementById('sidebar')!;
const contextbar = document.getElementById('contextbar')!;
const subnav = document.getElementById('subnav')!;
const content = document.getElementById('content')!;
const mounted = new Map<PaneId, HTMLElement>();
const modules = new Map<PaneId, PaneModule>();
let activePane: PaneId | null = null;
let viewingTask = false;
let developerMode = false;

function visibleGroups(): typeof GROUPS {
  return GROUPS.map((group) => ({
    ...group,
    defs: group.defs.filter((definition) =>
      !definition.hiddenFromSidebar && (!definition.developerOnly || developerMode),
    ),
  })).filter((group) => group.defs.length > 0);
}

function buildSidebar(): void {
  sidebar.replaceChildren();
  const brand = document.createElement('button');
  brand.className = 'brand';
  brand.type = 'button';
  brand.innerHTML = `<span class="brand-mark">Q</span><span><b>QBot</b><small>角色管理</small></span>`;
  brand.addEventListener('click', () => void switchPane('home'));
  sidebar.appendChild(brand);


  for (const group of visibleGroups()) {
    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = group.label;
    sidebar.appendChild(label);

    for (const definition of group.defs) {
      const button = document.createElement('button');
      button.className = 'side-item';
      button.dataset.pane = definition.id;
      button.innerHTML = `${icon(definition.icon)}<span>${definition.label}</span>`;
      button.addEventListener('click', () => void switchPane(definition.id));
      sidebar.appendChild(button);
    }
  }
  syncActiveNavigation();
}

function syncActiveNavigation(): void {
  const activeDefinition = ALL_DEFS.find((definition) => definition.id === activePane);
  const activeSidebarPane = activePane === 'hatch' && viewingTask ? 'tasks' : activeDefinition?.navParent ?? activePane;
  document.querySelectorAll('.side-item').forEach((element) => {
    const selected = (element as HTMLElement).dataset.pane === activeSidebarPane;
    element.classList.toggle('active', selected);
    if (selected) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current');
  });
}

const ROLE_WORKSPACE_TABS: { id: PaneId; label: string; description: string }[] = [
  { id: 'profile', label: '角色资料', description: '名字、人设与角色概况' },
  { id: 'persona', label: '动作库', description: '预览、添加与管理动作' },
  { id: 'scene-actions', label: '动作配置', description: '绑定工作、音乐与会议状态' },
  { id: 'prompts', label: '高级生成', description: '精细控制动作生成' },
];

function refreshSubnav(): void {
  const isRoleWorkspace = isWorkspace(activePane);
  if (!isRoleWorkspace || activePane === 'sticker-create') {
    subnav.replaceChildren();
    return;
  }

  subnav.innerHTML = `<button type="button" class="subnav-title btn ghost" id="workspace-back">角色库</button><div class="subnav-tabs">${ROLE_WORKSPACE_TABS.map((tab) =>
    `<button type="button" class="subnav-tab${tab.id === activePane || (tab.id === 'persona' && activePane === 'stickers') ? ' active' : ''}" data-pane="${tab.id}" title="${tab.description}">${tab.label}</button>`,
  ).join('')}</div>`;
  subnav.querySelector('#workspace-back')?.addEventListener('click', () => void switchPane('characters'));
  subnav.querySelectorAll<HTMLButtonElement>('[data-pane]').forEach((button) => {
    button.addEventListener('click', () => void switchPane(button.dataset.pane as PaneId));
  });
}

async function askDiscardChanges(): Promise<boolean> {
  if (![...modules.values()].some((module) => module.hasUnsavedChanges?.())) return true;
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'shell-dialog-backdrop';
    overlay.innerHTML = `<div class="shell-dialog" role="dialog" aria-modal="true" aria-labelledby="shell-dialog-title">
      <p class="eyebrow">尚未保存</p>
      <h3 id="shell-dialog-title">放弃当前修改？</h3>
      <p>切换编辑角色会放弃工作台中的未保存修改。只切换页面时，草稿会为你保留。</p>
      <div class="btn-row"><button class="btn secondary" data-choice="stay">继续编辑</button><button class="btn danger" data-choice="discard">放弃修改</button></div>
    </div>`;
    const done = (discard: boolean): void => {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      resolve(discard);
    };
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') done(false);
    };
    overlay.addEventListener('click', (event) => {
      const choice = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-choice]')?.dataset.choice;
      if (!choice) return;
      done(choice === 'discard');
    });
    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);
    overlay.querySelector<HTMLButtonElement>('[data-choice="stay"]')?.focus();
  });
}

function isWorkspace(id: PaneId | null): boolean {
  return id === 'sticker-create' || id === 'stickers' || ROLE_WORKSPACE_TABS.some((tab) => tab.id === id);
}
let navigation = Promise.resolve();
function switchPane(id: PaneId, route: ConsoleRoute = { pane: id, fresh: id === 'hatch' }): Promise<void> {
  navigation = navigation.then(() => performNavigation(id, route)).catch((error: unknown) => {
    const message = document.createElement('div'); message.className = 'studio-toast warn';
    message.setAttribute('role', 'alert'); message.textContent = `页面加载失败：${String(error)}`;
    content.appendChild(message); setTimeout(() => message.remove(), 6000);
  });
  return navigation;
}
async function performNavigation(id: PaneId, route: ConsoleRoute): Promise<void> {
  if (!ALL_DEFS.some((definition) => definition.id === id)) return;
  if (route.dirId && route.dirId !== getSelectedCharacterId()) {
    if (!(await askDiscardChanges())) return;
    selectCharacter(route.dirId);
    for (const module of modules.values()) await module.discardChanges?.();
  }
  if (activePane === id && modules.has(id) && !route.taskId && !route.fresh && !route.dirId) return;
  if(activePane!==id)mounted.get(activePane!)?.querySelectorAll('video').forEach(video=>video.pause());
  activePane = id;
  viewingTask = !!route.taskId;
  syncActiveNavigation();
  refreshSubnav();

  let root = mounted.get(id);
  if (!root) {
    root = document.createElement('section');
    root.className = 'pane';
    root.dataset.pane = id;
    root.id = `pane-${id}`;
    content.appendChild(root);
    mounted.set(id, root);
  }
  for (const [paneId, element] of mounted) {
    element.classList.toggle('active', paneId === id);
    // Visibility belongs to the router, never to a lazily loaded pane stylesheet.
    element.hidden = paneId !== id;
    element.inert = paneId !== id;
  }
  root.scrollTop = 0;

  if (!modules.has(id)) {
    const definition = ALL_DEFS.find((item) => item.id === id);
    if (!definition) return;
    const module = await definition.load();
    await module.mount(root);
    modules.set(id, module);
  } else {
    await modules.get(id)!.onVisible?.();
  }
  await modules.get(id)?.onNavigate?.(route);
  await refreshContextBar();
}

let contextRevision = 0;
async function refreshContextBar(): Promise<void> {
  const revision = ++contextRevision;
  const [characters, active, editing] = await Promise.all([
    window.qbot.characters.list(),
    window.qbot.characters.getActive(),
    getEditingCharacter(),
  ]);
  if (revision !== contextRevision) return;
  const ready = characters.filter((character) => character.manifest);
  const taskCount = taskCharacters(characters).length;
  const shown = isWorkspace(activePane) ? editing : active;
  contextbar.innerHTML = `<div class="context-character">
    ${shown?.coverImage ? `<img src="qbot-asset://${shown.dirId}/${shown.coverImage}" alt="" />` : `<span class="context-placeholder">${icon('characters')}</span>`}
    <label><span>${isWorkspace(activePane) ? '正在编辑 · 不影响桌面角色' : '桌面角色'}</span><select id="context-character-select" ${ready.length === 0 ? 'disabled' : ''}>
      ${ready.length === 0 ? '<option>暂无角色</option>' : ready.map((character) => `<option value="${character.dirId}"${character.dirId === shown?.dirId ? ' selected' : ''}>${escapeHtml(character.manifest.name || '未命名')}</option>`).join('')}
    </select></label>
  </div>
  <div class="context-actions">
    ${isWorkspace(activePane) && editing ? `<button class="btn ${editing.dirId === active?.dirId ? 'ghost' : 'primary'}" id="context-activate" ${editing.dirId === active?.dirId ? 'disabled' : ''}>${editing.dirId === active?.dirId ? '已在桌面' : '放到桌面'}</button>` : ''}
    <button class="context-task ${taskCount > 0 ? 'has-tasks' : ''}" id="context-tasks">${icon('task')}<span>${taskCount > 0 ? `${taskCount} 项待处理` : '生成任务'}</span></button>
    <button class="icon-button" id="context-create" aria-label="创建角色" title="创建角色">${icon('create')}</button>
    <button class="icon-button" id="context-room" aria-label="打开联机空间" title="打开联机空间">${icon('room')}</button>
  </div>`;

  contextbar.querySelector<HTMLSelectElement>('#context-character-select')?.addEventListener('change', (event) => {
    const select = event.currentTarget as HTMLSelectElement;
    if (isWorkspace(activePane)) {
      void switchPane(activePane!, { pane: activePane!, dirId: select.value }).then(refreshContextBar);
    } else {
      select.disabled = true;
      void window.qbot.characters.activate(select.value).then(refreshContextBar).catch(() => refreshContextBar());
    }
  });
  contextbar.querySelector<HTMLButtonElement>('#context-activate')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
    if (editing) void window.qbot.characters.activate(editing.dirId).then(refreshContextBar).catch(() => refreshContextBar());
  });
  contextbar.querySelector('#context-tasks')?.addEventListener('click', () => void switchPane('tasks'));
  contextbar.querySelector('#context-create')?.addEventListener('click', () => void switchPane('hatch', { pane: 'hatch', fresh: true }));
  contextbar.querySelector('#context-room')?.addEventListener('click', () => window.qbot.rooms.open());
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(video=>video.pause());});
window.qbot.ui.onShowScreen((name) => {
  if(name==='nursery:create')name='hatch';
  if (ALL_DEFS.some((definition) => definition.id === name)) void switchPane(name as PaneId);
});

window.addEventListener('console:navigate', ((event: CustomEvent<ConsoleRoute>) => {
  void switchPane(event.detail.pane as PaneId, event.detail);
}) as EventListener);
window.qbot.characters.onActivated(() => { void refreshContextBar(); });
window.addEventListener('console:characters-changed', () => { void refreshContextBar(); });
let contextTimer: ReturnType<typeof setTimeout> | undefined;
const refreshTasks = () => {
  if (contextTimer) return;
  contextTimer = setTimeout(() => { contextTimer = undefined; void refreshContextBar(); }, 500);
};
window.qbot.hatch.onProgress(refreshTasks);
window.qbot.hatch.onCloudStatus(refreshTasks);
window.qbot.studio.onCustomAction(refreshTasks);

window.qbot.settings.onChanged((settings) => {
  if (!!settings.developerMode !== developerMode) {
    developerMode = !!settings.developerMode;
    buildSidebar();
    if (!developerMode && activePane === 'devtools') void switchPane('settings');
  }
});

void (async () => {
  developerMode = !!(await window.qbot.settings.get()).developerMode;
  buildSidebar();
  await refreshContextBar();
  const initial = new URLSearchParams(location.search).get('pane');
  const requested = initial && ALL_DEFS.some((definition) => definition.id === initial) ? initial as PaneId : 'home';
  await switchPane(requested === 'devtools' && !developerMode ? 'settings' : requested);
})();
