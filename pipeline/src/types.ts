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

/**
 * 可播放动作 id：6 个标准动作 **或** 用户自定义动作名（manifest.customActions 的 key）。
 * `string & {}` 的写法保留 ActionId 的编辑器自动补全，同时接受任意自定义名。
 */
export type PlayableId = ActionId | (string & {});

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
  /** 生图后端：默认 seedream（Ark）；gpt-image-2 走 aiartmirror（慢但风格不同） */
  imageProvider?: ImageProvider;
  /** gpt-image-2 的 API key（imageProvider = gpt-image-2 时必填） */
  gptImageApiKey?: string;
  /** 默认 https://www.aiartmirror.com/v1 */
  gptImageBaseUrl?: string;
  /** 默认 doubao-seedream-5.0-lite */
  imageModel?: string;
  /** 默认 doubao-seedance-1.5-pro */
  videoModel?: string;
  /** 动作并发数，默认 6 */
  concurrency?: number;
}

/** 生图后端；视频始终走 Ark Seedance */
export type ImageProvider = 'seedream' | 'gpt-image-2';

/** 角色形态：humanoid = 人形/兽形具象（默认）；abstract = 线条小狗、简笔涂鸦等抽象角色 */
export type CharacterForm = 'humanoid' | 'abstract';

/**
 * 人形档生成风格（只影响三视图；首帧/视频引用已选三视图，风格自然沿袭）：
 * - chibi = 二头身 Q 版（默认）：任意素材（照片、复杂插画）都重绘成大头圆脸小身体，桌宠贴纸感强
 * - faithful = 高保真：保持原图头身比与画风（旧行为）
 * 抽象档无头身比概念，忽略此选项。
 */
export type CharacterStyle = 'chibi' | 'faithful';

/** manifest.json 中单动作条目（spec §4） */
export interface ManifestAction {
  webm: string;
  gif: string;
  durationSec: number;
  /** pending = 自定义动作正在后台生成（标准动作只有 done/failed） */
  status: 'done' | 'failed' | 'pending';
  /** 角色在画面中的朝向：left = 面朝左，right = 面朝右（默认）。
   *  串门时用于决定是否翻转，确保两人面对面。
   *  缺省 = 旧数据，默认向右。 */
  facing?: 'left' | 'right';
  /** 自定义姿势描述（覆盖默认 actionSpec.poseDesc）。
   *  保存后仅影响未来的生成；已生成的 webm/gif 不受影响。 */
  poseDesc?: string;
  /** 自定义动作描述（覆盖默认 actionSpec.motionDesc） */
  motionDesc?: string;
}

/** 角色声线（voice spec §5）：首次加载时按 id 哈希分配后写回，永久稳定 */
export interface ManifestVoice {
  /** 语音包 id（soft/bouncy/baby，未来可扩）；未知值由客户端按哈希回退 */
  pack: string;
  /** 包内音高微调 [0.85, 1.15] */
  pitchScale: number;
  /** 包内语速微调 [0.9, 1.1] */
  rateScale: number;
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
  /** 缺省 = 尚未迁移，app 首次加载时补写 */
  voice?: ManifestVoice;
  /** 角色人设：生成动作时注入 prompt，影响姿势/表情/风格 */
  persona?: string;
  /** 自定义动作（用户新增的额外动作，key 为 action name） */
  customActions?: Record<string, ManifestAction>;
  /** Claude Code 联动时 agent 活动→动作的映射。缺省时各活动使用 state-machine 内置默认值。 */
  agentActions?: AgentActionConfig;
}

/** Claude Code 联动：agent 活动→桌宠动作的可配置映射（可指向自定义动作） */
export interface AgentActionConfig {
  thinking?: PlayableId;
  working?: PlayableId;
  waiting?: PlayableId;
  error?: PlayableId;
  doneAction?: PlayableId;
  doneLoops?: number;
}

/** job 进度事件，pipeline 内部 emit，app 经 IPC 转发给孵化 UI */
export interface ProgressEvent {
  jobId: string;
  stage: Stage;
  /** stage 为 actions 时携带 */
  action?: ActionId;
  status?: ActionStatus;
  /** 该动作首帧已落盘时携带（相对 .job/ 的路径），UI 用作缩略图 */
  framePath?: string;
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
  /** 创建时选定的生图后端（resume/redo 沿用，避免中途换模型串风格）；缺省 = seedream */
  imageProvider?: ImageProvider;
  /** 创建时选定的角色形态（决定整套 prompt 措辞）；缺省 = humanoid */
  characterForm?: CharacterForm;
  /** 创建时选定的生成风格（只影响三视图 prompt）；缺省 = 本字段引入前的旧 job = faithful */
  characterStyle?: CharacterStyle;
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
  gptImageBaseUrl: 'https://www.aiartmirror.com/v1',
  gptImageModel: 'gpt-image-2',
  concurrency: 6,
} as const;

/** Seedream 尺寸白名单：1440x1440 会 400（DESIGN.md §3.3 实测） */
export const IMAGE_SIZES = {
  turnaround: '3072x1536',
  frame: '2048x2048',
} as const;

/** 生成提示重建数据（供工作室配置面板展示）。
 *  根据 .job/state.json 的参数调用 prompt 函数重建。 */
export interface PromptData {
  characterForm?: CharacterForm;
  characterStyle?: CharacterStyle;
  imageProvider?: ImageProvider;
  persona?: string;
  /** Claude Code 联动动作配置（来自 manifest.agentActions） */
  agentActions?: AgentActionConfig;
  turnaroundPrompt: string;
  actions: Record<
    ActionId,
    {
      poseDesc: string;
      motionDesc: string;
      framePrompt: string;
      videoPrompt: string;
    }
  >;
}
