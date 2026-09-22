import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ContactSnapshot } from '../../shared/social';

interface Entry { id?: string; token?: string; snapshot?: ContactSnapshot }
function location(): string { return path.join(app.getPath('userData'), 'room-contacts.json'); }
function read(): Record<string, Entry> {
  const file = location();
  if (!existsSync(file)) return {};
  // Do not silently replace an unreadable identity store with a new account.
  return JSON.parse(readFileSync(file, 'utf8'));
}
export function readContactCache(realm: string): Entry { return read()[realm] || {}; }
export function saveContactCache(realm: string, patch: Entry): void {
  const all = read(); all[realm] = { ...all[realm], ...patch };
  const file = location(); mkdirSync(path.dirname(file), {recursive:true});
  writeFileSync(file + '.tmp', JSON.stringify(all), {mode:0o600}); renameSync(file + '.tmp', file);
}
