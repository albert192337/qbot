/** One shared state object per character, with independently reserved actions. */
export class ActionSessions<T> {
  private sessions = new Map<string, { value: Promise<T>; busy: Set<string>; closing?: Promise<void> }>();
  has(id: string): boolean { return this.sessions.has(id); }
  async run<R>(id: string, actions: string[], load: () => Promise<T>, work: (value: T) => Promise<R>, finish: (value: T) => Promise<void>): Promise<R> {
    let session = this.sessions.get(id);
    if (session?.closing) { await session.closing.catch(() => {}); return this.run(id, actions, load, work, finish); }
    if (session && actions.some(a => session!.busy.has(a))) throw new Error('这个动作正在生成，请勿重复提交');
    if (!session) {
      session = { value: Promise.resolve().then(load), busy: new Set() };
      this.sessions.set(id, session);
    }
    actions.forEach(a => session!.busy.add(a));
    let value: T | undefined;
    try { value = await session.value; return await work(value); }
    finally {
      actions.forEach(a => session!.busy.delete(a));
      if (!session.busy.size) {
        // Keep the reservation while finalization writes the terminal state.
        session.closing = Promise.resolve().then(async () => { if (value !== undefined) await finish(value); });
        try { await session.closing; }
        finally { if (this.sessions.get(id) === session) this.sessions.delete(id); }
      }
    }
  }
}
