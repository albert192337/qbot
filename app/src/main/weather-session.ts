import type { WeatherKind } from '../shared/weather';

export interface WeatherSurface {
  transition(kind: WeatherKind | null): Promise<void>;
  dispose(): void;
}

/** Serializes transitions and invalidates in-flight creation on quit/display loss. */
export class WeatherSession {
  private surface: WeatherSurface | null = null;
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private pending = 0;
  current: WeatherKind | null = null;
  get busy(): boolean { return this.pending > 0; }

  constructor(private readonly create: () => Promise<WeatherSurface>) {}

  change(kind: WeatherKind | null): Promise<void> {
    const generation = this.generation;
    this.pending++;
    const work = this.queue.then(async () => {
      if (generation !== this.generation) return;
      try {
        if (!this.surface && kind) {
          const created = await this.create();
          if (generation !== this.generation) { created.dispose(); return; }
          this.surface = created;
        }
        const surface = this.surface;
        if (!surface) return;
        await surface.transition(kind);
        if (generation !== this.generation) return;
        this.current = kind;
        if (!kind) { surface.dispose(); this.surface = null; }
      } catch (error) {
        if (generation === this.generation) this.stop();
        throw error;
      }
    });
    this.queue = work.catch(() => {});
    return work.finally(() => { this.pending--; });
  }

  stop(): void {
    this.generation++;
    this.surface?.dispose();
    this.surface = null;
    this.current = null;
  }
}
