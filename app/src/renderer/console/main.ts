/**
 * 控制台渲染进程入口：左侧栏二级目录 + 右侧 pane 懒挂载。
 *
 * pane 语义：每个 pane 首次激活时才 mount（懒），之后常驻 DOM（切走只隐藏），
 * 未保存的输入在 pane 间切换不丢；重新可见时调 onVisible（孵化据此拉快照）。
 * 深链：主进程 createConsoleWindow(pane) 发 `ui:showScreen` 切 pane。
 */

export type PaneId =
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
  /** 每次 pane 变为可见时调用（孵化 pane 靠它主动拉快照，见 panes/hatch.ts） */
  onVisible?: () => void | Promise<void>;
}

interface PaneDef {
  id: PaneId;
  label: string;
  icon: string;
  group: string;
  load: () => Promise<PaneModule>;
}

/** 侧栏结构：分组 → 项。图标先行（emoji 简化，后续可换字体图标） */
const GROUPS: { label: string; defs: Omit<PaneDef, 'group'>[] }[] = [
  {
    label: '角色',
    defs: [
      { id: 'characters', label: '我的角色', icon: '🐾', load: () => import('./panes/characters') },
      { id: 'hatch', label: '孵化新角色', icon: '🥚', load: () => import('./panes/hatch') },
    ],
  },
  {
    label: '配置',
    defs: [
      { id: 'persona', label: '人设与动作', icon: '🎨', load: () => import('./panes/persona') },
      { id: 'scene-actions', label: '场景动作', icon: '🎬', load: () => import('./panes/scene-actions') },
      { id: 'stickers', label: '表情包导入', icon: '🧩', load: () => import('./panes/stickers') },
      { id: 'prompts', label: '生成 Prompt', icon: '📝', load: () => import('./panes/prompts') },
    ],
  },
  {
    label: '社区',
    defs: [
      { id: 'market', label: '装扮市场', icon: '🛍️', load: () => import('./panes/market') },
    ],
  },
  {
    label: '连接',
    defs: [
      { id: 'claude', label: 'Claude Code', icon: '🤖', load: () => import('./panes/claude') },
    ],
  },
  {
    label: '系统',
    defs: [
      { id: 'settings', label: '设置', icon: '⚙️', load: () => import('./panes/settings') },
      { id: 'devtools', label: '开发者工具', icon: '🔧', load: () => import('./panes/devtools') },
    ],
  },
];

const ALL_DEFS: PaneDef[] = GROUPS.flatMap((g) =>
  g.defs.map((d) => ({ ...d, group: g.label })),
);

const sidebar = document.getElementById('sidebar')!;
const content = document.getElementById('content')!;

/** paneId → pane 元素（懒挂载后常驻，切走只隐藏——未保存的输入不丢） */
const mounted = new Map<PaneId, HTMLElement>();
const modules = new Map<PaneId, PaneModule>();
let activePane: PaneId | null = null;

function buildSidebar(): void {
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = '🐣 QBot 控制台';
  sidebar.appendChild(brand);

  for (const group of GROUPS) {
    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = group.label;
    sidebar.appendChild(label);

    for (const def of group.defs) {
      const btn = document.createElement('button');
      btn.className = 'side-item';
      btn.dataset.pane = def.id;
      btn.innerHTML = `<span>${def.icon}</span><span>${def.label}</span>`;
      btn.addEventListener('click', () => switchPane(def.id));
      sidebar.appendChild(btn);
    }
  }
}

async function switchPane(id: PaneId): Promise<void> {
  if (activePane === id) return;
  activePane = id;

  document.querySelectorAll('.side-item').forEach((el) => {
    el.classList.toggle('active', (el as HTMLElement).dataset.pane === id);
  });

  let root = mounted.get(id);
  if (!root) {
    root = document.createElement('section');
    root.className = 'pane';
    root.dataset.pane = id;
    root.id = `pane-${id}`;
    content.appendChild(root);
    mounted.set(id, root);
  }
  // 隐藏其他 pane
  for (const [pid, el] of mounted) {
    el.classList.toggle('active', pid === id);
  }

  if (!modules.has(id)) {
    const def = ALL_DEFS.find((d) => d.id === id);
    if (!def) return;
    const mod = await def.load();
    modules.set(id, mod);
    await mod.mount(root);
  } else {
    // 已挂载过：给 pane 一次「我又可见了」的机会（孵化据此拉快照兜底事件流）
    await modules.get(id)!.onVisible?.();
  }
}

/** 深链入口：主进程 ui:showScreen(name) 切换（name 非法则忽略） */
window.qbot.ui.onShowScreen((name) => {
  if (ALL_DEFS.some((d) => d.id === name)) void switchPane(name as PaneId);
});

buildSidebar();

// 默认 pane：取 URL query 的 pane（主进程深链时带），否则「我的角色」
const initial = new URLSearchParams(location.search).get('pane');
void switchPane((initial && ALL_DEFS.some((d) => d.id === initial) ? initial : 'characters') as PaneId);
