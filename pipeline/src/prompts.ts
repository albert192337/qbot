/**
 * 三套 prompt 模板 + 默认动作与可选预设动作的文案常量。
 * 模板文本逐字取自 DESIGN.md §3.3（实测有效），不要随意改写措辞。
 * 纯函数模块，无 IO。
 */
import type {
  ActionId,
  ActionSpec,
  CharacterForm,
  CharacterStyle,
  ExpressionActionId,
} from './types.js';

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
    '保持参考图中角色的发型、眼睛、神态、耳朵等特征、服装、头身比、画风完全一致',
  defaultExpression: '自然平静的默认表情',
};

/** 动作只改变姿势，不重新设计角色的解剖结构；抽象形态不注入部位假设。 */
const PROPORTION_LOCK =
  '严格沿用参考图的头身比、躯干长度、手臂与腿的长度和粗细、手掌与脚的大小。' +
  '动作通过关节转动完成，不拉伸肢体，不放大手脚，不改变原有结构或增加部位。' +
  'Q版参考保持原有短小圆润的四肢和简化手脚，不变成成人比例。';

/**
 * 默认动作姿势/动作文案。
 * 每条都含防翻车显式排除（DESIGN.md §3.3 Prompt 经验）：
 * - 不描述"被拎住"之类会引出手的措辞，只描述姿势本身
 * - 睡觉显式排除床/枕头/被子（床是客户端垫的资产图层）
 * - 全档禁提尾巴：不管角色本身有没有尾巴，命令式的「尾巴摆动」都会让模型
 *   凭空长出一条（写实喝茶动作实测长出猫尾巴）；通用动作也不驱动耳朵，避免给人形角色套用兽耳运动
 */
export const ACTIONS: Record<ActionId, ActionSpec> = {
  perch_sit: {
    poseDesc: '角色坐在想象中的水平窗沿上，臀部为稳定支点，上身直立放松，小腿自然垂在支点下方。只画角色，不画窗口、椅子、桌面或任何支撑物，四肢比例严格保持参考图。',
    motionDesc: '保持坐姿与臀部支点不动，轻轻眨眼和呼吸，小腿小幅晃动，首尾姿势一致，可无缝循环。角色不位移，不站起。',
    durationSec: 5,
  },
  perch_lie: {
    poseDesc: '角色横向趴在想象中的水平窗沿上，腹部和前臂处于同一稳定承托水平线，侧脸朝观众，姿态惬意。只画角色，不画窗口、床、桌面、枕头或任何支撑物，完整身体不出画。',
    motionDesc: '保持横向趴姿与腹部承托位置不动，轻轻呼吸、眨眼，首尾姿势一致，可无缝循环。角色不位移，不站起。',
    durationSec: 5,
  },
  idle: {
    poseDesc:
      '角色自然站立，双臂自然下垂，表情平静放松。画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色站立原地，身体随呼吸轻微起伏，偶尔眨眼。动作幅度很小。',
    durationSec: 5, // seedance 1.5-pro 最短 5s（3 会 400）
  },
  drag: {
    poseDesc:
      '角色悬浮在半空中，身体微微前倾，双腿保持参考图的原有长度，膝部微屈放松，表情略带惊讶。没有绳索、没有其他任何人物或物体，角色周围完全空无一物。',
    motionDesc:
      '角色悬浮在半空，身体轻微摇晃，双腿以髋部为轴小幅摆动，腿长不变，表情略带惊讶地眨眼。角色不位移。',
    durationSec: 5,
  },
  sleep: {
    poseDesc:
      '角色蜷缩侧躺姿势闭眼熟睡，表情安详。画面中绝对没有床、没有枕头、没有被子，只有角色悬浮在纯绿背景上。不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色闭眼熟睡，身体随呼吸缓慢起伏。动作幅度很小，安静祥和。',
    durationSec: 5, // seedance 1.5-pro 最短 5s
  },
  tea: {
    poseDesc:
      '角色坐姿，自己的双手捧着一只小茶杯放在胸前，表情惬意满足。画面中只有角色和茶杯，没有桌子、没有椅子、没有其他任何人物或物体。',
    motionDesc:
      '角色捧着茶杯小口喝茶，喝完满足地眯眼微笑。角色不位移。',
    durationSec: 5,
  },
  talk_happy: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，表情开心，眼睛明亮，嘴巴微张像在愉快说话。角色自身的手和双臂保持自然可见，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色朝画面右侧开心地说话，嘴巴一张一合，表情生动，偶尔点头。角色不位移。',
    durationSec: 5,
  },
  talk_annoyed: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，表情不耐烦，眉头微皱，嘴角向下撇。角色自身的手和双臂保持自然可见，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色朝画面右侧不耐烦地抱怨，嘴巴撇着动，偶尔翻白眼或扭头。角色不位移。',
    durationSec: 5,
  },
  wave: {
    poseDesc:
      '角色正面朝向画面，一只手自然抬到肩膀附近准备挥手，另一只手自然下垂，表情友好。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色面带微笑，抬起的手左右轻轻挥动两次，身体有轻微自然起伏。角色不位移。',
    durationSec: 5,
  },
  stretch: {
    poseDesc:
      '角色正面站立，双臂自然向上伸展，肩部轻轻抬起，躯干长度不变，表情放松。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色慢慢向上伸展身体和双臂，短暂停留后放松回到自然姿势。角色不位移。',
    durationSec: 5,
  },
};

/**
 * 抽象档动作文案：适配线条小狗、简笔涂鸦、几何形等非人形角色。
 * 铁律：绝不提及双臂/双腿/坐姿/发型/服装/耳尾等部位假设——模型会顺着描述凭空长出这些部位；
 * 一律用"整体""姿态""轮廓"级别的措辞，防翻车排除项与人形档保持一致。
 */
export const ABSTRACT_ACTIONS: Record<ActionId, ActionSpec> = {
  perch_sit: {
    poseDesc: '保持参考图的原本结构，整体收拢，重心稳定停靠在想象中的水平边沿上，轮廓轻松自然。不增加任何部位，不画边沿、窗口或任何支撑物。',
    motionDesc: '整体保持稳定停靠姿态，仅轻微起伏和晃动，支点不移动，首尾一致，可循环。', durationSec: 5,
  },
  perch_lie: {
    poseDesc: '保持参考图的原本结构，整体放松横向伏在想象中的水平边沿上。不增加任何部位，不画边沿、窗口或任何支撑物，完整轮廓不出画。',
    motionDesc: '整体保持横向伏着的放松姿态，轮廓轻微起伏，承托位置不移动，首尾一致，可循环。', durationSec: 5,
  },
  idle: {
    poseDesc: '角色保持参考图中原本的自然姿态，安静放松。没有其他任何人物或物体。',
    motionDesc:
      '角色停在原地，整体随呼吸轻微起伏，轮廓微微颤动，偶尔小幅晃动。动作幅度很小。',
    durationSec: 5,
  },
  drag: {
    poseDesc:
      '角色悬浮在半空中，整体微微倾斜，显得轻盈。没有绳索、没有其他任何人物或物体，角色周围完全空无一物。',
    motionDesc: '角色悬浮在半空，整体轻轻摇晃摆动，像被微风吹动。角色不位移。',
    durationSec: 5,
  },
  sleep: {
    poseDesc:
      '角色蜷缩成一团安睡，姿态安详。画面中绝对没有床、没有枕头、没有被子，只有角色悬浮在纯绿背景上。没有其他任何人物或物体。',
    motionDesc: '角色安睡，整体随呼吸缓慢起伏。动作幅度很小，安静祥和。',
    durationSec: 5,
  },
  tea: {
    poseDesc:
      '角色身前放着一只小茶杯，角色凑向茶杯，姿态惬意。画面中只有角色和茶杯，没有桌子、没有椅子、没有其他任何人物或物体。',
    motionDesc: '角色凑近茶杯小口喝茶，随后满足地轻轻晃动。角色不位移。',
    durationSec: 5,
  },
  talk_happy: {
    poseDesc: '角色朝向画面右侧，整体姿态欢快，像在愉快地表达。没有其他任何人物或物体。',
    motionDesc:
      '角色朝画面右侧欢快地表达，整体节奏轻快地晃动点动，姿态生动。角色不位移。',
    durationSec: 5,
  },
  talk_annoyed: {
    poseDesc: '角色朝向画面右侧，整体姿态显得不耐烦。没有其他任何人物或物体。',
    motionDesc:
      '角色朝画面右侧不耐烦地表达，整体急促地小幅晃动扭动，偶尔别开。角色不位移。',
    durationSec: 5,
  },
  wave: {
    poseDesc: '角色朝向画面，整体向一侧有节奏地轻轻摆动，姿态友好。没有其他任何人物或物体。',
    motionDesc: '角色整体向一侧轻摆两次，像在主动打招呼，随后回到自然姿态。角色不位移。',
    durationSec: 5,
  },
  stretch: {
    poseDesc: '角色保持原本形态，整体轻轻上扬，姿态放松。没有其他任何人物或物体。',
    motionDesc: '角色整体缓慢向上舒展，短暂停留后柔和地恢复原本轮廓。角色不位移。',
    durationSec: 5,
  },
};

/**
 * 高保真档动作文案：姿势与 ACTIONS 相同，运动描述连耳朵也不提——
 * 高保真多为真人/写实角色，任何部位命令都可能凭空长出该部位，
 * 一律换成头发/衣角级别的自然运动（尾巴已全档禁提，见 ACTIONS 注释）。
 */
export const FAITHFUL_ACTIONS: Record<ActionId, ActionSpec> = {
  perch_sit: ACTIONS.perch_sit,
  perch_lie: ACTIONS.perch_lie,
  idle: {
    poseDesc: ACTIONS.idle.poseDesc,
    motionDesc:
      '角色站立原地，身体随呼吸轻微起伏，偶尔眨眼，头发轻微自然飘动。动作幅度很小。',
    durationSec: 5,
  },
  drag: {
    poseDesc: ACTIONS.drag.poseDesc,
    motionDesc:
      '角色悬浮在半空，身体轻微摇晃，双腿以髋部为轴小幅摆动，腿长不变，头发轻轻飘动，表情略带惊讶地眨眼。角色不位移。',
    durationSec: 5,
  },
  sleep: {
    poseDesc: ACTIONS.sleep.poseDesc,
    motionDesc: '角色闭眼熟睡，身体随呼吸缓慢起伏。动作幅度很小，安静祥和。',
    durationSec: 5,
  },
  tea: {
    poseDesc: ACTIONS.tea.poseDesc,
    motionDesc: '角色捧着茶杯小口喝茶，喝完满足地眯眼微笑。角色不位移。',
    durationSec: 5,
  },
  talk_happy: {
    poseDesc: ACTIONS.talk_happy.poseDesc,
    motionDesc:
      '角色朝画面右侧开心地说话，嘴巴一张一合，表情生动，偶尔点头，头发随动作轻轻晃动。角色不位移。',
    durationSec: 5,
  },
  talk_annoyed: {
    poseDesc: ACTIONS.talk_annoyed.poseDesc,
    motionDesc:
      '角色朝画面右侧不耐烦地抱怨，嘴巴撇着动，偶尔翻白眼或扭头。角色不位移。',
    durationSec: 5,
  },
  wave: {
    poseDesc: ACTIONS.wave.poseDesc,
    motionDesc:
      '角色面带微笑，抬起的手左右轻轻挥动两次，身体有轻微自然起伏，头发随动作轻轻摆动。角色不位移。',
    durationSec: 5,
  },
  stretch: {
    poseDesc: ACTIONS.stretch.poseDesc,
    motionDesc:
      '角色慢慢向上伸展身体和双臂，短暂停留后放松回到自然姿势，头发和衣角随动作轻轻摆动。角色不位移。',
    durationSec: 5,
  },
};

// ── 可选预设动作（沿用 expression 命名兼容既有资产）──────────────────────
// 一次性表演动作（播完回落 idle），文案逐字取自 spec，不要随意改写措辞。
// 人形 pose 三档共用；motion 使用通用表情与肢体动作；faithful 保留自然随动；抽象档整套独立。

/** 人形预设动作（chibi 默认；faithful 只换 motion，pose 共用此表） */
export const EXPRESSION_ACTIONS: Record<ExpressionActionId, ActionSpec> = {
  smug: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，微微仰头眯眼坏笑，嘴角单边上扬，一只手抬到胸前手背轻贴下巴，表情得意。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色眯眼坏笑，肩膀随着无声的窃笑一耸一耸，头微微左右晃动，偶尔挑一下眉。角色不位移。',
    durationSec: 5,
  },
  point: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，自己的一只手臂抬起向画面右前方伸直指出，食指明确指向右前方，另一只手自然下垂，表情认真中带一点得意。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色保持指向画面右前方的姿势，手臂小幅前后点动强调所指方向，头随之朝同方向偏转，眉毛上扬。手臂始终不放下，角色不位移。',
    durationSec: 5,
  },
  turn_away: {
    poseDesc:
      '角色背对画面站立，只看得到后脑和背影，头微微偏向一侧像在赌气，双臂在身前交叉抱起（从背后看得到手肘的轮廓）。画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色背对画面站着不动，只有肩膀随呼吸轻微起伏，中途头微微转向侧后方瞄一眼又立刻扭回去。角色不位移。',
    durationSec: 5,
  },
  cheer: {
    poseDesc:
      '角色正面朝向画面，双臂高高举起向上张开，张嘴大笑，眼睛弯成月牙，表情兴奋雀跃。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现彩带、不出现礼花、不出现任何符号或文字，不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色举着双臂原地欢呼跳跃，双臂上下挥动，落地后再次跃起，笑容灿烂。角色始终在原地上下跳动，左右不位移。',
    durationSec: 5,
  },
  nod: {
    poseDesc:
      '角色正面朝向画面，身体自然站立，神情认真而友善，双臂自然放松。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc: '角色缓慢点头两次，眼神保持专注。角色不位移。',
    durationSec: 5,
  },
  curious: {
    poseDesc:
      '角色正面朝向画面，头微微歪向一侧，睁大眼睛，表情好奇又困惑，双臂自然放松。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现问号、文字、其他人物或物体。',
    motionDesc: '角色先向一侧歪头观察，再缓慢换向另一侧，轻轻眨眼。角色不位移。',
    durationSec: 5,
  },
  dance: {
    poseDesc:
      '角色正面朝向画面，双臂自然张开，身体略微侧倾，表情开心有活力。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现音乐符号、文字、其他人物或物体。',
    motionDesc: '角色在原地随节奏左右摇摆，双臂轻快摆动，偶尔小幅踮脚。角色不位移。',
    durationSec: 5,
  },
  comfort: {
    poseDesc:
      '角色正面朝向画面，身体微微前倾，双手在胸前自然张开，神情温柔关切。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc: '角色保持温柔表情，轻轻点头并缓慢张开双手，像在安慰和鼓励对方。角色不位移。',
    durationSec: 5,
  },
};

/** 预设动作高保真 motion：pose 同人形，保留自然随动 */
export const EXPRESSION_FAITHFUL_MOTION: Record<ExpressionActionId, string> = {
  smug: '角色眯眼坏笑，肩膀随着无声的窃笑一耸一耸，头微微左右晃动，偶尔挑一下眉，头发随之轻轻晃动。角色不位移。',
  point:
    '角色保持指向画面右前方的姿势，手臂小幅前后点动强调所指方向，头随之朝同方向偏转，眉毛上扬，头发随动作轻轻晃动。手臂始终不放下，角色不位移。',
  turn_away:
    '角色背对画面站着不动，只有肩膀随呼吸轻微起伏，中途头微微转向侧后方瞄一眼又立刻扭回去，头发随扭头轻轻甩动。角色不位移。',
  cheer:
    '角色举着双臂原地欢呼跳跃，双臂上下挥动，落地后再次跃起，笑容灿烂，头发随跳跃上下飞扬。角色始终在原地上下跳动，左右不位移。',
  nod: '角色缓慢点头两次，眼神保持专注，头发随动作轻轻起伏。角色不位移。',
  curious: '角色先向一侧歪头观察，再缓慢换向另一侧，眨眼，头发随动作自然晃动。角色不位移。',
  dance: '角色在原地随节奏左右摇摆，双臂轻快摆动，偶尔小幅踮脚，头发和衣角随节奏摆动。角色不位移。',
  comfort: '角色保持温柔表情，轻轻点头并缓慢张开双手，像在安慰和鼓励对方。角色不位移。',
};

/** 预设动作抽象形态（绝不出现部位词，血泪坑 10；情绪/姿态用整体轮廓表达） */
export const EXPRESSION_ABSTRACT_ACTIONS: Record<ExpressionActionId, ActionSpec> = {
  smug: {
    poseDesc: '角色朝向画面右侧，整体微微后仰上扬，姿态透着得意。没有其他任何人物或物体。',
    motionDesc:
      '角色整体一耸一耸地小幅抖动，像在无声地窃笑，偶尔轻轻左右摇晃。角色不位移。',
    durationSec: 5,
  },
  point: {
    poseDesc: '角色整体朝画面右侧倾斜前探，姿态像在明确示意右前方。没有其他任何人物或物体。',
    motionDesc: '角色朝画面右前方小幅前后点动，像在反复强调那个方向。角色不位移。',
    durationSec: 5,
  },
  turn_away: {
    poseDesc: '角色整体背朝画面，轮廓偏向一侧，姿态像在赌气。没有其他任何人物或物体。',
    motionDesc:
      '角色背朝画面一动不动，只有整体随呼吸极轻微起伏，中途朝侧后方微微转了一下又立刻转回去。角色不位移。',
    durationSec: 5,
  },
  cheer: {
    poseDesc: '角色整体向上舒展张开，姿态兴奋雀跃。没有其他任何人物或物体。',
    motionDesc:
      '角色在原地上下弹跳欢呼，每次落下后再次弹起，整体随之舒展收缩。角色始终在原地上下跳动，左右不位移。',
    durationSec: 5,
  },
  nod: {
    poseDesc: '角色保持原本形态，整体略微向前倾，姿态认真友善。没有其他任何人物或物体。',
    motionDesc: '角色整体缓慢上下点动两次，随后平稳回到原本姿态。角色不位移。',
    durationSec: 5,
  },
  curious: {
    poseDesc: '角色保持原本形态，整体微微歪向一侧，姿态好奇。画面中不出现问号、文字或其他物体。',
    motionDesc: '角色整体先向一侧倾斜观察，再缓慢换向另一侧，轮廓轻微弹动。角色不位移。',
    durationSec: 5,
  },
  dance: {
    poseDesc: '角色保持原本形态，整体略微侧倾，姿态轻快有活力。画面中不出现音乐符号、文字或其他物体。',
    motionDesc: '角色整体在原地有节奏地左右摇摆并轻轻弹动，动作连贯轻快。角色不位移。',
    durationSec: 5,
  },
  comfort: {
    poseDesc: '角色保持原本形态，整体微微向前靠近，姿态温柔关切。没有其他任何人物或物体。',
    motionDesc: '角色整体缓慢前倾并轻轻点动，像在安慰和鼓励对方，随后回到原本姿态。角色不位移。',
    durationSec: 5,
  },
};

/** 按形态/风格取可选预设动作文案（与 actionSpec 同构） */
export function expressionActionSpec(
  action: ExpressionActionId,
  form: CharacterForm = 'humanoid',
  style?: CharacterStyle,
): ActionSpec {
  if (form === 'abstract') return EXPRESSION_ABSTRACT_ACTIONS[action];
  if (style === 'faithful') {
    return {
      poseDesc: EXPRESSION_ACTIONS[action].poseDesc,
      motionDesc: EXPRESSION_FAITHFUL_MOTION[action],
      durationSec: 5,
    };
  }
  return EXPRESSION_ACTIONS[action];
}

/** 按角色形态与生成风格取动作文案 */
export function actionSpec(
  action: ActionId,
  form: CharacterForm = 'humanoid',
  style?: CharacterStyle,
): ActionSpec {
  if (form === 'abstract') return ABSTRACT_ACTIONS[action];
  return (style === 'faithful' ? FAITHFUL_ACTIONS : ACTIONS)[action];
}

/** 三视图 prompt（图生图，参考图=用户输入）
 * style 只作用于人形档：chibi 把任意素材重绘成二头身 Q 版；faithful 保持原图头身比与画风（旧行为）。
 * 函数缺省 faithful 以兼容旧 job resume；新建入口（UI/CLI）默认传 chibi。
 * 首帧/视频 prompt 不需要 style——它们以已选三视图为参考图，风格自然沿袭。
 */
export function turnaroundPrompt(
  desc: CharacterDesc = DEFAULT_CHARACTER_DESC,
  form: CharacterForm = 'humanoid',
  style: CharacterStyle = 'faithful',
  /** 全文覆盖（manifest.turnaroundPromptFull）：完全取代模板拼装 */
  fullOverride?: string,
): string {
  if (fullOverride?.trim()) return fullOverride.trim();
  if (form === 'abstract') {
    return (
      `角色三视图设定表：参考图中的角色，完全保持参考图中角色的形态、线条风格、颜色、比例与画风。` +
      `不要拟人化，不要添加参考图中没有的四肢、五官、服装或任何部位。` +
      `画面从左到右水平排列三个完整全身视角：正面、正侧面、正背面，` +
      `三个视角的角色细节完全一致。` +
      `纯白色背景，无阴影，无文字，无水印`
    );
  }
  if (style === 'chibi') {
    return (
      `角色三视图设定表：把参考图中的角色重新设计为二头身Q版chibi风格：大头圆脸小身体，圆润可爱，` +
      `保留参考图中角色的发型、发色、眼睛颜色、耳朵等标志性特征和服装的主要配色与元素，` +
      `使其可以被一眼认出是同一个角色。` +
      `头部约占站立全身高度的一半，躯干紧凑，四肢短小圆润，手掌和脚小巧且与身体协调。不要成人长手长腿或过大的手掌脚掌。` +
      `画面从左到右水平排列三个完整站立全身视角：正面、正侧面、正背面，` +
      `三个视角的角色比例、发型、服装细节完全一致，双臂自然下垂，表情为${desc.defaultExpression}。` +
      `可爱贴纸插画风格，纯白色背景，无阴影，无文字，无水印`
    );
  }
  return (
    `角色三视图设定表：参考图中的角色，${desc.summary}。` +
    `画面从左到右水平排列三个完整站立全身视角：正面、正侧面、正背面，` +
    `三个视角的角色比例、发型、服装细节完全一致，双臂自然下垂，表情为${desc.defaultExpression}。` +
    `纯白色背景，无阴影，无文字，无水印`
  );
}

/** 绿幕首帧 prompt（图生图，参考图=选定三视图）
 * persona 可选：角色人设，用于影响姿势/表情/风格。
 */
export function framePrompt(
  action: ActionId,
  desc: CharacterDesc = DEFAULT_CHARACTER_DESC,
  form: CharacterForm = 'humanoid',
  style?: CharacterStyle,
  persona?: string,
  /** 自定义姿势描述（覆盖默认 actionSpec.poseDesc），来自 manifest.json 中该动作的 poseDesc 字段 */
  poseOverride?: string,
  /** 全文覆盖（manifest.actions[x].framePromptFull）：完全取代模板拼装 */
  fullOverride?: string,
): string {
  if (fullOverride?.trim()) return fullOverride.trim();
  const faithful = form !== 'abstract' && style === 'faithful';
  const keep =
    form === 'abstract'
      ? `参考图中的角色，完全保持其形态、线条、颜色、画风等所有细节一致，不要添加参考图中没有的部位。`
      : faithful
        ? `参考图中的角色，保持发型、眼睛、服装、画风、头身比等所有细节完全一致。`
        : `参考图中的角色，保持发型、眼睛、服装、耳朵等所有细节完全一致。`;
  const personaSuffix = persona ? `角色人设：${persona}。按照此设定表现角色。` : '';
  const poseDesc = poseOverride ?? actionSpec(action, form, style).poseDesc;
  return (
    keep +
    poseDesc +
    personaSuffix +
    (form === 'abstract' ? '' : PROPORTION_LOCK) +
    `画面中只有这一个角色，不出现其他人的手或身体部位，没有家具、没有白色贴纸描边。` +
    // 写实风模型爱画接触阴影，阴影是暗绿色、抠像永远处理不掉，必须在生成端排除
    (faithful ? `角色不投射任何阴影，地面和背景上没有任何阴影。` : '') +
    `背景为纯色绿幕（纯正绿色，无渐变无阴影无纹理），` +
    // 背景均匀度：帧 QC 会按四角色差判不均匀重试，这里在生成端先把「同一色值铺满」讲明白
    `整个背景由同一个绿色色值均匀铺满，背景没有任何明暗变化或光照渐变，` +
    (faithful ? `角色边缘清晰锐利，` : `角色边缘描线清晰，`) +
    `全身完整可见，角色占画面高度约70%，` +
    (faithful ? `完全保持参考图的画风与头身比不变，` : `粗描边贴纸插画风格，`) +
    `无文字无水印`
  );
}

/** 循环视频 prompt（i2v，首帧=尾帧），参数走 1.0 系列的 prompt 尾部约定
 * style 只在「人形 + faithful」时生效：动作文案换成连耳朵也不提的版本，并排除接触阴影。
 * desc 缺省沿用 DEFAULT_CHARACTER_DESC（向后兼容）
 */
export function videoPrompt(
  action: ActionId,
  desc: CharacterDesc = DEFAULT_CHARACTER_DESC,
  form: CharacterForm = 'humanoid',
  style?: CharacterStyle,
  persona?: string,
  /** 自定义动作描述（覆盖默认 actionSpec.motionDesc），来自 manifest.json 中该动作的 motionDesc 字段 */
  motionOverride?: string,
  /** 全文覆盖（manifest.actions[x].videoPromptFull）：完全取代下面的模板拼装 */
  fullOverride?: string,
): string {
  const spec = actionSpec(action, form, style);
  // 全文覆盖：Seedance 的 `--` 参数是必需的，用户删掉会导致 400 或时长不对 → 自动补回
  if (fullOverride?.trim()) {
    return withVideoParams(fullOverride.trim(), spec.durationSec);
  }
  const faithful = form !== 'abstract' && style === 'faithful';
  const keep =
    form === 'abstract'
      ? `参考图中的角色，完全保持其形态、线条、颜色、画风等所有细节一致，不要添加参考图中没有的部位。`
      : faithful
        ? `参考图中的角色，保持发型、眼睛、服装、画风、头身比等所有细节完全一致。`
        : `参考图中的角色，保持发型、眼睛、服装、耳朵等所有细节完全一致。`;
  const personaSuffix = persona ? `角色人设：${persona}。按照此设定表现角色。` : '';
  const motionDesc = motionOverride ?? spec.motionDesc;
  return (
    keep +
    motionDesc +
    personaSuffix +
    (form === 'abstract' ? '' : PROPORTION_LOCK) +
    `全程各部位大小稳定，最后几帧也不放大、拉长或弹性变形，以自然回到起始姿态完成循环。` +
    `镜头完全固定不动，静止镜头，角色不位移不走出画面，绿幕背景纯绿色保持不变，` +
    // 帧间背景闪烁是漂移 QC 判废的主因，也让双 key 更难覆盖 → 在生成端要求全程同一色值
    `背景全程保持同一个均匀绿色色值，不出现明暗跳变或光照闪烁，` +
    (faithful ? `角色不投射任何阴影，画面中没有任何阴影，` : '') +
    `画面中始终只有这一个角色，绝对不出现其他人物、手或物体。丝滑流畅循环动画。` +
    ` --resolution 480p --duration ${spec.durationSec} --camerafixed true`
  );
}

/**
 * 保证视频 prompt 带齐 Seedance 必需的 `--` 参数尾缀。
 * 用户全文编辑时很容易把这段删掉 —— 缺 duration 会 400（1.5-pro 不支持默认值），
 * 缺 camerafixed 会导致镜头漂移。已存在的参数保持用户的值不动。
 */
function withVideoParams(prompt: string, durationSec: number): string {
  let out = prompt;
  if (!/--resolution\s+\S+/.test(out)) out += ' --resolution 480p';
  if (!/--duration\s+\d+/.test(out)) out += ` --duration ${durationSec}`;
  if (!/--camerafixed\s+\S+/.test(out)) out += ' --camerafixed true';
  return out;
}
