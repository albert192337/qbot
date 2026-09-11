export type Point = { x: number; y: number };
export type Furniture = { id: string; label: string; index: number; width: number; u: number; v: number; visible: boolean; flip: boolean; radius: number };
export type Layout = { version: 1; theme: 'day' | 'sunset' | 'night'; rug: boolean; shadows: boolean; furniture: Furniture[] };
export const defaults: Furniture[] = [
  { id: 'sofa', label: '奶油沙发', index: 0, width: 265, u: .22, v: .62, visible: true, flip: false, radius: 83 },
  { id: 'table', label: '圆角茶几', index: 1, width: 170, u: .54, v: .62, visible: true, flip: false, radius: 52 },
  { id: 'lamp', label: '蘑菇暖灯', index: 2, width: 90, u: .15, v: .26, visible: true, flip: false, radius: 22 },
  { id: 'shelf', label: '薄荷书架', index: 3, width: 160, u: .22, v: .14, visible: true, flip: false, radius: 48 },
  { id: 'plant', label: '圆叶盆栽', index: 4, width: 112, u: .84, v: .18, visible: true, flip: false, radius: 28 },
  { id: 'bench', label: '玻璃培育台', index: 5, width: 210, u: .58, v: .15, visible: true, flip: false, radius: 66 },
];
export const project = (u: number, v: number): Point => ({ x: 512 + (u - v) * 454, y: 418 + (u + v) * 232 });
export function unproject(p: Point): { u: number; v: number } {
  return { u: ((p.x - 512) / 454 + (p.y - 418) / 232) / 2, v: ((p.y - 418) / 232 - (p.x - 512) / 454) / 2 };
}
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export function freshLayout(): Layout { return { version: 1, theme: 'day', rug: true, shadows: true, furniture: structuredClone(defaults) }; }
export function restoreLayout(raw: unknown): Layout {
  const base = freshLayout();
  if (!raw || typeof raw !== 'object' || (raw as Layout).version !== 1) return base;
  const data = raw as Partial<Layout>;
  if (['day', 'sunset', 'night'].includes(data.theme || '')) base.theme = data.theme!;
  if (typeof data.rug === 'boolean') base.rug = data.rug;
  if (typeof data.shadows === 'boolean') base.shadows = data.shadows;
  if (Array.isArray(data.furniture)) for (const f of base.furniture) {
    const saved = data.furniture.find(s => s && s.id === f.id);
    if (!saved) continue;
    if (Number.isFinite(saved.u)) f.u = clamp(saved.u, .12, .88);
    if (Number.isFinite(saved.v)) f.v = clamp(saved.v, .12, .88);
    if (typeof saved.visible === 'boolean') f.visible = saved.visible;
    if (typeof saved.flip === 'boolean') f.flip = saved.flip;
  }
  return base;
}
export function blocked(p: Point, furniture: Furniture[]): boolean {
  return furniture.some(f => {
    if (!f.visible) return false;
    const q = project(f.u, f.v);
    return ((p.x - q.x) / (f.radius + 12)) ** 2 + ((p.y - q.y + 9) / (f.radius * .48 + 10)) ** 2 < 1;
  });
}
/** Small floor grid: route around furniture instead of walking through its feet. */
export function route(from: Point, to: Point, furniture: Furniture[]): Point[] {
  const size = 22;
  const point = (id: number) => project(.09 + (id % size) / (size - 1) * .82, .09 + Math.floor(id / size) / (size - 1) * .82);
  const open = Array.from({ length: size * size }, (_, i) => !blocked(point(i), furniture));
  const nearest = (p: Point) => open.reduce((best, ok, i) => ok && Math.hypot(point(i).x - p.x, point(i).y - p.y) < Math.hypot(point(best).x - p.x, point(best).y - p.y) ? i : best, open.findIndex(Boolean));
  if (!open.some(Boolean)) return [];
  const a = nearest(from), b = nearest(to), queue = [a], prev = new Map<number, number>([[a, -1]]);
  for (let k = 0; k < queue.length && !prev.has(b); k++) {
    const id = queue[k];
    for (const next of [id - 1, id + 1, id - size, id + size]) {
      if (next < 0 || next >= open.length || !open[next] || prev.has(next)) continue;
      if (Math.abs(next % size - id % size) + Math.abs(Math.floor(next / size) - Math.floor(id / size)) !== 1) continue;
      prev.set(next, id); queue.push(next);
    }
  }
  if (!prev.has(b)) return [];
  const result: Point[] = [];
  for (let id = b; id !== -1; id = prev.get(id)!) result.unshift(point(id));
  return result;
}
