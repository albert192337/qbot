/** 房间几何工具：多边形判定/采样（roam 漫游与装饰 zone 判定、透明区穿透共用） */

export interface Point {
  x: number;
  y: number;
}

/** 射线法点在多边形内（边上视为在内即可，交互精度足够） */
export function pointInPolygon(p: Point, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonCentroid(poly: Array<[number, number]>): Point {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) {
    x += px;
    y += py;
  }
  return { x: x / poly.length, y: y / poly.length };
}

export interface GeomRng {
  /** [0,1) */
  random(): number;
}

/** 多边形内随机点：bbox 内 rejection sampling（凸多边形几次就中），兜底质心 */
export function randomPointInPolygon(poly: Array<[number, number]>, rng: GeomRng): Point {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  for (let i = 0; i < 30; i++) {
    const p = {
      x: minX + rng.random() * (maxX - minX),
      y: minY + rng.random() * (maxY - minY),
    };
    if (pointInPolygon(p, poly)) return p;
  }
  return polygonCentroid(poly);
}
