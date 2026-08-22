/**
 * 抠像质量回归：用合成绿幕素材验证 rim-only despill 的两个核心性质。
 * 这些断言直接对应 chroma.ts 的铁律 1，改抠像参数前先看这里为什么是现在这样。
 *
 * fixture 构造：大画布画主体再 bilinear 缩小 → 产生真实抗锯齿混色边，
 * 与 h264 色度子采样在角色轮廓上留下的绿边同构。
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { rimDespillFilter, erodeFilter, RIM_DESPILL_MIX } from '../src/chroma.js';
import { getFfmpegPath } from './fixtures.js';

const execFileP = promisify(execFile);
const DIR = path.join(import.meta.dirname, 'tmp/despill');
const BG = '0x3bfa2c';
/** chromakey 用的 key = 缩放后实际背景色（与 fixture 一致） */
const KEY = '0x38f72a';
const CK = `chromakey=${KEY}:0.1:0.07`;

let ffmpeg: string;

/** 绿幕上画一个纯色主体，缩小产生抗锯齿边 */
async function buildSubject(name: string, color: string): Promise<string> {
  const out = path.join(DIR, `${name}.png`);
  await execFileP(ffmpeg, [
    '-v', 'error', '-y',
    '-f', 'lavfi', '-i', `color=c=${BG}:s=1024x1024:d=1`,
    '-vf', `drawbox=x=300:y=200:w=424:h=624:color=${color}:t=fill,scale=256:256:flags=bilinear`,
    '-frames:v', '1', out,
  ]);
  return out;
}

interface Px { r: number; g: number; b: number; a: number; greenness: number }

/** 取一个像素的 RGBA；greenness = g 高出 r/b 均值的量（绿边的量化指标） */
async function pixel(src: string, vf: string, x: number, y: number): Promise<Px> {
  const { stdout } = await execFileP(ffmpeg, [
    '-v', 'error', '-i', src,
    '-vf', `${vf},crop=1:1:${x}:${y}`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1',
  ], { encoding: 'buffer', maxBuffer: 1 << 20 });
  const raw = stdout as unknown as Buffer;
  const [r, g, b, a] = [raw[0]!, raw[1]!, raw[2]!, raw[3]!];
  return { r, g, b, a, greenness: g - (r + b) / 2 };
}

let whiteSubj: string;
let mintSubj: string;

beforeAll(async () => {
  ffmpeg = await getFfmpegPath();
  await mkdir(DIR, { recursive: true });
  whiteSubj = await buildSubject('white', 'white');
  // 薄荷绿 = 血泪坑 3 的「小青」：绿色系角色本体，最容易被 despill 误伤
  mintSubj = await buildSubject('mint', '0x7fffd4');
}, 60_000);

/** 主体左边缘的绿边像素 / 主体内部像素（fixture 几何固定） */
const EDGE = { x: 75, y: 128 };
const INNER = { x: 120, y: 128 };

describe('rim-only despill', () => {
  it(
    '绿边像素被中和：白色主体轮廓 greenness 从 +70 降到 ≈0',
    async () => {
      const before = await pixel(whiteSubj, `${CK},format=yuva444p`, EDGE.x, EDGE.y);
      const after = await pixel(whiteSubj, `${CK}${rimDespillFilter()}`, EDGE.x, EDGE.y);
      // 抠像后这颗像素是不透明的绿边——所以单靠 alpha 门控（rim = alpha∈(0,1)）抓不到它
      expect(before.a).toBe(255);
      expect(before.greenness).toBeGreaterThan(50);
      expect(Math.abs(after.greenness)).toBeLessThanOrEqual(3);
      // alpha 不动：去绿边不以牺牲边缘细节为代价（对比 erosion 会削掉整圈）
      expect(after.a).toBe(255);
    },
    60_000,
  );

  it(
    '角色内部零改动：薄荷绿身体 greenness 保持 +86（血泪坑 3 不复发）',
    async () => {
      const before = await pixel(mintSubj, `${CK},format=yuva444p`, INNER.x, INNER.y);
      const after = await pixel(mintSubj, `${CK}${rimDespillFilter()}`, INNER.x, INNER.y);
      expect(before.greenness).toBeGreaterThan(80);
      expect(after.r).toBe(before.r);
      expect(after.g).toBe(before.g);
      expect(after.b).toBe(before.b);
    },
    60_000,
  );

  it(
    '白色本体不被染色（全帧 despill 的历史指控）：纯白像素 RGB 原样',
    async () => {
      const after = await pixel(whiteSubj, `${CK}${rimDespillFilter()}`, INNER.x, INNER.y);
      expect([after.r, after.g, after.b]).toEqual([0xfd, 0xfd, 0xfd]);
    },
    60_000,
  );

  it(
    '对照组：全帧 despill 会毁掉绿色角色本体（所以必须做空间门控）',
    async () => {
      const full = await pixel(
        mintSubj,
        `${CK},format=yuva444p,despill=type=green:mix=${RIM_DESPILL_MIX}`,
        INNER.x,
        INNER.y,
      );
      // 内部从 +86 被压到 ≈0 —— 这正是不能用全帧 despill 的实证
      expect(Math.abs(full.greenness)).toBeLessThan(10);
    },
    60_000,
  );

  it(
    '对照组：alpha 腐蚀去不掉绿边（只是把它变半透明），故 despill 取代之',
    async () => {
      const eroded = await pixel(
        whiteSubj,
        `${CK},format=yuva444p${erodeFilter(1)}`,
        EDGE.x,
        EDGE.y,
      );
      // 颜色一点没变，仅 alpha 下降 → 绿边仍在，只是淡了
      expect(eroded.greenness).toBeGreaterThan(50);
      expect(eroded.a).toBeLessThan(255);
    },
    60_000,
  );

  it('mix=0 关闭 despill（rekey 回退旧行为用）', () => {
    expect(rimDespillFilter(0)).toBe('');
    expect(rimDespillFilter(RIM_DESPILL_MIX, 0)).toBe('');
  });
});
