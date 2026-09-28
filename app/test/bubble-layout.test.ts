import { expect, it } from 'vitest';
import { aboveBubbleLayout } from '../src/main/bubble-layout';
const area = { x: 0, y: 0, width: 1920, height: 1040 };
it('中部角色不因 500px 透明窗口放不下而翻到脚下', () => {
  const p = aboveBubbleLayout({ x: 600, y: 200, width: 360, height: 360 }, area);
  expect(p).toMatchObject({ y: 0, side: 'above', contentHeight: 194 });
});
it('底部贴头顶，顶边翻到脚下，多屏负坐标仍在所属屏幕', () => {
  const low = aboveBubbleLayout({ x: 600, y: 650, width: 360, height: 360 }, area);
  expect(low.y + low.contentHeight).toBe(644);
  const top = aboveBubbleLayout({ x: -1800, y: -200, width: 360, height: 360 }, { ...area, x: -1920, y: -200 });
  expect(top).toMatchObject({ x: -1790, y: 166, side: 'below', contentHeight: 500 });
  expect(top.x).toBeGreaterThanOrEqual(-1920);
});
it('优先放在脚下，按实际可用高度而不是整个透明窗判断', () => {
  expect(aboveBubbleLayout({ x: 400, y: 20, width: 360, height: 360 }, { ...area, height: 540 }))
    .toMatchObject({ x: 410, y: 386, side: 'below', contentHeight: 154 });
});
it('上下放不下才选侧边，短屏幕不把侧边气泡推到屏幕顶', () => {
  expect(aboveBubbleLayout({ x: 400, y: 80, width: 360, height: 360 }, { ...area, height: 480 }))
    .toMatchObject({ x: 766, y: 80, side: 'below', contentHeight: 400 });
  expect(aboveBubbleLayout({ x: 900, y: 80, width: 360, height: 360 }, { ...area, width: 1280, height: 480 }))
    .toMatchObject({ x: 554, y: 80, side: 'below', contentHeight: 400 });
});
it('没有完整位置时使用较大一侧的剩余空间，不压到角色', () => {
  expect(aboveBubbleLayout({ x: 0, y: 70, width: 360, height: 360 }, { ...area, width: 360, height: 480 }))
    .toMatchObject({ y: 0, side: 'above', contentHeight: 64 });
});
