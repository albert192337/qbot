import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { requestProgressReset, applyPendingProgressReset } from '../src/main/reset-progress-storage';
let dir: string;
beforeEach(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'qbot-reset-'));});
afterEach(async()=>{await rm(dir,{recursive:true,force:true});});
describe('restart-bound local progress reset',()=>{
 it('backs up exact originals, resets assets and fallbacks, preserves identity/settings',async()=>{
  await writeFile(path.join(dir,'garden-demo.json'),'old garden bytes');
  await writeFile(path.join(dir,'progress.json'),'{"points":99999}');
  await writeFile(path.join(dir,'progress.json.bak'),'{"points":88888}');
  await writeFile(path.join(dir,'room-decor.json'),'{"room":[{"stickerId":"old"}]}');
  await writeFile(path.join(dir,'config.json'),JSON.stringify({activeCharacter:'pet',gardenOnline:true,volume:42}));
  await writeFile(path.join(dir,'user-memory.json'),'untouched');
  const backup=await requestProgressReset(dir);
  expect(await readFile(path.join(dir,'garden-demo.json'),'utf8')).toBe('old garden bytes');
  expect(await applyPendingProgressReset(dir)).toBe(backup);
  const original=JSON.parse(await readFile(path.join(backup,'originals.json'),'utf8'));
  expect(original['garden-demo.json']).toBe('old garden bytes');
  expect(original['progress.json.bak']).toBe('{"points":88888}');
  const garden=JSON.parse(await readFile(path.join(dir,'garden-demo.json'),'utf8')).state;
  expect(garden.coins).toBe(180);expect(garden.plots.every((p:unknown)=>p===null)).toBe(true);
  expect(garden.life.characters.pet.xp).toBe(0);
  const p=JSON.parse(await readFile(path.join(dir,'progress.json'),'utf8'));expect(p.inventory).toEqual({});expect(p.points).toBeLessThan(99999);
  expect(await readFile(path.join(dir,'progress.json.bak'),'utf8')).toBe(JSON.stringify(p));
  expect(JSON.parse(await readFile(path.join(dir,'config.json'),'utf8'))).toEqual({activeCharacter:'pet',gardenOnline:false,volume:42});
  expect(await readFile(path.join(dir,'user-memory.json'),'utf8')).toBe('untouched');
  expect(await applyPendingProgressReset(dir)).toBe(null);
 });
 it('does nothing without a user request',async()=>{expect(await applyPendingProgressReset(dir)).toBe(null)});
 it('resumes a persisted plan without replacing the original backup',async()=>{
  const backup=await requestProgressReset(dir);await applyPendingProgressReset(dir);
  const original=await readFile(path.join(backup,'originals.json'),'utf8');
  await writeFile(path.join(dir,'garden-demo.json'),'partially written');
  await writeFile(path.join(dir,'pending-progress-reset.json'),JSON.stringify({id:path.basename(backup)}));
  await applyPendingProgressReset(dir);
  expect(await readFile(path.join(backup,'originals.json'),'utf8')).toBe(original);
  expect(JSON.parse(await readFile(path.join(dir,'garden-demo.json'),'utf8')).state.coins).toBe(180);
 });
 it('fails before touching saves when a backup source cannot be read',async()=>{
  await writeFile(path.join(dir,'garden-demo.json'),'precious');await mkdir(path.join(dir,'progress.json'));
  await requestProgressReset(dir);await expect(applyPendingProgressReset(dir)).rejects.toThrow();
  expect(await readFile(path.join(dir,'garden-demo.json'),'utf8')).toBe('precious');
 });
});
