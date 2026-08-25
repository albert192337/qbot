/**
 * 角色包的打包/分块/重组。纯 Node 零 Electron 依赖，可单测。
 *
 * 包格式：[4B BE header长度][JSON header {files:[{path,size}]}][文件字节顺序拼接]
 * 内容 = 脱敏 manifest.json + manifest 引用的已完成动作 webm；
 * manifestHash = sha256(整包).slice(0,16)，同时是接收端缓存目录 `.peer-<hash>` 的键。
 *
 * 使用方：公共房间的服务端缓存分发（rooms/）、皮肤市场下载（market）。
 * （曾经的 1v1 盲转分块也走这里；块大小以 rooms 服务 128KB 帧上限为准）
 *
 * 隐私（spec §四硬规则）：persona 文本永不出本机，打包前从 manifest 剥离。
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** 单块原始字节数（base64 后 ≈87KB，rooms 服务 128KB 帧上限内余量充足） */
export const CHUNK_SIZE = 64 * 1024;
/** 总块数上限（× 64KB = 512MB，防对端恶意 total 撑爆内存） */
const MAX_CHUNKS = 8192;
/** 包内合法路径：manifest.json 或 actions/ 下一层的 .webm（防路径穿越） */
const SAFE_PATH_RE = /^(manifest\.json|actions\/[^/\\]+\.webm)$/;

interface PackEntry {
  path: string;
  size: number;
}

/** 打包结果：hash 即 hello 帧的 manifestHash */
export interface PackedCharacter {
  hash: string;
  buffer: Buffer;
}

/** 从 manifest 收集要打包的动作文件（标准 + 自定义，只要 done 的） */
function collectActionFiles(manifest: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const group of [manifest.actions, manifest.customActions]) {
    if (!group || typeof group !== 'object') continue;
    for (const action of Object.values(group as Record<string, { status?: string; webm?: string }>)) {
      if (action?.status === 'done' && typeof action.webm === 'string') out.push(action.webm);
    }
  }
  return out;
}

/** 脱敏：persona 等文本永不出本机（spec §四） */
export function sanitizeManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  const { persona: _persona, ...rest } = manifest;
  return rest;
}

export async function packCharacterDir(charDir: string): Promise<PackedCharacter> {
  const raw = JSON.parse(await readFile(path.join(charDir, 'manifest.json'), 'utf8'));
  const manifest = sanitizeManifest(raw);
  const manifestBuf = Buffer.from(JSON.stringify(manifest), 'utf8');

  const entries: PackEntry[] = [{ path: 'manifest.json', size: manifestBuf.length }];
  const datas: Buffer[] = [manifestBuf];
  for (const rel of collectActionFiles(manifest)) {
    if (!SAFE_PATH_RE.test(rel)) continue; // manifest 被手改出怪路径：跳过不打包
    const buf = await readFile(path.join(charDir, rel));
    entries.push({ path: rel, size: buf.length });
    datas.push(buf);
  }

  const header = Buffer.from(JSON.stringify({ files: entries }), 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(header.length);
  const buffer = Buffer.concat([lenBuf, header, ...datas]);
  return { hash: createHash('sha256').update(buffer).digest('hex').slice(0, 16), buffer };
}

/** 解包到目标目录（调用方负责临时目录 + rename 的原子性） */
export async function unpackCharacter(buffer: Buffer, destDir: string): Promise<void> {
  if (buffer.length < 4) throw new Error('asset package truncated');
  const headerLen = buffer.readUInt32BE(0);
  if (headerLen <= 0 || 4 + headerLen > buffer.length) throw new Error('asset package bad header');
  const { files } = JSON.parse(buffer.subarray(4, 4 + headerLen).toString('utf8')) as {
    files: PackEntry[];
  };
  if (!Array.isArray(files) || !files.some((f) => f.path === 'manifest.json')) {
    throw new Error('asset package missing manifest');
  }
  let offset = 4 + headerLen;
  await mkdir(path.join(destDir, 'actions'), { recursive: true });
  for (const entry of files) {
    if (!SAFE_PATH_RE.test(entry.path)) throw new Error(`unsafe path in package: ${entry.path}`);
    if (!Number.isInteger(entry.size) || entry.size < 0 || offset + entry.size > buffer.length) {
      throw new Error('asset package size mismatch');
    }
    await writeFile(path.join(destDir, entry.path), buffer.subarray(offset, offset + entry.size));
    offset += entry.size;
  }
}

export function chunkToBase64(buffer: Buffer, chunkSize = CHUNK_SIZE): string[] {
  const out: string[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    out.push(buffer.subarray(i, Math.min(i + chunkSize, buffer.length)).toString('base64'));
  }
  return out;
}

/** asset:chunk 重组器（WS 有序可靠，seq 乱序只会出现在实现 bug / 恶意对端 → 直接拒收） */
export class ChunkAssembler {
  private parts: Buffer[] = [];
  private total = 0;

  constructor(readonly hash: string) {}

  get received(): number {
    return this.parts.length;
  }

  get expectedTotal(): number {
    return this.total;
  }

  /** 收一块；返回是否已收齐。块非法（seq 跳号/总数超限/尺寸异常）抛错，调用方废弃本次传输 */
  add(seq: number, total: number, dataB64: string): boolean {
    if (!Number.isInteger(total) || total <= 0 || total > MAX_CHUNKS) {
      throw new Error(`bad chunk total: ${total}`);
    }
    if (this.total === 0) this.total = total;
    if (total !== this.total) throw new Error('chunk total changed mid-stream');
    if (seq !== this.parts.length) throw new Error(`chunk seq gap: got ${seq}, want ${this.parts.length}`);
    if (typeof dataB64 !== 'string' || dataB64.length > CHUNK_SIZE * 2) {
      throw new Error('chunk data oversize');
    }
    this.parts.push(Buffer.from(dataB64, 'base64'));
    return this.parts.length === this.total;
  }

  assemble(): Buffer {
    return Buffer.concat(this.parts);
  }
}
