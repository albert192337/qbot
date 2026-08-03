import { describe, expect, it } from 'vitest';
import {
  NORM_BASELINE,
  NORM_SCALE_MAX,
  NORM_SCALE_MIN,
  NORM_TARGET_COVERAGE,
  NORM_TARGET_H,
  normalizeFilter,
} from '../src/chroma.js';

/** 从 normalizeFilter 输出里抽出 scale 宽高与 crop 偏移 */
function parse(vf: string) {
  const scale = /^scale=(\d+):(\d+)/.exec(vf);
  const pad = /pad=iw\+(\d+):/.exec(vf);
  const crop = /crop=(\d+):(\d+):(-?\d+):(-?\d+)$/.exec(vf);
  if (!scale || !pad || !crop) throw new Error(`滤镜段解析失败: ${vf}`);
  return {
    sw: +scale[1]!,
    sh: +scale[2]!,
    M: +pad[1]! / 2,
    cropW: +crop[1]!,
    cropH: +crop[2]!,
    cropX: +crop[3]!,
    cropY: +crop[4]!,
  };
}

const W = 640;
const H = 640;
/** 居中、占画面中部的典型 bbox */
const base = { x0: 0.25, y0: 0.1, x1: 0.75, y1: 0.9 };

describe('normalizeFilter', () => {
  it('按 coverage 缩放：面积小的放大、面积大的缩小', () => {
    const small = parse(normalizeFilter({ ...base, coverage: NORM_TARGET_COVERAGE / 4 }, W, H));
    const big = parse(normalizeFilter({ ...base, coverage: NORM_TARGET_COVERAGE * 4 }, W, H));
    // 面积差 4 倍 → 线性尺度差 2 倍
    expect(small.sw / W).toBeCloseTo(2, 1);
    expect(big.sw / W).toBeCloseTo(0.5, 1);
  });

  it('coverage 等于目标时不缩放', () => {
    const r = parse(normalizeFilter({ ...base, coverage: NORM_TARGET_COVERAGE }, W, H));
    expect(r.sw).toBe(W);
    expect(r.sh).toBe(H);
  });

  it('缩放被 NORM_SCALE_MIN/MAX 夹取（防极端素材炸掉）', () => {
    const tiny = parse(normalizeFilter({ ...base, coverage: 1e-6 }, W, H));
    expect(tiny.sw / W).toBeCloseTo(NORM_SCALE_MAX, 1);
    const huge = parse(normalizeFilter({ ...base, coverage: 0.999 }, W, H));
    expect(huge.sw / W).toBeCloseTo(NORM_SCALE_MIN, 1);
  });

  it('无 coverage 时回退 bbox 高度口径', () => {
    const r = parse(normalizeFilter(base, W, H));
    // bbox 高 0.8 → 缩放到 NORM_TARGET_H
    expect(r.sh / H).toBeCloseTo(NORM_TARGET_H / 0.8, 2);
  });

  it('输出画布尺寸恒等于输入（crop 回原尺寸）', () => {
    for (const cov of [0.05, 0.18, 0.4]) {
      const r = parse(normalizeFilter({ ...base, coverage: cov }, W, H));
      expect(r.cropW).toBe(W);
      expect(r.cropH).toBe(H);
    }
  });

  it('scale 后宽高为偶数（yuv420 要求）', () => {
    for (const cov of [0.07, 0.13, 0.21, 0.33]) {
      const r = parse(normalizeFilter({ ...base, coverage: cov }, W, H));
      expect(r.sw % 2).toBe(0);
      expect(r.sh % 2).toBe(0);
    }
  });

  it('footY 优先于 bbox 底边对齐基线（马尾梢不该顶高身体）', () => {
    const cov = NORM_TARGET_COVERAGE; // scale = 1，便于直接比较偏移
    // bbox 底 0.9，但脚线在 0.7（0.7~0.9 是垂下的马尾）
    const withFoot = parse(normalizeFilter({ ...base, footY: 0.7, coverage: cov }, W, H));
    const withoutFoot = parse(normalizeFilter({ ...base, coverage: cov }, W, H));
    // 用脚线对齐 → 裁切窗口上移，身体整体下落到基线
    expect(withFoot.cropY).toBeLessThan(withoutFoot.cropY);
    expect(withoutFoot.cropY - withFoot.cropY).toBeCloseTo((0.9 - 0.7) * H, 0);
  });

  it('脚线恰好等于 bbox 底时与旧行为一致', () => {
    const cov = NORM_TARGET_COVERAGE;
    const a = normalizeFilter({ ...base, footY: base.y1, coverage: cov }, W, H);
    const b = normalizeFilter({ ...base, coverage: cov }, W, H);
    expect(a).toBe(b);
  });

  it('脚线落在 NORM_BASELINE 上', () => {
    const cov = NORM_TARGET_COVERAGE; // scale 1
    const r = parse(normalizeFilter({ ...base, footY: 0.8, coverage: cov }, W, H));
    // crop 窗口内脚线的位置 = footY*H - cropY + M
    const footInCanvas = 0.8 * H + r.M - r.cropY;
    expect(footInCanvas).toBeCloseTo(NORM_BASELINE * H, 0);
  });

  it('水平居中：bbox 中心落在画布中线', () => {
    const cov = NORM_TARGET_COVERAGE;
    const off = { x0: 0.0, y0: 0.1, x1: 0.4, y1: 0.9 }; // 明显偏左
    const r = parse(normalizeFilter({ ...off, coverage: cov }, W, H));
    const centerInCanvas = 0.2 * W + r.M - r.cropX;
    expect(centerInCanvas).toBeCloseTo(W / 2, 0);
  });
});
