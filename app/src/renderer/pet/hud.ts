/**
 * 桌宠窗底部 HUD —— 点数药丸 + 宝箱按钮。
 * 纯 DOM 构造，不依赖 Player / StateMachine。
 * 设计约定（PLAN.md §2）：pointer-events:none 容器，只有药丸和宝箱可点。
 */
import type { Progress } from '../../shared/ipc-types';
import { POINTS_PER_BOX, canAffordBox } from '../../shared/furniture';
import { formatPoints, shouldTweenPoints, spendLabel } from './hud-format';

/** 宝箱内联 SVG —— 梯形箱体 + 弧形盖 + 金色锁扣 */
const CHEST_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="14" width="22" height="14" rx="2" fill="#8a5a32" stroke="#6b4423" stroke-width="1"/>
  <path d="M4 14 Q4 8 16 6 Q28 8 28 14" fill="#a06830" stroke="#6b4423" stroke-width="1"/>
  <rect x="13" y="10" width="6" height="6" rx="1" fill="#e0b354" stroke="#c4956a" stroke-width="0.8"/>
  <circle cx="16" cy="13" r="1.2" fill="#6b4423"/>
  <line x1="5" y1="14" x2="27" y2="14" stroke="#6b4423" stroke-width="0.8"/>
</svg>`;

export class ProgressHud {
  readonly root: HTMLElement;
  private pill: HTMLElement;
  private numEl: HTMLElement;
  readonly chestBtn: HTMLButtonElement;
  private floatEl: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPoints = 0;
  private tweenRaf: ReturnType<typeof requestAnimationFrame> | null = null;

  onChestClick: () => void = () => {};

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'pet-hud';

    // 药丸：✦ + 点数
    this.pill = document.createElement('div');
    this.pill.className = 'hud-pill';
    const mark = document.createElement('span');
    mark.className = 'hud-mark';
    mark.textContent = '✦';
    this.numEl = document.createElement('span');
    this.numEl.className = 'hud-num';
    this.numEl.textContent = '0';
    this.pill.appendChild(mark);
    this.pill.appendChild(this.numEl);

    // 宝箱按钮
    this.chestBtn = document.createElement('button');
    this.chestBtn.className = 'hud-chest';
    this.chestBtn.innerHTML = CHEST_SVG;
    this.chestBtn.title = '开箱';
    this.chestBtn.hidden = true;
    this.chestBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onChestClick();
    });

    // 飘字
    this.floatEl = document.createElement('div');
    this.floatEl.className = 'hud-float';

    // 失败提示
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'hud-toast';

    this.root.appendChild(this.pill);
    this.root.appendChild(this.chestBtn);
    this.root.appendChild(this.floatEl);
    this.root.appendChild(this.toastEl);
    document.body.appendChild(this.root);
  }

  /** 幂等更新：走 shouldTween 门控，防回弹 */
  setProgress(p: Progress): void {
    const pts = p.points ?? 0;
    this.chestBtn.hidden = !canAffordBox(pts, p.boxes ?? 0);
    if (shouldTweenPoints(this.lastPoints, pts)) {
      this.tweenPoints(this.lastPoints, pts);
    } else {
      this.numEl.textContent = formatPoints(pts);
    }
    this.lastPoints = pts;
  }

  /** 开箱飘字 −500 ↑ */
  floatSpend(n: number): void {
    this.floatEl.textContent = spendLabel(n);
    this.floatEl.classList.remove('go');
    void this.floatEl.offsetWidth; // reflow 重启动画
    this.floatEl.classList.add('go');
  }

  /** 失败 toast，2.5s 自动收 */
  toast(text: string): void {
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
      this.toastTimer = null;
    }, 2500);
  }

  /** 拖拽时隐藏 */
  onDragStart(): void {
    this.root.classList.add('lifted');
  }

  /** 拖拽结束后延迟 1.5s 恢复（套 signboard 节奏） */
  onDragEnd(): void {
    setTimeout(() => this.root.classList.remove('lifted'), 1500);
  }

  /** 数字 tween（大额变化 400ms） */
  private tweenPoints(from: number, to: number): void {
    if (this.tweenRaf !== null) cancelAnimationFrame(this.tweenRaf);
    const start = performance.now();
    const DURATION = 400;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const ease = 1 - (1 - t) * (1 - t); // easeOutQuad
      const cur = Math.round(from + (to - from) * ease);
      this.numEl.textContent = formatPoints(cur);
      if (t < 1) {
        this.tweenRaf = requestAnimationFrame(step);
      } else {
        this.numEl.textContent = formatPoints(to);
        this.tweenRaf = null;
      }
    };
    this.tweenRaf = requestAnimationFrame(step);
  }
}
