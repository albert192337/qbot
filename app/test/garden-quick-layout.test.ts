import { expect, it } from 'vitest';
import { quickLayout } from '../src/renderer/garden/quick-layout';
it('收获卡在顶部空间不足时保留完整高度，不压成滚动条', () => {
  const result = quickLayout(1100,800,230,260,500,[{left:0,right:1100,top:170,bottom:790}],true);
  expect(result.maxHeight).toBe(260);
  expect(result.top+260).toBeLessThanOrEqual(800);
});
it('操作/收获卡均在桌宠及最高植物之上，内容过长在卡内滚动', () => {
  for (const desiredHeight of [260, 340]) {
    const result = quickLayout(1100, 800, 280, desiredHeight, 400, [
      { left: 440, right: 760, top: 410, bottom: 770 },
      { left: 300, right: 430, top: 350, bottom: 740 },
    ]);
    expect(result.top + Math.min(desiredHeight, result.maxHeight)).toBeLessThanOrEqual(334);
    expect(result.top).toBeGreaterThanOrEqual(8);
  }
});
it('靠近屏幕顶部时选择空侧边，不覆盖角色', () => {
  const result = quickLayout(1100, 700, 280, 300, 550, [{ left: 420, right: 760, top: 30, bottom: 660 }]);
  expect(result.left + 280).toBeLessThan(420);
  expect(result.maxHeight).toBe(300);
});
