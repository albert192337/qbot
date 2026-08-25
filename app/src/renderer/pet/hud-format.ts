/**
 * HUD 纯逻辑 —— 零 DOM、零 Electron 依赖，可单测。
 * 仿 state-machine.ts / roam.ts 的约定：renderer 模块里凡可抽逻辑的都落这里。
 */
import type { Progress } from '../../shared/ipc-types';

/**
 * 点数格式化：每 3 位插 U+00A0 不换行空格。
 * 用   而非 ASCII 空格：药丸是 flex 单行，窄窗 + 七位数会断行撑成两行。
 * 向下取整；负数 / NaN / Infinity → "0"（同 sanitizeProgress 的宽容策略）。
 */
export function formatPoints(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  return Math.floor(n)
    .toLocaleString('en-US')
    .replace(/,/g, ' ');
}

/**
 * 进度回弹门控：incoming 是否比 local 更新。
 * boxesOpened / crafted 是单调递增计数器（ipc-types.ts），拿来当版本号。
 * local 为 null 时返回 false（启动阶段尚无本地进度，不该丢弃首条广播）。
 */
export function isStaleProgress(
  local: Progress | null,
  incoming: Progress,
): boolean {
  if (!local) return false;
  return (
    incoming.boxesOpened < local.boxesOpened ||
    incoming.crafted < local.crafted
  );
}

/**
 * 点数变化是否值得走 tween 动画（差值 ≥ 50）。
 * 键盘 +1 直接赋值，开箱 −500 走 400ms tween。
 */
export function shouldTweenPoints(prev: number, next: number): boolean {
  return Math.abs(next - prev) >= 50;
}

/** 开箱扣费标签：U+2212 真减号，不是 hyphen */
export function spendLabel(n: number): string {
  return `−${n}`;
}
