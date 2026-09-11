import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MemoryStore } from '../src/main/memory-store';
import type { MemoryChange } from '../src/shared/memory';
import { parseMemoryChanges } from '../src/main/memory-extraction';
let dir: string, file: string, store: MemoryStore;
const now = Date.now();
const change = (extra: Partial<MemoryChange> = {}): MemoryChange => ({ op: 'upsert', key: 'name', text: '喜欢被叫阿贝', quote: '叫我阿贝', kind: 'preference', scope: 'shared', certainty: 'explicit', ...extra });
beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), 'qbot-memory-')); file = path.join(dir, 'memory.json'); store = new MemoryStore(file); await store.load(); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
it('交流纠正可落盘，重启换角色后仍提供给聊天与连续主动思考', async () => {
  const source = '我本来就是在放松娱乐，为什么说我在摸鱼啊？我也没有在上班。';
  const changes = parseMemoryChanges(JSON.stringify({ changes: [{ op: 'upsert', key: 'leisure_wording',
    text: '不要把用户正常休闲娱乐称为摸鱼', quote: source, kind: 'preference', scope: 'shared', certainty: 'explicit' }] }), source);
  await store.apply(changes, 'frog', source, now, 0);
  const restored = new MemoryStore(file); await restored.load();
  for (const mode of ['chat', 'auto', 'auto'] as const) {
    const selected = await restored.select('dog', mode, '', now + 3600000);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({ kind: 'preference', text: '不要把用户正常休闲娱乐称为摸鱼', evidence: { text: source } });
  }
});
it('persists conversation and knowledge across restart and serializes concurrent writes', async () => {
  await Promise.all([store.append('frog', { text: '叫我阿贝', role: 'user', source: 'chat', at: now }), store.apply([change()], 'frog', '叫我阿贝', now, 0)]);
  const restored = new MemoryStore(file); await restored.load();
  expect(restored.conversations().frog[0].text).toBe('叫我阿贝');
  expect(restored.snapshot('cat').memories[0].text).toBe('喜欢被叫阿贝');
  expect(restored.conversations().cat).toBeUndefined();
});
it('private language overrides model shared scope and preserves the shared copy', async () => {
  await store.apply([change()], 'frog', '叫我阿贝', now, 0);
  const shared = store.candidates('frog')[0];
  await store.apply([change({ id: shared.id, text: '专属称呼小贝', quote: '只有你叫我小贝' })], 'frog', '只有你叫我小贝', now + 1, 0);
  expect(store.candidates('cat').map(m => m.text)).toEqual(['喜欢被叫阿贝']);
  expect(store.candidates('frog').map(m => m.text)).toEqual(['专属称呼小贝']);
  expect((await store.select('frog', 'chat')).map(m => m.text)).toEqual(['专属称呼小贝']);
  await store.apply([change({ id: shared.id, text: '专属称呼小贝', quote: '只有你叫我小贝' })], 'frog', '只有你叫我小贝', now + 2, 0);
  expect(store.snapshot('frog', true).memories).toHaveLength(2);
  await store.edit({ id: store.candidates('frog')[0].id, action: 'edit', text: '专属称呼小猫' }, 'frog');
  expect(store.candidates('frog').map(m => m.text)).toEqual(['专属称呼小猫']);
  expect(store.candidates('cat').map(m => m.text)).toEqual(['喜欢被叫阿贝']);
});
it('episodes stay with their participant and the debug view can inspect all roles', async () => {
  await store.episode('frog', '我们收获了金色草莓', now);
  expect(store.snapshot('cat').memories).toHaveLength(0);
  expect(store.snapshot('cat', true).memories).toHaveLength(1);
  expect(await store.select('cat', 'chat')).toEqual([]);
  expect(store.snapshot('cat', true).selections.at(-1)?.excluded[0].reason).toBe('属于其他角色');
});
it('tentative observations remain debug-only and are identified as tentative in retrieval', async () => {
  await store.apply([change({ kind: 'observation' })], 'frog', '叫我阿贝', now, 0);
  expect(store.snapshot('frog').memories).toHaveLength(0);
  expect((await store.select('frog', 'chat'))[0].certainty).toBe('tentative');
});
it('explicit correction updates the shared key without duplicate facts', async () => {
  await store.apply([change()], 'frog', '叫我阿贝', now, 0);
  await store.apply([change({ text: '喜欢被叫小李', quote: '叫我小李' })], 'cat', '叫我小李', now + 1, 0);
  expect(store.candidates('frog')).toHaveLength(1);
  expect(store.candidates('frog')[0].evidence.characterId).toBe('cat');
});
it('rejects invented source quotes', async () => {
  await store.apply([change()], 'frog', '今天天气不错', now, 0);
  expect(store.candidates('frog')).toEqual([]);
});
it('quiet preferences remain available to direct chat, but not automatic recall', async () => {
  await store.apply([change()], 'frog', '叫我阿贝', now, 0);
  const id = store.candidates('frog')[0].id;
  await store.edit({ id, action: 'quiet' }, 'cat');
  expect(await store.select('cat', 'auto')).toHaveLength(0);
  expect(await store.select('cat', 'chat')).toHaveLength(1);
});
it('resolved and expired topics are excluded for every character', async () => {
  await store.apply([change({ kind: 'topic' })], 'frog', '叫我阿贝', now, 0);
  expect(await store.select('cat', 'chat', '', now + 31 * 86400000)).toHaveLength(0);
  await store.edit({ id: store.candidates('frog')[0].id, action: 'resolve' }, 'cat');
  expect(await store.select('frog', 'chat')).toHaveLength(0);
});
it('automatic episode recall has a cooldown, but direct questions can retrieve it', async () => {
  await store.episode('frog', '金色草莓', now);
  expect(await store.select('frog', 'auto', '', now)).toHaveLength(1);
  expect(await store.select('frog', 'auto', '', now + 1000)).toHaveLength(0);
  expect(await store.select('frog', 'chat', '草莓', now + 1000)).toHaveLength(1);
});
it('forget scrubs derivatives, conversations and durable jobs; an in-flight extraction cannot resurrect them', async () => {
  await store.apply([change(), change({ key: 'second', text: '另一个摘要' })], 'frog', '叫我阿贝', now, 0);
  await store.append('frog', { text: '叫我阿贝', at: now, role: 'user', source: 'chat' });
  await store.enqueue('frog', '叫我阿贝', now);
  await store.edit({ id: store.candidates('frog')[0].id, action: 'forget' }, 'frog');
  await store.apply([change()], 'frog', '叫我阿贝', now, 0);
  const disk = await readFile(file, 'utf8');
  expect(disk).not.toContain('阿贝'); expect(disk).not.toContain('另一个摘要');
  expect(store.conversations()).toEqual({}); expect(store.jobs()).toEqual([]);
  const restored = new MemoryStore(file); await restored.load(); expect(restored.candidates('frog')).toEqual([]);
});
it('manual correction replaces old evidence and keeps the explicit corrected record', async () => {
  await store.apply([change()], 'frog', '叫我阿贝', now, 0);
  await store.edit({ id: store.candidates('frog')[0].id, action: 'edit', text: '喜欢被叫小李' }, 'frog');
  expect(await readFile(file, 'utf8')).not.toContain('阿贝');
  expect(store.candidates('frog')[0].evidence.source).toBe('edit');
});
it('cross-role edits and empty corrections are rejected without changing data', async () => {
  await store.episode('frog', '金色草莓', now);
  const id = store.candidates('frog')[0].id;
  await expect(store.edit({ id, action: 'forget' }, 'cat')).rejects.toThrow();
  await expect(store.edit({ id, action: 'edit', text: '' }, 'frog')).rejects.toThrow();
  expect(store.candidates('frog')).toHaveLength(1);
});
it('pending extraction survives restart; interrupted running jobs become waiting', async () => {
  const job = await store.enqueue('frog', '叫我阿贝', now);
  await store.jobStatus(job.id, 'running');
  const restored = new MemoryStore(file); await restored.load();
  expect(restored.jobs()[0].status).toBe('waiting');
  expect(restored.snapshot('frog', true).jobs?.[0]).not.toHaveProperty('text');
});
it('corrupted storage is surfaced and never silently overwritten', async () => {
  await writeFile(file, 'broken'); const damaged = new MemoryStore(file); await damaged.load();
  await expect(damaged.episode('frog', '新回忆', now)).rejects.toThrow();
  expect(await readFile(file, 'utf8')).toBe('broken');
  expect(damaged.snapshot('frog', true).storageError).toBeTruthy();
});
it('well-formed JSON with malformed memory records is also protected', async () => {
  const raw = JSON.stringify({ version: 1, memories: [null], conversations: {}, history: [], selections: [] });
  await writeFile(file, raw); const damaged = new MemoryStore(file); await damaged.load();
  expect(damaged.snapshot('frog', true).storageError).toContain('损坏');
  await expect(damaged.episode('frog', '新回忆', now)).rejects.toThrow();
  expect(await readFile(file, 'utf8')).toBe(raw);
});
