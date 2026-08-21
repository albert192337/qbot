/**
 * 规则引擎的类型定义（规则文件 schema + 运行时类型）。
 *
 * 规则文件是 JSON，放在 app/src/main/rules/ 目录下，热加载。
 * 条件是 AND 关系：所有条件同时满足才命中。
 */

/** 单条规则 */
export interface BehaviorRule {
  /** 规则唯一 id（冷却/每日上限的 key） */
  id: string;
  /** 规则名称（调试面板展示） */
  name: string;
  /** 规则描述（调试面板展示） */
  description?: string;
  /** 触发的事件类型（哪些事件边沿会让这条规则参与评估） */
  trigger: RuleTrigger[];
  /** 条件（全部满足才命中） */
  conditions: RuleCondition[];
  /** 行为脚本模板（由引擎填充台词后输出） */
  behavior: RuleBehaviorTemplate;
  /** 权重（同优先级多候选时按权重抽取） */
  weight: number;
  /** 优先级（数值越大越优先；-1 = 用默认 COMMENT） */
  priority?: number;
  /** 冷却时间 ms（同 id 规则多久内不能重复触发） */
  cooldownMs?: number;
  /** 每日触发上限次数（0 = 不限） */
  dailyLimit?: number;
  /** 是否可打断当前行为（默认 false：等当前行为结束再执行） */
  interrupting?: boolean;
  /** 规则分组（同组内同时只能触发一条；比如「深夜感慨」组内一次只说一句） */
  group?: string;
  /** 来源标签：built-in / user / test */
  source?: 'built-in' | 'user' | 'test';
}

/** 触发时机：哪些事件边沿会触发这条规则的评估 */
export type RuleTrigger =
  | 'app_switch' // 切换到新应用时
  | 'hour_chime' // 整点时
  | 'idle_return' // 从长时间无操作恢复时
  | 'agent_stop' // Claude Code 跑完一轮
  | 'agent_error' // Claude Code 报错
  | 'meeting_end' // 飞书会议结束
  | 'music_start' // 开始听歌
  | 'music_end' // 停止听歌
  | 'pet_click' // 用户点击桌宠
  | 'pet_drag_end' // 用户拖完桌宠松手
  | 'startup' // 刚启动时
  | 'perception_tick'; // 定时触发（兜底，10 分钟一次，低优先）

/** 条件（全部 AND） */
export type RuleCondition =
  // ── 时间条件 ──
  | { kind: 'time_range'; from: string; to: string } // "23:00" ~ "05:00" = 深夜
  | { kind: 'weekday'; days: number[] } // 0=周日 ~ 6=周六
  | { kind: 'hour_at_least'; hour: number } // >= 几点
  | { kind: 'hour_at_most'; hour: number } // <= 几点
  // ── 使用情况条件 ──
  | { kind: 'app_is'; app: string } // 当前前台应用是
  | { kind: 'app_contains'; keyword: string } // 应用名包含
  | { kind: 'app_switches_ge'; count: number } // 今日切换次数 >= N
  | { kind: 'active_minutes_ge'; minutes: number } // 今日活跃时长 >= N 分钟
  | { kind: 'idle_minutes_ge'; minutes: number } // 已经 idle 了 >= N 分钟
  // ── agent 条件 ──
  | { kind: 'agent_active'; activity?: string } // agent 是否在干活，可选具体活动
  | { kind: 'agent_sessions_ge'; count: number } // 今日 agent 会话数 >= N
  | { kind: 'agent_consecutive_errors_ge'; count: number } // 连续出错轮数
  // ── 会议 / 音乐条件 ──
  | { kind: 'in_meeting' } // 正在开会
  | { kind: 'not_in_meeting' }
  | { kind: 'music_playing' } // 正在听歌
  | { kind: 'music_not_playing' }
  // ── 交互条件 ──
  | { kind: 'since_last_interact_ge'; minutes: number } // 距离上次点击/拖拽 >= N 分钟
  | { kind: 'since_last_interact_lt'; minutes: number } // 距离上次交互 < N 分钟
  // ── 行为史条件 ──
  | { kind: 'behavior_not_in'; kinds: string[]; withinMinutes: number } // N 分钟内没做过某类行为
  // ── 随机/冷却条件 ──
  | { kind: 'random_chance'; p: number } // 概率 p（0~1），每次评估都掷骰子
  // ── 特殊条件 ──
  | { kind: 'first_time_today' } // 今天第一次满足条件
  | { kind: 'monday_feeling' }; // 周一早上 9-11 点（组合条件的快捷方式）

/** 行为模板（引擎填台词后生成 BehaviorScript） */
export interface RuleBehaviorTemplate {
  /** 动作意图词（由动作解析层映射到实际动作） */
  actionIntent?: string;
  /** 动作循环次数（默认 1） */
  actionLoops?: number;
  /** 说的话（三档权重，引擎按权重选） */
  lines?: WeightedLine[];
  /** 举牌文字（不举牌则不填） */
  signText?: string;
  /** 动作前等待 ms */
  preDelayMs?: number;
  /** 动作后等待 ms */
  postDelayMs?: number;
  /** 气泡显示时长（默认 = 按字数算） */
  sayDurationMs?: number;
}

/** 带权重的台词 */
export interface WeightedLine {
  text: string;
  /** 权重（相对值；越大越常出现） */
  weight: number;
  /** 稀有度标签：common / rare / epic（仅调试展示用） */
  tier?: 'common' | 'rare' | 'epic';
}

/** 规则评估上下文（每次触发时从感知层构造的快照） */
export interface RuleContext {
  /** 当前时间（Date，方便测试时注入） */
  now: Date;
  /** 当前前台应用名 */
  currentApp: string | null;
  /** 当前应用的停留时间 ms */
  currentAppMs: number;
  /** 今日账本（聚合数据） */
  todayLedger: {
    totalSwitches: number;
    apps: Record<string, { focusMs: number; switches: number }>;
    firstActivityAt?: number;
    lastActivityAt?: number;
  };
  /** agent 状态 */
  agent: {
    activity: string; // idle/thinking/working/waiting/error/done
    sessions: number;
    consecutiveErrors: number;
  };
  /** 会议状态 */
  inMeeting: boolean;
  /** 音乐状态 */
  musicPlaying: boolean;
  /** 距离上次交互 ms */
  sinceLastInteractMs: number;
  /** 当前可用动作列表（动作解析层需要） */
  availableActions: string[];
  /** 用户动作映射覆盖 */
  actionOverride?: Record<string, string>;
  /** 距离上次启动 ms */
  sinceStartupMs: number;
}

/** 单条规则的评估结果 */
export interface RuleEvalResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  /** 没命中的条件索引（调试用） */
  failedConditions?: number[];
  /** 命中时的分数（用于排序和加权抽选） */
  score?: number;
}
