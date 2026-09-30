export interface Room3dState {
  layout: { key: string; asset: string; x: number; z: number; angle: number }[];
  camera?: { position: number[]; target: number[]; view: string };
  wallsVisible: boolean;
}

export function validateRoom3d(value: unknown): Room3dState {
  const v = value as Room3dState;
  if (!v || !Array.isArray(v.layout) || v.layout.length > 30) throw new Error('房间布置格式无效');
  const keys = new Set<string>();
  const layout = v.layout.map(p => {
    if (!p || typeof p.key !== 'string' || p.key.length > 100 || !p.key || keys.has(p.key) ||
        typeof p.asset !== 'string' || p.asset.length > 64 ||
        ![p.x, p.z, p.angle].every(n => Number.isFinite(n) && Math.abs(n) < 100)) throw new Error('家具位置无效');
    keys.add(p.key); return { key: p.key, asset: p.asset, x: p.x, z: p.z, angle: p.angle };
  });
  const c = v.camera;
  if (c && (![c.position,c.target].every(a => Array.isArray(a) && a.length === 3 && a.every(n => Number.isFinite(n) && Math.abs(n) < 100)) || !['home','edit','tower'].includes(c.view))) throw new Error('房间视角无效');
  return { layout, wallsVisible: v.wallsVisible === true, ...(c ? { camera: { position: [...c.position], target: [...c.target], view: c.view } } : {}) };
}
