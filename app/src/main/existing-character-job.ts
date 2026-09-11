import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { Job, ACTION_IDS, actionSpec, type ActionId, type JobState, type Manifest } from '@qbot/pipeline';
import type { StickerManifest } from '../shared/sticker-behavior';
import { saveLibraryManifest } from './sticker-library';

/** Imported/shared characters have assets, but intentionally no original generation job. */
export async function loadExistingCharacterJob(outDir: string): Promise<Job> {
  const stateFile = path.join(outDir, '.job', 'state.json');
  try { await access(stateFile); return await Job.load(outDir); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  const m: Manifest = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'));
  await access(path.join(outDir, m.sourceImage || 'source.png'));
  const state: JobState = {
    jobId: m.id, pipelineVersion: '1', tier: 'S', createdAt: m.createdAt,
    stage: 'actions', refImage: m.sourceImage || 'source.png',
    turnaround: { candidates: [], picked: null },
    actions: Object.fromEntries(ACTION_IDS.map(id => [id, { status: 'pending', attempts: { frame: 0, video: 0 } }])) as JobState['actions'],
  };
  await mkdir(path.dirname(stateFile), { recursive: true });
  // Never replace an existing record (including corrupt records and paid task IDs).
  await writeFile(stateFile, JSON.stringify(state, null, 2), { flag: 'wx' });
  return Job.load(outDir);
}

/** Re-generation is a patch, not initial packaging: keep unselected aliases and metadata. */
export async function mergeRegeneratedActions(job: Job, selected: ActionId[]): Promise<void> {
  const file = path.join(job.outDir, 'manifest.json');
  const m: StickerManifest = JSON.parse(await readFile(file, 'utf8'));
  const failed: string[] = [];
  for (const id of selected) {
    if (job.state.actions[id]?.status !== 'done') { failed.push(id); continue; }
    await access(path.join(job.outDir, 'actions', `${id}.webm`));
    m.actions[id] = { ...m.actions[id], webm: `actions/${id}.webm`, gif: `actions/${id}.gif`,
      durationSec: actionSpec(id).durationSec, status: 'done' };
    if (m.stickerLibrary) {
      const key = `generated_${id}`;
      const previous = m.stickerLibrary.scenes[id];
      m.customActions = { ...m.customActions, [key]: { ...m.actions[id] } };
      m.stickerLibrary.variants = { ...m.stickerLibrary.variants, [key]: {
        description: `${({idle:'待机',drag:'拖拽',sleep:'睡觉',tea:'放松',wave:'招呼',talk_happy:'开心',talk_annoyed:'不高兴'} as Record<string,string>)[id] ?? id} · 重新生成`, enabled: true,
      } };
      m.stickerLibrary.scenes[id] = key;
      if (id === 'idle') m.stickerLibrary.idleCandidates = [...new Set([key, ...(m.stickerLibrary.idleCandidates ?? []).filter(v => v !== previous)])];
    }
  }
  await saveLibraryManifest(file, m);
  if (failed.length) {
    const error = `这些动作未生成成功，原动作已保留，可重试：${failed.join('、')}`;
    await job.setStage('failed', { error });
    throw new Error(error);
  }
  await job.setStage('done');
}
