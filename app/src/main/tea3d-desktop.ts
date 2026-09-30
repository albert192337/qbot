import { BrowserWindow, screen } from 'electron';

/** Only the tea-room page may create its transparent desktop companion. */
export function installTeaDesktop(editor: BrowserWindow, preload: string): void {
  let desktop: BrowserWindow | null = null;
  editor.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url), source = new URL(editor.webContents.getURL());
    if (target.protocol !== source.protocol || target.host !== source.host || target.pathname !== source.pathname || target.search !== '?desktop=1' || target.hash.length > 20000) return { action: 'deny' };
    if (desktop && !desktop.isDestroyed()) desktop.close();
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const width = Math.min(960, area.width), height = Math.min(600, area.height);
    return { action: 'allow', overrideBrowserWindowOptions: {
      show: true, width, height, x: area.x + area.width - width, y: area.y + area.height - height,
      minWidth: 560, minHeight: 360, frame: false, transparent: true,
      backgroundColor: '#00000000', hasShadow: false, alwaysOnTop: true,
      autoHideMenuBar: true, title: '听雨茶室 · 桌面',
      webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false, offscreen: false },
    } };
  });
  editor.webContents.on('did-create-window', win => {
    desktop = win;
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.once('did-finish-load', () => { win.webContents.on('will-navigate', event => event.preventDefault()); });
    // Transparent pixels must leave desktop icons and other apps clickable.
    let busy = false, ignored = false;
    const timer = setInterval(async () => {
      if (busy || win.isDestroyed() || !win.isVisible()) return;
      busy = true;
      try {
        const cursor = screen.getCursorScreenPoint(), bounds = win.getBounds();
        const x = cursor.x - bounds.x, y = cursor.y - bounds.y;
        const hit = x >= 0 && y >= 0 && x < bounds.width && y < bounds.height &&
          await win.webContents.executeJavaScript(`window.tea3d?.desktopHit(${x},${y}) ?? true`);
        if (win.isDestroyed()) return;
        if (ignored === !!hit) { ignored = !hit; win.setIgnoreMouseEvents(ignored, { forward: true }); }
      } catch { /* Page may still be loading or closing. */ }
      finally { busy = false; }
    }, 100);
    win.on('closed', () => { clearInterval(timer); if (desktop === win) desktop = null; });
  });
}

/** Hit testing for the managed room window; follows its 2D/3D lifecycle. */
export function installRoom3dHitTest(win: BrowserWindow, enabled: () => boolean): void {
 let busy=false;
 const timer=setInterval(async()=>{if(busy||win.isDestroyed()||!win.isVisible()||!enabled())return;busy=true;
 try{const cursor=screen.getCursorScreenPoint(),b=win.getContentBounds(),x=cursor.x-b.x,y=cursor.y-b.y;
 const hit=await win.webContents.executeJavaScript('window.tea3d?.desktopHit('+x+','+y+') ?? true');
 if(!win.isDestroyed()&&enabled())win.setIgnoreMouseEvents(!hit,{forward:true});
 }catch{}finally{busy=false;}},100);
 win.on('closed',()=>clearInterval(timer));
}
