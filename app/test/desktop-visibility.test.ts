import {describe,it,expect} from 'vitest';
import {peekSideAtDrop} from '../src/shared/desktop-visibility';
const area={x:0,y:0,width:1920,height:1080};
describe('manual screen-edge peek',()=>{
 it('only attracts the two outer edges',()=>{
   expect(peekSideAtDrop({x:12,y:500,width:360,height:360},area,[])).toBe('left');
   expect(peekSideAtDrop({x:1550,y:500,width:360,height:360},area,[])).toBe('right');
   expect(peekSideAtDrop({x:700,y:0,width:360,height:360},area,[])).toBe(null);
 });
 it('lets pets cross a shared monitor seam in either direction',()=>{
   const left={x:-1920,y:0,width:1920,height:1080};
   expect(peekSideAtDrop({x:0,y:200,width:360,height:360},area,[left])).toBe(null);
   expect(peekSideAtDrop({x:-360,y:200,width:360,height:360},left,[area])).toBe(null);
 });
 it('supports negative coordinates and partially shared edges',()=>{
   const left={x:-1280,y:500,width:1280,height:720};
   expect(peekSideAtDrop({x:0,y:0,width:200,height:200},area,[left])).toBe('left');
   expect(peekSideAtDrop({x:-1270,y:600,width:200,height:200},left,[area])).toBe('left');
 });
});
