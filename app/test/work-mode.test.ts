import { afterEach, expect, it, vi } from 'vitest';
import { WorkMode, WORK_IDLE, WORK_TYPING } from '../src/renderer/pet/work-mode';
afterEach(()=>vi.useRealTimers());
it('switches on input and stops after 100 idle milliseconds, without restarting ongoing playback',async()=>{
  vi.useFakeTimers();let idle=9000;const play=vi.fn();
  const mode=new WorkMode(async()=>idle,play);mode.start();
  expect(play).toHaveBeenLastCalledWith(WORK_IDLE);
  idle=0;await vi.advanceTimersByTimeAsync(25);
  expect(play).toHaveBeenLastCalledWith(WORK_TYPING);
  await vi.advanceTimersByTimeAsync(1000);expect(play).toHaveBeenCalledTimes(2);
  idle=100;await vi.advanceTimersByTimeAsync(25);
  expect(play).toHaveBeenLastCalledWith(WORK_IDLE);
  mode.stop();idle=0;await vi.advanceTimersByTimeAsync(1000);expect(play).toHaveBeenCalledTimes(3);
});
it('ignores a pending sample after exit or restart',async()=>{
  vi.useFakeTimers();let resolve!:(value:number)=>void;
  const play=vi.fn();const mode=new WorkMode(()=>new Promise(r=>{resolve=r}),play);
  mode.start();await vi.advanceTimersByTimeAsync(25);mode.stop();mode.start();
  resolve(0);await Promise.resolve();expect(play.mock.calls).toEqual([[WORK_IDLE],[WORK_IDLE]]);
  mode.stop();
});
it('fails quiet on unavailable, invalid or locked input',async()=>{
  vi.useFakeTimers();let idle=0;let fail=false;const play=vi.fn();
  const mode=new WorkMode(async()=>{if(fail)throw Error('unavailable');return idle},play);
  mode.start();await vi.advanceTimersByTimeAsync(25);fail=true;
  await vi.advanceTimersByTimeAsync(25);expect(play).toHaveBeenLastCalledWith(WORK_IDLE);
  fail=false;idle=NaN;await vi.advanceTimersByTimeAsync(25);expect(play).toHaveBeenCalledTimes(3);
  idle=15000;await vi.advanceTimersByTimeAsync(25);expect(play).toHaveBeenCalledTimes(3);mode.stop();
});

it('does not treat the entry double click as subsequent work input',async()=>{
  vi.useFakeTimers();const entered=performance.now();const play=vi.fn();
  const mode=new WorkMode(async()=>performance.now()-entered,play);mode.start();
  await vi.advanceTimersByTimeAsync(2000);
  expect(play.mock.calls).toEqual([[WORK_IDLE]]);mode.stop();
});
