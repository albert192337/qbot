import { describe,it,expect } from 'vitest';
import { PettingGesture } from '../src/shared/petting';
describe('hover petting',()=>{
  function stroke(g:PettingGesture,t=0,vertical=false){return [0,30,0,30].map((x,i)=>g.move(vertical?50:x,vertical?x:50,t+i*180));}
  it('recognizes deliberate horizontal and vertical strokes',()=>{
    expect(stroke(new PettingGesture())).toEqual([false,false,false,true]);
    expect(stroke(new PettingGesture(),0,true)).toEqual([false,false,false,true]);
  });
  it('ignores stillness, tiny jitter and one-way traversal',()=>{
    for(const xs of [[0,0,0,0],[0,2,0,3,1],[0,30,60,90,120]]){
      const g=new PettingGesture();expect(xs.some((x,i)=>g.move(x,0,i*150))).toBe(false);
    }
  });
  it('does not join slow or interrupted gestures',()=>{
    const g=new PettingGesture();g.move(0,0,0);g.move(30,0,200);g.reset();
    expect(g.move(0,0,400)).toBe(false);expect(g.move(30,0,600)).toBe(false);
    expect(g.move(0,0,2100)).toBe(false);
  });
  it('rejects every pressed button and requires a fresh hover after drag',()=>{
    for(const buttons of [1,2,4]){const g=new PettingGesture();g.move(0,0,0);g.move(30,0,100);
      expect(g.move(0,0,200,buttons)).toBe(false);expect(g.move(30,0,300)).toBe(false);}
  });
  it('retains cooldown across leave/reset, permits a later gesture',()=>{
    const g=new PettingGesture();expect(stroke(g).at(-1)).toBe(true);g.reset();
    expect(stroke(g,1000).some(Boolean)).toBe(false);
    expect(stroke(g,9000).at(-1)).toBe(true);
  });
});
