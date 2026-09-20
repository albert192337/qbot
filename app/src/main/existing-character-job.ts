import { editManifest } from './manifest-store';
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { Job, ACTION_IDS, actionSpec, type ActionId, type JobState, type Manifest } from '@qbot/pipeline';
import type { StickerManifest } from '../shared/sticker-behavior';

/** Imported/shared characters have assets, but intentionally no original generation job. */
export async function loadExistingCharacterJob(outDir: string): Promise<Job> {
  const stateFile = path.join(outDir, '.job', 'state.json');
  try { await access(stateFile); const job = await Job.load(outDir);
    const m = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8')) as StickerManifest;
    if (m.stickerLibrary || m.generationMode === 'original') job.state.generationMode = 'original';
    return job; }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  const m: StickerManifest = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'));
  await access(path.join(outDir, m.sourceImage || 'source.png'));
  const state: JobState = {
    generationMode: m.stickerLibrary || m.generationMode === 'original' ? 'original' : undefined,
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
export async function mergeRegeneratedActions(job: Job, selected: ActionId[], finalize = true): Promise<void> {
  const file = path.join(job.outDir, 'manifest.json');
  const failed: string[] = [];
  await editManifest(file, async m => {
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
      if (m.scenePools?.[id]) m.scenePools[id] = [key, ...m.scenePools[id].filter(v => v !== previous && v !== key)];
      if (m.stickerLibrary.sceneCandidates?.[id]) m.stickerLibrary.sceneCandidates[id] = [key, ...m.stickerLibrary.sceneCandidates[id].filter(v => v !== previous && v !== key)];
      if (id === 'idle') m.stickerLibrary.idleCandidates = [...new Set([key, ...(m.stickerLibrary.idleCandidates ?? []).filter(v => v !== previous)])];
    }
  }
  });
  if (failed.length) {
    const error = `这些动作未生成成功，原动作已保留，可重试：${failed.join('、')}`;
    if (finalize) await job.setStage('failed', { error });
    throw new Error(error);
  }
  if (finalize) await job.setStage('done');
}
