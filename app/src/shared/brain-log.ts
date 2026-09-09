export interface BrainCallLog {
  id: string;
  at: number;
  trigger: string;
  input?: unknown;
  raw?: string;
  decision?: unknown;
  events: Array<{ at: number; stage: string; detail?: string }>;
}
export interface BrainLogSnapshot {
  calls: BrainCallLog[];
  gate: { at: number; reason: string; nextAt?: number } | null;
  storageError?: string;
}
