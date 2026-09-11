import { describe, expect, it } from 'vitest';
import { blocked, freshLayout, project, restoreLayout, route, unproject } from '../src/renderer/cozy/model';
describe('local cozy room placement and navigation', () => {
  it('restores only safe placement data and never trusts sprite metadata', () => {
    const input = { version: 1, theme: 'night', furniture: [{ id: 'sofa', u: 999, v: -3, width: 999999, visible: false }, null] };
    const restored = restoreLayout(input);
    expect(restored.theme).toBe('night');
    expect(restored.furniture[0]).toMatchObject({ u: .88, v: .12, width: 265, visible: false });
    expect(restoreLayout({ version: 0 })).toEqual(freshLayout());
  });
  it('keeps screen/world coordinates consistent for scaled-pointer placement', () => {
    const p = project(.32,.71), uv = unproject(p);
    expect(uv.u).toBeCloseTo(.32); expect(uv.v).toBeCloseTo(.71);
  });
  it('routes through open floor cells around furniture', () => {
    const layout = freshLayout();
    const steps = route(project(.85,.85), project(.15,.2), layout.furniture);
    expect(steps.length).toBeGreaterThan(2);
    for (const p of steps) { expect(blocked(p,layout.furniture)).toBe(false); const uv = unproject(p); expect(uv.u).toBeGreaterThan(.08); expect(uv.v).toBeLessThan(.92); }
  });
});
