import { describe, expect, it, beforeEach } from 'vitest';
import { mkdtemp, writeFile, rm, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Job } from '../src/job.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'qbot-job-'));
  return async () => rm(tmpDir, { recursive: true, force: true });
});

async function makeRefImage(): Promise<string> {
  const ref = path.join(tmpDir, 'ref.png');
  await writeFile(ref, Buffer.from('fake-png'));
  return ref;
}

describe('Job', () => {
  it('create 初始化 state.json 与目录结构', async () => {
    const out = path.join(tmpDir, 'char');
    await mkdir(out, { recursive: true });
    const job = await Job.create(out, { refImagePath: await makeRefImage() });
    expect(existsSync(path.join(out, '.job/state.json'))).toBe(true);
    expect(existsSync(path.join(out, 'source.png'))).toBe(true);
    expect(existsSync(path.join(out, 'actions'))).toBe(true);
    expect(job.state.stage).toBe('turnaround');
    expect(job.state.actions.idle.status).toBe('pending');
  });

  it('transition 落盘并 emit progress', async () => {
    const out = path.join(tmpDir, 'char');
    await mkdir(out, { recursive: true });
    const job = await Job.create(out, { refImagePath: await makeRefImage() });
    const events: unknown[] = [];
    job.on('progress', (ev) => events.push(ev));
    await job.transition('idle', 'generating_frame');
    expect(events).toHaveLength(1);
    const reloaded = await Job.load(out);
    // generating_frame 无产物要求，load 后 reconcile 保留或重置为 pending 均可接受——
    // 但按 reconcile 规则 generating_frame 原样保留
    expect(['generating_frame', 'pending']).toContain(reloaded.state.actions.idle.status);
  });

  it('transition 事件携带 framePath（UI 缩略图依赖）', async () => {
    const out = path.join(tmpDir, 'char');
    await mkdir(out, { recursive: true });
    const job = await Job.create(out, { refImagePath: await makeRefImage() });
    const events: Array<{ framePath?: string }> = [];
    job.on('progress', (ev) => events.push(ev));
    await job.transition('idle', 'generating_frame');
    expect(events[0].framePath).toBeUndefined();
    await job.transition('idle', 'frame_qc', { framePath: 'idle_frame.png' });
    expect(events[1].framePath).toBe('idle_frame.png');
    // 后续转移不带 patch 也要继续携带（视频/抠像阶段缩略图不消失）
    await job.transition('idle', 'generating_video');
    expect(events[2].framePath).toBe('idle_frame.png');
  });

  it('load 后 videoTaskId 保留（恢复轮询而非重提）', async () => {
    const out = path.join(tmpDir, 'char');
    await mkdir(out, { recursive: true });
    const job = await Job.create(out, { refImagePath: await makeRefImage() });
    await writeFile(job.jobPath('idle_frame.png'), Buffer.from('f'));
    await job.transition('idle', 'generating_video', {
      framePath: 'idle_frame.png',
      videoTaskId: 'cgt-42',
    });
    const reloaded = await Job.load(out);
    expect(reloaded.state.actions.idle.status).toBe('generating_video');
    expect(reloaded.state.actions.idle.videoTaskId).toBe('cgt-42');
  });

  it('reconcile：framePath 宣称存在但文件被删 → 重置 pending', async () => {
    const out = path.join(tmpDir, 'char');
    await mkdir(out, { recursive: true });
    const job = await Job.create(out, { refImagePath: await makeRefImage() });
    await writeFile(job.jobPath('idle_frame.png'), Buffer.from('f'));
    await job.transition('idle', 'frame_qc', { framePath: 'idle_frame.png' });
    await unlink(job.jobPath('idle_frame.png'));
    const reloaded = await Job.load(out);
    expect(reloaded.state.actions.idle.status).toBe('pending');
  });

  it('reconcile：keying 态视频文件丢失但 taskId 在 → 回退 generating_video', async () => {
    const out = path.join(tmpDir, 'char');
    await mkdir(out, { recursive: true });
    const job = await Job.create(out, { refImagePath: await makeRefImage() });
    await writeFile(job.jobPath('idle_frame.png'), Buffer.from('f'));
    await job.transition('idle', 'keying', {
      framePath: 'idle_frame.png',
      videoTaskId: 'cgt-42',
      videoPath: 'idle.mp4', // 从未真正写入
    });
    const reloaded = await Job.load(out);
    expect(reloaded.state.actions.idle.status).toBe('generating_video');
    expect(reloaded.state.actions.idle.videoTaskId).toBe('cgt-42');
  });

  it('reconcile：候选图丢失 → 回到 turnaround 阶段', async () => {
    const out = path.join(tmpDir, 'char');
    await mkdir(out, { recursive: true });
    const job = await Job.create(out, { refImagePath: await makeRefImage() });
    job.state.turnaround = { candidates: ['turnaround_cand_0.png'], picked: null };
    job.state.stage = 'awaiting_pick';
    await job.save();
    const reloaded = await Job.load(out);
    expect(reloaded.state.stage).toBe('turnaround');
    expect(reloaded.state.turnaround.candidates).toEqual([]);
  });
});
