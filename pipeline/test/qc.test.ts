import { describe, expect, it } from 'vitest';
import {
  classifyDrift,
  hexToRgb,
  isGreen,
  rgbToHsv,
  selectKeyColors,
  DRIFT_SINGLE_KEY_MAX,
  DRIFT_DOUBLE_KEY_MAX,
  KEY_MAX_COUNT,
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

  it('selectKeyColors：相近色聚成一簇，梯度色保留多 key', () => {
    // 平涂贴纸风：8 点几乎同色 → 1 个 key
    expect(
      selectKeyColors(['3bfa2c', '3cfa2d', '3bf82c', '3efa2e', '3bfa2c', '3cf92b']),
    ).toEqual(['3bfa2c']);
    // 写实影棚绿幕（实测样本）：暗角 → 亮中心，聚成多簇
    const keys = selectKeyColors([
      '034b25', '075f36', '05744a', '0e815c', '085e32', '15805e', '034b27', '137b56',
    ]);
    expect(keys.length).toBeGreaterThanOrEqual(3);
    expect(keys.length).toBeLessThanOrEqual(KEY_MAX_COUNT);
    expect(keys[0]).toBe('034b25');
  });

  it('selectKeyColors：过滤非绿样本（采样点落在角色上不会当 key）', () => {
    expect(selectKeyColors(['1a1a1a', 'f5e6d0', '3bfa2c'])).toEqual(['3bfa2c']);
    expect(selectKeyColors(['1a1a1a', 'ffffff'])).toEqual([]);
  });
});
