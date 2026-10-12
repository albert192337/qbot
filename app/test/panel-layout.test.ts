import { describe, it, expect } from 'vitest';
import { panelBounds, isDesktopPanelPage } from '../src/shared/panel-layout';
describe('desktop panel anchoring',()=>{
 it('opens below when it fits and above at the bottom without moving the pet',()=>{
  const area={x:0,y:0,width:1920,height:1080},pet={x:500,y:50,width:360,height:360};
  expect(panelBounds(pet,area,{width:420,height:560}).y).toBe(418);
  const bottom={...pet,y:710};expect(panelBounds(bottom,area,{width:420,height:560}).y).toBe(142);expect(bottom.y).toBe(710);
 });
 it('clamps small work areas and negative-coordinate monitors',()=>{
  const area={x:-1280,y:-100,width:1280,height:720};
  const r=panelBounds({x:-1300,y:500,width:360,height:360},area,{width:1400,height:900});
  expect(r).toEqual(area);
 });
 it('rejects arbitrary routing values',()=>{
  for(const value of [null,{},'__proto__','../../settings','capsule'])expect(isDesktopPanelPage(value)).toBe(false);
  expect(isDesktopPanelPage('garden')).toBe(true);
 });
});
