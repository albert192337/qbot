import { expect, it } from 'vitest';
import { gardenLane, gardenSide } from '../src/shared/garden-layout';
it('移动及换侧只影响位置，不缩放土地', () => {
  for(const left of [0,100,300,500,740]) for(const side of ['left','right'] as const)
    expect(gardenLane(left,left+360,1100,side).width).toBe(455);
});
it('桌宠靠右向左展开，靠左向右展开，工具留在植物区外', () => {
  const area = {x:-1920,width:1920};
  expect(gardenSide({x:-400,width:300},area)).toBe('left');
  expect(gardenSide({x:-1800,width:300},area)).toBe('right');
  const left = gardenLane(800,1100,1100,'left');
  expect(left.left+left.width).toBeLessThan(800);
  expect(left.toolsLeft+36).toBeLessThan(left.left);
  const right = gardenLane(0,300,1100,'right');
  expect(right.left).toBeGreaterThan(300);
  expect(right.left+right.width).toBeLessThan(right.toolsLeft);
});
