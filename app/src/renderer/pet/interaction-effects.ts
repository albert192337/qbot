import type { Application, Sprite, Texture } from 'pixi.js';
import { isDesktopQuiet } from './desktop-visibility';

type Kind = 'heart' | 'star';
type Particle = { sprite: Sprite; kind: Kind; x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; spin: number };
const instances = new WeakMap<HTMLElement, InteractionEffects>();

/** One transparent, demand-rendered layer per pet. Coordinates follow the stage. */
export function petEffects(stage: HTMLElement): InteractionEffects {
  let effects = instances.get(stage);
  if (!effects) { effects = new InteractionEffects(stage); instances.set(stage, effects); }
  return effects;
}

class InteractionEffects {
  private app?: Application;
  private pixi?: typeof import('./pixi-runtime');
  private textures?: Record<Kind, Texture>;
  private loading?: Promise<void>;
  private particles: Particle[] = [];
  private epochs = { heart: 0, star: 0 };
  private disposed = false;
  private failed = false;
  private lastHeart = -Infinity;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private observer: MutationObserver;

  constructor(private stage: HTMLElement) {
    this.observer = new MutationObserver(this.checkVisibility);
    this.observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-peek'] });
    document.addEventListener('visibilitychange', this.checkVisibility);
    this.motion.addEventListener('change', this.checkVisibility);
    window.addEventListener('pagehide', this.destroy, { once: true });
  }

  private allowed = () => !this.disposed && !this.failed && !this.motion.matches && !document.hidden && !isDesktopQuiet() && this.stage.isConnected;
  private checkVisibility = () => { if (!this.allowed()) this.clear(); };

  heart(clientX?: number, clientY?: number): void {
    if (!this.allowed() || performance.now() - this.lastHeart < 190) return;
    this.lastHeart = performance.now();
    const rect = this.stage.getBoundingClientRect();
    const x = clientX === undefined ? .5 : (clientX - rect.left) / Math.max(1, rect.width);
    const y = clientY === undefined ? .3 : (clientY - rect.top) / Math.max(1, rect.height);
    this.emit('heart', () => {
      this.add('heart', Math.max(.12, Math.min(.88, x)) + (Math.random() - .5) * .06,
        Math.max(.2, Math.min(.85, y)), (Math.random() - .5) * .04, -.09 - Math.random() * .04, 1 + Math.random() * .3, .026 + Math.random() * .011);
    });
  }

  levelUp(): void {
    this.clear('star');
    this.emit('star', () => {
      // A few asymmetric glints, appearing at different times near the silhouette.
      const glints = [[.32,.19,0],[.67,.28,.13],[.27,.49,.34],[.74,.55,.22],[.56,.12,.48]];
      for (const [x,y,delay] of glints) {
        this.add('star', x + (Math.random() - .5) * .05, y + (Math.random() - .5) * .05,
          (Math.random() - .5) * .008, -.008 - Math.random() * .008,
          .65 + Math.random() * .25, .015 + Math.random() * .009, delay);
      }
    });
  }

  private emit(kind: Kind, spawn: () => void): void {
    if (!this.allowed()) return;
    const epoch = this.epochs[kind], requested = performance.now();
    void this.init().then(() => {
      if (!this.app || !this.allowed() || this.epochs[kind] !== epoch || performance.now() - requested > 1500) return;
      spawn();
      this.layout();
      this.app.canvas.hidden = false;
      this.app.canvas.dataset.running = 'true';
      this.app.start();
    }).catch(() => { /* Effects never interrupt the pet's interaction. */ });
  }

  private init(): Promise<void> {
    return this.loading ??= (async () => {
      let app: Application | undefined;
      try {
        const pixi = await import('./pixi-runtime');
        if (this.disposed) return;
        app = new pixi.Application();
        await app.init({ width: 1, height: 1, backgroundAlpha: 0, preference: 'webgl', antialias: true,
          autoStart: false, sharedTicker: false, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2) });
        if (this.disposed) { app.destroy(true, { children: true }); return; }
        this.app = app; this.pixi = pixi;
        app.stage.eventMode = 'none';
        app.ticker.maxFPS = 30;
        app.ticker.add(this.tick);
        const heart = new pixi.Graphics().moveTo(0, 12).bezierCurveTo(-24, -3, -12, -20, 0, -8)
          .bezierCurveTo(12, -20, 24, -3, 0, 12).fill(0xeaa5b7);
        const star = new pixi.Graphics().star(0, 0, 4, 15, 3.5).fill(0xffe8bb);
        this.textures = { heart: app.renderer.generateTexture(heart), star: app.renderer.generateTexture(star) };
        heart.destroy(); star.destroy();
        app.canvas.className = 'pet-interaction-effects';
        app.canvas.setAttribute('aria-hidden', 'true');
        app.canvas.style.cssText = 'position:fixed;pointer-events:none;z-index:4;';
        app.canvas.hidden = true;
        app.canvas.dataset.running = 'false';
        document.body.append(app.canvas);
      } catch (error) {
        this.failed = true;
        if (app?.renderer) app.destroy(true, { children: true });
        this.app = undefined;
        console.warn('[pet-effects] Visual effects unavailable', error);
      }
    })();
  }

  private add(kind: Kind, x: number, y: number, vx: number, vy: number, life: number, size: number, delay = 0): void {
    if (!this.app || !this.pixi || !this.textures || this.particles.length >= 64) return;
    const sprite = new this.pixi.Sprite(this.textures[kind]);
    sprite.anchor.set(.5);
    sprite.alpha = 0;
    sprite.rotation = (Math.random() - .5) * .5;
    this.app.stage.addChild(sprite);
    this.particles.push({ sprite, kind, x, y, vx, vy, life, size, age: -delay, spin: (Math.random() - .5) * (kind === 'star' ? .12 : .35) });
  }

  private layout(): void {
    if (!this.app) return;
    const rect = this.stage.getBoundingClientRect(), width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
    if (this.app.screen.width !== width || this.app.screen.height !== height) this.app.renderer.resize(width, height);
    this.app.canvas.style.left = `${rect.left}px`; this.app.canvas.style.top = `${rect.top}px`;
  }

  private tick = (): void => {
    if (!this.app) return;
    if (!this.allowed()) { this.clear(); return; }
    this.layout();
    const dt = Math.min(this.app.ticker.deltaMS / 1000, .08), { width, height } = this.app.screen;
    this.particles = this.particles.filter(p => {
      p.age += dt;
      if (p.age < 0) return true;
      if (p.age >= p.life) { p.sprite.destroy(); return false; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.sprite.position.set(p.x * width, p.y * height);
      p.sprite.rotation += p.spin * dt;
      const progress = p.age / p.life, scale = Math.min(1, p.age / .18);
      const shimmer = Math.sin(Math.PI * progress);
      p.sprite.alpha = p.kind === 'star' ? .8 * shimmer ** 1.4 : .72 * scale * (1 - progress) ** .8;
      p.sprite.width = p.size * Math.min(width, height) * (p.kind === 'star' ? .7 + .3 * shimmer : .8 + .2 * scale);
      p.sprite.scale.y = p.sprite.scale.x;
      return true;
    });
    this.app.canvas.dataset.particles = String(this.particles.length);
    if (!this.particles.length) this.sleep();
  };

  clear(kind?: Kind): void {
    for (const k of ['heart', 'star'] as const) if (!kind || kind === k) this.epochs[k]++;
    this.particles = this.particles.filter(p => { if (kind && p.kind !== kind) return true; p.sprite.destroy(); return false; });
    if (this.app) this.app.canvas.dataset.particles = String(this.particles.length);
    if (!this.particles.length) this.sleep();
  }

  private sleep(): void {
    if (!this.app) return;
    this.app.stop(); this.app.canvas.hidden = true; this.app.canvas.dataset.running = 'false';
  }

  private destroy = (): void => {
    this.disposed = true; this.clear(); this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.checkVisibility);
    this.motion.removeEventListener('change', this.checkVisibility);
    this.app?.destroy(true, { children: true });
    this.textures?.heart.destroy(true); this.textures?.star.destroy(true);
    this.app = undefined;
  };
}
