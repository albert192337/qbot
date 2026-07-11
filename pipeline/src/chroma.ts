/**
 * 抠像与转码：动态 key 色采样 + WebM(VP9+alpha) / GIF 输出。
 * ffmpeg 参数逐字取自 DESIGN.md §3.4 实测生产参数。
 *
 * ── 三条踩坑铁律（实测血泪，禁止"优化"）──────────────────────────
 * 1. 不要用 despill：白色含大量绿通道，despill 会把白发/白衣染成粉紫
 * 2. GIF 必须 dither=none：bayer 抖动会把 alpha 一起抖出半透明散点
 * 3. 循环靠生成层保证（first=last frame），不做后期交叉淡化接缝
 * ────────────────────────────────────────────────────────────────
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** colorkey 生产参数（DESIGN.md §3.4） */
export const COLORKEY_SIMILARITY = 0.24;
export const COLORKEY_BLEND = 0.06;

/** 运行 ffmpeg，args 数组传参（不拼 shell 字符串，免转义问题） */
async function runFfmpeg(
  ffmpegPath: string,
  args: string[],
  opts: { captureStdout?: boolean } = {},
): Promise<Buffer> {
  const { stdout } = await execFileP(ffmpegPath, ['-v', 'error', ...args], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
    ...(opts.captureStdout ? {} : {}),
  });
  return stdout;
}

/** rawvideo RGB24 buffer → 平均色 hex（TS 版替代 DESIGN.md 里的 python 单行） */
function meanRgbHex(raw: Buffer): string {
  const n = Math.floor(raw.length / 3);
  if (n === 0) throw new Error('empty rawvideo output');
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < n * 3; i += 3) {
    r += raw[i];
    g += raw[i + 1];
    b += raw[i + 2];
  }
  const hex = (v: number) =>
    Math.round(v / n)
      .toString(16)
      .padStart(2, '0');
  return `${hex(r)}${hex(g)}${hex(b)}`;
}

/** 采样视频首帧左上角 8×8 的平均色（背景绿每次生成都不同，必须动态采样） */
export async function sampleKeyColor(
  videoPath: string,
  ffmpegPath: string,
): Promise<string> {
  const raw = await runFfmpeg(ffmpegPath, [
    '-i', videoPath,
    '-vf', 'crop=8:8:8:8',
    '-frames:v', '1',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',
  ]);
  return meanRgbHex(raw);
}

/**
 * 采样视频首/中/尾三帧的角落色，供 qc 计算背景漂移。
 * 用 select 表达式抽 3 帧，一次 ffmpeg 调用输出 3×(8×8×3) bytes。
 */
export async function sampleCornerAcrossFrames(
  videoPath: string,
  ffmpegPath: string,
): Promise<string[]> {
  // 先取总帧数（用 ffmpeg 统计而非 ffprobe：ffmpeg-static 不带 ffprobe）
  const durRaw = await execFileP(
    ffmpegPath,
    ['-i', videoPath, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).catch((e: { stderr?: string }) => ({ stdout: '', stderr: e.stderr ?? '' }));
  const stderr = (durRaw as { stderr: string }).stderr ?? '';
  const m = stderr.match(/frame=\s*(\d+)/g);
  const total = m ? parseInt(m[m.length - 1]!.replace(/\D/g, ''), 10) : 0;
  const last = Math.max(total - 1, 2);
  const mid = Math.floor(last / 2);

  const raw = await runFfmpeg(ffmpegPath, [
    '-i', videoPath,
    '-vf', `select='eq(n\\,0)+eq(n\\,${mid})+eq(n\\,${last})',crop=8:8:8:8`,
    '-fps_mode', 'passthrough',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',
  ]);
  const frameBytes = 8 * 8 * 3;
  const colors: string[] = [];
  for (let off = 0; off + frameBytes <= raw.length; off += frameBytes) {
    colors.push(meanRgbHex(raw.subarray(off, off + frameBytes)));
  }
  return colors;
}

function colorkeyFilters(keys: string[]): string {
  return keys
    .map((k) => `colorkey=0x${k}:${COLORKEY_SIMILARITY}:${COLORKEY_BLEND}`)
    .join(',');
}

/**
 * 绿幕 mp4 → 透明 WebM（VP9 + yuva420p）。
 * 两个不显眼但致命的参数：
 * - `-auto-alt-ref 0`：VP9 alpha 与 alt-ref 不兼容，不关会报错或丢 alpha
 * - `-metadata:s:v:0 alpha_mode=1`：Chromium 靠容器标记才把 alpha 当 alpha 渲染，漏掉则 <video> 黑底
 */
export async function toWebm(
  inPath: string,
  outPath: string,
  keys: string[],
  ffmpegPath: string,
): Promise<void> {
  await runFfmpeg(ffmpegPath, [
    '-y',
    '-i', inPath,
    '-vf', `${colorkeyFilters(keys)},format=yuva420p`,
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p',
    '-auto-alt-ref', '0',
    '-metadata:s:v:0', 'alpha_mode=1',
    '-b:v', '0',
    '-crf', '30',
    '-an',
    outPath,
  ]);
}

/** 绿幕 mp4 → 320px 透明 GIF（导出分享用，DESIGN.md §3.4 生产参数逐字） */
export async function toGif(
  inPath: string,
  outPath: string,
  keys: string[],
  ffmpegPath: string,
): Promise<void> {
  const vf =
    `fps=20,scale=320:-1:flags=lanczos,` +
    `${colorkeyFilters(keys)},` +
    `split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=full[p];` +
    `[b][p]paletteuse=alpha_threshold=128:dither=none`;
  await runFfmpeg(ffmpegPath, [
    '-y',
    '-i', inPath,
    '-vf', vf,
    '-loop', '0',
    outPath,
  ]);
}

/** PNG 单帧的四角采样（qc.ts 绿幕首帧质检用）：返回四角 8×8 平均色 */
export async function sampleImageCorners(
  imagePath: string,
  ffmpegPath: string,
): Promise<string[]> {
  const corners = [
    'crop=8:8:8:8', // 左上
    'crop=8:8:iw-16:8', // 右上
    'crop=8:8:8:ih-16', // 左下
    'crop=8:8:iw-16:ih-16', // 右下
  ];
  const out: string[] = [];
  for (const c of corners) {
    const raw = await runFfmpeg(ffmpegPath, [
      '-i', imagePath,
      '-vf', c,
      '-frames:v', '1',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      'pipe:1',
    ]);
    out.push(meanRgbHex(raw));
  }
  return out;
}

/** 解析默认 ffmpeg 路径：优先注入值，fallback 到 ffmpeg-static */
export async function resolveFfmpegPath(injected?: string): Promise<string> {
  if (injected) return injected;
  const mod = await import('ffmpeg-static');
  const p = (mod.default ?? mod) as unknown as string;
  if (!p) throw new Error('ffmpeg-static provided no binary path');
  return p;
}
