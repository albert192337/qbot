import { app } from 'electron';
import path from 'node:path';
import { MemoryStore, type ExtractionJob } from './memory-store';
import { getSettings } from './config';
import { configureConversationMemory, clearConversationMemory } from './conversation-memory';
import { chatComplete } from './llm-client';
import { extractionMessages, parseMemoryChanges } from './memory-extraction';
import { clearBrainLog } from './brain-log';
import { clearMemoryHistory } from './perception';
import { stopAllBehaviors } from './behavior-executor';
import { hideBubbleWindow } from './windows';
import type { MemoryEdit } from '../shared/memory';

let initializing: Promise<MemoryStore> | undefined;
let extraction = Promise.resolve();
const scheduled = new Set<string>();
export function initUserMemory(): Promise<MemoryStore> {
  return initializing ??= (async () => {
    const store = new MemoryStore(path.join(app.getPath('userData'), 'user-memory.json'));
    await store.load();
    configureConversationMemory(store.conversations(), (character, line) => {
      void store.append(character, line).catch(e => console.error('[memory] 对话保存失败', e));
    });
    setTimeout(() => { void resumeMemoryExtraction().catch(() => {}); }, 0);
    return store;
  })();
}
export async function flushUserMemory(): Promise<void> { if (initializing) await (await initializing).flush(); }
export async function editUserMemory(command: MemoryEdit, character: string): Promise<void> {
  const store = await initUserMemory();
  await store.flush();
  store.validateEdit(command, character);
  ++store.revision;
  stopAllBehaviors();
  if (command.action === 'edit' || command.action === 'forget') {
    clearConversationMemory();
    hideBubbleWindow();
    await Promise.all([clearBrainLog(), clearMemoryHistory()]);
  }
  await store.edit(command, character);
}
/** Single background queue; no historical backfill can resurrect removed memories. */
export async function queueMemoryExtraction(character: string, text: string, apiKey: string, at: number): Promise<void> {
  const store = await initUserMemory();
  const job = await store.enqueue(character, text, at);
  scheduleExtraction(store, job, apiKey);
}
export async function resumeMemoryExtraction(includeFailed = false): Promise<void> {
  const store = await initUserMemory();
  const key = (await getSettings()).arkApiKey;
  if (!key) { if (store.jobs().length) store.processing.status = '等待配置 API Key'; return; }
  for (const job of store.jobs()) if (includeFailed || job.status !== 'failed') scheduleExtraction(store, job, key);
}
function scheduleExtraction(store: MemoryStore, job: ExtractionJob, apiKey: string): void {
  if (scheduled.has(job.id)) return;
  scheduled.add(job.id);
  const { characterId: character, text, at } = job;
  const revision = store.revision;
  store.processing.status = '等待整理';
  extraction = extraction.then(async () => {
    if (!store.jobs().some(j => j.id === job.id)) return;
    if (revision !== store.revision) { await store.jobStatus(job.id, 'done'); return; }
    await store.jobStatus(job.id, 'running');
    store.processing.status = '正在整理';
    const raw = await chatComplete({ apiKey, messages: extractionMessages(text, store.candidates(character).slice(-80), at), temperature: 0, timeoutMs: 15000 });
    if (revision !== store.revision) { store.processing.status = '旧请求已取消'; await store.jobStatus(job.id, 'done'); return; }
    const changes = parseMemoryChanges(raw, text);
    // Deletion must be explicit, with known IDs and complete cache/log scrubbing.
    const forgets = changes.filter(c => c.op === 'forget' && /忘|删除|别记|不要记/.test(text));
    if (forgets.length) {
      for (const c of forgets) await editUserMemory({ id: c.id!, action: 'forget' }, character);
    } else await store.apply(changes, character, text, at, revision);
    await store.jobStatus(job.id, 'done');
    store.processing = { pending: store.processing.pending, status: changes.length ? '已整理' : '本次没有需要长期记录的信息', lastAt: Date.now() };
  }).catch(async () => {
    // Do not persist provider bodies: they may echo sensitive input or deleted content.
    store.processing.status = '整理失败'; store.processing.error = '可在工具抽屉重试未完成的整理。';
    await store.jobStatus(job.id, 'failed').catch(() => {});
  }).finally(() => { scheduled.delete(job.id); });
}
