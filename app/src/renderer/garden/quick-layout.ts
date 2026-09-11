export interface Obstacle { left: number; right: number; top: number; bottom: number }
/** 优先位于所有植物及桌宠上方；顶边空间紧张时选择不遮挡的侧边。 */
export function quickLayout(width: number, height: number, menuWidth: number, desiredHeight: number, center: number, obstacles: Obstacle[], fullHeight = false) {
  const gap = 16, margin = 8;
  const left = Math.max(margin, Math.min(center - menuWidth / 2, width - menuWidth - margin));
  const ceiling = Math.min(height, ...obstacles.map(r => r.top)) - gap;
  const available = Math.max(0, ceiling - margin);
  if (available >= (fullHeight ? desiredHeight : 110)) {
    const maxHeight = Math.min(350, available);
    return { left, top: Math.max(margin, ceiling - Math.min(desiredHeight, maxHeight)), maxHeight };
  }
  const h = Math.min(350, desiredHeight, height - margin * 2);
  const candidates = [margin, width - menuWidth - margin, ...obstacles.flatMap(r => [r.left - gap - menuWidth, r.right + gap])];
  for (const x of candidates) {
    if (x < margin || x + menuWidth > width - margin) continue;
    if (obstacles.every(r => x + menuWidth + gap <= r.left || x >= r.right + gap || margin + h + gap <= r.top || margin >= r.bottom + gap)) {
      return { left: x, top: margin, maxHeight: h };
    }
  }
  // 极端拥挤时也不向下盖住角色，收缩为顶部可滚动区域。
  return { left, top: margin, maxHeight: fullHeight ? h : available };
}
