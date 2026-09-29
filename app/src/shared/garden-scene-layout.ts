/** Four planting cells per bed, separated by a walkable lane. No asset or unlock changes. */
export function gardenSceneLayout(indices: number[]) {
  const beds = Math.max(1, Math.ceil(indices.length / 4));
  const columns = Math.min(3, Math.ceil(Math.sqrt(beds)));
  const rows = Math.ceil(beds / columns);
  const pitch = 2.75;
  const width = columns * pitch + .25, depth = rows * pitch + .25;
  const cells = indices.map((index, n) => {
    const bed = Math.floor(n / 4), slot = n % 4;
    return { index, x: (bed % columns) * pitch + (slot % 2) * 1.05 - (columns - 1) * pitch / 2 - .525,
      z: Math.floor(bed / columns) * pitch + Math.floor(slot / 2) * 1.05 - (rows - 1) * pitch / 2 - .525 };
  });
  return { width, depth, cells };
}

export interface GardenScenePlacement {
  width: number; height: number;
  plots: { index: number; x: number; y: number }[];
}

/** Only the desktop renderer can supply these screen-local positions. */
export function validGardenScenePlacement(value: unknown, width: number, height: number): value is GardenScenePlacement {
  if (!value || typeof value !== 'object') return false;
  const v = value as GardenScenePlacement;
  return Number.isFinite(v.width) && v.width > 0 && v.width <= width && Number.isFinite(v.height) && v.height > 0 && v.height <= height
    && Array.isArray(v.plots) && v.plots.length <= 128 && new Set(v.plots.map(p => p?.index)).size === v.plots.length
    && v.plots.every(p => p && Number.isInteger(p.index) && p.index >= 0 && p.index < 128 && Number.isFinite(p.x) && p.x >= 0 && p.x <= width && Number.isFinite(p.y) && p.y >= 0 && p.y <= height);
}
