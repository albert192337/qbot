import { describe, expect, it } from 'vitest';
import {
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

  it('视频模板尾部参数正确（idle/sleep 3s，其余 5s）', () => {
    expect(videoPrompt('idle')).toContain('--resolution 480p --duration 3 --camerafixed true');
    expect(videoPrompt('sleep')).toContain('--duration 3');
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
});
