import {BrowserWindow,ipcMain,screen} from 'electron';
import path from 'node:path';
import {appearance} from '../shared/appearances';
import {desktopActorVisible,desktopQuiet,onDesktopVisibilityChanged,trackDesktopWindow} from './desktop-visibility';
import {attachPetWindowLayer} from './pet-window-layer';
export function registerAppearances(){
  let preview:BrowserWindow|undefined;
  ipcMain.handle('appearance:preview',async(_event,id:string)=>{
    if(!appearance(id))throw Error('外观不存在');
    if(!preview||preview.isDestroyed())preview=new BrowserWindow({width:1180,height:860,show:false,title:'角色外观 · 试穿',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false}});
    if(process.env.ELECTRON_RENDERER_URL)await preview.loadURL(`${process.env.ELECTRON_RENDERER_URL}/appearance-preview/index.html?appearance=${id}`);
    else await preview.loadFile(path.join(__dirname,'../renderer/appearance-preview/index.html'),{query:{appearance:id}});
    preview.show();preview.focus();
  });
  const overlays=new Map<string,{win:BrowserWindow;owner:BrowserWindow;ready:boolean;pending:{x:number;y:number;size:number}[];timer:ReturnType<typeof setTimeout>}>(),last=new Map<number,number>();
  const close=(key:string)=>{const s=overlays.get(key);if(!s)return;clearTimeout(s.timer);overlays.delete(key);if(!s.win.isDestroyed())s.win.destroy();};
  onDesktopVisibilityChanged(()=>{for(const [key,s]of overlays)if(!desktopActorVisible(s.owner))close(key);});
  ipcMain.on('appearance:foot',(event,p)=>{
    const owner=BrowserWindow.fromWebContents(event.sender),now=Date.now();
    if(!owner||!desktopActorVisible(owner)||desktopQuiet()||!p||![p.x,p.y,p.size].every(Number.isFinite)||p.size<20||p.size>1000||now-(last.get(owner.id)??0)<200)return;
    last.set(owner.id,now);const b=owner.getBounds();if(p.x<0||p.y<0||p.x>b.width||p.y>b.height)return;
    const x=b.x+p.x,y=b.y+p.y,display=screen.getDisplayNearestPoint({x:Math.round(x),y:Math.round(y)}),key=`${owner.id}:${display.id}`;
    const point={x:x-display.bounds.x,y:y-display.bounds.y,size:Math.min(p.size,400)};
    let state=overlays.get(key);
    if(!state){
      const win=new BrowserWindow({...display.bounds,show:false,transparent:true,frame:false,hasShadow:false,focusable:false,resizable:false,skipTaskbar:true,webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false}});
      win.setIgnoreMouseEvents(true,{forward:true});win.setAlwaysOnTop(true,'floating');trackDesktopWindow(win);attachPetWindowLayer(win,()=>[owner,win],owner);
      state={win,owner,ready:false,pending:[],timer:setTimeout(()=>close(key),4200)};overlays.set(key,state);
      const clear=()=>close(key);owner.on('hide',clear);owner.on('closed',clear);
      win.once('closed',()=>{owner.removeListener('hide',clear);owner.removeListener('closed',clear);});
      win.webContents.once('did-finish-load',()=>{const s=overlays.get(key);if(!s||!desktopActorVisible(owner))return close(key);s.ready=true;s.win.showInactive();for(const q of s.pending)s.win.webContents.send('appearance:foot',q);s.pending=[];});
      if(process.env.ELECTRON_RENDERER_URL)void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/appearance-overlay/index.html`);else void win.loadFile(path.join(__dirname,'../renderer/appearance-overlay/index.html'));
    }
    clearTimeout(state.timer);state.timer=setTimeout(()=>close(key),4200);
    if(state.ready)state.win.webContents.send('appearance:foot',point);else state.pending=[...state.pending,point].slice(-4);
  });
}
