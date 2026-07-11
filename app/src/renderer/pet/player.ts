/**
 * WebM 播放器：6 个 <video> 预创建堆叠，切 visibility 硬切（不换 src，零闪黑）。
 * idle/drag 循环播放；auto 动作不 loop，靠 ended 事件计数。
 */
import type { ActionId, Manifest } from '@qbot/pipeline';

const LOOPING: ReadonlySet<ActionId> = new Set(['idle', 'drag'] as ActionId[]);

export class Player {
  private videos = new Map<ActionId, HTMLVideoElement>();
  private current: ActionId | null = null;

  constructor(
    private container: HTMLElement,
    private onEnded: () => void,
  ) {}

  /** 加载角色：重建全部视频元素（failed 动作不建） */
  load(dirId: string, manifest: Manifest): ActionId[] {
    this.container.replaceChildren();
    this.videos.clear();
    this.current = null;
    const available: ActionId[] = [];
    for (const [id, action] of Object.entries(manifest.actions) as [
      ActionId,
      Manifest['actions'][ActionId],
    ][]) {
      if (action.status !== 'done') continue;
      const video = document.createElement('video');
      video.src = `qbot-asset://${dirId}/${action.webm}`;
      video.muted = true; // 必须：否则 autoplay 策略拦截
      video.autoplay = false;
      video.loop = LOOPING.has(id);
      video.playsInline = true;
      video.preload = 'auto';
      video.style.visibility = 'hidden';
      video.addEventListener('ended', () => {
        if (this.current === id) this.onEnded();
      });
      this.container.appendChild(video);
      this.videos.set(id, video);
      available.push(id);
    }
    return available;
  }

  /** 硬切到指定动作（同动作重复调用 = 从头重播） */
  play(action: ActionId): void {
    const next = this.videos.get(action);
    if (!next) return;
    if (this.current && this.current !== action) {
      const prev = this.videos.get(this.current);
      if (prev) {
        prev.style.visibility = 'hidden';
        prev.pause();
      }
    }
    this.current = action;
    next.style.visibility = 'visible';
    next.currentTime = 0;
    void next.play();
  }
}
