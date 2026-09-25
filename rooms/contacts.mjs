import { randomBytes, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

const digest = s => createHash('sha256').update(s).digest('hex');
const clean = s => typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 32) : '';
const requireThat = (ok, code) => { if (!ok) throw new Error(code); };

/** Room-service identities and relationships. Never stores Steam assertions or chat text. */
export class Contacts {
  constructor(file) {
    this.file = file;
    this.people = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }
  transaction(fn) {
    const before = structuredClone(this.people);
    try {
      const result = fn();
      mkdirSync(path.dirname(this.file), { recursive: true });
      writeFileSync(this.file + '.tmp', JSON.stringify(this.people), { mode: 0o600 });
      renameSync(this.file + '.tmp', this.file);
      return result;
    } catch (e) { this.people = before; throw e; }
  }
  login(id, token, nickname, character) {
    return this.transaction(() => {
      if (token) requireThat(typeof token === 'string' && this.people[id]?.secret === digest(token), 'identity_invalid');
      // An old client cannot reclaim a protected identity using its public ID alone.
      if (!token && this.people[id]) id = undefined;
      if (!id || !/^[0-9A-Z]{12}$/.test(id)) {
        do { id = randomBytes(6).toString('hex').toUpperCase(); } while (this.people[id]);
      }
      if (!this.people[id]) {
        token = randomBytes(32).toString('hex');
        this.people[id] = { secret: digest(token), nickname: '', character: '', friends: [], incoming: [], seen: {} };
      }
      Object.assign(this.people[id], { nickname: clean(nickname) || '匿名', character: clean(character) });
      return { id, token };
    });
  }
  meet(a, b, interacted = false) {
    if (a === b || !this.people[a] || !this.people[b]) return;
    const now = Date.now();
    for (const [owner, other] of [[a,b],[b,a]]) {
      const p = this.people[owner];
      p.seen[other] = { ...p.seen[other], seenAt: now, ...(interacted ? { interactedAt: now } : {}) };
      const ids = Object.keys(p.seen).sort((x,y) => p.seen[y].seenAt - p.seen[x].seenAt);
      for (const id of ids.slice(200)) delete p.seen[id];
    }
  }
  change(a, b, action) {
    return this.transaction(() => {
      const p = this.people[a], q = this.people[b];
      requireThat(p && q && a !== b, 'contact_not_found');
      if (action === 'request') {
        requireThat(p.seen[b], 'contact_not_seen');
        requireThat(!p.friends.includes(b), 'already_friends');
        requireThat(!p.incoming.includes(b), 'request_waiting');
        requireThat(q.incoming.length < 100 && Object.values(this.people).filter(x => x.incoming.includes(a)).length < 100, 'contacts_limit');
        if (!q.incoming.includes(a)) q.incoming.push(a);
      } else if (action === 'accept') {
        requireThat(p.incoming.includes(b), 'request_missing');
        requireThat(p.friends.length < 500 && q.friends.length < 500, 'contacts_limit');
        p.incoming = p.incoming.filter(x => x !== b); q.incoming = q.incoming.filter(x => x !== a);
        if (!p.friends.includes(b)) p.friends.push(b);
        if (!q.friends.includes(a)) q.friends.push(a);
      } else if (action === 'reject') p.incoming = p.incoming.filter(x => x !== b);
      else if (action === 'cancel') q.incoming = q.incoming.filter(x => x !== a);
      else if (action === 'remove') { p.friends = p.friends.filter(x => x !== b); q.friends = q.friends.filter(x => x !== a); }
      else throw new Error('bad_frame');
    });
  }
  areFriends(a, b) { return !!this.people[a]?.friends.includes(b); }
  snapshot(id, onlineIds) {
    const p = this.people[id];
    const outgoing = Object.keys(this.people).filter(x => this.people[x].incoming.includes(id));
    const ids = new Set([...p.friends, ...p.incoming, ...outgoing, ...Object.keys(p.seen)]);
    return [...ids].filter(x => this.people[x]).map(x => ({
      id: x, nickname: this.people[x].nickname, character: this.people[x].character, title: this.people[x].companion ? '陪伴角色' : '',
      online: onlineIds.has(x), ...p.seen[x],
      relation: p.friends.includes(x) ? 'friend' : p.incoming.includes(x) ? 'incoming' : outgoing.includes(x) ? 'outgoing' : 'none',
    }));
  }
}
