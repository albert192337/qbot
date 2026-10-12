/** Product policy shared by scheduling, validation and the behavior inventory. */
export const HOUR = 3_600_000;
export const BEHAVIOR_POLICY = {
  pair: { label: '双人互动', approval: true, dailyLimit: 6, cooldownMs: HOUR },
  invite: { label: '邀请来玩', approval: true, dailyLimit: 3, cooldownMs: 4 * HOUR },
  moment: { label: '游戏内朋友圈', approval: false, dailyLimit: 3, cooldownMs: 4 * HOUR },
  harvest: { label: '收取成熟作物', approval: true, dailyLimit: 3, cooldownMs: 4 * HOUR },
  iconPlay: { label: '抛玩图标副本', approval: false, dailyLimit: 24, cooldownMs: 5 * 60_000 },
} as const;
export type AutonomousBehavior = keyof typeof BEHAVIOR_POLICY;
export interface BehaviorOpportunity {
  id: string;
  behavior: AutonomousBehavior;
  label: string;
  target?: string;
  targetName?: string;
  targetAliases?: string[];
  approvalText?: string;
  kind?: import('./pair-interaction').PairKind;
  reason: string;
  /** Local context revision; never sent to a peer or interpreted as instructions. */
  revision: string;
}
export interface BehaviorProposal {
  id: string;
  actor: string;
  source?: 'auto' | 'user' | 'interaction';
  opportunity: BehaviorOpportunity;
  reason: string;
  at: number;
  expiresAt: number;
}
export type BehaviorOutcome = 'proposed' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'reserved' | 'started' | 'completed' | 'sent' | 'failed' | 'skipped';
export interface BehaviorAudit {
  id: string;
  at: number;
  actor: string;
  behavior: string;
  source: 'auto' | 'rule' | 'user' | 'debug';
  outcome: BehaviorOutcome;
  reason: string;
  target?: string;
}
export interface AutonomyApi {
  get(): Promise<BehaviorProposal | null>;
  answer(id: string, accept: boolean): Promise<void>;
  onProposal(cb: (proposal: BehaviorProposal | null) => void): () => void;
  ready(actor: string, ready: boolean, commandReady?: boolean): void;
  result(id: string, outcome: 'started' | 'completed' | 'cancelled' | 'failed', reason?: string): void;
  log(): Promise<BehaviorAudit[]>;
  icons(): Promise<string[]>;
  photo(): Promise<void>;
  openPhotos(): Promise<void>;
  observed(actor:string,action:string,trigger:'idle'|'timer'|'perch'):void;
}
export function behaviorDay(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function policyBlock(events: readonly BehaviorAudit[], actor: string, behavior: AutonomousBehavior, now: number): string | undefined {
  const policy = BEHAVIOR_POLICY[behavior];
  // Proposals consume the social budget even when refused; expensive attempts consume it before IO.
  const attempts = events.filter(e => e.actor === actor && e.behavior === behavior &&
    (behavior === 'moment' || e.source !== 'user') &&
    e.outcome === (policy.approval ? 'proposed' : 'reserved'));
  if (attempts.filter(e => behaviorDay(e.at) === behaviorDay(now)).length >= policy.dailyLimit) return '已达今日上限';
  if (attempts.some(e => now - e.at < policy.cooldownMs)) return '冷却中';
  return undefined;
}
