type Rect = { x: number; y: number; width: number; height: number };
/** Match the approved compact panel to the pet, rather than a fixed large window. */
export function compactPanelSize(petWidth: number): {width:number;height:number} {
  const width = Math.round(Math.max(280, Math.min(380, petWidth * 1.65)));
  return {width, height:Math.round(width * 1.25)};
}
/** Anchor without moving the pet. Coordinates are DIP, including negative monitors. */
export function panelBounds(pet: Rect, area: Rect, size: {width:number;height:number}): Rect {
  const width = Math.min(size.width, area.width), height = Math.min(size.height, area.height);
  const below = pet.y + pet.height + 8;
  const y = below + height <= area.y + area.height ? below : pet.y - height - 8;
  return {width,height,
    x: Math.round(Math.max(area.x, Math.min(pet.x + pet.width / 2 - width / 2, area.x + area.width - width))),
    y: Math.round(Math.max(area.y, Math.min(y, area.y + area.height - height)))};
}
export type DesktopPanelPage = 'menu' | 'phone' | 'garden' | 'room';
export function isDesktopPanelPage(page: unknown): page is DesktopPanelPage {
  return typeof page === 'string' && ['menu','phone','garden','room'].includes(page);
}
