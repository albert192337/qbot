/** Read-only local asset catalog. Never downloads, edits a character, or impersonates a user. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { charactersDir } from '../characters';
import { getSettings } from '../config';
import { pairActions } from '../../shared/pair-interaction';
import type { TestGuest } from '../../shared/social';

export async function listTestGuests(): Promise<TestGuest[]> {
  const active = (await getSettings()).activeCharacter;
  const entries = await readdir(charactersDir(), {withFileTypes:true}).catch(() => []);
  const out: TestGuest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === active || entry.name.startsWith('.') && !/^\.peer-[0-9a-f]{16}$/.test(entry.name)) continue;
    const base = path.join(charactersDir(), entry.name);
    try {
      const manifest = JSON.parse(await readFile(path.join(base, 'manifest.json'), 'utf8'));
      if (!manifest.actions || !pairActions(manifest).size) continue;
      const peer = entry.name.startsWith('.peer-');
      const origin = peer ? await readFile(path.join(base, '.social-origin.json'), 'utf8').then(JSON.parse).catch(() => null) : null;
      out.push({id:entry.name, name:manifest.name || entry.name, source:peer ? '房友缓存' : '角色库',
        owner:peer ? origin?.nickname || '来源未记录' : undefined,
        ownerId:peer ? origin?.memberId : undefined, ownerRealm:peer ? origin?.realm : undefined,
        character:{dirId:entry.name, manifest, hasUnfinishedJob:false}});
    } catch { /* Missing or incomplete cached assets cannot be invited. */ }
  }
  return out;
}
