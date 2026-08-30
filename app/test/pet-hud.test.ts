import { describe, expect, it } from 'vitest';
import {
  boxDots,
  formatPoints,
  idleHintText,
  isStaleProgress,
  nextBoxCountdown,
  shouldTweenPoints,
  spendLabel,
} from '../src/renderer/pet/hud-format';
import {
  canAffordBox,
  clampMaxBoxes,
  DEFAULT_MAX_BOXES,
  IDLE_MS_PER_BOX,
  POINTS_PER_BOX,
  shouldShowChest,
} from '../src/shared/furniture';
import type { Progress } from '../src/shared/ipc-types';

// ── formatPoints ──────────────────────────────────────
describe('formatPoints', () => {
  it('正常值千位分隔（用 U+00A0 不换行空格）', () => {
    expect(formatPoints(12480)).toBe('12 480');
    expect(formatPoints(1000000)).toBe('1 000 000');
  });
  it('零和小数', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(42)).toBe('42');
    expect(formatPoints(999)).toBe('999');
    expect(formatPoints(1000)).toBe('1 000');
  });
  it('向下取整', () => {
    expect(formatPoints(12499.9)).toBe('12 499');
  });
  it('脏值回落到 "0"', () => {
    expect(formatPoints(NaN)).toBe('0');
    expect(formatPoints(Infinity)).toBe('0');
    expect(formatPoints(-1)).toBe('0');
  });
  it('千位分隔符确实是 U+00A0 不是 ASCII 空格', () => {
    const result = formatPoints(1000);
    expect(result).toContain(' ');
    expect(result).not.toContain(' '); // 不含普通空格
  });
});

// ── isStaleProgress ───────────────────────────────────
const mkProgress = (overrides: Partial<Progress>): Progress =>
  ({ points: 0, boxes: 0, idleMs: 0, boxesOpened: 0, crafted: 0, inventory: {}, ...overrides }) as Progress;

describe('isStaleProgress', () => {
  it('local 为 null 时放行（启动阶段不应丢首条广播）', () => {
    expect(isStaleProgress(null, mkProgress({ boxesOpened: 1 }))).toBe(false);
  });
  it('相等时放行', () => {
    const p = mkProgress({ boxesOpened: 5, crafted: 3 });
    expect(isStaleProgress(p, p)).toBe(false);
  });
  it('incoming 更新时放行', () => {
    const local = mkProgress({ boxesOpened: 3, crafted: 1 });
    const incoming = mkProgress({ boxesOpened: 5, crafted: 2 });
    expect(isStaleProgress(local, incoming)).toBe(false);
  });
  it('incoming 更旧时丢弃', () => {
    const local = mkProgress({ boxesOpened: 5, crafted: 3 });
    const incoming = mkProgress({ boxesOpened: 3, crafted: 2 });
    expect(isStaleProgress(local, incoming)).toBe(true);
  });
  it('boxesOpened 相同但 crafted 更旧 → 丢弃', () => {
    const local = mkProgress({ boxesOpened: 5, crafted: 3 });
    const incoming = mkProgress({ boxesOpened: 5, crafted: 1 });
    expect(isStaleProgress(local, incoming)).toBe(true);
  });
});

// ── shouldTweenPoints ─────────────────────────────────
describe('shouldTweenPoints', () => {
  it('差值 < 50 不 tween', () => {
    expect(shouldTweenPoints(100, 101)).toBe(false);
    expect(shouldTweenPoints(100, 149)).toBe(false);
  });
  it('差值 ≥ 50 走 tween', () => {
    expect(shouldTweenPoints(100, 150)).toBe(true);
    expect(shouldTweenPoints(1000, 500)).toBe(true);
  });
});

// ── spendLabel ────────────────────────────────────────
describe('spendLabel', () => {
  it('用 U+2212 真减号', () => {
    const label = spendLabel(500);
    expect(label).toBe('−500');
    expect(label.charCodeAt(0)).toBe(0x2212);
  });
});

// ── canAffordBox ──────────────────────────────────────
describe('canAffordBox', () => {
  it('有箱有点 → true', () => {
    expect(canAffordBox(POINTS_PER_BOX, 1)).toBe(true);
    expect(canAffordBox(9999, 5)).toBe(true);
  });
  it('点数不够 → false', () => {
    expect(canAffordBox(499, 1)).toBe(false);
  });
  it('箱子为 0 → false', () => {
    expect(canAffordBox(POINTS_PER_BOX, 0)).toBe(false);
  });
  it('都没够 → false', () => {
    expect(canAffordBox(0, 0)).toBe(false);
  });
});

// ── shouldShowChest ───────────────────────────────────
describe('shouldShowChest', () => {
  it('有箱子就显示，不管点数够不够', () => {
    expect(shouldShowChest(1)).toBe(true);
    expect(shouldShowChest(3)).toBe(true);
  });
  it('没箱子不显示', () => {
    expect(shouldShowChest(0)).toBe(false);
  });
  it('脏值当没有', () => {
    expect(shouldShowChest(-1)).toBe(false);
    expect(shouldShowChest(0.5)).toBe(false);
  });
});

// ── clampMaxBoxes ─────────────────────────────────────
describe('clampMaxBoxes', () => {
  it('正常值原样返回', () => {
    expect(clampMaxBoxes(3)).toBe(3);
    expect(clampMaxBoxes(1)).toBe(1);
    expect(clampMaxBoxes(10)).toBe(10);
  });
  it('undefined / 脏值回落默认', () => {
    expect(clampMaxBoxes(undefined)).toBe(DEFAULT_MAX_BOXES);
    expect(clampMaxBoxes(NaN)).toBe(DEFAULT_MAX_BOXES);
    expect(clampMaxBoxes('abc')).toBe(DEFAULT_MAX_BOXES);
  });
  it('下界夹到 1（0 个上限会让挂机永远白挂）', () => {
    expect(clampMaxBoxes(0)).toBe(1);
    expect(clampMaxBoxes(-5)).toBe(1);
  });
  it('上界夹到 99', () => {
    expect(clampMaxBoxes(1000)).toBe(99);
  });
  it('小数向下取整', () => {
    expect(clampMaxBoxes(3.9)).toBe(3);
  });
});

// ── nextBoxCountdown ──────────────────────────────────
describe('nextBoxCountdown', () => {
  const MAX = 3;
  it('刚开始挂机 → 满时长', () => {
    expect(nextBoxCountdown(0, 0, IDLE_MS_PER_BOX, MAX)).toBe('15:00');
  });
  it('挂了一半', () => {
    expect(nextBoxCountdown(IDLE_MS_PER_BOX / 2, 0, IDLE_MS_PER_BOX, MAX)).toBe('7:30');
  });
  it('秒数补零', () => {
    // 剩 5:04
    expect(nextBoxCountdown(IDLE_MS_PER_BOX - 304_000, 0, IDLE_MS_PER_BOX, MAX)).toBe('5:04');
  });
  it('快满时不为负', () => {
    expect(nextBoxCountdown(IDLE_MS_PER_BOX, 0, IDLE_MS_PER_BOX, MAX)).toBe('0:00');
    expect(nextBoxCountdown(IDLE_MS_PER_BOX + 9999, 0, IDLE_MS_PER_BOX, MAX)).toBe('0:00');
  });
  it('箱子已满 → null（倒计时会冻住，不该显示）', () => {
    expect(nextBoxCountdown(0, MAX, IDLE_MS_PER_BOX, MAX)).toBeNull();
    expect(nextBoxCountdown(0, MAX + 1, IDLE_MS_PER_BOX, MAX)).toBeNull();
  });
  it('脏 idleMs 当 0', () => {
    expect(nextBoxCountdown(-5, 0, IDLE_MS_PER_BOX, MAX)).toBe('15:00');
  });
});

// ── idleHintText ──────────────────────────────────────
describe('idleHintText', () => {
  it('未满报倒计时', () => {
    expect(idleHintText(0, 1, IDLE_MS_PER_BOX, 3)).toBe('15:00');
  });
  it('满了报满', () => {
    expect(idleHintText(0, 3, IDLE_MS_PER_BOX, 3)).toBe('宝箱已满 3/3');
  });
});

// ── boxDots ───────────────────────────────────────────
describe('boxDots', () => {
  it('单个箱子不画点（图标本身已表达）', () => {
    expect(boxDots(1, 3)).toEqual([]);
  });
  it('没箱子不画点', () => {
    expect(boxDots(0, 3)).toEqual([]);
  });
  it('2/3 → 长度为上限，前两个实心', () => {
    expect(boxDots(2, 3)).toEqual([true, true, false]);
  });
  it('满仓全实心', () => {
    expect(boxDots(3, 3)).toEqual([true, true, true]);
  });
  it('上限 5 时长度为 5', () => {
    expect(boxDots(2, 5)).toEqual([true, true, false, false, false]);
  });
  it('boxes 超过上限时夹住，不溢出', () => {
    expect(boxDots(9, 3)).toEqual([true, true, true]);
  });
  it('脏值不炸', () => {
    expect(boxDots(-1, 3)).toEqual([]);
    expect(boxDots(2.7, 3)).toEqual([true, true, false]);
  });
});
