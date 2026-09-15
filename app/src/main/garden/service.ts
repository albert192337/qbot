import { prepareTravelMemory, writeTravelDiary } from './travel-memory';
import { app, BrowserWindow } from 'electron';
import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { GardenCommand, GardenResult, GardenState } from '../../shared/garden';
import { applyGardenTransaction } from '../progress';
import { getMusicStatus } from '../music-monitor';
import { getSettings } from '../config';
import { emitEvent } from '../perception';
import { harvestHighlight } from './highlight';
import { initialGarden, refreshShop, transition, validateGarden } from './rules';
interface RecordFile {
    state: GardenState;
    pending?: {
        id: string;
        points: number;
        boxes: number;
        next: GardenState;
    };
}
let cache: RecordFile | undefined;
let queue: Promise<unknown> = Promise.resolve();
const rng = { random: () => Math.random(), id: randomUUID };
const file = () => path.join(app.getPath('userData'), 'garden-demo.json');
function serial<T>(job: () => Promise<T>): Promise<T> {
    const p = queue.then(job, job);
    queue = p.catch(() => { });
    return p;
}
async function save(record: RecordFile): Promise<void> {
    await mkdir(path.dirname(file()), { recursive: true });
    try {
        const old = JSON.parse(await readFile(file(), 'utf8'));
        validateGarden(old.state);
        await copyFile(file(), `${file()}.bak`);
    }
    catch { }
    await writeFile(`${file()}.tmp`, JSON.stringify(record), 'utf8');
    await rename(`${file()}.tmp`, file());
    cache = record;
}
async function load(): Promise<RecordFile> {
    if (cache)
        return cache;
    let missing = false;
    for (const candidate of [file(), `${file()}.bak`]) {
        try {
            const r = JSON.parse(await readFile(candidate, 'utf8')) as RecordFile;
            validateGarden(r.state);
            if (r.pending) {
                validateGarden(r.pending.next);
                if (typeof r.pending.id !== 'string' || !Number.isFinite(r.pending.points) || !Number.isFinite(r.pending.boxes))
                    throw Error('无效交易');
            }
            cache = r;
            return r;
        }
        catch (e) {
            if (candidate === file())
                missing = (e as NodeJS.ErrnoException).code === 'ENOENT';
        }
    }
    if (!missing)
        throw Error('花园存档及备份无法读取，已保留原文件，请检查 garden-demo.json');
    const r = { state: initialGarden(Date.now(), rng) };
    await save(r);
    return r;
}
async function recover(): Promise<GardenState> {
    const r = await load();
    if (r.pending) {
        const p = r.pending;
        const ok = await applyGardenTransaction(p.id, p.points, p.boxes);
        await save({ state: ok ? p.next : r.state });
        if (!ok)
            throw Error('积分或宝箱不足，未消耗任何物品');
    }
    return cache!.state;
}
export function getGarden(): Promise<GardenState> {
    return serial(async () => {
        const state = structuredClone(await recover());
        if (state.shop.refreshAt <= Date.now()) {
            refreshShop(state, Date.now(), rng);
            await save({ state });
        }
        return state;
    });
}
export function gardenAction(command: GardenCommand): Promise<GardenResult> {
    return serial(async () => {
        try {
            if (!command || typeof command !== 'object')
                throw Error('无效花园操作');
            const participant = (command.type === 'harvest' || command.type === 'harvestMany') ? (await getSettings()).activeCharacter ?? 'default' : undefined;
            const state = await recover();
            const result = transition(state, command, Date.now(), rng, { musicPlaying: getMusicStatus().playing });
            const travelMemory = command.type === 'travelExperience' && result.state.travel ? await prepareTravelMemory(result.state.travel) : undefined;
            if (result.points !== undefined) {
                await save({ state, pending: { id: randomUUID(), points: result.points, boxes: result.boxes ?? 0, next: result.state } });
                await recover();
            }
            else
                await save({ state: result.state });
            if ((command.type === 'harvest' || command.type === 'harvestMany') && result.reveal?.produce) {
                const summary = (result.reveal.harvests ?? [result.reveal.produce])
                    .slice().sort((a,b) => b.value-a.value).map(harvestHighlight).find(Boolean);
                if (summary) {
                    const at = Date.now();
                    await emitEvent({ type: 'garden_highlight', at, summary }).catch(error => console.error('[garden] 收获事件记录失败', error));
                    try {
                        const { initUserMemory } = await import('../user-memory');
                        await (await initUserMemory()).episode(participant!, summary, at);
                    } catch (error) { console.error('[garden] 共同回忆保存失败', error); }
                }
            }
            if (travelMemory) {
                // Persist payment and factual diary first. A slow model cannot block clicks or roll back a paid experience.
                void writeTravelDiary(travelMemory).then(text => { if (!text) return; return serial(async () => {
                    const latest = structuredClone(await recover());
                    const diary = latest.travel?.diaries.find(d => d.day === travelMemory.diary.day && d.actor === travelMemory.diary.actor);
                    if (!diary || diary.signature !== travelMemory.diary.signature) return;
                    diary.text = text; diary.generated = true;
                    await save({state:latest});
                    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('garden:changed');
                }); }).catch(error => console.error('[travel] 日记保存失败', error));
                const post = result.state.travel!.posts.at(-1)!;
                void import('../user-memory').then(async ({initUserMemory}) => (await initUserMemory()).episode(travelMemory.diary.actor, `一起旅行：${post.title}`,post.at)).catch(error=>console.error('[travel] 回忆同步失败',error));
            }
            for (const w of BrowserWindow.getAllWindows())
                if (!w.isDestroyed())
                    w.webContents.send('garden:changed');
            return { ok: true, state: result.state, reveal: result.reveal };
        }
        catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
    });
}
