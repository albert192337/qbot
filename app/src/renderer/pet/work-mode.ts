/** Renderer receives elapsed aggregate press inactivity, never key identities or text. */
export const WORK_IDLE = 'computer_idle';
export const WORK_TYPING = 'computer_typing';
export class WorkMode {
  active = false;
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private action = '';
  constructor(private readIdle: () => Promise<number>, private play: (id: string) => void) {}
  start(): void {
    this.stop();
    this.active = true;
    this.show(WORK_IDLE);
    const revision = this.revision;
    const enteredAt = performance.now();
    const poll = async () => {
      try {
        const idle = await this.readIdle();
        if (!this.active || revision !== this.revision) return;
        this.show(Number.isFinite(idle) && idle >= 0 && idle < 100 && idle + 20 < performance.now() - enteredAt ? WORK_TYPING : WORK_IDLE);
      } catch {
        if (revision !== this.revision) return;
        this.show(WORK_IDLE);
      }
      if (this.active && revision === this.revision) this.timer = setTimeout(poll, 25);
    };
    this.timer = setTimeout(poll, 25);
  }
  stop(): void {
    this.active = false;
    this.revision++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.action = '';
  }
  private show(action: string): void {
    if (action === this.action) return;
    this.action = action;
    this.play(action);
  }
}
