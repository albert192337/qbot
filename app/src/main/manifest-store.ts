import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { StickerManifest } from '../shared/sticker-behavior';

const writes = new Map<string, Promise<unknown>>();
/** Serialize read-modify-write, not long-running generation. Always merge into the latest file. */
export function editManifest(file: string, edit: (m: StickerManifest) => void | Promise<void>): Promise<StickerManifest> {
  const key = path.resolve(file);
  const run = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const m: StickerManifest = JSON.parse(await readFile(key, 'utf8'));
    await edit(m);
    const tmp = `${key}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(m, null, 2));
    await rename(tmp, key);
    return m;
  });
  writes.set(key, run);
  void run.finally(() => { if (writes.get(key) === run) writes.delete(key); }).catch(() => {});
  return run;
}
