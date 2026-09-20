import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SteamService, type SteamNative, type SteamRoom } from '../src/main/steam/service';
import { steamConfig, steamId, joinCommand, parseJoin, joinFromArgs, roomRealm } from '../src/main/steam/rules';

const self = { steamId: '76561198000000001', name: '测试玩家' };
const friend = { steamId: '76561198000000002', name: '<script>friend</script>', state: 1 };
const realm = roomRealm('wss://qbot.test/rooms');
const command = joinCommand('ABCD1234', 480, realm);
let adapter: SteamNative;
let service: SteamService;
let room: SteamRoom | null;
let now: number;
let changed: ReturnType<typeof vi.fn>;
let incoming: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers(); now = 1000000; room = null; changed = vi.fn(); incoming = vi.fn();
  adapter = { init: vi.fn(), read: vi.fn(() => ({ online: true, self, friends: [friend] })), pump: vi.fn(),
    launchCommand: vi.fn(() => ''), setConnect: vi.fn(), invite: vi.fn(() => true), shutdown: vi.fn() };
  service = new SteamService({ config: { appId: 480, demo: true }, realm, native: () => adapter,
    room: () => room, changed, incoming, now: () => now });
});
afterEach(() => { service.stop(); vi.useRealTimers(); });
describe('Steam configuration and untrusted join payloads', () => {
  it('accepts the full individual public SteamID range without losing uint64 precision', () => {
    expect(steamId('76561202255233023')).toBe(true);
    expect(steamId('76561202255233024')).toBe(false);
    expect(steamId('76561197960265727')).toBe(false);
    expect(steamId(76561198000000001)).toBe(false);
  });
  it('does not load any native dependency when disabled or misconfigured', () => {
    for (const config of [{demo:false}, {appId:480,demo:true,error:'blocked'}]) {
      const native = vi.fn(() => adapter);
      const disabled = new SteamService({config, realm, native, room:()=>null,changed:()=>{},incoming:()=>{}});
      disabled.start(); disabled.refresh(); disabled.receive(command);
      expect(native).not.toHaveBeenCalled(); expect(disabled.snapshot().pendingJoin).toBeUndefined(); disabled.stop();
    }
  });
  it('defaults off and never enables the example in a packaged app', () => {
    expect(steamConfig({}, false)).toEqual({ demo: false });
    expect(steamConfig({ QBOT_STEAM_APP_ID: '480' }, false).error).toBeTruthy();
    expect(steamConfig({ QBOT_STEAM_APP_ID: '480', QBOT_STEAM_DEMO: '1' }, true).error).toBeTruthy();
    expect(steamConfig({ QBOT_STEAM_APP_ID: '480', QBOT_STEAM_DEMO: '1' }, false)).toEqual({ appId: 480, demo: true });
    for (const id of ['0', '-1', '1.5', 'NaN', '4294967296']) expect(steamConfig({ QBOT_STEAM_APP_ID: id }, false).error).toBeTruthy();
  });
  it('accepts only the exact application/realm/version/code, never URLs or extra arguments', () => {
    expect(parseJoin(command, 480, realm)).toBe('ABCD1234');
    for (const input of [command + ' --evil', command.replace('480', '481'), command.replace(realm, roomRealm('ws://evil')), command.replace('v1', 'v2'), 'https://evil.test', '+connect_lobby 123', command.replace('ABCD1234', '../../x')]) {
      expect(parseJoin(input, 480, realm)).toBeNull();
    }
    expect(joinFromArgs(['electron', 'app', '+qbot_join', command.split(' ')[1]])).toBe(command);
    expect(joinFromArgs(['+qbot_join'])).toBeNull();
    expect(joinFromArgs(['+qbot_join', 'a', '+qbot_join', 'b'])).toBeNull();
  });
});
describe('Steam lifecycle and invitations', () => {
  it('starts once, returns serializable real identity, and frees the callback pump on shutdown', async () => {
    service.start(); service.start();
    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(service.snapshot().friends).toEqual([friend]);
    expect(() => JSON.stringify(service.snapshot())).not.toThrow();
    await vi.advanceTimersByTimeAsync(200); expect(adapter.pump).toHaveBeenCalledTimes(2);
    service.stop(); await vi.advanceTimersByTimeAsync(500); expect(adapter.pump).toHaveBeenCalledTimes(2);
    expect(adapter.shutdown).toHaveBeenCalledTimes(1);
  });
  it('reports init failures, shuts down and allows explicit retry', () => {
    vi.mocked(adapter.init).mockImplementationOnce(() => { throw new Error('Steam not running'); });
    expect(service.start().phase).toBe('unavailable');
    expect(adapter.shutdown).toHaveBeenCalledTimes(1);
    expect(service.refresh().phase).toBe('ready');
  });
  it('publishes only a connected real room and removes join state after leaving/disconnection', () => {
    service.start(); room = { roomId: 'ABCD1234', online: true, testing: true }; service.syncRoom();
    expect(adapter.setConnect).not.toHaveBeenCalled();
    room.testing = false; service.syncRoom(); expect(adapter.setConnect).toHaveBeenLastCalledWith(command);
    room.online = false; service.syncRoom(); expect(adapter.setConnect).toHaveBeenLastCalledWith(null);
    expect(service.snapshot().canInvite).toBe(false);
  });
  it('does not invite strangers, malformed IDs, or local rehearsal guests; throttles duplicate sends', () => {
    service.start();
    expect(() => service.invite(friend.steamId)).toThrow('房间');
    room = { roomId: 'ABCD1234', online: true };
    expect(() => service.invite('76561198000000003')).toThrow('好友列表');
    expect(() => service.invite(76561198000000002)).toThrow('无效');
    service.invite(friend.steamId);
    expect(adapter.invite).toHaveBeenCalledWith(friend.steamId, command);
    expect(() => service.invite(friend.steamId)).toThrow('稍等');
    now += 10001; service.invite(friend.steamId); expect(adapter.invite).toHaveBeenCalledTimes(2);
  });
  it('propagates an SDK invitation failure instead of reporting success', () => {
    service.start(); room = { roomId: 'ABCD1234', online: true };
    vi.mocked(adapter.invite).mockReturnValue(false);
    expect(() => service.invite(friend.steamId)).toThrow('未能发送');
  });
  it('handles a warm join callback without connecting or joining automatically', async () => {
    service.start(); vi.mocked(adapter.pump).mockImplementation(cb => cb(command, friend.steamId));
    await vi.advanceTimersByTimeAsync(300);
    expect(service.snapshot().pendingJoin?.roomId).toBe('ABCD1234');
    expect(incoming).toHaveBeenCalledTimes(1);
    expect(adapter.invite).not.toHaveBeenCalled();
  });
  it('retains a cold-start SDK command until a window can fetch it', () => {
    vi.mocked(adapter.launchCommand).mockReturnValue(command);
    service.start();
    expect(service.snapshot().pendingJoin?.roomId).toBe('ABCD1234');
  });
  it('requires consent, preserves rejected/failed joins, and consumes only successful joins', async () => {
    service.start(); service.receive(command, friend.steamId);
    const id = service.snapshot().pendingJoin!.id;
    const join = vi.fn().mockRejectedValueOnce(new Error('房间已满')).mockResolvedValue(undefined);
    await service.accept(id, async () => false, join); expect(join).not.toHaveBeenCalled();
    await expect(service.accept(id, async () => true, join)).rejects.toThrow('已满');
    expect(service.snapshot().pendingJoin?.id).toBe(id);
    await service.accept(id, async () => true, join); expect(join).toHaveBeenLastCalledWith('ABCD1234');
    expect(service.snapshot().pendingJoin).toBeUndefined();
  });
  it('rechecks expiration after consent, rejecting delayed/stale acceptance', async () => {
    service.start(); service.receive(command);
    const id = service.snapshot().pendingJoin!.id; const join = vi.fn();
    await expect(service.accept(id, async () => { now += 120001; return true; }, join)).rejects.toThrow('失效');
    expect(join).not.toHaveBeenCalled();
  });
  it('rejects concurrent acceptance and a pending invitation replaced during consent', async () => {
    service.start(); service.receive(command);
    const id = service.snapshot().pendingJoin!.id; const join = vi.fn();
    let confirm!: (value: boolean) => void;
    const first = service.accept(id, () => new Promise(resolve => {confirm=resolve;}), join);
    await expect(service.accept(id, async()=>true, join)).rejects.toThrow('正在处理');
    service.receive(joinCommand('EFGH1234',480,realm)); confirm(true);
    await expect(first).rejects.toThrow('失效'); expect(join).not.toHaveBeenCalled();
    expect(service.snapshot().pendingJoin?.roomId).toBe('EFGH1234');
  });
  it('requires leaving a local rehearsal before accepting an external invitation', async () => {
    service.start(); service.receive(command); room={roomId:'TEST1234',online:true,testing:true};
    const consent=vi.fn(), join=vi.fn();
    await expect(service.accept(service.snapshot().pendingJoin!.id,consent,join)).rejects.toThrow('退出本地试演');
    expect(consent).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
  });
  it('clears stale identity and pending requests on logout and account switching', () => {
    service.start(); room = { roomId: 'ABCD1234', online: true }; service.syncRoom(); service.receive(command);
    vi.mocked(adapter.read).mockReturnValueOnce({ online: true, self: { ...self, steamId: '76561198000000003' }, friends: [] });
    expect(service.refresh().pendingJoin).toBeUndefined();
    service.receive(command); vi.mocked(adapter.read).mockReturnValue({ online: false, self, friends: [friend] });
    const state = service.refresh();
    expect(state.self).toBeUndefined(); expect(state.friends).toEqual([]); expect(state.pendingJoin).toBeUndefined();
    expect(adapter.setConnect).toHaveBeenLastCalledWith(null);
  });
  it('isolates snapshots from renderer mutations and bounds duplicate requests', () => {
    service.start(); service.receive(command); const snapshot = service.snapshot(); snapshot.friends.length = 0;
    expect(service.snapshot().friends).toHaveLength(1);
    service.dismiss(snapshot.pendingJoin!.id); service.receive(command); expect(service.snapshot().pendingJoin).toBeUndefined();
    now += 120001; service.receive(command); expect(service.snapshot().pendingJoin).toBeDefined();
  });
  it('cleans up on callback failure rather than continuing a broken polling loop', async () => {
    service.start(); vi.mocked(adapter.pump).mockImplementation(() => { throw new Error('native failure'); });
    await vi.advanceTimersByTimeAsync(500); expect(adapter.pump).toHaveBeenCalledTimes(1);
    expect(service.snapshot().phase).toBe('unavailable'); expect(adapter.shutdown).toHaveBeenCalledTimes(1);
  });
});
