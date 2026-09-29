import { describe, expect, it } from 'vitest';
import { gardenSceneLayout, validGardenScenePlacement } from '../src/shared/garden-scene-layout';

describe('3D garden layout', () => {
  it.each([3, 7, 12, 24, 28])('fits %i independent cells without overlap', count => {
    const result = gardenSceneLayout(Array.from({ length: count }, (_, i) => i));
    expect(result.cells).toHaveLength(count);
    for (const cell of result.cells) {
      expect(Math.abs(cell.x) + .5).toBeLessThan(result.width / 2);
      expect(Math.abs(cell.z) + .5).toBeLessThan(result.depth / 2);
      for (const other of result.cells.filter(c => c.index !== cell.index))
        expect(Math.abs(cell.x - other.x) >= 1 || Math.abs(cell.z - other.z) >= 1).toBe(true);
    }
  });
  it('preserves original plot indices when locked empty plots are hidden', () => {
    expect(gardenSceneLayout([0, 1, 2, 6]).cells.map(c => c.index)).toEqual([0, 1, 2, 6]);
  });
  it('rejects invalid or outside-screen placement messages', () => {
    const valid = { width: 600, height: 400, plots: [{ index: 6, x: 300, y: 500 }] };
    expect(validGardenScenePlacement(valid, 1200, 800)).toBe(true);
    for (const invalid of [null, {}, {...valid,width:Infinity}, {...valid,height:900}, {...valid,plots:[null]}, {...valid,plots:[{index:0,x:NaN,y:0}]}, {...valid,plots:[{index:0,x:1300,y:0}]}, {...valid,plots:[valid.plots[0],valid.plots[0]]}])
      expect(validGardenScenePlacement(invalid, 1200, 800)).toBe(false);
  });
});
