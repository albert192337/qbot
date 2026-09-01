/**
 * 行为脚本 DSL（行为体系 spec §4）。
 *
 * 规则脑和 LLM 脑输出同一种 DSL，执行器统一消费。
 * 设计原则：
 *  1. 白名单动词 —— 模型只能从已知动词里选，不能任意执行
 *  2. 参数类型化 —— 每个动词的参数都有类型，非法直接 reject
 *  3. 纯数据结构 —— JSON 可序列化，规则文件和模型输出都能用
 *  4. 原子可中断 —— 每步之间检查更高优先级是否要打断
 *
 *  动词分两档：
 *   - 阶段 B 接入：play / say / sign / wait
 *   - 后续阶段：move / note / award / journal
 */

/** 单个脚本步骤（原子操作） */
export type BehaviorStep =
  | { op: 'play'; action: string; loops?: number }
  | { op: 'say'; text: string; durationMs?: number }
  | { op: 'sign'; text: string | null } // null = 收牌
  | { op: 'wait'; ms: number }
  | { op: 'move'; x: number; y: number } // 阶段 D
  | { op: 'note'; text: string } // 阶段 D
  | { op: 'award'; title: string; reason: string } // 阶段 E
  | { op: 'journal'; text: string }; // 阶段 C

/** 行为元数据（仲裁/防重复/冷却用） */
export interface BehaviorMeta {
  /** 行为唯一 id（规则名或模型生成的行为类别） */
  id: string;
  /** 优先级：数值越大越优先；0 最低。决定是否打断正在运行的行为 */
  priority: number;
  /** 同优先级下的权重（多个候选同时命中时按权重抽） */
  weight?: number;
  /** 冷却时间 ms（同 id 行为多久内不能重复触发） */
  cooldownMs?: number;
  /** 每日上限次数（同 id） */
  dailyLimit?: number;
  /** 单次执行预算上限（同时最多运行多少个同 id 行为；一般 1） */
  maxConcurrent?: number;
  /** 来源：rule（规则引擎）/ llm（大模型）/ user（用户主动触发）/ debug（调试注入） */
  source: 'rule' | 'llm' | 'user' | 'debug';
  /** 触发原因（调试面板/决策日志显示用） */
  reason?: string;
}

/** 一个完整的行为脚本 */
export interface BehaviorScript {
  meta: BehaviorMeta;
  steps: BehaviorStep[];
}

/** 校验结果 */
export interface ValidateResult {
  ok: boolean;
  errors: string[];
}

/** 已知动作 op 的最大合理值（防止模型乱写巨大数字） */
const MAX_WAIT_MS = 60_000; // 单步最多等 60 秒
const MAX_LOOPS = 10;
const MAX_TEXT_LEN = 500; // say/sign/note 文本上限
const MAX_STEPS = 30; // 单个脚本最多 30 步
const MAX_ID_LEN = 128;

/**
 * 校验一个行为脚本是否合法。
 * 规则引擎输出的一般都是合法的，但 LLM 输出的必须过一遍。
 */
export function validateScript(script: unknown): ValidateResult {
  const errors: string[] = [];

  if (!script || typeof script !== 'object') {
    return { ok: false, errors: ['script must be an object'] };
  }
  const s = script as Record<string, unknown>;

  // meta 校验
  if (!s.meta || typeof s.meta !== 'object') {
    errors.push('meta is required and must be an object');
  } else {
    const m = s.meta as Record<string, unknown>;
    if (typeof m.id !== 'string' || m.id.length === 0) {
      errors.push('meta.id is required');
    } else if (m.id.length > MAX_ID_LEN) {
      errors.push(`meta.id too long (max ${MAX_ID_LEN})`);
    }
    if (typeof m.priority !== 'number' || m.priority < 0) {
      errors.push('meta.priority must be a non-negative number');
    }
    if (m.weight !== undefined && (typeof m.weight !== 'number' || m.weight <= 0)) {
      errors.push('meta.weight must be a positive number');
    }
    if (m.cooldownMs !== undefined && (typeof m.cooldownMs !== 'number' || m.cooldownMs < 0)) {
      errors.push('meta.cooldownMs must be a non-negative number');
    }
    if (m.dailyLimit !== undefined && (typeof m.dailyLimit !== 'number' || m.dailyLimit < 0)) {
      errors.push('meta.dailyLimit must be a non-negative number');
    }
    if (m.source !== undefined && !['rule', 'llm', 'user', 'debug'].includes(m.source as string)) {
      errors.push('meta.source must be rule/llm/user/debug');
    }
  }

  // steps 校验
  if (!Array.isArray(s.steps)) {
    errors.push('steps must be an array');
  } else {
    if (s.steps.length === 0) errors.push('steps must not be empty');
    if (s.steps.length > MAX_STEPS) errors.push(`steps too long (max ${MAX_STEPS})`);
    for (let i = 0; i < s.steps.length; i++) {
      const step = s.steps[i] as Record<string, unknown>;
      const prefix = `steps[${i}]`;
      if (!step || typeof step !== 'object') {
        errors.push(`${prefix} must be an object`);
        continue;
      }
      if (typeof step.op !== 'string') {
        errors.push(`${prefix}.op is required`);
        continue;
      }
      switch (step.op) {
        case 'play':
          if (typeof step.action !== 'string' || step.action.length === 0) {
            errors.push(`${prefix}.action is required`);
          }
          if (step.loops !== undefined) {
            if (typeof step.loops !== 'number' || step.loops < 1 || step.loops > MAX_LOOPS) {
              errors.push(`${prefix}.loops must be 1..${MAX_LOOPS}`);
            }
          }
          break;
        case 'say':
          if (typeof step.text !== 'string') {
            errors.push(`${prefix}.text is required`);
          } else if (step.text.length > MAX_TEXT_LEN) {
            errors.push(`${prefix}.text too long (max ${MAX_TEXT_LEN})`);
          }
          if (step.durationMs !== undefined) {
            if (typeof step.durationMs !== 'number' || step.durationMs < 0) {
              errors.push(`${prefix}.durationMs must be non-negative`);
            }
          }
          break;
        case 'sign':
          if (step.text !== null && typeof step.text !== 'string') {
            errors.push(`${prefix}.text must be string or null`);
          }
          if (typeof step.text === 'string' && step.text.length > MAX_TEXT_LEN) {
            errors.push(`${prefix}.text too long (max ${MAX_TEXT_LEN})`);
          }
          break;
        case 'wait':
          if (typeof step.ms !== 'number' || step.ms <= 0) {
            errors.push(`${prefix}.ms must be a positive number`);
          } else if (step.ms > MAX_WAIT_MS) {
            errors.push(`${prefix}.ms too large (max ${MAX_WAIT_MS}ms)`);
          }
          break;
        case 'move':
        case 'note':
        case 'award':
        case 'journal':
          // 类型占位：后续阶段实现时补参数校验
          break;
        default:
          errors.push(`${prefix}.op unknown: ${step.op}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** 优先级等级（约定俗成的档位，避免散落各处的 magic number） */
export const PRIORITY = {
  /** 最低：自动闲逛（idle 时的随机动作） */
  AUTO: 0,
  /** 低：日记/随机感慨 */
  AMBIENT: 10,
  /** 中：评论一下用户在做什么（app 切换、时间） */
  COMMENT: 20,
  /** 中高：响应型（用户点击了、会议结束了） */
  REACTIVE: 30,
  /** 高：agent 联动（Claude 干完活了） */
  AGENT: 40,
  /** 最高：用户主动触发（右键菜单、指令） */
  USER: 100,
} as const;

export type PriorityTier = (typeof PRIORITY)[keyof typeof PRIORITY];

/** 工具函数：创建一个简单的 say 脚本（常用快捷方式） */
export function makeSayScript(opts: {
  id: string;
  text: string;
  priority?: number;
  source?: BehaviorMeta['source'];
  reason?: string;
  durationMs?: number;
  cooldownMs?: number;
}): BehaviorScript {
  return {
    meta: {
      id: opts.id,
      priority: opts.priority ?? PRIORITY.COMMENT,
      source: opts.source ?? 'rule',
      reason: opts.reason,
      cooldownMs: opts.cooldownMs,
    },
    steps: [{ op: 'say', text: opts.text, durationMs: opts.durationMs }],
  };
}

/** 工具函数：创建一个 play + say 的脚本 */
export function makePlaySayScript(opts: {
  id: string;
  action: string;
  text: string;
  loops?: number;
  priority?: number;
  source?: BehaviorMeta['source'];
  reason?: string;
  cooldownMs?: number;
}): BehaviorScript {
  return {
    meta: {
      id: opts.id,
      priority: opts.priority ?? PRIORITY.COMMENT,
      source: opts.source ?? 'rule',
      reason: opts.reason,
      cooldownMs: opts.cooldownMs,
    },
    steps: [
      { op: 'play', action: opts.action, loops: opts.loops ?? 1 },
      { op: 'say', text: opts.text },
    ],
  };
}
