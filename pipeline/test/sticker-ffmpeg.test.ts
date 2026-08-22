/**
 * 表情包导入的 ffmpeg 路径回归（真跑 ffmpeg，不联网不花钱）：
 * - extractFrames 等间隔抽帧（含单帧 GIF 边界）
 * - gifToWebm 方形画布 + 透明 padding + alpha 保留
 * - labelStickers 端到端（FakeArkClient 打标）
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gifToWebm, STICKER_CANVAS } from '../src/chroma.js';
import { extractFrames, labelStickers, scanStickerDir } from '../src/sticker-import.js';
import { createFakeArkClient } from './fake-ark.js';
import { getFfmpegPath } from './fixtures.js';

const execFileP = promisify(execFile);

let ffmpegPath: string;
let dir: string;
/** 横版 320x180（padding 会留透明边）、方版 200x200、单帧 */
let wideGif: string;
let squareGif: string;
let singleGif: string;

beforeAll(async () => {
  ffmpegPath = await getFfmpegPath();
  dir = await mkdtemp(path.join(os.tmpdir(), 'qbot-sticker-'));
  wideGif = path.join(dir, 'wide.gif');
  squareGif = path.join(dir, 'square.gif');
  singleGif = path.join(dir, 'single.gif');
  await execFileP(ffmpegPath, [
    '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=10:duration=1', wideGif,
  ]);
  await execFileP(ffmpegPath, [
    '-y', '-f', 'lavfi', '-i', 'testsrc2=size=200x200:rate=10:duration=1', squareGif,
  ]);
  await execFileP(ffmpegPath, [
    '-y', '-f', 'lavfi', '-i', 'testsrc2=size=100x100:rate=1:duration=1',
    '-frames:v', '1', singleGif,
  ]);
}, 60_000);

/** 解码 webm 取指定区域的 alpha 值（必须显式 -vcodec libvpx-vp9，血泪坑 1） */
async function alphaAt(
  webm: string,
  crop: string,
): Promise<number[]> {
  const { stdout } = await execFileP(
    ffmpegPath,
    ['-v', 'error', '-vcodec', 'libvpx-vp9', '-i', webm, '-vf', `crop=${crop}`,
     '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
    { encoding: 'buffer', maxBuffer: 8 << 20 },
  );
  return [...Array(Math.floor(stdout.length / 4)).keys()].map((i) => stdout[i * 4 + 3]);
}

async function probe(file: string): Promise<string> {
  const { stderr } = await execFileP(ffmpegPath, ['-i', file], { encoding: 'utf8' })
    .catch((e: { stderr?: string }) => ({ stderr: e?.stderr ?? '' }));
  return String(stderr);
}

describe('extractFrames', () => {
  it('多帧 GIF 抽 3 帧，都是有效 PNG', async () => {
    const frames = await extractFrames(wideGif, ffmpegPath);
    expect(frames).toHaveLength(3);
    // PNG magic number
    for (const f of frames) {
      expect(f.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    }
    // 等间隔取样应取到不同画面（testsrc2 每帧都在变）
    expect(frames[0].equals(frames[2])).toBe(false);
  }, 30_000);

  it('单帧 GIF 不炸，返回 1 帧', async () => {
    const frames = await extractFrames(singleGif, ffmpegPath);
    expect(frames.length).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('非 GIF/损坏文件抛错（复核界面标红用）', async () => {
    await expect(extractFrames(path.join(dir, 'nope.gif'), ffmpegPath)).rejects.toThrow();
  }, 30_000);
});

describe('gifToWebm', () => {
  it('横版贴纸 → 方形画布，padding 区透明，alpha_mode=1', async () => {
    const out = path.join(dir, 'wide.webm');
    await gifToWebm(wideGif, out, ffmpegPath);
    expect(existsSync(out)).toBe(true);

    const info = await probe(out);
    expect(info).toMatch(new RegExp(`${STICKER_CANVAS}x${STICKER_CANVAS}`));
    // 血泪坑 1：alpha 双参数缺一即黑底
    expect(/ALPHA_MODE\s*:\s*1/i.test(info)).toBe(true);

    // 320x180 缩放到 640 宽 → 高 360，上下各留 140px 透明边
    const topAlphas = await alphaAt(out, '32:32:0:0');
    expect(Math.max(...topAlphas)).toBe(0);
  }, 60_000);

  it('方版贴纸铺满画布（不留透明边、不变形）', async () => {
    const out = path.join(dir, 'square.webm');
    await gifToWebm(squareGif, out, ffmpegPath);
    const info = await probe(out);
    expect(info).toMatch(new RegExp(`${STICKER_CANVAS}x${STICKER_CANVAS}`));
    // 方版等比放大后正好铺满 → 角落不透明
    const corner = await alphaAt(out, '32:32:0:0');
    expect(Math.max(...corner)).toBeGreaterThan(0);
  }, 60_000);
});

describe('scanStickerDir', () => {
  it('只认 .gif，结果排序稳定', async () => {
    const found = await scanStickerDir(dir);
    expect(found.every((f) => f.endsWith('.gif'))).toBe(true);
    expect(found.map((f) => path.basename(f))).toEqual(
      [...found.map((f) => path.basename(f))].sort(),
    );
    // beforeAll 造的 3 个 gif 都在（webm 产物不在）
    expect(found).toHaveLength(3);
  });
});

describe('labelStickers（端到端，fake 打标）', () => {
  it('抽帧 → 打标 → 映射槽位', async () => {
    const fake = createFakeArkClient({
      greenFramePng: '', turnaroundPng: '', greenVideoMp4: '',
      visionReply: (opts) => {
        // 图片块数 = 贴纸数 × 帧数；确认交错标记也在
        const texts = opts.parts.filter((p) => p.type === 'text').length;
        expect(texts).toBeGreaterThan(1); // 总说明 + 每贴纸一个「贴纸 #N」标记
        return JSON.stringify([
          { index: 1, category: 'happy', confidence: 0.9, reason: '笑' },
          { index: 2, category: 'sleep', confidence: 0.8, reason: '闭眼' },
        ]);
      },
    });
    const labels = await labelStickers([squareGif, wideGif], fake, ffmpegPath);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toMatchObject({ sourceName: 'square.gif', slot: 'talk_happy' });
    expect(labels[1]).toMatchObject({ sourceName: 'wide.gif', slot: 'sleep' });
    expect(fake.calls.visions).toBe(1);
  }, 60_000);

  it('坏 GIF 不阻断整批：好的照常打标，坏的降级 other', async () => {
    const fake = createFakeArkClient({
      greenFramePng: '', turnaroundPng: '', greenVideoMp4: '',
      visionReply: JSON.stringify([
        { index: 1, category: 'tea', confidence: 0.7, reason: '喝茶' },
      ]),
    });
    const labels = await labelStickers(
      [squareGif, path.join(dir, 'missing.gif')],
      fake,
      ffmpegPath,
    );
    expect(labels).toHaveLength(2);
    const ok = labels.find((l) => l.sourceName === 'square.gif');
    const bad = labels.find((l) => l.sourceName === 'missing.gif');
    expect(ok).toMatchObject({ category: 'tea', slot: 'tea' });
    expect(bad).toMatchObject({ category: 'other', confidence: 0, slot: undefined });
    expect(bad?.reason).toMatch(/无法解码/);
  }, 60_000);

  it('API 整体失败 → 全批降级 other（用户人工指定），不抛异常', async () => {
    const fake = createFakeArkClient({
      greenFramePng: '', turnaroundPng: '', greenVideoMp4: '',
      // visionReply 未配置 → visionChat 抛错
    });
    const labels = await labelStickers([squareGif], fake, ffmpegPath);
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({ category: 'other', confidence: 0 });
    expect(labels[0].reason).toMatch(/打标失败/);
  }, 60_000);
});
