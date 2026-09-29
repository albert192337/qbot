/**
 * 角色选择舞台：浏览与上桌分离，保留编辑 / 重命名 / 删除。
 *
 * 角色删除此前**只有桌宠调试面板一个入口**（IPC 早就有，UI 没了就够不着），
 * 面板删掉后这里是唯一入口。
 */
import './characters-game.css';
import type { CharacterMeta } from '../../../shared/ipc-types';
import { navigate } from '../workspace';
import { collectActions, confirmBox, esc, guard, toast } from './_studio-shared';

let root: HTMLElement | null = null;
let selectedId = '';
let refreshVersion = 0;
let unsubActivated: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  unsubActivated?.();
  // 别处（托盘/右键）切了角色 → 网格的「使用中」标记跟上
  unsubActivated = window.qbot.characters.onActivated(() => void refresh());
  await refresh();
}

export function unmount(): void {
  unsubActivated?.();
  unsubActivated = null;
  root = null;
  ++refreshVersion;
}

export async function onVisible(): Promise<void> {
  await refresh();
}

async function refresh(): Promise<void> {
  const host = root;
  if (!host) return;
  const version = ++refreshVersion;
  const [all, active] = await Promise.all([window.qbot.characters.list(), window.qbot.characters.getActive()]);
  if (root !== host || version !== refreshVersion) return;
  if (host.querySelector('.rename-input, [role="dialog"]')) return;
  const ready = all.filter(c => c.manifest);
  const selected = ready.find(c => c.dirId === selectedId) ?? ready.find(c => c.dirId === active?.dirId) ?? ready[0];
  selectedId = selected?.dirId ?? '';
  const portrait = (c: CharacterMeta) => c.coverImage
    ? `<img src="qbot-asset://${esc(c.dirId)}/${esc(c.coverImage)}" alt="" draggable="false" />`
    : '<span class="cg-missing">✧<small>暂无形象</small></span>';
  let html = `<div class="character-game"><div class="cg-sky" aria-hidden="true"></div>
    <header class="cg-header"><div><span class="cg-kicker">COMPANION ARCHIVE</span><h2>星光里的伙伴</h2></div><span class="cg-count">✦ &nbsp; ${ready.length} 位伙伴</span></header>
    <div class="cg-create"><button id="new-character" class="cg-button">＋ 结识新伙伴</button><button id="sticker-character" class="cg-link">从表情包创建 ↗</button></div>`;
  if (!selected) {
    html += '<div class="cg-empty"><span>✧</span><h3>为第一位伙伴，点亮一颗星</h3><p>带上一张角色图，从这里开始你们的故事。</p><button id="empty-new-character" class="cg-button">创建桌宠</button></div>';
  } else {
    const c = selected;
    const isActive = c.dirId === active?.dirId;
    const name = c.manifest.name || '未命名';
    const actions = collectActions(c.manifest);
    const done = actions.filter(a => a.status === 'done').length;
    const failed = actions.filter(a => a.status === 'failed').length;
    const sticker = 'stickerLibrary' in c.manifest;
    const preview = actions.find(a => a.id === 'idle' && a.status === 'done' && a.webm) ?? actions.find(a => a.status === 'done' && a.webm);
    const stageArt = preview ? `<video class="cg-video" muted loop playsinline preload="auto" src="qbot-asset://${esc(c.dirId)}/${esc(preview.webm!)}"></video>` : portrait(c);
    html += `<div class="cg-stage"><div class="cg-orbit"></div><div class="cg-orbit second"></div><span class="cg-star s1">✧</span><span class="cg-star s2">✦</span><span class="cg-star s3">✧</span><div class="cg-pedestal"></div><div class="cg-portrait">${stageArt}</div><span class="cg-stage-label">${preview ? '<button class="cg-link cg-play">▷ 看看它的动作</button>' : '每一颗星，都有自己的故事'}</span></div>
      <section class="cg-detail char-card" data-dir="${esc(c.dirId)}"><div class="cg-ribbon">${sticker ? '表情伙伴' : '桌面伙伴'} / ${String(ready.indexOf(c)+1).padStart(2,'0')}</div>
      <h3 class="char-name">${esc(name)}</h3><div class="cg-status">${isActive ? '● 正在桌面陪伴你' : '✧ 等待与你相见'}</div>
      <p class="cg-story">${esc(c.manifest.persona?.trim() || '故事从相遇开始。一起度过的每个日常，都会变成值得收藏的回忆。')}</p>
      <div class="cg-stats"><div><strong>${String(done).padStart(2,'0')}</strong><span>已学会的动作</span></div><div><strong>${sticker ? '☺' : '✦'}</strong><span>${sticker ? '表情收藏' : '日常陪伴'}</span></div></div>
      ${failed || c.hasUnfinishedJob ? `<p class="cg-warning">${failed ? `${failed} 个动作待重试` : '还有未完成的练习'}</p>` : ''}
      <div class="cg-actions"><button class="cg-button cg-primary use-char" data-dir="${esc(c.dirId)}" ${isActive ? 'disabled' : ''}>${isActive ? '正在陪伴' : '放到桌面'} <span>✦</span></button>
      <button class="cg-button edit-char" data-dir="${esc(c.dirId)}" data-sticker="${sticker}">${sticker ? '管理表情' : '编辑角色'} <span>↗</span></button></div>
      <div class="cg-tools"><button class="cg-link rename-char" data-dir="${esc(c.dirId)}">修改名字</button><button class="cg-link del-char" data-dir="${esc(c.dirId)}" data-name="${esc(name)}">删除角色</button></div></section>
      <footer class="cg-roster"><div class="cg-roster-label">选择伙伴 <span> / ${String(ready.length).padStart(2,'0')}</span></div><div class="cg-roster-scroll" role="group" aria-label="选择伙伴">${ready.map(item => `<button class="cg-choice" data-select="${esc(item.dirId)}" aria-pressed="${item.dirId === selectedId}" aria-label="选择${esc(item.manifest.name || '未命名')}"><div>${portrait(item)}</div><span>${esc(item.manifest.name || '未命名')}</span>${item.dirId === active?.dirId ? '<i aria-label="正在陪伴">●</i>' : ''}</button>`).join('')}</div></footer>`;
  }
  host.innerHTML = html + '</div>';
  bind(host);
  const video = host.querySelector<HTMLVideoElement>('.cg-video');
  const play = host.querySelector<HTMLButtonElement>('.cg-play');
  if (video) {
    video.muted = true;
    video.addEventListener('pause', () => { if (play) play.textContent = '▷ 看看它的动作'; });
    video.addEventListener('error', () => {
      video.replaceWith(...new DOMParser().parseFromString(selected ? portrait(selected) : '', 'text/html').body.childNodes);
      if (play) play.hidden = true;
    }, { once: true });
  }
  if (play && video) play.onclick = async () => {
    if (!video.paused) { video.pause(); play.textContent = '▷ 看看它的动作'; }
    else { try { await video.play(); play.textContent = 'Ⅱ 暂停动作'; } catch { toast(host, '暂时无法播放这个动作', 'warn'); } }
  };
  host.querySelectorAll<HTMLButtonElement>('[data-select]').forEach(button => {
    button.onclick = async () => {
      selectedId = button.dataset.select!;
      const scroll = host.querySelector('.cg-roster-scroll')?.scrollLeft ?? 0;
      await refresh();
      const roster = host.querySelector('.cg-roster-scroll');
      if (roster) roster.scrollLeft = scroll;
      [...host.querySelectorAll<HTMLButtonElement>('[data-select]')].find(b => b.dataset.select === selectedId)?.focus({preventScroll:true});
    };
  });
  host.querySelector('#empty-new-character')?.addEventListener('click', () => window.qbot.ui.openConsole('hatch'));
}
function bind(host: HTMLElement): void {
  host.querySelector('#sticker-character')?.addEventListener('click', () => navigate({ pane: 'sticker-create' }));
  host.querySelector('#new-character')?.addEventListener('click', () => window.qbot.ui.openConsole('hatch'));
  host.querySelectorAll<HTMLButtonElement>('.edit-char').forEach((button) => button.addEventListener('click', () => navigate({ pane: button.dataset.sticker==='true'?'sticker-create':'profile', dirId: button.dataset.dir! })));
  host.querySelectorAll<HTMLButtonElement>('.use-char').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await guard(host,btn,'正在迎接…',async()=>{await window.qbot.characters.activate(btn.dataset.dir!);await refresh();});
    });
  });

  host.querySelectorAll<HTMLButtonElement>('.rename-char').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.char-card')!;
      const nameEl = card.querySelector<HTMLElement>('.char-name')!;
      if (card.querySelector('.rename-input')) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'rename-input';
      input.maxLength = 24;
      input.value = nameEl.textContent?.trim() ?? '';
      let finished = false;
      const commit = async (): Promise<void> => {
        if (finished) return;
        finished = true;
        const v = input.value.trim();
        input.remove();
        try{if(v){await window.qbot.characters.rename(btn.dataset.dir!,v);toast(host,`已改名为「${v}」`);}await refresh();}catch(e){toast(host,String(e),'warn');}
      };
      input.addEventListener('keydown', (e) => {
        if(e.isComposing)return;
        if (e.key === 'Enter') void commit();
        else if (e.key === 'Escape') { finished = true; input.remove(); }
      });
      input.addEventListener('blur', () => void commit());
      nameEl.after(input);
      input.focus();
      input.select();
    });
  });

  host.querySelectorAll<HTMLButtonElement>('.del-char').forEach((btn) => {
    btn.addEventListener('click', () => {
      void (async () => {
        const name = btn.dataset.name!;
        const ok = await confirmBox(
          host,
          `删除角色「${name}」？\n\n资产包会从磁盘移除，此操作不可恢复。`,
        );
        if (!ok) return;
        await guard(host,btn,'整理中…',async()=>{await window.qbot.characters.delete(btn.dataset.dir!);toast(host,`已删除「${name}」`);});
        await refresh();
      })();
    });
  });
}

/** 供别的 pane 复用的类型出口（避免各自 import CharacterMeta） */
export type { CharacterMeta };
