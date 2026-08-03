/** 渲染进程与主进程共享的 IPC 类型（preload 契约） */
import type {
  ActionId,
  ActionStatus,
  AgentActionConfig,
  CharacterForm,
  CharacterStyle,
  ImageProvider,
  Manifest,
  ProgressEvent,
  Stage,
} from '@qbot/pipeline';

export interface CharacterMeta {
  /** 目录名（qbot-asset:// 的 host） */
  dirId: string;
  manifest: Manifest;
  /** 有未完成 .job（可续跑） */
  hasUnfinishedJob: boolean;
}

export interface Settings {
  arkApiKey?: string;
  /** gpt-image-2 生图后端的 API key（选了该后端才需要） */
  gptImageApiKey?: string;
  activeCharacter?: string;
  /** 桌宠缩放倍数（0.5~2，默认 1 = 360px 窗口） */
  petScale?: number;
  /** 语音开关（默认 true；关闭时气泡照常出现） */
  voiceEnabled?: boolean;
  /** 语音音量 0~100（默认 70） */
  voiceVolume?: number;
  /** 自言自语频率（默认 normal） */
  talkFrequency?: 'quiet' | 'normal' | 'chatty';
  /** Claude Code 联动 hooks 已安装（托盘开关的记忆位） */
  claudeHooksInstalled?: boolean;
}

/** 孵化进度事件（pipeline ProgressEvent + 客户端补充） */
export interface HatchProgress extends ProgressEvent {
  dirId: string;
  /** awaiting_pick 时：候选图的 qbot-asset URL */
  candidateUrls?: string[];
  /** 首帧已落盘时：缩略图的 qbot-asset URL（由 framePath 转换） */
  frameUrl?: string;
}

/** 孵化状态快照（进度屏进入时铺底，之后消费增量事件；见 hatch-progress-ux spec §四） */
export interface HatchStatus {
  stage: Stage;
  /** 三视图等待态文案需要区分后端（Seedream/gpt-image-2 时长差 10 倍） */
  imageProvider?: ImageProvider;
  /** stage 为 awaiting_pick 时：候选图 qbot-asset URL（中途重开窗口也能直接挑选） */
  candidateUrls?: string[];
  actions: Record<ActionId, { status: ActionStatus; frameUrl?: string; error?: string }>;
}

/** Agent 会话合成后的活动状态（优先级 error > working > thinking > waiting > done > idle） */
export type AgentActivity = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error';

/** 主进程 agent-server 广播给 pet 窗口的合成状态 */
export interface AgentStatus {
  activity: AgentActivity;
  /** 当前活跃会话数（0 = 无 agent 在干活） */
  sessions: number;
}

/** 气泡类型：done = 回合完成（Stop）；attention = 需要你处理（Notification） */
export type AgentMessageKind = 'done' | 'attention';

/**
 * Stop / Notification 触发的一次性提示消息（bubble 窗消费）。
 * 与 AgentStatus 的「状态」语义正交：状态是幂等可重放的，消息是一次性事件，
 * 所以走独立通道——塞进 AgentStatus 会被 broadcastIfChanged 的去重吞掉。
 */
export interface AgentMessage {
  /** 会话键，与 agent-server 会话表同键：`${agentId}:${sessionId}` */
  sessionKey: string;
  /** 来源标签（cwd 的目录名，回落 agentId） */
  source: string;
  /** session_id 前 4 位；同名来源并存时用于区分 */
  sessionShort: string;
  kind: AgentMessageKind;
  /** 已展平 + 截断的正文 */
  text: string;
  /** 主进程时钟；renderer 据此计时淡出 */
  at: number;
}

/** 自定义动作后台生成进度（Studio 页订阅，pending → done/failed） */
export interface CustomActionEvent {
  dirId: string;
  name: string;
  status: 'pending' | 'done' | 'failed';
  /** status = failed 时的错误原因 */
  error?: string;
}

/** 音乐播放状态（来自 Windows SMTC API） */
export interface MusicStatus {
  playing: boolean;
  /** 当前播放曲目标题 */
  title?: string;
  /** 当前播放曲目艺术家 */
  artist?: string;
}

/** 小房间装饰摆放（room-decor.json，按房间名键控） */
export interface DecorPlacement {
  id: string;
  stickerId: string;
  /** 贴纸中心点（房间坐标系） */
  x: number;
  y: number;
  scale: number;
  /** 摆放区域：左/右墙自动透视变形，free 平面贴纸 */
  zone: 'wallL' | 'wallR' | 'free';
}

export interface QBotApi {
  hatch: {
    /** 丢图开始孵化，返回角色目录 ID；imageProvider 缺省 = seedream，characterForm 缺省 = humanoid，characterStyle 缺省 = faithful（UI 默认传 chibi） */
    start(
      refImagePath: string,
      imageProvider?: ImageProvider,
      characterForm?: CharacterForm,
      characterStyle?: CharacterStyle,
    ): Promise<string>;
    /** 续跑一个未完成的孵化 */
    resume(dirId: string): Promise<void>;
    /** 重试已完成角色的失败动作 */
    redo(dirId: string): Promise<void>;
    pickTurnaround(dirId: string, index: number): Promise<void>;
    /** 当前孵化状态快照；目录无 state.json（非法 dirId/已清理）返回 null */
    getStatus(dirId: string): Promise<HatchStatus | null>;
    /** index=-1 表示重新生成一轮 */
    onProgress(cb: (ev: HatchProgress) => void): () => void;
    /** File 对象 → 真实路径（webUtils.getPathForFile 包装） */
    getPathForFile(file: File): string;
    saveCard(rect: { x: number; y: number; width: number; height: number }): Promise<string | null>;
  };
  characters: {
    list(): Promise<CharacterMeta[]>;
    activate(dirId: string): Promise<void>;
    /** 改名（写回 manifest.json） */
    rename(dirId: string, name: string): Promise<void>;
    /** 删除角色 */
    delete(dirId: string): Promise<void>;
    /** pet / room 窗口订阅：激活角色变化 */
    onActivated(cb: (meta: CharacterMeta) => void): () => void;
    /** 当前激活角色（room 窗口启动时主动拉取，不依赖广播时序） */
    getActive(): Promise<CharacterMeta | null>;
  };
  pet: {
    /** 高频拖拽移动（send，不走 invoke） */
    move(screenX: number, screenY: number): void;
    /** 串门模式：拓宽/恢复窗口 */
    setVisitMode(enter: boolean): void;
  };
  room: {
    /** 单击桌宠：角色走进小房间（pet 窗隐藏 → room 窗弹出） */
    open(): void;
    /** 贴纸窗拖拽移动（send，不走 invoke） */
    move(screenX: number, screenY: number): void;
    /** 鼠标出入房间实体轮廓：透明区穿透开关 */
    setIgnoreMouse(ignore: boolean): void;
  };
  decor: {
    /** 读某房间的装饰摆放（文件损坏/不存在 = 空数组） */
    get(roomName: string): Promise<DecorPlacement[]>;
    /** 覆盖写某房间的装饰摆放（退出编辑态时调用） */
    set(roomName: string, placements: DecorPlacement[]): Promise<void>;
  };
  settings: {
    get(): Promise<Settings>;
    set(patch: Partial<Settings>): Promise<void>;
    /** pet 窗口订阅：设置变更实时生效（语音开关/音量/频率等） */
    onChanged(cb: (settings: Settings) => void): () => void;
  };
  ui: {
    /** 主进程要求切屏（托盘「设置」→ settings 屏） */
    onShowScreen(cb: (name: string) => void): () => void;
  };
  studio: {
    /** 打开生成配置面板 */
    open(): void;
    /** 保存角色人设到 manifest.json */
    savePersona(dirId: string, persona: string): Promise<void>;
    /** 新增自定义动作并开始生成 */
    addCustomAction(
      dirId: string,
      name: string,
      poseDesc: string,
      motionDesc: string,
      durationSec: number,
    ): Promise<void>;
    /** 删除自定义动作 */
    deleteCustomAction(dirId: string, name: string): Promise<void>;
    /** 重建生成 prompt 数据（从 state.json + manifest 重建） */
    getPrompts(dirId: string): Promise<import('@qbot/pipeline').PromptData>;
    /** 保存单个动作的自定义 prompt（poseDesc / motionDesc）到 manifest.json */
    saveActionPrompt(
      dirId: string,
      actionId: string,
      poseDesc: string,
      motionDesc: string,
    ): Promise<void>;
    /** 保存 Claude Code 联动动作配置到 manifest.json */
    saveAgentActions(
      dirId: string,
      config: import('@qbot/pipeline').AgentActionConfig,
    ): Promise<void>;
    /** 订阅自定义动作的后台生成进度（addCustomAction 立即返回，生成在后台跑） */
    onCustomAction(cb: (ev: CustomActionEvent) => void): () => void;
    /** 保存某动作的首帧/视频 prompt 全文覆盖（空串 = 清除覆盖回退模板）。只影响之后的生成 */
    saveFullPrompts(
      dirId: string,
      actionId: string,
      framePromptFull: string,
      videoPromptFull: string,
    ): Promise<void>;
    /** 保存三视图 prompt 全文覆盖（空串 = 清除覆盖） */
    saveTurnaroundPrompt(dirId: string, prompt: string): Promise<void>;
    /** 按当前 prompt 重新生成指定动作（**花钱**，每动作约 ¥1） */
    regenerateActions(dirId: string, actionIds: string[]): Promise<void>;
    /** 重新生成三视图并连带重生全部动作（**花钱**，约 6 条视频）；挑图走孵化窗 */
    regenerateTurnaround(dirId: string): Promise<void>;
  };
  agent: {
    /** 当前合成状态（pet 窗口加载时铺底） */
    getStatus(): Promise<AgentStatus>;
    /** 订阅合成状态变化（agent-server 有变化才广播） */
    onStatus(cb: (status: AgentStatus) => void): () => void;
    /** bubble 窗订阅：agent 一次性提示消息 */
    onMessage(cb: (msg: AgentMessage) => void): () => void;
  };
  bubble: {
    /** 气泡全部消散 → 主进程隐藏气泡窗 */
    reportEmpty(): void;
    /** 主进程要求清空（角色进小房间等） */
    onClear(cb: () => void): () => void;
    /** 气泡栈贴桌宠上方还是下方（桌宠贴屏幕顶部时翻转） */
    onAnchor(cb: (side: 'above' | 'below') => void): () => void;
  };
  music: {
    /** 当前音乐播放状态（pet 窗口加载时铺底） */
    getStatus(): Promise<MusicStatus>;
    /** 订阅音乐播放状态变化 */
    onStatus(cb: (status: MusicStatus) => void): () => void;
  };
}

declare global {
  interface Window {
    qbot: QBotApi;
  }
}
