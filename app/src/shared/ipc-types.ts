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
import type { FurnitureTier } from './furniture';

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
  /** 联机：把正在听的曲名分享给对端（默认 false，spec §一「同步粒度」） */
  linkShareSong?: boolean;
  /** 装扮市场：上传署名昵称（默认「匿名」） */
  marketNickname?: string;
  /** 装扮市场：hash → 管理码（下架自己上传的皮肤用） */
  marketTokens?: Record<string, string>;
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

/** Agent 会话合成后的活动状态（优先级 error > waiting > working > thinking > done > idle） */
export type AgentActivity = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error';

/** 主进程 agent-server 广播给 pet 窗口的合成状态 */
export interface AgentStatus {
  activity: AgentActivity;
  /** 当前活跃会话数（0 = 无 agent 在干活） */
  sessions: number;
}

/** 装扮市场货架条目（spec 2026-08-02-skin-market-design）；服务端 meta + 本地视角字段 */
export interface MarketSkin {
  hash: string;
  name: string;
  uploader: string;
  /** 包体字节数 */
  size: number;
  /** 动作数（服务端从包头数出，不信客户端） */
  actions: number;
  at: number;
  /** 封面 URL（<img> 直连服务器；无封面 = undefined 用占位） */
  previewUrl?: string;
  /** 本地存有管理码（自己上传的，可下架） */
  mine: boolean;
  /** 已下载入库（characters/market-<hash>/ 存在） */
  installed: boolean;
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

/** 飞书会议状态（来自本地 byteview 日志监控；1v1 通话也算会中） */
export interface MeetingStatus {
  inMeeting: boolean;
  /** 检测到入会的时刻（主进程时钟） */
  since?: number;
}

/** 桌宠右键菜单「说话/动作」条目（渲染端报给主进程建原生菜单） */
export interface PetMenuActionEntry {
  id: string;
  label: string;
}

/** 原生右键菜单点选后回渲染端执行的命令 */
export type PetMenuCommand =
  | { type: 'speak' }
  | { type: 'play'; action: string }
  /** 弹举牌输入框（联机举牌：本端显示 + 同步对端替身） */
  | { type: 'signPrompt' }
  | { type: 'signClear' };

// ── 联机 presence（spec 2026-08-02-multiplayer-presence-design）──────────
/** 对端高层状态：agent 活动 + 听歌（隐私边界见 spec §四，只有枚举/动作名/放行曲名出本机） */
export type LinkMode = AgentActivity | 'music';

/** 联机 state 帧（peer ↔ peer，经 relay 盲转） */
export interface LinkPeerState {
  mode: LinkMode;
  /** 动作提示（对端 Studio 配了自定义动作时带上；缺省由接收端按替身角色自己的映射解析） */
  action?: string;
  /** 对端开了「分享曲名」才有 */
  song?: string;
}

/** 联机 hello 帧（配对成功后互报） */
export interface LinkPeerHello {  charName: string;
  /** 角色资产包指纹（L1 资产分发缓存键；老版本对端没有） */
  manifestHash?: string;
}

/** 对端真身角色就位（缓存命中 / 传输完成），远端窗以此加载渲染 */
export interface LinkPeerCharacter {
  /** `.peer-<hash>` 缓存目录名（qbot-asset:// 的 host） */
  dirId: string;
  manifest: Manifest;
}

/** 角色包传输进度（远端窗占位提示用） */
export interface LinkAssetProgress {
  received: number;
  total: number;
}

/** 联机链路状态（托盘菜单 + 远端窗右键菜单消费） */
export interface LinkStatus {
  phase: 'off' | 'connecting' | 'waiting' | 'paired';
  /** waiting/paired 时：本房房间码（自己建的房才有） */
  roomCode?: string;
  /** paired 且收到 hello 后：对端角色名 */
  peerName?: string;
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

/**
 * 游戏化积累（progress.json）。全局，不按角色分——换角色不该清空收集品。
 * 权威在主进程 `main/progress.ts`，renderer 只读 + 通过 IPC 请求变更。
 */
export interface Progress {
  /** 点数：敲键盘 +1 / Claude Code 跑完一轮 +10。开箱消耗 */
  points: number;
  /** 未开的箱子数：挂机 15 分钟攒一个 */
  boxes: number;
  /** 距下一个箱子的挂机余量（ms），满一箱就扣掉 */
  idleMs: number;
  /** 家具库存 stickerId → 件数（可重复，重复件是合成的燃料） */
  inventory: Record<string, number>;
  /** 以下纯统计，玩法不读 */
  keysCounted: number;
  runsCounted: number;
  boxesOpened: number;
  crafted: number;
}

/** 开箱结果。失败走 ok:false 而不抛异常——「点数不够」是正常分支不是错误 */
export type OpenBoxResult =
  | { ok: true; stickerId: string; tier: FurnitureTier; progress: Progress }
  | { ok: false; error: string };

/** 合成结果。consumed = 实际烧掉的 stickerId → 件数，UI 要报给用户 */
export type CraftResult =
  | {
      ok: true;
      stickerId: string;
      tier: FurnitureTier;
      consumed: Record<string, number>;
      progress: Progress;
    }
  | { ok: false; error: string };

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
    /**
     * 右键菜单：原生 Menu.popup 不受桌宠小窗边界约束（DOM 菜单会被截断）。
     * 动作列表由渲染端传入，说话/播动作的执行经 onMenuCommand 回渲染端。
     */
    popupMenu(actions: PetMenuActionEntry[]): void;
    onMenuCommand(cb: (cmd: PetMenuCommand) => void): () => void;
  };
  music: {
    /** 当前音乐播放状态（pet 窗口加载时铺底） */
    getStatus(): Promise<MusicStatus>;
    /** pet 窗口订阅：音乐播放状态变化 */
    onStatus(cb: (status: MusicStatus) => void): () => void;
  };
  meeting: {
    /** 当前飞书会议状态（pet 窗口加载时铺底） */
    getStatus(): Promise<MeetingStatus>;
    /** pet 窗口订阅：会议状态变化 */
    onStatus(cb: (status: MeetingStatus) => void): () => void;
  };
  link: {
    /** 当前联机链路状态 */
    getStatus(): Promise<LinkStatus>;
    /** 建房，返回 6 位房间码（控制台「联机」pane） */
    create(): Promise<string>;
    /** 用房间码加入（控制台「联机」pane 的输入框） */
    join(code: string): Promise<void>;
    /** 订阅链路状态变化（主进程 setLinkStatusListener 搭车推送） */
    onChanged(cb: (status: LinkStatus) => void): () => void;
    /** 断开联机（远端窗右键菜单；托盘走主进程直调） */
    stop(): void;
    /** 远端宠窗订阅：对端角色名（hello 帧） */
    onPeerHello(cb: (info: LinkPeerHello) => void): () => void;
    /** 远端宠窗订阅：对端状态帧（驱动 NetworkDriver） */
    onPeerState(cb: (s: LinkPeerState) => void): () => void;
    /** 远端宠窗订阅：对端掉线（打瞌睡；30s 未重连主进程会关窗） */
    onPeerLeft(cb: () => void): () => void;
    /** 远端宠窗订阅：对端真身角色就位（缓存命中 / 传输完成） */
    onPeerCharacter(cb: (meta: LinkPeerCharacter) => void): () => void;
    /** 远端宠窗订阅：角色包传输进度（占位提示） */
    onAssetProgress(cb: (p: LinkAssetProgress) => void): () => void;
    /** 远端宠窗订阅：对端手动举牌（null=收牌） */
    onPeerSign(cb: (text: string | null) => void): () => void;
    /** 本端手动举牌（null=收牌）：配对期间同步给对端替身显示 */
    setSign(text: string | null): void;
    /** 远端宠窗启动自取快照（动态 import 竞态兜底：注册完监听后拉一次） */
    getPeerCache(): Promise<{
      hello: LinkPeerHello | null;
      character: LinkPeerCharacter | null;
      state: LinkPeerState | null;
      sign: string | null;
    }>;
  };
  market: {
    /** 货架列表（含本地视角的 mine/installed） */
    list(): Promise<MarketSkin[]>;
    /** 打包上传本地角色，返回上架 hash */
    upload(dirId: string): Promise<string>;
    /** 下载并激活（已装过则直接激活） */
    download(hash: string): Promise<void>;
    /** 下架自己上传的皮肤（凭本地管理码） */
    remove(hash: string): Promise<void>;
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
  claude: {
    /** Claude Code hooks 是否已装（读 ~/.claude/settings.json 真值，非 settings 记忆位） */
    getStatus(): Promise<boolean>;
    /** 切换安装/卸载，返回切换后的状态（内部弹原生确认框） */
    toggle(): Promise<boolean>;
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
  ui: {
    /** 主进程要求切屏（托盘「设置」→ settings 屏；控制台切 pane 同用） */
    onShowScreen(cb: (name: string) => void): () => void;
    /** 打开统一控制台窗并直达 pane（pane 名见 renderer/console/main.ts 的 PaneId） */
    openConsole(pane?: string): void;
  };
  studio: {
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

  /**
   * 游戏化积累：点数/箱子/家具库存。全局非按角色。
   * room 窗消费（背包/合成 + 装饰托盘的已拥有过滤），pet 窗消费（调试面板）。
   */
  progress: {
    get(): Promise<Progress>;
    /** 开箱：扣 1 箱 + 500 点换随机家具。点数/箱子不够返回 ok:false，不抛 */
    openBox(): Promise<OpenBoxResult>;
    /** 合成：同档任意 10 件 → 上一档随机 1 件。烧哪几件由主进程挑（优先烧大堆保品种） */
    craft(tier: FurnitureTier): Promise<CraftResult>;
    /** 订阅积累变化（键盘加分是节流后每秒最多一次，不会刷爆） */
    onChanged(cb: (progress: Progress) => void): () => void;
    /** 以下仅调试面板用，正式玩法不该调 */
    debugAddIdleMs(ms: number): Promise<Progress>;
    debugGrantBoxes(n: number): Promise<Progress>;
    debugGrantPoints(n: number): Promise<Progress>;
    /** stickerId 省略 = 按开箱权重随机一件（不扣箱不扣点） */
    debugGrantFurniture(stickerId?: string): Promise<{ stickerId: string; progress: Progress }>;
  };
}

declare global {
  interface Window {
    qbot: QBotApi;
  }
}
