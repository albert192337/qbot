import { BrowserWindow, Menu, screen } from 'electron';
import path from 'node:path';

let window: BrowserWindow | null = null;
let desktopWindow: BrowserWindow | null = null;
let pineappleWindow: BrowserWindow | null = null;

/** Independent trait study with no preload or access to garden saves. */
export function openPineapplePreview(): BrowserWindow {
  if (pineappleWindow && !pineappleWindow.isDestroyed()) {
    if (pineappleWindow.isMinimized()) pineappleWindow.restore();
    pineappleWindow.show(); pineappleWindow.focus(); return pineappleWindow;
  }
  const area = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({
    width: Math.min(1380, area.width), height: Math.min(980, area.height),
    minWidth: Math.min(620, area.width), minHeight: Math.min(600, area.height),
    title: 'QBot · 菠萝词条工坊', backgroundColor: '#f5f3ec', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  pineappleWindow = win;
  win.on('closed', () => { pineappleWindow = null; });
  const specimenWindows = new Set<BrowserWindow>();
  win.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url), source = new URL(win.webContents.getURL());
    if (target.origin !== source.origin || target.pathname !== source.pathname || target.searchParams.get('desktop') !== '1') return { action: 'deny' };
    const slot=specimenWindows.size, columns=Math.max(1,Math.floor(area.width/300));
    return { action: 'allow', overrideBrowserWindowOptions: {
      show: true, width: 360, height: 460, x: area.x + Math.max(0,area.width-370-(slot%columns)*300), y: area.y + Math.max(0,area.height-470-(Math.floor(slot/columns)%2)*180),
      frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false,
      alwaysOnTop: true, resizable: false, autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    } };
  });
  win.webContents.on('did-create-window', child => {
    specimenWindows.add(child);
    child.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    child.webContents.once('did-finish-load', () => child.webContents.on('will-navigate', event => event.preventDefault()));
    child.webContents.on('before-input-event', (_event, input) => { if (input.key === 'Escape') child.close(); });
    child.on('closed', () => { specimenWindows.delete(child); });
  });
  win.on('closed', () => { for (const child of specimenWindows) if (!child.isDestroyed()) child.close(); });
  win.webContents.on('will-navigate', event => event.preventDefault());
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/pineapple-preview/index.html`);
  else void win.loadFile(path.join(__dirname, '../renderer/pineapple-preview/index.html'));
  return win;
}

/** Isolated desktop specimen; does not change garden data. */
export function openDesktopGenePreview(rendererFile = path.join(__dirname, '../renderer/gene-preview/index.html')): BrowserWindow {
  if (desktopWindow && !desktopWindow.isDestroyed()) { desktopWindow.show(); return desktopWindow; }
  const area = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({ width:280,height:320,x:area.x+area.width-310,y:area.y+area.height-350,
    title:'QBot · 桌面草莓试摆',frame:false,transparent:true,backgroundColor:'#00000000',
    hasShadow:false,resizable:false,alwaysOnTop:true,skipTaskbar:false,
    webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false},
  });
  desktopWindow=win;
  const click=(selector:string)=>{void win.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)})?.click()`);};
  let menuOpen=false,ignored=false;
  const timer=setInterval(()=>{
    if(win.isDestroyed()||menuOpen)return;
    const b=win.getBounds(),p=screen.getCursorScreenPoint(),x=p.x-b.x,y=p.y-b.y;
    const handle=y>=b.height-27&&y<=b.height&&x>=15&&x<=b.width-15;
    const specimen=((x-b.width/2)/(b.width*.40))**2+((y-b.height*.44)/(b.height*.43))**2<=1;
    const next=!(handle||specimen);
    if(next!==ignored){ignored=next;win.setIgnoreMouseEvents(next,{forward:true});}
  },80);
  win.webContents.on('context-menu',()=>{
    menuOpen=true;win.setIgnoreMouseEvents(false);ignored=false;
    const menu=Menu.buildFromTemplate([
      ...['田园初熟 · 原色','霜晶蝶梦 · 水晶','翡翠双生 · 玉石','星河之心 · 虹彩'].map((label,i)=>({label,click:()=>click(`[data-preset="${i}"]`)})),
      {type:'separator'},
      ...([{label:'小号 · 180',width:180,height:210},{label:'中号 · 280',width:280,height:320},{label:'大号 · 380',width:380,height:430}]).map(s=>({label:s.label,click:()=>{win.setResizable(true);win.setSize(s.width,s.height);win.setResizable(false);}})),
      {label:'开关旋转',click:()=>click('#rotate')},{label:'开关动效',click:()=>click('#motion')},
      {type:'separator'},{label:'关闭桌面试摆',click:()=>win.close()},
    ]);
    menu.popup({window:win,callback:()=>{menuOpen=false;}});
  });
  win.webContents.on('before-input-event',(_event,input)=>{if(input.type==='keyDown'&&input.key==='Escape')win.close();});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.on('closed',()=>{clearInterval(timer);desktopWindow=null;});
  if(process.env.ELECTRON_RENDERER_URL)void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/gene-preview/index.html?desktop=1`);
  else void win.loadFile(rendererFile,{query:{desktop:'1'}});
  return win;
}
/** Visual study only. No preload, account access or garden mutations. */
export function openGenePreview(): BrowserWindow {
  if (window && !window.isDestroyed()) { window.show(); window.focus(); return window; }
  const area = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({
    width: Math.min(1240, area.width), height: Math.min(900, area.height),
    minWidth: Math.min(620, area.width), minHeight: Math.min(600, area.height),
    title: 'QBot · 草莓基因工坊', backgroundColor: '#f6f4ed', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window = win;
  win.on('closed', () => { window = null; });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/gene-preview/index.html`);
  else void win.loadFile(path.join(__dirname, '../renderer/gene-preview/index.html'));
  return win;
}
