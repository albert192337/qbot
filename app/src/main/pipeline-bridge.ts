/**
 * pipeline-bridge：唯一 import @qbot/pipeline 的地方。
 * hatch IPC ↔ Job 事件的桥；三视图挑选 hook 挂成 pending Promise 等 IPC 解析。
 */
import { webContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  Job,
  runPipeline,
  runActions,
  runPackage,
  createArkClient,
  resolveFfmpegPath,
  sampleKeyColor,
  sampleBackgroundColors,
  selectDualKeys,
  checkVideoDrift,
  toWebm,
  toGif,
  computeAlphaStats,
  probeSize,
  normalizeFilter,
  createGptImageGenerator,
  turnaroundPrompt,
  framePrompt,
  videoPrompt,
  actionSpec,
  DEFAULT_CHARACTER_DESC,
  ACTION_IDS,
  EXPRESSION_ACTION_IDS,
  expressionActionSpec,
  type CharacterForm,
  type CharacterStyle,
  type ExpressionActionId,
  type ImageProvider,
  type JobState,
  type Manifest,
  type ManifestAction,
  type PipelineConfig,
  type PromptData,
  type ProgressEvent,
  type ActionId,
  type AgentActionConfig,
} from '@qbot/pipeline';
import type { HatchStatus } from '../shared/ipc-types';
import { charactersDir, getCharacter } from './characters';
import { getSettings } from './config';
import { broadcastCharacterActivated, getConsoleWindow } from './windows';
import { rebuildTray } from './tray';

interface ActiveHatch {
  dirId: string;
  job: Job;
  /** awaiting_pick 时挂起的 resolver；IPC pickTurnaround 调用它 */
  pickResolver: ((index: number) => void) | null;
  lastCandidates: string[];
}

const active = new Map<string, ActiveHatch>();

/** .job/ 内相对路径 → qbot-asset URL（协议服务整个角色目录，含 .job/） */
function jobAssetUrl(dirId: string, rel: string): string {
  return `qbot-asset://${dirId}/.job/${rel}`;
}

function broadcast(dirId: string, ev: ProgressEvent, candidates?: string[]): void {
  const payload = {
    ...ev,
    dirId,
    frameUrl: ev.framePath ? jobAssetUrl(dirId, ev.framePath) : undefined,
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

/** API key + ffmpeg 路径解析（打包后 asar 修正）。sticker-importer 也用它，故导出。 */
export async function buildConfig(): Promise<PipelineConfig> {
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

/**
 * 孵化状态快照：进度屏进入时铺底（新孵化/续跑/中途重开窗口），之后消费增量事件。
 * active 的读内存 state；不 active 的裸读 state.json（不走 Job.load，避免 reconcile 落盘副作用）。
 */
export async function getHatchStatus(dirId: string): Promise<HatchStatus | null> {
  let state: JobState;
  const entry = active.get(dirId);
  if (entry) {
    state = entry.job.state;
  } else {
    try {
      const raw = await readFile(
        path.join(charactersDir(), dirId, '.job', 'state.json'),
        'utf8',
      );
      state = JSON.parse(raw) as JobState;
    } catch {
      return null;
    }
  }
  return {
    stage: state.stage,
    imageProvider: state.imageProvider,
    candidateUrls:
      state.stage === 'awaiting_pick'
        ? state.turnaround.candidates.map((rel) => jobAssetUrl(dirId, rel))
        : undefined,
    actions: Object.fromEntries(
      ACTION_IDS.map((id) => {
        const a = state.actions[id];
        return [
          id,
          {
            status: a?.status ?? 'pending',
            frameUrl: a?.framePath ? jobAssetUrl(dirId, a.framePath) : undefined,
            error: a?.error,
          },
        ];
      }),
    ) as HatchStatus['actions'],
  };
}

/** 重试失败动作：重置 failed → pending，走 runActions + runPackage（同 CLI redo） */
export async function redoFailed(dirId: string): Promise<void> {
  const outDir = path.join(charactersDir(), dirId);
  const job = await Job.load(outDir);
  const failed = ACTION_IDS.filter((id) => job.state.actions[id]?.status === 'failed');
  if (!failed.length) return;
  await rerunActions(dirId, failed);
}

/**
 * 按 prompt 重新生成指定动作（**花钱**：每动作 1 次生图 + 1 条视频约 ¥1）。
 * 复用 runActions + runPackage，因此自动继承尺寸归一化与 manifest 回写。
 */
export async function regenerateActions(dirId: string, actionIds: ActionId[]): Promise<void> {
  const valid = actionIds.filter((id) => (ACTION_IDS as readonly string[]).includes(id));
  if (!valid.length) throw new Error('没有合法的动作 id');
  await rerunActions(dirId, valid);
}

/** 重置给定动作为 pending 后跑 runActions + runPackage */
async function rerunActions(dirId: string, actionIds: ActionId[]): Promise<void> {
  if (active.has(dirId)) throw new Error('该角色已有生成任务在跑，请等它结束');
  const outDir = path.join(charactersDir(), dirId);
  const job = await Job.load(outDir);
  for (const id of actionIds) {
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
    // 新资产落盘 → 让 pet 重建 Player
    const meta = await getCharacter(dirId);
    if (meta?.manifest && (await getSettings()).activeCharacter === dirId) {
      broadcastCharacterActivated(meta);
    }
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

/**
 * 重新生成三视图（**花钱且连带**：三视图是所有动作的参考图，换了必须重生全部 6 个动作，
 * 约 6 条视频）。复用 runPipeline 的「候选 → awaiting_pick → 挑图」循环，
 * 挑图界面就是现有的孵化窗。
 */
export async function regenerateTurnaround(dirId: string): Promise<void> {
  if (active.has(dirId)) throw new Error('该角色已有生成任务在跑，请等它结束');
  const outDir = path.join(charactersDir(), dirId);
  const job = await Job.load(outDir);
  // 清空已挑选的三视图 + 全部动作回 pending，让 runPipeline 从 Stage 1 重跑
  job.state.turnaround = { candidates: [], picked: null };
  for (const id of ACTION_IDS) {
    job.state.actions[id] = { status: 'pending', attempts: { frame: 0, video: 0 } };
  }
  await job.save();
  runJob(dirId, job); // 内部已挂 pickCandidate hook + 进度广播
}

// ── studio: prompt 全文编辑 ────────────────────────────────

/** 保存某动作的首帧/视频 prompt 全文覆盖（空串 = 清除覆盖，回退模板） */
export async function saveFullPrompts(
  dirId: string,
  actionId: string,
  framePromptFull: string,
  videoPromptFull: string,
): Promise<void> {
  const manifestPath = path.join(charactersDir(), dirId, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  const a = manifest.actions[actionId as ActionId];
  if (!a) throw new Error(`动作 "${actionId}" 不存在`);
  a.framePromptFull = framePromptFull.trim() || undefined;
  a.videoPromptFull = videoPromptFull.trim() || undefined;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

/** 保存三视图 prompt 全文覆盖（空串 = 清除覆盖） */
export async function saveTurnaroundPrompt(dirId: string, prompt: string): Promise<void> {
  const manifestPath = path.join(charactersDir(), dirId, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  manifest.turnaroundPromptFull = prompt.trim() || undefined;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

// ── studio: persona + custom actions ──────────────────────

/** 保存角色人设到 manifest.json */
export async function savePersona(dirId: string, persona: string): Promise<void> {
  const manifestPath = path.join(charactersDir(), dirId, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  manifest.persona = persona || undefined;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

/** 动作名合法字符：字母数字下划线或中文（用作文件名，禁路径分隔符与保留字符） */
const ACTION_NAME_RE = /^[\w一-鿿]+$/;

/** 读角色的 characterForm（M 档按形态取 prompt 变体；state.json 缺失回落人形） */
async function readCharacterForm(outDir: string): Promise<CharacterForm | undefined> {
  try {
    const raw = await readFile(path.join(outDir, '.job', 'state.json'), 'utf8');
    return (JSON.parse(raw) as JobState).characterForm;
  } catch {
    return undefined;
  }
}

/**
 * 生成 M 档表现力动作（spec 2026-08-21-expression-action-tier §6）。
 * 复用自定义动作管线（首帧→视频→抠像→webm/gif→回写 manifest→热重载），
 * prompt 取官方 EXPRESSION 表（非用户输入），落 manifest.expressionActions。
 * 幂等：已 done 的不重复生成（花钱）；pending/failed 视为可重试重生成。
 */

/**
 * 生成新动作的参考图：优先三视图（turnaround.png），
 * 老角色/市场导入角色没存三视图，回退到 source.png（首帧单图，足以当参考）。
 * 之前硬读 turnaround.png —— 缺它时任意自定义/表现力动作都 ENOENT 失败，
 * 这正是「M 档动作生成失败、可用列表里永远没有它们」的物理根因。
 */
async function readReferenceImage(outDir: string): Promise<Buffer> {
  for (const rel of ['turnaround.png', 'source.png']) {
    try {
      return await readFile(path.join(outDir, rel));
    } catch {
      // 继续尝试下一个
    }
  }
  throw new Error(`角色目录缺参考图（既无 turnaround.png 也无 source.png）：${outDir}`);
}
export async function generateExpressionAction(
  dirId: string,
  action: ExpressionActionId,
): Promise<void> {
  if (!EXPRESSION_ACTION_IDS.includes(action)) {
    throw new Error(`未知的 M 档动作：${action}`);
  }
  const outDir = path.join(charactersDir(), dirId);
  const manifestPath = path.join(outDir, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  if (manifest.expressionActions?.[action]?.status === 'done') {
    return; // 已生成，不重复花钱
  }

  // API key 等配置在返回前校验：detach 后的错误渲染层拿不到
  const cfg = await buildConfig();
  const form = await readCharacterForm(outDir);
  const spec = expressionActionSpec(action, form);

  // 写 manifest：标记 pending
  manifest.expressionActions = {
    ...manifest.expressionActions,
    [action]: {
      webm: `actions/${action}.webm`,
      gif: `actions/${action}.gif`,
      durationSec: spec.durationSec,
      status: 'pending',
    },
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  broadcastCustomAction(dirId, action, 'pending');

  // 后台生成（同 addCustomAction 的 detach 策略）
  void generateExpressionActionInner({
    dirId, outDir, manifestPath, action,
    poseDesc: spec.poseDesc,
    motionDesc: spec.motionDesc,
    durationSec: spec.durationSec,
    persona: manifest.persona,
    manifest, cfg,
  });
}

/** M 档生成流程：与 generateCustomAction 同一链路，只是回写 expressionActions */
async function generateExpressionActionInner(a: {
  dirId: string;
  outDir: string;
  manifestPath: string;
  action: ExpressionActionId;
  poseDesc: string;
  motionDesc: string;
  durationSec: number;
  persona?: string;
  manifest: Manifest;
  cfg: PipelineConfig;
}): Promise<void> {
  const { dirId, outDir, manifestPath, action, poseDesc, motionDesc, durationSec, persona, manifest, cfg } = a;
  try {
    const turnaround = await readReferenceImage(outDir);
    const ffmpegPath = await resolveFfmpegPath(cfg.ffmpegPath);
    const ark = createArkClient(cfg);

    const frameBuf = await ark.generateImage({
      prompt: buildCustomFramePrompt(poseDesc, manifest, persona),
      refImageDataUrl: toDataUrl(turnaround),
      size: '2048x2048',
    });
    const frameRel = `.job/${action}_frame.png`;
    await writeFile(path.join(outDir, frameRel), frameBuf);

    const taskId = await ark.submitVideoTask({
      prompt: buildCustomVideoPrompt(motionDesc, manifest, durationSec),
      frameDataUrl: toDataUrl(frameBuf),
    });
    const deadline = Date.now() + 15 * 60 * 1000;
    let videoUrl: string | undefined;
    for (;;) {
      const t = await ark.getVideoTask(taskId);
      if (t.status === 'succeeded') { videoUrl = t.videoUrl; break; }
      if (t.status === 'failed') throw new Error(`video task failed: ${t.error}`);
      if (Date.now() > deadline) throw new Error('video poll timeout');
      await new Promise(r => setTimeout(r, 5000));
    }
    const videoRel = `.job/${action}.mp4`;
    await ark.downloadVideo(videoUrl!, path.join(outDir, videoRel));

    // 抠像转码与 stages.ts keyActionVideo 同一套（理由见 generateCustomAction 注释）
    const videoAbs = path.join(outDir, videoRel);
    const drift = await checkVideoDrift(videoAbs, ffmpegPath);
    if (drift.fail) {
      throw new Error(`绿幕背景漂移 ${drift.maxDrift}/255 超限，视频不可用`);
    }
    let keys = selectDualKeys(await sampleBackgroundColors(videoAbs, ffmpegPath));
    if (keys.length === 0) {
      keys = [await sampleKeyColor(videoAbs, ffmpegPath)];
    }
    const stats = await computeAlphaStats(videoAbs, keys, ffmpegPath);
    const size = await probeSize(videoAbs, ffmpegPath);
    const normVf = stats ? normalizeFilter(stats, size.width, size.height) : undefined;
    await toWebm(videoAbs, path.join(outDir, 'actions', `${action}.webm`), keys, ffmpegPath, normVf);
    await toGif(videoAbs, path.join(outDir, 'actions', `${action}.gif`), keys, ffmpegPath, normVf);

    await patchExpressionActionStatus(manifestPath, action, 'done');
    broadcastCustomAction(dirId, action, 'done');
    const meta = await getCharacter(dirId);
    if (meta?.manifest && (await getSettings()).activeCharacter === dirId) {
      broadcastCharacterActivated(meta);
    }
    await rebuildTray();
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    console.error(`Expression action ${action} failed:`, err);
    await patchExpressionActionStatus(manifestPath, action, 'failed');
    broadcastCustomAction(dirId, action, 'failed', msg);
  }
}

/** 回写单个 M 档动作的状态（重读 manifest 避免覆盖并发改动，同 patchCustomActionStatus） */
async function patchExpressionActionStatus(
  manifestPath: string,
  action: string,
  status: 'done' | 'failed',
): Promise<void> {
  try {
    const m = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
    if (m.expressionActions?.[action]) {
      m.expressionActions[action].status = status;
      await writeFile(manifestPath, JSON.stringify(m, null, 2));
    }
  } catch (err) {
    console.error(`[expression] 回写状态失败 (${action} → ${status}):`, err);
  }
}


/** 广播自定义动作生成进度（Studio 页据此刷新） */
function broadcastCustomAction(
  dirId: string,
  name: string,
  status: 'pending' | 'done' | 'failed',
  error?: string,
): void {
  // 只发控制台窗（人设/动作 pane 据此刷新；旧 studio 独立窗阶段 4 后下线）
  const win = getConsoleWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('studio:customAction', { dirId, name, status, error });
  }
}

/**
 * 新增自定义动作：校验 + 写 pending 条目后**立即返回**，生成在后台跑。
 * 生成耗时数分钟（视频轮询最长 15min），必须 detach 否则 UI 卡死没反馈。
 * 进度经 studio:customAction 广播。
 */
export async function addCustomAction(
  dirId: string,
  name: string,
  poseDesc: string,
  motionDesc: string,
  durationSec: number,
): Promise<void> {
  if (!ACTION_NAME_RE.test(name)) {
    throw new Error('动作名称只能包含字母、数字、下划线或中文');
  }
  const outDir = path.join(charactersDir(), dirId);
  const manifestPath = path.join(outDir, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  if (manifest.customActions?.[name]) throw new Error(`动作 "${name}" 已存在`);

  // API key 等配置在返回前校验：detach 后的错误渲染层拿不到
  const cfg = await buildConfig();

  // 写 manifest：标记 pending（Studio 显示黄色「生成中」）
  manifest.customActions = {
    ...manifest.customActions,
    [name]: { webm: `actions/${name}.webm`, gif: `actions/${name}.gif`, durationSec, status: 'pending' },
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  broadcastCustomAction(dirId, name, 'pending');

  // 后台生成，不阻塞 IPC 返回
  void generateCustomAction({
    dirId, outDir, manifestPath, name, poseDesc, motionDesc, durationSec,
    persona: manifest.persona, manifest, cfg,
  });
}

/** 自定义动作的实际生成流程（首帧 → 视频 → 抠像 → 回写 manifest） */
async function generateCustomAction(a: {
  dirId: string;
  outDir: string;
  manifestPath: string;
  name: string;
  poseDesc: string;
  motionDesc: string;
  durationSec: number;
  persona?: string;
  manifest: Manifest;
  cfg: PipelineConfig;
}): Promise<void> {
  const { dirId, outDir, manifestPath, name, poseDesc, motionDesc, durationSec, persona, manifest, cfg } = a;
  try {
    const turnaround = await readReferenceImage(outDir);
    const ffmpegPath = await resolveFfmpegPath(cfg.ffmpegPath);
    const ark = createArkClient(cfg);

    // 生成首帧（注入 persona）
    const frameBuf = await ark.generateImage({
      prompt: buildCustomFramePrompt(poseDesc, manifest, persona),
      refImageDataUrl: toDataUrl(turnaround),
      size: '2048x2048',
    });
    const frameRel = `.job/${name}_frame.png`;
    await writeFile(path.join(outDir, frameRel), frameBuf);

    // 生成视频
    const taskId = await ark.submitVideoTask({
      prompt: buildCustomVideoPrompt(motionDesc, manifest, durationSec),
      frameDataUrl: toDataUrl(frameBuf),
    });
    // 轮询
    const deadline = Date.now() + 15 * 60 * 1000;
    let videoUrl: string | undefined;
    for (;;) {
      const t = await ark.getVideoTask(taskId);
      if (t.status === 'succeeded') { videoUrl = t.videoUrl; break; }
      if (t.status === 'failed') throw new Error(`video task failed: ${t.error}`);
      if (Date.now() > deadline) throw new Error('video poll timeout');
      await new Promise(r => setTimeout(r, 5000));
    }
    // 下载视频
    const videoRel = `.job/${name}.mp4`;
    await ark.downloadVideo(videoUrl!, path.join(outDir, videoRel));

    // 抠像转码：必须和 stages.ts 的 keyActionVideo 走完全同一套，否则
    // (a) 漏归一化 → 角色尺寸/位置是原始状态，大概率跑到画面外；
    // (b) 用 sampleKeyColor 单点采样选 key → 实测 6/7 动作选到的 key 比
    //     色度极值双 key 更不饱和，会连角色本体一起吃掉并留绿边。
    const videoAbs = path.join(outDir, videoRel);
    const drift = await checkVideoDrift(videoAbs, ffmpegPath);
    if (drift.fail) {
      throw new Error(`绿幕背景漂移 ${drift.maxDrift}/255 超限，视频不可用`);
    }
    let keys = selectDualKeys(await sampleBackgroundColors(videoAbs, ffmpegPath));
    if (keys.length === 0) {
      keys = [await sampleKeyColor(videoAbs, ffmpegPath)];
    }
    const stats = await computeAlphaStats(videoAbs, keys, ffmpegPath);
    const size = await probeSize(videoAbs, ffmpegPath);
    const normVf = stats ? normalizeFilter(stats, size.width, size.height) : undefined;
    await toWebm(videoAbs, path.join(outDir, 'actions', `${name}.webm`), keys, ffmpegPath, normVf);
    // manifest 里声明了 gif，不产出就是悬空引用
    await toGif(videoAbs, path.join(outDir, 'actions', `${name}.gif`), keys, ffmpegPath, normVf);

    await patchCustomActionStatus(manifestPath, name, 'done');
    broadcastCustomAction(dirId, name, 'done');
    // 新动作要能播：重发 characters:activated 让 pet 重建 Player（否则新 webm 不会被加载）
    const meta = await getCharacter(dirId);
    if (meta?.manifest && (await getSettings()).activeCharacter === dirId) {
      broadcastCharacterActivated(meta);
    }
    await rebuildTray();
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    console.error(`Custom action ${name} failed:`, err);
    await patchCustomActionStatus(manifestPath, name, 'failed');
    broadcastCustomAction(dirId, name, 'failed', msg);
  }
}

/** 回写单个自定义动作的状态（重读 manifest 避免覆盖并发改动） */
async function patchCustomActionStatus(
  manifestPath: string,
  name: string,
  status: 'done' | 'failed' | 'pending',
): Promise<void> {
  const raw = await readFile(manifestPath, 'utf8');
  const m = JSON.parse(raw) as Manifest;
  if (m.customActions?.[name]) {
    m.customActions[name].status = status;
    await writeFile(manifestPath, JSON.stringify(m, null, 2));
  }
}

/** 删除自定义动作 */
export async function deleteCustomAction(dirId: string, name: string): Promise<void> {
  const outDir = path.join(charactersDir(), dirId);
  const manifestPath = path.join(outDir, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  if (!manifest.customActions?.[name]) throw new Error(`动作 "${name}" 不存在`);
  delete manifest.customActions[name];
  if (Object.keys(manifest.customActions).length === 0) {
    manifest.customActions = undefined;
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

/** 保存单个动作的自定义 prompt（poseDesc / motionDesc）到 manifest.json */
export async function saveActionPrompt(
  dirId: string,
  actionId: string,
  poseDesc: string,
  motionDesc: string,
): Promise<void> {
  const manifestPath = path.join(charactersDir(), dirId, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  const a = manifest.actions[actionId as ActionId];
  if (!a) throw new Error(`动作 "${actionId}" 不存在`);
  a.poseDesc = poseDesc || undefined;
  a.motionDesc = motionDesc || undefined;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

/** 保存 Claude Code 联动动作配置到 manifest.json */
export async function saveAgentActions(
  dirId: string,
  config: AgentActionConfig,
): Promise<void> {
  const manifestPath = path.join(charactersDir(), dirId, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;
  manifest.agentActions = Object.keys(config).length > 0 ? config : undefined;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

/** 重建生成 prompt 数据（供 Studio 配置面板展示） */
export async function getPrompts(dirId: string): Promise<PromptData> {
  const outDir = path.join(charactersDir(), dirId);

  // 读 state.json → characterForm / characterStyle / imageProvider
  let characterForm: CharacterForm | undefined;
  let characterStyle: CharacterStyle | undefined;
  let imageProvider: ImageProvider | undefined;
  try {
    const stateRaw = await readFile(path.join(outDir, '.job', 'state.json'), 'utf8');
    const state = JSON.parse(stateRaw) as JobState;
    characterForm = state.characterForm;
    characterStyle = state.characterStyle;
    imageProvider = state.imageProvider;
  } catch {
    // state.json 缺失（手动资产包）→ 使用默认值
  }

  // 读 manifest.json → persona + 自定义 prompt（poseDesc/motionDesc）
  let persona: string | undefined;
  let manifest: Manifest | undefined;
  try {
    const manifestRaw = await readFile(path.join(outDir, 'manifest.json'), 'utf8');
    manifest = JSON.parse(manifestRaw) as Manifest;
    persona = manifest.persona;
  } catch {
    // 无 manifest
  }

  const tp = turnaroundPrompt(
    DEFAULT_CHARACTER_DESC,
    characterForm,
    characterStyle,
    manifest?.turnaroundPromptFull,
  );

  const actions = Object.fromEntries(
    ACTION_IDS.map((id) => {
      const custom = manifest?.actions[id];
      const spec = actionSpec(id, characterForm, characterStyle);
      // 优先使用 manifest 中保存的自定义 prompt，未保存的用默认 actionSpec
      const poseDesc = custom?.poseDesc || spec.poseDesc;
      const motionDesc = custom?.motionDesc || spec.motionDesc;
      // 传入全文覆盖 → 返回的就是实际会用于生成的 prompt（UI 直接展示可编辑）
      const fp = framePrompt(id, DEFAULT_CHARACTER_DESC, characterForm, characterStyle, persona, custom?.poseDesc, custom?.framePromptFull);
      const vp = videoPrompt(id, DEFAULT_CHARACTER_DESC, characterForm, characterStyle, persona, custom?.motionDesc, custom?.videoPromptFull);
      return [
        id,
        {
          poseDesc,
          motionDesc,
          framePrompt: fp,
          videoPrompt: vp,
          framePromptCustomized: !!custom?.framePromptFull,
          videoPromptCustomized: !!custom?.videoPromptFull,
        },
      ];
    }),
  ) as PromptData['actions'];

  return {
    characterForm,
    characterStyle,
    imageProvider,
    persona,
    agentActions: manifest?.agentActions,
    turnaroundPrompt: tp,
    turnaroundCustomized: !!manifest?.turnaroundPromptFull,
    actions,
  };
}

function toDataUrl(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function buildCustomFramePrompt(poseDesc: string, manifest: Manifest, persona?: string): string {
  const style = manifest.actions.talk_happy?.facing ? 'chibi' : 'faithful';
  const personaSuffix = persona ? `角色人设：${persona}。按照此设定表现角色。` : '';
  return `参考图中的角色，保持发型、眼睛、服装、耳朵等所有细节完全一致。${poseDesc}${personaSuffix}画面中只有这一个角色，不出现其他人的手或身体部位，没有家具、没有白色贴纸描边。背景为纯色绿幕（纯正绿色，无渐变无阴影无纹理），角色边缘描线清晰，全身完整可见，角色占画面高度约70%，粗描边贴纸插画风格，无文字无水印`;
}

function buildCustomVideoPrompt(motionDesc: string, _manifest: Manifest, durationSec: number): string {
  return `参考图中的角色，保持发型、眼睛、服装、耳朵等所有细节完全一致。${motionDesc}镜头完全固定不动，静止镜头，角色不位移不走出画面，绿幕背景纯绿色保持不变，画面中始终只有这一个角色，绝对不出现其他人物、手或物体。丝滑流畅循环动画。 --resolution 480p --duration ${durationSec} --camerafixed true`;
}
