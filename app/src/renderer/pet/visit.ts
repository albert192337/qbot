/**
 * 串门编排器：两个角色同屏各自循环聊天动画，每几秒切换表情，持续一段时间后访客离开。
 * 纯逻辑，不碰 DOM；所有调度（何时触发）由外部 main.ts 控制。
 */
import type { CharacterMeta } from '../../shared/ipc-types';

export type VisitAction = 'talk_happy' | 'talk_annoyed';

/** 每轮交换间隔（秒） */
const SWITCH_INTERVAL_MIN_SEC = 3;
const SWITCH_INTERVAL_MAX_SEC = 6;
/** 串门持续轮数 */
const ROUND_MIN = 3;
const ROUND_MAX = 6;

export interface VisitCallbacks {
  onVisitStart(visitor: CharacterMeta): void;
  /** host/visitor 各自循环播放动作 */
  onHostPlay(action: VisitAction): void;
  onVisitorPlay(action: VisitAction): void;
  onVisitEnd(): void;
}

export class VisitOrchestrator {
  private active = false;
  private roundLeft = 0;
  private totalRounds = 0;
  private switchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private callbacks: VisitCallbacks,
    private rng: { random(): number } = { random: () => Math.random() },
  ) {}

  isActive(): boolean { return this.active; }

  getExchangeRound(): string {
    if (!this.active) return '—';
    return `${this.totalRounds - this.roundLeft}/${this.totalRounds}`;
  }
  getTurnLabel(): string {
    if (!this.active) return '—';
    return this.roundLeft % 2 === 0 ? '宿主' : '访客';
  }

  /** 开始串门：两人同时开始循环聊天 */
  startVisit(visitor: CharacterMeta): void {
    if (this.active) return;
    this.active = true;
    this.roundLeft = ROUND_MIN + Math.floor(this.rng.random() * (ROUND_MAX - ROUND_MIN + 1));
    this.totalRounds = this.roundLeft;
    this.callbacks.onVisitStart(visitor);
    // 两人都开始 loop talk 动画
    this.callbacks.onHostPlay('talk_happy');
    this.callbacks.onVisitorPlay('talk_happy');
    this.scheduleSwitch();
  }

  /** 强制结束 */
  cancelVisit(): void {
    if (!this.active) return;
    this.active = false;
    this.clearSwitchTimer();
    this.callbacks.onVisitEnd();
  }

  private scheduleSwitch(): void {
    this.clearSwitchTimer();
    const delaySec = SWITCH_INTERVAL_MIN_SEC +
      Math.floor(this.rng.random() * (SWITCH_INTERVAL_MAX_SEC - SWITCH_INTERVAL_MIN_SEC + 1));
    this.switchTimer = setTimeout(() => this.doSwitch(), delaySec * 1000);
  }

  private doSwitch(): void {
    this.switchTimer = null;
    if (!this.active) return;
    this.roundLeft--;
    if (this.roundLeft <= 0) {
      this.active = false;
      this.callbacks.onVisitEnd();
      return;
    }
    // 随机切换两人中的一方或双方的表情
    const roll = this.rng.random();
    if (roll < 0.4) {
      this.callbacks.onHostPlay(this.pickAction());
    } else if (roll < 0.7) {
      this.callbacks.onVisitorPlay(this.pickAction());
    } else {
      this.callbacks.onHostPlay(this.pickAction());
      this.callbacks.onVisitorPlay(this.pickAction());
    }
    this.scheduleSwitch();
  }

  private pickAction(): VisitAction {
    return this.rng.random() < 0.7 ? 'talk_happy' : 'talk_annoyed';
  }

  private clearSwitchTimer(): void {
    if (this.switchTimer) {
      clearTimeout(this.switchTimer);
      this.switchTimer = null;
    }
  }
}
