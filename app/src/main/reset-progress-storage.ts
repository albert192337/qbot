import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { initialGarden } from './garden/rules';
import { enableV3 } from './garden/v3-rules';
import { ensureLife } from './garden/life-rules';
import { emptyProgress, grantWelcome } from './progress-rules';

const marker = 'pending-progress-reset.json';
const files = ['garden-demo.json', 'garden-demo.json.bak', 'progress.json', 'progress.json.bak', 'room-decor.json', 'config.json'] as const;
async function atomic(file: string, content: string): Promise<void> {
    await writeFile(file + '.tmp', content, 'utf8');
    await rename(file + '.tmp', file);
}
export async function requestProgressReset(directory: string): Promise<string> {
    await mkdir(directory, { recursive: true });
    const id = randomUUID();
    await atomic(path.join(directory, marker), JSON.stringify({ id }));
    return path.join(directory, 'progress-reset-backups', id);
}

/** Run before any service loads saves. A durable plan makes interrupted resets resumable. */
export async function applyPendingProgressReset(directory: string): Promise<string | null> {
    let request: { id: string };
    try { request = JSON.parse(await readFile(path.join(directory, marker), 'utf8')); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
    if (!/^[a-f0-9-]{36}$/.test(request.id)) throw Error('无效的养成重置请求');
    const backup = path.join(directory, 'progress-reset-backups', request.id);
    await mkdir(backup, { recursive: true });
    const planFile = path.join(backup, 'plan.json');
    let plan: Record<string, string>;
    try { plan = JSON.parse(await readFile(planFile, 'utf8')); }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        const originals: Record<string, string | null> = {};
        for (const name of files) {
            try { originals[name] = await readFile(path.join(directory, name), 'utf8'); }
            catch (err) { if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err; originals[name] = null; }
        }
        const settings = originals['config.json'] ? JSON.parse(originals['config.json']) : {};
        const now = Date.now(), rng = { random: Math.random, id: randomUUID };
        const state = initialGarden(now, rng);
        enableV3(state, now); ensureLife(state, now, rng, settings.activeCharacter);
        const garden = JSON.stringify({ state });
        const progress = JSON.stringify(grantWelcome({ ...emptyProgress(), boxes: 2 }));
        plan = { 'garden-demo.json': garden, 'garden-demo.json.bak': garden,
            'progress.json': progress, 'progress.json.bak': progress, 'room-decor.json': '{}',
            'config.json': JSON.stringify({ ...settings, gardenOnline: false }) };
        // Preserve the exact pre-reset bytes, including ordinary rotating backups.
        await atomic(path.join(backup, 'originals.json'), JSON.stringify(originals));
        await atomic(planFile, JSON.stringify(plan));
    }
    for (const name of files) if (typeof plan[name] !== 'string') throw Error('养成重置计划不完整');
    for (const name of files) await atomic(path.join(directory, name), plan[name]);
    await atomic(path.join(backup, 'completed.json'), JSON.stringify({ at: Date.now() }));
    await unlink(path.join(directory, marker));
    return backup;
}
