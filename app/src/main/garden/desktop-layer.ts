import { BrowserWindow, screen, type Rectangle } from 'electron';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startGardenDesktop, type GardenDesktopHost } from './desktop-host';

async function cleanup(directory:string):Promise<void>{const resolved=path.resolve(directory);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('qbot-garden-desktop-'))throw Error('Invalid garden temp path');await rm(resolved,{recursive:true,force:true});}
let renderer:BrowserWindow|null=null, host:GardenDesktopHost|null=null, generation=0;
export function hybridDesktopStatus(){return host?{handle:host.handle,frames:host.frames}:null;}
export function probeHybridDesktop(x:number,y:number):Promise<string>{if(!host)return Promise.reject(Error('Desktop closed'));return host.probe(x,y);}
export function isHybridGarden(id:number):boolean {return !!renderer&&!renderer.isDestroyed()&&renderer.webContents.id===id;}
export function hybridGardenBounds():Rectangle|undefined {return renderer&&!renderer.isDestroyed()?renderer.getBounds():undefined;}
export function closeHybridGarden():void {generation++;host?.dispose();host=null;const old=renderer;renderer=null;if(old&&!old.isDestroyed())old.destroy();}
export function sendHybridGarden(channel:string,data?:unknown):void {if(renderer&&!renderer.isDestroyed())renderer.webContents.send(channel,data);}
export async function openHybridGarden(area:Rectangle,onError:(message:string)=>void):Promise<void> {
  if(renderer&&!renderer.isDestroyed())return;
  const current=++generation,height=Math.min(440,Math.round(area.height*.49));
  const bounds={x:area.x,y:area.y+area.height-height,width:area.width,height};
  const physical=screen.dipToScreenRect(null,bounds);
  const win=new BrowserWindow({...bounds,show:false,transparent:true,frame:false,focusable:false,skipTaskbar:true,hasShadow:false,backgroundColor:'#00000000',title:'QBot Garden Desktop Renderer',webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false,offscreen:true,backgroundThrottling:false}});
  renderer=win;win.webContents.setFrameRate(12);
  let directory:string|undefined,local:GardenDesktopHost|undefined;
  const fail=(e:unknown)=>{if(current!==generation)return;console.error('[garden-desktop]',e);closeHybridGarden();onError('桌面草地暂时无法显示，可切回原版。');};
  win.on('closed',()=>{local?.dispose();if(directory)void cleanup(directory).catch(()=>{});if(renderer===win){renderer=null;host=null;generation++;}});
  win.webContents.on('render-process-gone',(_e,details)=>fail(details.reason));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  try {
    directory=await mkdtemp(path.join(os.tmpdir(),'qbot-garden-desktop-'));
    if(current!==generation){await rm(directory,{recursive:true,force:true});return;}
    local=await startGardenDesktop(physical,directory,p=>{if(current===generation&&!win.isDestroyed())win.webContents.send('garden:desktopPointer',{x:p.x*bounds.width/physical.width,y:p.y*bounds.height/physical.height,double:p.double});},fail);
    if(current!==generation){local.dispose();return;}host=local;
    win.webContents.on('paint',(_e,_dirty,image)=>{if(current===generation)local?.send(image);});
    if(process.env.ELECTRON_RENDERER_URL)await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/garden-hybrid/index.html`);
    else await win.loadFile(path.join(__dirname,'../renderer/garden-hybrid/index.html'));
    if(current===generation)win.webContents.invalidate();
  } catch(e){fail(e);}
}

