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

/** computeAlphaStats 的结果：归一化 [0,1] 包围盒 + 脚线 + 平均不透明覆盖率 */
export interface AlphaStats {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** 「够宽」的最低行 = 脚线；细长延伸物（马尾梢/飘带）不参与，用于底边对齐 */
  footY: number;
  /** 不透明像素数 / 画布像素数，按帧平均 */
  coverage: number;
}

/**
 * 抠像参数演进（全部实测）：
 * - colorkey 0.24:0.06（DESIGN.md §3.4 原值）→ 误抠绿色系角色本体（小青薄荷绿身体镂空）
 * - colorkey 0.15:0.04 → 高保真影棚绿幕的暗角 key 色（如 rgb(3,76,38)）在 RGB 空间贴近黑色，
 *   把黑皮衣抠成半透明洞
 * - colorkey 0.11 + 多 key → 写实渲染的暗部胶片颗粒单像素散布大，RGB 距离覆盖不住，
 *   「暗部颗粒要大半径、深色衣服要小半径」在 RGB 空间无解
 * - 现方案 chromakey + 单个「最饱和亮绿」key：UV 色度空间对亮度不敏感，
 *   同一色度的亮暗渐变和颗粒一个 key 全覆盖；必须选最饱和的绿做 key——
 *   暗绿的 UV 弱（贴近中性灰），会连深色衣服一起吃掉
 * - 残留绿边不靠调大 similarity 解决（上面两条已证明会吃角色本体），
 *   而是靠 ALPHA_ERODE_PX 收边：只动 alpha 通道，不碰 key 半径
 */
export const CHROMAKEY_SIMILARITY = 0.1;
export const CHROMAKEY_BLEND = 0.07;

/**
 * alpha 收边像素数（仅 webm；GIF 走 paletteuse=alpha_threshold=128 天然硬切）。
 * chromakey 半径故意留小以免抠穿角色，代价是轮廓上留一圈半透明的混色绿像素。
 * 对 alpha 做 N 次 3×3 腐蚀把这圈啃掉，比调大 similarity 安全得多。
 */
export const ALPHA_ERODE_PX = 1;

/** 归一化目标：角色 alpha 覆盖面积占画布比例 / 底边基线位置（所有动作一致 → 视觉等大）。
 *  0.18 = 按现有 6 个动作在旧 bbox 口径下的归一化后覆盖率中位数实测标定，
 *  换口径后整体观感与之前接近，不会突然变大变小。 */
export const NORM_TARGET_COVERAGE = 0.18;
/** 旧口径：仅在拿不到 coverage 时回退用（bbox 高度占比） */
export const NORM_TARGET_H = 0.68;
export const NORM_BASELINE = 0.86;
export const NORM_SCALE_MIN = 0.5;
export const NORM_SCALE_MAX = 2.5;

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

/** 视频总帧数（解析 ffmpeg stderr，ffmpeg-static 不带 ffprobe） */
async function countFrames(videoPath: string, ffmpegPath: string): Promise<number> {
  const durRaw = await execFileP(
    ffmpegPath,
    ['-i', videoPath, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).catch((e: { stderr?: string }) => ({ stdout: '', stderr: e.stderr ?? '' }));
  const stderr = (durRaw as { stderr: string }).stderr ?? '';
  const m = stderr.match(/frame=\s*(\d+)/g);
  return m ? parseInt(m[m.length - 1]!.replace(/\D/g, ''), 10) : 0;
}

/**
 * 采样视频首/中/尾三帧的角落色，供 qc 计算背景漂移。
 * 用 select 表达式抽 3 帧，一次 ffmpeg 调用输出 3×(8×8×3) bytes。
 */
export async function sampleCornerAcrossFrames(
  videoPath: string,
  ffmpegPath: string,
): Promise<string[]> {
  const total = await countFrames(videoPath, ffmpegPath);
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

/** 背景采样点（8×8 块左上角坐标）：四角 + 四边中点 */
function backgroundSamplePoints(w: number, h: number): Array<[number, number]> {
  const cx = Math.floor(w / 2) - 4;
  const cy = Math.floor(h / 2) - 4;
  return [
    [8, 8], [w - 16, 8], [8, h - 16], [w - 16, h - 16],
    [cx, 8], [cx, h - 16], [8, cy], [w - 16, cy],
  ];
}

/**
 * 采样首/尾帧各 8 个背景点（四角 + 四边中点）的 8×8 平均色。
 * 写实风绿幕带光照渐变：角落暗、中心亮，同帧空间色距可超过 colorkey 半径，
 * 单点采样必漏。结果交给 qc.selectChromaKey 选出最饱和的亮绿做 chromakey key。
 */
export async function sampleBackgroundColors(
  videoPath: string,
  ffmpegPath: string,
): Promise<string[]> {
  const { width, height } = await probeSize(videoPath, ffmpegPath);
  const total = await countFrames(videoPath, ffmpegPath);
  const last = Math.max(total - 1, 1);
  const raw = await runFfmpeg(ffmpegPath, [
    '-i', videoPath,
    '-vf', `select='eq(n\\,0)+eq(n\\,${last})'`,
    '-fps_mode', 'passthrough',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',
  ]);
  const frameBytes = width * height * 3;
  const colors: string[] = [];
  for (let off = 0; off + frameBytes <= raw.length; off += frameBytes) {
    for (const [px, py] of backgroundSamplePoints(width, height)) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let y = py; y < py + 8; y++) {
        for (let x = px; x < px + 8; x++) {
          const i = off + (y * width + x) * 3;
          r += raw[i]!;
          g += raw[i + 1]!;
          b += raw[i + 2]!;
        }
      }
      const hex = (v: number) =>
        Math.round(v / 64)
          .toString(16)
          .padStart(2, '0');
      colors.push(`${hex(r)}${hex(g)}${hex(b)}`);
    }
  }
  return colors;
}

function keyFilters(keys: string[]): string {
  return keys
    .map((k) => `chromakey=0x${k}:${CHROMAKEY_SIMILARITY}:${CHROMAKEY_BLEND}`)
    .join(',');
}

/** 视频像素尺寸（解析 ffmpeg stderr，ffmpeg-static 不带 ffprobe） */
export async function probeSize(
  videoPath: string,
  ffmpegPath: string,
): Promise<{ width: number; height: number }> {
  const res = await execFileP(ffmpegPath, ['-i', videoPath], {
    encoding: 'utf8',
  }).catch((e: { stderr?: string }) => ({ stdout: '', stderr: e.stderr ?? '' }));
  const stderr = (res as { stderr: string }).stderr ?? '';
  const m = stderr.match(/Video:.* (\d{2,5})x(\d{2,5})/);
  if (!m) throw new Error(`cannot probe video size: ${videoPath}`);
  return { width: parseInt(m[1]!, 10), height: parseInt(m[2]!, 10) };
}

/**
 * 抠像后 alpha 统计：包围盒（全帧 union）+ 平均覆盖率，一次解码同时算出。
 * 低清代理（160px、4fps）扫 alpha > 32 的像素，误差 <1% 对归一化足够。
 * 全透明（空内容）返回 null，调用方跳过归一化。
 *
 * coverage = 不透明像素数 / 画布像素数，按帧取平均。
 * 它比 bbox 高度稳健得多：举起的手、翘起的马尾、拖拽时垂下的腿都会撑大 bbox
 * 却几乎不改变身体面积，所以「bbox 等高」≠「看起来等大」。
 */
export async function computeAlphaStats(
  videoPath: string,
  keys: string[],
  ffmpegPath: string,
): Promise<AlphaStats | null> {
  const P = 160;
  const raw = await runFfmpeg(ffmpegPath, [
    '-i', videoPath,
    '-vf', `fps=4,${keyFilters(keys)},format=yuva420p,alphaextract,scale=${P}:${P}`,
    '-f', 'rawvideo',
    '-pix_fmt', 'gray',
    'pipe:1',
  ]);
  const frameBytes = P * P;
  let minX = P;
  let minY = P;
  let maxX = -1;
  let maxY = -1;
  let opaqueTotal = 0;
  let frames = 0;
  /** 每行不透明像素数（全帧 union）：用来找脚线，见下 */
  const rowCount = new Array<number>(P).fill(0);
  for (let off = 0; off + frameBytes <= raw.length; off += frameBytes) {
    frames++;
    for (let y = 0; y < P; y++) {
      for (let x = 0; x < P; x++) {
        if (raw[off + y * P + x]! > 32) {
          opaqueTotal++;
          rowCount[y]!++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  if (maxX < 0 || frames === 0) return null;
  // 脚线：bbox 底边常常是马尾梢/飘带这种细长延伸物（drag 实测就是），
  // 拿它对齐基线会把身体整体顶高。改为自底向上找第一条「够宽」的行——
  // 细梢只占几个像素，脚部是宽的，用最宽行的 15% 作门槛区分。
  const widest = Math.max(...rowCount);
  const footThreshold = widest * 0.15;
  let footRow = maxY;
  for (let y = P - 1; y >= 0; y--) {
    if (rowCount[y]! >= footThreshold) {
      footRow = y;
      break;
    }
  }
  return {
    x0: minX / P,
    y0: minY / P,
    x1: (maxX + 1) / P,
    y1: (maxY + 1) / P,
    footY: (footRow + 1) / P,
    coverage: opaqueTotal / frames / frameBytes,
  };
}

/** 兼容旧调用：只要包围盒 */
export async function computeAlphaBBox(
  videoPath: string,
  keys: string[],
  ffmpegPath: string,
): Promise<{ x0: number; y0: number; x1: number; y1: number } | null> {
  return computeAlphaStats(videoPath, keys, ffmpegPath);
}

/**
 * 由 alpha 统计算归一化滤镜段：缩放使角色视觉等大，脚线对齐 NORM_BASELINE、水平居中。
 * 透明 pad 出安全边再裁回原画布。
 *
 * 有 coverage 时按 sqrt(目标面积/实际面积) 缩放（对姿态稳健）；没有时回退旧的 bbox 高度口径。
 * 有 footY 时用脚线对齐基线；没有时回退 bbox 底边（会被马尾梢之类顶高）。
 */
export function normalizeFilter(
  stats: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    footY?: number;
    coverage?: number;
  },
  width: number,
  height: number,
): string {
  const bbox = stats;
  const raw =
    stats.coverage && stats.coverage > 0
      ? Math.sqrt(NORM_TARGET_COVERAGE / stats.coverage)
      : (NORM_TARGET_H * height) / ((bbox.y1 - bbox.y0) * height);
  const s = Math.min(NORM_SCALE_MAX, Math.max(NORM_SCALE_MIN, raw));
  const even = (v: number) => 2 * Math.round(v / 2);
  const sw = even(width * s);
  const sh = even(height * s);
  const M = Math.max(width, height) * 4; // 安全边，保证 crop 不越界
  const cx = ((bbox.x0 + bbox.x1) / 2) * width * s;
  const yb = (stats.footY ?? bbox.y1) * height * s;
  const cropX = Math.round(cx + M - width / 2);
  const cropY = Math.round(yb + M - NORM_BASELINE * height);
  return (
    `scale=${sw}:${sh},pad=iw+${2 * M}:ih+${2 * M}:${M}:${M}:color=black@0,` +
    `crop=${width}:${height}:${cropX}:${cropY}`
  );
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
  normVf?: string,
  erodePx: number = ALPHA_ERODE_PX,
): Promise<void> {
  const vf =
    `${keyFilters(keys)},format=yuva420p${erodeFilter(erodePx)}` +
    `${normVf ? `,${normVf}` : ''}`;
  await runFfmpeg(ffmpegPath, [
    '-y',
    '-i', inPath,
    '-vf', vf,
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

/**
 * alpha 收边滤镜段：抽出 alpha 通道做 N 次 3×3 腐蚀后再合回去。
 * 只削 alpha，色彩平面不动 —— 所以不会重演「调大 key 半径把绿衣服抠空」。
 * 标签用 __ 前缀，避免和 toGif 里的 [a]/[b] 撞名。
 */
function erodeFilter(px: number): string {
  if (!Number.isFinite(px) || px <= 0) return '';
  const erosions = Array.from({ length: Math.floor(px) }, () => 'erosion').join(',');
  return `,split[__m][__a];[__a]alphaextract,${erosions}[__e];[__m][__e]alphamerge`;
}

/** 绿幕 mp4 → 320px 透明 GIF（导出分享用，DESIGN.md §3.4 生产参数逐字） */
export async function toGif(
  inPath: string,
  outPath: string,
  keys: string[],
  ffmpegPath: string,
  normVf?: string,
): Promise<void> {
  const vf =
    `${keyFilters(keys)},format=yuva420p${normVf ? `,${normVf}` : ''},` +
    `fps=20,scale=320:-1:flags=lanczos,` +
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
