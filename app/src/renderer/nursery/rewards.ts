import type { Progress } from '../../shared/ipc-types';
import {
  POINTS_PER_BOX,
  CRAFT_COST,
  IDLE_MS_PER_BOX,
  TIER_LABEL,
  TIER_ORDER,
  idsOfTier,
  nextTier,
  type FurnitureTier,
} from '../../shared/furniture';
import { DECOR_BY_ID } from '../room/decor-pack';
import { confirmBox } from '../console/panes/_studio-shared';
import { el, button, image } from './dom';
import { errorMessage } from './model';
let root: HTMLElement,
  progress: Progress | null = null,
  busy = false,
  off: (() => void) | undefined;
const result = el('div', undefined, 'gift-reveal');
result.setAttribute('role', 'status');
export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  off = window.qbot.progress.onChanged((p) => {
    progress = p;
    render();
  });
  await onVisible();
}
export async function onVisible(): Promise<void> {
  progress = await window.qbot.progress.get();
  render();
}
export function unmount(): void {
  off?.();
}
function render(): void {
  if (!progress) return;
  const p = progress;
  const stats = el('div', undefined, 'gift-stats');
  stats.append(el('b', `${p.boxes} 份礼物`), el('b', `${p.points} 点陪伴`));
  const time = el('progress');
  time.max = IDLE_MS_PER_BOX;
  time.value = p.idleMs;
  time.setAttribute('aria-label', '下一份陪伴礼物进度');
  const open = button(
    `拆一份礼物 · 1 箱 + ${POINTS_PER_BOX} 点`,
    () => void mutate(),
    'primary',
  );
  open.disabled = busy || p.boxes < 1 || p.points < POINTS_PER_BOX;
  root.replaceChildren(
    stats,
    el(
      'p',
      '每陪伴 15 分钟，收到一份箱子和 500 点。满仓时暂停积累，工作联动还会带来额外点数。',
    ),
    time,
    el('p', `这一份已经等待 ${Math.floor(p.idleMs / 60000)} 分钟。`, 'mini'),
    open,
    result,
  );
  for (const tier of TIER_ORDER) {
    const ids = idsOfTier(tier);
    const count = ids.reduce((sum, id) => sum + (p.inventory[id] ?? 0), 0);
    const section = el('section', undefined, 'collection-shelf');
    const head = el('div', undefined, 'collection-head');
    head.append(el('h3', `${TIER_LABEL[tier]} · ${count} 件`));
    const up = nextTier(tier);
    if (up) {
      const craft = button(
        `${CRAFT_COST} 件合成 1 件${TIER_LABEL[up]}`,
        () => void mutate(tier),
        'secondary',
      );
      craft.disabled = busy || count < CRAFT_COST;
      head.append(craft);
    }
    const shelf = el('div', undefined, 'collection-items');
    for (const id of ids) {
      const item = DECOR_BY_ID.get(id);
      if (!item || !p.inventory[id]) continue;
      const cell = el('div');
      cell.append(
        image(item.image, item.name),
        el('span', `${item.name} × ${p.inventory[id]}`),
      );
      shelf.append(cell);
    }
    if (!shelf.childElementCount)
      shelf.append(el('p', '空着的位置，留给下一次惊喜。'));
    section.append(head, shelf);
    root.append(section);
  }
}
async function mutate(tier?: FurnitureTier): Promise<void> {
  if (busy) return;
  busy = true;
  render();
  try {
    if (
      tier &&
      !(await confirmBox(
        root,
        `用 ${CRAFT_COST} 件${TIER_LABEL[tier]}家具合成？系统优先消耗数量最多的种类，尽量各留一件；已有摆放可能受库存减少影响。`,
      ))
    )
      return;
    const r = tier
      ? await window.qbot.progress.craft(tier)
      : await window.qbot.progress.openBox();
    if (!r.ok) {
      result.replaceChildren(el('p', r.error, 'error-text'));
      return;
    }
    progress = r.progress;
    const item = DECOR_BY_ID.get(r.stickerId);
    result.replaceChildren();
    if (item) result.append(image(item.image, item.name));
    result.append(
      el('h3', `收到了「${item?.name ?? r.stickerId}」`),
      el('p', `${TIER_LABEL[r.tier]} · 已放进收藏，可以去布置小屋了。`),
    );
    if ('consumed' in r)
      result.append(
        el(
          'p',
          `使用了：${Object.entries(r.consumed as Record<string, number>)
            .map(([id, n]) => `${DECOR_BY_ID.get(id)?.name ?? id} × ${n}`)
            .join('、')}`,
          'mini',
        ),
      );
    window.dispatchEvent(new Event('house:reward'));
    result.scrollIntoView({ block: 'nearest' });
  } catch (e) {
    result.replaceChildren(el('p', errorMessage(e), 'error-text'));
  } finally {
    busy = false;
    render();
  }
}
