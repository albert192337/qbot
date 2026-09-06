import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, file);
}
export async function openStore(dir) {
  const file = path.join(dir, 'registry.json');
  let data;
  try { data = JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; data = { accounts: {}, jobs: {} }; }
  let chain = Promise.resolve();
  return {
    get data() { return data; },
    transaction(fn) {
      const op = chain.then(async () => {
        const next = structuredClone(data);
        const result = await fn(next);
        await atomicJson(file, next);
        data = next;
        return result;
      });
      chain = op.catch(() => {});
      return op;
    },
  };
}
