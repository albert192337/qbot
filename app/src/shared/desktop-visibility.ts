export type PeekSide = 'left' | 'right' | null;
export interface DesktopVisibility {
  revision: number;
  hidden: boolean;
  hiddenMembers: string[];
  peek: PeekSide;
}
export interface DesktopHitRect { x: number; y: number; width: number; height: number }

/** Only exposed outer display edges attract a manual drop; seams remain traversable. */
export function peekSideAtDrop(pet: DesktopHitRect, area: DesktopHitRect, displays: DesktopHitRect[], threshold = 26): PeekSide {
  const midY = pet.y + pet.height / 2;
  const touches = (edge: number, left: boolean) => displays.some(d => d !== area &&
    midY >= d.y && midY < d.y + d.height &&
    (left ? d.x < edge && d.x + d.width >= edge : d.x <= edge && d.x + d.width > edge));
  if (pet.x <= area.x + threshold && !touches(area.x, true)) return 'left';
  if (pet.x + pet.width >= area.x + area.width - threshold && !touches(area.x + area.width, false)) return 'right';
  return null;
}
