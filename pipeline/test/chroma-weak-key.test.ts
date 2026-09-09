import { expect, it } from 'vitest';
import { chromaKeyParams, resolveFfmpegPath, toWebm } from '../src/chroma';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
it('灰绿幕缩小抠像范围，饱和纯绿保持已有标定', () => {
  expect(chromaKeyParams('40a349').similarity).toBeLessThanOrEqual(0.05);
  expect(chromaKeyParams('429e48').blend).toBeLessThanOrEqual(0.015);
  expect(chromaKeyParams('00ff00')).toEqual({ similarity: 0.1, blend: 0.07 });
});

it('真实 VP9 alpha：灰绿背景透明，白肚皮/橄榄绿身体/深色轮廓不透明', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'qbot-key-'));
  try {
    const ff = await resolveFfmpegPath();
    const rgb = Buffer.alloc(96 * 64 * 3);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 96; x++) {
      const color = y < 16 || y >= 48 || x < 16 || x >= 80 ? [64, 163, 73]
        : x < 36 ? [237, 227, 200] : x < 58 ? [139, 148, 77] : [45, 35, 28];
      rgb.set(color, (y * 96 + x) * 3);
    }
    const source = path.join(dir, 'frame.ppm'), output = path.join(dir, 'out.webm');
    await writeFile(source, Buffer.concat([Buffer.from('P6\n96 64\n255\n'), rgb]));
    await toWebm(source, output, ['40a349', '429e48'], ff);
    const alpha = execFileSync(ff, ['-v', 'error', '-c:v', 'libvpx-vp9', '-i', output, '-vf', 'alphaextract', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
    expect(alpha[4 * 96 + 4]).toBeLessThan(5);
    for (const x of [24, 46, 68]) expect(alpha[32 * 96 + x]).toBeGreaterThan(245);
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 20000);
