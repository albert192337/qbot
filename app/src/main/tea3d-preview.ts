import { BrowserWindow, screen } from 'electron';
import path from 'node:path';

let preview: BrowserWindow | null = null;
/** Furniture specimen. Layout stays in its own renderer storage; characters are read only. */
export function openTea3dPreview(): BrowserWindow {
  if (preview && !preview.isDestroyed()) { if(preview.isMinimized())preview.restore();preview.show();preview.focus();return preview; }
  const area=screen.getPrimaryDisplay().workArea;
  const win=new BrowserWindow({width:Math.min(1380,area.width),height:Math.min(930,area.height),minWidth:640,minHeight:520,title:'听雨茶室 · 3D 试住',backgroundColor:'#1c2625',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:true,nodeIntegration:false},
  });
  preview=win;win.on('closed',()=>{preview=null;});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  if(process.env.ELECTRON_RENDERER_URL)void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/tea3d/index.html`);
  else void win.loadFile(path.join(__dirname,'../renderer/tea3d/index.html'));
  return win;
}
