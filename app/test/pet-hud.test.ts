import { describe, expect, it } from 'vitest';
import {
  formatPoints,
  isStaleProgress,
  shouldTweenPoints,
  spendLabel,
} from '../src/renderer/pet/hud-format';
import { canAffordBox, POINTS_PER_BOX } from '../src/shared/furniture';
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
