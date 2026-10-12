import { app } from 'electron';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import type { BehaviorAudit } from '../shared/behavior-catalog';

/** Persist before doing paid work or sending an invitation; failed writes fail closed. */
export class BehaviorAuditStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: () => string) {}
  private run<T>(fn: (events: BehaviorAudit[]) => T, write: boolean): Promise<T> {
    const task = this.queue.then(async () => {
      let events: BehaviorAudit[] = [];
      try {
        const data = JSON.parse(await readFile(this.file(), 'utf8'));
        if (data.version !== 1 || !Array.isArray(data.events)) throw Error('行为日志格式无效');
        events = data.events;
      } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      const result = fn(events);
      if (write) {
        await mkdir(path.dirname(this.file()), { recursive: true });
        await writeFile(this.file() + '.tmp', JSON.stringify({ version: 1, events }), 'utf8');
        await rename(this.file() + '.tmp', this.file());
      }
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  list(): Promise<BehaviorAudit[]> { return this.run(events => events, false); }
  update<T>(fn: (events: BehaviorAudit[]) => T): Promise<T> { return this.run(fn, true); }
  append(event: BehaviorAudit): Promise<void> {
    return this.update(events => {
      events.push(event);
      // Keep complete days, rather than the old last-100-entries cap.
      const cutoff = event.at - 30 * 86_400_000;
      for (let i = events.length - 1; i >= 0; i--) if (events[i].at < cutoff) events.splice(i, 1);
    });
  }
  flush(): Promise<unknown> { return this.queue; }
}
export const behaviorAudit = new BehaviorAuditStore(() => path.join(app.getPath('userData'), 'behavior-audit.json'));
