/**
 * LLM 脑纯逻辑：上下文 → prompt 消息、模型文本 → 决策、节流判定。
 * 零 IO / 零 Electron，可单测（IO 与编排见 brain-llm.ts）。
 *
 * 隐私铁律（行为体系 spec §3）：喂给模型的只有**聚合后的账本摘要 + 当前状态**，
 * 原始事件流（哪个应用、什么时刻、敲了什么）永不进 prompt。曲名/cwd/气泡正文也不进。
 */
import type { ChatMessage } from './llm-client';

/** 喂给模型的精简上下文（从感知快照 + 各监控器状态提炼） */
export interface BrainInput {
  /** 桌宠名字 */
  personaName: string;
  /** 桌宠性格/人设关键词（来自 manifest.persona，可空） */
  personaTraits?: string;
  /** 当前时间的人类描述（如「周三 23:40 深夜」） */
  timeLabel: string;
  /** 当前前台应用名（可空） */
  currentApp: string | null;
  /** 今日应用切换总次数 */
  todaySwitches: number;
  /** 今日活跃分钟数（首次活动到现在） */
  activeMinutes: number;
  /** 用得最多的前几个应用（名字 + 切换次数） */
  topApps: Array<{ name: string; switches: number }>;
  /** agent 状态中文描述（空闲 / 在思考 / 在干活 / 刚跑完一轮 / 出错了 / 在等人处理） */
  agentLabel: string;
  inMeeting: boolean;
  musicPlaying: boolean;
  /** 桌宠最近说过的台词（避免重复；最多 5 条） */
  recentLines: string[];
  /** 可选动作意图词（模型从中挑 action） */
  availableIntents: string[];
}

/** 模型决策（解析后的结构化结果） */
export interface BrainDecision {
  /** 模型是否决定行动 */
  do: boolean;
  /** 一句内心想法（记日记用，始终有值） */
  thought: string;
  /** 动作意图词（do=true 时有值） */
  action?: string;
  /** 台词（do=true 且想说时有值） */
  say?: string;
}

/** 台词/想法长度上限（模型偶尔会写小作文，硬截断） */
const MAX_LINE = 40;
const MAX_THOUGHT = 60;

/**
 * 构造发给模型的消息。
 * 设计：强约束「大部分时候不行动」+ 严格 JSON 输出 + 只能引用给它的上下文。
 */
export function buildBrainMessages(input: BrainInput): ChatMessage[] {
  const system = [
    `你是「${input.personaName}」，一只住在用户电脑桌面上的桌宠。`,
    input.personaTraits ? `你的性格：${input.personaTraits}。` : '',
    '你会在合适的时机主动做个小动作、说句话，给用户情绪价值和陪伴感。',
    '',
    '铁律：',
    '1. 大部分时候应该选择「不行动」。频繁打扰会让人烦。只有在时机真的有意思、温馨、或有共鸣时才行动。',
    '2. 你只能看到用户提供给你的上下文，绝不编造看不到的东西（具体文件名、网页内容、聊天记录等）。',
    '3. 台词要短、口语化、有性格，像一个真人朋友随口说的，不要像客服或助手。不要用表情符号堆砌。',
    '4. 不要重复你最近说过的话。',
    '5. 舞台（动作/时机）承担笑点，你只是把话说得有性格——不要讲大道理、不要鸡汤、不要说教。',
    '',
    '输出严格的 JSON（不要 markdown 代码块、不要多余文字），格式：',
    '{"thought":"你此刻的一句内心想法","do":true或false,"action":"动作意图词","say":"台词或空字符串"}',
    `- action 只能从这些词里选：${input.availableIntents.join('、')}。do=false 时 action 留空字符串。`,
    '- say 不超过 30 个字；不想说话就给空字符串。',
    '- thought 不超过 40 个字，是你的内心独白，会记进你的日记，用户偶尔会看到。',
  ]
    .filter(Boolean)
    .join('\n');

  const topApps =
    input.topApps.length > 0
      ? input.topApps.map((a) => `${a.name}(${a.switches}次)`).join('、')
      : '无';
  const user = [
    `现在：${input.timeLabel}。`,
    input.currentApp ? `用户当前在用：${input.currentApp}。` : '不确定用户在哪个应用。',
    `今天用户已经切换应用 ${input.todaySwitches} 次，活跃约 ${input.activeMinutes} 分钟；最常用：${topApps}。`,
    `Claude Code（你的同事 AI）：${input.agentLabel}。`,
    input.inMeeting ? '用户正在开会。' : '',
    input.musicPlaying ? '用户在听歌。' : '',
    input.recentLines.length > 0
      ? `你最近说过这些（别重复）：${input.recentLines.map((l) => `「${l}」`).join('、')}。`
      : '你最近还没说过话。',
    '',
    '现在这个瞬间，要不要做点什么或说句话？记住：大部分时候答案是不行动。只输出 JSON。',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * 从模型返回的文本里解析决策。
 * 模型可能：直接给 JSON、裹 markdown ```json、前后带解释文字。全部容错。
 * 解析失败返回 null（调用方降级为「不行动」）。
 */
export function parseBrainResponse(text: string, allowedIntents: string[]): BrainDecision | null {
  if (!text || typeof text !== 'string') return null;

  // 提取第一个 JSON 对象（宽松匹配 { ... }）
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const thought = clampStr(obj.thought, MAX_THOUGHT) || '（没什么想法）';
  const doAction = obj.do === true;

  if (!doAction) {
    return { do: false, thought };
  }

  // do=true：校验 action 在白名单内（不在则忽略动作但保留 thought；say 仍可说）
  const rawAction = typeof obj.action === 'string' ? obj.action.trim().toLowerCase() : '';
  const action = allowedIntents.includes(rawAction) ? rawAction : undefined;
  const say = clampStr(obj.say, MAX_LINE);

  // 既没有合法动作也没有台词 → 等同于不行动（空行为没意义）
  if (!action && !say) {
    return { do: false, thought };
  }

  return { do: true, thought, action, say: say || undefined };
}

function clampStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const s = v.trim().replace(/\s+/g, ' ');
  return s.length > max ? s.slice(0, max) : s;
}

/** 节流：距上次思考是否够久（LLM 慢且花钱，不能每个事件都调） */
export function shouldThink(now: number, lastThinkAt: number | null, minIntervalMs: number): boolean {
  if (lastThinkAt === null) return true;
  return now - lastThinkAt >= minIntervalMs;
}

/** 把 agent activity 枚举翻成给模型看的中文 */
export function agentActivityLabel(activity: string): string {
  switch (activity) {
    case 'thinking':
      return '正在思考问题';
    case 'working':
      return '正在埋头干活';
    case 'waiting':
      return '在等用户处理点什么';
    case 'error':
      return '好像出错了，有点懊恼';
    case 'done':
      return '刚跑完一轮，干完活了';
    default:
      return '闲着，没在干活';
  }
}

/** 时间的中文标签（如「周三 23:40」） */
export function timeLabel(d: Date): string {
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hour = d.getHours();
  const period =
    hour >= 23 || hour < 5
      ? '深夜'
      : hour < 9
        ? '清晨'
        : hour < 12
          ? '上午'
          : hour < 14
            ? '中午'
            : hour < 18
              ? '下午'
              : '晚上';
  return `${week} ${hh}:${mm} ${period}`;
}
