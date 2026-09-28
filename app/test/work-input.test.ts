import { expect, it } from 'vitest';
import { WorkPressClock } from '../src/main/work-input';
it('ignores entry buttons until released, then accepts clicks and keyboard',()=>{
 const c=new WorkPressClock();expect(c.sample([1],0)).toBe(Infinity);
 expect(c.sample([1],25)).toBe(Infinity);c.sample([],50);
 expect(c.sample([1],75)).toBe(0);expect(c.sample([],100)).toBe(25);
 expect(c.sample([1],125)).toBe(0); // second click
 expect(c.sample([65],150)).toBe(0);
 expect(c.sample([],275)).toBe(125);
});
it('cursor-only samples never trigger, and reentry cannot reuse an old press',()=>{
 const c=new WorkPressClock();for(let t=0;t<1000;t+=25)expect(c.sample([],t)).toBe(Infinity);
 expect(c.sample([65],1000)).toBe(0);
 expect(c.sample([65],2000)).toBe(Infinity);
 expect(c.sample([65],2025)).toBe(Infinity);
 c.sample([],2050);expect(c.sample([65],2075)).toBe(0);
});
