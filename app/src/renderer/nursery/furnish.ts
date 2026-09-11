import type { DecorPlacement } from '../../shared/ipc-types';
import { DECOR_PACK, DECOR_BY_ID } from '../room/decor-pack';
import { DEFAULT_ROOM as spec } from '../room/rooms/default';
import {
  addPlacement,
  movePlacement,
  removePlacement,
  scalePlacement,
  placementTransform,
  depthZ,
} from '../room/decor';
import { el, button, image } from './dom';
import { errorMessage } from './model';
let root: HTMLElement,
  placements: DecorPlacement[] = [],
  inventory: Record<string, number> = {},
  selected: string | null = null,
  baseline = '',
  busy = false;
let board: HTMLElement,
  layer: HTMLElement,
  controls: HTMLElement,
  shelf: HTMLElement,
  status: HTMLElement;
let dragging: string | null = null;
export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  root.classList.add('furnish-page');
  board = el('div', undefined, 'furnish-board');
  board.setAttribute('aria-label', '房间布置画面');
  layer = el('div', undefined, 'furnish-layer');
  const bg = image(spec.background, '我的小屋', 'furnish-background');
  bg.style.clipPath = `polygon(${spec.outline.map(([x, y]) => `${(x / spec.width) * 100}% ${(y / spec.height) * 100}%`).join(',')})`;
  board.append(bg, layer);
  controls = el('div', undefined, 'furnish-controls');
  shelf = el('div', undefined, 'furnish-shelf');
  status = el('p', undefined, 'mini');
  status.setAttribute('role', 'status');
  const save = button('保存布置', () => void saveAll(), 'primary');
  save.id = 'save-furnish';
  const tools = el('div', undefined, 'furnish-tools');
  tools.append(controls, save, status, shelf);
  root.append(
    button('试住奶油小屋', () => window.qbot.room.openCozyPreview()),
    el(
      'p',
      '从收藏架点选家具，拖到喜欢的位置。方向键可以微调；别忘了保存布置。',
    ),
    board,
    tools,
  );
  board.addEventListener('pointermove', (e) => {
    if (!dragging || busy) return;
    const rect = board.getBoundingClientRect();
    const pos = {
      x: Math.max(
        0,
        Math.min(1024, ((e.clientX - rect.left) / rect.width) * 1024),
      ),
      y: Math.max(
        0,
        Math.min(1024, ((e.clientY - rect.top) / rect.height) * 1024),
      ),
    };
    const p = placements.find((p) => p.id === dragging);
    if (p) {
      placements = movePlacement(
        placements,
        p.id,
        pos,
        spec,
        DECOR_BY_ID.get(p.stickerId)?.anchor,
      );
      renderLayer();
    }
  });
  const release = () => {
    dragging = null;
  };
  board.addEventListener('pointerup', release);
  board.addEventListener('pointercancel', release);
  board.addEventListener('lostpointercapture', release);
  await load();
}
async function load(): Promise<void> {
  const [saved, p] = await Promise.all([
    window.qbot.decor.get(spec.name),
    window.qbot.progress.get(),
  ]);
  placements = saved;
  inventory = p.inventory;
  baseline = JSON.stringify(saved);
  selected = null;
  render();
}
export function hasUnsavedChanges(): boolean {
  return baseline !== JSON.stringify(placements);
}
export async function onVisible(): Promise<void> {
  if (!hasUnsavedChanges()) await load();
  else {
    inventory = (await window.qbot.progress.get()).inventory;
    render();
  }
}
export async function discardChanges(): Promise<void> {
  await load();
}
function renderLayer(): void {
  layer.replaceChildren();
  for (const p of placements) {
    const item = DECOR_BY_ID.get(p.stickerId);
    if (!item) continue;
    const b = button(
      '',
      () => {
        selected = p.id;
        render();
      },
      'placed-furniture',
    );
    b.setAttribute('aria-label', `${item.name}，方向键移动`);
    b.setAttribute('aria-pressed', String(selected === p.id));
    b.disabled = busy;
    b.style.width = `${item.defaultW}px`;
    b.style.height = `${item.defaultW * item.aspect}px`;
    b.style.transform = placementTransform(p, spec);
    b.style.zIndex = String(depthZ(p.y, spec, item.anchor));
    b.append(image(item.image, ''));
    b.addEventListener('pointerdown', (e) => {
      if (busy) return;
      e.preventDefault();
      selected = p.id;
      dragging = p.id;
      board.setPointerCapture(e.pointerId);
      renderControls();
      layer
        .querySelectorAll('.placed-furniture')
        .forEach((n) => n.setAttribute('aria-pressed', String(n === b)));
    });
    b.addEventListener('keydown', (e) => {
      const delta = (
        {
          ArrowLeft: [-10, 0],
          ArrowRight: [10, 0],
          ArrowUp: [0, -10],
          ArrowDown: [0, 10],
        } as Record<string, number[]>
      )[e.key];
      if (!delta || busy) return;
      e.preventDefault();
      selected = p.id;
      placements = movePlacement(
        placements,
        p.id,
        {
          x: Math.max(0, Math.min(1024, p.x + delta[0])),
          y: Math.max(0, Math.min(1024, p.y + delta[1])),
        },
        spec,
        item.anchor,
      );
      render();
      layer.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus();
    });
    layer.append(b);
  }
}
function renderControls(): void {
  controls.replaceChildren();
  const p = placements.find((p) => p.id === selected);
  if (!p) {
    controls.append(el('p', '点选一件家具开始摆放。'));
    return;
  }
  controls.append(el('b', DECOR_BY_ID.get(p.stickerId)?.name ?? p.stickerId));
  const scale = el('input');
  scale.type = 'range';
  scale.min = '.3';
  scale.max = '3';
  scale.step = '.1';
  scale.value = String(p.scale);
  scale.disabled = busy;
  scale.setAttribute('aria-label', '家具大小');
  scale.oninput = () => {
    placements = scalePlacement(placements, p.id, Number(scale.value));
    renderLayer();
  };
  const remove = button(
    '收回收藏',
    () => {
      placements = removePlacement(placements, p.id);
      selected = null;
      render();
    },
    'secondary',
  );
  remove.disabled = busy;
  controls.append(scale, remove);
}
function render(): void {
  renderLayer();
  renderControls();
  shelf.replaceChildren();
  for (const item of DECOR_PACK) {
    const used = placements.filter((p) => p.stickerId === item.id).length;
    const left = (inventory[item.id] ?? 0) - used;
    if (!(inventory[item.id] > 0)) continue;
    const b = button(
      '',
      () => {
        placements = addPlacement(
          placements,
          item.id,
          { x: 512, y: item.anchor === 'floor' ? 690 : 360 },
          spec,
          undefined,
          item.anchor,
        );
        selected = placements.at(-1)!.id;
        render();
      },
      'furniture-choice',
    );
    b.disabled = busy || left <= 0;
    b.append(
      image(item.image, item.name),
      el('small', `${item.name} · ${Math.max(0, left)} 件可摆`),
    );
    shelf.append(b);
  }
  if (!shelf.childElementCount)
    shelf.append(el('p', '收藏架还是空的。拆开陪伴礼物，就能收到家具。'));
  root.querySelector<HTMLButtonElement>('#save-furnish')!.disabled = busy;
}
async function saveAll(): Promise<void> {
  if (busy) return;
  busy = true;
  dragging = null;
  render();
  try {
    await window.qbot.decor.set(spec.name, placements);
    baseline = JSON.stringify(placements);
    status.textContent = '布置已保存，桌面小屋也会同步更新。';
  } catch (e) {
    status.textContent = errorMessage(e);
  } finally {
    busy = false;
    render();
  }
}
