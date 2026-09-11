/** User knowledge stays in userData, never in distributable character packs. */
export type MemoryKind = 'preference' | 'fact' | 'topic' | 'episode' | 'observation';
export interface UserMemory {
  id: string;
  key: string;
  text: string;
  kind: MemoryKind;
  scope: 'shared' | 'character';
  characterId: string;
  /** A role-specific exception overrides this shared record without changing it. */
  overrides?: string;
  certainty: 'explicit' | 'tentative';
  status: 'active' | 'resolved';
  proactive: boolean;
  visible: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  evidence: { text: string; at: number; characterId: string; source: 'user' | 'garden' | 'edit' };
}
export interface MemoryChange {
  op: 'upsert' | 'resolve' | 'forget';
  id?: string;
  key?: string;
  text?: string;
  kind?: MemoryKind;
  scope?: 'shared' | 'character';
  certainty?: 'explicit' | 'tentative';
  quote: string;
}
export interface MemorySelection {
  at: number;
  characterId: string;
  mode: 'chat' | 'auto';
  selected: string[];
  excluded: Array<{ id: string; reason: string }>;
}
export interface MemorySnapshot {
  characterId: string;
  memories: UserMemory[];
  history: Array<{ at: number; id: string; action: string }>;
  selections: MemorySelection[];
  processing: { pending: number; lastAt?: number; status: string; error?: string };
  storageError?: string;
  jobs?: Array<{ id: string; characterId: string; at: number; status: 'waiting' | 'running' | 'failed' }>;
}
export interface MemoryEdit {
  id: string;
  action: 'edit' | 'forget' | 'resolve' | 'quiet' | 'resume';
  text?: string;
}
