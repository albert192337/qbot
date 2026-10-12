import { randomUUID } from 'node:crypto';
import { BEHAVIOR_POLICY, policyBlock, type BehaviorAudit, type BehaviorOpportunity, type BehaviorOutcome, type BehaviorProposal } from '../shared/behavior-catalog';

interface Audit {
  list(): Promise<BehaviorAudit[]>;
  update<T>(fn: (events: BehaviorAudit[]) => T): Promise<T>;
  append(event: BehaviorAudit): Promise<void>;
}
export interface AutonomyDependencies {
  audit: Audit;
  now(): number;
  valid(actor: string, opportunity: BehaviorOpportunity, source?: 'auto' | 'user' | 'interaction'): Promise<boolean>;
  publish(proposal: BehaviorProposal | null): void;
  execute(proposal: BehaviorProposal): Promise<'completed' | 'sent' | 'started'>;
}
/** No approval is inferred from a timer, model output, past approval or a missing reply. */
export class AutonomyEngine {
  private pending: BehaviorProposal | null = null;
  private busy = false;
  constructor(private deps: AutonomyDependencies) {}
  get(): BehaviorProposal | null { return this.pending; }
  async record(p: BehaviorProposal, outcome: BehaviorOutcome, reason = p.reason): Promise<void> {
    await this.deps.audit.append({id:p.id,at:this.deps.now(),actor:p.actor,behavior:p.opportunity.behavior,
      source:p.source==='interaction'?'rule':p.source??'auto',outcome,reason,target:p.opportunity.target});
  }
  async refresh(): Promise<void> {
    const p = this.pending;
    if (!p || this.busy) return;
    const expired = p.expiresAt <= this.deps.now();
    if (!expired && await this.deps.valid(p.actor,p.opportunity,p.source??'auto')) return;
    if (this.pending !== p || this.busy) return;
    this.pending = null; this.deps.publish(null);
    await this.record(p, expired ? 'expired' : 'cancelled', expired ? '未获回复，申请已过期' : '角色、场景或记忆已变化');
  }
  async propose(actor: string, opportunity: BehaviorOpportunity, reason: string, source:'auto'|'user'|'interaction'='auto'): Promise<boolean> {
    if (this.busy || this.pending && source!=='user') return false;
    this.busy = true;
    try {
      if (!await this.deps.valid(actor,opportunity,source)) return false;
      if(this.pending){const old=this.pending;this.pending=null;this.deps.publish(null);await this.record(old,'cancelled','用户发送了新的指令，旧申请已取消');}
      const now = this.deps.now();
      const p: BehaviorProposal = {id:randomUUID(),actor,source,opportunity,reason:reason.slice(0,160),at:now,expiresAt:now+90_000};
      const approval = BEHAVIOR_POLICY[opportunity.behavior].approval;
      const reserved = await this.deps.audit.update(events => {
        if (!(source==='user'&&opportunity.behavior!=='moment') && policyBlock(events,actor,opportunity.behavior,now)) return false;
        events.push({id:p.id,at:now,actor,behavior:opportunity.behavior,source:source==='interaction'?'rule':source,
          outcome:approval?'proposed':'reserved',reason:p.reason,target:opportunity.target});
        return true;
      });
      if (!reserved) return false;
      if (approval) { this.pending = p; this.deps.publish(p); }
      else return await this.perform(p);
      return true;
    } finally { this.busy = false; }
  }
  async answer(id: string, accept: boolean): Promise<void> {
    const p = this.pending;
    if (!p || p.id !== id || this.busy || typeof accept !== 'boolean') return;
    this.busy = true; this.pending = null; this.deps.publish(null);
    try {
      if (!accept) { await this.record(p,'rejected','用户选择暂时不了'); return; }
      if (p.expiresAt <= this.deps.now() || !await this.deps.valid(p.actor,p.opportunity,p.source??'auto')) {
        await this.record(p,'cancelled','同意时申请已过期或条件变化'); return;
      }
      await this.record(p,'approved','用户本次明确同意');
      await this.perform(p);
    } finally { this.busy = false; }
  }
  private async perform(p: BehaviorProposal): Promise<boolean> {
    try {
      if (!await this.deps.valid(p.actor,p.opportunity,p.source??'auto')) { await this.record(p,'cancelled','执行前条件变化'); return false; }
      const outcome = await this.deps.execute(p);
      await this.record(p,outcome);
      return true;
    } catch (e) { await this.record(p,'failed',e instanceof Error ? e.message : String(e));return false; }
  }
}
