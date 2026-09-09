/** Hosted generation: credentials stay in main process; only owned, hashed assets reach the renderer. */
import { app, nativeImage, webContents } from 'electron';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CharacterForm, CharacterStyle, ImageProvider, JobState, Manifest } from '@qbot/pipeline';
import type { CloudAccount, HatchStatus } from '../shared/ipc-types';
import { charactersDir, restoreGenerationTask } from './characters';

const BASE = (process.env.QBOT_GENERATION_URL ?? 'https://albertbeta.cn/qbot-generation').replace(/\/$/, '');
const url = new URL(BASE);
if (url.protocol !== 'https:' && !['127.0.0.1','localhost'].includes(url.hostname)) throw new Error('Hosted generation requires HTTPS');
const hash = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const VALID_ID = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
interface Marker { name?: string; acknowledged?: boolean; owner: string; submitted: boolean; imageProvider: ImageProvider; characterForm: CharacterForm; characterStyle: CharacterStyle; files: Record<string,string>; phase?: string; error?: string; queuePosition?: number }
interface Snapshot { id: string; phase: string; error?: string; queuePosition: number; state: JobState; files: { path: string; size: number; hash: string }[] }
interface Accounts { active?: string; hiddenJobs?: string[]; tokens: Record<string,string> }
const markerPath = (id: string) => {
  if (!VALID_ID.test(id)) throw new Error('无效的云端任务 ID');
  return path.join(charactersDir(), id, '.cloud-job.json');
};
async function atomic(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, file);
}
async function accounts(): Promise<Accounts> {
  try { return JSON.parse(await readFile(path.join(app.getPath('userData'), 'cloud-accounts.json'), 'utf8')); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; return { tokens: {} }; }
}
async function request(route: string, token: string, data?: unknown): Promise<Response> {
  const res = await fetch(`${BASE}${route}`, { method: data === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(60000), redirect: 'error' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `云端服务暂不可用（${res.status}），请稍后继续任务`);
  }
  return res;
}
export async function cloudAccount(invite?: string): Promise<CloudAccount> {
  const saved = await accounts();
  const token = invite?.trim() || (saved.active ? saved.tokens[saved.active] : undefined);
  if (!token) return { connected: false, credits: 0, providers: [] };
  const info = await (await request('/account', token)).json() as Omit<CloudAccount,'connected'>;
  if (invite) {
    saved.active = hash(token); saved.tokens[saved.active] = token;
    await atomic(path.join(app.getPath('userData'), 'cloud-accounts.json'), saved);
    await discoverCloudJobs(saved.active, token);
  }
  return { connected: true, unlimited: info.unlimited, credits: info.credits, providers: info.providers };
}
export function isCloudJob(id: string): boolean { return VALID_ID.test(id) && existsSync(markerPath(id)); }
async function marker(id: string): Promise<Marker> { return JSON.parse(await readFile(markerPath(id), 'utf8')); }
async function auth(m: Marker): Promise<string> {
  const token = (await accounts()).tokens[m.owner];
  if (!token) throw new Error('此任务的邀请码未保存在本机，请先重新连接原邀请码');
  return token;
}
export async function startCloudHatch(ref: string, imageProvider: ImageProvider = 'seedream', characterForm: CharacterForm = 'humanoid', characterStyle: CharacterStyle = 'chibi', name?: string): Promise<string> {
  const saved = await accounts();
  if (!saved.active) throw new Error('请先输入内测邀请码');
  if ((await stat(ref)).size > 20*1024*1024) throw new Error('图片过大，请选择 20MB 以内的图片');
  let image = nativeImage.createFromPath(ref);
  if (image.isEmpty()) throw new Error('图片无法读取，请使用 PNG 或 JPG 图片');
  const size = image.getSize();
  if (Math.max(size.width,size.height) > 2048) image = image.resize(size.width >= size.height ? { width:2048 } : { height:2048 });
  const png = image.toPNG();
  if (png.length > 8*1024*1024) throw new Error('图片过大，请缩小图片后再试');
  const id = randomUUID();
  const dir = path.join(charactersDir(),id);
  await mkdir(path.join(dir,'.job'),{recursive:true});
  await writeFile(path.join(dir,'source.png'),png);
  const m: Marker = { name:name?.trim().slice(0,24), owner:saved.active, submitted:false,imageProvider,characterForm,characterStyle,files:{} };
  await atomic(markerPath(id),m);
  // Persist a visible task before network submission; a lost response can safely retry the same UUID.
  await atomic(path.join(dir,'.job/state.json'), { jobId:id,stage:'turnaround',imageProvider,turnaround:{candidates:[],picked:null},actions:{} });
  try { await submit(id,m); } catch (e) {
    m.error = errorText(e); await atomic(markerPath(id),m);
    // Return the task so a timeout never strands a paid request outside the user's task list.
  }
  watch(id);
  return id;
}
function errorText(e: unknown): string { return e instanceof Error ? (/fetch|timeout|abort/i.test(e.message) ? '暂时无法连接云端；任务已保留，连接恢复后可继续。' : e.message) : '云端暂不可用，请稍后继续'; }
async function submit(id: string,m: Marker): Promise<void> {
  await request('/jobs',await auth(m), { id,name:m.name,image:(await readFile(path.join(charactersDir(),id,'source.png'))).toString('base64'),imageProvider:m.imageProvider,characterForm:m.characterForm,characterStyle:m.characterStyle });
  m.submitted=true;m.error=undefined;await atomic(markerPath(id),m);
}
const inflight = new Map<string,Promise<HatchStatus>>();
const timers = new Map<string,ReturnType<typeof setTimeout>>();
const forgotten = new Set<string>();
const lastBroadcast = new Map<string,string>();
export async function syncCloudJob(id: string): Promise<HatchStatus> {
  if (inflight.has(id)) return inflight.get(id)!;
  const op = sync(id).finally(()=>inflight.delete(id));inflight.set(id,op);return op;
}
async function sync(id: string): Promise<HatchStatus> {
  const m=await marker(id);const dir=path.join(charactersDir(),id);
  try {
    const token=await auth(m);
    // Query even if POST response was lost; only explicit resume resubmits an unaccepted request.
    const snap=await(await request(`/jobs/${id}`,token)).json() as Snapshot;
    m.submitted=true;
    if (snap.id!==id || !snap.state?.actions || !Array.isArray(snap.files)) throw new Error('云端任务数据无效');
    const ordered=[...snap.files].sort((a,b)=>Number(a.path==='manifest.json')-Number(b.path==='manifest.json'));
    for(const file of ordered){
      if(!/^(source\.png|turnaround\.png|manifest\.json|actions\/[a-z_]+\.(webm|gif)|\.job\/[a-z_0-9]+\.png)$/.test(file.path) || file.size>100*1024*1024) throw new Error('云端资源格式无效');
      const dest=path.join(dir,file.path);
      if(m.files[file.path]===file.hash && existsSync(dest))continue;
      let bytes=Buffer.from(await(await request(`/jobs/${id}/files/${file.path}`,token)).arrayBuffer());
      if(bytes.length!==file.size || hash(bytes)!==file.hash)throw new Error('资源校验未通过，将自动重新下载');
      if(file.path==='manifest.json' && !existsSync(dest) && m.name) {
        const next=JSON.parse(bytes.toString()) as Manifest;next.name=m.name;bytes=Buffer.from(JSON.stringify(next));
      }
      if(file.path==='manifest.json' && existsSync(dest)){
        const old=JSON.parse(await readFile(dest,'utf8')) as Manifest;
        const next=JSON.parse(bytes.toString()) as Manifest;
        bytes=Buffer.from(JSON.stringify({...old,...next,name:old.name,persona:old.persona,voice:old.voice,agentActions:old.agentActions,customActions:old.customActions,expressionActions:old.expressionActions,importedActions:old.importedActions,spareStickers:old.spareStickers}));
      }
      await mkdir(path.dirname(dest),{recursive:true});const tmp=`${dest}.${randomUUID()}.tmp`;await writeFile(tmp,bytes);await rename(tmp,dest);
      m.files[file.path]=file.hash;
    }
    // No credentials or server paths in the local pipeline mirror.
    await atomic(path.join(dir,'.job/state.json'),snap.state);
    m.phase=snap.phase;m.error=snap.error;m.queuePosition=snap.queuePosition;
    await atomic(markerPath(id),m);
    return localStatus(id,m,snap.state);
  }catch(e){
    m.error=errorText(e);await atomic(markerPath(id),m);
    const state=JSON.parse(await readFile(path.join(dir,'.job/state.json'),'utf8')) as JobState;
    return localStatus(id,m,state,true);
  }
}
function localStatus(id: string,m: Marker,state: JobState,offline=false): HatchStatus {
  return { stage:m.phase==='failed' ? 'failed' : state.stage, running:!offline && m.submitted && ['queued','running','awaiting_pick'].includes(m.phase??''),imageProvider:m.imageProvider,
    cloud:true,cloudPhase:m.phase,error:m.error,queuePosition:m.queuePosition,
    candidateUrls:state.turnaround.candidates.map(p=>`qbot-asset://${id}/.job/${p}?v=${m.files[`.job/${p}`]??''}`),
    actions:Object.fromEntries(Object.entries(state.actions).map(([a,v])=>[a,{status:v.status,error:v.error,frameUrl:v.framePath?`qbot-asset://${id}/.job/${v.framePath}?v=${m.files[`.job/${v.framePath}`]??''}`:undefined}])) as HatchStatus['actions'] };
}
function broadcast(id: string,status: HatchStatus): void {
  const signature = JSON.stringify(status);
  if (lastBroadcast.get(id) === signature) return;
  lastBroadcast.set(id, signature);
  for(const wc of webContents.getAllWebContents())wc.send('hatch:cloudStatus',{dirId:id,status});
}
function watch(id: string): void {
  if(timers.has(id)||forgotten.has(id))return;
  const tick=async()=>{
    try{
      if(!isCloudJob(id))return;
      const status=await syncCloudJob(id);broadcast(id,status);
      if(status.stage==='done' && !status.error)return;
    }catch{/* Deleted tasks are not recreated. */}
    finally{timers.delete(id);}
    if (!forgotten.has(id)) timers.set(id,setTimeout(()=>void tick(),5000));
  };
  timers.set(id,setTimeout(()=>void tick(),100));
}
export async function cloudOperation(id: string,operation:'pick'|'resume',index?:number, actions?:string[]): Promise<void>{
  if(inflight.has(id))await inflight.get(id);
  const m=await marker(id);
  if(!m.submitted)await submit(id,m);
  if(operation==='pick'||m.phase==='failed'||m.phase==='done')await request(`/jobs/${id}/${operation}`,await auth(m),operation==='pick'?{index}:{actions});
  await restoreGenerationTask(id);const status=await syncCloudJob(id);broadcast(id,status);watch(id);
}
export async function recoverCloudJobs(): Promise<void>{
  const saved = await accounts();
  for (const [owner,token] of Object.entries(saved.tokens)) {
    try { await discoverCloudJobs(owner,token); } catch { /* Offline startup keeps local jobs available. */ }
  }
  for(const item of await readdir(charactersDir(),{withFileTypes:true}).catch(()=>[])){
    if(item.isDirectory()&&isCloudJob(item.name)){
      const m=await marker(item.name);
      if(m.phase!=='done'||m.error)watch(item.name);
    }
  }
}

export async function acknowledgeCloudJob(id: string): Promise<void> {
  if (!isCloudJob(id)) return;
  if (inflight.has(id)) await inflight.get(id);
  const m = await marker(id); m.acknowledged = true; await atomic(markerPath(id),m);
}

/** Wait out a current download before deleting local assets, so polling cannot resurrect a character. */
export async function forgetCloudJob(id: string): Promise<void> {
  if (!isCloudJob(id)) return;
  forgotten.add(id);
  const saved = await accounts();
  saved.hiddenJobs = [...new Set([...(saved.hiddenJobs ?? []),id])];
  await atomic(path.join(app.getPath('userData'), 'cloud-accounts.json'), saved);
  const timer = timers.get(id); if (timer) clearTimeout(timer);
  timers.delete(id); lastBroadcast.delete(id);
  if (inflight.has(id)) await inflight.get(id);
}

/** An invite is also the recovery credential: reinstalling can rediscover owned cloud jobs. */
async function discoverCloudJobs(owner: string, token: string): Promise<void> {
  const data = await (await request('/jobs',token)).json() as { jobs: Array<{id:string;name?:string;imageProvider?:ImageProvider;characterForm?:CharacterForm;characterStyle?:CharacterStyle}> };
  if (!Array.isArray(data.jobs)) throw new Error('无法读取云端任务列表，请稍后重新连接');
  const hidden = new Set((await accounts()).hiddenJobs ?? []);
  for (const remote of data.jobs) {
    if (hidden.has(remote.id)) continue;
    if (!VALID_ID.test(remote.id) || existsSync(path.join(charactersDir(),remote.id))) continue;
    const dir = path.join(charactersDir(),remote.id);
    const m: Marker = { owner,submitted:true,name:remote.name,imageProvider:remote.imageProvider??'seedream',characterForm:remote.characterForm??'humanoid',characterStyle:remote.characterStyle??'chibi',files:{} };
    await atomic(path.join(dir,'.job/state.json'),{jobId:remote.id,stage:'turnaround',turnaround:{candidates:[],picked:null},actions:{}});
    await atomic(markerPath(remote.id),m); watch(remote.id);
  }
}
