/**
 * 装饰编辑态 DOM 驱动：装饰栏拖入、选中移动/缩放/删除、完成保存。
 * 纯逻辑（zone/增删移缩）在 decor.ts，本模块只做事件与渲染。
 */
import type { DecorPlacement } from '../../shared/ipc-types';
import { DECOR_BY_ID, DECOR_PACK } from './decor-pack';
import {
  addPlacement,
  movePlacement,
  placementTransform,
  removePlacement,
  scalePlacement,
} from './decor';
import { pointInPolygon, type Point } from './geometry';
import type { RoomSpec } from './rooms/types';

export interface DecorEditorHooks {
  stage: HTMLElement;
  layer: HTMLElement;
  bar: HTMLElement;
  spec: RoomSpec;
  toRoom(clientX: number, clientY: number): Point;
  /** 进入编辑态：暂停漫游/发言/窗口拖动 */
  onEnter(): void;
  /** 退出编辑态：持久化 + 恢复 */
  onExit(placements: DecorPlacement[]): void;
}

export class DecorEditor {
  active = false;
  private placements: DecorPlacement[] = [];
  private selectedId: string | null = null;
  private sel: HTMLElement;
  private selDelete: HTMLElement;
  private selHandle: HTMLElement;
  private barBuilt = false;

  constructor(private hooks: DecorEditorHooks) {
    // 选中框 + 删除钮 + 缩放手柄（stage 坐标系内，随 --fit 缩放）
    this.sel = document.createElement('div');
    this.sel.id = 'decorSel';
    this.selDelete = document.createElement('div');
    this.selDelete.className = 'decor-sel-delete';
    this.selDelete.textContent = '×';
    this.selHandle = document.createElement('div');
    this.selHandle.className = 'decor-sel-handle';
    this.sel.append(this.selDelete, this.selHandle);
    hooks.stage.appendChild(this.sel);

    this.selDelete.addEventListener('click', () => {
      if (!this.selectedId) return;
      this.placements = removePlacement(this.placements, this.selectedId);
      this.select(null);
      this.render();
    });
    this.bindScaleHandle();
    this.bindLayerDrag();
  }

  setPlacements(placements: DecorPlacement[]): void {
    this.placements = placements;
    this.render();
  }

  placementsSnapshot(): DecorPlacement[] {
    return this.placements;
  }

  enter(current: DecorPlacement[]): void {
    if (this.active) return;
    this.active = true;
    this.placements = current;
    this.buildBar();
    document.body.classList.add('editing');
    this.hooks.onEnter();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.select(null);
    document.body.classList.remove('editing');
    this.hooks.onExit(this.placements);
  }

  /** 全量重渲染（装饰数量级小，不做增量） */
  render(): void {
    const { layer, spec } = this.hooks;
    layer.replaceChildren();
    for (const p of this.placements) {
      const sticker = DECOR_BY_ID.get(p.stickerId);
      if (!sticker) continue;
      const img = document.createElement('img');
      img.src = sticker.image;
      img.className = 'decor-item';
      img.dataset.id = p.id;
      img.style.width = `${sticker.defaultW}px`;
      img.style.transform = placementTransform(p, spec);
      layer.appendChild(img);
    }
    this.updateSelBox();
  }

  private select(id: string | null): void {
    this.selectedId = id;
    this.updateSelBox();
  }

  /** 选中框贴着装饰的屏幕包围盒（换算回 stage 坐标，天然适配墙面斜切） */
  private updateSelBox(): void {
    if (!this.selectedId) {
      this.sel.style.display = 'none';
      return;
    }
    const img = this.hooks.layer.querySelector<HTMLElement>(
      `[data-id="${this.selectedId}"]`,
    );
    if (!img) {
      this.sel.style.display = 'none';
      return;
    }
    const stageRect = this.hooks.stage.getBoundingClientRect();
    const fit = stageRect.width / this.hooks.spec.width;
    const r = img.getBoundingClientRect();
    this.sel.style.display = 'block';
    this.sel.style.left = `${(r.left - stageRect.left) / fit}px`;
    this.sel.style.top = `${(r.top - stageRect.top) / fit}px`;
    this.sel.style.width = `${r.width / fit}px`;
    this.sel.style.height = `${r.height / fit}px`;
  }

  /** 装饰栏：贴纸缩略图按住拖入房间 */
  private buildBar(): void {
    if (this.barBuilt) return;
    this.barBuilt = true;
    const { bar } = this.hooks;
    for (const sticker of DECOR_PACK) {
      const thumb = document.createElement('div');
      thumb.className = 'decor-thumb';
      const img = document.createElement('img');
      img.src = sticker.image;
      img.draggable = false;
      const label = document.createElement('span');
      label.textContent = sticker.name;
      thumb.append(img, label);
      bar.appendChild(thumb);
      this.bindThumbDrag(thumb, sticker.id, sticker.defaultW);
    }
    const done = document.createElement('button');
    done.id = 'decorDone';
    done.textContent = '完成';
    done.addEventListener('click', () => this.exit());
    bar.appendChild(done);
  }

  /** 拖拽通用骨架：down 后挂 window 级 move/up。不依赖 setPointerCapture ——
   * 指针快速移出源元素或走 CDP 合成事件时 capture 不可靠。 */
  private static drag(
    onMove: (e: PointerEvent) => void,
    onUp: (e: PointerEvent) => void,
  ): void {
    const move = (e: PointerEvent) => onMove(e);
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onUp(e);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  private bindThumbDrag(thumb: HTMLElement, stickerId: string, defaultW: number): void {
    thumb.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0) return;
      e.preventDefault();
      const ghost = document.createElement('img');
      ghost.src = DECOR_BY_ID.get(stickerId)!.image;
      ghost.className = 'decor-ghost';
      ghost.style.width = `${defaultW}px`; // 视觉近似即可，落点按房间坐标计算
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      document.body.appendChild(ghost);
      DecorEditor.drag(
        (ev) => {
          ghost.style.left = `${ev.clientX}px`;
          ghost.style.top = `${ev.clientY}px`;
        },
        (ev) => {
          ghost.remove();
          const pos = this.hooks.toRoom(ev.clientX, ev.clientY);
          if (!pointInPolygon(pos, this.hooks.spec.outline)) return; // 丢在房间外 = 取消
          this.placements = addPlacement(this.placements, stickerId, pos, this.hooks.spec);
          this.select(this.placements[this.placements.length - 1].id);
          this.render();
        },
      );
    });
  }

  /** 装饰选中与拖动（事件挂 layer，编辑态 CSS 才放开 pointer-events） */
  private bindLayerDrag(): void {
    this.hooks.layer.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0) return;
      const id = (e.target as HTMLElement).dataset?.id;
      if (!id) return;
      e.stopPropagation(); // 别触发窗口拖动
      this.select(id);
      DecorEditor.drag(
        (ev) => {
          this.placements = movePlacement(
            this.placements,
            id,
            this.hooks.toRoom(ev.clientX, ev.clientY),
            this.hooks.spec,
          );
          this.render();
        },
        () => {},
      );
    });
  }

  /** 右下手柄：拖动改缩放（指针到贴纸中心距离比例） */
  private bindScaleHandle(): void {
    this.selHandle.addEventListener('pointerdown', (e) => {
      if (!this.selectedId || e.button !== 0) return;
      e.stopPropagation();
      const id = this.selectedId;
      const p = this.placements.find((x) => x.id === id);
      if (!p) return;
      const down = this.hooks.toRoom(e.clientX, e.clientY);
      const base = {
        dist: Math.max(8, Math.hypot(down.x - p.x, down.y - p.y)),
        scale: p.scale,
      };
      DecorEditor.drag(
        (ev) => {
          const cur = this.placements.find((x) => x.id === id);
          if (!cur) return;
          const pos = this.hooks.toRoom(ev.clientX, ev.clientY);
          const dist = Math.hypot(pos.x - cur.x, pos.y - cur.y);
          this.placements = scalePlacement(this.placements, id, base.scale * (dist / base.dist));
          this.render();
        },
        () => {},
      );
    });
  }
}
