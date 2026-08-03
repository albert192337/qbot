/**
 * 联机 L1 资产分发：打包/分块/重组单测（全本地文件操作，不联网）。
 * 重点守隐私铁律（persona 不出包）与恶意包防御（路径穿越/尺寸炸弹/乱序块）。
 */
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ChunkAssembler,
  chunkToBase64,
  packCharacterDir,
  sanitizeManifest,
  unpackCharacter,
} from '../src/main/link/asset-pack';

const cleanups: string[] = [];

async function makeCharDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'qbot-asset-pack-'));
  cleanups.push(dir);
  await mkdir(path.join(dir, 'actions'), { recursive: true });
  const manifest = {
    id: 'test-char',
    name: '测试角色',
    persona: '这是绝不能出本机的人设文本',
    actions: {
      idle: { status: 'done', webm: 'actions/idle.webm' },
      drag: { status: 'done', webm: 'actions/drag.webm' },
      tea: { status: 'pending', webm: 'actions/tea.webm' }, // 未完成：不打包
    },
    customActions: {
      dance: { status: 'done', webm: 'actions/dance.webm' },
    },
  };
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(path.join(dir, 'actions/idle.webm'), Buffer.from('idle-video-bytes'));
  await writeFile(path.join(dir, 'actions/drag.webm'), Buffer.alloc(200_000, 7)); // 跨块边界
  await writeFile(path.join(dir, 'actions/dance.webm'), Buffer.from('dance-bytes'));
  return dir;
}

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('packCharacterDir / unpackCharacter', () => {
  it('打包→分块→重组→解包 全链路 roundtrip', async () => {
    const charDir = await makeCharDir();
    const { hash, buffer } = await packCharacterDir(charDir);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);

    // 模拟走线：分块 base64 → assembler 重组
    const chunks = chunkToBase64(buffer);
    expect(chunks.length).toBeGreaterThan(1); // 200KB 文件必然多块
    const asm = new ChunkAssembler(hash);
    let done = false;
    chunks.forEach((data, seq) => {
      done = asm.add(seq, chunks.length, data);
    });
    expect(done).toBe(true);
    expect(asm.assemble().equals(buffer)).toBe(true);

    const dest = await mkdtemp(path.join(tmpdir(), 'qbot-asset-unpack-'));
    cleanups.push(dest);
    await unpackCharacter(buffer, dest);
    const manifest = JSON.parse(await readFile(path.join(dest, 'manifest.json'), 'utf8'));
    expect(manifest.name).toBe('测试角色');
    expect(await readFile(path.join(dest, 'actions/idle.webm'), 'utf8')).toBe('idle-video-bytes');
    expect((await readFile(path.join(dest, 'actions/drag.webm'))).length).toBe(200_000);
    expect(existsSync(path.join(dest, 'actions/dance.webm'))).toBe(true);
    // 未完成的动作不进包
    expect(existsSync(path.join(dest, 'actions/tea.webm'))).toBe(false);
  });

  it('隐私铁律：persona 不出包（spec §四）', async () => {
    const charDir = await makeCharDir();
    const { buffer } = await packCharacterDir(charDir);
    expect(buffer.includes(Buffer.from('绝不能出本机'))).toBe(false);
    expect(sanitizeManifest({ persona: 'x', name: 'a' })).toEqual({ name: 'a' });
  });

  it('hash 内容寻址：内容变则 hash 变，不变则稳定', async () => {
    const charDir = await makeCharDir();
    const first = await packCharacterDir(charDir);
    const again = await packCharacterDir(charDir);
    expect(again.hash).toBe(first.hash);
    await writeFile(path.join(charDir, 'actions/idle.webm'), Buffer.from('changed!'));
    const changed = await packCharacterDir(charDir);
    expect(changed.hash).not.toBe(first.hash);
  });

  it('恶意包：路径穿越拒收', async () => {
    const header = Buffer.from(
      JSON.stringify({ files: [{ path: 'manifest.json', size: 2 }, { path: '../evil.sh', size: 2 }] }),
    );
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(header.length);
    const evil = Buffer.concat([lenBuf, header, Buffer.from('{}hi')]);
    const dest = await mkdtemp(path.join(tmpdir(), 'qbot-asset-evil-'));
    cleanups.push(dest);
    await expect(unpackCharacter(evil, dest)).rejects.toThrow(/unsafe path/);
  });

  it('恶意包：尺寸越界 / 缺 manifest 拒收', async () => {
    const dest = await mkdtemp(path.join(tmpdir(), 'qbot-asset-bad-'));
    cleanups.push(dest);
    await expect(unpackCharacter(Buffer.from([0, 0]), dest)).rejects.toThrow(/truncated/);
    const header = Buffer.from(JSON.stringify({ files: [{ path: 'actions/a.webm', size: 5 }] }));
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(header.length);
    await expect(
      unpackCharacter(Buffer.concat([lenBuf, header, Buffer.from('12345')]), dest),
    ).rejects.toThrow(/missing manifest/);
  });
});

describe('ChunkAssembler', () => {
  it('seq 跳号 / total 中途变 / total 超限 全部抛错', () => {
    const asm = new ChunkAssembler('a'.repeat(16));
    expect(asm.add(0, 3, Buffer.from('x').toString('base64'))).toBe(false);
    expect(() => asm.add(2, 3, 'eA==')).toThrow(/seq gap/);
    expect(() => asm.add(1, 4, 'eA==')).toThrow(/total changed/);
    expect(() => new ChunkAssembler('b'.repeat(16)).add(0, 999_999, 'eA==')).toThrow(/bad chunk total/);
  });

  it('进度可读：received/expectedTotal', () => {
    const asm = new ChunkAssembler('c'.repeat(16));
    asm.add(0, 2, Buffer.from('hello ').toString('base64'));
    expect(asm.received).toBe(1);
    expect(asm.expectedTotal).toBe(2);
    expect(asm.add(1, 2, Buffer.from('world').toString('base64'))).toBe(true);
    expect(asm.assemble().toString('utf8')).toBe('hello world');
  });
});
