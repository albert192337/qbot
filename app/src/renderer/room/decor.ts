/** 装饰摆放纯逻辑：zone 判定 / 增删移缩（DOM 驱动在 decor-editor.ts） */
import type { DecorPlacement } from '../../shared/ipc-types';
import { pointInPolygon, type Point } from './geometry';
import type { RoomSpec } from './rooms/types';

export const SCALE_MIN = 0.3;
export const SCALE_MAX = 3;

/** 贴纸锚定方式：wall = 贴墙（吃墙面仿射），floor = 站在地面（不变形，参与深度遮挡） */
export type DecorAnchor = 'wall' | 'floor';

/**
 * zone 判定。floor 家具恒为 free —— 它站在地上，不该因为落点在墙区就被切变。
 * wall 贴纸才按落点决定贴哪面墙。
 */
export function zoneFor(
  pos: Point,
  spec: RoomSpec,
  anchor: DecorAnchor = 'wall',
): DecorPlacement['zone'] {
  if (anchor === 'floor') return 'free';
  if (pointInPolygon(pos, spec.wallL)) return 'wallL';
  if (pointInPolygon(pos, spec.wallR)) return 'wallR';
  return 'free';
}

/** 墙面贴纸的深度层级：恒在地面物件与角色之后 */
export const Z_WALL = 10;
/** 地面物件/角色的深度层级基准 */
export const Z_FLOOR_BASE = 100;

/**
 * 等轴深度层级：脚点 y 越大＝越靠近观众＝层级越高。
 * 地面家具与角色**共用同一刻度**，这样角色走到桌子前面就挡住桌子、
 * 走到后面就被桌子挡住 —— 参考图那种远近关系。
 */
export function depthZ(y: number, spec: RoomSpec, anchor: DecorAnchor = 'floor'): number {
  if (anchor === 'wall') return Z_WALL;
  const t = Math.max(0, Math.min(1, y / spec.height));
  return Z_FLOOR_BASE + Math.round(t * 800);
}

/** 摆放的 CSS transform（中心定位 → 墙面仿射 → 缩放） */
export function placementTransform(p: DecorPlacement, spec: RoomSpec): string {
  const m =
    p.zone === 'wallL' ? spec.wallMatrixL : p.zone === 'wallR' ? spec.wallMatrixR : null;
  const wall = m ? ` matrix(${m[0]}, ${m[1]}, ${m[2]}, ${m[3]}, 0, 0)` : '';
  return `translate(${p.x}px, ${p.y}px)${wall} scale(${p.scale}) translate(-50%, -50%)`;
}

/**
 * 地面家具的足迹（脚下贴地的那一小块），房间坐标系的四边形。
 * 只算贴地那块而不是整个立面：屏风高 190，但它"占地"只有底下一条。
 */
export type Footprint = Array<[number, number]>;

/** 足迹宽度占绘制宽度的比例（留余量，贴边走不误判） */
const FOOT_W_RATIO = 0.8;
/** 足迹进深占绘制宽度的比例（等距视角下地面接触区是压扁的） */
const FOOT_DEPTH_RATIO = 0.35;

/**
 * 单件地面家具的足迹。返回 null 表示不占地（墙面挂件 / 未知贴纸）。
 *
 * 两个易错点：
 * 1. `(x, y)` 存的是**中心**，而 placementTransform 末尾的 `translate(-50%,-50%)`
 *    会被 `scale(s)` 作用、且 transform-origin 默认居中 —— 所以 s≠1 时视觉中心
 *    相对存储坐标有 `(1-s)·尺寸/2` 的漂移，底边位置必须算上这一项。
 * 2. 家具的 y 是**中心**锚点，而角色的 pos.y 是**脚底**锚点。这里统一换算成
 *    贴地的 y（yBase）后再和角色脚底比，不能直接拿两个 y 相减。
 */
export function footprintOf(
  p: DecorPlacement,
  sticker: { defaultW: number; aspect: number; anchor: DecorAnchor },
): Footprint | null {
  if (sticker.anchor !== 'floor') return null;
  const s = p.scale;
  const w = sticker.defaultW * s;
  const h = sticker.defaultW * sticker.aspect * s;
  // 视觉底边：中心 y + 半高，再加上缩放带来的漂移
  const yBase = p.y + h / 2 + ((s - 1) * (sticker.defaultW * sticker.aspect)) / 2;
  const halfW = (w * FOOT_W_RATIO) / 2;
  const depth = w * FOOT_DEPTH_RATIO;
  const top = yBase - depth;
  return [
    [p.x - halfW, top],
    [p.x + halfW, top],
    [p.x + halfW, yBase],
    [p.x - halfW, yBase],
  ];
}

/** 一批摆放的全部地面足迹（墙面挂件自动跳过） */
export function footprintsOf(
  placements: readonly DecorPlacement[],
  lookup: (stickerId: string) => { defaultW: number; aspect: number; anchor: DecorAnchor } | undefined,
): Footprint[] {
  const out: Footprint[] = [];
  for (const p of placements) {
    const sticker = lookup(p.stickerId);
    if (!sticker) continue;
    const fp = footprintOf(p, sticker);
    if (fp) out.push(fp);
  }
  return out;
}

/** 点是否落在任一家具足迹内 */
export function isBlocked(p: Point, footprints: readonly Footprint[]): boolean {
  return footprints.some((fp) => pointInPolygon(p, fp));
}

export function addPlacement(
  list: DecorPlacement[],
  stickerId: string,
  pos: Point,
  spec: RoomSpec,
  id: string = crypto.randomUUID(),
  anchor: DecorAnchor = 'wall',
): DecorPlacement[] {
  return [
    ...list,
    { id, stickerId, x: pos.x, y: pos.y, scale: 1, zone: zoneFor(pos, spec, anchor) },
  ];
}

/** 移动会实时重判 zone（拖过墙界自动切换透视；floor 家具恒 free） */
export function movePlacement(
  list: DecorPlacement[],
  id: string,
  pos: Point,
  spec: RoomSpec,
  anchor: DecorAnchor = 'wall',
): DecorPlacement[] {
  return list.map((p) =>
    p.id === id ? { ...p, x: pos.x, y: pos.y, zone: zoneFor(pos, spec, anchor) } : p,
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
