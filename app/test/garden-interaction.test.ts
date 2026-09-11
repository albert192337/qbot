import { describe, it, expect, vi, afterEach } from 'vitest';
import { plotPetPosition } from '../src/main/garden/interaction';
const mocks = vi.hoisted(() => ({handlers: new Map<string,Function>(), events:new Map<string,Function>(), windows:[] as any[], ok:true}));
vi.mock('electron', () => ({
  app:{on:vi.fn()}, ipcMain:{handle:(k:string,v:Function)=>mocks.handlers.set(k,v),on:(k:string,v:Function)=>mocks.events.set(k,v)},
  screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1600,height:1000}})},
  BrowserWindow: class {
    bounds:any; listeners=new Map(); visible=false;
    webContents={send:vi.fn(),on:vi.fn()};
    constructor(options:any){this.bounds={x:0,y:0,...options};mocks.windows.push(this)}
    getBounds(){return this.bounds} setPosition(x:number,y:number){this.bounds={...this.bounds,x,y};this.listeners.get('move')?.()}
    setBounds(bounds:any){this.bounds={...this.bounds,...bounds};this.listeners.get('move')?.()}
    on(k:string,v:Function){this.listeners.set(k,v)} isDestroyed(){return false} isVisible(){return this.visible}
    showInactive(){this.visible=true} hide(){this.visible=false}
    setAlwaysOnTop(){} setVisibleOnAllWorkspaces(){} setIgnoreMouseEvents(){} loadFile(){} loadURL(){}
  }
}));
vi.mock('../src/main/garden/service',()=>({getGarden:vi.fn(),gardenAction:async()=>({ok:mocks.ok})}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:'frog'})}));
vi.mock('../src/main/characters',()=>({getCharacter:async()=>({manifest:{actions:{idle:{status:'done'}},customActions:{garden_sow:{status:'done',durationSec:5},garden_harvest:{status:'done',durationSec:5}}}})}));
afterEach(()=>{vi.useRealTimers();vi.resetModules();mocks.windows=[];mocks.handlers.clear();mocks.events.clear();mocks.ok=true});
describe('garden pet interaction',()=>{
 it('positions all six plots on the available side and clamps negative-origin monitors',()=>{
  const pet={x:600,y:500,width:360,height:360}, strip={x:230,y:280,width:1100}, area={x:0,y:0,width:1600,height:1000};
  const points=Array.from({length:6},(_,i)=>plotPetPosition(i,pet,strip,area));
  expect(new Set(points.map(p=>p.x)).size).toBe(6);expect(points.every(p=>p.x>pet.x)).toBe(true);
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
    left:home.x-soil.x, right:home.x+home.width-soil.x,
    top:Math.min(home.y,pet.getBounds().y)-soil.y,
  })); // 土地锚点不动，仅更新弹层必须避开的角色顶部。
  expect(pet.webContents.send).toHaveBeenCalledWith('garden:performance','garden_sow');
  await vi.advanceTimersByTimeAsync(5600);expect(pet.getBounds().x).toBe(home.x);
  mocks.ok=false;await mocks.handlers.get('garden:act')!({}, {type:'harvest',plot:4});await vi.advanceTimersByTimeAsync(0);expect(pet.getBounds().x).toBe(home.x);
  mocks.ok=true;await mocks.handlers.get('garden:act')!({}, {type:'harvest',plot:4});await vi.advanceTimersByTimeAsync(0);
  pet.setPosition(800,500);mocks.events.get('pet:move')!();await vi.advanceTimersByTimeAsync(6000);expect(pet.getBounds().x).toBe(800);
 });
});
