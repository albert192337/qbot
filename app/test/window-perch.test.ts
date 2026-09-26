import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({ query:vi.fn(), close:vi.fn(), move:vi.fn(), send:vi.fn(), bubble:vi.fn(), sources:vi.fn(), chat:vi.fn(),
  settings:{freeMode:true,behaviorMode:'free',activeCharacter:'cat',arkApiKey:'mock'},actions:['perch_sit'], visible:true,
}));
vi.mock('electron',()=>({desktopCapturer:{getSources:m.sources},screen:{
  screenToDipRect:(_w:unknown,r:unknown)=>r,dipToScreenPoint:(p:unknown)=>p,
  getCursorScreenPoint:()=>({x:400,y:400}),getDisplayMatching:()=>({workArea:{x:0,y:0,width:1920,height:1080}}),
}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({...m.settings})}));
vi.mock('../src/main/characters',()=>({getCharacter:async()=>null}));
vi.mock('../src/main/brain-llm',()=>({buildInput:async()=>({personaName:'小狗',conversation:[],recentLines:[],memoryRevision:1})}));
vi.mock('../src/main/windows',()=>({getActivePlayables:()=>m.actions,isRoomOpen:()=>false,movePetWindow:m.move,
  showBubbleWindow:()=>({isDestroyed:()=>false,webContents:{isLoading:()=>false,send:m.bubble}}),
  getPetWindow:()=>({isDestroyed:()=>false,isVisible:()=>m.visible,getBounds:()=>({x:100,y:200,width:360,height:360}),webContents:{send:m.send}}),
}));
vi.mock('../src/main/window-perch-native',()=>({PerchNative:class{query=m.query;capture=m.sources;close=m.close;}}));
vi.mock('../src/main/llm-client',()=>({chatComplete:m.chat}));
import { tryPerch, detachPerch, getPerchState } from '../src/main/window-perch';
import { getPerchObservation } from '../src/main/perch-observation';
import { perchAnchor, perchPosition } from '../src/shared/window-perch';
const target={handle:'1234',pid:987,title:'Fixture',bounds:{x:100,y:400,width:800,height:500}};
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();m.visible=true;m.actions=['perch_sit'];Object.assign(m.settings,{freeMode:true,behaviorMode:'free',activeCharacter:'cat'});
  m.query.mockResolvedValue(target);m.sources.mockResolvedValue({...target,frame:'fixture'});m.chat.mockResolvedValue(JSON.stringify({summary:'测试窗口中有一张表格',say:'趴稳啦，这里有张表格呢。'}));});
afterEach(()=>{detachPerch();vi.useRealTimers();});
it('geometry anchors sit/lie contact line, clamps multi-monitor coordinates and rejects insufficient room',()=>{
  expect(perchAnchor('perch_lie',0.75)).toBe(0.75);
  for(const invalid of [NaN,0,-1,2])expect(perchAnchor('perch_lie',invalid)).toBe(0.81);
  expect(perchPosition(target.bounds,{x:0,y:0,width:360,height:360},{x:0,y:0,width:1920,height:1080},0.5,0.61)).toEqual({x:320,y:180});
  expect(perchPosition({...target.bounds,y:0},{x:0,y:0,width:360,height:360},{x:0,y:0,width:1920,height:1080},0.5,0.61)).toBeNull();
  expect(perchPosition({...target.bounds,x:-1400},{x:0,y:0,width:360,height:360},{x:-1920,y:0,width:1920,height:1080},1,0.81)?.x).toBe(-780);
});
it.runIf(process.platform==='win32')('docks and follows while capturing only one selected-window frame',async()=>{
  expect((await tryPerch()).ok).toBe(true);await vi.advanceTimersByTimeAsync(0);
  expect(getPerchState()?.action).toBe('perch_sit');expect(getPerchObservation()?.summary).toContain('表格');
  expect(m.bubble).toHaveBeenCalledWith('behavior:say',expect.objectContaining({text:'趴稳啦，这里有张表格呢。'}));
  m.query.mockResolvedValue({...target,bounds:{...target.bounds,y:450}});await vi.advanceTimersByTimeAsync(1000);
  expect(m.move).toHaveBeenLastCalledWith(220,230);expect(m.sources).toHaveBeenCalledTimes(1);expect(m.chat).toHaveBeenCalledTimes(1);
  expect(m.sources.mock.calls[0][0]).toBe('1234');
  detachPerch();expect(getPerchState()).toBeNull();expect(getPerchObservation()).toBeNull();expect(m.close).toHaveBeenCalled();
});
it.runIf(process.platform==='win32')('companion mode never captures or submits a frame',async()=>{
  m.settings.behaviorMode='companion';await tryPerch();await vi.advanceTimersByTimeAsync(500);
  expect(getPerchState()).not.toBeNull();expect(m.sources).not.toHaveBeenCalled();expect(m.chat).not.toHaveBeenCalled();
  expect(m.bubble).toHaveBeenCalledWith('behavior:say',expect.objectContaining({text:expect.stringContaining('停稳')}));
});
it.runIf(process.platform==='win32')('missing action or top-edge space fails without capture',async()=>{
  m.actions=[];expect((await tryPerch()).reason).toContain('还没有');expect(m.sources).not.toHaveBeenCalled();
  m.actions=['perch_lie'];m.query.mockResolvedValue({...target,bounds:{...target.bounds,y:0}});
  expect((await tryPerch()).reason).toContain('空间不足');expect(m.sources).not.toHaveBeenCalled();
});
it.runIf(process.platform==='win32')('closed/minimized or reused native window detaches',async()=>{
  await tryPerch();await vi.advanceTimersByTimeAsync(0);
  m.query.mockResolvedValue({...target,pid:111});await vi.advanceTimersByTimeAsync(201);
  expect(getPerchState()).toBeNull();expect(getPerchObservation()).toBeNull();
});
it.runIf(process.platform==='win32')('late model output after drag exit or character change is discarded',async()=>{
  let resolve!:(s:string)=>void;m.chat.mockImplementation(()=>new Promise<string>(r=>resolve=r));
  await tryPerch();await vi.advanceTimersByTimeAsync(0);detachPerch();resolve('迟到的画面');await vi.advanceTimersByTimeAsync(0);
  expect(getPerchObservation()).toBeNull();
  expect(m.bubble).toHaveBeenCalledTimes(1); // Only the immediate acknowledgement, never the stale result.
  await tryPerch();await vi.advanceTimersByTimeAsync(0);m.settings.activeCharacter='dog';resolve('另一个角色的画面');await vi.advanceTimersByTimeAsync(0);
  expect(getPerchObservation()).toBeNull();
});
it.runIf(process.platform==='win32')('switching out of free mode while capture is pending prevents submission',async()=>{
  let resolve!:(v:unknown)=>void;m.sources.mockImplementation(()=>new Promise(r=>resolve=r));
  await tryPerch();await vi.advanceTimersByTimeAsync(0);m.settings.behaviorMode='companion';
  resolve({...target,frame:'fixture'});await vi.advanceTimersByTimeAsync(0);
  expect(m.chat).not.toHaveBeenCalled();
});

it.runIf(process.platform==='win32')('prefers the merged default pose and aligns its lower edge',async()=>{
  m.actions=['perch_sit','perch_lie','perch'];
  expect((await tryPerch()).ok).toBe(true);
  expect(getPerchState()?.action).toBe('perch');
  expect(perchAnchor('perch')).toBe(0.86);
});
