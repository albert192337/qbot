import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const state = vi.hoisted(() => ({ dir: '' }));
vi.mock('electron', () => ({ app: { getPath: () => state.dir } }));
import { deleteGenerationTask, restoreGenerationTask, listCharacters } from '../src/main/characters';
beforeEach(async () => {
  state.dir = await mkdtemp(path.join(tmpdir(), 'qbot-task-test-'));
  await mkdir(path.join(state.dir, 'characters', 'pet', '.job'), { recursive: true });
  await writeFile(path.join(state.dir, 'characters', 'pet', '.job', 'state.json'), '{}');
});
afterEach(async () => { await rm(state.dir, { recursive: true, force: true }); });
it('persists removal across list refreshes and preserves resumable state and assets', async () => {
  const asset = path.join(state.dir, 'characters', 'pet', 'source.png');
  await writeFile(asset, 'image');
  await deleteGenerationTask('pet');
  await deleteGenerationTask('pet');
  expect((await listCharacters())[0]).toMatchObject({ taskDismissed: true, hasUnfinishedJob: true });
  expect(await readFile(asset, 'utf8')).toBe('image');
  expect(await readFile(path.join(state.dir, 'characters', 'pet', '.job', 'state.json'), 'utf8')).toBe('{}');
  await restoreGenerationTask('pet');
  expect((await listCharacters())[0].taskDismissed).toBe(false);
});
it('rejects invalid IDs and does not recreate missing characters', async () => {
  for (const id of ['', '..', '../pet', 'a/b', 'a\\b']) {
    await expect(deleteGenerationTask(id)).rejects.toThrow();
  }
  await expect(deleteGenerationTask('missing')).rejects.toThrow();
});
it('keeps a completed cloud character discoverable until claimed, without losing its manifest', async () => {
  const dir = path.join(state.dir, 'characters', 'pet');
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify({id:'pet',name:'Cloud pet',actions:{},voice:{pack:'soft',pitchScale:1,rateScale:1}}));
  await writeFile(path.join(dir, '.cloud-job.json'), JSON.stringify({phase:'done'}));
  expect((await listCharacters())[0].hasUnfinishedJob).toBe(true);
  await writeFile(path.join(dir, '.cloud-job.json'), JSON.stringify({phase:'done',acknowledged:true}));
  expect((await listCharacters())[0]).toMatchObject({hasUnfinishedJob:false,manifest:{name:'Cloud pet'}});
});

it('lists a local action job even when the old character remains playable', async () => {
  const dir=path.join(state.dir,'characters','pet');
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({id:'pet',name:'Existing',actions:{},voice:{pack:'soft',pitchScale:1,rateScale:1}}));
  await writeFile(path.join(dir,'.job/state.json'),JSON.stringify({stage:'actions',regenerateActions:['idle']}));
  expect((await listCharacters())[0].hasUnfinishedJob).toBe(true);
  await writeFile(path.join(dir,'.job/state.json'),JSON.stringify({stage:'done',regenerateActions:['idle']}));
  expect((await listCharacters())[0].hasUnfinishedJob).toBe(false);
});
