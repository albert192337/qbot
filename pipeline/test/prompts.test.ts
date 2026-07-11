import { describe, expect, it } from 'vitest';
import {
  ABSTRACT_ACTIONS,
  ACTIONS,
  framePrompt,
  turnaroundPrompt,
  videoPrompt,
} from '../src/prompts.js';
import { ACTION_IDS } from '../src/types.js';

describe('prompts', () => {
  it('三视图模板含三视角与白底约束', () => {
    const p = turnaroundPrompt();
    expect(p).toContain('正面、正侧面、正背面');
    expect(p).toContain('纯白色背景');
    expect(p).toContain('无文字，无水印');
  });

  it('每个动作的首帧模板含绿幕与排除约束', () => {
    for (const id of ACTION_IDS) {
      const p = framePrompt(id);
      expect(p).toContain('纯色绿幕');
      expect(p).toContain('没有手');
      expect(p).toContain('保持发型、眼睛、服装、耳尾等所有细节完全一致');
    }
  });

  it('drag 不含会引出手的措辞（"拎"）且显式排除手', () => {
    expect(ACTIONS.drag.poseDesc).not.toContain('拎');
    expect(ACTIONS.drag.poseDesc).toContain('没有手');
    expect(ACTIONS.drag.motionDesc).toContain('悬浮');
  });

  it('sleep 显式排除床/枕头/被子', () => {
    for (const kw of ['没有床', '没有枕头', '没有被子']) {
      expect(ACTIONS.sleep.poseDesc).toContain(kw);
    }
  });

  it('视频模板尾部参数正确（seedance 1.5-pro 最短 5s，全部 5s）', () => {
    expect(videoPrompt('idle')).toContain('--resolution 480p --duration 5 --camerafixed true');
    expect(videoPrompt('sleep')).toContain('--duration 5');
    expect(videoPrompt('tea')).toContain('--duration 5');
    expect(videoPrompt('drag')).toContain('--duration 5');
  });

  it('视频模板含固定镜头与循环约束', () => {
    for (const id of ACTION_IDS) {
      const p = videoPrompt(id);
      expect(p).toContain('镜头完全固定不动');
      expect(p).toContain('丝滑流畅循环动画');
    }
  });

  it('抽象档不含任何部位假设（双臂/双腿/坐姿/发型/服装/耳/尾）', () => {
    const bodyParts = ['双臂', '双腿', '坐姿', '双手', '发型', '服装', '耳朵', '尾巴', '嘴巴', '眉头'];
    for (const id of ACTION_IDS) {
      const text =
        ABSTRACT_ACTIONS[id].poseDesc +
        ABSTRACT_ACTIONS[id].motionDesc +
        framePrompt(id, undefined, 'abstract') +
        videoPrompt(id, 'abstract');
      for (const kw of bodyParts) {
        expect(text, `${id} 不应包含「${kw}」`).not.toContain(kw);
      }
    }
    const t = turnaroundPrompt(undefined, 'abstract');
    expect(t).toContain('不要拟人化');
    // 「服装」允许出现在"不要添加…"的排除句里，只查会引导画出来的正面措辞
    for (const kw of ['站立', '双臂', '发型']) {
      expect(t).not.toContain(kw);
    }
  });

  it('抽象档保留全部防翻车排除与绿幕/循环约束', () => {
    expect(ABSTRACT_ACTIONS.sleep.poseDesc).toContain('没有床');
    expect(ABSTRACT_ACTIONS.drag.poseDesc).toContain('没有绳索');
    for (const id of ACTION_IDS) {
      expect(framePrompt(id, undefined, 'abstract')).toContain('纯色绿幕');
      const v = videoPrompt(id, 'abstract');
      expect(v).toContain('镜头完全固定不动');
      expect(v).toContain('丝滑流畅循环动画');
      expect(v).toContain('--duration 5');
    }
  });

  it('缺省 form 与显式 humanoid 输出一致（向后兼容）', () => {
    expect(framePrompt('idle')).toBe(framePrompt('idle', undefined, 'humanoid'));
    expect(videoPrompt('idle')).toBe(videoPrompt('idle', 'humanoid'));
    expect(turnaroundPrompt()).toBe(turnaroundPrompt(undefined, 'humanoid'));
  });
});
