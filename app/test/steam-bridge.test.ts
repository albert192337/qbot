import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SteamBridge } from '../src/main/steam/bridge';
import type { SteamSnapshot } from '../src/shared/steam';

const ready:SteamSnapshot={phase:'ready',appId:480,demo:true,label:'test',reason:'',friends:[],canInvite:false};
class Worker extends EventEmitter { postMessage=vi.fn(); kill=vi.fn(); }
let bridge:SteamBridge, worker:Worker, spawn:ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.useFakeTimers(); worker=new Worker(); spawn=vi.fn(()=>worker);
  bridge=new SteamBridge({config:{appId:480,demo:true},realm:'1234567812345678',spawn,
    room:()=>null,changed:()=>{},incoming:()=>{},decode:s=>s});
});
afterEach(()=>{bridge.stop();vi.useRealTimers();});
function call() {return worker.postMessage.mock.calls.map(([value])=>value as any).filter(v=>v.type==='call').at(-1);}
it('contains native process death, rejects waiting operations, clears identity and can retry',async()=>{
  const pending=bridge.refresh(); worker.emit('message',{type:'changed',state:{...ready,self:{steamId:'76561198000000001',name:'test'}}});
  worker.emit('exit',134);
  await expect(pending).rejects.toThrow('原生进程'); expect(bridge.snapshot().phase).toBe('unavailable');
  expect(bridge.snapshot().self).toBeUndefined(); expect(worker.kill).toHaveBeenCalledTimes(1);
  worker=new Worker(); spawn.mockReturnValue(worker);
  const retry=bridge.refresh(); worker.emit('message',{type:'result',id:call().id,state:ready});
  await expect(retry).resolves.toMatchObject({phase:'ready'}); expect(spawn).toHaveBeenCalledTimes(2);
});
it('times out a hung native call without leaving the UI waiting forever',async()=>{
  const pending=bridge.refresh(); const rejection=expect(pending).rejects.toThrow('超时');
  await vi.advanceTimersByTimeAsync(15001); await rejection;
  expect(worker.kill).toHaveBeenCalledTimes(1);expect(bridge.snapshot().canInvite).toBe(false);
});
it('keeps consent and room joining in the parent and delivers failures to the worker',async()=>{
  const refresh=bridge.refresh();worker.emit('message',{type:'result',id:call().id,state:ready});await refresh;
  const consent=vi.fn(async()=>false),join=vi.fn(async()=>{throw new Error('room full');});
  const accept=bridge.accept('invitation',consent,join);const id=call().id;
  worker.emit('message',{type:'callback',id,callbackId:1,method:'consent'});await Promise.resolve();
  expect(worker.postMessage).toHaveBeenCalledWith({type:'callbackResult',id:1,value:false});expect(join).not.toHaveBeenCalled();
  worker.emit('message',{type:'callback',id,callbackId:2,method:'join',roomId:'ABCD1234'});await Promise.resolve();
  expect(worker.postMessage).toHaveBeenCalledWith({type:'callbackResult',id:2,error:'Error: room full'});
  worker.emit('message',{type:'result',id,error:'room full'});await expect(accept).rejects.toThrow('room full');
});
it('does not spawn while disabled and ignores stale worker updates after stop',async()=>{
  const disabled=new SteamBridge({config:{demo:false},realm:'',spawn,room:()=>null,changed:()=>{},incoming:()=>{},decode:s=>s});
  expect((await disabled.refresh()).phase).toBe('disabled');expect(spawn).not.toHaveBeenCalled();
  const pending=bridge.refresh();bridge.stop();await expect(pending).rejects.toThrow('关闭');
  worker.emit('message',{type:'changed',state:ready});expect(bridge.snapshot().phase).toBe('disabled');disabled.stop();
});
