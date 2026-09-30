import { app } from 'electron';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { validateRoom3d, type Room3dState } from '../shared/room3d';
const file = () => path.join(app.getPath('userData'), 'room3d.json');
let saving: Promise<unknown> = Promise.resolve();
export async function getRoom3d(): Promise<Room3dState | null> {
  await saving.catch(() => {});
  try { return validateRoom3d(JSON.parse(await readFile(file(), 'utf8'))); }
  catch { return null; }
}
export async function saveRoom3d(input: unknown): Promise<Room3dState> {
  const state = validateRoom3d(input);
  const operation = saving.catch(() => {}).then(async () => {
    await mkdir(path.dirname(file()), { recursive: true });
    await writeFile(file()+'.tmp', JSON.stringify(state));
    await rename(file()+'.tmp', file());
    return state;
  });
  saving = operation;
  return operation;
}
