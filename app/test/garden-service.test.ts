import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const mock = vi.hoisted(() => ({ dir: '', points: 500, boxes: 1, receipts: new Set<string>(), renameCount: 0, failAt: 0 }));
vi.mock('electron', () => ({ app: { getPath: () => mock.dir }, BrowserWindow: { getAllWindows: () => [] } }));
vi.mock('../src/main/progress', () => ({ applyGardenTransaction: async (id: string, points: number, boxes: number) => {
        if (mock.receipts.has(id))
            return true;
        if (mock.points + points < 0 || mock.boxes + boxes < 0)
            return false;
        mock.points += points;
        mock.boxes += boxes;
        mock.receipts.add(id);
        return true;
    } }));
vi.mock('node:fs/promises', async (importOriginal) => {
    const real = await importOriginal<typeof import('node:fs/promises')>();
    return { ...real, rename: async (...args: Parameters<typeof real.rename>) => {
            mock.renameCount++;
            if (mock.renameCount === mock.failAt)
                throw Error('simulated disk error');
            return real.rename(...args);
        } };
});
beforeEach(async () => { vi.resetModules(); mock.dir = await mkdtemp(path.join(os.tmpdir(), 'garden-store-')); mock.points = 500; mock.boxes = 1; mock.receipts.clear(); mock.renameCount = 0; mock.failAt = 0; });
afterEach(async () => { await rm(mock.dir, { recursive: true, force: true }); });
describe('garden transaction journal', () => {
    it('serializes simultaneous box clicks without negative balances or duplicate supplies', async () => {
        const api = await import('../src/main/garden/service');
        const s = await api.getGarden();
        const results = await Promise.all([api.gardenAction({ type: 'box' }), api.gardenAction({ type: 'box' })]);
        expect(results.filter(x => x.ok)).toHaveLength(1);
        expect(mock.points).toBe(0);
        expect(mock.boxes).toBe(0);
        expect((await api.getGarden()).seeds.length).toBe(s.seeds.length + 1);
    });
    it('recovers an interrupted final save without charging twice', async () => {
        const api = await import('../src/main/garden/service');
        const s = await api.getGarden();
        mock.failAt = 3; // initial save, pending journal, final state rename
        expect((await api.gardenAction({ type: 'box' })).ok).toBe(false);
        expect(mock.points).toBe(0);
        vi.resetModules();
        const restarted = await import('../src/main/garden/service');
        expect((await restarted.getGarden()).seeds.length).toBe(s.seeds.length + 1);
        expect(mock.points).toBe(0);
        expect(mock.receipts.size).toBe(1);
        expect(JSON.parse(await readFile(path.join(mock.dir, 'garden-demo.json'), 'utf8')).pending).toBeUndefined();
    });
    it('rejects unaffordable box without adding supplies', async () => {
        mock.points = 0;
        const api = await import('../src/main/garden/service');
        const s = await api.getGarden();
        expect((await api.gardenAction({ type: 'box' })).ok).toBe(false);
        expect((await api.getGarden()).seeds).toEqual(s.seeds);
        expect(mock.boxes).toBe(1);
    });
    it('persists timed inventory across a service restart', async () => {
        const api = await import('../src/main/garden/service');
        const s = await api.getGarden();
        const result = await api.gardenAction({ type: 'buy', offer: s.shop.offers[0].id });
        expect(result.ok).toBe(true);
        vi.resetModules();
        const restarted = await import('../src/main/garden/service');
        expect((await restarted.getGarden()).shop.offers[0].stock).toBe(s.shop.offers[0].stock - 1);
    });
    it('does not overwrite an unrecoverable corrupt save', async () => {
        await writeFile(path.join(mock.dir, 'garden-demo.json'), 'broken');
        const api = await import('../src/main/garden/service');
        await expect(api.getGarden()).rejects.toThrow('存档');
        expect(await readFile(path.join(mock.dir, 'garden-demo.json'), 'utf8')).toBe('broken');
    });
});
