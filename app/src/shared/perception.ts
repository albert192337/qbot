/**
 * 感知层类型（主进程 perception.ts 与 renderer 调试面板共用）。
 *
 * 三份数据的分工（行为体系 spec §3.2）：
 * - 原始事件流：调试用，本地 append-only，保留 7 天，**永不进模型上下文**
 * - 账本：桌宠的记忆，写入时聚合（原始流 7 天后不可回扫），长期保留
 * - 行为史：防重复自己，长期保留
 * 决策日志：每次触发的完整推理记录（命中条件/候选/选中/未选中原因）。
 */

/** 感知到的原始事件（统一进事件流） */
export type PerceptionEvent =
  | { type: 'app_focus'; at: number; app: string; windowTitle: string }
  | { type: 'agent'; at: number; activity: string; sessions: number }
  | { type: 'meeting'; at: number; inMeeting: boolean }
  | { type: 'music'; at: number; playing: boolean; title?: string; artist?: string }
  | { type: 'interact'; at: number; kind: 'click' | 'drag_start' | 'drag_end' | 'sign_show' | 'sign_hide' }
  | { type: 'startup'; at: number };

/** 某应用一天的统计（账本的最小单元） */
export interface AppDayStat {
  /** 前台累计时长 ms */
  focusMs: number;
  /** 今日切换过去的次数 */
  switches: number;
  /** 今日第一次出现在前台的时间（无则缺省） */
  firstAt?: number;
  /** 最近一次在前台的时间（无则缺省） */
  lastAt?: number;
}

/** 一天的账本 */
export interface DayLedger {
  /** 按应用名聚合（app name → 统计） */
  apps: Record<string, AppDayStat>;
  /** 当天应用切换总次数 */
  totalSwitches: number;
  /** 当天最后一次「切换/交互」活动时刻（作息滑窗用） */
  lastActivityAt?: number;
  /** 当天第一次活动时刻 */
  firstActivityAt?: number;
  /** 事件计数（对账用：账本聚合口径与事件流条数对得上） */
  eventCount: number;
}

/** 长期账本：按日期键控（YYYY-MM-DD），最多留 60 天 */
export type Ledger = Record<string, DayLedger>;

/** 桌宠做过的行为（行为史条目；防重复自己的依据） */
export interface BehaviorEntry {
  at: number;
  kind: 'say' | 'sign' | 'play' | 'note' | 'award' | 'journal' | 'decision';
  /** say/sign 的正文，或 play 的动作名 */
  detail?: string;
}

/** 一次触发决策的完整日志（「我怎么想的 / 我为什么没做」） */
export interface DecisionLog {
  at: number;
  /** 触发原因（事件沿） */
  trigger: string;
  /** 评估时的上下文快照（原始 JSON 摊开给调试面板） */
  snapshot: Record<string, unknown>;
  /** 命中/候选的规则或候选行为 */
  candidates: Array<{ id: string; score: number; reason: string }>;
  /** 实际执行：null = 没做（预算/静音/无候选） */
  selected: { action: string; text?: string } | null;
  /** 没做的原因；做了则为空 */
  skippedReason?: string;
}

/** 调试面板一次性取的全量快照（避免几十个通道） */
export interface PerceptionSnapshot {
  /** 最近事件（倒序，最多 200 条） */
  events: PerceptionEvent[];
  /** 当前日期键 + 账本 */
  ledgerDate: string;
  ledger: DayLedger;
  /** 行为史（倒序，最多 100 条） */
  behaviors: BehaviorEntry[];
  /** 决策日志（倒序，最多 100 条） */
  decisions: DecisionLog[];
}
