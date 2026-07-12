/**
 * pipeline-bridge：唯一 import @qbot/pipeline 的地方。
 * hatch IPC ↔ Job 事件的桥；三视图挑选 hook 挂成 pending Promise 等 IPC 解析。
 */
import { webContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  Job,
  runPipeline,
  runActions,
  runPackage,
  createArkClient,
  resolveFfmpegPath,
  ACTION_IDS,
  type CharacterForm,
  type CharacterStyle,
  type ImageProvider,
  type PipelineConfig,
  type ProgressEvent,
} from '@qbot/pipeline';
import { charactersDir } from './characters';
import { getSettings } from './config';
import { rebuildTray } from './tray';

interface ActiveHatch {
  dirId: string;
  job: Job;
  /** awaiting_pick 时挂起的 resolver；IPC pickTurnaround 调用它 */
  pickResolver: ((index: number) => void) | null;
  lastCandidates: string[];
}

const active = new Map<string, ActiveHatch>();

function broadcast(dirId: string, ev: ProgressEvent, candidates?: string[]): void {
  const payload = {
    ...ev,
    dirId,
    candidateUrls: candidates?.map(
      (abs) =>
        // 候选图在角色目录内（.job/xxx.png）→ 转 qbot-asset URL
        `qbot-asset://${dirId}/${path.relative(path.join(charactersDir(), dirId), abs).split(path.sep).join('/')}`,
    ),
  };
  for (const wc of webContents.getAllWebContents()) {
    wc.send('hatch:progress', payload);
  }
}

async function buildConfig(): Promise<PipelineConfig> {
  const settings = await getSettings();
  if (!settings.arkApiKey) throw new Error('未配置 API key（托盘 → 设置）');
  const ffmpegPath = await resolveFfmpegPath();
  return {
    apiKey: settings.arkApiKey,
    gptImageApiKey: settings.gptImageApiKey,
    // 打包后 ffmpeg-static 在 asar 里不可执行 → 换 unpacked 路径
    ffmpegPath: ffmpegPath.replace('app.asar', 'app.asar.unpacked'),
  };
}

function runJob(dirId: string, job: Job): void {
  const entry: ActiveHatch = { dirId, job, pickResolver: null, lastCandidates: [] };
  active.set(dirId, entry);
  job.on('progress', (ev: ProgressEvent) => {
    if (ev.stage === 'awaiting_pick' && ev.candidates) {
      entry.lastCandidates = ev.candidates;
      broadcast(dirId, ev, ev.candidates);
    } else {
      broadcast(dirId, ev);
    }
  });

  void (async () => {
    try {
      const cfg = await buildConfig();
      await runPipeline(job, cfg, {
        pickCandidate: (candidatePaths) =>
          new Promise<number>((resolve) => {
            entry.lastCandidates = candidatePaths;
            entry.pickResolver = (idx) => {
              entry.pickResolver = null;
              resolve(idx);
            };
            // 事件可能早于渲染进程订阅，pick 屏会主动查询，双保险再广播一次
            broadcast(
              dirId,
              { jobId: job.state.jobId, stage: 'awaiting_pick', candidates: candidatePaths },
              candidatePaths,
            );
          }),
      });
      broadcast(dirId, { jobId: job.state.jobId, stage: 'done' });
      await rebuildTray(); // 新角色已有 manifest → 出现在「切换角色」列表
    } catch (err) {
      broadcast(dirId, {
        jobId: job.state.jobId,
        stage: 'failed',
        error: String(err instanceof Error ? err.message : err),
      });
    } finally {
      active.delete(dirId);
    }
  })();
}

/** 丢图开始孵化：新建角色目录 + job，返回 dirId */
export async function startHatch(
  refImagePath: string,
  imageProvider?: ImageProvider,
  characterForm?: CharacterForm,
  characterStyle?: CharacterStyle,
): Promise<string> {
  if (imageProvider === 'gpt-image-2' && !(await getSettings()).gptImageApiKey) {
    throw new Error('未配置 gpt-image-2 API key（托盘 → 设置）');
  }
  const dirId = randomUUID();
  const outDir = path.join(charactersDir(), dirId);
  await mkdir(outDir, { recursive: true });
  const job = await Job.create(outDir, { refImagePath, imageProvider, characterForm, characterStyle });
  runJob(dirId, job);
  return dirId;
}

/** 续跑未完成的孵化（断点续跑） */
export async function resumeHatch(dirId: string): Promise<void> {
  if (active.has(dirId)) return; // 已在跑
  const outDir = path.join(charactersDir(), dirId);
  const job = await Job.load(outDir);
  runJob(dirId, job);
}

/** 三视图挑选（index=-1 重新生成一轮） */
export function pickTurnaround(dirId: string, index: number): void {
  const entry = active.get(dirId);
  if (!entry) throw new Error(`no active hatch for ${dirId}`);
  if (!entry.pickResolver) throw new Error('not awaiting pick');
  entry.pickResolver(index);
}

/** 重试失败动作：重置 failed → pending，走 runActions + runPackage（同 CLI redo） */
export async function redoFailed(dirId: string): Promise<void> {
  if (active.has(dirId)) return; // 已在跑
  const outDir = path.join(charactersDir(), dirId);
  const job = await Job.load(outDir);
  const failed = ACTION_IDS.filter((id) => job.state.actions[id]?.status === 'failed');
  if (!failed.length) return;
  for (const id of failed) {
    job.state.actions[id] = { status: 'pending', attempts: { frame: 0, video: 0 } };
  }
  await job.save();

  const entry: ActiveHatch = { dirId, job, pickResolver: null, lastCandidates: [] };
  active.set(dirId, entry);
  job.on('progress', (ev: ProgressEvent) => broadcast(dirId, ev));
  try {
    const cfg = await buildConfig();
    // 沿用 job 创建时选定的生图后端
    if (job.state.imageProvider) cfg.imageProvider = job.state.imageProvider;
    const ffmpegPath = await resolveFfmpegPath(cfg.ffmpegPath);
    await runActions(job, createArkClient(cfg), ffmpegPath);
    await runPackage(job);
    broadcast(dirId, { jobId: job.state.jobId, stage: 'done' });
    await rebuildTray();
  } catch (err) {
    broadcast(dirId, {
      jobId: job.state.jobId,
      stage: 'failed',
      error: String(err instanceof Error ? err.message : err),
    });
  } finally {
    active.delete(dirId);
  }
}
