/**
 * 五阶段编排：turnaround → (人工挑选) → 每动作 frame→qc→video→keying → package。
 * - 每动作独立异步链，Promise.allSettled 并发，单动作失败不阻塞其他
 * - hooks.pickCandidate 抽象人工挑选：CLI 传 readline，app 传 IPC pending Promise
 * - 打包门槛：done ≥4 且必含 idle+drag（spec §2 Stage 5）
 */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createArkClient, toDataUrl, type ArkClient } from './ark.js';
import {
  computeAlphaStats,
  normalizeFilter,
  probeSize,
  resolveFfmpegPath,
  sampleBackgroundColors,
  sampleKeyColor,
  toGif,
  toWebm,
} from './chroma.js';
import { framePrompt, turnaroundPrompt, videoPrompt, ACTIONS } from './prompts.js';
import { checkGreenFrame, checkVideoDrift, selectChromaKey } from './qc.js';
import { Job } from './job.js';
import {
  ACTION_IDS,
  ArkApiError,
  IMAGE_SIZES,
  type ActionId,
  type Manifest,
  type ManifestAction,
  type PipelineConfig,
} from './types.js';

const TURNAROUND_CANDIDATES = 3;
const FRAME_MAX_ATTEMPTS = 2; // 帧 QC 不过自动重试 1 次
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;
/** 打包门槛：≥4 动作成功且必含这两个 */
const REQUIRED_ACTIONS: ActionId[] = ['idle', 'drag'];
const MIN_DONE_ACTIONS = 4;

export interface PipelineHooks {
  /**
   * 三视图人工挑选（全流程唯一人工交互点）。
   * 收到候选绝对路径数组，返回选中下标；返回 -1 表示重新生成一轮。
   */
  pickCandidate?: (candidatePaths: string[]) => Promise<number>;
  /** 测试注入用 */
  arkClient?: ArkClient;
  /** 测试注入用：跳过真实 sleep */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Stage 1：生成三视图候选（同 prompt 并发 3 次独立请求） */
export async function runTurnaround(job: Job, ark: ArkClient): Promise<string[]> {
  await job.setStage('turnaround');
  const refPng = await readFile(path.join(job.outDir, job.state.refImage));
  // 重新生成三视图时 manifest 已存在，可能带全文覆盖；初次孵化时读不到，走模板
  let turnaroundFull: string | undefined;
  try {
    const raw = await readFile(path.join(job.outDir, 'manifest.json'), 'utf8');
    turnaroundFull = (JSON.parse(raw) as Manifest).turnaroundPromptFull;
  } catch {
    // 初次孵化：manifest 尚未写出
  }
  const prompt = turnaroundPrompt(
    undefined,
    job.state.characterForm,
    job.state.characterStyle,
    turnaroundFull,
  );
  const buffers = await Promise.all(
    Array.from({ length: TURNAROUND_CANDIDATES }, () =>
      ark.generateImage({
        prompt,
        refImageDataUrl: toDataUrl(refPng),
        size: IMAGE_SIZES.turnaround,
      }),
    ),
  );
  const rels: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const rel = `turnaround_cand_${i}.png`;
    await writeFile(job.jobPath(rel), buffers[i]);
    rels.push(rel);
  }
  job.state.turnaround = { candidates: rels, picked: null };
  await job.setStage('awaiting_pick', {
    candidates: rels.map((r) => job.jobPath(r)),
  });
  return rels;
}

/** 人工挑选落盘：把选中候选复制为资产包根目录 turnaround.png */
export async function pickTurnaround(job: Job, index: number): Promise<void> {
  const rel = job.state.turnaround.candidates[index];
  if (!rel) throw new Error(`invalid turnaround index: ${index}`);
  job.state.turnaround.picked = index;
  await copyFile(job.jobPath(rel), path.join(job.outDir, 'turnaround.png'));
  await job.save();
}

/**
 * Stage 4 抠像转码（runAction 与 CLI rekey 共用）：绿幕 mp4 → 透明 webm/gif 资产。
 * key 色 = 首/尾帧 8 点背景采样中最饱和的亮绿（chromakey 对亮度不敏感，
 * 一个高色度 key 覆盖写实绿幕的全部光照渐变与颗粒），无绿样本时回退左上角单点。
 * 不改动作状态，只更新 keyColors。
 */
export async function keyActionVideo(
  job: Job,
  action: ActionId,
  ffmpegPath: string,
): Promise<void> {
  const a = job.state.actions[action];
  const videoAbs = job.jobPath(a.videoPath!);
  const drift = await checkVideoDrift(videoAbs, ffmpegPath);
  if (drift.fail) {
    throw new Error(`background drift ${drift.maxDrift}/255 exceeds limit, video unusable`);
  }
  const chromaKey = selectChromaKey(await sampleBackgroundColors(videoAbs, ffmpegPath));
  const keys = [chromaKey ?? (await sampleKeyColor(videoAbs, ffmpegPath))];
  a.keyColors = keys;
  await job.save();
  // 尺寸归一化：按 alpha 覆盖面积统一视觉大小、底边对齐（空内容跳过）
  const stats = await computeAlphaStats(videoAbs, keys, ffmpegPath);
  const size = await probeSize(videoAbs, ffmpegPath);
  const normVf = stats ? normalizeFilter(stats, size.width, size.height) : undefined;
  const webmAbs = path.join(job.outDir, 'actions', `${action}.webm`);
  const gifAbs = path.join(job.outDir, 'actions', `${action}.gif`);
  await toWebm(videoAbs, webmAbs, keys, ffmpegPath, normVf);
  await toGif(videoAbs, gifAbs, keys, ffmpegPath, normVf);
}

/** 单动作完整链：frame → qc → video 提交 → 轮询 → 下载 → keying → 资产落盘 */
async function runAction(
  job: Job,
  ark: ArkClient,
  action: ActionId,
  ffmpegPath: string,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const a = job.state.actions[action];
  const turnaroundPng = await readFile(path.join(job.outDir, 'turnaround.png'));

  // 读取自定义 prompt（poseDesc/motionDesc + 全文覆盖）与人设
  // （初次生成时 manifest 尚未写出，redo/重新生成时已有）
  let persona: string | undefined;
  let customPoseDesc: string | undefined;
  let customMotionDesc: string | undefined;
  let framePromptFull: string | undefined;
  let videoPromptFull: string | undefined;
  try {
    const manifestRaw = await readFile(path.join(job.outDir, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw) as Manifest;
    persona = manifest.persona;
    const custom = manifest.actions[action];
    customPoseDesc = custom?.poseDesc;
    customMotionDesc = custom?.motionDesc;
    framePromptFull = custom?.framePromptFull;
    videoPromptFull = custom?.videoPromptFull;
  } catch {
    // manifest 不存在 → 初次生成，无自定义 prompt
  }

  try {
    // ── Stage 2: 绿幕首帧（QC 不过自动重试 1 次）─────────────────
    if (!a.framePath || a.status === 'pending' || a.status === 'generating_frame') {
      let framePassed = false;
      while (!framePassed && a.attempts.frame < FRAME_MAX_ATTEMPTS) {
        await job.transition(action, 'generating_frame', {
          attempts: { ...a.attempts, frame: a.attempts.frame + 1 },
        });
        const frameBuf = await ark.generateImage({
          prompt: framePrompt(action, undefined, job.state.characterForm, job.state.characterStyle, persona, customPoseDesc, framePromptFull),
          refImageDataUrl: toDataUrl(turnaroundPng),
          size: IMAGE_SIZES.frame,
        });
        const frameRel = `${action}_frame.png`;
        await writeFile(job.jobPath(frameRel), frameBuf);
        await job.transition(action, 'frame_qc', { framePath: frameRel });
        const qc = await checkGreenFrame(job.jobPath(frameRel), ffmpegPath);
        if (qc.pass) {
          framePassed = true;
          a.frameQcPass = true;
          await job.save();
        } else if (a.attempts.frame >= FRAME_MAX_ATTEMPTS) {
          throw new Error(`frame QC failed after ${a.attempts.frame} attempts: ${qc.reason}`);
        }
      }
    }

    // ── Stage 3: 循环视频（taskId 提交成功立刻落盘，重启恢复轮询不重提）──
    if (!a.videoPath) {
      if (!a.videoTaskId) {
        await job.transition(action, 'generating_video', {
          attempts: { ...a.attempts, video: a.attempts.video + 1 },
        });
        const frameBuf = await readFile(job.jobPath(a.framePath!));
        const taskId = await ark.submitVideoTask({
          prompt: videoPrompt(action, undefined, job.state.characterForm, job.state.characterStyle, persona, customMotionDesc, videoPromptFull),
          frameDataUrl: toDataUrl(frameBuf),
        });
        await job.transition(action, 'generating_video', { videoTaskId: taskId });
      } else {
        await job.transition(action, 'generating_video');
      }
      // 轮询（每动作自己的 loop：6 个任务完成时间差异大）
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      let videoUrl: string | undefined;
      for (;;) {
        const t = await ark.getVideoTask(a.videoTaskId!);
        if (t.status === 'succeeded') {
          videoUrl = t.videoUrl;
          break;
        }
        if (t.status === 'failed') throw new Error(`video task failed: ${t.error}`);
        if (Date.now() > deadline) throw new Error('video task poll timeout (15min)');
        await sleep(POLL_INTERVAL_MS);
      }
      if (!videoUrl) throw new Error('video task succeeded but no video_url');
      const videoRel = `${action}.mp4`;
      await ark.downloadVideo(videoUrl, job.jobPath(videoRel));
      await job.transition(action, 'keying', { videoPath: videoRel });
    } else {
      await job.transition(action, 'keying');
    }

    // ── Stage 4: 抠像转码（多点采样多 key，keyActionVideo 内含判废门槛）──
    await keyActionVideo(job, action, ffmpegPath);
    await job.transition(action, 'done');
  } catch (err) {
    const msg = err instanceof ArkApiError ? `[${err.status}] ${err.message}` : String(err);
    await job.transition(action, 'failed', { error: msg });
  }
}

/** Stage 2-4：全部动作并发推进 */
export async function runActions(
  job: Job,
  ark: ArkClient,
  ffmpegPath: string,
  sleep: (ms: number) => Promise<void> = defaultSleep,
): Promise<void> {
  await job.setStage('actions');
  const pending = ACTION_IDS.filter(
    (id) => job.state.actions[id].status !== 'done',
  );
  // failed 的动作在 resume 时重置重跑（用户主动续跑即视为要求重试）
  for (const id of pending) {
    if (job.state.actions[id].status === 'failed') {
      job.state.actions[id] = {
        status: 'pending',
        attempts: { frame: 0, video: 0 },
      };
    }
  }
  await job.save();
  await Promise.allSettled(
    pending.map((id) => runAction(job, ark, id, ffmpegPath, sleep)),
  );
}

/** Stage 5：门槛校验 + 写 manifest */
export async function runPackage(job: Job): Promise<Manifest> {
  await job.setStage('package');
  const s = job.state;
  const doneIds = ACTION_IDS.filter((id) => s.actions[id].status === 'done');
  const missingRequired = REQUIRED_ACTIONS.filter((id) => !doneIds.includes(id));
  if (doneIds.length < MIN_DONE_ACTIONS || missingRequired.length > 0) {
    await job.setStage('failed', {
      error:
        `package gate failed: ${doneIds.length}/${ACTION_IDS.length} done` +
        (missingRequired.length ? `, missing required: ${missingRequired.join(',')}` : ''),
    });
    throw new Error('package gate failed');
  }
  const manifest: Manifest = {
    id: s.jobId,
    name: '未命名',
    createdAt: s.createdAt,
    tier: s.tier,
    sourceImage: 'source.png',
    turnaround: 'turnaround.png',
    actions: Object.fromEntries(
      ACTION_IDS.map((id) => [
        id,
        {
          webm: `actions/${id}.webm`,
          gif: `actions/${id}.gif`,
          durationSec: ACTIONS[id].durationSec,
          status: s.actions[id].status === 'done' ? 'done' : 'failed',
          // 所有动作 prompt 都指定角色朝右（talk 显式写"朝向画面右侧"，其余从三视图自然右向）
          facing: 'right',
        } satisfies ManifestAction,
      ]),
    ) as Record<ActionId, ManifestAction>,
    pipelineVersion: '1',
  };
  await writeFile(
    path.join(job.outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  await job.setStage('done');
  return manifest;
}

/**
 * 全流程编排入口。CLI 与 app 共用。
 * resume 时根据 job.state.stage 跳过已完成阶段。
 */
export async function runPipeline(
  job: Job,
  cfg: PipelineConfig,
  hooks: PipelineHooks = {},
): Promise<Manifest> {
  // job 创建时选定的生图后端优先（resume/redo 沿用，避免中途换模型串风格）
  if (job.state.imageProvider) cfg = { ...cfg, imageProvider: job.state.imageProvider };
  const ark = hooks.arkClient ?? createArkClient(cfg);
  const ffmpegPath = await resolveFfmpegPath(cfg.ffmpegPath);
  const sleep = hooks.sleep ?? defaultSleep;

  // Stage 1 + 人工挑选（循环支持"都不满意，重新生成"）
  while (job.state.turnaround.picked === null) {
    if (job.state.turnaround.candidates.length === 0) {
      await runTurnaround(job, ark);
    } else {
      await job.setStage('awaiting_pick', {
        candidates: job.state.turnaround.candidates.map((r) => job.jobPath(r)),
      });
    }
    if (!hooks.pickCandidate) {
      throw new Error('pickCandidate hook required when turnaround not yet picked');
    }
    const idx = await hooks.pickCandidate(
      job.state.turnaround.candidates.map((r) => job.jobPath(r)),
    );
    if (idx === -1) {
      job.state.turnaround = { candidates: [], picked: null }; // 重新生成一轮
      await job.save();
    } else {
      await pickTurnaround(job, idx);
    }
  }

  await runActions(job, ark, ffmpegPath, sleep);
  return runPackage(job);
}
