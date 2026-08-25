/**
 * 装扮市场客户端（spec: 2026-08-02-skin-market-design §三）：
 * HTTP 全走主进程（免 CORS、服务器地址单点）；打包复用 asset-pack
 * （persona 已在打包层脱敏）；下载本地复算 hash 校验后原子入库并激活。
 */
import { nativeImage } from 'electron';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MarketSkin } from '../shared/ipc-types';
import { charactersDir, getCharacter } from './characters';
import { getSettings, setSettings } from './config';
import { packCharacterDir, unpackCharacter } from './asset-pack';
import { rebuildTray } from './tray';
import { broadcastCharacterActivated } from './windows';

const MARKET_URL = process.env.QBOT_MARKET_URL || 'http://14.103.59.73:24251';
const HASH_RE = /^[0-9a-f]{16}$/;
/** 封面统一缩到 512 宽（source.png 原图可能超服务端 2MB 上限） */
const PREVIEW_WIDTH = 512;

/** 服务端货架条目（meta 剥 token 后的形状） */
interface RemoteSkin {
  hash: string;
  name: string;
  uploader: string;
  size: number;
  actions: number;
  at: number;
  hasPreview: boolean;
}

/** Electron 主进程有全局 fetch（Node ≥18）；@types/node 旧版缺声明 → 本地补最小类型 */
interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
const fetchFn = (
  globalThis as unknown as {
    fetch: (url: string, init?: { method?: string; body?: Uint8Array }) => Promise<FetchResponse>;
  }
).fetch;

async function errorOf(res: FetchResponse): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `http_${res.status}`;
  } catch {
    return `http_${res.status}`;
  }
}

export async function listSkins(): Promise<MarketSkin[]> {
  const res = await fetchFn(`${MARKET_URL}/skins`);
  if (!res.ok) throw new Error(`市场连不上（${await errorOf(res)}）`);
  const { skins } = (await res.json()) as { skins: RemoteSkin[] };
  const { marketTokens } = await getSettings();
  return skins.map((s) => ({
    hash: s.hash,
    name: s.name,
    uploader: s.uploader,
    size: s.size,
    actions: s.actions,
    at: s.at,
    previewUrl: s.hasPreview ? `${MARKET_URL}/skins/${s.hash}/preview` : undefined,
    mine: !!marketTokens?.[s.hash],
    installed: existsSync(path.join(charactersDir(), `market-${s.hash}`)),
  }));
}

/** 打包上传一只本地角色；返回上架后的 hash */
export async function uploadSkin(dirId: string): Promise<string> {
  const meta = await getCharacter(dirId);
  if (!meta?.manifest) throw new Error(`角色不存在：${dirId}`);
  const charDir = path.join(charactersDir(), dirId);
  const { buffer } = await packCharacterDir(charDir);

  const settings = await getSettings();
  const name = meta.manifest.name || '未命名';
  const uploader = settings.marketNickname?.trim() || '匿名';
  const res = await fetchFn(
    `${MARKET_URL}/skins?name=${encodeURIComponent(name)}&uploader=${encodeURIComponent(uploader)}`,
    { method: 'POST', body: new Uint8Array(buffer) },
  );
  if (res.status === 409) throw new Error('这只角色已经在市场上了');
  if (!res.ok) throw new Error(`上传失败（${await errorOf(res)}）`);
  const { hash, token } = (await res.json()) as { hash: string; token: string };

  // 管理码入库（下架凭证）
  await setSettings({ marketTokens: { ...settings.marketTokens, [hash]: token } });

  // 封面：source.png 缩到 512 宽再传；没有/失败不阻塞上架
  try {
    const srcPng = path.join(charDir, 'source.png');
    if (existsSync(srcPng)) {
      const img = nativeImage.createFromPath(srcPng);
      const png = img.isEmpty() ? await readFile(srcPng) : img.resize({ width: PREVIEW_WIDTH }).toPNG();
      await fetchFn(`${MARKET_URL}/skins/${hash}/preview?token=${token}`, {
        method: 'POST',
        body: new Uint8Array(png),
      });
    }
  } catch {
    /* 封面失败无所谓，卡片显示占位 */
  }
  return hash;
}

/** 下载 → hash 校验 → 原子入库 characters/market-<hash>/ → 激活 */
export async function downloadSkin(hash: string): Promise<void> {
  if (!HASH_RE.test(hash)) throw new Error(`bad hash: ${hash}`);
  const dirId = `market-${hash}`;
  const dest = path.join(charactersDir(), dirId);

  if (!existsSync(dest)) {
    const res = await fetchFn(`${MARKET_URL}/skins/${hash}/pack`);
    if (!res.ok) throw new Error(`下载失败（${await errorOf(res)}）`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const got = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    if (got !== hash) throw new Error('包校验失败（内容与 hash 不符）');

    // 点开头临时目录：listCharacters 会跳过，半截安装不会出现在角色列表
    const tmpDir = path.join(charactersDir(), `.market-tmp-${hash}`);
    await rm(tmpDir, { recursive: true, force: true });
    try {
      await unpackCharacter(buffer, tmpDir);
      // 封面顺手存成 source.png（画廊/预览用）；失败不阻塞
      try {
        const pv = await fetchFn(`${MARKET_URL}/skins/${hash}/preview`);
        if (pv.ok) await writeFile(path.join(tmpDir, 'source.png'), Buffer.from(await pv.arrayBuffer()));
      } catch {
        /* ignore */
      }
      await rename(tmpDir, dest);
    } catch (err) {
      await rm(tmpDir, { recursive: true, force: true });
      throw err;
    }
  }

  const meta = await getCharacter(dirId);
  if (!meta?.manifest) {
    await rm(dest, { recursive: true, force: true });
    throw new Error('安装失败：包不完整');
  }
  await setSettings({ activeCharacter: dirId });
  broadcastCharacterActivated(meta);
  await rebuildTray();
}

/** 下架自己上传的皮肤（凭本地管理码） */
export async function removeSkin(hash: string): Promise<void> {
  if (!HASH_RE.test(hash)) throw new Error(`bad hash: ${hash}`);
  const settings = await getSettings();
  const token = settings.marketTokens?.[hash];
  if (!token) throw new Error('没有这只皮肤的管理码（不是你上传的？）');
  const res = await fetchFn(`${MARKET_URL}/skins/${hash}?token=${token}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`下架失败（${await errorOf(res)}）`);
  const { [hash]: _gone, ...rest } = settings.marketTokens ?? {};
  await setSettings({ marketTokens: rest });
}
