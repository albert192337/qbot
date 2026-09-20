import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ unpack: vi.fn(async () => {}) }));
vi.mock('node:fs', () => ({ existsSync: () => false, statSync: vi.fn() }));
vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn(async (prefix: string) => `${prefix}unique`),
  rm: vi.fn(async () => {}), rename: vi.fn(async () => {}),
  readFile: vi.fn(async () => '{"name":"Peer"}'), readdir: vi.fn(async () => []),
}));
vi.mock('../src/main/characters', () => ({ charactersDir: () => '/test/characters' }));
vi.mock('../src/main/config', () => ({ getSettings: async () => ({ roomsShowMyPet: false }) }));
vi.mock('../src/main/asset-pack', async (original) => ({
  ...await original<typeof import('../src/main/asset-pack')>(),
  unpackCharacter: mocks.unpack,
}));

let api: typeof import('../src/main/rooms/room-pets');
const hash = 'cc6fd92649585cd1';
const other = 'aaaaaaaaaaaaaaaa';
let send: ReturnType<typeof vi.fn>;
let events: Array<import('../src/main/rooms/room-pets').RoomPetEvent>;
function start(id = 'peer', pack = hash) { api.onMemberPack(id, 'Peer', pack); }
function begin(total: number, pack = hash) { api.handlePackFrame({ t: 'pack:begin', hash: pack, total }); }
function chunk(seq: number, pack = hash) { api.handlePackFrame({ t: 'pack:chunk', hash: pack, seq, data: 'eA==' }); }
function gets(pack = hash) { return send.mock.calls.filter(([f]) => f.t === 'pack:get' && f.hash === pack); }

beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers();
  mocks.unpack.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  api = await import('../src/main/rooms/room-pets');
  send = vi.fn(); events = [];
  api.setRoomsSend(send); api.onRoomPetEvent(e => events.push(e));
});
afterEach(() => { api.onLeftRoom(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('room character downloads', () => {
  it('finishes a progressing download taking longer than 30 seconds without restarting', async () => {
    start(); begin(3);
    for (let seq = 0; seq < 3; seq++) {
      await vi.advanceTimersByTimeAsync(20_000); chunk(seq);
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(gets()).toHaveLength(1);
    expect(mocks.unpack).toHaveBeenCalledTimes(1);
    expect(events.some(e => e.kind === 'character')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds silent timeouts and continues with the next queued character', async () => {
    start(); start('second', other);
    await vi.advanceTimersByTimeAsync(240_000);
    expect(gets()).toHaveLength(6);
    expect(events.some(e => e.kind === 'packFailed' && e.memberId === 'peer')).toBe(true);
    expect(gets(other).length).toBeGreaterThan(0);
  });

  it.each(['pack:not_found', 'pack:busy'])('backs off and bounds %s retries', async code => {
    start();
    for (let attempt = 0; attempt < 6; attempt++) {
      api.handlePackError(code);
      await vi.advanceTimersByTimeAsync(3_000 * (attempt + 1));
    }
    await vi.advanceTimersByTimeAsync(300_000);
    expect(gets()).toHaveLength(6);
    expect(events.filter(e => e.kind === 'packFailed')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels old deadlines when leaving and downloading the same hash again', async () => {
    start(); await vi.advanceTimersByTimeAsync(20_000);
    api.onLeftRoom(); expect(vi.getTimerCount()).toBe(0);
    start(); begin(2); await vi.advanceTimersByTimeAsync(15_000); chunk(0);
    await vi.advanceTimersByTimeAsync(20_000); chunk(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(gets()).toHaveLength(2);
    expect(events.filter(e => e.kind === 'character')).toHaveLength(1);
  });

  it('cancels pending backoff on leave', async () => {
    start(); api.handlePackError('pack:busy'); api.onLeftRoom();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(gets()).toHaveLength(1); expect(vi.getTimerCount()).toBe(0);
  });

  it('stops the network timer during unpack and ignores duplicate final chunks', async () => {
    let resolve!: () => void;
    mocks.unpack.mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));
    start(); begin(1); chunk(0); chunk(0);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(gets()).toHaveLength(1); expect(mocks.unpack).toHaveBeenCalledTimes(1);
    resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(events.filter(e => e.kind === 'character')).toHaveLength(1);
  });

  it('does not publish an unpack result from a room that has already been left', async () => {
    let resolve!: () => void;
    mocks.unpack.mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));
    start(); begin(1); chunk(0); await vi.advanceTimersByTimeAsync(0);
    api.onLeftRoom(); start();
    resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(events.filter(e => e.kind === 'character')).toHaveLength(0);
    begin(1); chunk(0); await vi.advanceTimersByTimeAsync(0);
    expect(events.filter(e => e.kind === 'character')).toHaveLength(1);
  });

  it('restarts the assembler after a stalled partial download and recovers', async () => {
    start(); begin(2); chunk(0);
    await vi.advanceTimersByTimeAsync(33_000);
    expect(gets()).toHaveLength(2);
    begin(2); chunk(0); chunk(1); await vi.advanceTimersByTimeAsync(0);
    expect(events.filter(e => e.kind === 'character')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

});
