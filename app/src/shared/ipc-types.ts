/** 渲染进程与主进程共享的 IPC 类型（preload 契约） */
import type { CharacterForm, ImageProvider, Manifest, ProgressEvent } from '@qbot/pipeline';

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
}

/** 孵化进度事件（pipeline ProgressEvent + 客户端补充） */
export interface HatchProgress extends ProgressEvent {
  dirId: string;
  /** awaiting_pick 时：候选图的 qbot-asset URL */
  candidateUrls?: string[];
}

export interface QBotApi {
  hatch: {
    /** 丢图开始孵化，返回角色目录 ID；imageProvider 缺省 = seedream，characterForm 缺省 = humanoid */
    start(
      refImagePath: string,
      imageProvider?: ImageProvider,
      characterForm?: CharacterForm,
    ): Promise<string>;
    /** 续跑一个未完成的孵化 */
    resume(dirId: string): Promise<void>;
    /** 重试已完成角色的失败动作 */
    redo(dirId: string): Promise<void>;
    pickTurnaround(dirId: string, index: number): Promise<void>;
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
    /** pet 窗口订阅：激活角色变化 */
    onActivated(cb: (meta: CharacterMeta) => void): () => void;
  };
  pet: {
    /** 高频拖拽移动（send，不走 invoke） */
    move(screenX: number, screenY: number): void;
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
}

declare global {
  interface Window {
    qbot: QBotApi;
  }
}
