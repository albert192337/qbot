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

/**
 * 距下一个箱子的倒计时，mm:ss。
 * 箱子已满上限时挂机不再产出 → 返回 null，调用方改文案（倒计时会一直冻在同一个值，
 * 显示出来像卡住了）。
 */
export function nextBoxCountdown(
  idleMs: number,
  boxes: number,
  perBoxMs: number,
  maxBoxes: number,
): string | null {
  if (boxes >= maxBoxes) return null;
  const left = Math.max(0, perBoxMs - Math.max(0, idleMs));
  const total = Math.ceil(left / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/** 点数区气泡文案：能倒计时就报时间，箱子满了就说满了 */
export function idleHintText(
  idleMs: number,
  boxes: number,
  perBoxMs: number,
  maxBoxes: number,
): string {
  return nextBoxCountdown(idleMs, boxes, perBoxMs, maxBoxes) ?? `宝箱已满 ${boxes}/${maxBoxes}`;
}

/**
 * 宝箱下方的存量圆点（仿掌机图标的档位点）。
 * 长度 = 上限，前 boxes 个实心（未开），其余空心（已开掉的位）。
 *
 * 只有 1 个箱子时返回空数组：单箱画一个点是噪声，图标本身已经表达了「有一个」。
 * 全开完 → boxes 归 0 → 空数组 → 整条消失。
 */
export function boxDots(boxes: number, maxBoxes: number): boolean[] {
  const max = Math.max(0, Math.floor(maxBoxes));
  const have = Math.max(0, Math.min(Math.floor(boxes), max));
  if (have <= 1) return [];
  return Array.from({ length: max }, (_, i) => i < have);
}
