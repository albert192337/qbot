/**
 * 行为规则调度器（IO 层 + 仲裁层）。
 *
 * 职责：
 *  - 加载内置规则（app 打包后 rules/ 目录下的 JSON）
 *  - 订阅感知事件流（onPerceptionChanged），把事件边沿映射成规则 trigger
 *  - trigger 进来 → 构造 RuleContext → 命中 → 仲裁 → 选一条 → 交给执行器
 *  - 维护冷却表、每日计数表、每日总预算
 *  - 记录决策日志（给调试面板看）
 *
 * 纯逻辑在 rules/rule-engine.ts，这里只做 IO 和状态维护。
 * 依赖方向：本模块 → perception / agent-server / meeting / music（都不反向依赖本模块，
 * 所以 agent-server 等只 emitEvent，不 import 这里——避免环）。
 */
import {
  applyGroupMutex,
  buildScriptFromRule,
  evaluateRule,
  pickWeighted,
} from './rules/rule-engine';
import { BUILTIN_RULES } from './rules/builtin-rules';
import {
  currentFocus,
  emitEvent,
  getSnapshot,
  onPerceptionChanged,
  recordDecision,
} from './perception';
import { todayKey } from './perception-rules';
import { getAgentStatus } from './agent-server';
import { getMeetingStatus } from './meeting-monitor';
import { getMusicStatus } from './music-monitor';
import type { BehaviorScript } from '../shared/behavior-dsl';
import type { BehaviorRule, RuleContext, RuleTrigger } from '../shared/rule-types';

/** 全局规则表（内存） */
let rules: BehaviorRule[] = [];
/** 冷却表：ruleId → 上次触发时间戳 */
const cooldownMap = new Map<string, number>();
/** 每日计数表：dateKey → ruleId → count */
const dailyCountMap = new Map<string, Map<string, number>>();
/** 行为执行回调（由 behavior-executor 注册） */
let executeCallback: ((script: BehaviorScript) => void) | null = null;
/** 可用动作列表获取函数（由主进程入口注册） */
let getAvailableActions: (() => string[]) | null = null;
/** 用户动作映射覆盖 */
let actionOverride: Record<string, string> = {};
/** 规则加载状态 */
let loaded = false;
/** 接线是否已做（防重复订阅） */
let wired = false;
/** agent 连续 error 计数（非 error 活动清零） */
let consecutiveErrors = 0;
/** 上一个 agent 活动（算 error 边沿用） */
let lastAgentActivity = 'idle';
/** 上次整点（hour_chime 用） */
let lastChimeHour = -1;
/** 感知兜底 tick（perception_tick 用） */
let tickTimer: ReturnType<typeof setInterval> | null = null;
/** 应用启动时刻（sinceStartupMs 用） */
let startupAt = Date.now();

/** 预算硬上限：每天最多触发多少次行为（防止太吵） */
const DAILY_BUDGET = 50;
/** perception_tick 间隔（低频兜底，规则靠它做「过一会儿看看」） */
const TICK_MS = 10 * 60_000;

// ── 注册口（主进程入口接线）─────────────────────────────────

/** 注册行为执行回调（执行器启动时调用） */
export function setBehaviorExecutor(cb: (script: BehaviorScript) => void): void {
  executeCallback = cb;
}

/** 注册「当前可用动作列表」的获取函数（pet 窗激活角色后可拿 PlayableId 列表） */
export function setAvailableActionsGetter(fn: () => string[]): void {
  getAvailableActions = fn;
}

/** 设置用户动作映射覆盖 */
export function setActionOverride(map: Record<string, string>): void {
  actionOverride = { ...map };
}

// ── 规则加载 ───────────────────────────────────────────────

/** 加载内置规则（启动时调用一次；规则表内联在 TS 模块里，零 IO） */
export async function loadBuiltinRules(): Promise<void> {
  rules = [...BUILTIN_RULES];
  loaded = true;
  console.log(`[behavior-rules] 加载了 ${rules.length} 条内置规则`);
}

/** 手动添加/替换规则（测试 / 动态注入用） */
export function upsertRule(rule: BehaviorRule): void {
  const idx = rules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) rules[idx] = rule;
  else rules.push(rule);
}

/** 获取所有规则（调试面板展示用） */
export function getAllRules(): BehaviorRule[] {
  return [...rules];
}

// ── 事件 → trigger 映射（事件边沿触发）──────────────────────

/**
 * 接线：订阅感知事件流，把事件边沿翻译成规则 trigger。
 * 启动时调一次；幂等（wired 标志防重复订阅）。
 */
export function wireBehaviorTriggers(): void {
  if (wired) return;
  wired = true;
  startupAt = Date.now();

  onPerceptionChanged((ev) => {
    // 每类事件翻译成 trigger；一次事件最多映射一个 trigger
    switch (ev.type) {
      case 'app_focus':
        void triggerRules('app_switch');
        break;
      case 'agent': {
        // error 连击计数（规则条件用）；done 是「跑完一轮」的边沿
        if (ev.activity === 'error') {
          consecutiveErrors++;
        } else if (ev.activity !== 'idle') {
          consecutiveErrors = 0;
        }
        if (ev.activity === 'done' && lastAgentActivity !== 'done') {
          void triggerRules('agent_stop');
        } else if (ev.activity === 'error' && lastAgentActivity !== 'error') {
          void triggerRules('agent_error');
        }
        lastAgentActivity = ev.activity;
        break;
      }
      case 'meeting':
        if (!ev.inMeeting) void triggerRules('meeting_end');
        break;
      case 'music':
        if (ev.playing) void triggerRules('music_start');
        else void triggerRules('music_end');
        break;
      case 'interact':
        if (ev.kind === 'click') void triggerRules('pet_click');
        else if (ev.kind === 'drag_end') void triggerRules('pet_drag_end');
        break;
      case 'startup':
        void triggerRules('startup');
        break;
    }
  });

  // 整点报时：每分钟看一眼，跨整点触发 hour_chime
  const chimeTimer = setInterval(() => {
    const h = new Date().getHours();
    if (h !== lastChimeHour) {
      lastChimeHour = h;
      if (lastChimeHour !== -1) void triggerRules('hour_chime');
    }
  }, 30_000);
  if (chimeTimer.unref) chimeTimer.unref();

  // 低频兜底 tick（「过一会儿看看现在什么情况」类规则）
  tickTimer = setInterval(() => {
    void triggerRules('perception_tick');
  }, TICK_MS);
  if (tickTimer.unref) tickTimer.unref();
}

// ── RuleContext 构造 ───────────────────────────────────────

/** 从事件流里找最后一条 interact 事件距今多久（找不到 = 很久） */
function getLastInteractFromSnapshot(events: Array<{ type: string; at: number }>): number {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'interact') return Date.now() - events[i].at;
  }
  return 999_999_999;
}

/** 异步构造评估上下文（真账本 + 各监控器当前状态） */
async function buildContextAsync(now: Date): Promise<RuleContext> {
  const focus = currentFocus();
  const agent = getAgentStatus();
  const meeting = getMeetingStatus();
  const music = getMusicStatus();
  const snap = await getSnapshot();
  const available = getAvailableActions ? getAvailableActions() : ['idle', 'drag'];

  return {
    now,
    currentApp: focus.app,
    currentAppMs: focus.since ? now.getTime() - focus.since : 0,
    todayLedger: {
      totalSwitches: snap.ledger.totalSwitches,
      apps: snap.ledger.apps as Record<string, { focusMs: number; switches: number }>,
      firstActivityAt: snap.ledger.firstActivityAt,
      lastActivityAt: snap.ledger.lastActivityAt,
    },
    agent: {
      activity: agent.activity || 'idle',
      sessions: agent.sessions || 0,
      consecutiveErrors,
    },
    inMeeting: !!meeting.inMeeting,
    musicPlaying: !!music.playing,
    sinceLastInteractMs: getLastInteractFromSnapshot(snap.events),
    availableActions: available,
    actionOverride,
    sinceStartupMs: now.getTime() - startupAt,
  };
}

// ── 触发评估主流程 ─────────────────────────────────────────

/**
 * 触发评估：某个 trigger 边沿进来了，跑一轮规则匹配，选一条执行。
 * 没命中 / 预算超了 / 全部冷却 → 什么都不做，记一条决策日志。
 */
export async function triggerRules(trigger: RuleTrigger): Promise<void> {
  if (!loaded) await loadBuiltinRules();
  if (rules.length === 0) return;

  const now = new Date();
  const ctx = await buildContextAsync(now);
  const dateKey = todayKey(now);

  // 1. 筛选命中规则（条件 + 仲裁一起过，没过的记原因）
  const triggerables = rules.filter((r) => r.trigger.includes(trigger));
  const candidates: BehaviorRule[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const rule of triggerables) {
    const result = evaluateRule(rule, ctx);
    if (!result.matched) {
      skipped.push({ id: rule.id, reason: `条件不满足 (${result.failedConditions?.join(',')})` });
      continue;
    }

    // 冷却
    const last = cooldownMap.get(rule.id);
    if (last && rule.cooldownMs && now.getTime() - last < rule.cooldownMs) {
      skipped.push({ id: rule.id, reason: '冷却中' });
      continue;
    }

    // 每日上限
    if (rule.dailyLimit && rule.dailyLimit > 0) {
      const count = dailyCountMap.get(dateKey)?.get(rule.id) ?? 0;
      if (count >= rule.dailyLimit) {
        skipped.push({ id: rule.id, reason: '今日已达上限' });
        continue;
      }
    }

    // 总预算
    if (getTodayTotal(dateKey) >= DAILY_BUDGET) {
      skipped.push({ id: rule.id, reason: '今日总预算已满' });
      continue;
    }

    candidates.push(rule);
  }

  // 2. 同组互斥 + 加权抽选
  const selected = pickWeighted(applyGroupMutex(candidates));

  if (!selected) {
    void recordDecision({
      at: now.getTime(),
      trigger,
      snapshot: {
        app: ctx.currentApp,
        hour: now.getHours(),
        inMeeting: ctx.inMeeting,
        music: ctx.musicPlaying,
        agent: ctx.agent.activity,
      },
      candidates: candidates.map((c) => ({ id: c.id, score: c.weight, reason: c.name })),
      selected: null,
      skippedReason:
        skipped.length > 0
          ? skipped.slice(0, 5).map((s) => `${s.id}: ${s.reason}`).join('; ')
          : triggerables.length === 0
            ? '没有规则监听此事件'
            : '命中但全部被仲裁拦下',
    });
    return;
  }

  // 3. 生成脚本
  const script = buildScriptFromRule(selected, ctx);
  if (!script) {
    void recordDecision({
      at: now.getTime(),
      trigger,
      snapshot: {},
      candidates: [{ id: selected.id, score: selected.weight, reason: selected.name }],
      selected: null,
      skippedReason: '行为模板为空，无法生成脚本',
    });
    return;
  }

  // 4. 记冷却 + 每日计数
  cooldownMap.set(selected.id, now.getTime());
  const dayMap = dailyCountMap.get(dateKey) ?? new Map();
  dayMap.set(selected.id, (dayMap.get(selected.id) ?? 0) + 1);
  dailyCountMap.set(dateKey, dayMap);
  pruneDailyCounts();

  // 5. 记决策日志 + 交给执行器
  const sayStep = script.steps.find((s) => s.op === 'say');
  void recordDecision({
    at: now.getTime(),
    trigger,
    snapshot: { app: ctx.currentApp, hour: now.getHours() },
    candidates: candidates.map((c) => ({ id: c.id, score: c.weight, reason: c.name })),
    selected: {
      action: selected.id,
      text: sayStep && sayStep.op === 'say' ? sayStep.text : undefined,
    },
  });
  executeCallback?.(script);
}

/** 今日已触发总数（含所有规则） */
function getTodayTotal(dateKey: string): number {
  const dayMap = dailyCountMap.get(dateKey);
  if (!dayMap) return 0;
  let total = 0;
  for (const v of dayMap.values()) total += v;
  return total;
}

/** 清理过期的每日计数（只留今天和昨天） */
function pruneDailyCounts(): void {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  for (const k of dailyCountMap.keys()) {
    if (k !== today && k !== yesterday) dailyCountMap.delete(k);
  }
}

/** 停掉兜底 tick（退出清理用） */
export function stopBehaviorScheduler(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

/** 调试用：手动触发一条规则（绕过条件检查和仲裁） */
export function debugTrigger(ruleId: string): void {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return;
  const ctx: RuleContext = {
    now: new Date(),
    currentApp: 'Debug',
    currentAppMs: 0,
    todayLedger: { totalSwitches: 0, apps: {} },
    agent: { activity: 'idle', sessions: 0, consecutiveErrors: 0 },
    inMeeting: false,
    musicPlaying: false,
    sinceLastInteractMs: 0,
    availableActions: getAvailableActions ? getAvailableActions() : ['idle', 'drag'],
    actionOverride,
    sinceStartupMs: 0,
  };
  const script = buildScriptFromRule(rule, ctx);
  if (script) {
    script.meta.source = 'debug';
    executeCallback?.(script);
    void emitEvent({ type: 'interact', at: Date.now(), kind: 'click' }); // 让面板刷得到
  }
}
