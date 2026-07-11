/**
 * 三套 prompt 模板 + 6 动作文案常量。
 * 模板文本逐字取自 DESIGN.md §3.3（实测有效），不要随意改写措辞。
 * 纯函数模块，无 IO。
 */
import type { ActionId, ActionSpec } from './types.js';

/**
 * MVP 用固定通用描述填槽（spec §8 风险项：还原度不够时接 VLM 自动提取）。
 */
export interface CharacterDesc {
  /** 填入【角色描述】槽位 */
  summary: string;
  /** 填入【默认表情】槽位 */
  defaultExpression: string;
}

export const DEFAULT_CHARACTER_DESC: CharacterDesc = {
  summary:
    '保持参考图中角色的发型、眼睛、神态、耳朵尾巴等特征、服装、头身比、画风完全一致',
  defaultExpression: '自然平静的默认表情',
};

/**
 * 6 动作姿势/动作文案。
 * 每条都含防翻车显式排除（DESIGN.md §3.3 Prompt 经验）：
 * - 不描述"被拎住"之类会引出手的措辞，只描述姿势本身
 * - 睡觉显式排除床/枕头/被子（床是客户端垫的资产图层）
 */
export const ACTIONS: Record<ActionId, ActionSpec> = {
  idle: {
    poseDesc:
      '角色自然站立，双臂自然下垂，表情平静放松。没有手、没有其他任何人物或物体。',
    motionDesc:
      '角色站立原地，身体随呼吸轻微起伏，偶尔眨眼，耳朵和尾巴轻微自然摆动。动作幅度很小。',
    durationSec: 3,
  },
  drag: {
    poseDesc:
      '角色悬浮在半空中，身体微微前倾，双腿自然下垂放松，表情略带惊讶。没有手、没有绳索、没有其他任何人物或物体，角色周围完全空无一物。',
    motionDesc:
      '角色悬浮在半空，身体轻微摇晃，双腿自然晃动，尾巴摆动，表情略带惊讶地眨眼。角色不位移。',
    durationSec: 5,
  },
  sleep: {
    poseDesc:
      '角色蜷缩侧躺姿势闭眼熟睡，表情安详。画面中绝对没有床、没有枕头、没有被子，只有角色悬浮在纯绿背景上。没有手、没有其他任何人物或物体。',
    motionDesc:
      '角色闭眼熟睡，身体随呼吸缓慢起伏，耳朵偶尔轻颤。动作幅度很小，安静祥和。',
    durationSec: 3,
  },
  tea: {
    poseDesc:
      '角色坐姿，自己的双手捧着一只小茶杯放在胸前，表情惬意满足。画面中只有角色和茶杯，没有桌子、没有椅子、没有其他任何人物或物体。',
    motionDesc:
      '角色捧着茶杯小口喝茶，喝完满足地眯眼微笑，尾巴愉快地轻摆。角色不位移。',
    durationSec: 5,
  },
  talk_happy: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，表情开心，眼睛明亮，嘴巴微张像在愉快说话。没有手、没有其他任何人物或物体。',
    motionDesc:
      '角色朝画面右侧开心地说话，嘴巴一张一合，表情生动，偶尔点头，耳朵竖起，尾巴愉快摆动。角色不位移。',
    durationSec: 5,
  },
  talk_annoyed: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，表情不耐烦，眉头微皱，嘴角向下撇。没有手、没有其他任何人物或物体。',
    motionDesc:
      '角色朝画面右侧不耐烦地抱怨，嘴巴撇着动，偶尔翻白眼或扭头，耳朵向后压，尾巴烦躁地甩动。角色不位移。',
    durationSec: 5,
  },
};

/** 三视图 prompt（图生图，参考图=用户输入） */
export function turnaroundPrompt(desc: CharacterDesc = DEFAULT_CHARACTER_DESC): string {
  return (
    `角色三视图设定表：参考图中的角色，${desc.summary}。` +
    `画面从左到右水平排列三个完整站立全身视角：正面、正侧面、正背面，` +
    `三个视角的角色比例、发型、服装细节完全一致，双臂自然下垂，表情为${desc.defaultExpression}。` +
    `纯白色背景，无阴影，无文字，无水印`
  );
}

/** 绿幕首帧 prompt（图生图，参考图=选定三视图） */
export function framePrompt(
  action: ActionId,
  desc: CharacterDesc = DEFAULT_CHARACTER_DESC,
): string {
  return (
    `参考图中的角色，保持发型、眼睛、服装、耳尾等所有细节完全一致。` +
    `${ACTIONS[action].poseDesc}` +
    `画面中只有这一个角色，没有其他人物、没有手、没有家具、没有白色贴纸描边。` +
    `背景为纯色绿幕（纯正绿色，无渐变无阴影无纹理），角色边缘描线清晰，全身完整可见，` +
    `角色占画面高度约70%，粗描边贴纸插画风格，无文字无水印`
  );
}

/** 循环视频 prompt（i2v，首帧=尾帧），参数走 1.0 系列的 prompt 尾部约定 */
export function videoPrompt(action: ActionId): string {
  const spec = ACTIONS[action];
  return (
    `${spec.motionDesc}` +
    `镜头完全固定不动，静止镜头，角色不位移不走出画面，绿幕背景纯绿色保持不变，` +
    `画面中始终只有这一个角色，绝对不出现其他人物、手或物体。丝滑流畅循环动画。` +
    ` --resolution 480p --duration ${spec.durationSec} --camerafixed true`
  );
}
