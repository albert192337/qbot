/** 渲染进程与主进程共享的 IPC 类型（preload 契约） */
import type { Manifest, ProgressEvent } from '@qbot/pipeline';

export interface CharacterMeta {
  /** 目录名（qbot-asset:// 的 host） */
  dirId: string;
  manifest: Manifest;
  /** 有未完成 .job（可续跑） */
  hasUnfinishedJob: boolean;
}

export interface Settings {
  arkApiKey?: string;
  activeCharacter?: string;
}

/** 孵化进度事件（pipeline ProgressEvent + 客户端补充） */
export interface HatchProgress extends ProgressEvent {
  dirId: string;
  /** awaiting_pick 时：候选图的 qbot-asset URL */
  candidateUrls?: string[];
}

export interface QBotApi {
  hatch: {
    /** 丢图开始孵化，返回角色目录 ID */
    start(refImagePath: string): Promise<string>;
    /** 续跑一个未完成的孵化 */
    resume(dirId: string): Promise<void>;
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
  };
}

declare global {
  interface Window {
    qbot: QBotApi;
  }
}
