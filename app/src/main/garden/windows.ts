import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { getGarden, gardenAction } from './service';
import { getSettings } from '../config';
import { getCharacter } from '../characters';
import { plotPetPosition } from './interaction';
let strip: BrowserWindow | null = null, panel: BrowserWindow | null = null, pet: BrowserWindow | null = null;
let expanded = false;
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
    if (home) return;
    if (!strip || strip.isDestroyed() || !pet || pet.isDestroyed())
        return;
    const p = pet.getBounds(), wa = screen.getDisplayMatching(p).workArea, b = strip.getBounds();
    const x = Math.max(wa.x, Math.min(p.x + p.width / 2 - b.width / 2, wa.x + wa.width - b.width));
    const y = Math.max(wa.y, Math.min(p.y + p.height - b.height, wa.y + wa.height - b.height));
    strip.setPosition(Math.round(x), Math.round(y));
    strip.webContents.send('garden:anchor', { left: p.x - x, right: p.x + p.width - x, bottom: Math.min(b.height - 10, p.y + p.height - y - 25) });
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
        strip = new BrowserWindow({ width: Math.min(1100, wa.width), height: Math.min(580, wa.height), frame: false, transparent: true, hasShadow: false, resizable: false, skipTaskbar: true, show: false,
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
    // Ensure space on both sides without resizing the pet's transparent player.
    const b = pet.getBounds(), margin = Math.max(0, (Math.min(1100, wa.width) - b.width) / 2);
    pet.setPosition(Math.round(Math.max(wa.x + margin, Math.min(b.x, wa.x + wa.width - b.width - margin))), b.y);
    anchor();
}
export function openGardenPanel(page: string): void {
    const allowed = /^(bag|shop|book|plot:[0-5])$/.test(page) ? page : 'bag';
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
    ipcMain.on('garden:ignore', (ev, ignore) => { if (strip && ev.sender === strip.webContents)
        strip.setIgnoreMouseEvents(ignore !== false, { forward: true }); });
    app.on('before-quit', () => { strip?.destroy(); panel?.destroy(); });
}
