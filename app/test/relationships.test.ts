import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
vi.mock('electron',()=>({app:{getPath:()=>''}}));
import { RelationshipStore, localPerson, peerPerson } from '../src/main/relationships';
import { EMPTY_RELATIONSHIP_SETTINGS, relationshipStage } from '../src/shared/relationships';
let dir: string, store: RelationshipStore;
const a=localPerson({dirId:'a',manifest:{name:'小青'}}), b=localPerson({dirId:'b',manifest:{name:'小白'}});
beforeEach(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'qbot-rel-'));const file=path.join(dir,'relationships.json');store=new RelationshipStore(()=>file);});
afterEach(async()=>{await rm(dir,{recursive:true,force:true});});
describe('relationship ledger',{timeout:30000},()=>{
  it('serializes concurrent interactions and deduplicates repeats across restart and reverse perspectives',async()=>{
    await Promise.all(Array.from({length:20},(_,i)=>store.record(a,b,'tea',String(i))));
    store=new RelationshipStore(()=>path.join(dir,'relationships.json'));
    await store.record(b,a,'tea','0');
    const snapshot=await store.snapshot();expect(snapshot.relationships).toHaveLength(1);
    expect(snapshot.relationships[0]).toMatchObject({points:100,count:20});
    expect(relationshipStage(100).label).toBe('相处投契');
  });
  it('keeps directional settings while both local characters share growth',async()=>{
    await store.remember([a,b]);
    await store.save(a.id,b.id,{...EMPTY_RELATIONSHIP_SETTINGS,nickname:'宝宝',label:'搭档'});
    await store.save(b.id,a.id,{...EMPTY_RELATIONSHIP_SETTINGS,nickname:'前辈'});
    await store.record(b,a,'heart','first');
    const rel=(await store.snapshot()).relationships[0];
    expect(rel.settings[a.id].nickname).toBe('宝宝');expect(rel.settings[b.id].nickname).toBe('前辈');expect(rel.points).toBe(5);
  });
  it('does not identify friends by display name or mutable asset hash',async()=>{
    const old=peerPerson({dirId:'.peer-old',manifest:{id:'character',name:'同名'}},'owner','realm');
    const updated=peerPerson({dirId:'.peer-new',manifest:{id:'character',name:'改名'}},'owner','realm');
    expect(old.id).toBe(updated.id);
    expect(peerPerson({dirId:'.peer-new',manifest:{id:'other',name:'同名'}},'owner','realm').id).not.toBe(old.id);
    expect(peerPerson({dirId:'.peer-new',manifest:{id:'character',name:'同名'}},'another','realm').id).not.toBe(old.id);
    await store.record(a,old,'wave','one');await store.record(a,updated,'wave','two');
    expect((await store.snapshot()).relationships[0].points).toBe(10);
    expect((await store.snapshot()).people.find(p=>p.id===old.id)?.name).toBe('改名');
  });
  it('rejects self interactions, invalid settings and corrupt files without overwriting them',async()=>{
    await expect(store.record(a,a,'tea','self')).rejects.toThrow();
    await store.remember([a,b]);
    await expect(store.save(a.id,b.id,{...EMPTY_RELATIONSHIP_SETTINGS,note:'a'.repeat(501)})).rejects.toThrow();
    await writeFile(path.join(dir,'relationships.json'),'broken');
    await expect(store.record(a,b,'tea','new')).rejects.toThrow();
  });
  it('caps the visible timeline without forgetting transaction receipts or cumulative affection',async()=>{
    for(let i=0;i<35;i++)await store.record(a,b,'chat',String(i));
    await store.record(a,b,'chat','0');
    const rel=(await store.snapshot()).relationships[0];expect(rel.count).toBe(35);expect(rel.memories).toHaveLength(30);expect(rel.points).toBe(175);
  });
});
