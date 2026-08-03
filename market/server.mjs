/**
 * QBot 装扮市场服务（spec: docs/superpowers/specs/2026-08-02-skin-market-design.md §二）。
 *
 * 货架 = 文件系统：data/<hash>/{pack.bin, preview.png, meta.json}，启动扫盘建索引。
 * hash = sha256(pack).slice(0,16)，服务端复算为准（兼做去重）；上传返回管理码 token，
 * 只出现在上传应答里，列表接口永不吐 token。
 * 零依赖单文件（同 relay 的部署哲学：整目录 scp 就能跑）；日志只记数量不记内容。
 */
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 24251);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
/** 单包上限（一只角色 webm 包 ≈12MB，留足自定义动作余量） */
const MAX_PACK_BYTES = 50 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;
/** 货架容量兜底 */
const MAX_SKINS = 500;
const NAME_MAX = 64;
const HASH_RE = /^[0-9a-f]{16}$/;

/** 内存索引：hash → meta（含 token；对外序列化时剥离） */
const skins = new Map();

// ── 索引 ────────────────────────────────────────────────────

async function loadIndex() {
  await mkdir(DATA_DIR, { recursive: true });
  for (const dir of await readdir(DATA_DIR)) {
    if (!HASH_RE.test(dir)) continue;
    try {
      const meta = JSON.parse(await readFile(path.join(DATA_DIR, dir, 'meta.json'), 'utf8'));
      skins.set(dir, meta);
    } catch {
      /* 半截目录（上传中断）：跳过，不阻塞启动 */
    }
  }
  console.log(`[market] index loaded: ${skins.size} skins`);
}

/** 对外 meta：剥 token，附 hasPreview */
function publicMeta(hash, meta) {
  return {
    hash,
    name: meta.name,
    uploader: meta.uploader,
    size: meta.size,
    actions: meta.actions,
    at: meta.at,
    hasPreview: existsSync(path.join(DATA_DIR, hash, 'preview.png')),
  };
}

/** 从 asset-pack 包头数动作数（不信客户端报数）；非法包返回 null */
function countActions(buffer) {
  try {
    if (buffer.length < 4) return null;
    const headerLen = buffer.readUInt32BE(0);
    if (headerLen <= 0 || 4 + headerLen > buffer.length) return null;
    const { files } = JSON.parse(buffer.subarray(4, 4 + headerLen).toString('utf8'));
    if (!Array.isArray(files) || !files.some((f) => f.path === 'manifest.json')) return null;
    return files.filter((f) => typeof f.path === 'string' && f.path.startsWith('actions/')).length;
  } catch {
    return null;
  }
}

// ── HTTP 工具 ───────────────────────────────────────────────

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('too_large'));
        req.destroy();
        return;
      }
      parts.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });
}

function clip(v, fallback) {
  const s = String(v ?? '').trim().slice(0, NAME_MAX);
  return s || fallback;
}

// ── 路由 ────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const seg = url.pathname.split('/').filter(Boolean); // ['skins', hash?, sub?]

    if (seg[0] !== 'skins') return json(res, 404, { error: 'not_found' });

    // GET /skins → 货架
    if (req.method === 'GET' && seg.length === 1) {
      const list = [...skins.entries()]
        .map(([hash, meta]) => publicMeta(hash, meta))
        .sort((a, b) => b.at - a.at);
      return json(res, 200, { skins: list });
    }

    // POST /skins → 上传包
    if (req.method === 'POST' && seg.length === 1) {
      if (skins.size >= MAX_SKINS) return json(res, 507, { error: 'market_full' });
      let body;
      try {
        body = await readBody(req, MAX_PACK_BYTES);
      } catch {
        return json(res, 413, { error: 'pack_too_large' });
      }
      const actions = countActions(body);
      if (actions === null || actions === 0) return json(res, 400, { error: 'bad_pack' });
      const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
      if (skins.has(hash)) return json(res, 409, { error: 'exists', hash });
      const meta = {
        name: clip(url.searchParams.get('name'), '未命名'),
        uploader: clip(url.searchParams.get('uploader'), '匿名'),
        size: body.length,
        actions,
        at: Date.now(),
        token: randomBytes(16).toString('hex'),
      };
      const dir = path.join(DATA_DIR, hash);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'pack.bin'), body);
      await writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta));
      skins.set(hash, meta);
      console.log(`[market] upload ok, total=${skins.size}`);
      return json(res, 200, { hash, token: meta.token });
    }

    // 以下都要合法 hash
    const hash = seg[1];
    if (!HASH_RE.test(hash ?? '') || !skins.has(hash)) {
      return json(res, 404, { error: 'not_found' });
    }
    const meta = skins.get(hash);
    const dir = path.join(DATA_DIR, hash);

    // GET /skins/<hash>/pack
    if (req.method === 'GET' && seg[2] === 'pack') {
      const buf = await readFile(path.join(dir, 'pack.bin'));
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': buf.length,
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(buf);
    }

    // GET /skins/<hash>/preview
    if (req.method === 'GET' && seg[2] === 'preview') {
      try {
        const buf = await readFile(path.join(dir, 'preview.png'));
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=86400', // hash 定内容，放心缓存
          'Access-Control-Allow-Origin': '*',
        });
        return res.end(buf);
      } catch {
        return json(res, 404, { error: 'no_preview' });
      }
    }

    // POST /skins/<hash>/preview?token=
    if (req.method === 'POST' && seg[2] === 'preview') {
      if (url.searchParams.get('token') !== meta.token) return json(res, 403, { error: 'bad_token' });
      let body;
      try {
        body = await readBody(req, MAX_PREVIEW_BYTES);
      } catch {
        return json(res, 413, { error: 'preview_too_large' });
      }
      // PNG 魔数校验：别的都不收
      if (body.length < 8 || body.readUInt32BE(0) !== 0x89504e47) {
        return json(res, 400, { error: 'not_png' });
      }
      await writeFile(path.join(dir, 'preview.png'), body);
      return json(res, 200, { ok: true });
    }

    // DELETE /skins/<hash>?token=
    if (req.method === 'DELETE' && seg.length === 2) {
      if (url.searchParams.get('token') !== meta.token) return json(res, 403, { error: 'bad_token' });
      await rm(dir, { recursive: true, force: true });
      skins.delete(hash);
      console.log(`[market] delete ok, total=${skins.size}`);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    console.error('[market] error:', err?.message ?? err);
    return json(res, 500, { error: 'internal' });
  }
});

await loadIndex();
server.listen(PORT, () => console.log(`[market] listening on :${PORT}, data=${DATA_DIR}`));
