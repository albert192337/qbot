import type { CharacterMeta } from '../../shared/ipc-types';
import type { GardenCommand, GardenState } from '../../shared/garden';
import { CHARACTER_UNLOCKS, CHARACTER_XP, characterLevel, currentGrowth, FOOD_ICONS, wishLabel } from '../../shared/garden-life';
import { FRUIT_DRAG_TYPE, plotsAtLevel, unlockedPlots } from '../../shared/garden-progression';
import './character-header.css';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => {
  const node = document.createElement(tag); node.textContent = text; node.className = cls; return node;
};
function button(text: string, label: string, action: () => void, disabled = false) {
  const b = el('button', text); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.onclick = action; b.disabled = disabled; return b;
}
function portrait(meta?: CharacterMeta) {
  const frame = el('span', '', 'character-portrait');
  const file = meta ? '__portrait.png' : undefined;
  if (meta && file) {
    const img = el('img'); img.src = `qbot-asset://${meta.dirId}/${file}`; img.alt = meta.manifest.name; img.draggable = false;
    img.onerror = () => { frame.textContent = meta.manifest.name.slice(0, 1); }; frame.append(img);
  } else frame.textContent = meta?.manifest.name.slice(0, 1) ?? '？';
  return frame;
}
function dialog(title: string) {
  document.querySelector('.character-dialog')?.remove();
  const d = el('dialog', '', 'character-dialog'); const head = el('div', '', 'character-dialog-title');
  head.append(el('h2', title), button('×', '关闭', () => d.close())); d.append(head);
  d.addEventListener('close', () => d.remove()); d.onclick = e => { if (e.target === d) { const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); } };
  document.body.append(d); d.showModal(); return d;
}
type Context = {
  state: GardenState; characters: CharacterMeta[]; busy: boolean;
  act: (command: GardenCommand) => Promise<void>;
  switchActor: (id: string) => Promise<void>;
  feed: (id: string, actor: string | undefined) => void;
  notice: (message: string) => void;
};
export function renderCharacterHeader(c: Context): HTMLElement {
  const { state } = c, growth = currentGrowth(state), xp = growth?.xp ?? 0, lv = characterLevel(xp);
  const meta = c.characters.find(m => m.dirId === state.activeActor);
  const header = el('header', '', 'character-header'); header.setAttribute('aria-label', '角色与今日心愿');
  const identity = el('div', '', 'character-identity'); const face = button('', '把背包果实拖到这里投喂', () => c.notice('把背包里的果实拖到角色或今日心愿上，也可点击果实的投喂按钮。'), !state.activeActor);
  face.className = 'character-feed-target'; face.append(portrait(meta));
  const summary = el('div', '', 'character-summary'), name = el('div', '', 'character-name');
  name.append(el('strong', meta?.manifest.name ?? (state.activeActor ? '当前角色' : '选择角色')), el('span', `Lv.${lv}`, 'character-level'));
  const actions = el('span', '', 'character-small-actions');
  actions.append(button('⇄', '切换角色', () => {
    const d = dialog('选择陪伴的角色');
    if (!c.characters.length) d.append(el('p', '角色列表暂不可用，请关闭后重新打开花园。'));
    for (const item of c.characters) {
      const g = state.life?.characters[item.dirId], level = characterLevel(g?.xp ?? 0);
      const row = button('', `切换到${item.manifest.name}`, () => {
        d.querySelectorAll('button').forEach(b => b.disabled = true);
        void c.switchActor(item.dirId).then(() => d.close()).catch(e => { c.notice(String(e)); d.querySelectorAll('button').forEach(b => b.disabled = false); });
      }, c.busy || item.dirId === state.activeActor);
      row.className = 'character-choice'; row.append(portrait(item), el('strong', item.manifest.name), el('span', `Lv.${level} · ${g?.xp ?? 0} 经验${item.dirId === state.activeActor ? ' · 当前' : ''}`)); d.append(row);
    }
  }, c.busy), button('↗', '查看等级奖励', () => {
    const d = dialog(`${meta?.manifest.name ?? '角色'}的成长`);
    d.append(el('p', `Lv.${lv} · 累计 ${xp} 经验`, 'muted'));
    const list = el('ol', '', 'level-rewards');
    for (let level = 1; level <= CHARACTER_XP.length; level++) {
      const item = el('li', '', level <= lv ? 'achieved' : '');
      const rewards = [...(level <= 5 ? [`${plotsAtLevel(level)} 块土地${level === 5 ? '（全部解锁）' : ''}`] : []), ...CHARACTER_UNLOCKS.filter(u => u.level === level).map(u => u.name)];
      item.append(el('strong', `Lv.${level}`), el('span', rewards.join(' · ') || '继续积累成长'), el('small', `${CHARACTER_XP[level - 1]} 经验${level <= lv ? ' · 已达到' : ''}`)); list.append(item);
    }
    d.append(list);
  })); name.append(actions);
  const bar = el('progress'); bar.setAttribute('aria-label', '角色升级经验');
  bar.max = lv < CHARACTER_XP.length ? CHARACTER_XP[lv] - CHARACTER_XP[lv - 1] : 1;
  bar.value = lv < CHARACTER_XP.length ? xp - CHARACTER_XP[lv - 1] : 1;
  summary.append(name, bar, el('small', `${lv < CHARACTER_XP.length ? `${bar.value} / ${bar.max} 经验` : '已满级'} · ${unlockedPlots(state)} 块土地`, 'character-experience'));
  identity.append(face, summary);
  const wishes = el('section', '', 'header-wishes'); wishes.setAttribute('aria-label', '今日心愿');
  const label = el('div', '', 'wish-heading'); label.append(el('strong', '今日心愿'), el('small', '拖来果实，喂给它')); wishes.append(label);
  const list = el('div', '', 'header-wish-list');
  for (const wish of growth?.wishes ?? []) {
    const row = el('div', '', `header-wish${wish.done ? ' completed' : ''}`); row.dataset.wish = wish.id;
    row.append(el('span', FOOD_ICONS[wish.species], 'wish-icon'), el('span', wishLabel(wish), 'wish-name'), el('small', wish.done ? '已完成' : `+${wish.xp} 经验`));
    if (!wish.done) row.append(button('↻', `更换心愿：${wishLabel(wish)}`, () => void c.act({type: 'rerollWish', wish: wish.id}), c.busy || !!growth?.rerolled));
    list.append(row);
  }
  if (!growth) list.append(el('small', '选择一个角色，看看它今天想吃什么。'));
  wishes.append(list);
  const wallet = el('div', '', 'character-wallet'); wallet.append(el('small', '花园币'), el('strong', `◉ ${state.coins.toLocaleString()}`));
  header.append(identity, wishes, wallet);
  header.ondragover = e => { if (!e.dataTransfer?.types.includes(FRUIT_DRAG_TYPE) || c.busy) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; header.classList.add('feeding-over'); };
  header.ondragleave = e => { if (!(e.relatedTarget instanceof Node) || !header.contains(e.relatedTarget)) header.classList.remove('feeding-over'); };
  header.ondrop = e => {
    header.classList.remove('feeding-over'); if (!e.dataTransfer?.types.includes(FRUIT_DRAG_TYPE)) return; e.preventDefault();
    try { const data = JSON.parse(e.dataTransfer.getData(FRUIT_DRAG_TYPE)); if (typeof data.id === 'string' && data.actor === state.activeActor) c.feed(data.id, state.activeActor); else c.notice('角色已切换，请重新拖动果实。'); } catch { c.notice('请从收获篮拖动一颗果实。'); }
  };
  return header;
}
