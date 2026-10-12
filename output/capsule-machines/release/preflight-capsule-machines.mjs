// Run beside a candidate rooms/ tree, against a COPY of production data only.
import assert from 'node:assert/strict';
import {readFileSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {Contacts} from '../rooms/contacts.mjs';
import {Gardens} from '../rooms/garden.mjs';
import core from '../rooms/generated/garden-core.cjs';
const directory=realpathSync(process.argv[2]||'.');
assert.equal(path.basename(directory),'preflight-data','An isolated preflight-data copy is required');
assert.ok(!directory.startsWith('/var/lib/'),'Never run against production data');
const before=JSON.parse(readFileSync(path.join(directory,'gardens.json'),'utf8'));
const contacts=new Contacts(path.join(directory,'contacts.json'));
const gardens=new Gardens(path.join(directory,'gardens.json'),contacts);
const json=x=>JSON.parse(JSON.stringify(x));let count=0;
for(const [id,row] of Object.entries(before.people)){
 const after=gardens.handle(id,{action:'get'}).state,e=row.state.economy;
 assert.equal(after.economy.capsuleMachineRevision,1);
 assert.equal(after.economy.furniture3dRevision,undefined);
 assert.equal(after.coins,row.state.coins);
 if(e){
  for(const key of ['tokens','draws','rareMisses','epicMisses','furniture','appearances'])if(e[key]!==undefined)assert.deepEqual(after.economy[key],e[key],`${id}: ${key}`);
  assert.deepEqual(after.economy.capsule3d,e.capsule3d??{rareMisses:0,epicMisses:0,draws:0});
  if(e.lastCapsule)assert.deepEqual(after.economy.lastCapsule,e.lastCapsule);
  if(e.lastCapsule2d||e.lastCapsule)assert.deepEqual(after.economy.lastCapsule2d,e.lastCapsule2d??e.lastCapsule);
 }
 for(const seed of row.state.seeds)assert.ok(after.seeds.some(x=>x.id===seed.id));
 const ids=new Set(row.state.seeds.map(x=>x.id)),extra=after.seeds.filter(x=>!ids.has(x.id));
 assert.ok(extra.length<=1&&extra.every(x=>x.species==='strawberry'&&!x.bred&&!x.genes.length));
 assert.deepEqual(after.produce.map(x=>x.id),row.state.produce.map(x=>x.id));
 assert.deepEqual(after.plots.map(x=>x?.id??null),row.state.plots.map(x=>x?.id??null));
 core.validateGarden(gardens.data.people[id].state);count++;
}
const saved=json(gardens.data),restart=new Gardens(path.join(directory,'gardens.json'),contacts);
assert.deepEqual(json(restart.data),saved);
console.log(JSON.stringify({ok:true,migratedGardens:count,balancesFurnitureAndPityPreserved:true,restart:true}));
