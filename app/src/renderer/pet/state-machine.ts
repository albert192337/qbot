/**
 * 桌宠状态机：纯逻辑，不碰 DOM（vitest 可单测）。
 * 状态：idle（loop 常驻）/ auto（随机动作，播 1~3 遍回 idle）/ drag（指针按住）
 *      / visit（串门）/ agent（Claude Code 等在干活，粘性循环直到活动结束）。
 * 调度：idle 时随机 30s~3min 触发一次 auto。
 * 优先级：drag > agent > auto/idle（drag 中忽略 agent 事件，由入口层在
 * POINTER_UP 后重发最新 AGENT_STATUS 恢复）。
 */
import type { ActionId, PlayableId } from '@qbot/pipeline';
import type { AgentActivity } from '../../shared/ipc-types';

export type PetState =
  | { kind: 'idle' }
  | { kind: 'auto'; action: PlayableId; loopsLeft: number }
  | { kind: 'drag' }
  | { kind: 'visit'; action: PlayableId; loopsLeft: number }
  | { kind: 'agent'; activity: AgentActivity; action: PlayableId }
  | { kind: 'music'; action: PlayableId };

export type PetEvent =
  | { type: 'POINTER_DOWN' }
  | { type: 'POINTER_UP' }
  | { type: 'TIMER_FIRE' }
  | { type: 'VIDEO_ENDED' }
  | { type: 'PLAY_ACTION'; action: PlayableId }
  | { type: 'VISIT_START'; action: PlayableId; loops: number }
  | { type: 'VISIT_END' }
  | { type: 'AGENT_STATUS'; activity: AgentActivity }
  | { type: 'MUSIC_STATUS'; playing: boolean };

/**
 * agent 活动 → 桌宠动作（done 走一次性庆祝，idle 走退出，不在表内）。
 * waiting 不用 drag：drag 是「被指针按住」的动画，粘性循环下表现为无限蹦跳，
 * 看着像卡死而不是在等人；talk_annoyed（催一下）更贴「该你了」。
 * error 目前无事件可达（EVENT_ACTIVITY 里没有映射到 error 的 hook），
 * 所以与 waiting 共用动作暂不产生歧义。
 */
export const AGENT_ACTION: Record<
  Exclude<AgentActivity, 'idle' | 'done'>,
  ActionId
> = {
  thinking: 'tea',
  working: 'tea',
  waiting: 'talk_annoyed',
  error: 'talk_annoyed',
};

/** 回合完成的庆祝动作与遍数 */
export const DONE_ACTION: ActionId = 'sleep';
export const DONE_LOOPS = 1;

/** 音乐播放时的默认摇摆动作 */
export const DEFAULT_MUSIC_ACTION: ActionId = 'talk_happy';

export interface StepResult {
  state: PetState;
  /** 需要切换播放的动作（undefined = 不换） */
  play?: PlayableId;
  /** 重排调度定时器（回到 idle 时） */
  rescheduleTimer?: boolean;
  /** 清除调度定时器（离开 idle 时） */
  clearTimer?: boolean;
  /** visit 模式下访客动作播完一遍 */
  visiterDone?: boolean;
  /** visit 模式下访客动作重播 */
  visiterReplay?: boolean;
  /** VISIT_START 信号：访客来了，外部需创建访客 Player 并开始播放 */
  visiterStart?: boolean;
  /** 访客要播放的动作 */
  visiterAction?: PlayableId;
  /** VISIT_END 信号：访客离开，外部需移除访客 Player */
  visiterEnd?: boolean;
}

export const SCHEDULE_MIN_MS = 30_000;
export const SCHEDULE_MAX_MS = 180_000;
export const AUTO_LOOPS_MIN = 1;
export const AUTO_LOOPS_MAX = 3;

export interface SchedulerRng {
  /** [0,1) */
  random(): number;
}

/** step() 的上下文：可用动作 + 可选覆盖配置 */
export interface StepContext {
  available: PlayableId[];
  rng: SchedulerRng;
  /** Agent 活动 → 动作映射覆盖（缺省回退 AGENT_ACTION） */
  agentActionMap?: Partial<Record<string, PlayableId>>;
  /** 回合完成庆祝动作覆盖（缺省 DONE_ACTION） */
  doneAction?: PlayableId;
  /** 庆祝动作遍数覆盖（缺省 DONE_LOOPS） */
  doneLoops?: number;
  /** 音乐摇摆动作覆盖（缺省 DEFAULT_MUSIC_ACTION） */
  musicAction?: PlayableId;
}

export function randomDelay(rng: SchedulerRng): number {
  return SCHEDULE_MIN_MS + Math.floor(rng.random() * (SCHEDULE_MAX_MS - SCHEDULE_MIN_MS));
}

export function pickAutoAction(
  available: PlayableId[],
  rng: SchedulerRng,
): { action: PlayableId; loops: number } | null {
  // 可自主播放的动作：done 且非 idle/drag（由调用方过滤 status，这里过滤语义）
  const pool = available.filter((a) => a !== 'idle' && a !== 'drag');
  if (pool.length === 0) return null;
  const action = pool[Math.floor(rng.random() * pool.length)];
  const loops =
    AUTO_LOOPS_MIN + Math.floor(rng.random() * (AUTO_LOOPS_MAX - AUTO_LOOPS_MIN + 1));
  return { action, loops };
}

export function step(
  state: PetState,
  event: PetEvent,
  ctx: StepContext,
): StepResult {
  switch (event.type) {
    case 'POINTER_DOWN':
      // 任何状态被按住都进 drag；visit 中拖拽 = 提前结束串门
      if (state.kind === 'drag') return { state };
      return {
        state: { kind: 'drag' },
        play: 'drag',
        clearTimer: true,
        visiterEnd: state.kind === 'visit' ? true : undefined,
      };

    case 'POINTER_UP':
      if (state.kind !== 'drag') return { state };
      return { state: { kind: 'idle' }, play: 'idle', rescheduleTimer: true };

    case 'TIMER_FIRE': {
      if (state.kind !== 'idle') return { state }; // 非 idle（含 agent/music）忽略迟到的定时器
      const picked = pickAutoAction(ctx.available, ctx.rng);
      if (!picked) return { state, rescheduleTimer: true };
      return {
        state: { kind: 'auto', action: picked.action, loopsLeft: picked.loops },
        play: picked.action,
        clearTimer: true,
      };
    }

    case 'VIDEO_ENDED': {
      // agent / music 态粘性循环：播完手动重播
      if (state.kind === 'agent') return { state, play: state.action };
      if (state.kind === 'music') return { state, play: state.action };
      if (state.kind === 'visit') {
        const left = state.loopsLeft - 1;
        if (left <= 0) {
          return { state: { kind: 'visit', action: state.action, loopsLeft: state.loopsLeft }, visiterDone: true };
        }
        return { state: { ...state, loopsLeft: left }, play: state.action, visiterReplay: true };
      }
      if (state.kind !== 'auto') return { state }; // idle 是 loop，drag 播完接着循环
      const left = state.loopsLeft - 1;
      if (left <= 0) {
        return { state: { kind: 'idle' }, play: 'idle', rescheduleTimer: true };
      }
      // 还要再播：同一动作重播（play 同值让播放器 restart）
      return { state: { ...state, loopsLeft: left }, play: state.action };
    }

    case 'PLAY_ACTION': {
      // 用户主动触发：拖拽中/串门中忽略，其余状态（含 agent/music）立即切（播 1 遍回 idle）
      if (state.kind === 'drag' || state.kind === 'visit') return { state };
      if (!ctx.available.includes(event.action)) return { state };
      return {
        state: { kind: 'auto', action: event.action, loopsLeft: 1 },
        play: event.action,
        clearTimer: true,
      };
    }

    case 'VISIT_START': {
      // 来串门了：进 visit 状态，暂停自动调度
      if (state.kind === 'drag') return { state };
      return {
        state: { kind: 'visit', action: event.action, loopsLeft: event.loops },
        visiterStart: true,
        visiterAction: event.action,
        clearTimer: true,
      };
    }

    case 'VISIT_END': {
      // 串门结束：回 idle
      if (state.kind !== 'visit') return { state };
      return { state: { kind: 'idle' }, play: 'idle', visiterEnd: true, rescheduleTimer: true };
    }

    case 'AGENT_STATUS': {
      // drag 优先：入口层会在 POINTER_UP 后重发最新状态
      // visit 中也忽略：串门期间不被打断
      if (state.kind === 'drag' || state.kind === 'visit') return { state };
      const { activity } = event;
      if (activity === 'idle') {
        // 活动结束：只有 agent 态需要退出；auto/idle 不受影响
        if (state.kind !== 'agent') return { state };
        return { state: { kind: 'idle' }, play: 'idle', rescheduleTimer: true };
      }
      if (activity === 'done') {
        // 一次性庆祝：入口层收到 done 后即视为 idle，不会重复触发
        const doneAction = ctx.doneAction ?? DONE_ACTION;
        const doneLoops = ctx.doneLoops ?? DONE_LOOPS;
        const action = ctx.available.includes(doneAction) ? doneAction : null;
        if (!action) {
          if (state.kind !== 'agent') return { state };
          return { state: { kind: 'idle' }, play: 'idle', rescheduleTimer: true };
        }
        return {
          state: { kind: 'auto', action, loopsLeft: doneLoops },
          play: action,
          clearTimer: true,
        };
      }
      // 进行中的活动：映射动作缺失（生成失败的角色）退化为 idle 动画但保持 agent 态
      const mapped = ctx.agentActionMap?.[activity] ?? AGENT_ACTION[activity];
      const action = ctx.available.includes(mapped) ? mapped : 'idle';
      if (state.kind === 'agent' && state.action === action) {
        // 动作不变只更新语义（如 working→thinking 同动作时不重播）
        if (state.activity === activity) return { state };
        return { state: { ...state, activity } };
      }
      return {
        state: { kind: 'agent', activity, action },
        play: action,
        clearTimer: true,
      };
    }

    case 'MUSIC_STATUS': {
      // 优先级：drag > agent > visit > music
      if (state.kind === 'drag' || state.kind === 'agent' || state.kind === 'visit') return { state };
      const { playing } = event;
      if (!playing) {
        // 音乐停止：只有 music 态回 idle
        if (state.kind !== 'music') return { state };
        return { state: { kind: 'idle' }, play: 'idle', rescheduleTimer: true };
      }
      // 音乐开始：播放音乐动作（优先用自定义，缺省走 talk_happy）
      const musicAction = ctx.musicAction ?? DEFAULT_MUSIC_ACTION;
      const action = ctx.available.includes(musicAction) ? musicAction : 'idle';
      if (state.kind === 'music' && state.action === action) return { state };
      return {
        state: { kind: 'music', action },
        play: action,
        clearTimer: true,
      };
    }
  }
}
