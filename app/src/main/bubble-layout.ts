interface Rect { x: number; y: number; width: number; height: number }

/** 固定透明窗口不 resize；通过内容高度把气泡贴到头顶，空间不足时贴屏幕顶边。 */
export function aboveBubbleLayout(pet: Rect, area: Rect, width = 340, height = 500, overlap = 24) {
  const x = Math.round(Math.max(area.x, Math.min(pet.x + pet.width / 2 - width / 2, area.x + area.width - width)));
  const y = Math.round(Math.max(area.y, pet.y - height + overlap));
  return { x, y, side: 'above' as const, contentHeight: Math.max(0, Math.min(height, pet.y + overlap - y)) };
}
