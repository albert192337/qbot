const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Window coordinates are in DIP; offsets are in the room's 1000px canvas. */
export class RoomMotion {
  private previous: { x: number; y: number; width: number; time: number } | null = null;
  private lastMove = -Infinity;
  private driftX = 0;
  private driftY = 0;
  private vx = 0;
  private vy = 0;
  private lift = 0;

  reset() {
    this.previous = null;
    this.lastMove = -Infinity;
    this.driftX = this.driftY = this.vx = this.vy = this.lift = 0;
  }

  step(now: number, x: number, y: number, width: number, reduced = false) {
    const old = this.previous;
    if (reduced || !old || now - old.time > 250 || width !== old.width) this.reset();
    this.previous = { x, y, width, time: now };
    if (!old || reduced || now - old.time > 250 || width !== old.width) return;
    const dt = Math.max(0, Math.min((now - old.time) / 1000, .05));
    const dx = x - old.x, dy = y - old.y;
    if (dx || dy) {
      this.lastMove = now;
      // Oppose the box's movement, with a bounded impulse even across monitors.
      const scale = 1000 / Math.max(1, width);
      this.vx = clamp(this.vx - clamp(dx * scale, 70) * 5, 240);
      this.vy = clamp(this.vy - clamp(dy * scale, 50) * 3, 140);
    }
    const moving = now - this.lastMove < 120;
    this.lift += ((moving ? 25 : 0) - this.lift) * (1 - Math.exp(-dt * (moving ? 14 : 9)));
    // Substeps keep the damped spring stable at the room's 24fps paint rate.
    const steps = Math.max(1, Math.ceil(dt / .008));
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      this.vx += (-65 * this.driftX - 11 * this.vx) * h;
      this.vy += (-75 * this.driftY - 12 * this.vy) * h;
      this.driftX = clamp(this.driftX + this.vx * h, 30);
      this.driftY = clamp(this.driftY + this.vy * h, 12);
    }
  }

  pose(now: number, index: number) {
    const floating = Math.min(1, this.lift / 25);
    const phase = now / 180 + index * 1.7;
    return {
      x: this.driftX * (1 + .06 * Math.sin(index * 2)),
      y: Math.min(0, -this.lift + this.driftY + Math.sin(phase) * 2.5 * floating),
      angle: clamp(-this.driftX * .009 + Math.sin(phase) * .025 * floating, .22),
      shadow: 1 - floating * .4,
    };
  }
}
