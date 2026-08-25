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
  /** 装扮市场：上传署名昵称（默认「匿名」） */
  marketNickname?: string;
  /** 装扮市场：hash → 管理码（下架自己上传的皮肤用） */
  marketTokens?: Record<string, string>;

  /**
   * 统一昵称（市场署名 + 房间身份，spec 2026-08-21 §6.4）。
   * 迁移期读取顺序 `nickname ?? marketNickname`——同一个人在市场和房间该是同一个名字。
   */
  nickname?: string;

  // ── 公共房间（spec 2026-08-21-public-rooms-design）──
  /** 房间服务分配的成员 ID（零账号体系：本地存着复用，同市场 token 思路） */
  roomsMemberId?: string;
  /** roomId → 房主管理码（自己开的房才有，改设置/踢人用） */
  roomsOwnerTokens?: Record<string, string>;
  /** 收藏的房间（列表置顶） */
  roomsFavorites?: string[];
  /** 已同意公共房间的发言须知（首次入房明示，spec §5.3） */
  roomsChatConsent?: boolean;
  /** 在公共房间展示我的桌宠（默认 true；关闭则不上传角色包、房友只见缩略图） */
  roomsShowMyPet?: boolean;
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

/** 表情包导入：单张贴纸的打标结果（复核界面渲染用） */
export interface AnalyzedSticker {
  sourceName: string;
  /** 贴纸绝对路径；apply 时原样回传 */
  absPath: string;
  /** 复核界面预览（内联 GIF data URL，会动） */
  previewDataUrl: string;
  /** 模型给的语义类别 */
  category: string;
  confidence: number;
  /** 模型的一句话理由 */
  reason: string;
  /** 建议落到的动作槽位；undefined = 建议进备选库 */
  slot?: string;
}

/** 表情包导入：用户复核后提交的最终分配 */
export interface StickerAssignment {
  absPath: string;
  sourceName: string;
  /** 用户确认的槽位；null = 进备选库 */
  slot: string | null;
  category?: string;
  /** 模型原建议（追溯 manualOverride 用） */
  suggestedSlot?: string;
  confidence?: number;
}

/** 表情包导入结果 */
export interface StickerImportResult {
  /** 成功落槽的动作 id */
  slots: string[];
  /** 进备选库的数量 */
  spareCount: number;
  /** 转码失败的贴纸 */
  failed: Array<{ sourceName: string; error: string }>;
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
  /** 弹举牌输入框（纯本地的牌子） */
  | { type: 'signPrompt' }
  | { type: 'signClear' };

// ── presence 状态类型（2026-08-24 起由公共房间上屏复用；原 1v1 联机已退役）──
/** 对端高层状态：agent 活动 + 听歌（隐私边界：只有枚举/动作名出本机，曲名不出） */
export type LinkMode = AgentActivity | 'music';

/** 对端 state 帧（房间 presence / 上屏宠窗驱动 NetworkDriver 用） */
export interface LinkPeerState {
  mode: LinkMode;
  /** 动作提示（对端 Studio 配了自定义动作时带上；缺省按替身角色自己的映射解析） */
  action?: string;
}

/** 对端真身角色就位（服务端缓存下载完成），上屏宠窗以此加载渲染 */
export interface LinkPeerCharacter {
  /** `.peer-<hash>` 缓存目录名（qbot-asset:// 的 host） */
  dirId: string;
  manifest: Manifest;
}

/** 角色包传输进度（上屏宠窗占位提示用） */
export interface LinkAssetProgress {
  received: number;
  total: number;
}

// ── 公共房间（spec 2026-08-21-public-rooms-design）───────────────────────
// 原 1v1 联机已退役（2026-08-24）；以下类型是唯一的联机链路（多人房间）。

/** 房间类型（列表筛选骨架） */
export type RoomKind = 'idle' | 'study' | 'night' | 'coop';

/** 房间列表条目（不含聊天/成员详情/token） */
export interface RoomBrief {
  roomId: string;
  name: string;
  kind: RoomKind;
  capacity: number;
  /** 常客数（进过就算，不是在线数） */
  members: number;
  online: number;
  lastActiveAt: number;
}

/** 房内成员（含当前在场状态） */
export interface RoomMember {
  memberId: string;
  nickname: string;
  avatarHash?: string;
  joinedAt: number;
  online: boolean;
  /** 在线时才有：复用联机的状态枚举 */
  mode?: LinkMode;
  action?: string;
  /** 在线时才有：角色包指纹（服务端缓存键，上屏用） */
  packHash?: string;
}

/** 房内快照（进房时拿到） */
export interface RoomSnapshot {
  roomId: string;
  name: string;
  kind: RoomKind;
  capacity: number;
  listed: boolean;
  ownerId: string;
  members: RoomMember[];
}

/** 一条发言（nickname 是快照：改昵称不追溯改历史） */
export interface RoomChatMsg {
  id: string;
  memberId: string;
  nickname: string;
  text: string;
  /** 服务端时间戳（不信客户端时钟） */
  at: number;
}

/** 房间链路状态（lounge 窗 + 托盘消费） */
export interface RoomsStatus {
  phase: 'off' | 'connecting' | 'online' | 'in-room';
  /** 自己的成员 ID（hello:ack 后有） */
  memberId?: string;
  /** in-room 时：当前房快照 */
  room?: RoomSnapshot;
  /** 连接失败原因（off 且非主动断开时） */
  error?: string;
}

/** 开房参数 */
export interface CreateRoomInput {
  name: string;
  kind: RoomKind;
  capacity: number;
  /** false = 私密房（不上公共列表，凭 roomId 进） */
  listed: boolean;
}

/** 有人跟你打招呼 */
export interface RoomWave {
  fromMemberId: string;
  fromNickname: string;
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
  /** 手动举牌（纯本地：pet 窗 signboard 显示，主进程只记账；无网络出口） */
  sign: {
    set(text: string | null): void;
  };
  /**
   * 公共房间的宠上屏窗（?roomPet=1，spec 2026-08-24）。每个窗对应一个房友，
   * 主进程按窗口定向推送（不带 memberId——一个窗只服务一个成员，天然隔离）。
   */
  roomPet: {
    onHello(cb: (info: { nickname: string }) => void): () => void;
    onCharacter(cb: (meta: LinkPeerCharacter) => void): () => void;
    onProgress(cb: (p: LinkAssetProgress) => void): () => void;
    onState(cb: (s: { mode?: LinkMode; action?: string }) => void): () => void;
    /** 房友发言：本地渲染成聊天气泡（内容已经过服务端广播给你，不是新增出站面） */
    onChat(cb: (msg: { text: string }) => void): () => void;
    onPackFailed(cb: () => void): () => void;
    onLeft(cb: () => void): () => void;
    /** 右键菜单：打招呼 */
    wave(): void;
    /** 右键菜单：退出房间（同 lounge 的退出按钮） */
    leaveRoom(): void;
    /** 启动自取快照（动态 import 竞态兜底，同 link.getPeerCache） */
    getCache(): Promise<{
      hello: { nickname: string } | null;
      character: LinkPeerCharacter | null;
      state: { mode?: LinkMode; action?: string } | null;
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
  /** 公共房间（spec 2026-08-21）：联机唯一链路（原 1v1 已退役） */
  rooms: {
    open(): void;
    list(kind?: RoomKind, q?: string): Promise<RoomBrief[]>;
    create(input: CreateRoomInput): Promise<string>;
    join(roomId: string): Promise<RoomSnapshot>;
    leave(): Promise<void>;
    getStatus(): Promise<RoomsStatus>;
    /** 窗口启动自取快照（did-finish-load 早于监听注册的竞态） */
    getCache(): Promise<{
      status: RoomsStatus;
      room: RoomSnapshot | null;
      chat: RoomChatMsg[];
    }>;
    /** 链路是否加密（wss）：入房明示据此决定要不要提示传输未加密 */
    isSecure(): Promise<boolean>;
    /** 发言（用户手打文字的唯一出口） */
    chat(text: string): void;
    deleteChat(id: string): void;
    /** 举报一条发言（服务端只记计数，不自动处置） */
    report(id: string): void;
    wave(memberId: string): void;
    update(patch: { name?: string; kind?: RoomKind; listed?: boolean }): Promise<void>;
    kick(memberId: string): Promise<void>;
    toggleFavorite(roomId: string): Promise<string[]>;
    disconnect(): Promise<void>;
    onStatus(cb: (s: RoomsStatus) => void): () => void;
    /** 进房历史（换房/重进时整批替换，不是增量） */
    onHistory(cb: (chat: RoomChatMsg[]) => void): () => void;
    onChat(cb: (msg: RoomChatMsg) => void): () => void;
    onChatDeleted(cb: (id: string) => void): () => void;
    onMemberIn(cb: (m: RoomMember) => void): () => void;
    onMemberOut(cb: (memberId: string) => void): () => void;
    onPresence(cb: (p: { memberId: string; mode?: LinkMode; action?: string }) => void): () => void;
    onWave(cb: (w: RoomWave) => void): () => void;
    onKicked(cb: () => void): () => void;
    onError(cb: (msg: string) => void): () => void;
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

    // ── 表情包导入（sticker-import spec）────────────────
    /** 弹目录选择框，返回选中路径（取消返回 null） */
    pickStickerDir(): Promise<string | null>;
    /**
     * 扫描 + 模型打标，**不落盘**（取消复核 = 什么都没发生）。
     * 调打标 API（很便宜：一批 50 张不到 1 分钱）。
     */
    analyzeStickers(input: { dir?: string; files?: string[] }): Promise<AnalyzedSticker[]>;
    /** 用户复核确认后：转码落盘 + 写 manifest + 桌宠热重载 */
    applyStickers(dirId: string, assignments: StickerAssignment[]): Promise<StickerImportResult>;
    /** 一步回退：清空导入动作，恢复生成动作（imported/ 文件保留） */
    clearImportedStickers(dirId: string): Promise<void>;
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
