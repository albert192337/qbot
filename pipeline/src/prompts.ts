/**
 * 三套 prompt 模板 + 6 动作文案常量。
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

/**
 * 6 动作姿势/动作文案。
 * 每条都含防翻车显式排除（DESIGN.md §3.3 Prompt 经验）：
 * - 不描述"被拎住"之类会引出手的措辞，只描述姿势本身
 * - 睡觉显式排除床/枕头/被子（床是客户端垫的资产图层）
 * - 全档禁提尾巴：不管角色本身有没有尾巴，命令式的「尾巴摆动」都会让模型
 *   凭空长出一条（写实喝茶动作实测长出猫尾巴）；耳朵保留（贴纸档兽形角色需要）
 */
export const ACTIONS: Record<ActionId, ActionSpec> = {
  idle: {
    poseDesc:
      '角色自然站立，双臂自然下垂，表情平静放松。画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色站立原地，身体随呼吸轻微起伏，偶尔眨眼，耳朵轻微自然摆动。动作幅度很小。',
    durationSec: 5, // seedance 1.5-pro 最短 5s（3 会 400）
  },
  drag: {
    poseDesc:
      '角色悬浮在半空中，身体微微前倾，双腿自然下垂放松，表情略带惊讶。没有绳索、没有其他任何人物或物体，角色周围完全空无一物。',
    motionDesc:
      '角色悬浮在半空，身体轻微摇晃，双腿自然晃动，表情略带惊讶地眨眼。角色不位移。',
    durationSec: 5,
  },
  sleep: {
    poseDesc:
      '角色蜷缩侧躺姿势闭眼熟睡，表情安详。画面中绝对没有床、没有枕头、没有被子，只有角色悬浮在纯绿背景上。不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色闭眼熟睡，身体随呼吸缓慢起伏，耳朵偶尔轻颤。动作幅度很小，安静祥和。',
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
      '角色朝画面右侧开心地说话，嘴巴一张一合，表情生动，偶尔点头，耳朵竖起。角色不位移。',
    durationSec: 5,
  },
  talk_annoyed: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，表情不耐烦，眉头微皱，嘴角向下撇。角色自身的手和双臂保持自然可见，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色朝画面右侧不耐烦地抱怨，嘴巴撇着动，偶尔翻白眼或扭头，耳朵向后压。角色不位移。',
    durationSec: 5,
  },
};

/**
 * 抽象档动作文案：适配线条小狗、简笔涂鸦、几何形等非人形角色。
 * 铁律：绝不提及双臂/双腿/坐姿/发型/服装/耳尾等部位假设——模型会顺着描述凭空长出这些部位；
 * 一律用"整体""姿态""轮廓"级别的措辞，防翻车排除项与人形档保持一致。
 */
export const ABSTRACT_ACTIONS: Record<ActionId, ActionSpec> = {
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
};

/**
 * 高保真档动作文案：姿势与 ACTIONS 相同，运动描述连耳朵也不提——
 * 高保真多为真人/写实角色，任何部位命令都可能凭空长出该部位，
 * 一律换成头发/衣角级别的自然运动（尾巴已全档禁提，见 ACTIONS 注释）。
 */
export const FAITHFUL_ACTIONS: Record<ActionId, ActionSpec> = {
  idle: {
    poseDesc: ACTIONS.idle.poseDesc,
    motionDesc:
      '角色站立原地，身体随呼吸轻微起伏，偶尔眨眼，头发轻微自然飘动。动作幅度很小。',
    durationSec: 5,
  },
  drag: {
    poseDesc: ACTIONS.drag.poseDesc,
    motionDesc:
      '角色悬浮在半空，身体轻微摇晃，双腿自然晃动，头发轻轻飘动，表情略带惊讶地眨眼。角色不位移。',
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
};

// ── M 档表现力动作（spec 2026-08-21-expression-action-tier §4）──────────────
// 一次性表演动作（播完回落 idle），文案逐字取自 spec，不要随意改写措辞。
// 人形 pose 三档共用；motion 分 chibi（耳朵）/ faithful（头发）；抽象档整套独立。

/** M 档人形动作（chibi 默认；faithful 只换 motion，pose 共用此表） */
export const EXPRESSION_ACTIONS: Record<ExpressionActionId, ActionSpec> = {
  smug: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，微微仰头眯眼坏笑，嘴角单边上扬，一只手抬到胸前手背轻贴下巴，表情得意。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色眯眼坏笑，肩膀随着无声的窃笑一耸一耸，头微微左右晃动，偶尔挑一下眉，耳朵得意地抖动。角色不位移。',
    durationSec: 5,
  },
  point: {
    poseDesc:
      '角色四分之三侧身朝向画面右侧，自己的一只手臂抬起向画面右前方伸直指出，食指明确指向右前方，另一只手自然下垂，表情认真中带一点得意。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色保持指向画面右前方的姿势，手臂小幅前后点动强调所指方向，头随之朝同方向偏转，眉毛上扬，耳朵竖起。手臂始终不放下，角色不位移。',
    durationSec: 5,
  },
  turn_away: {
    poseDesc:
      '角色背对画面站立，只看得到后脑和背影，头微微偏向一侧像在赌气，双臂在身前交叉抱起（从背后看得到手肘的轮廓）。画面中不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色背对画面站着不动，只有肩膀随呼吸轻微起伏，中途头微微转向侧后方瞄一眼又立刻扭回去，耳朵向后压。角色不位移。',
    durationSec: 5,
  },
  cheer: {
    poseDesc:
      '角色正面朝向画面，双臂高高举起向上张开，张嘴大笑，眼睛弯成月牙，表情兴奋雀跃。角色自身的手和双臂保持自然可见，手中不持任何物体，画面中不出现彩带、不出现礼花、不出现任何符号或文字，不出现其他人的手或身体部位，不出现任何额外人物或物体。',
    motionDesc:
      '角色举着双臂原地欢呼跳跃，双臂上下挥动，落地后再次跃起，笑容灿烂，耳朵随跳跃上下弹动。角色始终在原地上下跳动，左右不位移。',
    durationSec: 5,
  },
};

/** M 档高保真（faithful）motion：pose 同人形，只把耳朵换成头发 */
export const EXPRESSION_FAITHFUL_MOTION: Record<ExpressionActionId, string> = {
  smug: '角色眯眼坏笑，肩膀随着无声的窃笑一耸一耸，头微微左右晃动，偶尔挑一下眉，头发随之轻轻晃动。角色不位移。',
  point:
    '角色保持指向画面右前方的姿势，手臂小幅前后点动强调所指方向，头随之朝同方向偏转，眉毛上扬，头发随动作轻轻晃动。手臂始终不放下，角色不位移。',
  turn_away:
    '角色背对画面站着不动，只有肩膀随呼吸轻微起伏，中途头微微转向侧后方瞄一眼又立刻扭回去，头发随扭头轻轻甩动。角色不位移。',
  cheer:
    '角色举着双臂原地欢呼跳跃，双臂上下挥动，落地后再次跃起，笑容灿烂，头发随跳跃上下飞扬。角色始终在原地上下跳动，左右不位移。',
};

/** M 档抽象形态（绝不出现部位词，血泪坑 10；情绪/姿态用整体轮廓表达） */
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
};

/** 按形态/风格取 M 档动作文案（与 actionSpec 同构） */
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
