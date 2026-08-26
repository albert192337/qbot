/**
 * NetworkDriver：联机远端宠的驱动器（spec §二.3）。
 * 与本地 AI 状态机互斥的另一种 PetEntity 驱动——对端 state 帧说什么就播什么，
 * 粘性循环；纯逻辑不碰 DOM（同 visit.ts 风格，可单测）。
 *
 * 动作解析：帧里的 action 提示可用就用；否则按替身角色自己的 agentActions
 * 配置映射 mode（L1 资产分发后替身=对端真身，映射配置随 manifest 一起过来，
 * 这条解析路径不用改）。
 */
import type { PlayableId } from '@qbot/pipeline';
import type { LinkPeerState } from '../../shared/ipc-types';
import {
  AGENT_ACTION,
  DEFAULT_MUSIC_ACTION,
  DONE_ACTION,
  DONE_LOOPS,
} from './state-machine';

/** manifest.agentActions 的形状（与 local-main 消费的字段一致） */
export interface ActionMapConfig {
  thinking?: PlayableId;
  working?: PlayableId;
  waiting?: PlayableId;
  error?: PlayableId;
  doneAction?: PlayableId;
  doneLoops?: number;
  musicAction?: PlayableId;
}

export interface NetworkDriverCallbacks {
  play(action: PlayableId, loop: boolean): void;
}

export class NetworkDriver {
  private available: PlayableId[] = [];
  private cfg: ActionMapConfig = {};
  /** 当前粘性循环动作（done 播完 / 拖拽松手要回到它） */
  private sticky: PlayableId = 'idle';
  private lastMode: string | null = null;
  private lastAction: string | undefined = undefined;
  private doneLoopsLeft = 0;
  private dragging = false;

  constructor(private callbacks: NetworkDriverCallbacks) {}

  /** 替身角色（重）加载完成：重置并回到当前粘性动作 */
  setCharacter(available: PlayableId[], cfg?: ActionMapConfig): void {
    this.available = available;
    this.cfg = cfg ?? {};
    this.doneLoopsLeft = 0;
    this.sticky = this.has('idle') ? 'idle' : (available[0] ?? 'idle');
    this.lastMode = null;
    if (!this.dragging) this.callbacks.play(this.sticky, true);
  }

  /** 对端 state 帧（含 15s 心跳重发——同 mode 去重，别把 done 庆祝播成循环） */
  applyState(state: LinkPeerState): void {
    if (this.available.length === 0) return;

    // 检查是否是重复帧
    if (state.mode === this.lastMode && state.action === this.lastAction && state.mode !== 'idle') {
      // 心跳/重复帧：music 曲名变化由 UI 层处理，动作不重启
      return;
    }

    // 更新最后状态
    this.lastMode = state.mode;
    this.lastAction = state.action;

    if (state.mode === 'done') {
      // 一次性庆祝：播 N 遍回 idle（onVideoEnded 推进）
      const done = this.resolve(state.action, this.cfg.doneAction ?? DONE_ACTION);
      this.sticky = this.has('idle') ? 'idle' : this.sticky;
      if (done && !this.dragging) {
        this.doneLoopsLeft = this.cfg.doneLoops ?? DONE_LOOPS;
        this.callbacks.play(done, false);
      }
      return;
    }

    this.doneLoopsLeft = 0;
    if (state.mode === 'idle') {
      this.sticky = this.resolve(state.action, 'idle') ?? 'idle';
    } else if (state.mode === 'music') {
      this.sticky = this.resolve(state.action, this.cfg.musicAction ?? DEFAULT_MUSIC_ACTION) ?? 'idle';
    } else {
      const mapped = this.cfg[state.mode] ?? AGENT_ACTION[state.mode];
      this.sticky = this.resolve(state.action, mapped) ?? 'idle';
    }
    if (!this.dragging) this.callbacks.play(this.sticky, true);
  }

  /** 非循环动作（done 庆祝）播完一遍 */
  onVideoEnded(): void {
    if (this.dragging) return;
    if (this.doneLoopsLeft > 1) {
      this.doneLoopsLeft--;
      const done = this.resolve(undefined, this.cfg.doneAction ?? DONE_ACTION);
      if (done) {
        this.callbacks.play(done, false);
        return;
      }
    }
    this.doneLoopsLeft = 0;
    this.callbacks.play(this.sticky, true);
  }

  /** 对端掉线：打瞌睡等重连（30s 后主进程直接关窗） */
  peerLeft(): void {
    if (this.available.length === 0) return;
    this.lastMode = null;
    this.lastAction = undefined;
    this.sticky = this.has('sleep') ? ('sleep' as PlayableId) : 'idle';
    if (!this.dragging) this.callbacks.play(this.sticky, true);
  }

  /** 远端窗被拖拽：播 drag，松手回粘性动作 */
  dragStart(): void {
    this.dragging = true;
    if (this.has('drag')) this.callbacks.play('drag', true);
  }

  dragEnd(): void {
    this.dragging = false;
    // 确保我们有可用的动作列表
    if (this.available.length > 0) {
      // 如果sticky动作不存在，回退到idle
      const playAction = this.has(this.sticky) ? this.sticky : 'idle';
      this.callbacks.play(playAction, true);
    }
  }

  private has(action: string): boolean {
    return this.available.includes(action as PlayableId);
  }

  /** 帧提示优先，退映射动作，再退 null（调用方兜底 idle） */
  private resolve(hint: string | undefined, fallback: PlayableId): PlayableId | null {
    if (hint && this.has(hint)) return hint as PlayableId;
    if (this.has(fallback)) return fallback;
    return this.has('idle') ? ('idle' as PlayableId) : null;
  }
}
