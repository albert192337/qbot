import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { getGarden, gardenAction } from './service';
import { getSettings } from '../config';
import { getCharacter } from '../characters';
import { plotPetPosition } from './interaction';
import { gardenSide } from '../../shared/garden-layout';
import { moveFixedSize } from '../fixed-window';
let strip: BrowserWindow | null = null, panel: BrowserWindow | null = null, pet: BrowserWindow | null = null;
let expanded = false;
let travelPanel: BrowserWindow | null = null;
let stripSize = {width:1100,height:800};
let speechBounds: { left: number; right: number; top: number; bottom: number } | null = null;
export function setGardenSpeechBounds(bounds: typeof speechBounds): void {
    speechBounds = bounds; syncSpeechBounds();
}
function syncSpeechBounds(): void {
    if (!strip || strip.isDestroyed()) return;
    const b = strip.getBounds(), s = speechBounds;
    strip.webContents.send('garden:speechBounds', s ? { left:s.left-b.x, right:s.right-b.x, top:s.top-b.y, bottom:s.bottom-b.y } : null);
}
let home: {x:number;y:number} | null = null;
let performanceTimer: ReturnType<typeof setTimeout> | undefined;
let performanceVersion = 0;
function stopPerformance(restore = true): void {
    performanceVersion++;
    clearTimeout(performanceTimer);
    const origin = home; home = null;
    if (!origin) return;
    if (pet && !pet.isDestroyed()) {
        pet.webContents.send('garden:performance', null);
        if (restore && origin) pet.setPosition(origin.x, origin.y);
    }
    anchor();
}
async function perform(plot: number, kind: 'plant' | 'harvest'): Promise<void> {
    stopPerformance();
    const version = performanceVersion;
    const settings = await getSettings();
    const meta = settings.activeCharacter ? await getCharacter(settings.activeCharacter) : null;
    if (version !== performanceVersion || !meta?.manifest || !expanded || !strip?.isVisible() || !pet?.isVisible()) return;
    const actions: Record<string, {status?:string;durationSec?:number}> = {...meta.manifest.actions, ...meta.manifest.importedActions, ...meta.manifest.expressionActions, ...meta.manifest.customActions};
    const action = [kind === 'plant' ? 'garden_sow' : 'garden_harvest', kind === 'plant' ? 'wave' : 'talk_happy', 'idle'].find(id => actions[id] && (!actions[id].status || actions[id].status === 'done'));
    if (!action) return;
    const bounds = pet.getBounds(); home = {x:bounds.x,y:bounds.y};
    const target = plotPetPosition(plot, bounds, strip.getBounds(), screen.getDisplayMatching(bounds).workArea);
    pet.webContents.send('garden:performance', action);
    pet.setPosition(target.x, target.y);
    performanceTimer = setTimeout(() => stopPerformance(), Math.min(12000, (actions[action].durationSec ?? 5) * 1000 + 600));
}
function load(win: BrowserWindow, page: string): void {
    if (process.env.ELECTRON_RENDERER_URL)
        void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/garden/index.html?view=${page}`);
    else
        void win.loadFile(path.join(__dirname, '../renderer/garden/index.html'), { query: { view: page } });
}
function anchor(): void {
    if (!strip || strip.isDestroyed() || !pet || pet.isDestroyed())
        return;
    const p = pet.getBounds(), wa = screen.getDisplayMatching(p).workArea, b = strip.getBounds();
    if (home) {
        syncSpeechBounds();
        strip.webContents.send('garden:anchor', { left: home.x - b.x, right: home.x + p.width - b.x,
            side: gardenSide({x:home.x,width:p.width},wa), top: Math.min(home.y, p.y) - b.y, bottom: Math.min(b.height - 66, home.y + p.height - b.y - 25) });
        return;
    }
    const side = gardenSide(p, wa);
    const x = Math.max(wa.x, Math.min(side === 'left' ? p.x + p.width - b.width : p.x, wa.x + wa.width - b.width));
    const y = Math.max(wa.y, Math.min(p.y + p.height - b.height, wa.y + wa.height - b.height));
    moveFixedSize(strip, x, y, stripSize);
    syncSpeechBounds();
    strip.webContents.send('garden:anchor', { side, left: p.x - x, right: p.x + p.width - x, top: p.y - y, bottom: Math.min(b.height - 66, p.y + p.height - y - 25) });
}
export function attachGarden(p: BrowserWindow): void {
    pet = p;
    p.on('move', anchor);
    p.on('resize', anchor);
    p.on('hide', () => { stopPerformance(); strip?.hide(); });
    p.on('show', () => { if (expanded) {
        anchor();
        strip?.showInactive();
    } });
    p.on('closed', () => { clearTimeout(performanceTimer); performanceVersion++; home = null; strip?.close(); strip = null; pet = null; expanded = false; });
}
function toggle(): void {
    if (!pet || pet.isDestroyed())
        return;
    expanded = !expanded;
    if (!expanded) {
        stopPerformance();
        strip?.hide();
        return;
    }
    const wa = screen.getDisplayMatching(pet.getBounds()).workArea;
    if (!strip || strip.isDestroyed()) {
        stripSize = {width:Math.min(1100,wa.width),height:wa.height};
        strip = new BrowserWindow({ ...stripSize, frame: false, transparent: true, hasShadow: false, resizable: false, skipTaskbar: true, show: false,
            webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false } });
        strip.setAlwaysOnTop(true, 'floating');
        strip.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        strip.setIgnoreMouseEvents(true, { forward: true });
        strip.on('closed', () => { strip = null; expanded = false; stopPerformance(); });
        strip.webContents.on('did-finish-load', () => { anchor(); if (expanded && pet?.isVisible())
            strip?.showInactive(); });
        load(strip, 'strip');
    }
    else {
        anchor();
        strip.showInactive();
    }
    // 展开方向由左右剩余空间决定，不再强制把桌宠挪到屏幕中间。
    anchor();
}
export function openGardenPanel(page: string): void {
    const allowed = /^(travel|moments|bag|shop|book|plots|sow|plot:[0-5])$/.test(page) ? page : 'bag';
    if (allowed === 'travel' || allowed === 'moments') {
        if (!travelPanel || travelPanel.isDestroyed()) {
            const wa = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
            const height = Math.min(850, wa.height - 24), width = Math.min(560, wa.width - 24, Math.round(height * .72));
            const win = new BrowserWindow({title:'旅行手账',width,height,x:Math.round(wa.x+(wa.width-width)/2),y:Math.round(wa.y+(wa.height-height)/2),minWidth:Math.min(360,width),minHeight:Math.min(480,height),
                frame:false,transparent:true,hasShadow:true,backgroundColor:'#00000000',show:false,
                webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false}});
            travelPanel=win;win.setMenuBarVisibility(false);win.setAlwaysOnTop(true,'floating');
            win.on('closed',()=>{if(travelPanel===win)travelPanel=null;});
            win.once('ready-to-show',()=>win.show());load(win,allowed);
        } else {travelPanel.webContents.send('garden:page',allowed);travelPanel.show();travelPanel.focus();}
        return;
    }
    if (!panel || panel.isDestroyed()) {
        const wa = screen.getPrimaryDisplay().workArea;
        panel = new BrowserWindow({ title: '小小花园 · 实验室', width: Math.min(860, wa.width), height: Math.min(720, wa.height), minWidth: 540, minHeight: 440, backgroundColor: '#faf6eb', show: false,
            webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false } });
        panel.setMenuBarVisibility(false);
        panel.setAlwaysOnTop(true, 'floating');
        panel.on('closed', () => { panel = null; });
        panel.once('ready-to-show', () => panel?.show());
        load(panel, allowed);
    }
    else {
        panel.webContents.send('garden:page', allowed);
        panel.show();
        panel.focus();
    }
}
export function registerGardenIpc(): void {
    ipcMain.handle('garden:get', () => getGarden());
    ipcMain.handle('garden:act', async (_ev, command) => {
        const result = await gardenAction(command);
        if (result.ok && (command.type === 'plant' || command.type === 'harvest'))
            void perform(command.plot, command.type).catch(() => stopPerformance());
        return result;
    });
    ipcMain.on('pet:move', () => { if (home) stopPerformance(false); });
    ipcMain.on('garden:cancelPerformance', (_ev, restore) => stopPerformance(restore !== false));
    ipcMain.on('garden:toggle', toggle);
    ipcMain.on('garden:open', (_ev, page) => openGardenPanel(typeof page === 'string' ? page : 'bag'));
    ipcMain.on('garden:closeTravel', ev => {if(travelPanel && ev.sender === travelPanel.webContents) travelPanel.close();});
    ipcMain.on('garden:ignore', (ev, ignore) => { if (strip && ev.sender === strip.webContents)
        strip.setIgnoreMouseEvents(ignore !== false, { forward: true }); });
    app.on('before-quit', () => { strip?.destroy(); panel?.destroy(); travelPanel?.destroy(); });
}
