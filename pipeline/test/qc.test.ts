import { describe, expect, it } from 'vitest';
import {
  classifyDrift,
  hexToRgb,
  isGreen,
  rgbToHsv,
  selectChromaKey,
  DRIFT_SINGLE_KEY_MAX,
  DRIFT_DOUBLE_KEY_MAX,
} from '../src/qc.js';

describe('qc 纯逻辑', () => {
  it('rgbToHsv 基本正确', () => {
    expect(rgbToHsv(0, 255, 0)[0]).toBe(120); // 纯绿色相
    expect(rgbToHsv(255, 255, 255)[1]).toBe(0); // 白色饱和度 0
    expect(rgbToHsv(0, 0, 0)[2]).toBe(0); // 黑色明度 0
  });

  it('isGreen 判定纯绿/暗绿通过，白/品红/黑不通过', () => {
    expect(isGreen('00ff00')).toBe(true);
    expect(isGreen('3bfa2c')).toBe(true);
    expect(isGreen('2a8a1e')).toBe(true); // 压暗的橄榄绿仍在绿区间
    expect(isGreen('ffffff')).toBe(false);
    expect(isGreen('ff00ff')).toBe(false);
    expect(isGreen('000000')).toBe(false);
  });

  it('classifyDrift 分档：≤10 单 key', () => {
    const r = classifyDrift(['3bfa2c', '3ef82e', '3cfa2d']);
    expect(r.maxDrift).toBeLessThanOrEqual(DRIFT_SINGLE_KEY_MAX);
    expect(r.needDoubleKey).toBe(false);
    expect(r.fail).toBe(false);
    expect(r.keys).toEqual(['3bfa2c']);
  });

  it('classifyDrift 分档：(10,25] 双 key（首尾两色）', () => {
    const r = classifyDrift(['3bfa2c', '3bf02c', '3be82c']); // fa→e8 = 18
    expect(r.maxDrift).toBeGreaterThan(DRIFT_SINGLE_KEY_MAX);
    expect(r.maxDrift).toBeLessThanOrEqual(DRIFT_DOUBLE_KEY_MAX);
    expect(r.needDoubleKey).toBe(true);
    expect(r.fail).toBe(false);
    expect(r.keys).toEqual(['3bfa2c', '3be82c']);
  });

  it('classifyDrift 分档：>25 判废（mini 式全局压暗）', () => {
    const r = classifyDrift(['3bfa2c', '2a8a1e']); // 亮绿→橄榄绿
    expect(r.fail).toBe(true);
  });

  it('hexToRgb 解析正确', () => {
    expect(hexToRgb('3bfa2c')).toEqual([0x3b, 0xfa, 0x2c]);
  });

  it('selectChromaKey：选最饱和最亮的绿（暗角/中间调不入选）', () => {
    // 写实影棚绿幕实测样本：暗角 034b25 → 亮部，应选 s×v 最高的亮绿
    expect(
      selectChromaKey(['034b25', '075f36', '05744a', '0e815c', '085e32', '17845f']),
    ).toBe('0e815c');
    // 平涂贴纸风：全部同色，选谁都一样
    expect(selectChromaKey(['3bfa2c', '3cfa2d'])).toBe('3bfa2c');
  });

  it('selectChromaKey：过滤非绿样本（采样点落在角色上不会当 key），全非绿返回 null', () => {
    expect(selectChromaKey(['1a1a1a', 'f5e6d0', '3bfa2c'])).toBe('3bfa2c');
    expect(selectChromaKey(['1a1a1a', 'ffffff'])).toBeNull();
  });
});
