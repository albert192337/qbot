import { randomUUID } from 'node:crypto';
import type { SteamSnapshot, SteamPerson, SteamFriend } from '../../shared/steam';
import { joinCommand, parseJoin, roomCode, steamId, type SteamConfig } from './rules';

export interface SteamNative {
  init(appId: number): void;
  read(): { online: boolean; self: SteamPerson; friends: SteamFriend[] };
  pump(onJoin: (command: string, from?: string) => void): void;
  launchCommand(): string;
  setConnect(command: string | null): void;
  invite(id: string, command: string): boolean;
  shutdown(): void;
}
export interface SteamRoom { roomId: string; testing?: boolean; online: boolean }
export interface SteamServiceOptions {
  config: SteamConfig;
  realm: string;
  native: () => SteamNative;
  room: () => SteamRoom | null;
  changed: (snapshot: SteamSnapshot) => void;
  incoming: () => void;
  now?: () => number;
}

/** Owns the SDK lifetime; no Electron or network dependency makes boundary tests deterministic. */
export class SteamService {
  private adapter?: SteamNative;
  private timer?: ReturnType<typeof setInterval>;
  private nextRead = 0;
  private published: string | null = null;
  private lastJson = '';
  private lastInvite = new Map<string, number>();
  private seen = new Map<string, number>();
  private accepting = false;
  private state: SteamSnapshot;
  private now: () => number;

  constructor(private options: SteamServiceOptions) {
    this.now = options.now || Date.now;
    this.state = this.empty(options.config.error ? 'unavailable' : 'disabled', options.config.error || '此启动方式尚未启用 Steam。');
  }
  private empty(phase: SteamSnapshot['phase'], reason: string): SteamSnapshot {
    return { phase, appId: this.options.config.appId, demo: this.options.config.demo,
      label: phase === 'ready' ? this.options.config.demo ? 'Steam · SpaceWar 测试' : 'Steam 已连接' : 'Steam 尚未连接',
      reason, friends: [], canInvite: false };
  }
  snapshot(): SteamSnapshot {
    this.expire();
    return structuredClone(this.state);
  }
  start(): SteamSnapshot {
    if (this.adapter) return this.refresh();
    if (!this.options.config.appId || this.options.config.error) { this.emit(); return this.snapshot(); }
    try {
      this.adapter = this.options.native();
      this.adapter.init(this.options.config.appId);
      this.read();
      const command = this.adapter.launchCommand();
      if (command) this.receive(command);
      this.timer = setInterval(() => this.tick(), 100);
      this.timer.unref?.();
    } catch (error) { this.fail(error); }
    this.emit();
    return this.snapshot();
  }
  refresh(): SteamSnapshot {
    if (!this.adapter) return this.start();
    try { this.read(); this.syncRoom(); } catch (error) { this.fail(error); }
    this.emit(); return this.snapshot();
  }
  private read(): void {
    const data = this.adapter!.read();
    const pending = this.state.pendingJoin;
    if (!data.online) {
      this.state = this.empty('unavailable', 'Steam 客户端已离线，请登录后刷新。');
      this.lastInvite.clear(); this.seen.clear();
    } else {
      if (!steamId(data.self.steamId)) throw new Error('Steam 返回了无效的玩家身份');
      const switched = !!this.state.self && this.state.self.steamId !== data.self.steamId;
      if (switched) { this.lastInvite.clear(); this.seen.clear(); }
      this.state = { ...this.empty('ready', this.options.config.demo
        ? '使用官方 SpaceWar 示例身份测试；好友为真实 Steam 好友。'
        : 'Steam 好友已连接。'), self: data.self,
        friends: data.friends.filter(f => steamId(f.steamId) && f.steamId !== data.self.steamId),
        pendingJoin: switched ? undefined : pending };
    }
    this.nextRead = this.now() + 5000;
  }
  private tick(): void {
    try {
      this.adapter?.pump((command, from) => this.receive(command, from));
      if (this.now() >= this.nextRead) this.read();
      this.expire(); this.syncRoom(); this.emit();
    } catch (error) { this.fail(error); this.emit(); }
  }
  syncRoom(): void {
    const room = this.options.room();
    const command = this.state.phase === 'ready' && room?.online && !room.testing && roomCode(room.roomId)
      ? joinCommand(room.roomId, this.options.config.appId!, this.options.realm) : null;
    this.state.canInvite = !!command;
    if (this.adapter && command !== this.published) { this.adapter.setConnect(command); this.published = command; }
  }
  receive(command: string, from?: string): void {
    const appId = this.options.config.appId;
    if (!appId || this.options.config.error || from && !steamId(from)) return;
    const roomId = parseJoin(command, appId, this.options.realm);
    if (!roomId) return;
    this.expire();
    const key = `${from || ''}:${roomId}`;
    if (this.seen.has(key)) return;
    // Bound unsolicited callback state in the shared SpaceWar namespace.
    if (this.seen.size >= 100) return;
    this.seen.set(key, this.now() + 120000);
    this.state.pendingJoin = { id: randomUUID(), roomId, fromSteamId: from, expiresAt: this.now() + 120000 };
    this.emit(); this.options.incoming();
  }
  invite(id: unknown): void {
    if (!steamId(id)) throw new Error('无效的 Steam 好友');
    this.refresh();
    if (!this.adapter || this.state.phase !== 'ready') throw new Error(this.state.reason);
    if (!this.state.friends.some(f => f.steamId === id)) throw new Error('这位玩家不在当前 Steam 好友列表中');
    this.syncRoom();
    if (!this.published) throw new Error('请先加入或创建一个真实房间，本地试演不能发送 Steam 邀请');
    const now = this.now();
    if (now - (this.lastInvite.get(id) ?? -Infinity) < 10000) throw new Error('刚刚已邀请过这位朋友，请稍等再试');
    if (!this.adapter.invite(id, this.published)) throw new Error('Steam 未能发送邀请，请检查网络后重试');
    this.lastInvite.set(id, now);
  }
  async accept(id: string, consent: () => Promise<boolean>, join: (code: string) => Promise<unknown>): Promise<void> {
    if (this.accepting) throw new Error('正在处理加入请求');
    const pending = this.getPending(id);
    if (this.options.room()?.testing) throw new Error('请先退出本地试演，再接受 Steam 邀请');
    this.accepting = true;
    try {
      if (!await consent()) return;
      this.getPending(id); // the consent dialog can outlive the invitation
      await join(pending.roomId);
      if (this.state.pendingJoin?.id === id) this.state.pendingJoin = undefined;
      this.syncRoom(); this.emit();
    } finally { this.accepting = false; }
  }
  dismiss(id: string): void { this.getPending(id); this.state.pendingJoin = undefined; this.emit(); }
  private getPending(id: string) {
    this.expire();
    if (!this.state.pendingJoin || this.state.pendingJoin.id !== id) throw new Error('这条邀请已失效');
    return this.state.pendingJoin;
  }
  private expire(): void {
    const now = this.now();
    if (this.state.pendingJoin && this.state.pendingJoin.expiresAt <= now) this.state.pendingJoin = undefined;
    for (const [key, at] of this.seen) if (at <= now) this.seen.delete(key);
  }
  private emit(): void {
    const json = JSON.stringify(this.state);
    if (json !== this.lastJson) { this.lastJson = json; this.options.changed(this.snapshot()); }
  }
  private fail(error: unknown): void {
    this.release();
    this.state = this.empty('unavailable', `Steam 连接失败：${error instanceof Error ? error.message : '原生接口不可用'}。可在启动 Steam 后刷新重试。`);
  }
  private release(): void {
    clearInterval(this.timer); this.timer = undefined;
    try { this.adapter?.setConnect(null); } catch { /* disconnected */ }
    try { this.adapter?.shutdown(); } catch { /* never hold up app shutdown */ }
    this.adapter = undefined; this.published = null; this.lastInvite.clear(); this.seen.clear();
  }
  stop(): void { this.release(); this.state = this.empty('disabled', 'Steam 连接已关闭。'); this.emit(); }
}
