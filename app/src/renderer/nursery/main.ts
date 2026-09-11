import './style.css';
import Phaser from 'phaser';
import { Book } from './book';
import { AREAS, type Area } from './house';
import type { ConsoleRoute } from '../console/workspace';
import type { CharacterMeta } from '../../shared/ipc-types';
import { Player } from '../pet/player';
import { NurseryController, type NurseryState } from './controller';
import {
  ACTIONS,
  ACTION_STATUS,
  incubation,
  PHASE_LABEL,
  errorMessage,
} from './model';
import { NurseryScene, type Place } from './scene';
import { CreationForm } from './create-form';
import { button, el, image } from './dom';

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const api = window.qbot;
const world = $('world'),
  paper = $('paper'),
  body = $('paper-body'),
  source = $<HTMLImageElement>('source');
let view: 'home' | 'draft' | 'job' | 'ledger' | 'friend' | 'book' = 'home';
let area: Area = 'nursery';
let navigation = 0;
let selectedFriend: CharacterMeta | null = null;
let previewKey = '';
let disposed = false;
let nativeVisible = true;
const isVisible = () => nativeVisible && !document.hidden;
let shownError = '';
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let game: Phaser.Game;
const player = new Player($('actor'), () => player.play('idle'));
const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Storage failure must never repeat a paid request. */
    }
  },
};
const controller = new NurseryController(api.hatch, renderState);
const scene = new NurseryScene(visit, () => {
  scene.setArea(area);
  updateScene();
});
const book = new Book(
  home,
  (meta) => {
    selectedFriend = meta;
    preview(meta);
  },
  notice,
);
world.append(book.root);
for (const [id, info] of Object.entries(AREAS)) {
  const b = button(info.name, () => changeArea(id as Area), 'map-room');
  b.dataset.area = id;
  b.setAttribute('aria-current', String(id === area));
  $('area-map').append(b);
}
const form = new CreationForm(
  api,
  (url) => {
    if (view === 'draft') showSource(url);
  },
  async (draft) => {
    return controller.perform(async () => {
      const id = await api.hatch.start(
        draft.path,
        draft.provider,
        draft.form,
        draft.style,
        draft.name,
      );
      storage.set(`qbot:creation-name:${id}`, draft.name);
      storage.set('qbot:nursery-task', id);
      view = 'job';
      ++navigation;
      await controller.open(id);
    });
  },
);
function fit(): void {
  const scale = Math.min(innerWidth / 1120, innerHeight / 720);
  world.style.transform = `scale(${scale})`;
  world.style.left = `${(innerWidth - 1120 * scale) / 2}px`;
  world.style.top = `${(innerHeight - 720 * scale) / 2}px`;
}
window.addEventListener('resize', fit);
fit();
function notice(message: string): void {
  $('notice').textContent = message;
  $('notice').hidden = false;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    $('notice').hidden = true;
  }, 7000);
}
function showSource(url: string | null): void {
  stopPreview();
  source.hidden = !url;
  if (url) {
    source.src = url;
    source.onerror = () => {
      source.hidden = true;
      updateScene();
    };
  } else source.removeAttribute('src');
  updateScene();
}
function stopPreview(): void {
  if (previewKey) player.dispose();
  previewKey = '';
}
function preview(meta: CharacterMeta): void {
  source.hidden = true;
  const key = `${meta.dirId}:${JSON.stringify([meta.manifest.actions, meta.manifest.importedActions, meta.manifest.expressionActions, meta.manifest.customActions])}`;
  if (previewKey === key || !isVisible()) return;
  player.load(meta.dirId, meta.manifest);
  player.play('idle');
  previewKey = key;
  updateScene();
}
function updateScene(): void {
  const { phase, done } = incubation(controller.state.status);
  const shownPhase = view === 'friend' ? 'born' : phase;
  world.dataset.phase = shownPhase;
  scene.present(shownPhase, done, !source.hidden || !!previewKey);
  const hint = $('incubator-hint');
  if (hint)
    hint.textContent = controller.state.id
      ? PHASE_LABEL[phase]
      : '放一张图片，让故事开始';
}
function openPaper(title: string, kicker = '孵化手记'): void {
  book.hide();
  paper.hidden = false;
  world.classList.add('inspecting');
  scene.setPanelOpen(true);
  $('paper-title').textContent = title;
  $('paper-kicker').textContent = kicker;
}
function setNarration(text: string): void {
  $('narration').textContent = text;
}
function home(): void {
  if (controller.state.busy) return;
  ++navigation;
  view = 'home';
  book.hide();
  paper.hidden = true;
  world.classList.remove('inspecting');
  scene.setPanelOpen(false);
  const st = controller.state.status;
  if (st?.stage === 'done' && selectedFriend) preview(selectedFriend);
  else showSource(null);
  setNarration(
    controller.state.id
      ? '孵化台替你记着进度。可以离开小屋，回来再看它。'
      : '窗外的风很轻。桌上的孵化台，正等着一张属于你的图片。',
  );
  $('back').blur();
  updateScene();
  if (area !== 'nursery') {
    setNarration(AREAS[area].story);
    if (selectedFriend) preview(selectedFriend);
  }
}
function draft(): void {
  if (controller.state.busy) return;
  if (area !== 'nursery') changeArea('nursery');
  ++navigation;
  view = 'draft';
  selectedFriend = null;
  void controller.open(null);
  openPaper('从一张图片开始。', '01 / 迎接新朋友');
  body.replaceChildren(form.root);
  showSource(form.url);
  setNarration('把图片放在玻璃罩里，再给它起个名字。');
  void form.refreshAccount();
}
async function openJob(id: string): Promise<void> {
  if (controller.state.busy) return;
  if (area !== 'nursery') changeArea('nursery');
  book.hide();
  ++navigation;
  view = 'job';
  selectedFriend = null;
  showSource(null);
  storage.set('qbot:nursery-task', id);
  await controller.open(id);
}
function visit(place: Place): void {
  if (controller.state.busy) {
    notice('正在提交这一步，请稍等片刻。');
    return;
  }
  if (place === 'hatch') {
    if (controller.state.id) void openJob(controller.state.id);
    else draft();
  }
  if (place === 'ledger') void ledger();
  if (place === 'door') void leave();
  if (book.has(place)) void openBook({ pane: place });
}
async function leave(): Promise<void> {
  await controller.perform(async () => {
    await api.ui.returnToDesktop();
    window.close();
  });
}
function taskMutation(operation: () => Promise<void>): void {
  void controller.perform(async () => {
    await operation();
    await controller.refresh();
  });
}
function renderState(state: NurseryState): void {
  if (disposed) return;
  $('back').toggleAttribute('disabled', state.busy);
  document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach((b) => {
    b.disabled = state.busy;
  });
  if (view === 'draft') {
    form.setBusy(state.busy);
    if (state.error) form.showError(state.error);
  }
  if (view === 'friend' && selectedFriend) renderFriend(selectedFriend);
  if (state.error && state.error !== shownError) notice(state.error);
  if (!state.error && shownError) {
    $('notice').hidden = true;
    if (noticeTimer) clearTimeout(noticeTimer);
  }
  shownError = state.error ?? '';
  updateScene();
  if (view !== 'job') return;
  const { phase, done, failed, total } = incubation(state.status);
  openPaper(
    state.loading ? '翻开这页手记…' : PHASE_LABEL[phase],
    phase === 'born' ? '04 / 新朋友到家' : '01 / 孵化台',
  );
  body.replaceChildren();
  if (state.error)
    body.append(
      el('p', state.error, 'error-text'),
      button('重新查看', () => void controller.refresh(), 'secondary wide'),
    );
  const st = state.status;
  if (!st) {
    body.append(
      el(
        'p',
        state.loading
          ? '正在查看真实的孵化进度。'
          : '可以从手记里找到其他朋友，或迎接一位新朋友。',
      ),
    );
    if (!state.loading)
      body.append(button('翻开手记', () => void ledger(), 'secondary wide'));
    return;
  }
  const background = st.cloud
    ? '可以离开小屋，关闭客户端后云端仍会继续。'
    : '可以离开小屋。使用本地生成时，请保持 QBot 运行。';
  if (st.error) body.append(el('p', st.error, 'error-text'));
  if (phase === 'born') {
    renderBirth(state.id!);
  } else if (phase === 'pick') {
    body.append(
      el(
        'p',
        '这是它将要来到你身边的模样。看一看正面、侧面和背面，确认后就开始学习动作。',
      ),
    );
    if (st.candidateUrls?.length) {
      for (const [index, url] of st.candidateUrls.entries()) {
        body.append(image(url, '待确认的角色三视图', 'candidate'));
        body.append(
          button(
            '就是它，开始学习动作',
            () =>
              taskMutation(() => api.hatch.pickTurnaround(state.id!, index)),
            'primary wide',
          ),
        );
      }
      const redo = button(
        '再看看另一种模样',
        () => confirmRedo(state.id!, st.cloud === true),
        'quiet',
      );
      body.append(redo);
    } else
      body.append(
        el('p', '形象图片还在同步，稍后会出现在这里。'),
        button('重新查看', () => void controller.refresh()),
      );
    showSource(st.candidateUrls?.[0] ?? null);
  } else if (phase === 'brewing' || phase === 'queued') {
    body.append(
      el(
        'p',
        phase === 'queued'
          ? `正在等候孵化台空出来${st.queuePosition ? `，当前排在第 ${st.queuePosition} 位` : ''}。`
          : '它的模样正在一点点显现。形象准备好后，需要你来点头确认。',
      ),
    );
    body.append(el('p', background, 'cost-note'));
    showSource(null);
  } else {
    const count = el('div', String(done).padStart(2, '0'), 'progress-count');
    count.append(el('small', `/ ${total} 个动作已学会`));
    body.append(count);
    const list = el('ul', undefined, 'action-list');
    for (const [id, label] of ACTIONS) {
      const action = st.actions[id];
      const li = el('li', undefined, action?.status ?? 'pending');
      li.append(
        el('b', label),
        el('span', ACTION_STATUS[action?.status ?? 'pending'] ?? '等待练习'),
      );
      if (action?.error) li.title = action.error;
      list.append(li);
    }
    body.append(list);
    if (phase === 'interrupted') {
      body.append(
        el(
          'p',
          st.cloud
            ? '进度已记在手记里。网络恢复后，可以重新查看；生成失败时，再选择继续。'
            : '进度已经保存。继续孵化会恢复这份任务；模型请求可能产生费用。',
        ),
      );
      body.append(
        button(
          '重新查看进度',
          () => void controller.refresh(),
          'secondary wide',
        ),
      );
      body.append(
        button(
          failed ? '继续学习未完成动作' : '继续孵化',
          () => confirmResume(state.id!, !!st.cloud),
          'primary wide',
        ),
      );
    } else body.append(el('p', background, 'mini'));
    showSource(null);
  }
  if (phase !== 'born' && phase !== 'pick')
    body.append(button('去小屋里等它', home, 'quiet'));
  body.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    b.disabled = state.busy;
  });
  setNarration(
    phase === 'born'
      ? '故事从这里开始。它已经准备好和你一起回桌面。'
      : background,
  );
}
function confirmRedo(id: string, cloud: boolean): void {
  if (controller.state.busy) return;
  body.replaceChildren(
    el(
      'p',
      cloud
        ? '再生成一个形象方案，将使用本次孵化包含的方案次数。'
        : '再生成一个形象方案会调用模型服务并产生费用。',
    ),
  );
  body.append(
    button(
      '确认换一个方案',
      () => taskMutation(() => api.hatch.pickTurnaround(id, -1)),
      'primary wide',
    ),
    button('保留当前方案', () => renderState(controller.state), 'quiet'),
  );
}
function confirmResume(id: string, cloud: boolean): void {
  body.replaceChildren(
    el(
      'p',
      cloud
        ? '将继续这份任务。失败重试会使用本次孵化包含的重试次数，超出时服务会提示。'
        : '将继续这份任务，已完成的动作会保留。模型请求会使用你的 API Key 并产生费用。',
    ),
  );
  body.append(
    button(
      '确认继续',
      () => taskMutation(() => api.hatch.resume(id)),
      'primary wide',
    ),
    button('暂时不了', () => renderState(controller.state), 'quiet'),
  );
}
async function renderBirth(id: string): Promise<void> {
  const revision = navigation;
  body.append(el('p', '正在迎接新朋友…'));
  try {
    const characters = await api.characters.list();
    if (
      disposed ||
      revision !== navigation ||
      view !== 'job' ||
      controller.state.id !== id ||
      controller.state.status?.stage !== 'done'
    )
      return;
    const meta = characters.find((c) => c.dirId === id && c.manifest);
    if (!meta) {
      body.replaceChildren(
        el('p', '角色文件还在同步，稍后再来迎接它。'),
        button('重新查看', () => void controller.refresh()),
      );
      return;
    }
    selectedFriend = meta;
    renderFriend(meta, true);
    preview(meta);
  } catch (e) {
    if (revision === navigation) {
      body.replaceChildren(
        el('p', errorMessage(e), 'error-text'),
        button('重新查看', () => void controller.refresh()),
      );
    }
  }
}
function renderFriend(meta: CharacterMeta, birth = false): void {
  const name = characterName(meta);
  body.replaceChildren(
    el('p', name, 'birth-name'),
    el(
      'p',
      birth
        ? '它已经学会了日常的小动作。试着和它打个招呼，或带它到桌面开始陪伴。'
        : '它正在孵化台旁等你。试试它的小动作，或者带它回到桌面。',
    ),
  );
  const moves = el('div', undefined, 'actions-preview');
  for (const [id, label] of ACTIONS)
    if (meta.manifest.actions[id]?.status === 'done')
      moves.append(
        button(
          label,
          () => {
            player.play(id);
          },
          '',
        ),
      );
  if (controller.state.error)
    body.append(el('p', controller.state.error, 'error-text'));
  body.append(
    button(
      '翻开它的练习册',
      () => void openBook({ pane: 'profile', dirId: meta.dirId }),
      'secondary wide',
    ),
  );
  body.append(
    moves,
    button('带它回到桌面', () => adopt(meta), 'primary wide'),
    button('先留在小屋里', home, 'quiet'),
  );
  body.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    b.disabled = controller.state.busy;
  });
}
function adopt(meta: CharacterMeta): void {
  void controller.perform(async () => {
    const draftName = storage.get(`qbot:creation-name:${meta.dirId}`);
    if (draftName && (!meta.manifest.name || meta.manifest.name === '未命名'))
      await api.characters.rename(meta.dirId, draftName);
    await api.characters.activate(meta.dirId);
    await api.ui.returnToDesktop();
    window.close();
  });
}
async function ledger(): Promise<void> {
  if (controller.state.busy) return;
  const revision = ++navigation;
  view = 'ledger';
  selectedFriend = null;
  showSource(null);
  openPaper('每一次相遇，都记着。', '02 / 小屋手记');
  body.replaceChildren(el('p', '正在翻找朋友们的记录…'));
  setNarration('未完成的孵化、已经来到身边的朋友，都在这本手记里。');
  try {
    const chars = await api.characters.list();
    if (disposed || revision !== navigation) return;
    body.replaceChildren(button('迎接一位新朋友', draft, 'primary wide'));
    const pending = chars.filter(
      (c) =>
        !c.taskDismissed &&
        (c.hasUnfinishedJob ||
          Object.values(c.manifest?.actions ?? {}).some(
            (a) => a.status === 'failed',
          )),
    );
    body.append(el('h3', '还在孵化 / 等待领取', 'section-title'));
    if (!pending.length)
      body.append(el('p', '没有需要照看的孵化。窗外的风很轻。', 'mini'));
    for (const c of pending)
      body.append(
        companion(c, () => void openJob(c.dirId), '翻开这份孵化记录'),
      );
    const friends = chars.filter((c) => c.manifest && !c.hasUnfinishedJob);
    body.append(el('h3', '已经认识的朋友', 'section-title'));
    if (!friends.length)
      body.append(el('p', '第一位朋友会从桌上的孵化台开始它的故事。', 'empty'));
    for (const c of friends)
      body.append(
        companion(
          c,
          () => {
            ++navigation;
            view = 'friend';
            selectedFriend = c;
            openPaper('和它待一会儿。', '02 / 我的朋友');
            renderFriend(c);
            preview(c);
          },
          '打个招呼 · 带到桌面',
        ),
      );
    body.append(
      button(
        '整理朋友相册',
        () => void openBook({ pane: 'characters' }),
        'quiet',
      ),
      button('去布置小屋', () => void openBook({ pane: 'furnish' }), 'quiet'),
    );
  } catch (e) {
    if (revision === navigation)
      body.replaceChildren(
        el('p', errorMessage(e), 'error-text'),
        button('再翻一次', () => void ledger()),
      );
  }
}
function characterName(meta: CharacterMeta): string {
  const name = meta.manifest?.name;
  return (
    (name && name !== '未命名'
      ? name
      : storage.get(`qbot:creation-name:${meta.dirId}`)) || '新朋友'
  );
}
function companion(
  meta: CharacterMeta,
  action: () => void,
  description: string,
): HTMLButtonElement {
  const control = button('', action, 'companion');
  if (meta.manifest?.sourceImage) {
    const img = image(
      `qbot-asset://${meta.dirId}/${meta.manifest.sourceImage}`,
      '',
      '',
    );
    img.onerror = () => img.remove();
    control.append(img);
  }
  const info = el('span');
  info.append(el('b', characterName(meta)), el('small', description));
  control.append(info);
  return control;
}
$('back').addEventListener('click', home);
$('leave-house').addEventListener('click', () => {
  if (!document.querySelector('[role=dialog],#modal.on')) void leave();
});
$('settings').addEventListener(
  'click',
  () => void openBook({ pane: 'settings' }),
);
$('memory-book').addEventListener('click', () => void openBook({ pane: 'memory' }));
source.addEventListener('load', updateScene);
document
  .querySelectorAll<HTMLButtonElement>('[data-place]')
  .forEach((control) =>
    control.addEventListener('click', () =>
      visit(control.dataset.place as Place),
    ),
  );
window.addEventListener('keydown', (e) => {
  if (
    e.key === 'Escape' &&
    !e.isComposing &&
    !e.defaultPrevented &&
    !document.querySelector('[role=dialog],#modal.on')
  ) {
    home();
    document.querySelector<HTMLButtonElement>('.hatch-place')?.focus();
  }
});
world.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
});
world.addEventListener('drop', (e) => {
  e.preventDefault();
  if (controller.state.busy) return;
  const file = e.dataTransfer?.files[0];
  if (file) {
    draft();
    form.select(file);
  }
});
const off = [
  api.ui.onNurseryVisibility((visible) => {
    nativeVisible = visible;
    visibility();
  }),
  api.ui.onShowScreen((name) => {
    if (name === 'nursery:create') draft();
    else route({ pane: name });
  }),
  api.hatch.onProgress((event) => controller.receiveProgress(event)),
  api.hatch.onCloudStatus(({ dirId, status }) =>
    controller.receive(dirId, status),
  ),
];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const motionChanged = () => scene.setReducedMotion(reduced.matches);
reduced.addEventListener('change', motionChanged);
function visibility(): void {
  if (!isVisible()) {
    game?.loop.sleep();
    stopPreview();
    book.pauseMedia(true);
  } else {
    game?.loop.wake();
    void controller.refresh();
    if (
      selectedFriend &&
      (view === 'friend' || view === 'home' || view === 'book')
    )
      preview(selectedFriend);
  }
}
document.addEventListener('visibilitychange', visibility);
window.addEventListener('focus', () => {
  if (isVisible()) void controller.refresh();
});
window.addEventListener('beforeunload', () => {
  disposed = true;
  ++navigation;
  controller.dispose();
  book.dispose();
  off.forEach((fn) => fn());
  form.dispose();
  player.dispose();
  reduced.removeEventListener('change', motionChanged);
  if (noticeTimer) clearTimeout(noticeTimer);
  game?.destroy(true);
});
try {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'scene',
    width: 1120,
    height: 720,
    backgroundColor: '#f3eddc',
    scene,
    render: { antialias: true, roundPixels: false },
    fps: { target: 30 },
    audio: { noAudio: true },
    banner: false,
  });
} catch (e) {
  notice('小屋画面暂时无法打开，仍可使用孵化操作。');
  console.error(e);
}
const last = storage.get('qbot:nursery-task');
if (last) void controller.open(last);
if (new URLSearchParams(location.search).get('create') === '1') draft();

function changeArea(next: Area): void {
  if (
    controller.state.busy ||
    document.querySelector('[role=dialog],#modal.on')
  )
    return;
  area = next;
  home();
  scene.setArea(next);
  world.dataset.area = next;
  document.querySelector('h1')!.textContent = AREAS[next].title;
  document
    .querySelectorAll<HTMLButtonElement>('[data-area]')
    .forEach((b) =>
      b.setAttribute('aria-current', String(b.dataset.area === next)),
    );
  document
    .querySelectorAll<HTMLButtonElement>('[data-place]')
    .forEach((b, i) => {
      const [place, label, hint] = AREAS[next].objects[i];
      b.dataset.place = place;
      b.replaceChildren(
        el('span', String(i + 1).padStart(2, '0')),
        document.createTextNode(label),
        el('small', hint),
      );
      if (place === 'hatch') b.querySelector('small')!.id = 'incubator-hint';
    });
  setNarration(AREAS[next].story);
  const revision = navigation;
  if (next !== 'nursery' && !selectedFriend)
    void api.characters
      .getActive()
      .then((meta) => {
        if (meta && revision === navigation && view === 'home') {
          selectedFriend = meta;
          preview(meta);
        }
      })
      .catch((e) => notice(errorMessage(e)));
}
async function openBook(request: ConsoleRoute): Promise<void> {
  if (
    controller.state.busy ||
    document.querySelector('[role=dialog],#modal.on')
  )
    return;
  const next: Area = ['characters', 'profile', 'rewards', 'furnish', 'memory'].includes(
    request.pane,
  )
    ? 'living'
    : ['persona', 'scene-actions', 'stickers', 'prompts', 'tasks'].includes(
          request.pane,
        )
      ? 'practice'
      : ['market', 'lounge', 'claude'].includes(request.pane)
        ? 'porch'
        : area;
  if (next !== area) changeArea(next);
  $('notice').hidden = true;
  if (noticeTimer) clearTimeout(noticeTimer);
  ++navigation;
  view = 'book';
  paper.hidden = true;
  world.classList.add('inspecting');
  scene.setPanelOpen(true);
  await book.open(request);
}
function route(request: ConsoleRoute): void {
  if (request.pane === 'hatch') {
    if (request.taskId) void openJob(request.taskId);
    else draft();
  } else if (request.pane === 'home') changeArea('living');
  else if (book.has(request.pane)) void openBook(request);
}
window.addEventListener('console:navigate', ((e: CustomEvent<ConsoleRoute>) =>
  route(e.detail)) as EventListener);
window.addEventListener('house:preview', ((
  e: CustomEvent<{ dirId: string; action: string }>,
) => {
  void api.characters
    .list()
    .then((chars) => {
      const meta = chars.find((c) => c.dirId === e.detail.dirId);
      if (meta && view === 'book') {
        selectedFriend = meta;
        preview(meta);
        player.play(e.detail.action);
        notice('正在小舞台上练习这个动作。');
      }
    })
    .catch((e) => notice(errorMessage(e)));
}) as EventListener);
window.addEventListener('house:reward', () => scene.celebrate());
const initialPane = new URLSearchParams(location.search).get('pane');
if (initialPane) route({ pane: initialPane });
