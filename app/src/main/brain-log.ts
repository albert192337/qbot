import { app } from 'electron';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BrainCallLog, BrainLogSnapshot } from '../shared/brain-log';

const calls = new Map<string, BrainCallLog>();
let gate: BrainLogSnapshot['gate'] = null;
let storageError: string | undefined;
let loading: Promise<void> | undefined;
let saving = Promise.resolve();
const file = () => path.join(app.getPath('userData'), 'brain-calls.jsonl');
async function load(): Promise<void> {
  if (!loading) loading = (async () => {
    try {
      for (const line of (await readFile(file(), 'utf8')).split('\n')) {
        try { const entry = JSON.parse(line) as BrainCallLog; if (entry.id && Array.isArray(entry.events)) calls.set(entry.id, entry); } catch { /* 空行/中断行 */ }
      }
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') storageError = String(e); }
  })();
  await loading;
}
function save(entry: BrainCallLog): void {
  const line = JSON.stringify(entry) + '\n';
  saving = saving.then(async () => {
    await mkdir(path.dirname(file()), { recursive: true });
    await appendFile(file(), line, 'utf8');
  }).catch(e => { storageError = String(e); });
}
export function brainGate(reason: string, nextAt?: number): void { gate = { at: Date.now(), reason, nextAt }; }
export async function beginBrainCall(trigger: string): Promise<string> {
  await load();
  const entry: BrainCallLog = { id: randomUUID(), at: Date.now(), trigger, events: [] };
  calls.set(entry.id, entry);
  await updateBrainCall(entry.id, '准备请求');
  return entry.id;
}
export async function updateBrainCall(id: string | undefined, stage: string, patch: Partial<Pick<BrainCallLog, 'input' | 'raw' | 'decision'>> = {}, detail?: string): Promise<void> {
  if (!id) return;
  await load();
  const entry = calls.get(id);
  if (!entry) return;
  Object.assign(entry, patch);
  entry.events.push({ at: Date.now(), stage, detail });
  save(entry);
}
export async function getBrainLog(): Promise<BrainLogSnapshot> {
  await load();
  return { calls: [...calls.values()].sort((a, b) => b.at - a.at), gate, storageError };
}
export async function flushBrainLog(): Promise<void> { await saving; }
