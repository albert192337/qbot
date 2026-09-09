import { expect, it } from 'vitest';
import { aboveBubbleLayout } from '../src/main/bubble-layout';
const area = { x: 0, y: 0, width: 1920, height: 1040 };
it('中部角色不因 500px 透明窗口放不下而翻到脚下', () => {
  const p = aboveBubbleLayout({ x: 600, y: 200, width: 360, height: 360 }, area);
  expect(p).toMatchObject({ y: 0, side: 'above', contentHeight: 224 });
});
it('底部贴头顶，顶边贴屏幕顶，多屏负坐标仍在所属屏幕', () => {
  const low = aboveBubbleLayout({ x: 600, y: 650, width: 360, height: 360 }, area);
  expect(low.y + low.contentHeight).toBe(674);
  const top = aboveBubbleLayout({ x: -1800, y: -200, width: 360, height: 360 }, { ...area, x: -1920, y: -200 });
  expect(top).toMatchObject({ y: -200, side: 'above', contentHeight: 24 });
  expect(top.x).toBeGreaterThanOrEqual(-1920);
});
