/**
 * 桌宠窗底部 HUD —— 点数药丸 + 宝箱按钮。
 * 纯 DOM 构造，不依赖 Player / StateMachine。
 * 设计约定（PLAN.md §2）：pointer-events:none 容器，只有药丸和宝箱可点。
 */
import type { Progress } from '../../shared/ipc-types';
import { DEFAULT_MAX_BOXES, POINTS_PER_BOX, canAffordBox, shouldShowChest } from '../../shared/furniture';
import { formatPoints, shouldTweenPoints, spendLabel } from './hud-format';
import { attachGardenHint } from './garden-hint';

/** 宝箱内联 SVG —— 梯形箱体 + 弧形盖 + 金色锁扣 */
const CHEST_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="14" width="22" height="14" rx="2" fill="#8a5a32" stroke="#6b4423" stroke-width="1"/>
  <path d="M4 14 Q4 8 16 6 Q28 8 28 14" fill="#a06830" stroke="#6b4423" stroke-width="1"/>
  <rect x="13" y="10" width="6" height="6" rx="1" fill="#e0b354" stroke="#c4956a" stroke-width="0.8"/>
  <circle cx="16" cy="13" r="1.2" fill="#6b4423"/>
  <line x1="5" y1="14" x2="27" y2="14" stroke="#6b4423" stroke-width="0.8"/>
</svg>`;
const OPEN_CHEST_SVG = `<svg viewBox="0 0 32 32" fill="none"><path d="M5 12 7 3Q16 0 25 3L27 12Z" fill="#ba8244" stroke="#6b4423" stroke-width="1.5"/><path d="M7 10 8 5Q16 3 24 5L25 10Z" fill="#f7db86"/><ellipse cx="16" cy="17" rx="11" ry="5" fill="#fff1ad"/><path d="M5 16V28H27V16Q16 23 5 16Z" fill="#a06830" stroke="#6b4423" stroke-width="1.5"/><rect x="13" y="20" width="6" height="5" rx="1" fill="#e0b354"/></svg>`;

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
  private dots: HTMLElement;
  private chestArt: HTMLElement;
  private opened = 0;
  private previousBoxes: number | null = null;
  private openingTimer: ReturnType<typeof setTimeout> | null = null;
  private progress: Progress | null = null;

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
    this.chestArt = document.createElement('span');
    this.chestArt.className = 'chest-art';
    this.chestArt.innerHTML = CHEST_SVG;
    this.dots = document.createElement('span');
    this.dots.className = 'chest-dots';
    this.dots.setAttribute('aria-hidden', 'true');
    this.chestBtn.append(this.chestArt, this.dots);
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

    const chat = document.createElement('button');
    chat.className = 'hud-chat';
    chat.title = '和它聊聊';
    chat.setAttribute('aria-label', '和桌宠聊天');
    chat.innerHTML = '<svg viewBox="0 0 32 32" fill="none"><path d="M7 5h18a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H14l-7 5v-5a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z" fill="#fff8eb" stroke="#594235" stroke-width="2"/><circle cx="10" cy="15" r="1.5" fill="#594235"/><circle cx="16" cy="15" r="1.5" fill="#594235"/><circle cx="22" cy="15" r="1.5" fill="#594235"/></svg>';
    chat.addEventListener('pointerdown', e => e.stopPropagation());
    chat.addEventListener('click', e => { e.stopPropagation(); window.qbot.bubble.openChat(); });
    this.root.appendChild(chat);
    this.root.appendChild(this.pill);
    this.root.appendChild(this.chestBtn);
    const garden = document.createElement('button');
    garden.className = 'hud-chat hud-garden'; garden.title = '展开 / 收起花园'; garden.setAttribute('aria-label', '展开或收起花园');
    garden.innerHTML = '<svg viewBox="0 0 32 32" fill="none"><path d="M16 28V13M16 19C3 18 4 6 5 5c10 0 12 8 11 14ZM16 15C15 5 24 3 28 4c0 8-4 12-12 11Z" fill="#83b589" stroke="#302d27" stroke-width="2.4" stroke-linejoin="round"/><path d="M7 28h19" stroke="#302d27" stroke-width="2.4" stroke-linecap="round"/></svg>';
    garden.addEventListener('pointerdown', e => e.stopPropagation());
    garden.addEventListener('click', e => { e.stopPropagation(); window.qbot.garden.toggle(); });
    this.root.appendChild(garden);
    for (const [page,label,svg] of [
      ['travel','世界旅行','<circle cx="16" cy="16" r="12" fill="#add7c6" stroke="#594235" stroke-width="2"/><path d="m8 8 8-3 3 7-5 4 4 7-6 4-5-10z" fill="#739970"/>'],
      ['moments','旅行朋友圈','<rect x="4" y="4" width="24" height="25" rx="4" fill="#fff1d4" stroke="#594235" stroke-width="2"/><path d="M8 9h16v13H8z" fill="#b1d1c5"/><path d="m8 22 6-9 4 6 3-3 3 6" fill="#7d9c79"/>'],
    ]) {
      const b=document.createElement('button');b.className='hud-chat';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=`<svg viewBox="0 0 32 32">${svg}</svg>`;
      b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',e=>{e.stopPropagation();window.qbot.garden.open(page);});this.root.append(b);
    }
    const stopGardenHint = attachGardenHint(garden, window.qbot.garden);
    window.addEventListener('pagehide', stopGardenHint, { once: true });
    this.root.appendChild(this.floatEl);
    this.root.appendChild(this.toastEl);
    document.body.appendChild(this.root);
  }

  /** 幂等更新：走 shouldTween 门控，防回弹 */
  setProgress(p: Progress): void {
    this.progress = p;
    const pts = p.points ?? 0;
    const boxes = Math.min(DEFAULT_MAX_BOXES, p.boxes ?? 0);
    if (this.previousBoxes !== null) {
      this.opened = boxes > this.previousBoxes ? 0 : Math.min(DEFAULT_MAX_BOXES - boxes, this.opened + this.previousBoxes - boxes);
    }
    this.previousBoxes = boxes;
    const dotCount = Math.min(DEFAULT_MAX_BOXES, boxes + this.opened);
    this.dots.replaceChildren(...Array.from({ length: dotCount > 1 ? dotCount : 0 }, (_, i) => {
      const dot = document.createElement('i');
      dot.className = i < boxes ? 'unopened' : i < boxes + this.opened ? 'opened' : 'empty';
      return dot;
    }));
    const show = shouldShowChest(boxes) || this.openingTimer !== null;
    this.chestBtn.hidden = !show;
    if (show) {
      const affordable = canAffordBox(pts, boxes);
      this.chestBtn.disabled = !affordable;
      if (!affordable) {
        const need = POINTS_PER_BOX - pts;
        this.chestBtn.title = `还差 ${need} 点开箱`;
      } else {
        this.chestBtn.title = `开箱 · 剩余 ${boxes} / ${DEFAULT_MAX_BOXES}`;
      }
      this.chestBtn.setAttribute('aria-label', this.chestBtn.title);
    }
    if (shouldTweenPoints(this.lastPoints, pts)) {
      this.tweenPoints(this.lastPoints, pts);
    } else {
      this.numEl.textContent = formatPoints(pts);
    }
    this.lastPoints = pts;
  }

  playOpen(): void {
    if (this.openingTimer) clearTimeout(this.openingTimer);
    this.chestArt.innerHTML = OPEN_CHEST_SVG;
    this.chestBtn.classList.remove('opening');
    void this.chestBtn.offsetWidth;
    this.chestBtn.classList.add('opening');
    this.chestBtn.hidden = false;
    this.openingTimer = setTimeout(() => {
      this.openingTimer = null;
      this.chestArt.innerHTML = CHEST_SVG;
      this.chestBtn.classList.remove('opening');
      if (this.progress) this.setProgress(this.progress);
    }, 850);
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
