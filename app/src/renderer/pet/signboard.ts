/**
 * 举牌模块：长柄木牌，文字在小人头顶上方。
 * 柱子撑高，牌子在顶部；拖拽时自动隐藏，松手后延时弹出。
 * 纯 DOM，不碰状态机。
 */
export class Signboard {
  private el: HTMLElement;
  private board: HTMLElement;
  private visible = false;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Signboard container #${containerId} not found`);
    this.el = document.createElement('div');
    this.el.className = 'signboard';

    // 木板在上（头顶）
    this.board = document.createElement('div');
    this.board.className = 'signboard-board';
    this.el.appendChild(this.board);

    // 长手柄在下（到底部）
    const post = document.createElement('div');
    post.className = 'signboard-post';
    this.el.appendChild(post);

    container.appendChild(this.el);
  }

  setText(text: string): void {
    this.board.textContent = text || '';
  }

  getText(): string {
    return this.board.textContent ?? '';
  }

  /** 显示（带弹出特效） */
  show(): void {
    this.clearPending();
    if (this.visible) return;
    this.visible = true;
    this.el.classList.add('show');
    // 触发弹出动画
    this.el.classList.remove('poof-in');
    void this.el.offsetWidth;
    this.el.classList.add('poof-in');
  }

  /** 立即隐藏，并清空文字（避免 onDragEnd 因残留文字又弹出来） */
  hide(): void {
    this.clearPending();
    this.board.textContent = '';
    if (!this.visible) return;
    this.visible = false;
    this.el.classList.remove('show', 'poof-in');
  }

  /** 拖拽时调用：临时藏起（不丢文字，松手后自动弹回） */
  onDragStart(): void {
    this.clearPending();
    this.el.classList.remove('show', 'poof-in');
  }

  /** 拖拽结束后调用：延时 1.5s 后弹回（有文字才弹） */
  onDragEnd(): void {
    if (!this.board.textContent) return;
    this.clearPending();
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      if (this.board.textContent) this.show();
    }, 1500);
  }

  isVisible(): boolean {
    return this.visible;
  }

  private clearPending(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }
}
