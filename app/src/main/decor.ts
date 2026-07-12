/** 小房间装饰摆放持久化：userData/room-decor.json（按房间名键控） */
import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DecorPlacement } from '../shared/ipc-types';

function decorPath(): string {
  return path.join(app.getPath('userData'), 'room-decor.json');
}

type DecorFile = Record<string, DecorPlacement[]>;

async function readAll(): Promise<DecorFile> {
  try {
    const parsed = JSON.parse(await readFile(decorPath(), 'utf8'));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    // 不存在或损坏 → 空；不主动覆盖写，保留用户手改坏的现场（下次保存才重写）
    return {};
  }
}

export async function getDecor(roomName: string): Promise<DecorPlacement[]> {
  const all = await readAll();
  const list = all[roomName];
  return Array.isArray(list) ? list : [];
}

export async function setDecor(roomName: string, placements: DecorPlacement[]): Promise<void> {
  const all = await readAll();
  all[roomName] = placements;
  await mkdir(path.dirname(decorPath()), { recursive: true });
  await writeFile(decorPath(), JSON.stringify(all, null, 2));
}
