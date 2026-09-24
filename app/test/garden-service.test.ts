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
beforeEach(async () => { vi.resetModules(); vi.spyOn(Math, 'random').mockReturnValue(.8); mock.dir = await mkdtemp(path.join(os.tmpdir(), 'garden-store-')); mock.points = 500; mock.boxes = 1; mock.receipts.clear(); mock.renameCount = 0; mock.failAt = 0; });
afterEach(async () => { vi.restoreAllMocks(); await rm(mock.dir, { recursive: true, force: true }); });
describe('garden transaction journal', () => {
    it('routes rehearsal actions away from saved assets even when online garden is enabled',async()=>{
        const api=await import('../src/main/garden/service');await api.getGarden();
        const saved=await readFile(path.join(mock.dir,'garden-demo.json'),'utf8');
        await writeFile(path.join(mock.dir,'config.json'),JSON.stringify({gardenOnline:true}));
        const rehearsal=await import('../src/main/garden/local-rehearsal');
        rehearsal.setRehearsalMembers([{id:'test:me',name:'我'}]);
        try{
            const state=await api.getGarden();expect(state.rehearsal).toBeDefined();
            expect(state.coins).toBe(JSON.parse(saved).state.coins);
            expect((await api.gardenAction({type:'plant',plot:0,seed:state.seeds[0].id})).ok).toBe(true);
            expect(await readFile(path.join(mock.dir,'garden-demo.json'),'utf8')).toBe(saved);
            expect(mock.receipts.size).toBe(0);expect(mock.points).toBe(500);
        }finally{rehearsal.clearRehearsal();}
        await writeFile(path.join(mock.dir,'config.json'),JSON.stringify({gardenOnline:false}));
        expect((await api.getGarden()).rehearsal).toBeUndefined();
    });
    it('3D mode permits single and batch pineapple sowing',async()=>{
        let api=await import('../src/main/garden/service');const state=await api.getGarden();
        state.seeds.push({id:'pineapple-single',species:'pineapple',genes:[],bred:false},{id:'pineapple-batch',species:'pineapple',genes:[],bred:false});
        await writeFile(path.join(mock.dir,'garden-demo.json'),JSON.stringify({state}));
        await writeFile(path.join(mock.dir,'config.json'),JSON.stringify({gardenRenderMode:'3d'}));
        vi.resetModules();api=await import('../src/main/garden/service');
        expect((await api.gardenAction({type:'plant',plot:0,seed:'pineapple-single'})).ok).toBe(true);
        expect((await api.gardenAction({type:'plantMany',seed:'pineapple-batch'})).ok).toBe(true);
        const after=await api.getGarden();expect(after.plots.filter(p=>p?.species==='pineapple')).toHaveLength(2);
        expect(after.seeds.some(s=>s.id.startsWith('pineapple-'))).toBe(false);
    });
    it('3D mode accepts strawberries, rejects other new sowing without consuming seeds, and 2D restores it',async()=>{
        const api=await import('../src/main/garden/service');const start=await api.getGarden();
        const lotus=start.seeds.find(s=>s.species==='lotus')!,berry=start.seeds.find(s=>s.species==='strawberry')!;
        await writeFile(path.join(mock.dir,'config.json'),JSON.stringify({gardenRenderMode:'3d'}));
        const before=await readFile(path.join(mock.dir,'garden-demo.json'),'utf8');
        expect((await api.gardenAction({type:'plant',plot:0,seed:lotus.id})).ok).toBe(false);
        expect((await api.gardenAction({type:'plantMany',seed:lotus.id})).ok).toBe(false);
        expect(await readFile(path.join(mock.dir,'garden-demo.json'),'utf8')).toBe(before);
        expect((await api.gardenAction({type:'plant',plot:0,seed:berry.id})).ok).toBe(true);
        await writeFile(path.join(mock.dir,'config.json'),JSON.stringify({gardenRenderMode:'2d'}));
        expect((await api.gardenAction({type:'plant',plot:1,seed:lotus.id})).ok).toBe(true);
        const after=await api.getGarden();expect(after.plots[0]?.species).toBe('strawberry');expect(after.plots[1]?.species).toBe('lotus');
    });
    it('records successful ordinary garden activity with a time and actor, excluding failed clicks',async()=>{
        const api=await import('../src/main/garden/service');const s=await api.getGarden();
        expect((await api.gardenAction({type:'plant',plot:0,seed:s.seeds[0].id})).ok).toBe(true);
        expect((await api.gardenAction({type:'plant',plot:0,seed:s.seeds[1].id})).ok).toBe(false);
        expect((await api.getGarden()).journalEvents).toHaveLength(1);
        await api.gardenAction({type:'mature'});const mature=(await api.getGarden()).plots[0]!;if(mature.batch?.candidates.length)await api.gardenAction({type:'resolveFactors',target:mature.id,chosen:[]});
        expect(await api.gardenAction({type:'harvest',plot:0})).toMatchObject({ok:true});
        const harvested=await api.getGarden();expect(harvested.journalEvents?.map(e=>e.summary)).toEqual(['种下了莲花','收获了莲花']);
        expect((await api.gardenAction({type:'sell',id:harvested.produce[0].id})).ok).toBe(true);
        vi.resetModules();const restarted=await import('../src/main/garden/service');const events=(await restarted.getGarden()).journalEvents!;
        expect(events).toHaveLength(3);expect(events[2].summary).toBe('出售了莲花');expect(events.every(e=>e.actor==='default'&&Number.isFinite(e.at))).toBe(true);
    });
    it('serializes simultaneous box clicks without negative balances or duplicate supplies', async () => {
        const api = await import('../src/main/garden/service');
        const s = await api.getGarden();
        const results = await Promise.all([api.gardenAction({ type: 'box' }), api.gardenAction({ type: 'box' })]);
        expect(results.filter(x => x.ok)).toHaveLength(1);
        expect(mock.points).toBe(0);
        expect(mock.boxes).toBe(0);
        expect((await api.getGarden()).seeds.length).toBe(s.seeds.length + 2);
    });
    it('recovers an interrupted final save without charging twice', async () => {
        const api = await import('../src/main/garden/service');
        const s = await api.getGarden();
        mock.failAt = mock.renameCount + 2; // pending journal, then fail the final state rename
        expect((await api.gardenAction({ type: 'box' })).ok).toBe(false);
        expect(mock.points).toBe(0);
        vi.resetModules();
        const restarted = await import('../src/main/garden/service');
        expect((await restarted.getGarden()).seeds.length).toBe(s.seeds.length + 2);
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
it('persists real test events and deduplicates repeated activation until restore',async()=>{
 const api=await import('../src/main/garden/service');
 await api.beginGardenWeatherTest('meteor',180000);const first=(await api.getGarden()).testWeather!;
 expect(first.id).toMatch(/^weather-test:/);await api.beginGardenWeatherTest('meteor',180000);
 expect((await api.getGarden()).testWeather!.id).toBe(first.id);
 vi.resetModules();const restarted=await import('../src/main/garden/service');
 expect((await restarted.getGarden()).testWeather!.id).toBe(first.id);
 await restarted.endGardenWeatherTest();expect((await restarted.getGarden()).testWeather).toBeUndefined();
 await restarted.beginGardenWeatherTest('meteor',180000);expect((await restarted.getGarden()).testWeather!.id).not.toBe(first.id);
});

it('restart pauses a saved cultivation instead of counting closed-app time',async()=>{
 const api=await import('../src/main/garden/service');const state=await api.getGarden();
 delete state.v3; // Explicit legacy asset: its original 30-second promise survives the v3 upgrade.
 const {transition}=await import('../src/main/garden/rules');let id=0;const rng={random:()=>.99,id:()=>String(id++)};
 state.seeds[0].genes=['rainbow'];let s=transition(state,{type:'plant',plot:0,seed:state.seeds[0].id},Date.now(),rng).state;
 s.plots[0]!.readyAt=Date.now()-60000;s=transition(s,{type:'cultivate',plot:0},Date.now()-60000,rng).state;
 await writeFile(path.join(mock.dir,'garden-demo.json'),JSON.stringify({state:s}));vi.resetModules();
 const restarted=await import('../src/main/garden/service');const restored=await restarted.getGarden();
 expect(restored.plots[0]!.cultivation).toEqual({remainingMs:30000});
 expect((await restarted.gardenAction({type:'revealPlant',plot:0})).ok).toBe(false);
});
