import { moveFixedSize, fixedWindowSize } from './fixed-window';
import { showGardenWorkspace,closeGardenWorkspace } from './garden/windows';
import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { getPetWindow } from './windows';
import { allowDesktopWindow, trackDesktopWindow } from './desktop-visibility';
import { panelBounds, compactPanelSize, isDesktopPanelPage, type DesktopPanelPage } from '../shared/panel-layout';

let panel: BrowserWindow | null = null;
let current: DesktopPanelPage = 'menu';
function place(): void {
  if (!panel || panel.isDestroyed()) return;
  const pet = getPetWindow()?.getBounds();
  const area = pet ? screen.getDisplayMatching(pet).workArea : screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const bounds=panelBounds(pet ?? {x:area.x+area.width/2,y:area.y,width:0,height:0}, area,
    current === 'room' ? {width:1000,height:640} : compactPanelSize(pet?.width ?? 200));
  if(current==='garden'&&area.width>=920)bounds.x=Math.max(bounds.x,area.x+500);
  const old=fixedWindowSize(panel);
  moveFixedSize(panel,bounds.x,bounds.y,{width:bounds.width,height:bounds.height},old?.width!==bounds.width||old?.height!==bounds.height);
  if(current==='garden'&&panel.isVisible())showGardenWorkspace(panel.getBounds());
}
export function routeGardenWorkspace(page:string):boolean {
 if(current!=='garden'||!panel?.isVisible()||!(/^(bag|book|friends|plot:[0-6])$/.test(page)))return false;
 panel.webContents.send('garden:page',page);return true;
}
export function sendToDesktopPanel(channel:string, payload:unknown): void {
  if (panel && !panel.isDestroyed()) panel.webContents.send(channel,payload);
}
export function openDesktopPanel(page:DesktopPanelPage): void {
  if (panel?.isVisible() && current === page) { panel.hide(); return; }
  if (panel && !panel.isDestroyed()) {
    panel.webContents.send('panel:page',page); allowDesktopWindow(panel); panel.show(); panel.focus(); return;
  }
  current=page;
  const win = panel = new BrowserWindow({width:420,height:560,frame:false,transparent:true,hasShadow:false,
    resizable:false,skipTaskbar:true,show:false,
    webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false}});
  win.setAlwaysOnTop(true,'floating'); trackDesktopWindow(win,'aux'); allowDesktopWindow(win);
  const pet=getPetWindow();
  const close=()=>win.close();
  pet?.on('move',place);pet?.on('resize',place);pet?.once('closed',close);
  win.on('show',place);
  win.on('hide',()=>{if(current==='garden')closeGardenWorkspace();});
  win.on('closed',()=>{closeGardenWorkspace();pet?.removeListener('move',place);pet?.removeListener('resize',place);pet?.removeListener('closed',close);if(panel===win)panel=null;});
  win.once('ready-to-show',()=>{place();win.show();});
  const query={page};
  if(process.env.ELECTRON_RENDERER_URL)void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/panel/index.html?page=${page}`);
  else void win.loadFile(path.join(__dirname,'../renderer/panel/index.html'),{query});
}
export function registerDesktopPanel():void {
  ipcMain.on('panel:ignore',(e,ignore)=>{if(e.sender===panel?.webContents)panel?.setIgnoreMouseEvents(current==='room'&&ignore===true,{forward:true});});
  ipcMain.on('panel:open',(_e,page)=>{if(isDesktopPanelPage(page))openDesktopPanel(page);});
  ipcMain.on('panel:close',e=>{if(e.sender===panel?.webContents)panel?.hide();});
  ipcMain.on('panel:navigate',(e,page)=>{if(e.sender!==panel?.webContents||!isDesktopPanelPage(page))return;if(current==='garden'&&page!=='garden')closeGardenWorkspace();current=page;panel?.setIgnoreMouseEvents(false);place();});
}
