import {afterEach,expect,it,vi} from 'vitest';
import {PairInteraction} from '../src/renderer/pet/pair-interaction';
import type {CharacterMeta} from '../src/shared/ipc-types';
class Node {
 id='';className='';textContent='';title='';dataset:Record<string,string>={};style:Record<string,string>={};
 classList={add:vi.fn(),remove:vi.fn(),toggle:vi.fn()};
 append(..._nodes:unknown[]){} setAttribute(){} replaceChildren(){} remove(){}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
it('repeats short clips, keeps a finished actor moving, and advances after both complete at a clip boundary',()=>{
 vi.useFakeTimers();vi.setSystemTime(0);vi.stubGlobal('document',{body:new Node(),createElement:()=>new Node()});
 const clip={status:'done',webm:'x.webm',durationSec:1};
 const meta={dirId:'a',manifest:{name:'A',actions:{idle:clip,talk_happy:clip,tea:clip}}} as unknown as CharacterMeta;
 const callbacks={start:vi.fn(),play:vi.fn(),replay:vi.fn(),rest:vi.fn(),end:vi.fn()};
 const pair=new PairInteraction(callbacks);pair.start(meta,{...meta,dirId:'b'},'tea');
 for(let t=1000;t<4500;t+=1000){vi.setSystemTime(t);pair.ended('host');}
 expect(callbacks.replay).toHaveBeenCalledTimes(4);expect(callbacks.rest).not.toHaveBeenCalled();expect(callbacks.play).toHaveBeenCalledTimes(1);
 vi.setSystemTime(5000);pair.ended('host');
 expect(callbacks.rest).toHaveBeenCalledWith('host','idle');expect(callbacks.play).toHaveBeenCalledTimes(1);
 pair.ended('host');expect(callbacks.rest).toHaveBeenCalledTimes(1);
 vi.setSystemTime(7000);pair.ended('guest');expect(callbacks.play).toHaveBeenCalledTimes(2);
 pair.cancel();expect(callbacks.end).toHaveBeenCalledOnce();
 vi.advanceTimersByTime(90000);pair.ended('host');expect(callbacks.play).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
});
it('conceals the exit until resize acknowledges and cancels a stale return when a new interaction starts',async()=>{
 vi.useFakeTimers();vi.setSystemTime(0);const body=new Node();vi.stubGlobal('document',{body,createElement:()=>new Node()});
 const clip={status:'done',webm:'x.webm',durationSec:1};
 const meta={dirId:'a',manifest:{name:'A',actions:{idle:clip,talk_happy:clip}}} as unknown as CharacterMeta;
 let acknowledge!:()=>void;
 const callbacks={start:vi.fn(),play:vi.fn(),replay:vi.fn(),rest:vi.fn(),end:vi.fn(()=>new Promise<void>(r=>{acknowledge=r}))};
 const pair=new PairInteraction(callbacks);pair.start(meta,{...meta,dirId:'b'},'heart');
 pair.finish();pair.finish();expect(callbacks.end).not.toHaveBeenCalled();
 await vi.advanceTimersByTimeAsync(240);expect(callbacks.end).toHaveBeenCalledOnce();
 expect(body.classList.add).toHaveBeenCalledWith('pair-returning');
 await vi.advanceTimersByTimeAsync(500);expect(body.classList.add).not.toHaveBeenCalledWith('pair-arriving');
 acknowledge();await vi.advanceTimersByTimeAsync(80);expect(body.classList.add).toHaveBeenCalledWith('pair-arriving');
 await vi.advanceTimersByTimeAsync(420);expect(vi.getTimerCount()).toBe(0);
 pair.start(meta,{...meta,dirId:'b'},'heart');pair.finish();await vi.advanceTimersByTimeAsync(240);
 body.classList.add.mockClear();pair.start(meta,{...meta,dirId:'b'},'chat');
 acknowledge();await vi.advanceTimersByTimeAsync(1000);
 expect(body.classList.add).not.toHaveBeenCalledWith('pair-arriving');expect(pair.isActive()).toBe(true);
 pair.cancel();expect(vi.getTimerCount()).toBe(0);
});
