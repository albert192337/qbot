/**
 * LLM 脑（自由模式）。
 *
 * 双脑架构（行为体系 spec）：规则脑（behavior-rules.ts，陪伴模式）常驻保底；
 * 自由模式下额外开 LLM 脑——同一条感知事件流，LLM 自己决定「这个瞬间要不要加戏」，
 * 输出的也是行为脚本（扁平字段 → 组装 DSL），走同一个执行器。
 *
 * 设计要点：
 *  - 节流：LLM 慢且花钱，最短思考间隔 15 分钟，且同时只允许一个在飞请求
 *  - 降级：没 key / 关开关 / 网络失败 / 输出非法 → 静默不做（规则脑照跑，用户无感）
 *  - 隐私：只喂聚合账本摘要 + 当前状态，原始事件流/曲名/cwd 绝不进 prompt（见 brain-llm-rules）
 *  - 克制：prompt 强约束「大部分时候不行动」，模型自己也会经常返回 do=false
 */
import { getSettings } from './config';
import { getCharacter } from './characters';
import { chatCompleteWithRetry, LlmError } from './llm-client';
import {
  agentActivityLabel,
  buildBrainMessages,
  parseBrainResponse,
  shouldThink,
  timeLabel,
  type BrainInput,
} from './brain-llm-rules';
import { currentFocus, getSnapshot, onPerceptionChanged, recordBehavior, recordDecision } from './perception';
import { getAgentStatus } from './agent-server';
import { getMeetingStatus } from './meeting-monitor';
import { getMusicStatus } from './music-monitor';
import { PRIORITY, validateScript, type BehaviorScript } from '../shared/behavior-dsl';
import type { PerceptionEvent } from '../shared/perception';

/** 最短思考间隔（LLM 慢且花钱） */
const MIN_THINK_INTERVAL_MS = 15 * 60_000;
/** 给模型选的动作意图词白名单（精选情绪/表现意图；解析层还会再降级到实际可用动作） */
const BRAIN_INTENTS = [
  'happy',
  'smug',
  'sleepy',
  'thinking',
  'annoyed',
  'wave',
  'celebrate',
  'shock',
  'nod',
  'stretch',
  'dance',
  'relaxed',
];

let wired = false;
let lastThinkAt: number | null = null;
let inFlight = false;
/** 行为执行回调（由执行器注册；与规则脑共用一个） */
let executeCallback: ((script: BehaviorScript) => void) | null = null;

export function setBrainExecutor(cb: (script: BehaviorScript) => void): void {
  executeCallback = cb;
}

/** 接线：订阅感知事件流（启动时调一次，幂等） */
export function wireBrain(): void {
  if (wired) return;
  wired = true;

  onPerceptionChanged((ev) => {
    // 只在「有意义的边沿」思考：切应用 / agent 跑完 / 离会 / 放歌 / 启动。
    // 高频/无意义事件（meeting 入会、music 暂停、拖拽中）不触发。
    if (shouldThinkForEvent(ev)) {
      void think(ev.type);
    }
  });
}

function shouldThinkForEvent(ev: PerceptionEvent): boolean {
  switch (ev.type) {
    case 'app_focus':
    case 'startup':
      return true;
    case 'agent':
      return ev.activity === 'done';
    case 'meeting':
      return ev.inMeeting === false; // 离会
    case 'music':
      return ev.playing === true; // 开始放歌
    default:
      return false;
  }
}

/** 一次思考：节流 → 检查开关/key → 构造上下文 → 调模型 → 解析 → 执行或降级 */
async function think(trigger: string): Promise<void> {
  const now = Date.now();
  if (!shouldThink(now, lastThinkAt, MIN_THINK_INTERVAL_MS)) return;
  if (inFlight) return;

  const settings = await getSettings();
  // 自由模式开关 + 有 key 才思考（陪伴模式纯规则脑）
  if (!settings.freeMode || !settings.arkApiKey) return;

  inFlight = true;
  lastThinkAt = now; // 占用冷却（哪怕这次失败也不立刻重试，避免坏 key 刷请求）
  try {
    const input = await buildInput();
    const messages = buildBrainMessages(input);
    let raw: string;
    try {
      raw = await chatCompleteWithRetry({ apiKey: settings.arkApiKey, messages });
    } catch (err) {
      // 网络/限流/鉴权失败：静默降级，记一条决策日志供调试
      const reason = err instanceof LlmError ? err.message : String(err);
      void recordDecision({
        at: now,
        trigger: `llm:${trigger}`,
        snapshot: { freeMode: true },
        candidates: [],
        selected: null,
        skippedReason: `LLM 调用失败：${reason.slice(0, 120)}`,
      });
      return;
    }

    const decision = parseBrainResponse(raw, BRAIN_INTENTS);
    if (!decision) {
      void recordDecision({
        at: now,
        trigger: `llm:${trigger}`,
        snapshot: { raw: raw.slice(0, 200) },
        candidates: [],
        selected: null,
        skippedReason: 'LLM 输出无法解析为 JSON',
      });
      return;
    }

    // 想法始终记日记（两幕结构的容器，阶段 E 用）
    void recordBehavior({ at: now, kind: 'journal', detail: decision.thought });

    if (!decision.do) {
      void recordDecision({
        at: now,
        trigger: `llm:${trigger}`,
        snapshot: { thought: decision.thought },
        candidates: [],
        selected: null,
        skippedReason: `模型选择不行动：${decision.thought}`,
      });
      return;
    }

    // 组装行为脚本（模型只给扁平字段，主进程拼 DSL + 校验）
    const script = buildScript(decision);
    if (!script) {
      void recordDecision({
        at: now,
        trigger: `llm:${trigger}`,
        snapshot: { thought: decision.thought },
        candidates: [],
        selected: null,
        skippedReason: '决策无动作也无台词',
      });
      return;
    }
    const v = validateScript(script);
    if (!v.ok) {
      void recordDecision({
        at: now,
        trigger: `llm:${trigger}`,
        snapshot: { errors: v.errors },
        candidates: [],
        selected: null,
        skippedReason: `脚本校验失败：${v.errors.join('; ')}`,
      });
      return;
    }

    void recordDecision({
      at: now,
      trigger: `llm:${trigger}`,
      snapshot: { thought: decision.thought, action: decision.action, say: decision.say },
      candidates: [{ id: 'llm-brain', score: 1, reason: decision.thought }],
      selected: { action: 'llm-brain', text: decision.say ?? decision.action },
    });
    executeCallback?.(script);
  } finally {
    inFlight = false;
  }
}

/** 把模型决策组装成 BehaviorScript（动作意图 + 台词）。调用前已确保 do=true */
function buildScript(d: { action?: string; say?: string }): BehaviorScript | null {
  if (!d.action && !d.say) return null;
  const steps: BehaviorScript['steps'] = [];
  if (d.action) steps.push({ op: 'play', action: d.action, loops: 1 });
  if (d.say) steps.push({ op: 'say', text: d.say });
  return {
    meta: {
      id: 'llm-brain',
      priority: PRIORITY.COMMENT, // 不抢 agent/会议等高优先级
      source: 'llm',
      reason: 'LLM 自由发挥',
      cooldownMs: MIN_THINK_INTERVAL_MS,
    },
    steps,
  };
}

/** 从当前全局状态构造喂给模型的上下文 */
async function buildInput(): Promise<BrainInput> {
  const settings = await getSettings();
  const focus = currentFocus();
  const agent = getAgentStatus();
  const meeting = getMeetingStatus();
  const music = getMusicStatus();
  const snap = await getSnapshot();

  // 人设：激活角色的名字 + persona
  let personaName = '桌宠';
  let personaTraits: string | undefined;
  try {
    if (settings.activeCharacter) {
      const meta = await getCharacter(settings.activeCharacter);
      if (meta?.manifest) {
        personaName = meta.manifest.name || personaName;
        personaTraits = meta.manifest.persona || undefined;
      }
    }
  } catch {
    /* 人设拿不到就用默认 */
  }

  // 账本摘要
  const apps = Object.entries(snap.ledger.apps)
    .map(([name, s]) => ({ name, switches: s.switches }))
    .sort((a, b) => b.switches - a.switches)
    .slice(0, 4);
  const activeMinutes = snap.ledger.firstActivityAt
    ? Math.round((Date.now() - snap.ledger.firstActivityAt) / 60_000)
    : 0;

  // 最近说过的台词（行为史里 kind=say）
  const recentLines = snap.behaviors
    .filter((b) => b.kind === 'say' && b.detail)
    .map((b) => b.detail as string)
    .slice(0, 5);

  return {
    personaName,
    personaTraits,
    timeLabel: timeLabel(new Date()),
    currentApp: focus.app,
    todaySwitches: snap.ledger.totalSwitches,
    activeMinutes,
    topApps: apps,
    agentLabel: agentActivityLabel(agent.activity || 'idle'),
    inMeeting: !!meeting.inMeeting,
    musicPlaying: !!music.playing,
    recentLines,
    availableIntents: BRAIN_INTENTS,
  };
}

/** 调试：手动触发一次思考（绕过节流，仍受开关/key 限制） */
export async function debugThink(): Promise<void> {
  lastThinkAt = null;
  await think('debug');
}
