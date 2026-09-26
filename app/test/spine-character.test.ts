import { describe,it,expect } from 'vitest';
import { readFile,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Manifest } from '@qbot/pipeline';
import { playableResources,scenePool } from '../src/shared/action-resources';
import { pairActions,choosePairAction,pairFlip } from '../src/shared/pair-interaction';
import { packCharacterDir,unpackCharacter } from '../src/main/asset-pack';

describe('realtime Spine presets',()=>{
 for(const id of ['spine-wuxie','spine-zhangqiling'])it(id+' supports semantic actions and private asset roundtrip',async()=>{
  const dir=path.resolve('resources/presets',id),m:Manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
  expect(Object.keys(playableResources(m))).toHaveLength(22);
  expect(pairActions(m).size).toBe(22);
  expect(scenePool(m,'garden_sow')).toEqual(['garden_sow']);
  for(const intent of ['heart','happy','tea','talk','listen','wave'] as const){
   const action=choosePairAction(m,intent)!;
   expect(m.spine!.actions[action.id]).toBeTruthy();
   expect(pairFlip(action.facing,'left')).not.toBe(pairFlip(action.facing,'right'));
  }
  const packed=await packCharacterDir(dir),dest=await mkdtemp(path.join(tmpdir(),'qbot-spine-pack-'));
  try{
   await unpackCharacter(packed.buffer,dest);
   const received=JSON.parse(await readFile(path.join(dest,'manifest.json'),'utf8'));
   expect(received.persona).toBeUndefined();expect(received.spine).toEqual(m.spine);
   for(const file of [m.spine!.skeleton,m.spine!.atlas,m.spine!.texture])expect((await readFile(path.join(dest,file))).equals(await readFile(path.join(dir,file)))).toBe(true);
  }finally{await rm(dest,{recursive:true,force:true});}
 },30000);
});
