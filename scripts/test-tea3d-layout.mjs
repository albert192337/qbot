import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LAYOUT,restore,legal,seatWorld,extent} from '../app/src/renderer/tea3d/layout.mjs';
test('default layout fits, with rug allowed below furniture',()=>{for(const p of DEFAULT_LAYOUT)assert.ok(legal(p,DEFAULT_LAYOUT),p.key);assert.deepEqual(restore(DEFAULT_LAYOUT),DEFAULT_LAYOUT);});
test('movement rejects collisions and room edges, accounts for rotation',()=>{const p={...DEFAULT_LAYOUT[1]};assert.equal(legal({...p,x:-3,z:-1.2},DEFAULT_LAYOUT),false);assert.equal(legal({...p,x:4},[]),false);const e=extent({...p,angle:Math.PI/2});assert.ok(Math.abs(e.z-1.35)<.0001);assert.equal(legal({...p,z:2,angle:Math.PI/2},[]),false);});
test('seat positions follow furniture translation and rotation',()=>{const p={...DEFAULT_LAYOUT[1],x:2,z:1,angle:Math.PI/2};const s=seatWorld(p,0);assert.ok(Math.abs(s.x-2.05)<1e-6);assert.ok(Math.abs(s.z-1.62)<1e-6);assert.equal(s.y,.64);});
test('restore sanitises unknown models, non-finite values and duplicate keys',()=>{assert.deepEqual(restore(null),DEFAULT_LAYOUT);assert.deepEqual(restore([]),[]);assert.deepEqual(restore([{key:'bad',asset:'unknown',x:0,z:0,angle:0}]),DEFAULT_LAYOUT);const p=DEFAULT_LAYOUT[1];assert.deepEqual(restore([p,p,{...p,key:'nan',x:Infinity}]),[p]);});
