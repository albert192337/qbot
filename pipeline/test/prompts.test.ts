import { describe, expect, it } from 'vitest';
import {
  ABSTRACT_ACTIONS,
  ACTIONS,
  EXPRESSION_ABSTRACT_ACTIONS,
  EXPRESSION_ACTIONS,
  FAITHFUL_ACTIONS,
  framePrompt,
  turnaroundPrompt,
  videoPrompt,
} from '../src/prompts.js';
import { ACTION_IDS, EXPRESSION_ACTION_IDS } from '../src/types.js';

describe('prompts', () => {
  it('三视图模板含三视角与白底约束', () => {
    const p = turnaroundPrompt();
    expect(p).toContain('正面、正侧面、正背面');
    expect(p).toContain('纯白色背景');
    expect(p).toContain('无文字，无水印');
  });

  it('chibi 风格三视图含二头身Q版约束与特征保留', () => {
    const p = turnaroundPrompt(undefined, 'humanoid', 'chibi');
    expect(p).toContain('二头身Q版chibi风格');
    expect(p).toContain('大头圆脸小身体');
    expect(p).toContain('被一眼认出是同一个角色');
    expect(p).toContain('正面、正侧面、正背面');
    expect(p).toContain('纯白色背景');
  });

  it('faithful 风格与缺省 style 输出一致（旧 job resume 兼容）', () => {
    expect(turnaroundPrompt()).toBe(turnaroundPrompt(undefined, 'humanoid', 'faithful'));
    expect(turnaroundPrompt()).not.toContain('二头身');
  });

  it('抽象档忽略 style（chibi 与 faithful 输出相同）', () => {
    expect(turnaroundPrompt(undefined, 'abstract', 'chibi')).toBe(
      turnaroundPrompt(undefined, 'abstract', 'faithful'),
    );
    expect(framePrompt('idle', undefined, 'abstract', 'faithful')).toBe(
      framePrompt('idle', undefined, 'abstract'),
    );
  });

  it('faithful 首帧去掉贴纸风尾巴，改为保持参考图画风与头身比', () => {
    for (const id of ACTION_IDS) {
      const p = framePrompt(id, undefined, 'humanoid', 'faithful');
      expect(p).not.toContain('贴纸插画风格');
      expect(p).toContain('完全保持参考图的画风与头身比不变');
      expect(p).toContain('画风、头身比等所有细节完全一致');
      // 防翻车排除与绿幕约束不受风格影响
      expect(p).toContain('纯色绿幕');
      expect(p).toContain('没有白色贴纸描边');
    }
  });

  it('chibi 与缺省 style 首帧维持贴纸风尾巴（旧 job 兼容）', () => {
    expect(framePrompt('idle', undefined, 'humanoid', 'chibi')).toBe(framePrompt('idle'));
    expect(framePrompt('idle')).toContain('粗描边贴纸插画风格');
  });

  it('faithful 动作文案不含耳朵/尾巴（写实角色会被凭空长出尾巴）', () => {
    for (const id of ACTION_IDS) {
      const text =
        FAITHFUL_ACTIONS[id].poseDesc +
        FAITHFUL_ACTIONS[id].motionDesc +
        framePrompt(id, undefined, 'humanoid', 'faithful') +
        videoPrompt(id, undefined, 'humanoid', 'faithful');
      for (const kw of ['耳朵', '尾巴', '耳尾']) {
        expect(text, `${id} faithful 不应包含「${kw}」`).not.toContain(kw);
      }
    }
  });

  it('faithful 首帧与视频排除阴影，chibi/缺省不受影响', () => {
    for (const id of ACTION_IDS) {
      expect(framePrompt(id, undefined, 'humanoid', 'faithful')).toContain('不投射任何阴影');
      expect(videoPrompt(id, undefined, 'humanoid', 'faithful')).toContain('不投射任何阴影');
    }
    expect(videoPrompt('idle')).not.toContain('不投射任何阴影');
    expect(videoPrompt('idle', undefined, 'humanoid', 'chibi')).toBe(videoPrompt('idle'));
    expect(videoPrompt('idle', undefined, 'abstract', 'faithful')).toBe(videoPrompt('idle', undefined, 'abstract'));
  });

  it('faithful 视频保留固定镜头/循环/时长约束', () => {
    for (const id of ACTION_IDS) {
      const v = videoPrompt(id, 'humanoid', 'faithful');
      expect(v).toContain('镜头完全固定不动');
      expect(v).toContain('丝滑流畅循环动画');
      expect(v).toContain('--duration 5');
    }
  });

  it('每个动作的首帧模板含绿幕与排除约束', () => {
    for (const id of ACTION_IDS) {
      const p = framePrompt(id);
      expect(p).toContain('纯色绿幕');
      expect(p).toContain('不出现其他人的手或身体部位');
      expect(p).toContain('保持发型、眼睛、服装、耳朵等所有细节完全一致');
    }
  });

  it('全档禁提尾巴：任何形态/风格/模板都不含「尾巴」', () => {
    const styles = [undefined, 'chibi', 'faithful'] as const;
    const forms = ['humanoid', 'abstract'] as const;
    for (const form of forms) {
      for (const style of styles) {
        expect(turnaroundPrompt(undefined, form, style)).not.toContain('尾巴');
        for (const id of ACTION_IDS) {
          expect(framePrompt(id, undefined, form, style), `frame ${form}/${style}/${id}`).not.toContain('尾巴');
          expect(videoPrompt(id, undefined, form, style), `video ${form}/${style}/${id}`).not.toContain('尾巴');
        }
      }
    }
  });

  it('drag 不含会引出手的措辞（"拎"）且显式排除手', () => {
    expect(ACTIONS.drag.poseDesc).not.toContain('拎');
    expect(ACTIONS.drag.poseDesc).toContain('没有绳索');
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
        videoPrompt(id, undefined, 'abstract');
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

  it('M 档：四个动作的 prompt 三变体齐全且文案含核心动作语义', () => {
    expect(EXPRESSION_ACTION_IDS).toEqual(['smug', 'point', 'turn_away', 'cheer']);
    for (const id of EXPRESSION_ACTION_IDS) {
      // 需要空手的动作必须逐项排除道具（spec §2：只写「空无一物」拦不住模型塞东西）。
      // turn_away 背身抱臂不适用此断言（spec 原文如此）
      if (id !== 'turn_away') {
        expect(EXPRESSION_ACTIONS[id].poseDesc).toContain('手中不持任何物体');
      }
      // motion 以「角色不位移」收尾（turn_away 的「左右不位移」也算合规变体）
      expect(EXPRESSION_ACTIONS[id].motionDesc).toMatch(/角色不位移|左右不位移/);
      // 抽象档存在且不空
      expect(EXPRESSION_ABSTRACT_ACTIONS[id].poseDesc.length).toBeGreaterThan(10);
    }
    // 关键语义抽查：坏笑/指出/背对/欢呼
    expect(EXPRESSION_ACTIONS.smug.poseDesc).toContain('坏笑');
    expect(EXPRESSION_ACTIONS.point.poseDesc).toContain('指出');
    expect(EXPRESSION_ACTIONS.turn_away.poseDesc).toContain('背对画面');
    expect(EXPRESSION_ACTIONS.cheer.poseDesc).toContain('双臂高高举起');
  });

  it('M 档抽象变体不含部位词（血泪坑 10 同款守卫）', () => {
    const bodyParts = ['双臂', '双手', '手臂', '食指', '耳朵', '头发', '肩膀', '双腿', '嘴巴', '眉毛'];
    for (const id of EXPRESSION_ACTION_IDS) {
      const text =
        EXPRESSION_ABSTRACT_ACTIONS[id].poseDesc + EXPRESSION_ABSTRACT_ACTIONS[id].motionDesc;
      for (const kw of bodyParts) {
        expect(text, `M 档抽象 ${id} 不应包含「${kw}」`).not.toContain(kw);
      }
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
    expect(videoPrompt('idle')).toBe(videoPrompt('idle', undefined, 'humanoid'));
    expect(turnaroundPrompt()).toBe(turnaroundPrompt(undefined, 'humanoid'));
  });

  // ── videoPrompt keep 子句 + persona 测试 ──────────────────
  it('videoPrompt 包含角色保持子句', () => {
    for (const id of ACTION_IDS) {
      expect(videoPrompt(id)).toContain('保持发型、眼睛、服装、耳朵等所有细节完全一致');
    }
  });

  it('videoPrompt 可注入 persona', () => {
    const p = videoPrompt('idle', undefined, 'humanoid', undefined, 'shy and timid');
    expect(p).toContain('角色人设：shy and timid');
  });

  it('faithful videoPrompt 不包含耳朵但保留头身比且排除阴影', () => {
    for (const id of ACTION_IDS) {
      const v = videoPrompt(id, undefined, 'humanoid', 'faithful');
      expect(v).toContain('画风、头身比等所有细节完全一致');
      expect(v).not.toContain('耳朵等所有细节');
      expect(v).toContain('不投射任何阴影');
    }
  });

  it('抽象 videoPrompt 禁止添加部位', () => {
    for (const id of ACTION_IDS) {
      const v = videoPrompt(id, undefined, 'abstract');
      expect(v).toContain('不要添加参考图中没有的部位');
      expect(v).toContain('形态、线条、颜色、画风等所有细节一致');
    }
  });
});

describe('prompt 全文覆盖', () => {
  it('framePrompt 全文覆盖完全取代模板', () => {
    const p = framePrompt('tea', undefined, 'humanoid', 'chibi', 'shy', undefined, '我自己写的首帧描述');
    expect(p).toBe('我自己写的首帧描述');
    expect(p).not.toContain('绿幕');
    expect(p).not.toContain('角色人设');
  });

  it('turnaroundPrompt 全文覆盖完全取代模板', () => {
    const p = turnaroundPrompt(undefined, 'humanoid', 'chibi', '我自己写的三视图描述');
    expect(p).toBe('我自己写的三视图描述');
  });

  it('空白覆盖视为未设置，回退模板', () => {
    const tpl = framePrompt('tea', undefined, 'humanoid', 'chibi');
    expect(framePrompt('tea', undefined, 'humanoid', 'chibi', undefined, undefined, '   ')).toBe(tpl);
    expect(framePrompt('tea', undefined, 'humanoid', 'chibi', undefined, undefined, undefined)).toBe(tpl);
  });

  it('videoPrompt 全文覆盖时自动补回缺失的 Seedance 参数', () => {
    const v = videoPrompt('tea', undefined, 'humanoid', 'chibi', undefined, undefined, '角色摇摆');
    expect(v).toContain('角色摇摆');
    expect(v).toMatch(/--resolution \S+/);
    expect(v).toMatch(/--duration \d+/);
    expect(v).toContain('--camerafixed true');
  });

  it('videoPrompt 全文覆盖已带参数时不重复追加、保留用户的值', () => {
    const v = videoPrompt('tea', undefined, 'humanoid', 'chibi', undefined, undefined,
      '角色摇摆 --resolution 720p --duration 5 --camerafixed false');
    expect(v.match(/--resolution/g)).toHaveLength(1);
    expect(v.match(/--duration/g)).toHaveLength(1);
    expect(v).toContain('--resolution 720p');
    expect(v).toContain('--camerafixed false');
  });

  it('回归：视频 duration 不得小于 5（1.5-pro 会 400）', () => {
    const v = videoPrompt('idle', undefined, 'humanoid', 'chibi', undefined, undefined, '随便写');
    const m = v.match(/--duration (\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(5);
  });
});

