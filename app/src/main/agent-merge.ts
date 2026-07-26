/**
 * agent 会话聚合的纯逻辑：事件 → 会话活动态 → 优先级合成。
 * 从 agent-server.ts 拆出来是为了可单测（agent-server 经 ./windows 间接依赖
 * electron，vitest 里跑不起来）。本文件不得 import 任何 Electron API。
 */
import type { AgentActivity, AgentStatus } from '../shared/ipc-types';

/** Claude Code hook_event_name → 会话活动状态；SessionEnd 特殊处理（删会话） */
export const EVENT_ACTIVITY: Record<string, AgentActivity> = {
  SessionStart: 'idle',
  UserPromptSubmit: 'thinking',
  PreToolUse: 'working',
  PostToolUse: 'working',
  Notification: 'waiting', // 权限确认 / 等输入
  Stop: 'done',
};

/**
 * 合成优先级：越靠前越优先对外展示。
 * working/thinking 排在 waiting 之前——「在干活」是刚收到事件的新鲜信号，
 * 而 waiting 是等人的粘滞态，不该让一个挂着的会话盖掉真在跑的会话。
 */
export const PRIORITY: AgentActivity[] = [
  'error',
  'working',
  'thinking',
  'waiting',
  'done',
  'idle',
];

/**
 * 各活动态的存活时长：超时无新事件即视为 idle。
 * 会话正常收尾靠 Stop / SessionEnd；TTL 兜的是异常路径——CLI 崩溃、
 * Notification 之后再没有后续事件。没有 TTL 时残留会话会按优先级把合成
 * 状态钉死到 STALE_MS（10min），桌宠表现为无限循环同一个动作。
 */
export const ACTIVITY_TTL_MS: Record<AgentActivity, number> = {
  error: 60_000,
  waiting: 90_000, // 求关注够久就收声
  working: 180_000, // 单个工具调用可能很久（长命令 / 长编译）
  thinking: 180_000, // 深度思考同理
  done: 45_000,
  idle: Number.POSITIVE_INFINITY,
};

export interface SessionEntry {
  activity: AgentActivity;
  updatedAt: number;
}

/** 会话的对外活动态：超 TTL 未更新即降级为 idle（会话本身留待 sweep 清理） */
export function effectiveActivity(entry: SessionEntry, now: number): AgentActivity {
  return now - entry.updatedAt > ACTIVITY_TTL_MS[entry.activity] ? 'idle' : entry.activity;
}

/** 合成全部会话为单一对外状态；sessions 只计非 idle 的活跃会话 */
export function mergeSessions(
  sessions: Iterable<SessionEntry>,
  now: number,
): AgentStatus {
  let best: AgentActivity = 'idle';
  let active = 0;
  for (const entry of sessions) {
    const a = effectiveActivity(entry, now);
    if (a !== 'idle') active++;
    if (PRIORITY.indexOf(a) < PRIORITY.indexOf(best)) best = a;
  }
  return { activity: best, sessions: active };
}
