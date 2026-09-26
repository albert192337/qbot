import { describe, it, expect, vi, afterEach } from 'vitest';
import { plotPetPosition } from '../src/main/garden/interaction';
const mocks = vi.hoisted(() => ({handlers: new Map<string,Function>(), events:new Map<string,Function>(), windows:[] as any[], ok:true,state:null as any,visit:null as any,coop:[] as any[]}));
vi.mock('electron', () => ({
  powerMonitor:{on:vi.fn()},app:{on:vi.fn()}, ipcMain:{handle:(k:string,v:Function)=>mocks.handlers.set(k,v),on:(k:string,v:Function)=>mocks.events.set(k,v)},
  screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1600,height:1000}})},
  BrowserWindow: class {
    bounds:any; listeners=new Map(); visible=false;
    webContents={send:vi.fn(),setAudioMuted:vi.fn(),on:vi.fn(),isLoading:()=>false};
    constructor(options:any){this.bounds={x:0,y:0,...options};mocks.windows.push(this)}
    getBounds(){return this.bounds} setPosition(x:number,y:number){this.bounds={...this.bounds,x,y};this.listeners.get('move')?.()}
    setBounds(bounds:any){this.bounds={...this.bounds,...bounds};this.listeners.get('move')?.()}
    once(k:string,v:Function){this.listeners.set(k,v)} on(k:string,v:Function){this.listeners.set(k,v)} isDestroyed(){return false} isVisible(){return this.visible}
    show(){this.visible=true} restore(){this.visible=true} showInactive(){this.visible=true} hide(){this.visible=false}
    setAlwaysOnTop(){} setVisibleOnAllWorkspaces(){} setIgnoreMouseEvents(){} loadFile(){} loadURL(){}
  }
}));
vi.mock('../src/main/garden/weather-clock',()=>({startGardenWeatherClock:vi.fn()}));
vi.mock('../src/main/garden/service',()=>({getGarden:async()=>mocks.state,gardenAction:async(cmd:any)=>{if(!mocks.state)return {ok:mocks.ok};try{const {transition}=await import('../src/main/garden/rules');const result=transition(mocks.state,cmd,Date.now(),{random:()=>.99,id:()=>String(Math.random())});mocks.state=result.state;return {ok:true,...result};}catch(e){return {ok:false,error:String(e)};}}}));
vi.mock('../src/main/garden/network',()=>({cooperateGarden:async(owner:string,plot:number,action:string)=>{mocks.coop.push({owner,plot,action});return mocks.visit;}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:'frog'})}));
vi.mock('../src/main/characters',()=>({getCharacter:async()=>({manifest:{actions:{idle:{status:'done'}},customActions:{writing:{status:'done',durationSec:5},garden_sow:{status:'done',durationSec:5},garden_harvest:{status:'done',durationSec:5}}}})}));
afterEach(()=>{vi.useRealTimers();vi.resetModules();mocks.windows=[];mocks.handlers.clear();mocks.events.clear();mocks.ok=true;mocks.state=null;mocks.visit=null;mocks.coop=[]});
describe('garden pet interaction',()=>{
 it('positions all seven plots on the available side and clamps negative-origin monitors',()=>{
  const pet={x:600,y:500,width:360,height:360}, strip={x:230,y:280,width:1100}, area={x:0,y:0,width:1600,height:1000};
  const points=Array.from({length:7},(_,i)=>plotPetPosition(i,pet,strip,area));
  expect(new Set(points.map(p=>p.x)).size).toBe(7);expect(points.every(p=>p.x>pet.x)).toBe(true);
  expect(plotPetPosition(0,{...pet,x:-1800},{...strip,x:-1920},{...area,x:-1920}).x).toBeGreaterThanOrEqual(-1920);
 });
 it('freezes soil anchor, restores home, ignores failed actions and cancels on drag',async()=>{
  vi.useFakeTimers();
  const {BrowserWindow}=await import('electron');
  const {attachGarden,registerGardenIpc}=await import('../src/main/garden/windows');
  const pet:any=new BrowserWindow({x:600,y:500,width:360,height:360} as any);pet.visible=true;
  attachGarden(pet);registerGardenIpc();mocks.events.get('garden:toggle')!();
  const strip=mocks.windows[1];strip.visible=true;
  const home={...pet.getBounds()}, soil={...strip.getBounds()};strip.webContents.send.mockClear();
  await mocks.handlers.get('garden:act')!({}, {type:'plant',plot:0});await vi.advanceTimersByTimeAsync(0);
  expect(pet.getBounds().x).not.toBe(home.x);expect(strip.getBounds()).toEqual(soil);
  expect(strip.webContents.send).toHaveBeenCalledWith('garden:anchor',expect.objectContaining({
    farm:{left:(1600-455)/2,baseline:934},
    top:pet.getBounds().y-soil.y,
  })); // 土地锚点不动，仅更新弹层必须避开的角色顶部。
  expect(pet.webContents.send).toHaveBeenCalledWith('garden:performance','garden_sow');
  await vi.advanceTimersByTimeAsync(5600);expect(pet.getBounds().x).toBe(home.x);
  mocks.ok=false;await mocks.handlers.get('garden:act')!({}, {type:'harvest',plot:4});await vi.advanceTimersByTimeAsync(0);expect(pet.getBounds().x).toBe(home.x);
  mocks.ok=true;await mocks.handlers.get('garden:act')!({}, {type:'harvest',plot:4});await vi.advanceTimersByTimeAsync(0);
  pet.setPosition(800,500);mocks.events.get('pet:move')!();await vi.advanceTimersByTimeAsync(6000);expect(pet.getBounds().x).toBe(800);
 });
});

it('keeps the farm independent of pet docking and remembers a dragged position after collapse',async()=>{
 const {BrowserWindow}=await import('electron');const {attachGarden,registerGardenIpc}=await import('../src/main/garden/windows');
 const pet:any=new BrowserWindow({x:600,y:500,width:360,height:360});pet.visible=true;
 attachGarden(pet);registerGardenIpc();mocks.events.get('garden:toggle')!();
 const strip=mocks.windows[1],bounds={...strip.getBounds()},sender={sender:strip.webContents};strip.visible=true;
 pet.setPosition(20,40);
 expect(strip.getBounds()).toEqual(bounds);
 expect(strip.webContents.send).toHaveBeenLastCalledWith('garden:anchor',expect.objectContaining({farm:{left:572.5,baseline:934}}));
 const drag=mocks.events.get('garden:drag')!;
 drag(sender,'start',700,950);drag(sender,'move',500,750);drag(sender,'end',0,0);
 expect(strip.webContents.send).toHaveBeenLastCalledWith('garden:anchor',expect.objectContaining({farm:{left:372.5,baseline:734}}));
 mocks.events.get('garden:collapse')!(sender);expect(strip.visible).toBe(false);expect(pet.visible).toBe(true);
 mocks.events.get('garden:toggle')!();expect(strip.visible).toBe(true);
 pet.setPosition(900,100);
 expect(strip.webContents.send).toHaveBeenLastCalledWith('garden:anchor',expect.objectContaining({farm:{left:372.5,baseline:734}}));
 drag({sender:pet.webContents},'start',0,0);drag({sender:pet.webContents},'move',999,999);
 expect(strip.webContents.send).toHaveBeenLastCalledWith('garden:anchor',expect.objectContaining({farm:{left:372.5,baseline:734}}));
 const target=plotPetPosition(0,pet.getBounds(),bounds,{x:0,y:0,width:1600,height:1000},{left:372.5,baseline:734});
 expect(target.y).toBe(399);expect(target.x).toBeLessThan(400);
});

it('cultivation keeps the pet at the crop for three minutes and drag pauses the remaining time',async()=>{
 vi.useFakeTimers();vi.setSystemTime(100000);
 const {initialGarden,transition}=await import('../src/main/garden/rules');let id=0;const rng={random:()=>.99,id:()=>String(id++)};
 const state=initialGarden(Date.now(),rng);state.seeds[0].genes=['rainbow'];
 mocks.state=transition(state,{type:'plant',plot:0,seed:state.seeds[0].id},Date.now(),rng).state;mocks.state.plots[0].readyAt=Date.now();
 const {BrowserWindow}=await import('electron');const {attachGarden,registerGardenIpc}=await import('../src/main/garden/windows');
 const pet:any=new BrowserWindow({x:600,y:500,width:360,height:360});pet.visible=true;attachGarden(pet);registerGardenIpc();mocks.events.get('garden:toggle')!();mocks.windows[1].visible=true;
 const act=mocks.handlers.get('garden:act')!;
 expect((await act({},{type:'cultivate',plot:0})).ok).toBe(true);
 expect(pet.webContents.send).toHaveBeenCalledWith('garden:performance','writing');
 await vi.advanceTimersByTimeAsync(10000);expect(mocks.state.plots[0].revealed).not.toBe(true);expect(pet.getBounds().x).not.toBe(600);
 mocks.events.get('pet:move')!();await vi.advanceTimersByTimeAsync(0);expect(mocks.state.plots[0].cultivation).toEqual({remainingMs:170000});
 await vi.advanceTimersByTimeAsync(60000);expect(mocks.state.plots[0].revealed).not.toBe(true);
 expect((await act({},{type:'cultivate',plot:0})).ok).toBe(true);
 await vi.advanceTimersByTimeAsync(169999);expect(mocks.state.plots[0].revealed).not.toBe(true);
 await vi.advanceTimersByTimeAsync(200);expect(mocks.state.plots[0].revealed).toBe(true);expect(mocks.state.produce).toHaveLength(0);
expect(pet.webContents.send).toHaveBeenCalledWith('garden:performance',null);
});

it('brings the pet and a read-only friend crop to the desktop, heartbeats once, and leaves on drag',async()=>{
 vi.useFakeTimers();vi.setSystemTime(100000);
 const {initialGarden}=await import('../src/main/garden/rules');
 mocks.state=initialGarden(Date.now(),{random:()=>.5,id:()=> 'own'});
 const p={id:'friend-secret',species:'strawberry',traits:[],publicQuality:'rainbow',kg:0,value:0,bred:false,growthVersion:3,plantedAt:0,readyAt:0,fertilizers:[]};
 mocks.visit={owner:'friend',plots:[null,null,p,null,null,null],tasks:[{plant:'old-friend',plot:2,done:true},{plant:'friend-secret',plot:2,done:false}]};
 const {BrowserWindow}=await import('electron');const {attachGarden,registerGardenIpc}=await import('../src/main/garden/windows');
 const pet:any=new BrowserWindow({x:600,y:500,width:360,height:360});pet.visible=true;attachGarden(pet);registerGardenIpc();
 mocks.events.get('garden:toggle')!();mocks.windows[1].visible=true;
 const join=mocks.handlers.get('garden:cooperate')!;
 await join({},'friend',2,'join');
 const strip=mocks.windows[1];
 expect(pet.getBounds().x).not.toBe(600);expect(pet.webContents.send).toHaveBeenCalledWith('garden:performance','writing');
 const view=await mocks.handlers.get('garden:get')!({sender:strip.webContents});
 expect(view.cultivationVisit).toEqual({owner:'friend',plot:2});expect(view.plots[2].id).toBe('friend-secret');
 expect((await mocks.handlers.get('garden:act')!({sender:strip.webContents},{type:'harvest',plot:2})).ok).toBe(false);
 await join({},'friend',2,'join');expect(mocks.coop.some(c=>c.action==='leave')).toBe(false);
 await vi.advanceTimersByTimeAsync(5000);expect(mocks.coop.filter(c=>c.action==='join')).toHaveLength(3);
 mocks.events.get('pet:move')!();await vi.advanceTimersByTimeAsync(0);
 expect(mocks.coop.at(-1)).toEqual({owner:'friend',plot:2,action:'leave'});
 const count=mocks.coop.length;await vi.advanceTimersByTimeAsync(20000);expect(mocks.coop).toHaveLength(count);
 expect((await mocks.handlers.get('garden:get')!({sender:strip.webContents})).cultivationVisit).toBeUndefined();
});
