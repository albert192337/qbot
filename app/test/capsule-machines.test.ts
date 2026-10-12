import {describe,it,expect} from 'vitest';
import {initialGarden,transition,validateGarden} from '../src/main/garden/rules';
import {ensureLife} from '../src/main/garden/life-rules';
import {enableV3} from '../src/main/garden/v3-rules';
import {refreshSocial} from '../src/main/garden/social-rules';
import {APPEARANCE_CAPSULE_POOL,CAPSULE_3D_POOL,capsulePoolFor} from '../src/shared/social-economy';
const now=1790630400000;let id=0;
const rng={id:()=>`dual-${++id}`,random:()=>0};
function state(){const s=initialGarden(now,rng);ensureLife(s,now,rng,'pet');enableV3(s,now);s.economy!.tokens=6000;return s;}
const draw=(s:ReturnType<typeof state>,type:'capsuleDraw'|'capsuleDraw3d',roll=0,count:1|10=1)=>transition(s,{type,count},now,{...rng,random:()=>roll}).state;
describe('separate capsule machines',()=>{
 it('has disjoint furniture pools with normalized tiers and unchanged appearance odds',()=>{
  for(const tier of ['common','rare','epic'])for(const pool of [APPEARANCE_CAPSULE_POOL,CAPSULE_3D_POOL])expect(pool.filter(x=>x.tier===tier).reduce((n,x)=>n+x.weight,0)).toBe(100);
  const two=APPEARANCE_CAPSULE_POOL.filter(x=>x.kind==='furniture').map(x=>x.item),three=CAPSULE_3D_POOL.filter(x=>x.kind==='furniture').map(x=>x.item);
  expect(three).toHaveLength(7);expect(three.some(x=>two.includes(x))).toBe(false);
  expect(CAPSULE_3D_POOL.filter(x=>x.kind==='appearance')).toEqual(APPEARANCE_CAPSULE_POOL.filter(x=>x.kind==='appearance'));
  expect(capsulePoolFor({},'3d')).toEqual([]);expect(capsulePoolFor({furniture3dRevision:1},'3d')).toEqual([]);
  expect(capsulePoolFor({capsuleMachineRevision:1},'3d')).toBe(CAPSULE_3D_POOL);
 });
 it('migrates once, retaining all currency, ownership, old pity and historical rewards',()=>{
  const s=state(),e=s.economy!;delete e.capsuleMachineRevision;delete e.capsule3d;e.furniture3dRevision=1;
  e.rareMisses=8;e.epicMisses=18;e.draws=32;e.furniture={'halloween-books':2,'moss-stool':4};
  e.lastCapsule={id:'old',at:now,rewards:[CAPSULE_3D_POOL[0]]};const before=structuredClone(e);
  refreshSocial(s,now);expect(e.tokens).toBe(before.tokens);expect(e.furniture).toEqual(before.furniture);expect([e.rareMisses,e.epicMisses,e.draws]).toEqual([8,18,32]);expect(e.lastCapsule2d).toEqual(before.lastCapsule);expect(e.capsule3d).toEqual({rareMisses:0,epicMisses:0,draws:0});
  expect(e.furniture3dRevision).toBeUndefined();
  const once=structuredClone(s);refreshSocial(s,now);expect(s).toEqual(once);
 });
 it('keeps pity and last rewards independent across alternating machines and reloads',()=>{
  let s=state();s.economy!.rareMisses=9;s.economy!.epicMisses=19;
  s=draw(s,'capsuleDraw3d');expect(s.economy!.epicMisses).toBe(19);expect(s.economy!.capsule3d!.epicMisses).toBe(1);
  const last3d=structuredClone(s.economy!.capsule3d!.lastCapsule);s=draw(s,'capsuleDraw');expect(s.economy!.furniture['moon-terrarium']).toBe(1);expect(s.economy!.epicMisses).toBe(0);expect(s.economy!.capsule3d!.lastCapsule).toEqual(last3d);
  s.economy!.capsule3d!.epicMisses=19;s=draw(s,'capsuleDraw3d');expect(s.economy!.capsule3d!.lastCapsule!.rewards[0].tier).toBe('epic');expect(s.economy!.lastCapsule2d!.machine).toBe('2d');expect(s.economy!.tokens).toBe(5820);
  expect(validateGarden(JSON.parse(JSON.stringify(s)))).toEqual(s);
 });
 it('awards ten items once and guarantees each machine independently by draw 10 and 20',()=>{
  for(const type of ['capsuleDraw','capsuleDraw3d'] as const){let s=state();s=draw(s,type,0,10);const first=s.economy!.lastCapsule!.rewards;expect(first).toHaveLength(10);expect(first[9].tier).toBe('rare');s=draw(s,type,0,10);expect(s.economy!.lastCapsule!.rewards[9].tier).toBe('epic');expect(s.economy!.tokens).toBe(4800);expect(type==='capsuleDraw'?s.economy!.capsule3d!.draws:s.economy!.draws).toBe(0);}
 });
 it('rejects invalid requests and insufficient funds without mutations',()=>{
  const s=state();s.economy!.tokens=599;const before=structuredClone(s);
  expect(()=>draw(s,'capsuleDraw3d',0,10)).toThrow('不足');
  expect(()=>transition(s,{type:'capsuleDraw3d',count:2 as 1},now,rng)).toThrow('单抽');expect(s).toEqual(before);
 });
 it('rejects corrupted new pity counters',()=>{for(const value of [-1,20,NaN]){const s=state();s.economy!.capsule3d!.epicMisses=value;expect(()=>validateGarden(s)).toThrow('3D');}});
});
