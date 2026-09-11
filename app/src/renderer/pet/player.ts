/**
 * WebM 播放器：每个已生成动作一个 <video> 预创建堆叠，新动作开始播放后才切 visibility（保留上一帧）。
 * idle/drag 循环播放；auto 动作不 loop，靠 ended 事件计数。
 * 默认动作 + 预设动作 + 导入贴纸 + 用户自定义动作都会加载。
 */
import type { Manifest, ManifestAction, PlayableId } from '@qbot/pipeline';

const LOOPING: ReadonlySet<string> = new Set(['idle', 'drag']);

export class Player {
  private videos = new Map<string, HTMLVideoElement>();
  private current: string | null = null;
  /** 非循环动作的安全超时：防止 ended 不触发导致状态机卡死 */
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  private generation = 0;
  private cancelAttempt: (() => void) | null = null;
  private failed = new Set<string>();
  private fallback: HTMLImageElement | null = null;

  /** Stop detached visitors / release decoders before replacing a character. */
  dispose(): void {
    this.generation++;
    this.cancelAttempt?.();
    this.cancelAttempt = null;
    this.clearSafetyTimer();
    for (const video of this.videos.values()) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    }
    this.videos.clear();
    this.current = null;
    this.fallback?.remove();
    this.fallback = null;
  }

  constructor(
    private container: HTMLElement,
    private onEnded: () => void,
  ) {}

  /** 加载角色：重建全部视频元素（未生成完的动作不建）。保留非 video 子元素（烟雾/牌子等） */
  load(dirId: string, manifest: Manifest): PlayableId[] {
    this.dispose();
    this.failed.clear();
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
    // No functioning video (including initial load): keep the character's source image visible.
    this.fallback = document.createElement('img');
    this.fallback.src = `qbot-asset://${dirId}/${manifest.sourceImage}?v=${nonce}`;
    this.fallback.alt = manifest.name;
    this.fallback.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:1';
    this.fallback.style.visibility = 'visible';
    this.container.appendChild(this.fallback);
    /**
     * 合并顺序（sticker-import spec §4.3）：默认动作 → 导入贴纸 → 预设动作
     * → 自定义动作。后写的覆盖同名 key，所以导入贴纸能盖掉同名标准动作，
     * 而用户显式建的自定义动作优先级最高。
     * 贴纸只有 webm 没有 gif，且没有 status 字段（落盘即可用）。
     */
    const all: [string, { webm: string; status?: string }][] = [
      ...(Object.entries(manifest.actions) as [string, ManifestAction][]),
      ...Object.entries(manifest.importedActions ?? {}),
      ...(Object.entries(manifest.expressionActions ?? {}) as [string, ManifestAction][]),
      ...(Object.entries(manifest.customActions ?? {}) as [string, ManifestAction][]),
    ];
    for (const [id, action] of new Map(all.filter(([, a]) => a.status === undefined || a.status === 'done'))) {
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

  /** Let the idle director reconsider only after a complete clip, including the idle alias. */
  playOnce(action: PlayableId): void {
    this.playImpl(action, false, true);
  }

  private playImpl(action: PlayableId, forceLoop: boolean, forceOnce = false): void {
    const generation = ++this.generation;
    this.cancelAttempt?.();
    this.cancelAttempt = null;
    this.clearSafetyTimer();
    const id = [action, 'idle', ...this.videos.keys()]
      .find((candidate) => this.videos.has(candidate) && !this.failed.has(candidate));
    if (!id) return; // Leave the last good frame / source image in place.
    const next = this.videos.get(id)!;
    const active = () => generation === this.generation;
    let retries = 0;
    let lastTime = -1;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let completed = false;
    const clearWatchdog = () => {
      if (watchdog !== null) clearTimeout(watchdog);
      watchdog = null;
    };
    const armWatchdog = () => {
      clearWatchdog();
      watchdog = setTimeout(() => {
        if (!next.isConnected) { this.dispose(); return; }
        fail('no playback progress for 12s');
      }, 12_000);
    };
    const fail = (reason: unknown) => {
      if (!active() || completed) return;
      console.warn('[pet-player] playback recovery', { action: id, reason, retries });
      // A failed visible decoder may have lost its frame. Show the static fallback.
      if (this.current === id) {
        next.style.visibility = 'hidden';
        this.current = null;
        if (this.fallback) this.fallback.style.visibility = 'visible';
      }
      if (retries++ === 0) {
        start(true);
      } else {
        this.failed.add(id);
        this.playImpl(action, forceLoop);
      }
    };
    const reveal = () => {
      if (!active()) return;
      if (this.current && this.current !== id) this.triggerPoof();
      for (const video of this.videos.values()) {
        video.style.visibility = video === next ? 'visible' : 'hidden';
        if (video !== next) video.pause();
      }
      this.current = id;
      if (this.fallback) this.fallback.style.visibility = 'hidden';
    };
    const onProgress = () => {
      if (!active() || completed || next.paused || next.readyState < 2 || next.currentTime === lastTime) return;
      lastTime = next.currentTime;
      armWatchdog();
    };
    const onError = () => fail(next.error?.message ?? 'media error');
    const onEnded = () => {
      if (!active() || completed || this.current !== id) return;
      completed = true;
      clearWatchdog();
      this.clearSafetyTimer();
      this.onEnded();
    };
    next.addEventListener('timeupdate', onProgress);
    next.addEventListener('error', onError);
    next.addEventListener('ended', onEnded);
    this.cancelAttempt = () => {
      attempt++;
      clearWatchdog();
      next.removeEventListener('timeupdate', onProgress);
      next.removeEventListener('error', onError);
      next.removeEventListener('ended', onEnded);
      // Pending hidden play() must not leave a second decoder running.
      if (this.current !== id) next.pause();
    };
    const start = (reload: boolean) => {
      const token = ++attempt;
      completed = false;
      this.clearSafetyTimer();
      lastTime = -1;
      armWatchdog();
      try {
        next.loop = !forceOnce && (forceLoop || LOOPING.has(action));
        if (reload || next.error) next.load();
        if (next.readyState > 0) next.currentTime = 0;
        void next.play().then(() => {
          if (!active() || token !== attempt) return;
          reveal();
          // Start the semantic completion deadline only after playback actually starts.
          if (!next.loop) {
            const duration = Number.isFinite(next.duration) ? (next.duration + 2) * 1000 : 15_000;
            this.safetyTimer = setTimeout(onEnded, Math.max(duration, 5_000));
          }
        }).catch((error: unknown) => {
          if (active() && token === attempt) fail(error);
        });
      } catch (error) {
        if (active() && token === attempt) fail(error);
      }
    };
    start(false);
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
