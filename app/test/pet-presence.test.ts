import {expect,it} from 'vitest';
import {ActivityMemory,ReturnGreetingGate} from '../src/shared/pet-presence';
it('greets after absence or lock, never at startup or ordinary pauses, and cools down',()=>{
 const gate=new ReturnGreetingGate();
 expect(gate.sample(0,false,0)).toBe(false);
 expect(gate.sample(30,false,30000)).toBe(false);expect(gate.sample(0,false,31000)).toBe(false);
 expect(gate.sample(300,false,300000)).toBe(false);expect(gate.sample(0,false,301000)).toBe(true);
 expect(gate.sample(0,false,302000)).toBe(false);
 gate.sample(0,true,400000);expect(gate.sample(0,false,410000)).toBe(false);
 gate.sample(0,true,1000000);expect(gate.sample(0,false,1001000)).toBe(true);
});
it('keeps the original activity through nested interruptions, consumes once, and invalidates stale/changed actors',()=>{
 const memory=new ActivityMemory<{action:string;loops:number}>();
 memory.remember('a',{action:'read',loops:2},0);memory.remember('a',{action:'listen',loops:1},10);
 expect(memory.take('a',200)).toEqual({action:'read',loops:2});expect(memory.take('a',201)).toBeNull();
 memory.remember('a',{action:'read',loops:2},0);expect(memory.take('b',1)).toBeNull();
 memory.remember('a',{action:'read',loops:2},0);expect(memory.take('a',600001)).toBeNull();
 memory.remember('a',{action:'read',loops:2},0);memory.clear();expect(memory.take('a',1)).toBeNull();
});
