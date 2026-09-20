import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Manifest } from '@qbot/pipeline';
import { Player } from '../src/renderer/pet/player';

class Element extends EventTarget {
  style = { visibility: 'hidden', cssText: '' };
  className = '';
  classList = { remove: vi.fn(), add: vi.fn() };
  children: Element[] = [];
  parent: Element | null = null;
  isConnected = true;
  src = '';
  paused = true;
  loop = false;
  readyState = 4;
  currentTime = 0;
  duration = 5;
  error: { message: string } | null = null;
  play = vi.fn((): Promise<void> => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn(() => { this.error = null; });
  constructor(readonly tag = 'div') { super(); }
  appendChild(child: Element) { this.children.push(child); child.parent = this; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((el) => el !== this); this.isConnected = false; }
  removeAttribute() { this.src = ''; }
  querySelector() { return this.children.find((el) => el.className === 'stage-poof'); }
  querySelectorAll() { return this.children.filter((el) => el.tag === 'video' || el.className === 'stage-poof'); }
  emit(name: string) { this.dispatchEvent(new Event(name)); }
}
const manifest = (ids = ['idle', 'tea']) => ({
  name: 'Pet', sourceImage: 'source.png',
  actions: Object.fromEntries(ids.map((id) => [id, { status: 'done', webm: `${id}.webm` }])),
}) as unknown as Manifest;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
let stage: Element;
let player: Player;
let ended: ReturnType<typeof vi.fn>;
const video = (id: string) => stage.children.find((el) => el.tag === 'video' && el.src.includes(`/${id}.webm`))!;
const visible = () => stage.children.filter((el) => el.tag === 'video' && el.style.visibility === 'visible');
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('document', { createElement: (tag: string) => new Element(tag) });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  stage = new Element(); ended = vi.fn();
  player = new Player(stage as unknown as HTMLElement, ended);
  player.load('pet', manifest());
});
afterEach(() => { player.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Player visibility and recovery', () => {
  it('keeps the previous video visible until the next playback starts', async () => {
    player.play('idle'); await flush();
    let resolve!: () => void;
    video('tea').play.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    player.play('tea');
    expect(visible()).toEqual([video('idle')]);
    resolve(); await flush();
    expect(visible()).toEqual([video('tea')]);
  });
  it('returns to a visible idle after a meeting action ends', async () => {
    ended.mockImplementation(() => player.play('idle'));
    player.play('tea'); await flush(); video('tea').emit('ended'); await flush();
    expect(visible()).toEqual([video('idle')]);
  });
  it('uses an available video when idle is absent', async () => {
    player.load('pet', manifest(['tea'])); player.play('idle'); await flush();
    expect(visible()).toEqual([video('tea')]); expect(video('tea').loop).toBe(true);
  });
  it('catches rejected playback, retries once and falls back to idle', async () => {
    player.play('idle'); await flush();
    video('tea').play.mockRejectedValue(new Error('decoder failed'));
    player.play('tea'); await flush(); await flush();
    expect(video('tea').play).toHaveBeenCalledTimes(2);
    expect(visible()).toEqual([video('idle')]);
  });
  it('ignores completion of a superseded pending play', async () => {
    let resolve!: () => void;
    video('tea').play.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    player.play('tea'); player.play('idle'); await flush(); resolve(); await flush();
    expect(visible()).toEqual([video('idle')]);
  });
  it('late ended events cannot cancel the current completion deadline', async () => {
    player.play('idle'); await flush(); player.play('tea'); await flush();
    video('idle').emit('ended');
    await vi.advanceTimersByTimeAsync(7000);
    expect(ended).toHaveBeenCalledTimes(1);
  });
  it('recovers a stalled looping idle even though it never emits ended', async () => {
    player.play('idle'); await flush();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(video('idle').load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(visible()).toEqual([video('tea')]);
  });
  it('one hour of loop progress prevents unnecessary reloads', async () => {
    player.play('idle'); await flush();
    for (let i = 0; i < 1800; i++) {
      await vi.advanceTimersByTimeAsync(2000);
      video('idle').currentTime = i % 3;
      video('idle').emit('timeupdate');
    }
    expect(video('idle').load).not.toHaveBeenCalled();
  });
  it('keeps source art visible when all video assets fail', async () => {
    for (const el of stage.children.filter((el) => el.tag === 'video')) el.play.mockRejectedValue(new Error('bad asset'));
    player.play('idle'); for (let i = 0; i < 8; i++) await flush();
    expect(visible()).toEqual([]);
    expect(stage.children.find((el) => el.tag === 'img')?.style.visibility).not.toBe('hidden');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('releases old media and ignores pending callbacks after character reload', async () => {
    const old = video('tea'); let resolve!: () => void;
    old.play.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    player.play('tea'); player.load('other', manifest()); player.play('idle'); await flush();
    resolve(); await flush(); old.emit('ended'); old.emit('error');
    expect(old.src).toBe(''); expect(old.isConnected).toBe(false);
    expect(visible()).toEqual([video('idle')]); expect(ended).not.toHaveBeenCalled();
  });
  it('only creates one video for an overridden action', () => {
    const m = manifest(); m.importedActions = { idle: { webm: 'sticker.webm', raw: 'raw.gif', durationSec: 5, sourceName: 'sticker' } };
    player.load('pet', m);
    expect(stage.children.filter((el) => el.tag === 'video')).toHaveLength(2);
    expect(stage.children.some((el) => el.src.includes('sticker.webm'))).toBe(true);
  });
});

it('an unfinished override does not remove a completed standard action', async () => {
  const m = manifest();
  m.customActions = { idle: { status: 'pending', webm: 'unfinished.webm', gif: 'unfinished.gif', durationSec: 5 } };
  expect(player.load('pet', m)).toContain('idle');
  player.play('idle'); await flush(); expect(visible()).toEqual([video('idle')]);
});
it('an ended event arriving after the safety deadline completes only once', async () => {
  player.play('tea'); await flush(); await vi.advanceTimersByTimeAsync(7000);
  video('tea').emit('ended'); expect(ended).toHaveBeenCalledOnce();
});
it('recovers from a runtime media error after playback has started', async () => {
  player.play('idle'); await flush();
  video('idle').error = { message: 'decoder lost' }; video('idle').emit('error'); await flush();
  expect(video('idle').load).toHaveBeenCalledOnce(); expect(visible()).toEqual([video('idle')]);
});
it('preserves one-shot completion when a looping idle clip fails and falls back', async () => {
 video('idle').play.mockRejectedValue(new Error('failed idle'));
 player.playOnce('idle'); await flush(); await flush();
 expect(visible()).toEqual([video('tea')]); expect(video('tea').loop).toBe(false);
 video('tea').emit('ended'); expect(ended).toHaveBeenCalledOnce();
});

it('selects scene variants on entry, keeps the loop stable, and honors an explicit idle-director choice', async () => {
  const m=manifest(['idle','drag','tea']);m.scenePools={drag:['idle','tea'],idle:['idle','tea']};
  const random=vi.spyOn(Math,'random').mockReturnValue(0.99);
  player.load('pet',m);player.play('drag');await flush();
  expect(visible()).toEqual([video('tea')]);expect(video('tea').loop).toBe(true);
  random.mockReturnValue(0);player.play('drag');await flush();
  expect(visible()).toEqual([video('tea')]);
  random.mockReturnValue(0.99);player.playOnce('idle');await flush();
  expect(visible()).toEqual([video('idle')]);expect(video('idle').loop).toBe(false);
});
