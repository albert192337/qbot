/** Pure presentation mapping. Generation remains authoritative in the main process. */
import type { HatchStatus } from '../../shared/ipc-types';
export const ACTIONS = [
  ['idle', '发呆'],
  ['drag', '被抱起'],
  ['sleep', '睡觉'],
  ['tea', '喝茶'],
  ['talk_happy', '开心聊天'],
  ['talk_annoyed', '闹小脾气'],
  ['wave', '打招呼'],
  ['stretch', '伸懒腰'],
  ['perch', '窗沿停靠'],
  ['writing', '写手账'],
] as const;
export const ACTION_STATUS: Record<string, string> = {
  pending: '等待练习',
  generating_frame: '描绘动作',
  frame_qc: '检查形象',
  generating_video: '学习动起来',
  keying: '整理动作',
  done: '学会了',
  failed: '需要帮忙',
};
export type IncubationPhase =
  | 'empty'
  | 'queued'
  | 'brewing'
  | 'pick'
  | 'learning'
  | 'interrupted'
  | 'born';
export function incubation(status: HatchStatus | null): {
  phase: IncubationPhase;
  done: number;
  failed: number;
  total: number;
} {
  const values = status && Object.keys(status.actions).length ? Object.values(status.actions).map(a => a.status) : ACTIONS.map(() => undefined);
  const done = values.filter((s) => s === 'done').length;
  const failed = values.filter((s) => s === 'failed').length;
  const phase: IncubationPhase = !status
    ? 'empty'
    : status.stage === 'done' && !failed
      ? 'born'
      : status.stage === 'failed' ||
          status.running === false ||
          (status.stage === 'done' && failed > 0)
        ? 'interrupted'
        : status.cloudPhase === 'queued'
          ? 'queued'
          : status.stage === 'awaiting_pick'
            ? 'pick'
            : status.stage === 'turnaround'
              ? 'brewing'
              : 'learning';
  return { phase, done, failed, total: values.length };
}
export const PHASE_LABEL: Record<IncubationPhase, string> = {
  empty: '等待一位新朋友',
  queued: '排队等候孵化',
  brewing: '正在描绘你的朋友',
  pick: '是你想见到的样子吗？',
  learning: '它正在学着陪伴你',
  interrupted: '孵化需要你帮忙',
  born: '你好，初次见面。',
};

/** Electron transport prefixes belong in logs, not in the scene's dialogue. */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '')
    .replace(/^Error:\s*/, '');
}
