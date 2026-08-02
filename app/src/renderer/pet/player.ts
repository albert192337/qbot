/**
 * WebM 播放器：每个已生成动作一个 <video> 预创建堆叠，切 visibility 硬切（不换 src，零闪黑）。
 * idle/drag 循环播放；auto 动作不 loop，靠 ended 事件计数。
 * 标准 6 动作 + 用户自定义动作（manifest.customActions）都会加载。
 */
import type { Manifest, ManifestAction, PlayableId } from '@qbot/pipeline';

const LOOPING: ReadonlySet<string> = new Set(['idle', 'drag']);

export class Player {
  private videos = new Map<string, HTMLVideoElement>();
  private current: string | null = null;
  /** 非循环动作的安全超时：防止 ended 不触发导致状态机卡死 */
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private container: HTMLElement,
    private onEnded: () => void,
  ) {}

  /** 加载角色：重建全部视频元素（未生成完的动作不建）。保留非 video 子元素（烟雾/牌子等） */
  load(dirId: string, manifest: Manifest): PlayableId[] {
    this.clearSafetyTimer();
    // 只清理 video + poof 元素，保留 signboard 等其他 DOM
    for (const el of Array.from(this.container.querySelectorAll('video,.stage-poof'))) {
      el.remove();
    }
    // 确保有烟雾元素
    let poof = this.container.querySelector('.stage-poof');
    if (!poof) {
      poof = document.createElement('div');
      poof.className = 'stage-poof';
      this.container.appendChild(poof);
    }
    this.videos.clear();
    this.current = null;
    const available: PlayableId[] = [];
    // 标准动作 + 自定义动作一起加载（自定义动作让听歌/agent 联动可选自制动画）
    const all: [string, ManifestAction][] = [
      ...(Object.entries(manifest.actions) as [string, ManifestAction][]),
      ...(Object.entries(manifest.customActions ?? {}) as [string, ManifestAction][]),
    ];
    for (const [id, action] of all) {
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
        this.clearSafetyTimer();
        if (this.current === id) this.onEnded();
      });
      this.container.appendChild(video);
      this.videos.set(id, video);
      available.push(id);
    }
    return available;
  }

  /** 硬切到指定动作（同动作重复调用 = 从头重播） */
  play(action: PlayableId): void {
    this.playImpl(action, false);
  }

  /** 播放并强制循环（串门聊天的 talk 动作需要一直循环，不靠 ended 推进） */
  playLooping(action: PlayableId): void {
    this.playImpl(action, true);
  }

  private playImpl(action: PlayableId, forceLoop: boolean): void {
    this.clearSafetyTimer();
    const next = this.videos.get(action);
    if (!next) return;
    if (this.current && this.current !== action) {
      const prev = this.videos.get(this.current);
      if (prev) {
        prev.style.visibility = 'hidden';
        prev.pause();
      }
      this.triggerPoof();
    }
    this.current = action;
    next.loop = forceLoop || LOOPING.has(action);
    next.style.visibility = 'visible';
    next.currentTime = 0;
    void next.play();
    // 非循环动作：安全超时 15s，防止 ended 不触发导致卡死
    if (!next.loop) {
      const duration = (next.duration && Number.isFinite(next.duration)) ? (next.duration + 2) * 1000 : 15_000;
      this.safetyTimer = setTimeout(() => {
        this.safetyTimer = null;
        if (this.current === action) {
          this.onEnded();
        }
      }, Math.max(duration, 5_000));
    }
  }

  /** 触发一次烟雾过渡动画 */
  triggerPoof(): void {
    const poof = this.container.querySelector('.stage-poof');
    if (!poof) return;
    // 去掉 go class 重置动画
    poof.classList.remove('go');
    void (poof as HTMLElement).offsetWidth; // force reflow
    poof.classList.add('go');
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
