import { app } from 'electron';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { PAIR_INTERACTIONS, type PairKind } from '../shared/pair-interaction';
import { relationshipKey, type Relationship, type RelationshipPerson, type RelationshipSettings } from '../shared/relationships';

interface Data { version: 1; people: Record<string, RelationshipPerson>; pairs: Record<string, Relationship> }
/** Serialized read-modify-write; failed writes never replace the last valid ledger. */
export class RelationshipStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: () => string) {}
  private run<T>(fn: (data: Data) => T, write = true): Promise<T> {
    const task = this.queue.then(async () => {
      let data: Data;
      try {
        data = JSON.parse(await readFile(this.file(), 'utf8'));
        if (data.version !== 1 || !data.people || !data.pairs) throw Error('关系手账格式无效');
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        data = {version:1,people:{},pairs:{}};
      }
      const value = fn(data);
      if (write) {
        await mkdir(path.dirname(this.file()), {recursive:true});
        await writeFile(this.file()+'.tmp', JSON.stringify(data), 'utf8');
        await rename(this.file()+'.tmp', this.file());
      }
      return value;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  remember(people: RelationshipPerson[]): Promise<void> {
    return this.run(data => { for (const p of people) data.people[p.id] = p; });
  }
  snapshot() { return this.run(data => ({people:Object.values(data.people),relationships:Object.values(data.pairs)}), false); }
  private pair(data: Data, a: string, b: string, now: number): Relationship {
    if (a === b || !Object.hasOwn(data.people,a) || !Object.hasOwn(data.people,b)) throw Error('请选择两个不同的已认识角色');
    return data.pairs[relationshipKey(a,b)] ??= {people:[a,b].sort() as [string,string],points:0,count:0,firstAt:now,lastAt:0,settings:{},memories:[],receipts:[]};
  }
  save(a: string, b: string, settings: RelationshipSettings): Promise<void> {
    if (!settings || typeof settings.favorite !== 'boolean' ||
      typeof settings.label !== 'string' || settings.label.length > 24 ||
      typeof settings.nickname !== 'string' || settings.nickname.length > 24 ||
      typeof settings.note !== 'string' || settings.note.length > 500) return Promise.reject(Error('请检查关系设置的长度'));
    return this.run(data => {
      if (data.people[a]?.source !== 'local') throw Error('只能编辑自己角色的关系设置');
      this.pair(data,a,b,Date.now()).settings[a] = {label:settings.label.trim(),nickname:settings.nickname.trim(),note:settings.note.trim(),favorite:settings.favorite};
    });
  }
  record(a: RelationshipPerson, b: RelationshipPerson, kind: PairKind, session: string, now = Date.now()): Promise<void> {
    if (!PAIR_INTERACTIONS.some(k => k.id === kind) || typeof session !== 'string' || !session || session.length > 300) return Promise.reject(Error('无效互动记录'));
    return this.run(data => {
      data.people[a.id] = a; data.people[b.id] = b;
      const pair = this.pair(data,a.id,b.id,now);
      if (pair.receipts.includes(session)) return;
      pair.receipts.push(session);
      pair.points += 5; pair.count++; pair.lastAt = now;
      pair.memories.unshift({id:session,kind,at:now}); pair.memories = pair.memories.slice(0,30);
    });
  }
}
export const relationships = new RelationshipStore(() => path.join(app.getPath('userData'),'relationships.json'));
export function localPerson(meta: {dirId:string;manifest:{name:string}}): RelationshipPerson {
  return {id:JSON.stringify(['local',meta.dirId]),dirId:meta.dirId,name:meta.manifest.name,source:'local'};
}
export function peerPerson(meta: {dirId:string;manifest:{id?:string;name:string}}, ownerId: string, realm: string, owner?: string): RelationshipPerson {
  return {id:JSON.stringify(['peer',realm,ownerId,meta.manifest.id || meta.dirId]),dirId:meta.dirId,name:meta.manifest.name,source:'peer',ownerId,owner};
}
