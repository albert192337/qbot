/**
 * pipeline 模块的公共类型契约。
 * 本文件是 pipeline 与 app 之间的桥梁：manifest / 进度事件的 schema 都在这里。
 * 铁律：本模块（整个 pipeline/）不得 import 任何 Electron API。
 */

/** S 档 6 个动作 ID（spec §0） */
export const ACTION_IDS = [
  'idle',
  'drag',
  'sleep',
  'tea',
  'talk_happy',
  'talk_annoyed',
] as const;

export type ActionId = (typeof ACTION_IDS)[number];

/** 单动作生成状态机（spec §2 错误处理） */
export type ActionStatus =
  | 'pending'
  | 'generating_frame'
  | 'frame_qc'
  | 'generating_video'
  | 'keying'
  | 'done'
  | 'failed';

/** job 整体阶段 */
export type Stage =
  | 'turnaround' // Stage 1：生成三视图候选
  | 'awaiting_pick' // 等用户挑三视图（唯一人工交互点）
  | 'actions' // Stage 2-4：逐动作 frame→video→keying
  | 'package' // Stage 5：写 manifest
  | 'done'
  | 'failed';

export interface PipelineConfig {
  apiKey: string;
  /** 默认 https://ark.cn-beijing.volces.com/api/plan/v3 */
  baseUrl?: string;
  /** ffmpeg 可执行文件路径；默认 fallback 到 ffmpeg-static（app 打包时需替换 asar.unpacked 路径后注入） */
  ffmpegPath?: string;
  /** 默认 doubao-seedream-5.0-lite */
  imageModel?: string;
  /** 默认 doubao-seedance-1.5-pro */
  videoModel?: string;
  /** 动作并发数，默认 6 */
  concurrency?: number;
}

/** manifest.json 中单动作条目（spec §4） */
export interface ManifestAction {
  webm: string;
  gif: string;
  durationSec: number;
  status: 'done' | 'failed';
}

/** 角色资产包 manifest.json（spec §4，两模块唯一接口） */
export interface Manifest {
  id: string;
  name: string;
  createdAt: string;
  tier: 'S';
  sourceImage: string;
  turnaround: string;
  actions: Record<ActionId, ManifestAction>;
  pipelineVersion: '1';
}

/** job 进度事件，pipeline 内部 emit，app 经 IPC 转发给孵化 UI */
export interface ProgressEvent {
  jobId: string;
  stage: Stage;
  /** stage 为 actions 时携带 */
  action?: ActionId;
  status?: ActionStatus;
  /** stage 为 awaiting_pick 时携带候选图绝对路径 */
  candidates?: string[];
  error?: string;
}

/** .job/state.json 中单动作状态 */
export interface ActionState {
  status: ActionStatus;
  attempts: { frame: number; video: number };
  /** 相对 .job/ 的路径 */
  framePath?: string;
  frameQcPass?: boolean;
  /** Seedance 任务 ID —— 提交成功后必须立刻落盘（防止重启后重复提交扣钱） */
  videoTaskId?: string;
  /** 相对 .job/ 的路径（下载的绿幕 mp4） */
  videoPath?: string;
  /** 抠像 key 色（1 个或漂移超标时 2 个） */
  keyColors?: string[];
  error?: string;
}

/** .job/state.json 整体结构 */
export interface JobState {
  jobId: string;
  pipelineVersion: '1';
  tier: 'S';
  createdAt: string;
  stage: Stage;
  /** 相对资产包根目录 */
  refImage: string;
  turnaround: {
    /** 相对 .job/ 的候选图路径 */
    candidates: string[];
    /** 选中下标；null = 尚未挑选 */
    picked: number | null;
  };
  actions: Record<ActionId, ActionState>;
}

/** 每动作的生成配置（姿势文案等在 prompts.ts） */
export interface ActionSpec {
  poseDesc: string;
  motionDesc: string;
  durationSec: 3 | 5;
}

export class ArkApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ArkApiError';
  }
}

export const DEFAULTS = {
  // plan 端点 + 新 key（2026-07-11 切换）；实测支持 b64_json/图生图/首尾帧/3072x1536
  baseUrl: 'https://ark.cn-beijing.volces.com/api/plan/v3',
  imageModel: 'doubao-seedream-5.0-lite',
  // 注意：1.5-pro 不支持 duration 3，动作时长至少 5s
  videoModel: 'doubao-seedance-1.5-pro',
  concurrency: 6,
} as const;

/** Seedream 尺寸白名单：1440x1440 会 400（DESIGN.md §3.3 实测） */
export const IMAGE_SIZES = {
  turnaround: '3072x1536',
  frame: '2048x2048',
} as const;
