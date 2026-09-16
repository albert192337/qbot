import { it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadExistingCharacterJob, mergeRegeneratedActions } from '../src/main/existing-character-job';
async function fixture(){
 const dir=await mkdtemp(path.join(os.tmpdir(),'qbot-imported-job-'));
 await mkdir(path.join(dir,'actions'));await writeFile(path.join(dir,'source.png'),'reference');
 const clip={webm:'actions/original.webm',gif:'imported/original.gif',status:'done'};
 const manifest={id:'dog',name:'小黄狗',createdAt:'2026-09-10',sourceImage:'source.png',actions:{idle:clip,drag:clip},customActions:{st_original:clip},stickerLibrary:{version:1,items:[{id:'st_original',name:'无聊'}],scenes:{idle:'st_original',drag:'st_original'},idleCandidates:['st_original']}};
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest));return {dir,manifest};
}
it('creates a missing job without replacing source or original manifest',async()=>{
 const {dir,manifest}=await fixture();const job=await loadExistingCharacterJob(dir);
 expect(job.state.generationMode).toBe('original');expect(job.state.jobId).toBe('dog');expect(job.state.refImage).toBe('source.png');
 expect(JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'))).toEqual(manifest);
 expect(await readFile(path.join(dir,'source.png'),'utf8')).toBe('reference');
 job.state.actions.idle={status:'failed',attempts:{frame:1,video:1},videoTaskId:'paid-task'};await job.save();
 delete job.state.generationMode;await job.save();
 expect((await loadExistingCharacterJob(dir)).state.generationMode).toBe('original');
 expect((await loadExistingCharacterJob(dir)).state.actions.idle.videoTaskId).toBe('paid-task');
});
it('merges only successful selected actions, retains library and refreshes the scene binding',async()=>{
 const {dir,manifest}=await fixture();const job=await loadExistingCharacterJob(dir);
 job.state.actions.idle.status='done';await writeFile(path.join(dir,'actions/idle.webm'),'new');
 await mergeRegeneratedActions(job,['idle']);
 const m=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
 expect(m.id).toBe('dog');expect(m.actions.drag).toEqual(manifest.actions.drag);
 expect(m.customActions.st_original).toEqual(manifest.customActions.st_original);
 expect(m.stickerLibrary.items).toEqual(manifest.stickerLibrary.items);
 expect(m.stickerLibrary.scenes.idle).toBe('generated_idle');expect(m.stickerLibrary.idleCandidates).toEqual(['generated_idle']);
 expect(m.actions.idle.webm).toBe('actions/idle.webm');
});
it('failed generation preserves the old playable action and corrupt jobs are not reset',async()=>{
 const {dir,manifest}=await fixture();const job=await loadExistingCharacterJob(dir);
 job.state.actions.idle.status='failed';await expect(mergeRegeneratedActions(job,['idle'])).rejects.toThrow('原动作已保留');
 expect(JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8')).actions).toEqual(manifest.actions);
 await writeFile(path.join(dir,'.job/state.json'),'corrupt');
 await expect(loadExistingCharacterJob(dir)).rejects.toThrow();
 expect(await readFile(path.join(dir,'.job/state.json'),'utf8')).toBe('corrupt');
});
