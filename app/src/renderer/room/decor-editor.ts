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

  private bindThumbDrag(thumb: HTMLElement, stickerId: string, defaultW: number): void {
    let ghost: HTMLImageElement | null = null;
    thumb.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0) return;
      thumb.setPointerCapture(e.pointerId);
      ghost = document.createElement('img');
      ghost.src = DECOR_BY_ID.get(stickerId)!.image;
      ghost.className = 'decor-ghost';
      ghost.style.width = `${defaultW}px`; // 视觉近似即可，落点按房间坐标计算
      document.body.appendChild(ghost);
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    });
    thumb.addEventListener('pointermove', (e) => {
      if (!ghost) return;
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    });
    thumb.addEventListener('pointerup', (e) => {
      if (!ghost) return;
      ghost.remove();
      ghost = null;
      thumb.releasePointerCapture(e.pointerId);
      const pos = this.hooks.toRoom(e.clientX, e.clientY);
      if (!pointInPolygon(pos, this.hooks.spec.outline)) return; // 丢在房间外 = 取消
      this.placements = addPlacement(this.placements, stickerId, pos, this.hooks.spec);
      this.select(this.placements[this.placements.length - 1].id);
      this.render();
    });
  }

  /** 装饰选中与拖动（事件挂 layer，编辑态 CSS 才放开 pointer-events） */
  private bindLayerDrag(): void {
    let draggingId: string | null = null;
    this.hooks.layer.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0) return;
      const id = (e.target as HTMLElement).dataset?.id;
      if (!id) return;
      e.stopPropagation(); // 别触发窗口拖动
      draggingId = id;
      this.select(id);
      this.hooks.layer.setPointerCapture(e.pointerId);
    });
    this.hooks.layer.addEventListener('pointermove', (e) => {
      if (!draggingId) return;
      this.placements = movePlacement(
        this.placements,
        draggingId,
        this.hooks.toRoom(e.clientX, e.clientY),
        this.hooks.spec,
      );
      this.render();
    });
    this.hooks.layer.addEventListener('pointerup', (e) => {
      if (!draggingId) return;
      draggingId = null;
      this.hooks.layer.releasePointerCapture(e.pointerId);
    });
  }

  /** 右下手柄：拖动改缩放（指针到贴纸中心距离比例） */
  private bindScaleHandle(): void {
    let base: { dist: number; scale: number } | null = null;
    const center = (): Point => {
      const p = this.placements.find((x) => x.id === this.selectedId)!;
      return { x: p.x, y: p.y };
    };
    this.selHandle.addEventListener('pointerdown', (e) => {
      if (!this.selectedId || e.button !== 0) return;
      e.stopPropagation();
      const p = this.placements.find((x) => x.id === this.selectedId);
      if (!p) return;
      const c = center();
      const pos = this.hooks.toRoom(e.clientX, e.clientY);
      base = { dist: Math.max(8, Math.hypot(pos.x - c.x, pos.y - c.y)), scale: p.scale };
      this.selHandle.setPointerCapture(e.pointerId);
    });
    this.selHandle.addEventListener('pointermove', (e) => {
      if (!base || !this.selectedId) return;
      const c = center();
      const pos = this.hooks.toRoom(e.clientX, e.clientY);
      const dist = Math.hypot(pos.x - c.x, pos.y - c.y);
      this.placements = scalePlacement(
        this.placements,
        this.selectedId,
        base.scale * (dist / base.dist),
      );
      this.render();
    });
    this.selHandle.addEventListener('pointerup', (e) => {
      if (!base) return;
      base = null;
      this.selHandle.releasePointerCapture(e.pointerId);
    });
  }
}
