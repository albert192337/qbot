import { describe, it, expect } from 'vitest';
import { emptyProgress, grantWelcome, sanitizeProgress, settleCompanion, canOpenBox, applyOpenBox, IDLE_DELTA_CAP_MS } from '../src/main/progress-rules';
import { IDLE_MS_PER_BOX, POINTS_PER_BOX } from '../src/shared/furniture';

describe('P0 companion rewards', () => {
  it('new and legacy users can immediately open a box, without platform hooks', () => {
    for (const p of [emptyProgress(), { ...emptyProgress(), boxes: 2, inventory: { lamp: 3 } }]) {
      const migrated = grantWelcome(p);
      expect(canOpenBox(migrated).ok).toBe(true);
      expect(migrated.inventory).toEqual(p.inventory);
    }
  });
  it('welcome award survives serialization and cannot be claimed twice', () => {
    const p = applyOpenBox(grantWelcome(emptyProgress()), 'lamp');
    expect(grantWelcome(sanitizeProgress(JSON.parse(JSON.stringify(p))))).toEqual(p);
    expect(p.points).toBe(0);
  });
  it('15 minutes supplies both resources; ordinary Mac users have the full cycle', () => {
    let p: ReturnType<typeof emptyProgress> = { ...emptyProgress(), welcomeGrantVersion: 1 };
    for (let ms=0; ms<IDLE_MS_PER_BOX; ms+=30000) p=settleCompanion(p,30000,3);
    expect(p.boxes).toBe(1); expect(p.points).toBe(POINTS_PER_BOX);
    expect(canOpenBox(p).ok).toBe(true);
  });
  it('full storage pauses points and boxes without deleting existing rewards', () => {
    const p={...emptyProgress(),boxes:4,points:700,idleMs:12000};
    expect(settleCompanion(p,30000,3)).toEqual(p);
  });
  it('sleep/resume does not award an entire night of resources', () => {
    const p=settleCompanion(emptyProgress(),12*3600000,3);
    expect(p.idleMs).toBe(IDLE_DELTA_CAP_MS); expect(p.boxes).toBe(0); expect(p.points).toBe(0);
  });
});
