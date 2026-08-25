import { describe, expect, it } from 'vitest';
import {
  PET_SIZE,
  PET_SCALE_MAX,
  PET_SCALE_MIN,
  clampPetScale,
  petTargetSize,
} from '../src/main/pet-geometry';

describe('clampPetScale', () => {
  it('正常值原样通过', () => {
    expect(clampPetScale(1)).toBe(1);
    expect(clampPetScale(0.7)).toBe(0.7);
  });

  it('越界收敛到上下限', () => {
    expect(clampPetScale(5)).toBe(PET_SCALE_MAX);
    expect(clampPetScale(0.1)).toBe(PET_SCALE_MIN);
  });

  it('脏值回落到 1（设置文件可能被手改坏）', () => {
    expect(clampPetScale(NaN)).toBe(1);
    expect(clampPetScale(0)).toBe(1);
    expect(clampPetScale(-3)).toBe(1);
    expect(clampPetScale(undefined as unknown as number)).toBe(1);
  });
});

describe('petTargetSize', () => {
  it('scale=1 是 PET_SIZE 正方形', () => {
    expect(petTargetSize(1)).toEqual({ width: PET_SIZE, height: PET_SIZE });
  });

  it('缩放后仍是正方形（宽高一致，否则桌宠会被拉变形）', () => {
    for (const s of [0.5, 0.7, 1, 1.33, 2]) {
      const { width, height } = petTargetSize(s);
      expect(width).toBe(height);
    }
  });

  it('串门模式向右拓宽成双人宽，高度不变', () => {
    const single = petTargetSize(1);
    const visit = petTargetSize(1, true);
    expect(visit.width).toBe(single.width * 2);
    expect(visit.height).toBe(single.height);
  });

  /**
   * 这条是这次 bug 的回归守卫：拖拽时窗口尺寸必须只由 (scale, visitMode) 决定，
   * 与「当前窗口有多大」无关。分数 DPI 下读回 bounds 再写回会累积舍入误差，
   * 表现为桌宠越拖越大。
   */
  it('同样入参恒等 —— 反复调用不漂移', () => {
    const first = petTargetSize(0.5);
    for (let i = 0; i < 50; i++) {
      expect(petTargetSize(0.5)).toEqual(first);
    }
  });

  it('脏 scale 也返回正方形而非 NaN 尺寸', () => {
    const { width, height } = petTargetSize(NaN);
    expect(width).toBe(PET_SIZE);
    expect(height).toBe(PET_SIZE);
  });
});
