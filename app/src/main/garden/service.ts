import {getRehearsal} from './local-rehearsal';
import { supportsGarden3D } from '../../shared/garden-render';
import { applyWeatherMutations } from './weather-rules';
import { prepareTravelMemory, writeTravelDiary } from './travel-memory';
import { gardenJournalSummary } from './journal-events';
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
import { ensureLife } from './life-rules';
import {enableV3} from './v3-rules';
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
            // A saved animation cannot continue while the app is closed.
            for(const state of [r.state, ...(r.pending?[r.pending.next]:[])])for(const p of state.plots)if(p?.cultivation)delete p.cultivation.startedAt;
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
        const settings=await getSettings();
        if(getRehearsal()){const rehearsal=getRehearsal()!;rehearsal.initializeOwn((await load()).state);return rehearsal.get(settings.activeCharacter??undefined);}
        if(settings.gardenOnline)return (await import('./network')).networkGarden();
        const state = structuredClone(await recover());
        const oldPlots=JSON.stringify(state.plots);
        const now=Date.now();
        const upgraded=enableV3(state,now);
        const lifeChanged=ensureLife(state,now,rng,settings.activeCharacter??undefined)||upgraded;
        const weatherChanged=applyWeatherMutations(state,now);
        if (state.shop.refreshAt <= now) {
            refreshShop(state, Date.now(), rng);
        }
        if(lifeChanged || weatherChanged || state.shop.refreshAt !== cache!.state.shop.refreshAt) await save({ state });
        if(oldPlots!==JSON.stringify(state.plots))for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');
        return state;
    });
}
/** Merge generated writing into the latest save without holding the queue during a model call. */
export function updateGardenJournal<T>(change:(state:GardenState)=>T|Promise<T>):Promise<T> {
    return serial(async()=>{
        const state=structuredClone(await recover());
        const result=await change(state);validateGarden(state);await save({state});
        for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');
        return result;
    });
}
export function gardenAction(command: GardenCommand): Promise<GardenResult> {
    return serial(async () => {
        try {
            const settings=await getSettings();
            if(getRehearsal()){const rehearsal=getRehearsal()!;rehearsal.initializeOwn((await load()).state);const result=rehearsal.act(command,settings.activeCharacter??undefined);for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');return result;}
            if(settings.gardenOnline)return (await import('./network')).networkAction(command);
            if (!command || typeof command !== 'object')
                throw Error('无效花园操作');
            const participant = (command.type === 'harvest' || command.type === 'harvestMany') ? (await getSettings()).activeCharacter ?? 'default' : undefined;
            const state = structuredClone(await recover());
            if((command.type==='plant'||command.type==='plantMany')&&(await getSettings()).gardenRenderMode==='3d'&&!supportsGarden3D(state.seeds.find(s=>s.id===command.seed)?.species))
                throw Error('3D 模式支持草莓和菠萝；其他植物请切回 2D 后播种。');
            applyWeatherMutations(state,Date.now());
            enableV3(state,Date.now());
            ensureLife(state,Date.now(),rng,settings.activeCharacter??undefined);
            const result = transition(state, command, Date.now(), rng, { musicPlaying: getMusicStatus().playing, actor:settings.activeCharacter??undefined });
            const summary=gardenJournalSummary(state,result.state,command,result.reveal);
            if(summary){const at=Date.now(),actor=participant??(await getSettings()).activeCharacter??'default';result.state.journalEvents=[...(result.state.journalEvents??[]).filter(e=>at-e.at<7*86400000),{at,actor,summary:summary.slice(0,500)}].slice(-300);}
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
                    const diary = latest.travel?.diaries.find(d => d.city === travelMemory.diary.city && d.day === travelMemory.diary.day && d.actor === travelMemory.diary.actor);
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

/** Manual test events use real persisted rolls, distinct from the scheduled calendar. */
export function beginGardenWeatherTest(kind:import('../../shared/weather').WeatherKind,durationMs:number):Promise<void>{
 return serial(async()=>{
  const state=structuredClone(await recover()),now=Date.now();applyWeatherMutations(state,now);
  if(state.testWeather?.kind===kind&&state.testWeather.end>now){await save({state});return;}
  state.testWeather={id:'weather-test:'+randomUUID(),kind,start:now,end:now+durationMs,checkedAt:now-1,evaluated:[]};
  applyWeatherMutations(state,now);await save({state});
  for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');
 });
}
export function endGardenWeatherTest():Promise<void>{
 return serial(async()=>{
  const state=structuredClone(await recover());if(!state.testWeather)return;
  applyWeatherMutations(state,Date.now());delete state.testWeather;await save({state});
  for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');
 });
}
