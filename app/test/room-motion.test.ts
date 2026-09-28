import { describe, expect, it } from 'vitest';
import { RoomMotion } from '../src/renderer/online-room/motion';

describe('room movement', () => {
  it('floats against window movement, reverses, and settles after stopping', () => {
    const m = new RoomMotion();
    for (let t = 0; t <= 600; t += 40) m.step(t, t / 4, 0, 600);
    expect(m.pose(600, 0).x).toBeLessThan(-1);
    expect(m.pose(600, 0).y).toBeLessThan(-15);
    for (let t = 640; t <= 1200; t += 40) m.step(t, 150 - (t - 600) / 4, 0, 600);
    expect(m.pose(1200, 0).x).toBeGreaterThan(1);
    for (let t = 1240; t <= 4000; t += 40) m.step(t, 0, 0, 600);
    expect(Math.abs(m.pose(4000, 0).x)).toBeLessThan(.01);
    expect(Math.abs(m.pose(4000, 0).y)).toBeLessThan(.01);
    expect(Math.abs(m.pose(4000, 0).angle)).toBeLessThan(.001);
  });

  it('bounds rapid shaking and vertical motion', () => {
    const m = new RoomMotion();
    for (let t = 0; t < 10000; t += 40) {
      m.step(t, Math.sin(t) * 2000, Math.cos(t) * 2000, 600);
      const p = m.pose(t, 1);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(32);
      expect(p.y).toBeGreaterThanOrEqual(-40);
      expect(p.y).toBeLessThanOrEqual(0);
      expect(Math.abs(p.angle)).toBeLessThanOrEqual(.22);
    }
  });

  it('does not shake on initial placement, resize, resume, or reduced motion', () => {
    const m = new RoomMotion();
    m.step(0, 800, 400, 600);
    expect(m.pose(0, 0).y).toBe(0);
    m.step(40, 900, 400, 600);
    m.step(80, 700, 300, 800);
    expect(m.pose(80, 0).x).toBe(0);
    m.step(120, 750, 300, 800);
    m.step(1000, 1500, 300, 800);
    expect(m.pose(1000, 0).x).toBe(0);
    m.step(1040, 1600, 300, 800, true);
    expect(m.pose(1040, 0).y).toBe(0);
  });
});
