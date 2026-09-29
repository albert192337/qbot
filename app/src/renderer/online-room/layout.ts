import type { DecorPlacement } from '../../shared/ipc-types';
import { BASIC_ITEMS, piecesForTheme, type FurnitureTheme } from './library';
export { BASIC_ITEMS } from './library';
import { REGIONAL_FURNITURE,FURNITURE_SHOP } from '../../shared/social-economy';

export const ROOM_DECOR_KEY = 'panorama-tea-v1';
export type Surface = 'wall' | 'floor' | 'rug';
export const SLOTS = [
  { id: 'rug', name: '地毯', surface: 'rug', x: 510, y: 257, w: 450, h: 55 },
  { id: 'left', name: '左侧家具', surface: 'floor', x: 205, y: 246, w: 265, h: 185 },
  { id: 'seat', name: '中央座椅', surface: 'floor', x: 535, y: 228, w: 270, h: 115 },
  { id: 'right', name: '右侧家具', surface: 'floor', x: 825, y: 248, w: 170, h: 200 },
  { id: 'table', name: '茶几', surface: 'floor', x: 535, y: 266, w: 195, h: 80 },
  { id: 'wall-left', name: '左侧挂饰', surface: 'wall', x: 130, y: 135, w: 60, h: 110 },
  { id: 'wall-right', name: '右侧挂饰', surface: 'wall', x: 870, y: 135, w: 60, h: 110 },
] as const;
export type SlotId = typeof SLOTS[number]['id'];
export type Layout = Record<SlotId, string>;
export const DEFAULT_LAYOUT: Layout = { rug: 'tea-rug', left: 'tea-counter', seat: 'tea-sofa', right: 'tea-plant', table: 'tea-table', 'wall-left': 'tea-lantern', 'wall-right': 'tea-lantern' };
export const LEGACY_SURFACES: Record<string, Surface> = { painting:'wall', lantern:'wall', window:'wall', clock:'wall', fan:'wall', calligraphy:'wall', screen:'floor', shelf:'floor', plant:'floor', teapot:'floor' };
export function surfaceFor(id: string): Surface | undefined {
  if(REGIONAL_FURNITURE.some(x=>x.id===id)||FURNITURE_SHOP.some(x=>x.id===id))return 'floor';
  return BASIC_ITEMS.find(item => item.id === id)?.surface;
}
export function restoreLayout(value: unknown): Layout {
  if (!Array.isArray(value) || !value.length) return { ...DEFAULT_LAYOUT };
  const result = Object.fromEntries(SLOTS.map(slot => [slot.id, ''])) as Layout;
  for (const slot of SLOTS) {
    const row = value.find(p => p && p.id === slot.id);
    if (row && typeof row.stickerId === 'string' && surfaceFor(row.stickerId) === slot.surface) result[slot.id] = row.stickerId;
  }
  return result;
}
export function serializeLayout(layout: Layout): DecorPlacement[] {
  return SLOTS.map(slot => ({ id: slot.id, stickerId: surfaceFor(layout[slot.id]) === slot.surface ? layout[slot.id] : '', x:slot.x, y:slot.y, scale:1, zone:'free' }));
}
export function canPlace(layout: Layout, slotId: SlotId, itemId: string, inventory: Record<string, number>): boolean {
  const slot = SLOTS.find(s => s.id === slotId);
  if (!slot || surfaceFor(itemId) !== slot.surface) return false;
  if (BASIC_ITEMS.some(item => item.id === itemId)) return true;
  const used = SLOTS.filter(s => s.id !== slotId && layout[s.id] === itemId).length;
  return used < (inventory[itemId] ?? 0);
}

export function layoutForTheme(theme:FurnitureTheme):Layout {
 const p=piecesForTheme(theme);return {rug:p.rug,left:p.cabinet,seat:p.seat,right:p.plant,table:p.table,"wall-left":p.hanging,"wall-right":p.hanging};
}
