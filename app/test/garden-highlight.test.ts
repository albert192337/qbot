import { expect, it } from 'vitest';
import { harvestHighlight } from '../src/main/garden/highlight';
import type { Produce } from '../src/shared/garden';
it('只摘要金色及传奇收获，保留品种、词条与重量事实', () => {
  const p: Produce = { id: 'berry', species: 'strawberry', traits: [], kg: 1.2, value: 400, bred: false };
  expect(harvestHighlight(p)).toBeNull();
  expect(harvestHighlight({ ...p, traits: ['shiny'] })).toBeNull();
  expect(harvestHighlight({ ...p, traits: ['giant'] })).toContain('金色品质的草莓（巨大化，1.200 kg）');
  expect(harvestHighlight({ ...p, traits: ['rainbow'] })).toContain('彩色传奇品质');
});
