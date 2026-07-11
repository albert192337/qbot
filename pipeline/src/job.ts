/**
 * Job：生成任务的状态持久化、断点续跑、进度事件。
 * - state.json 原子写（tmp+rename）
 * - resume 语义：load 后校验状态宣称的产物文件真实存在，缺失则状态回退一格
 * - videoTaskId 提交成功后立刻落盘（防重启后重复提交扣钱）
 */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  ACTION_IDS,
  type ActionId,
  type ActionState,
  type ActionStatus,
  type JobState,
  type ProgressEvent,
  type Stage,
} from './types.js';

export const STATE_FILE = 'state.json';
export const JOB_DIR = '.job';

function initialActionState(): ActionState {
  return { status: 'pending', attempts: { frame: 0, video: 0 } };
}

export class Job extends EventEmitter {
  private constructor(
    /** 资产包根目录（characters/<id>/） */
    public readonly outDir: string,
    public readonly state: JobState,
  ) {
    super();
  }

  get jobDir(): string {
    return path.join(this.outDir, JOB_DIR);
  }

  /** .job/ 内相对路径 → 绝对路径 */
  jobPath(rel: string): string {
    return path.join(this.jobDir, rel);
  }

  static async create(
    outDir: string,
    opts: { refImagePath: string; tier?: 'S' },
  ): Promise<Job> {
    const jobDir = path.join(outDir, JOB_DIR);
    await mkdir(jobDir, { recursive: true });
    await mkdir(path.join(outDir, 'actions'), { recursive: true });
    // 源图复制进资产包（出生证明卡要用）
    await copyFile(opts.refImagePath, path.join(outDir, 'source.png'));

    const state: JobState = {
      jobId: randomUUID(),
      pipelineVersion: '1',
      tier: opts.tier ?? 'S',
      createdAt: new Date().toISOString(),
      stage: 'turnaround',
      refImage: 'source.png',
      turnaround: { candidates: [], picked: null },
      actions: Object.fromEntries(
        ACTION_IDS.map((id) => [id, initialActionState()]),
      ) as Record<ActionId, ActionState>,
    };
    const job = new Job(outDir, state);
    await job.save();
    return job;
  }

  /** resume 入口：读 state.json 并按产物存在性回退状态 */
  static async load(outDir: string): Promise<Job> {
    const statePath = path.join(outDir, JOB_DIR, STATE_FILE);
    const state = JSON.parse(await readFile(statePath, 'utf8')) as JobState;
    const job = new Job(outDir, state);
    job.reconcile();
    await job.save();
    return job;
  }

  /** 校验状态宣称的产物是否真实存在，缺失则回退（防"state 说下载完了但文件被删"） */
  private reconcile(): void {
    const s = this.state;
    // 三视图候选文件丢失 → 回到 turnaround 重新生成
    if (s.turnaround.candidates.length > 0) {
      const missing = s.turnaround.candidates.some(
        (c) => !existsSync(this.jobPath(c)),
      );
      if (missing) {
        s.turnaround = { candidates: [], picked: null };
        s.stage = 'turnaround';
        return;
      }
    }
    // 选中的三视图已定但 turnaround.png 不在 → 重新落盘由 stages 处理；这里只管动作级
    for (const id of ACTION_IDS) {
      const a = s.actions[id];
      switch (a.status) {
        case 'frame_qc':
        case 'generating_video':
          // 需要 framePath 存在；videoTaskId 存在则保留（恢复轮询而非重提，省钱关键点）
          if (!a.framePath || !existsSync(this.jobPath(a.framePath))) {
            s.actions[id] = initialActionState();
          }
          break;
        case 'keying':
          if (!a.videoPath || !existsSync(this.jobPath(a.videoPath))) {
            // 视频文件丢了：若 taskId 还在可以重新下载 → 回退到 generating_video
            if (a.videoTaskId && a.framePath && existsSync(this.jobPath(a.framePath))) {
              a.status = 'generating_video';
              a.videoPath = undefined;
            } else {
              s.actions[id] = initialActionState();
            }
          }
          break;
        case 'done': {
          // 最终产物在资产包 actions/ 下
          const webm = path.join(this.outDir, 'actions', `${id}.webm`);
          if (!existsSync(webm)) {
            if (a.videoPath && existsSync(this.jobPath(a.videoPath))) {
              a.status = 'keying';
            } else {
              s.actions[id] = initialActionState();
            }
          }
          break;
        }
        default:
          break; // pending / generating_frame / failed 原样保留
      }
    }
    // 整体 stage 与动作状态对齐
    if (s.stage === 'done' || s.stage === 'package') {
      const allSettled = ACTION_IDS.every(
        (id) => s.actions[id].status === 'done' || s.actions[id].status === 'failed',
      );
      if (!allSettled) s.stage = 'actions';
    }
  }

  /** save 串行化：6 个动作并发推进时避免 tmp 文件互相踩踏 */
  private saveChain: Promise<void> = Promise.resolve();
  private saveSeq = 0;

  /** 原子写 state.json（tmp+rename，串行队列） */
  save(): Promise<void> {
    const doSave = async () => {
      const statePath = this.jobPath(STATE_FILE);
      const tmp = `${statePath}.${this.saveSeq++}.tmp`;
      await writeFile(tmp, JSON.stringify(this.state, null, 2));
      await rename(tmp, statePath);
    };
    this.saveChain = this.saveChain.then(doSave, doSave);
    return this.saveChain;
  }

  private emitProgress(ev: Omit<ProgressEvent, 'jobId'>): void {
    this.emit('progress', { jobId: this.state.jobId, ...ev } satisfies ProgressEvent);
  }

  async setStage(stage: Stage, extra?: Partial<ProgressEvent>): Promise<void> {
    this.state.stage = stage;
    await this.save();
    this.emitProgress({ stage, ...extra });
  }

  async transition(
    action: ActionId,
    status: ActionStatus,
    patch?: Partial<ActionState>,
  ): Promise<void> {
    const a = this.state.actions[action];
    Object.assign(a, patch, { status });
    await this.save();
    this.emitProgress({ stage: this.state.stage, action, status, error: a.error });
  }
}
