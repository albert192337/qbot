import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ConversationLine } from './conversation-memory';
import type { MemoryChange, MemoryEdit, MemorySelection, MemorySnapshot, UserMemory } from '../shared/memory';

export interface ExtractionJob { id: string; characterId: string; text: string; at: number; status: 'waiting' | 'running' | 'failed' }
interface State {
  version: 1;
  memories: UserMemory[];
  conversations: Record<string, ConversationLine[]>;
  history: MemorySnapshot['history'];
  selections: MemorySelection[];
  jobs: ExtractionJob[];
}
const fresh = (): State => ({ version: 1, memories: [], conversations: {}, history: [], selections: [], jobs: [] });
const accessible = (m: UserMemory, character: string) => m.scope === 'shared' || m.characterId === character;
function validMemory(m: UserMemory): boolean {
  return !!m && typeof m.id === 'string' && typeof m.key === 'string' && typeof m.text === 'string' && typeof m.characterId === 'string' &&
    ['shared', 'character'].includes(m.scope) && ['fact', 'preference', 'topic', 'episode', 'observation'].includes(m.kind) &&
    ['explicit', 'tentative'].includes(m.certainty) && ['active', 'resolved'].includes(m.status) && typeof m.proactive === 'boolean' && typeof m.visible === 'boolean' &&
    Number.isFinite(m.createdAt) && Number.isFinite(m.updatedAt) && (m.expiresAt === undefined || Number.isFinite(m.expiresAt)) &&
    !!m.evidence && typeof m.evidence.text === 'string' && typeof m.evidence.characterId === 'string' && Number.isFinite(m.evidence.at) && ['user', 'edit', 'garden'].includes(m.evidence.source);
}
export class MemoryStore {
  private state = fresh();
  private queue: Promise<void> = Promise.resolve();
  private error?: string;
  private readOnly = false;
  /** Invalidates model requests already in flight when a user corrects/forgets data. */
  revision = 0;
  processing: MemorySnapshot['processing'] = { pending: 0, status: '尚未整理对话' };
  constructor(private file: string) {}
  async load(): Promise<void> {
    try {
      const value = JSON.parse(await readFile(this.file, 'utf8'));
      if (value.version !== 1 || !Array.isArray(value.memories) || !value.conversations || !Array.isArray(value.history) || !Array.isArray(value.selections)) throw new Error('记忆文件格式无效，已停止写入以保护原文件');
      if (!value.memories.every(validMemory) || typeof value.conversations !== 'object' || Array.isArray(value.conversations) ||
        !Object.values(value.conversations).every(lines => Array.isArray(lines) && lines.every(l => l && typeof l.text === 'string' && Number.isFinite(l.at) && ['user', 'assistant'].includes(l.role) && ['chat', 'auto'].includes(l.source))) ||
        (value.jobs !== undefined && (!Array.isArray(value.jobs) || !value.jobs.every((j: ExtractionJob) => j && typeof j.id === 'string' && typeof j.text === 'string' && typeof j.characterId === 'string' && Number.isFinite(j.at) && ['waiting', 'running', 'failed'].includes(j.status))))) throw new Error('记忆条目损坏，已保留原文件并停止写入');
      this.state = value;
      this.state.jobs ??= [];
      for (const job of this.state.jobs) if (job.status === 'running') job.status = 'waiting';
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') { this.error = String(e); this.readOnly = true; }
    }
  }
  private transaction(change: (next: State) => void): Promise<void> {
    const job = this.queue.then(async () => {
      if (this.readOnly) throw new Error(this.error);
      const next = structuredClone(this.state);
      change(next);
      next.history = next.history.slice(-300);
      next.selections = next.selections.slice(-30);
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(this.file + '.tmp', JSON.stringify(next), 'utf8');
      await rename(this.file + '.tmp', this.file);
      this.state = next;
      this.error = undefined;
    });
    this.queue = job.catch(e => { this.error = String(e); });
    return job;
  }
  async flush(): Promise<void> { await this.queue; }
  conversations(): Record<string, ConversationLine[]> { return structuredClone(this.state.conversations); }
  append(character: string, line: ConversationLine): Promise<void> {
    return this.transaction(s => {
      s.conversations[character] = [...(s.conversations[character] ?? []), line]
        .filter(l => line.at - l.at < 86400000).slice(-40);
    });
  }
  snapshot(character: string, debug = false): MemorySnapshot {
    const effective = this.candidates(character);
    const memories = debug ? this.state.memories : effective.filter(m => m.visible && m.certainty === 'explicit');
    return structuredClone({ characterId: character, memories, history: debug ? this.state.history : [],
      selections: debug ? this.state.selections : [], processing: { ...this.processing, pending: this.state.jobs.filter(j => j.status !== 'failed').length },
      jobs: debug ? this.state.jobs.map(({ text: _text, ...job }) => job) : undefined, storageError: this.error });
  }
  jobs(): ExtractionJob[] { return structuredClone(this.state.jobs); }
  async enqueue(characterId: string, text: string, at: number): Promise<ExtractionJob> {
    const job: ExtractionJob = { id: randomUUID(), characterId, text, at, status: 'waiting' };
    await this.transaction(s => {
      if (s.jobs.length >= 50) throw new Error('待整理对话过多，请在工具抽屉处理失败记录');
      s.jobs.push(job);
    });
    return job;
  }
  jobStatus(id: string, status: ExtractionJob['status'] | 'done'): Promise<void> {
    return this.transaction(s => {
      if (status === 'done') s.jobs = s.jobs.filter(j => j.id !== id);
      else { const job = s.jobs.find(j => j.id === id); if (job) job.status = status; }
    });
  }
  candidates(character: string): UserMemory[] {
    const own = this.state.memories.filter(m => m.scope === 'character' && m.characterId === character);
    const privateKeys = new Set(own.map(m => m.key)), overrides = new Set(own.map(m => m.overrides));
    return structuredClone(this.state.memories.filter(m => accessible(m, character) && !(m.scope === 'shared' && (privateKeys.has(m.key) || overrides.has(m.id)))));
  }
  async select(character: string, mode: 'chat' | 'auto', query = '', now = Date.now()): Promise<UserMemory[]> {
    const revision = this.revision;
    const privateKeys = new Set(this.state.memories.filter(m => m.scope === 'character' && m.characterId === character).map(m => m.key));
    const overrides = new Set(this.state.memories.filter(m => m.scope === 'character' && m.characterId === character).map(m => m.overrides));
    const excluded: MemorySelection['excluded'] = [];
    const eligible = this.state.memories.filter(m => {
      const reason = !accessible(m, character) ? '属于其他角色' : m.scope === 'shared' && (privateKeys.has(m.key) || overrides.has(m.id)) ? '当前角色专属约定覆盖共享资料' : m.status !== 'active' ? '事情已结束'
        : m.expiresAt && m.expiresAt <= now ? '信息已过期' : mode === 'auto' && !m.proactive ? '用户要求不主动提' : '';
      if (reason) excluded.push({ id: m.id, reason });
      return !reason;
    });
    const recentIds = new Set(this.state.selections.filter(s => s.characterId === character && s.mode === 'auto' && now - s.at < 6 * 3600000).flatMap(s => s.selected));
    const grams = query.toLowerCase().match(/[\p{L}\p{N}]{2}/gu) ?? [];
    const score = (m: UserMemory) => (m.kind === 'preference' ? 15 : 0) +
      grams.filter(g => m.text.toLowerCase().includes(g)).length * 10 + (m.certainty === 'explicit' ? 5 : 0) +
      Math.max(0, 5 - (now - m.updatedAt) / 86400000);
    const selected = eligible.filter(m => {
      if (mode === 'auto' && (m.kind === 'topic' || m.kind === 'episode') && recentIds.has(m.id)) {
        excluded.push({ id: m.id, reason: '近期已提供给主动脑，避免反复提起' }); return false;
      }
      return true;
    }).sort((a, b) => score(b) - score(a)).slice(0, 12);
    for (const m of eligible) if (!selected.includes(m) && !excluded.some(x => x.id === m.id)) excluded.push({ id: m.id, reason: '本次相关性或容量限制' });
    await this.transaction(s => { if (revision === this.revision) s.selections.push({ at: now, characterId: character, mode, selected: selected.map(m => m.id), excluded }); });
    return revision === this.revision ? structuredClone(selected) : [];
  }
  async apply(changes: MemoryChange[], character: string, text: string, at: number, revision: number): Promise<void> {
    await this.transaction(s => {
      if (revision !== this.revision) return;
      for (const change of changes) {
        if (!change.quote || !text.includes(change.quote)) continue;
        const existing = change.id ? s.memories.find(m => m.id === change.id && accessible(m, character)) : undefined;
        const privateContext = /只告诉你|只有你|别告诉|不要告诉|保密|秘密|我们|咱们|你叫我|你可以叫/.test(text);
        if (change.op === 'forget') continue; // Natural-language deletion is routed through edit(), including cache/log scrubbing.
        if (change.op === 'resolve') {
          if (existing) {
            if (privateContext && existing.scope === 'shared') {
              const id = randomUUID();
              s.memories.push({ ...existing, id, overrides: existing.id, scope: 'character', characterId: character, status: 'resolved', updatedAt: at,
                evidence: { text: change.quote, at, characterId: character, source: 'user' } });
              s.history.push({ at, id, action: '私下告知事情结束' });
            } else { existing.status = 'resolved'; existing.updatedAt = at; s.history.push({ at, id: existing.id, action: '事情已结束' }); }
          }
          continue;
        }
        if (change.op !== 'upsert' || !change.text || !change.key || !change.kind) continue;
        const scope = privateContext || change.kind === 'episode' || existing?.scope === 'character' ? 'character' : change.scope === 'shared' ? 'shared' : 'character';
        const old = (existing?.scope === scope ? existing : undefined) ?? s.memories.find(m => m.key === change.key && m.scope === scope && (scope === 'shared' || m.characterId === character));
        // Corrections from a private conversation must never alter the shared copy.
        const target = old?.scope === scope ? old : undefined;
        const m: UserMemory = { id: target?.id ?? randomUUID(), key: change.key, text: change.text, kind: change.kind,
          overrides: scope === 'character' ? target?.overrides ?? s.memories.find(m => m.scope === 'shared' && m.key === change.key)?.id : undefined,
          scope, characterId: scope === 'shared' ? character : target?.characterId ?? character,
          certainty: change.kind === 'observation' ? 'tentative' : change.certainty ?? 'tentative',
          status: 'active', proactive: target?.proactive ?? true, visible: change.kind !== 'observation',
          createdAt: target?.createdAt ?? at, updatedAt: at,
          expiresAt: change.kind === 'topic' ? at + 30 * 86400000 : change.kind === 'observation' ? at + 14 * 86400000 : undefined,
          evidence: { text: change.quote, at, characterId: character, source: 'user' } };
        if (target) s.memories.splice(s.memories.indexOf(target), 1, m); else s.memories.push(m);
        s.history.push({ at, id: m.id, action: target ? '根据用户发言更新' : '从用户发言记下' });
      }
    });
  }
  validateEdit(command: MemoryEdit, character: string): void {
    if (!command || !['edit', 'forget', 'resolve', 'quiet', 'resume'].includes(command.action) || typeof command.id !== 'string') throw new Error('无效的记忆操作');
    if (command.action === 'edit' && (typeof command.text !== 'string' || !command.text.trim() || command.text.length > 500)) throw new Error('请填写 1～500 字的记忆');
    if (!this.state.memories.some(m => m.id === command.id && accessible(m, character))) throw new Error('这条记忆已变化，请刷新');
  }
  async edit(command: MemoryEdit, character: string): Promise<void> {
    this.validateEdit(command, character);
    ++this.revision;
    await this.transaction(s => {
      const m = s.memories.find(m => m.id === command.id && accessible(m, character));
      if (!m) throw new Error('这条记忆已变化，请刷新');
      const at = Date.now();
      if (command.action === 'forget' || command.action === 'edit') {
        // Remove every derivative from this source, not just the visible card.
        const related = s.memories.filter(x => x.id === m.id || (x.evidence.at === m.evidence.at && x.evidence.characterId === m.evidence.characterId));
        const ids = new Set(related.map(x => x.id));
        s.memories = s.memories.filter(x => !ids.has(x.id));
        s.history = s.history.filter(x => !ids.has(x.id));
        s.selections = [];
        s.conversations = {}; // Short-term context may paraphrase deleted facts; clear it conservatively.
        s.jobs = []; // Also erase durable queued sources, including requests already in flight.
        if (command.action === 'edit') s.memories.push({ ...m, key: `manual:${m.id}`, text: command.text!.trim(), certainty: 'explicit', visible: true,
          updatedAt: at, evidence: { text: command.text!.trim(), at, characterId: character, source: 'edit' } });
      } else if (command.action === 'resolve') { m.status = 'resolved'; m.updatedAt = at; }
      else { m.proactive = command.action === 'resume'; m.updatedAt = at; }
      s.history.push({ at, id: m.id, action: ({ edit: '用户纠正', forget: '用户遗忘（内容已清除）', resolve: '用户标记结束', quiet: '不主动提', resume: '允许主动提' })[command.action] });
    });
  }
  async episode(character: string, text: string, at: number): Promise<void> {
    await this.transaction(s => {
      const key = `garden:${at}`;
      if (s.memories.some(m => m.key === key)) return;
      const id = randomUUID();
      s.memories.push({ id, key, text, kind: 'episode', scope: 'character', characterId: character,
        certainty: 'explicit', status: 'active', proactive: true, visible: true, createdAt: at, updatedAt: at,
        evidence: { text, at, characterId: character, source: 'garden' } });
      s.history.push({ at, id, action: '记下共同收获' });
    });
  }
}
