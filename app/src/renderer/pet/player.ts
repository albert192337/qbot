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
    /**
     * 缓存击穿标记：重抠/重新生成动作后文件内容变了但 qbot-asset URL 一模一样，
     * Chromium 会直接吃缓存 → 界面上还是旧动画（实测踩到：重生 walk 后播的仍是旧的）。
     * 每次 load 带一个新 nonce 强制重取。本地协议读盘开销可忽略。
     */
    const nonce = Date.now();
    // 标准动作 + 自定义动作一起加载（自定义动作让听歌/agent 联动可选自制动画）
    const all: [string, ManifestAction][] = [
      ...(Object.entries(manifest.actions) as [string, ManifestAction][]),
      ...(Object.entries(manifest.customActions ?? {}) as [string, ManifestAction][]),
    ];
    for (const [id, action] of all) {
      if (action.status !== 'done') continue;
      const video = document.createElement('video');
      video.src = `qbot-asset://${dirId}/${action.webm}?v=${nonce}`;
      video.muted = true; // 必须：否则 autoplay 策略拦截
      video.autoplay = false;
      video.loop = LOOPING.has(id);
      video.playsInline = true;
      // 按需加载：9 个动作同时 preload='auto' 会让 qbot-asset 协议并发读盘，
      // 实测有 4 个视频报 MEDIA_ERR_NETWORK（传输中断）。只有常驻循环的 idle
      // 预加载，其余等首次 play() 时再取——切换有烟雾特效遮掩，感知不到延迟。
      video.preload = id === 'idle' ? 'auto' : 'none';
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
    // 不变量：任何时刻最多一个 video 可见。
    // 只隐藏 this.current 不够——任何让某个 video 变可见却没记进 current 的路径
    // （早退、外部直接改 style、load 时序竞态）都会留下两个角色叠着。
    // 宁可短暂空白，也不要重影，所以先无条件全隐藏。
    for (const v of this.videos.values()) {
      if (v === next) continue;
      v.style.visibility = 'hidden';
      v.pause();
    }
    if (!next) {
      this.current = null;
      return;
    }
    if (this.current && this.current !== action) {
      this.triggerPoof();
    }
    this.current = action;
    next.loop = forceLoop || LOOPING.has(action);
    next.style.visibility = 'visible';
    // 上次加载失败（协议并发读盘偶发 MEDIA_ERR_NETWORK）→ 重新取一次，
    // 否则这个动作会永久停在一帧不动。
    if (next.error) next.load();
    // preload='none' 时 readyState 为 0，此时设 currentTime 会抛；反正它本来就从 0 起
    if (next.readyState > 0) next.currentTime = 0;
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
