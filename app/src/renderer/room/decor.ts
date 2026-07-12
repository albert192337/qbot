/** 装饰摆放纯逻辑：zone 判定 / 增删移缩（DOM 驱动在 decor-editor.ts） */
import type { DecorPlacement } from '../../shared/ipc-types';
import { pointInPolygon, type Point } from './geometry';
import type { RoomSpec } from './rooms/types';

export const SCALE_MIN = 0.3;
export const SCALE_MAX = 3;

export function zoneFor(pos: Point, spec: RoomSpec): DecorPlacement['zone'] {
  if (pointInPolygon(pos, spec.wallL)) return 'wallL';
  if (pointInPolygon(pos, spec.wallR)) return 'wallR';
  return 'free';
}

/** 摆放的 CSS transform（中心定位 → 墙面仿射 → 缩放） */
export function placementTransform(p: DecorPlacement, spec: RoomSpec): string {
  const m =
    p.zone === 'wallL' ? spec.wallMatrixL : p.zone === 'wallR' ? spec.wallMatrixR : null;
  const wall = m ? ` matrix(${m[0]}, ${m[1]}, ${m[2]}, ${m[3]}, 0, 0)` : '';
  return `translate(${p.x}px, ${p.y}px)${wall} scale(${p.scale}) translate(-50%, -50%)`;
}

export function addPlacement(
  list: DecorPlacement[],
  stickerId: string,
  pos: Point,
  spec: RoomSpec,
  id: string = crypto.randomUUID(),
): DecorPlacement[] {
  return [
    ...list,
    { id, stickerId, x: pos.x, y: pos.y, scale: 1, zone: zoneFor(pos, spec) },
  ];
}

/** 移动会实时重判 zone（拖过墙界自动切换透视） */
export function movePlacement(
  list: DecorPlacement[],
  id: string,
  pos: Point,
  spec: RoomSpec,
): DecorPlacement[] {
  return list.map((p) =>
    p.id === id ? { ...p, x: pos.x, y: pos.y, zone: zoneFor(pos, spec) } : p,
  );
}

export function scalePlacement(list: DecorPlacement[], id: string, scale: number): DecorPlacement[] {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
  return list.map((p) => (p.id === id ? { ...p, scale: clamped } : p));
}

export function removePlacement(list: DecorPlacement[], id: string): DecorPlacement[] {
  return list.filter((p) => p.id !== id);
}

/** 加载校验：未知贴纸（贴纸包升级删除素材）静默丢弃，字段异常整条丢弃 */
export function sanitizePlacements(
  raw: unknown,
  knownStickerIds: ReadonlySet<string>,
): DecorPlacement[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is DecorPlacement =>
      typeof p === 'object' &&
      p !== null &&
      typeof p.id === 'string' &&
      typeof p.stickerId === 'string' &&
      knownStickerIds.has(p.stickerId) &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      Number.isFinite(p.scale) &&
      (p.zone === 'wallL' || p.zone === 'wallR' || p.zone === 'free'),
  );
}
