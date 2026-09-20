import './book-structure.css';
import './lounge.css';
import './book.css';
import {
  getEditingCharacter,
  getSelectedCharacterId,
  selectCharacter,
  type ConsoleRoute,
} from '../console/workspace';
import { confirmBox } from '../console/panes/_studio-shared';
import { button, el } from './dom';
import { errorMessage } from './model';
import type { CharacterMeta } from '../../shared/ipc-types';
interface Module {
  mount(root: HTMLElement): void | Promise<void>;
  onVisible?(): void | Promise<void>;
  unmount?(): void;
  hasUnsavedChanges?(): boolean;
  discardChanges?(): void | Promise<void>;
}
const LOADERS: Record<string, () => Promise<Module>> = {
  memory: () => import('../console/panes/memory'),
  characters: () => import('../console/panes/characters'),
  profile: () => import('../console/panes/profile'),
  persona: () => import('../console/panes/persona'),
  'scene-actions': () => import('../console/panes/scene-actions'),
  prompts: () => import('../console/panes/prompts'),
  stickers: () => import('../console/panes/stickers'),
  'sticker-create': () => import('../console/panes/sticker-create'),
  tasks: () => import('../console/panes/tasks'),
  market: () => import('../console/panes/market'),
  settings: () => import('../console/panes/settings'),
  claude: () => import('../console/panes/claude'),
  devtools: () => import('../console/panes/devtools'),
  lounge: async () => {
    const { mountView } = await import('../lounge/view');
    let view: Awaited<ReturnType<typeof mountView>>;
    return {
      mount: async (root) => {
        view = await mountView(root);
        const open = document.createElement('button'); open.textContent = '打开「一起玩」 · 好友、世界与本地试演 ↗';
        open.className = 'btn primary'; open.style.cssText = 'margin-bottom:16px;padding:12px 20px';
        open.onclick = () => window.qbot.rooms.open(); root.prepend(open);
      },
      onVisible: () => view.onVisible(),
      unmount: () => view.unmount(),
    };
  },
  rewards: () => import('./rewards'),
  furnish: () => import('./furnish'),
};
export const BOOK_TITLES: Record<string, string> = {
  memory: '我记得的你',
  characters: '朋友相册',
  profile: '它的故事',
  persona: '动作练习册',
  'scene-actions': '生活排练表',
  prompts: '创作笔记',
  stickers: '贴纸收集册',
  'sticker-create': '贴纸新朋友',
  tasks: '练习手记',
  market: '街角集市',
  settings: '小屋手册',
  claude: '工作信号台',
  devtools: '工具抽屉',
  lounge: '一起玩',
  rewards: '陪伴的礼物',
  furnish: '我的小屋',
};
const TABS = [
  ['profile', '它的故事'],
  ['persona', '动作练习'],
  ['scene-actions', '生活排练'],
  ['stickers', '贴纸'],
  ['prompts', '创作笔记'],
];
export class Book {
  readonly root = el('section', undefined, 'house-book');
  private title = el('h2');
  private tabs = el('nav', undefined, 'book-tabs');
  private context = el('div', undefined, 'book-context');
  private pages = el('div');
  private entries = new Map<string, { root: HTMLElement; module: Module }>();
  private current = '';
  private queue = Promise.resolve();
  private offSettings: () => void;
  private observer: MutationObserver;
  private closing = false;
  private revision = 0;
  constructor(
    private close: () => void,
    private onCharacter: (meta: CharacterMeta) => void,
    private report: (message: string) => void,
  ) {
    this.offSettings = window.qbot.settings.onChanged((settings) => {
      if (
        !settings.developerMode &&
        this.current === 'devtools' &&
        !this.root.hidden
      )
        this.request({ pane: 'settings' });
      if (this.current === 'settings') {
        this.tabs.querySelector('[data-dev]')?.remove();
        if (settings.developerMode) {
          const b = button(
            '工具抽屉',
            () => this.request({ pane: 'devtools' }),
            'bookmark',
          );
          b.dataset.dev = 'true';
          this.tabs.append(b);
        }
      }
    });
    this.root.id = 'house-book';
    this.root.hidden = true;
    this.pages.id = 'book-pages';
    this.root.setAttribute('aria-label', '小屋手册');
    const head = el('header', undefined, 'book-head');
    head.append(this.title, button('合上手册', close, 'quiet'));
    this.tabs.setAttribute('aria-label', '手册书签');
    this.root.append(head, this.context, this.tabs, this.pages);
    // Cards are stills until the user explicitly plays them. Hidden books do not decode videos.
    this.observer = new MutationObserver(() => this.pauseMedia());
    this.observer.observe(this.pages, { childList: true, subtree: true });
  }
  has(id: string): boolean {
    return Object.hasOwn(LOADERS, id);
  }
  open(route: ConsoleRoute): Promise<void> {
    const revision = ++this.revision;
    this.queue = this.queue
      .then(() =>
        revision === this.revision ? this.navigate(route, revision) : undefined,
      )
      .catch((e) => this.report(errorMessage(e)));
    return this.queue;
  }
  private async navigate(
    route: ConsoleRoute,
    revision = this.revision,
  ): Promise<void> {
    const id = route.pane;
    if (!this.has(id) || this.closing) return;
    if (this.root.querySelector('[role="dialog"]')) return;
    if (
      id === 'devtools' &&
      !(await window.qbot.settings.get()).developerMode
    ) {
      if (revision === this.revision)
        await this.navigate({ pane: 'settings' }, revision);
      return;
    }
    if (revision !== this.revision) return;
    this.root.hidden = false;
    if (route.dirId && route.dirId !== getSelectedCharacterId()) {
      const dirty = [...this.entries.entries()]
        .filter(
          ([key, e]) =>
            TABS.some(([tab]) => tab === key) && e.module.hasUnsavedChanges?.(),
        )
        .map(([, e]) => e);
      if (
        dirty.length &&
        !(await confirmBox(
          this.pages,
          '换一位朋友练习，会放弃当前朋友尚未保存的修改。确定切换吗？',
        ))
      )
        return;
      selectCharacter(route.dirId);
      for (const entry of dirty) await entry.module.discardChanges?.();
    }
    const editor = TABS.some(([key]) => key === id);
    const editing = editor ? await getEditingCharacter() : null;
    if (revision !== this.revision) return;
    this.current = id;
    this.root.hidden = false;
    this.title.textContent = BOOK_TITLES[id];
    this.pauseMedia();
    for (const entry of this.entries.values()) {
      entry.root.hidden = true;
      entry.root.classList.remove('active');
    }
    this.tabs.replaceChildren();
    this.context.replaceChildren();
    if (editor) {
      for (const [key, label] of TABS) {
        const b = button(label, () => this.request({ pane: key }), 'bookmark');
        b.setAttribute('aria-current', String(id === key));
        this.tabs.append(b);
      }
      const label = el('label', '一起练习的朋友 ');
      const picker = el('select');
      picker.setAttribute('aria-label', '一起练习的朋友');
      const chars = await window.qbot.characters.list();
      if (revision !== this.revision) return;
      for (const c of chars.filter((c) => c.manifest)) {
        const option = el('option', c.manifest.name || '新朋友');
        option.value = c.dirId;
        option.selected = c.dirId === editing?.dirId;
        picker.append(option);
      }
      picker.onchange = () => {
        const old = editing?.dirId ?? '';
        const dirId = picker.value;
        picker.value = old;
        this.request({ pane: id, dirId });
      };
      label.append(picker);
      this.context.append(label, el('span', '动作会在小舞台上播放。'));
      if (editing) this.onCharacter(editing);
    } else if (id === 'settings' || id === 'devtools') {
      this.tabs.append(
        button(
          '小屋手册',
          () => void this.open({ pane: 'settings' }),
          'bookmark',
        ),
      );
      if ((await window.qbot.settings.get()).developerMode) {
        const b = button(
          '工具抽屉',
          () => this.request({ pane: 'devtools' }),
          'bookmark',
        );
        b.dataset.dev = 'true';
        this.tabs.append(b);
      }
    } else if (id === 'rewards' || id === 'furnish') {
      this.tabs.append(
        button(
          '礼物与收藏',
          () => void this.open({ pane: 'rewards' }),
          'bookmark',
        ),
        button(
          '摆放家具',
          () => void this.open({ pane: 'furnish' }),
          'bookmark',
        ),
        button('在桌面展开小屋', () => window.qbot.room.openHome(), 'bookmark'),
      );
    }
    this.tabs.append(button('我记得的你', () => this.request({ pane: 'memory' }), 'bookmark'));
    let entry = this.entries.get(id);
    if (!entry) {
      const root = el('section', undefined, 'pane active');
      root.dataset.pane = id;
      this.pages.append(root);
      const module = await LOADERS[id]();
      try {
        await module.mount(root);
        root.dataset.ready = 'true';
      } catch (e) {
        module.unmount?.();
        root.remove();
        throw e;
      }
      entry = { root, module };
      this.entries.set(id, entry);
    } else {
      entry.root.hidden = false;
      entry.root.classList.add('active');
      await entry.module.onVisible?.();
    }
    if (revision !== this.revision) {
      this.pauseMedia();
      return;
    }
    this.pages.scrollTop = 0;
    this.pauseMedia();
    this.root
      .querySelector<HTMLButtonElement>('.book-head button')
      ?.focus({ preventScroll: true });
  }
  private request(route: ConsoleRoute): void {
    window.dispatchEvent(
      new CustomEvent('console:navigate', { detail: route }),
    );
  }
  pauseMedia(force = false): void {
    this.pages.querySelectorAll('video').forEach((v) => {
      if (v.autoplay) {
        v.autoplay = false;
        v.pause();
      }
      v.controls = !v.closest('.action-card')?.querySelector('.preview-action');
      v.preload = 'metadata';
      if (force || this.root.hidden || v.closest<HTMLElement>('.pane')?.hidden)
        v.pause();
    });
  }
  hide(): void {
    ++this.revision;
    this.root.hidden = true;
    this.pauseMedia();
    for (const e of this.entries.values()) e.root.classList.remove('active');
  }
  dispose(): void {
    this.closing = true;
    this.observer.disconnect();
    this.offSettings();
    for (const e of this.entries.values()) e.module.unmount?.();
  }
}
