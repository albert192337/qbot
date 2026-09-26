import { personaPrompt } from './persona-prompt.js';
import type { ActionId, ActionSpec } from './types.js';
import { ABSTRACT_ACTIONS } from './prompts.js';

/** Imported artwork has no implied anatomy or target illustration style. */
export const ORIGINAL_IDENTITY = '完全保留参考角色的原画风、线条粗细、颜色、五官、轮廓、身体结构和各部位比例。只使用原图已有部位，不新增或重新设计部位，不强制直立或变成人形，不拉伸变形。';
const ORIGINAL_COLOR = '角色自身的原始填色保持不变，原图白色保持纯白，不染灰、黄或绿色，不增加立体明暗、环境光染色或纸张纹理。';
const poses: Record<ActionId, string> = {
  perch: ABSTRACT_ACTIONS.perch.poseDesc,
  writing: ABSTRACT_ACTIONS.writing.poseDesc,
  idle: '保持参考图中的原有姿态，自然放松。',
  drag: '保持参考图的身体姿态和结构，整体悬浮，轻微倾斜。没有绳索或外来物体。',
  sleep: '沿用原有身体结构，呈现安静休息的姿态；已有眼睛可以闭合。不添加床或枕头。',
  tea: '保持原有姿态，呈现放松惬意的神态，不添加道具。',
  talk_happy: '保持原有姿态，利用已有表情特征表达开心。',
  talk_annoyed: '保持原有姿态，利用已有表情特征表达不高兴。',
  wave: '保持原有姿态，以轻微整体倾斜表达友好的招呼。',
  stretch: '保持原有身体结构，以轻微整体倾斜表现舒缓放松，不伸长任何部位。',
  perch_sit: '沿用参考角色可自然完成的承托姿态，下缘对齐想象中的水平支撑线，不强制坐成人形，不画支撑物。',
  perch_lie: '沿用原有结构呈放松趴伏姿态，下缘对齐想象中的水平支撑线，不画支撑物。',
};
const motions: Record<ActionId, string> = {
  perch: ABSTRACT_ACTIONS.perch.motionDesc,
  writing: ABSTRACT_ACTIONS.writing.motionDesc,
  idle: '保持原有姿态，轻微呼吸起伏；已有眼睛偶尔眨动。',
  drag: '保持原有身体姿态，整体缓慢小幅摇晃；不单独驱动或伸长肢体。',
  sleep: '保持休息姿态，轻微缓慢呼吸。',
  tea: '保持原姿态，轻微呼吸和放松的表情变化。',
  talk_happy: '只利用已有表情特征作小幅开心变化，身体轻微起伏。',
  talk_annoyed: '只利用已有表情特征作小幅不高兴变化，整体微微倾斜。',
  wave: '整体轻微倾斜两次表达招呼，再回到原姿态。',
  stretch: '整体缓慢小幅倾斜再放松回正，保持轮廓和所有部位长度不变。',
  perch_sit: '保持承托位置和原姿态，轻微呼吸，不站起或滑动。',
  perch_lie: '保持趴伏姿态和承托位置，轻微呼吸，不站起或滑动。',
};
export function originalActionSpec(action: ActionId): ActionSpec {
  return { poseDesc: poses[action], motionDesc: motions[action], durationSec: 5 };
}
export function originalFramePrompt(pose: string, persona?: string): string {
  return ORIGINAL_IDENTITY + ORIGINAL_COLOR + pose + personaPrompt(persona) +
    '只画一个完整角色，保留原有线条，不添加贴纸描边、文字、水印、其他人物或阴影。背景为同一绿色色值均匀铺满的纯色绿幕，无渐变无纹理。角色全身完整可见，占画面高度约70%。';
}
export function originalVideoPrompt(motion: string, duration = 5, persona?: string): string {
  return ORIGINAL_IDENTITY + ORIGINAL_COLOR + motion + personaPrompt(persona) + '角色各帧及首尾的亮度、色温和填色一致，不随动作明暗变化。动作幅度小，镜头固定，角色不位移。首尾保持同一姿态，各部位大小稳定，循环衔接自然。背景始终是同一均匀绿色，无阴影、闪烁或新增物体。' +
    ` --resolution 480p --duration ${duration} --camerafixed true`;
}
