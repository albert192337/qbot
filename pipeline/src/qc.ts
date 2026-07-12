/**
 * 自动质检：
 * - checkGreenFrame：绿幕首帧四角是否纯绿（HSV 判定）
 * - checkVideoDrift：视频背景漂移分档（单 key / 双 key / 判废）
 * 阈值全部导出常量，切片 2 按真实产物微调。
 */
import { sampleCornerAcrossFrames, sampleImageCorners } from './chroma.js';

/** 绿区间色相（度）。上界 165：写实绿幕的亮部往青偏（实测 160.7°），160 会把最佳 key 滤掉 */
export const GREEN_HUE_MIN = 80;
export const GREEN_HUE_MAX = 165;
export const GREEN_SAT_MIN = 0.35;
export const GREEN_VAL_MIN = 0.25;

/** 漂移阈值（RGB 分量最大差，0-255）：≤ 单 key；(单, 废] 双 key；> 判废 */
export const DRIFT_SINGLE_KEY_MAX = 10;
export const DRIFT_DOUBLE_KEY_MAX = 25;

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/** RGB(0-255) → HSV（h: 0-360, s/v: 0-1） */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

export function isGreen(hex: string): boolean {
  const [h, s, v] = rgbToHsv(...hexToRgb(hex));
  return h >= GREEN_HUE_MIN && h <= GREEN_HUE_MAX && s >= GREEN_SAT_MIN && v >= GREEN_VAL_MIN;
}

export interface FrameQcResult {
  pass: boolean;
  corners: string[];
  reason?: string;
}

/** 绿幕首帧质检：四角 8×8 全绿才 pass（角色出画/背景非绿都会挂在这里） */
export async function checkGreenFrame(
  pngPath: string,
  ffmpegPath: string,
): Promise<FrameQcResult> {
  const corners = await sampleImageCorners(pngPath, ffmpegPath);
  const bad = corners.filter((c) => !isGreen(c));
  if (bad.length > 0) {
    return {
      pass: false,
      corners,
      reason: `${bad.length}/4 corners not green: ${bad.join(', ')}`,
    };
  }
  return { pass: true, corners };
}

/** 纯数据版漂移分档（可单测，不碰 ffmpeg） */
export function classifyDrift(cornerColors: string[]): {
  maxDrift: number;
  needDoubleKey: boolean;
  fail: boolean;
  keys: string[];
} {
  const rgbs = cornerColors.map(hexToRgb);
  let maxDrift = 0;
  for (let i = 0; i < rgbs.length; i++) {
    for (let j = i + 1; j < rgbs.length; j++) {
      for (let k = 0; k < 3; k++) {
        maxDrift = Math.max(maxDrift, Math.abs(rgbs[i][k] - rgbs[j][k]));
      }
    }
  }
  const needDoubleKey = maxDrift > DRIFT_SINGLE_KEY_MAX && maxDrift <= DRIFT_DOUBLE_KEY_MAX;
  const fail = maxDrift > DRIFT_DOUBLE_KEY_MAX;
  // 双 key 用首帧色 + 尾帧色（漂移的两端）；单 key 用首帧色
  const keys = needDoubleKey
    ? [cornerColors[0], cornerColors[cornerColors.length - 1]]
    : [cornerColors[0]];
  return { maxDrift, needDoubleKey, fail, keys: [...new Set(keys)] };
}

/**
 * 从背景采样色（chroma.sampleBackgroundColors）中选 chromakey 的 key 色：
 * 取「最饱和最亮」的绿（saturation × value 最大）。
 * - 过滤非绿样本——采样点可能落在角色或阴影上，绝不能把角色色当 key
 * - chromakey 在 UV 色度空间工作、对亮度不敏感：一个高色度 key 能覆盖
 *   同一色度的全部亮暗渐变与颗粒；反之暗绿 key 的 UV 贴近中性灰，
 *   会连深色衣服一起吃掉，所以必须选最「绿」的那个样本
 * 返回 null = 无可用绿样本，调用方回退左上角单点采样。
 */
export function selectChromaKey(samples: string[]): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const c of samples) {
    if (!isGreen(c)) continue;
    const [, s, v] = rgbToHsv(...hexToRgb(c));
    const score = s * v;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export interface DriftQcResult {
  maxDrift: number;
  needDoubleKey: boolean;
  fail: boolean;
  keys: string[];
  samples: string[];
}

/** 视频背景漂移质检：首/中/尾角落色两两求 RGB 分量最大差 */
export async function checkVideoDrift(
  videoPath: string,
  ffmpegPath: string,
): Promise<DriftQcResult> {
  const samples = await sampleCornerAcrossFrames(videoPath, ffmpegPath);
  return { ...classifyDrift(samples), samples };
}
