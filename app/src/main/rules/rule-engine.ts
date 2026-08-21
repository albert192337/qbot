/**
 * 规则引擎纯逻辑（不含 IO，可单测）。
 *
 * 流程：
 *  1. 触发 → 收集符合 trigger 的规则
 *  2. 逐条评估条件（全部 AND）→ 候选集
 *  3. 仲裁：冷却 / 每日上限 / 同组互斥 / 预算 → 最终候选
 *  4. 加权抽选 → 选出一条
 *  5. 生成 BehaviorScript（填台词 + 解析动作）
 *
 * 同 progress-rules.ts / perception-rules.ts 模式：纯函数放这里测，
 * IO（读取规则文件、记冷却/上限）在 behavior-rules.ts 里包。
 */
import { resolveAction } from '../action-resolver';
import {
  PRIORITY,
  makePlaySayScript,
  makeSayScript,
  type BehaviorScript,
} from '../../shared/behavior-dsl';
import type {
  BehaviorRule,
  RuleCondition,
  RuleContext,
  RuleEvalResult,
  WeightedLine,
} from '../../shared/rule-types';

/**
 * 评估单条规则是否命中。
 * 返回 matched + 失败的条件索引（调试用）。
 */
export function evaluateRule(rule: BehaviorRule, ctx: RuleContext): RuleEvalResult {
  const failed: number[] = [];

  for (let i = 0; i < rule.conditions.length; i++) {
    if (!checkCondition(rule.conditions[i], ctx)) {
      failed.push(i);
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched: failed.length === 0,
    failedConditions: failed.length > 0 ? failed : undefined,
    score: failed.length === 0 ? rule.weight : 0,
  };
}

/** 评估单个条件是否满足 */
export function checkCondition(cond: RuleCondition, ctx: RuleContext): boolean {
  const { now, currentApp, todayLedger, agent, inMeeting, musicPlaying } = ctx;
  const hour = now.getHours();
  const minute = now.getMinutes();

  switch (cond.kind) {
    // ── 时间 ──
    case 'time_range': {
      const curMin = hour * 60 + minute;
      const [fromH, fromM] = cond.from.split(':').map(Number);
      const [toH, toM] = cond.to.split(':').map(Number);
      const fromMin = fromH * 60 + fromM;
      const toMin = toH * 60 + toM;
      if (fromMin <= toMin) {
        return curMin >= fromMin && curMin < toMin;
      }
      // 跨零点（如 23:00 ~ 05:00）
      return curMin >= fromMin || curMin < toMin;
    }
    case 'weekday':
      return cond.days.includes(now.getDay());
    case 'hour_at_least':
      return hour >= cond.hour;
    case 'hour_at_most':
      return hour <= cond.hour;

    // ── 使用情况 ──
    case 'app_is':
      return currentApp?.toLowerCase() === cond.app.toLowerCase();
    case 'app_contains':
      return currentApp?.toLowerCase().includes(cond.keyword.toLowerCase()) ?? false;
    case 'app_switches_ge':
      return todayLedger.totalSwitches >= cond.count;
    case 'active_minutes_ge': {
      if (!todayLedger.firstActivityAt) return false;
      const minutes = (now.getTime() - todayLedger.firstActivityAt) / 60000;
      return minutes >= cond.minutes;
    }
    case 'idle_minutes_ge': {
      if (!todayLedger.lastActivityAt) return false;
      const minutes = (now.getTime() - todayLedger.lastActivityAt) / 60000;
      return minutes >= cond.minutes;
    }

    // ── agent ──
    case 'agent_active':
      if (cond.activity) return agent.activity === cond.activity;
      return agent.activity !== 'idle' && agent.activity !== 'done';
    case 'agent_sessions_ge':
      return agent.sessions >= cond.count;
    case 'agent_consecutive_errors_ge':
      return agent.consecutiveErrors >= cond.count;

    // ── 会议 / 音乐 ──
    case 'in_meeting':
      return inMeeting;
    case 'not_in_meeting':
      return !inMeeting;
    case 'music_playing':
      return musicPlaying;
    case 'music_not_playing':
      return !musicPlaying;

    // ── 交互 ──
    case 'since_last_interact_ge':
      return ctx.sinceLastInteractMs >= cond.minutes * 60_000;
    case 'since_last_interact_lt':
      return ctx.sinceLastInteractMs < cond.minutes * 60_000;

    // ── 行为史（调用方在外部检查，这里直接过；真正的过滤在仲裁层做）
    case 'behavior_not_in':
      // 纯条件层不查行为史（需要 IO），由调用方在仲裁层跳过
      return true;

    // ── 随机 ──
    case 'random_chance':
      return Math.random() < cond.p;

    // ── 特殊 ──
    case 'first_time_today':
      // 由调用方用 dailyLimit=1 实现，这里默认过
      return true;
    case 'monday_feeling':
      // 周一 9:00 ~ 11:00
      return now.getDay() === 1 && hour >= 9 && hour < 11;

    default:
      // 未知条件 → 保守起见不命中（避免规则静默失效）
      return false;
  }
}

/**
 * 从候选规则里按权重随机选一条。
 * 权重都为 0 时返回 null。
 */
export function pickWeighted(candidates: BehaviorRule[]): BehaviorRule | null {
  if (candidates.length === 0) return null;
  const totalWeight = candidates.reduce((sum, r) => sum + (r.weight || 1), 0);
  if (totalWeight <= 0) return candidates[0];

  let r = Math.random() * totalWeight;
  for (const rule of candidates) {
    r -= rule.weight || 1;
    if (r <= 0) return rule;
  }
  return candidates[candidates.length - 1];
}

/**
 * 从规则的台词列表里按权重选一条。
 */
export function pickLine(lines: WeightedLine[] | undefined): string | null {
  if (!lines || lines.length === 0) return null;
  const total = lines.reduce((s, l) => s + l.weight, 0);
  if (total <= 0) return lines[0].text;
  let r = Math.random() * total;
  for (const l of lines) {
    r -= l.weight;
    if (r <= 0) return l.text;
  }
  return lines[lines.length - 1].text;
}

/**
 * 把一条命中的规则 + 上下文 → 生成 BehaviorScript。
 * 步骤：解析动作意图 → 选台词 → 组装 steps。
 */
export function buildScriptFromRule(
  rule: BehaviorRule,
  ctx: RuleContext,
): BehaviorScript | null {
  const tmpl = rule.behavior;
  const priority = rule.priority ?? PRIORITY.COMMENT;
  const line = pickLine(tmpl.lines);

  // 动作解析
  let action: string | null = null;
  if (tmpl.actionIntent) {
    const resolved = resolveAction(tmpl.actionIntent, ctx.availableActions, ctx.actionOverride);
    action = resolved.action;
  }

  // 没有动作也没有台词 → 跳过（空行为没意义）
  if (!action && !line && !tmpl.signText) return null;

  const steps: BehaviorScript['steps'] = [];

  if (tmpl.preDelayMs) steps.push({ op: 'wait', ms: tmpl.preDelayMs });

  if (action) steps.push({ op: 'play', action, loops: tmpl.actionLoops ?? 1 });
  if (line) steps.push({ op: 'say', text: line, durationMs: tmpl.sayDurationMs });
  if (tmpl.signText !== undefined) steps.push({ op: 'sign', text: tmpl.signText });

  if (tmpl.postDelayMs) steps.push({ op: 'wait', ms: tmpl.postDelayMs });

  if (steps.length === 0) return null;

  return {
    meta: {
      id: rule.id,
      priority,
      weight: rule.weight,
      cooldownMs: rule.cooldownMs,
      dailyLimit: rule.dailyLimit,
      source: rule.source === 'test' ? 'debug' : 'rule',
      reason: rule.description,
    },
    steps,
  };
}

/**
 * 同组互斥过滤：每组只保留权重最高的那一条。
 * 没分组的不受影响。
 */
export function applyGroupMutex(rules: BehaviorRule[]): BehaviorRule[] {
  const groupBest = new Map<string, BehaviorRule>();
  const ungrouped: BehaviorRule[] = [];

  for (const rule of rules) {
    if (!rule.group) {
      ungrouped.push(rule);
      continue;
    }
    const cur = groupBest.get(rule.group);
    if (!cur || (rule.weight || 1) > (cur.weight || 1)) {
      groupBest.set(rule.group, rule);
    }
  }

  return [...ungrouped, ...groupBest.values()];
}

/**
 * 收集命中的规则（不含仲裁层）。
 * 返回按权重降序排列的命中列表。
 */
export function findMatches(
  rules: BehaviorRule[],
  trigger: string,
  ctx: RuleContext,
): Array<{ rule: BehaviorRule; result: RuleEvalResult }> {
  const triggerRules = rules.filter((r) => r.trigger.includes(trigger as any));
  const results: Array<{ rule: BehaviorRule; result: RuleEvalResult }> = [];

  for (const rule of triggerRules) {
    const r = evaluateRule(rule, ctx);
    if (r.matched) results.push({ rule, result: r });
  }

  // 按权重降序
  results.sort((a, b) => (b.rule.weight || 1) - (a.rule.weight || 1));
  return results;
}

// 导出给单测用的 helper
export const _test = { timeToMin: (h: number, m: number) => h * 60 + m };
