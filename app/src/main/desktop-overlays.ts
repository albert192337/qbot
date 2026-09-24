import {BrowserWindow,ipcMain} from 'electron';
import {HeadOverlayRegistry,type HeadOverlay} from '../shared/desktop-overlays';

export function registerDesktopOverlays(allowed:(sender:number,kind:HeadOverlay)=>boolean):void {
  const registry=new HeadOverlayRegistry(),watched=new Set<number>();
  const publish=()=>{for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('overlays:changed',registry.snapshot());};
  ipcMain.handle('overlays:get',()=>registry.snapshot());
  ipcMain.on('overlays:report',(event,kind:HeadOverlay,active:boolean)=>{
    if(!['wish','interaction','speech'].includes(kind)||typeof active!=='boolean'||!allowed(event.sender.id,kind))return;
    const sender=event.sender,id=sender.id;
    if(!watched.has(id)){
      watched.add(id);const release=()=>{if(registry.release(id))publish();};
      sender.on('render-process-gone',release);
      sender.on('did-start-navigation',(_e,_url,inPlace,mainFrame)=>{if(mainFrame&&!inPlace)release();});
      sender.once('destroyed',()=>{watched.delete(id);release();});
      const win=BrowserWindow.fromWebContents(sender);win?.on('hide',release);
    }
    if(registry.report(id,kind,active))publish();
  });
}
