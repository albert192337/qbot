import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Contacts} from '../rooms/contacts.mjs';
import {Gardens} from '../rooms/garden.mjs';
import core from '../rooms/generated/garden-core.cjs';
const directory=process.argv[2];
assert.ok(directory?.includes('preflight-data'),'Only use an isolated preflight-data directory');
const contacts=new Contacts(directory+'/contacts.json');
const before=JSON.parse(readFileSync(directory+'/gardens.json','utf8'));
const gardens=new Gardens(directory+'/gardens.json',contacts);
let count=0;
for(const [id,row] of Object.entries(before.people)){
  const result=gardens.handle(id,{action:'get'}),after=result.state;
  assert.equal(after.economy.version,4);
  assert.equal(after.coins,row.state.coins);
  for(const key of ['tokens','draws','rareMisses','epicMisses']) if(row.state.economy?.[key]!==undefined) assert.deepEqual(after.economy[key],row.state.economy[key]);
  assert.deepEqual(after.economy.appearances,row.state.economy?.appearances??{owned:{},equipped:{}});
  const oldSeeds=new Set(row.state.seeds.map(x=>x.id));
  assert.ok(row.state.seeds.every(x=>after.seeds.some(y=>y.id===x.id)));
  const extra=after.seeds.filter(x=>!oldSeeds.has(x.id));
  assert.ok(extra.length<=1&&extra.every(x=>x.species==='strawberry'&&x.genes.length===0&&!x.bred),'Only the existing daily free strawberry seed may be added');
  assert.deepEqual(after.produce.map(x=>x.id),row.state.produce.map(x=>x.id));
  assert.equal(after.plots.filter(Boolean).length,row.state.plots.filter(Boolean).length);
  core.validateGarden(gardens.data.people[id].state);count++;
}
const restart=new Gardens(directory+'/gardens.json',contacts);
assert.equal(Object.keys(restart.data.people).length,count);
console.log(JSON.stringify({ok:true,migratedGardens:count,coinsAndInventoryPreserved:true,restart:true}));
