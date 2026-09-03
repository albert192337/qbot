import { icon, type ConsoleIcon } from './icons';

export type PaneId =
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
      { id: 'hatch', label: '新建与修复', icon: 'create', load: () => import('./panes/hatch') },
      { id: 'persona', label: '人设与动作', icon: 'persona', load: () => import('./panes/persona') },
      { id: 'scene-actions', label: '场景绑定', icon: 'actions', load: () => import('./panes/scene-actions') },
      { id: 'stickers', label: 'GIF 动作导入', icon: 'stickers', load: () => import('./panes/stickers') },
      { id: 'prompts', label: '高级生成', icon: 'prompts', load: () => import('./panes/prompts') },
    ],
  },
  {
    label: '连接与社区',
    defs: [
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
const content = document.getElementById('content')!;
const mounted = new Map<PaneId, HTMLElement>();
const modules = new Map<PaneId, PaneModule>();
let activePane: PaneId | null = null;
let developerMode = false;
let changingCharacter = false;
let activeCharacterId: string | null = null;

function visibleGroups(): typeof GROUPS {
  return GROUPS.map((group) => ({
    ...group,
    defs: group.defs.filter((definition) => !definition.developerOnly || developerMode),
  })).filter((group) => group.defs.length > 0);
}

function buildSidebar(): void {
  sidebar.replaceChildren();
  const brand = document.createElement('button');
  brand.className = 'brand';
  brand.type = 'button';
  brand.innerHTML = `<span class="brand-mark">Q</span><span><b>QBot</b><small>桌宠工坊</small></span>`;
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
  document.querySelectorAll('.side-item').forEach((element) => {
    element.classList.toggle('active', (element as HTMLElement).dataset.pane === activePane);
  });
}

async function askDiscardChanges(): Promise<boolean> {
  const current = activePane ? modules.get(activePane) : undefined;
  if (!current?.hasUnsavedChanges?.()) return true;
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'shell-dialog-backdrop';
    overlay.innerHTML = `<div class="shell-dialog" role="dialog" aria-modal="true" aria-labelledby="shell-dialog-title">
      <p class="eyebrow">尚未保存</p>
      <h3 id="shell-dialog-title">放弃当前修改？</h3>
      <p>切换页面或角色后，这些尚未保存的内容会丢失。</p>
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

async function switchPane(id: PaneId): Promise<void> {
  if (activePane === id) return;
  if (!(await askDiscardChanges())) return;
  if (activePane) await modules.get(activePane)?.discardChanges?.();
  activePane = id;
  syncActiveNavigation();

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
  }

  if (!modules.has(id)) {
    const definition = ALL_DEFS.find((item) => item.id === id);
    if (!definition) return;
    const module = await definition.load();
    modules.set(id, module);
    await module.mount(root);
  } else {
    await modules.get(id)!.onVisible?.();
  }
  await refreshContextBar();
}

async function refreshContextBar(): Promise<void> {
  const [characters, active] = await Promise.all([
    window.qbot.characters.list(),
    window.qbot.characters.getActive(),
  ]);
  const ready = characters.filter((character) => character.manifest);
  activeCharacterId = active?.dirId ?? null;
  const taskCount = new Set([
    ...characters.filter((character) => character.hasUnfinishedJob).map((character) => character.dirId),
    ...ready.filter((character) => Object.values(character.manifest.actions).some((action) => action.status === 'failed')).map((character) => character.dirId),
  ]).size;

  contextbar.innerHTML = `<div class="context-character">
    ${active ? `<img src="qbot-asset://${active.dirId}/source.png" alt="" />` : `<span class="context-placeholder">${icon('characters')}</span>`}
    <label><span>当前角色</span><select id="context-character-select" ${ready.length === 0 ? 'disabled' : ''}>
      ${ready.length === 0 ? '<option>暂无角色</option>' : ready.map((character) => `<option value="${character.dirId}"${character.dirId === active?.dirId ? ' selected' : ''}>${escapeHtml(character.manifest.name || '未命名')}</option>`).join('')}
    </select></label>
  </div>
  <div class="context-actions">
    <button class="context-task ${taskCount > 0 ? 'has-tasks' : ''}" id="context-tasks">${icon('task')}<span>${taskCount > 0 ? `${taskCount} 项待处理` : '任务正常'}</span></button>
    <button class="icon-button" id="context-create" aria-label="新建角色" title="新建角色">${icon('create')}</button>
    <button class="icon-button" id="context-room" aria-label="打开公共房间" title="打开公共房间">${icon('room')}</button>
  </div>`;

  contextbar.querySelector<HTMLSelectElement>('#context-character-select')?.addEventListener('change', (event) => {
    if (changingCharacter) return;
    const select = event.currentTarget as HTMLSelectElement;
    const previous = active?.dirId ?? '';
    void (async () => {
      if (!(await askDiscardChanges())) {
        select.value = previous;
        return;
      }
      changingCharacter = true;
      try {
        await modules.get(activePane!)?.discardChanges?.();
        await window.qbot.characters.activate(select.value);
        await modules.get(activePane!)?.onVisible?.();
      } finally {
        changingCharacter = false;
        await refreshContextBar();
      }
    })();
  });
  contextbar.querySelector('#context-tasks')?.addEventListener('click', () => void switchPane('hatch'));
  contextbar.querySelector('#context-create')?.addEventListener('click', () => void switchPane('hatch'));
  contextbar.querySelector('#context-room')?.addEventListener('click', () => window.qbot.rooms.open());
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.qbot.ui.onShowScreen((name) => {
  if (ALL_DEFS.some((definition) => definition.id === name)) void switchPane(name as PaneId);
});

window.qbot.characters.onActivated((next) => {
  if (changingCharacter) return;
  const previous = activeCharacterId;
  void (async () => {
    const currentModule = activePane ? modules.get(activePane) : undefined;
    if (previous && previous !== next.dirId && currentModule?.hasUnsavedChanges?.()) {
      if (!(await askDiscardChanges())) {
        changingCharacter = true;
        try {
          await window.qbot.characters.activate(previous);
        } finally {
          changingCharacter = false;
          await refreshContextBar();
        }
        return;
      }
      await currentModule.discardChanges?.();
    }
    await refreshContextBar();
    await currentModule?.onVisible?.();
  })();
});

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
