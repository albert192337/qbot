import {describe,it,expect} from 'vitest';
import {HALLOWEEN_FURNITURE,validateFurniture3dInventory} from '../src/shared/halloween-furniture';
import {CAPSULE_3D_POOL,CAPSULE_POOL,APPEARANCE_CAPSULE_POOL,LEGACY_CAPSULE_POOL,capsulePoolFor} from '../src/shared/social-economy';
import {initialGarden,transition,validateGarden} from '../src/main/garden/rules';
import {ensureLife} from '../src/main/garden/life-rules';
import {enableV3} from '../src/main/garden/v3-rules';
const now=1790630400000;let id=0;const rng={id:()=>`halloween-${++id}`,random:()=>.1};
describe('Halloween furniture collection',()=>{
 it('awards every separate model through the real draw and persists repeat quantities',()=>{
  for(const item of HALLOWEEN_FURNITURE){
   let s=initialGarden(now,rng);ensureLife(s,now,rng,'pet');enableV3(s,now);s.economy!.tokens=120;
   const pool=CAPSULE_3D_POOL.filter(x=>x.tier===item.tier),index=pool.findIndex(x=>x.id===item.id);
   const pick=(pool.slice(0,index).reduce((sum,x)=>sum+x.weight,0)+pool[index].weight/2)/100;
   for(let n=0;n<2;n++){let call=0;s=transition(s,{type:'capsuleDraw3d',count:1},now,{id:rng.id,random:()=>call++===0?{common:.1,rare:.8,epic:.99}[item.tier]:pick}).state;}
   s=validateGarden(JSON.parse(JSON.stringify(s)));expect(s.economy!.furniture[item.id]).toBe(2);expect(s.economy!.tokens).toBe(0);
   expect(()=>validateFurniture3dInventory([{asset:item.id},{asset:item.id}],s.economy!.furniture)).not.toThrow();
   expect(()=>validateFurniture3dInventory(Array(3).fill({asset:item.id}),s.economy!.furniture)).toThrow('数量不足');
  }
 });
 it('keeps old server probabilities and each tier normalized',()=>{
  expect(capsulePoolFor({})).toBe(LEGACY_CAPSULE_POOL);
  expect(capsulePoolFor({appearances:{}})).toBe(APPEARANCE_CAPSULE_POOL);
  expect(capsulePoolFor({furniture3dRevision:1})).toBe(CAPSULE_POOL);
  for(const pool of [LEGACY_CAPSULE_POOL,APPEARANCE_CAPSULE_POOL,CAPSULE_POOL,CAPSULE_3D_POOL])for(const tier of ['common','rare','epic'])expect(pool.filter(x=>x.tier===tier).reduce((n,x)=>n+x.weight,0)).toBe(100);
 });
 it('allows the starter set but rejects uncollected Halloween furniture',()=>{
  expect(()=>validateFurniture3dInventory([{asset:'jade-sofa'}],{})).not.toThrow();
  expect(()=>validateFurniture3dInventory([{asset:'halloween-chandelier'}],{})).toThrow('数量不足');
 });
});

