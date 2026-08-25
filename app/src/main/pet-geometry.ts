/**
 * 桌宠窗几何：纯计算，零 Electron 依赖（可单测）。
 *
 * 窗口即画布——桌宠的显示大小就是窗口大小，所以「窗口该多大」必须有一个
 * 与当前实际 bounds 无关的**权威值**。拖拽时重申这个权威值，而不是读回
 * 当前尺寸再写回去（见 windows.ts 的 moveFixedSize 注释：读回会累积舍入误差）。
 */

/** 桌宠窗基准边长（DIP），scale=1 时的正方形画布 */
export const PET_SIZE = 360;

export const PET_SCALE_MIN = 0.5;
export const PET_SCALE_MAX = 2;

export function clampPetScale(scale: number): number {
  // NaN / 0 / undefined 一律回落到 1（设置文件可能被手改坏）
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(PET_SCALE_MAX, Math.max(PET_SCALE_MIN, scale));
}

/**
 * 桌宠窗的权威尺寸。串门模式向右拓宽成双人宽，高度不变。
 */
export function petTargetSize(
  scale: number,
  visitMode = false,
): { width: number; height: number } {
  const size = Math.round(PET_SIZE * clampPetScale(scale));
  return { width: visitMode ? size * 2 : size, height: size };
}
