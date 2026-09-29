import { describe, it, expect } from 'vitest';
import { DEFAULT_LAYOUT, restoreLayout, serializeLayout, canPlace, SLOTS } from '../src/renderer/online-room/layout';
describe('横向房间布置',()=>{
 it('places and restores regional furniture using its original surface and earned inventory',()=>{expect(canPlace(DEFAULT_LAYOUT,'wall-left','kyoto-sprout',{'kyoto-sprout':1})).toBe(false);expect(canPlace(DEFAULT_LAYOUT,'left','kyoto-sprout',{'kyoto-sprout':1})).toBe(true);expect(canPlace(DEFAULT_LAYOUT,'wall-left','kyoto-sprout',{})).toBe(false);const layout={...DEFAULT_LAYOUT,left:'kyoto-sprout'};expect(restoreLayout(serializeLayout(layout)).left).toBe('kyoto-sprout');});
 it('distinguishes new and explicitly empty layouts',()=>{expect(restoreLayout([])).toEqual(DEFAULT_LAYOUT);const empty={...DEFAULT_LAYOUT};for(const s of SLOTS)empty[s.id]='';expect(restoreLayout(serializeLayout(empty))).toEqual(empty);});
 it('rejects malformed, unknown and wrong-surface entries',()=>{const restored=restoreLayout([null,{id:'left',stickerId:'tea-lantern'},{id:'wall-left',stickerId:'tea-lantern',x:Infinity},{id:'right',stickerId:'__proto__'}]);expect(restored.left).toBe('');expect(restored.right).toBe('');expect(restored['wall-left']).toBe('tea-lantern');expect(serializeLayout(restored).every(p=>Number.isFinite(p.x))).toBe(true);});
 it('enforces inventory across slots while allowing replacement',()=>{const layout={...DEFAULT_LAYOUT,left:'moss-stool'};expect(canPlace(layout,'right','moss-stool',{'moss-stool':1})).toBe(false);expect(canPlace(layout,'left','moss-stool',{'moss-stool':1})).toBe(true);expect(canPlace(layout,'right','moss-stool',{'moss-stool':2})).toBe(true);expect(canPlace(layout,'right','potting-shelf',{})).toBe(false);});
 it('reuses basic items only on compatible surfaces',()=>{expect(canPlace(DEFAULT_LAYOUT,'wall-right','tea-lantern',{})).toBe(true);expect(canPlace(DEFAULT_LAYOUT,'rug','tea-sofa',{})).toBe(false);});
});

import { BASIC_ITEMS, FURNITURE_THEMES } from '../src/renderer/online-room/library';
import { layoutForTheme } from '../src/renderer/online-room/layout';
describe('家具套装互换',()=>{
 it('provides four complete sets with a distinct choice for every category',()=>{
  expect(BASIC_ITEMS).toHaveLength(24);expect(new Set(BASIC_ITEMS.map(i=>i.id)).size).toBe(24);
  for(const theme of FURNITURE_THEMES){const items=BASIC_ITEMS.filter(i=>i.theme===theme.id);expect(items).toHaveLength(6);expect(new Set(items.map(i=>i.category)).size).toBe(6);expect(items.every(i=>i.width>0&&i.height>0&&i.cell>=0&&i.cell<6)).toBe(true);}
 });
 it('can place and persist every complete set without consuming earned furniture',()=>{
  for(const theme of FURNITURE_THEMES){const layout=layoutForTheme(theme.id);expect(restoreLayout(serializeLayout(layout))).toEqual(layout);for(const slot of SLOTS)expect(canPlace(layout,slot.id,layout[slot.id],{})).toBe(true);}
 });
 it('persists pieces mixed across themes while preserving old tea ids',()=>{
  const mix={...DEFAULT_LAYOUT,left:'reading-cabinet',seat:'scholar-seat',table:'rattan-table',rug:'reading-rug','wall-right':'rattan-art'};
  expect(restoreLayout(serializeLayout(mix))).toEqual(mix);expect(restoreLayout(serializeLayout(DEFAULT_LAYOUT))).toEqual(DEFAULT_LAYOUT);
 });
});
