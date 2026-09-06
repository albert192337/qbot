import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat, statfs } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { atomicJson, digest, openStore } from './store.mjs';

const UUID = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
const ACTIONS = ['idle','drag','sleep','tea','talk_happy','talk_annoyed','wave','stretch'];
const MAX_BODY = 12 * 1024 * 1024;
const fail = (status, message) => Object.assign(new Error(message), { status });
const safeError = error => {
  const s = String(error?.message ?? error);
  if (/401|403|auth|key/i.test(s)) return '模型服务暂不可用，请联系管理员；已生成的结果会保留。';
  if (/429|rate|quota/i.test(s)) return '模型服务繁忙或额度不足，稍后可继续当前任务。';
  if (/content|safety|moderation/i.test(s)) return '素材未通过模型检查，请换一张合适的角色图片。';
  if (/timeout|fetch|network/i.test(s)) return '模型连接超时，已保存进度，可继续当前任务。';
  return '生成未完成，已保留结果；可重试失败部分，或联系管理员。';
};
function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw fail(413, '图片过大，请使用 8MB 以内的图片。');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw fail(400, '请求格式错误'); }
}

/** Durable single-job worker. No browser state or API credentials enter registry snapshots. */
export async function createGenerationService({ dataDir, pipeline, config, invites = [], maxJobs = 100 }) {
  await mkdir(dataDir, { recursive: true });
  const store = await openStore(dataDir);
  await store.transaction(data => {
    for (const { token, credits = 1 } of invites) {
      if (typeof token !== 'string' || token.length < 24) throw new Error('Invite must contain at least 24 characters');
      data.accounts[digest(token)] ??= { credits, createdAt: Date.now() };
    }
    // Crashed workers resume saved upstream task IDs. Candidate confirmation never blocks a worker.
    for (const job of Object.values(data.jobs)) if (job.phase === 'running') job.phase = 'queued';
  });
  let pumping = false; let stopped = false;
  const dirFor = id => path.join(dataDir, 'jobs', id);
  const hashCache = new Map();
  async function filesFor(id, state) {
    const names = ['source.png', ...state.turnaround.candidates.map(x => `.job/${x}`)];
    for (const [action, value] of Object.entries(state.actions)) {
      if (value.framePath) names.push(`.job/${value.framePath}`);
      if (value.status === 'done') names.push(`actions/${action}.webm`, `actions/${action}.gif`);
    }
    names.push('turnaround.png', 'manifest.json');
    const files = [];
    for (const name of [...new Set(names)]) {
      // Pipeline outputs only; never make registry, credentials or arbitrary paths downloadable.
      if (!/^(source\.png|turnaround\.png|manifest\.json|actions\/[a-z_]+\.(webm|gif)|\.job\/[a-z_0-9]+\.png)$/.test(name)) continue;
      const file = path.join(dirFor(id), name);
      try {
        const s = await stat(file);
        const cacheKey = `${id}/${name}`;
        let cached = hashCache.get(cacheKey);
        if (!cached || cached.mtime !== s.mtimeMs || cached.size !== s.size) {
          cached = { mtime: s.mtimeMs, size: s.size, hash: digest(await readFile(file)) };
          hashCache.set(cacheKey, cached);
        }
        files.push({ path: name, size: s.size, hash: cached.hash });
      } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    return files;
  }
  async function snapshot(id) {
    const meta = store.data.jobs[id];
    const state = JSON.parse(await readFile(path.join(dirFor(id), '.job/state.json'), 'utf8'));
    for (const action of Object.values(state.actions)) if (action.error) action.error = safeError(action.error);
    return { id, phase: meta.phase, error: meta.error, attempts: meta.attempts,
      queuePosition: meta.phase === 'queued' ? Object.values(store.data.jobs).filter(j => j.phase === 'queued').findIndex(j => j.id === id) + 1 : 0,
      state, files: await filesFor(id, state) };
  }
  async function pump() {
    if (pumping || stopped) return;
    pumping = true;
    try {
      while (!stopped) {
        const meta = Object.values(store.data.jobs).find(j => j.phase === 'queued');
        if (!meta) break;
        await store.transaction(d => { d.jobs[meta.id].phase = 'running'; d.jobs[meta.id].error = undefined; });
        try {
          const job = await pipeline.Job.load(dirFor(meta.id));
          const cfg = { ...config, imageProvider: job.state.imageProvider, concurrency: 2 };
          const ark = pipeline.createArkClient(cfg);
          if (job.state.turnaround.picked === null) {
            if (!job.state.turnaround.candidates.length) await pipeline.runTurnaround(job, ark);
            await store.transaction(d => { d.jobs[meta.id].phase = 'awaiting_pick'; });
          } else {
            await pipeline.runActions(job, ark, config.ffmpegPath, undefined, 2, meta.actions);
            await pipeline.runPackage(job);
            await store.transaction(d => { d.jobs[meta.id].phase = 'done'; });
          }
        } catch (e) {
          console.error('[generation] job failed', meta.id, safeError(e));
          await store.transaction(d => { d.jobs[meta.id].phase = 'failed'; d.jobs[meta.id].error = safeError(e); });
        }
      }
    } finally { pumping = false; }
  }
  const schedule = () => { void pump().catch(e => console.error('[generation] worker stopped', safeError(e))); };
  const rates = new Map();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, version: 1, providers: ['seedream', ...(config.gptImageApiKey ? ['gpt-image-2'] : [])] });
      const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
      const owner = digest(token);
      const account = store.data.accounts[owner];
      if (!account) throw fail(401, '邀请码无效，请检查后重试。');
      const now = Date.now();
      const rate = rates.get(owner);
      if (!rate || now - rate.at > 60000) rates.set(owner, { at: now, n: 1 });
      else if (++rate.n > 180) throw fail(429, '操作太频繁，请稍后重试。');
      if (url.pathname === '/account' && req.method === 'GET') return json(res, 200, { credits: account.credits, providers: ['seedream', ...(config.gptImageApiKey ? ['gpt-image-2'] : [])], maxAttempts: 3 });
      if (url.pathname === '/jobs' && req.method === 'GET') {
        const jobs = [];
        for (const meta of Object.values(store.data.jobs).filter(j => j.owner === owner)) {
          const state = JSON.parse(await readFile(path.join(dirFor(meta.id), '.job/state.json'), 'utf8'));
          jobs.push({ id: meta.id, phase: meta.phase, name: meta.name, imageProvider: state.imageProvider, characterForm: state.characterForm, characterStyle: state.characterStyle });
        }
        return json(res, 200, { jobs });
      }
      if (url.pathname === '/jobs' && req.method === 'POST') {
        const input = await body(req);
        const id = input.id;
        if (!UUID.test(id ?? '')) throw fail(400, '无效的任务 ID');
        const provider = input.imageProvider ?? 'seedream';
        if (!['seedream','gpt-image-2'].includes(provider) || (provider === 'gpt-image-2' && !config.gptImageApiKey)) throw fail(400, '该生成方式暂不可用');
        if (!['humanoid','abstract'].includes(input.characterForm) || !['chibi','faithful'].includes(input.characterStyle)) throw fail(400, '无效的角色选项');
        const png = Buffer.from(typeof input.image === 'string' ? input.image : '', 'base64');
        if (png.length < 24 || png.length > 8*1024*1024 || !png.subarray(0,8).equals(PNG) || png.readUInt32BE(16) > 4096 || png.readUInt32BE(20) > 4096) throw fail(400, '请上传不超过 4096 像素、8MB 的 PNG 图片');
        const fingerprint = digest(JSON.stringify([digest(png), provider, input.characterForm, input.characterStyle]));
        await store.transaction(async d => {
          if (d.jobs[id]) {
            if (d.jobs[id].owner !== owner || d.jobs[id].fingerprint !== fingerprint) throw fail(409, '任务 ID 已使用，请重新创建');
            return;
          }
          if (d.accounts[owner].credits < 1) throw fail(402, '创建额度已用完；已有任务仍可继续。');
          if (Object.keys(d.jobs).length >= maxJobs) throw fail(503, '内测任务已满，请稍后联系管理员');
          const fs = await statfs(dataDir);
          if (fs.bavail * fs.bsize < 2*1024**3) throw fail(503, '服务存储暂不足，请稍后再试');
          await mkdir(dirFor(id), { recursive: true });
          const source = path.join(dirFor(id), 'upload.png');
          await writeFile(source, png, { mode: 0o600 });
          await pipeline.Job.create(dirFor(id), { refImagePath: source, imageProvider: provider, characterForm: input.characterForm, characterStyle: input.characterStyle });
          d.accounts[owner].credits--;
          d.jobs[id] = { id, owner, name: typeof input.name === 'string' ? input.name.trim().slice(0,24) : undefined, fingerprint, phase: 'queued', attempts: 1, candidateAttempts: 1, createdAt: Date.now() };
        });
        schedule();
        return json(res, 202, { id });
      }
      const match = /^\/jobs\/([^/]+)(?:\/(.*))?$/.exec(url.pathname);
      if (!match || !UUID.test(match[1])) throw fail(404, '任务不存在');
      const [, id, operation] = match;
      const meta = store.data.jobs[id];
      if (!meta || meta.owner !== owner) throw fail(404, '任务不存在');
      if (!operation && req.method === 'GET') return json(res, 200, await snapshot(id));
      if (operation?.startsWith('files/') && req.method === 'GET') {
        const name = operation.slice(6);
        const snap = await snapshot(id);
        const file = snap.files.find(f => f.path === name);
        if (!file) throw fail(404, '文件尚未就绪');
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': file.size, 'Cache-Control': 'no-store' });
        createReadStream(path.join(dirFor(id), name)).on('error', () => res.destroy()).pipe(res);
        return;
      }
      if (req.method === 'POST' && ['pick','resume'].includes(operation)) {
        const input = await body(req);
        await store.transaction(async d => {
          const m = d.jobs[id];
          if (m.phase === 'queued' || m.phase === 'running') return; // Repeated clicks do not spend attempts.
          if (operation === 'pick') {
            if (m.phase !== 'awaiting_pick') throw fail(409, '角色方案已确认，请刷新任务');
            if (input.index !== 0 && input.index !== -1) throw fail(400, '无效的方案');
            const job = await pipeline.Job.load(dirFor(id));
            if (input.index === -1) {
              if (m.candidateAttempts >= 3) throw fail(402, '本次创建的 3 次形象方案已用完，请选择现有方案');
              m.candidateAttempts++;
              job.state.turnaround = { candidates: [], picked: null };
              await job.save();
            } else await pipeline.pickTurnaround(job, 0);
          } else {
            if (m.phase === 'awaiting_pick') return;
            const job = await pipeline.Job.load(dirFor(id));
            const failed = ACTIONS.filter(a => job.state.actions[a]?.status === 'failed');
            if (m.phase === 'done' && !failed.length) return;
            if (m.attempts >= 3) throw fail(402, '本次创建的重试次数已用完，请联系管理员恢复额度');
            if (input.actions !== undefined) {
              if (!Array.isArray(input.actions) || !input.actions.length || input.actions.some(a => !failed.includes(a))) throw fail(400, '仅能选择失败的动作进行修复');
              m.actions = [...new Set(input.actions)];
            } else m.actions = undefined;
            m.attempts++;
          }
          m.phase = 'queued'; m.error = undefined;
        });
        schedule();
        return json(res, 202, { id });
      }
      throw fail(404, '接口不存在');
    } catch (e) {
      if (!res.headersSent) json(res, e.status ?? 500, { error: e.status ? e.message : safeError(e) });
      else res.destroy();
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  schedule();
  return { server, store, stop: () => { stopped = true; server.close(); }, snapshot };
}
