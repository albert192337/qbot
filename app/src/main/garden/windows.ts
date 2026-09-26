import {publicGardenState} from '../../shared/garden-public';
import { allowDesktopWindow, trackDesktopWindow, desktopQuiet, onDesktopVisibilityChanged } from '../desktop-visibility';
import {scenePool,resourceText} from '../../shared/action-resources';
import type {GardenVisit} from '../../shared/garden-life';
import {cultivationRemaining} from '../../shared/garden';
import { gardenWeatherStatus } from '../../shared/garden-weather-status';
import { startGardenWeatherClock } from './weather-clock';
import { app, BrowserWindow, ipcMain, screen, powerMonitor } from 'electron';
import path from 'node:path';
import { getGarden, gardenAction } from './service';
import { getSettings } from '../config';
import { getCharacter } from '../characters';
import { choosePairAction } from '../../shared/pair-interaction';
import { plotPetPosition } from './interaction';
let strip: BrowserWindow | null = null, panel: BrowserWindow | null = null, pet: BrowserWindow | null = null;
let expanded = false;
onDesktopVisibilityChanged(() => { if (desktopQuiet()) stopPerformance(); });
let travelPanel: BrowserWindow | null = null;
let stripSize = {width:1100,height:800};
let farm = {left:54, baseline:734};
let farmDrag: {x:number;y:number;left:number;baseline:number} | null = null;
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
let cooperationTimer: ReturnType<typeof setInterval> | undefined;
let performanceVersion = 0;
let cultivatingPlot: number | null = null;
let cultivatingOwner: string | undefined;
let cultivationScene: GardenVisit | undefined;
function stopPerformance(restore = true): void {
    performanceVersion++;
    if(cultivatingPlot!==null){const plot=cultivatingPlot,owner=cultivatingOwner;cultivatingPlot=null;cultivatingOwner=undefined;if(owner)void import('./network').then(n=>n.cooperateGarden(owner,plot,'leave')).catch(()=>{});else void gardenAction({type:'pauseCultivation',plot});}
    cultivatingOwner=undefined;cultivationScene=undefined;strip?.webContents.send('garden:changed');
    clearTimeout(performanceTimer);
    clearInterval(cooperationTimer);cooperationTimer=undefined;
    const origin = home; home = null;
    if (!origin) return;
    if (pet && !pet.isDestroyed()) {
        pet.webContents.send('garden:performance', null);
        if (restore && origin) pet.setPosition(origin.x, origin.y);
    }
    anchor();
}
async function perform(plot: number, kind: 'plant' | 'harvest' | 'cultivate', duration?:number, owner?:string,scene?:GardenVisit): Promise<boolean> {
    if (desktopQuiet()) return false;
    stopPerformance();
    if(kind==='cultivate'&&!expanded)toggle();
    const version = performanceVersion;
    if(kind==='cultivate'&&strip?.webContents.isLoading())await new Promise<void>(resolve=>{const win=strip!;const timer=setTimeout(resolve,3000);win.webContents.once('did-finish-load',()=>{clearTimeout(timer);resolve();});});
    const settings = await getSettings();
    const meta = settings.activeCharacter ? await getCharacter(settings.activeCharacter) : null;
    if (desktopQuiet() || version !== performanceVersion || !meta?.manifest || !expanded || !strip?.isVisible() || !pet?.isVisible()) return false;
    const actions: Record<string, {status?:string;durationSec?:number}> = {...meta.manifest.actions, ...meta.manifest.importedActions, ...meta.manifest.expressionActions, ...meta.manifest.customActions};
    const research=[meta.manifest.agentActions?.thinking,...scenePool(meta.manifest,'focus'),...Object.keys(actions).filter(id=>/研究|观察|思考|看书|记录|research|inspect|think|study/i.test(JSON.stringify(resourceText(meta.manifest,id)))),'writing','idle','garden_sow'];
    const action = (kind==='cultivate'?research:[kind === 'plant' ? 'garden_sow' : 'garden_harvest',kind==='plant'?'wave':'talk_happy','idle']).filter((id):id is string=>!!id).find(id => actions[id] && (!actions[id].status || actions[id].status === 'done'));
    if (!action) return false;
    const bounds = pet.getBounds(); home = {x:bounds.x,y:bounds.y};
    const target = plotPetPosition(plot, bounds, strip.getBounds(), screen.getDisplayMatching(strip.getBounds()).workArea, farm);
    pet.webContents.send('garden:performance', action);
    pet.setPosition(target.x, target.y);
    if(kind==='cultivate'){
        cultivatingPlot=plot;cultivatingOwner=owner;cultivationScene=scene;strip?.webContents.send('garden:changed');
        if(owner){let pending=false;cooperationTimer=setInterval(()=>{if(pending||version!==performanceVersion)return;pending=true;void import('./network').then(n=>n.cooperateGarden(owner,plot,'join')).then(v=>{if(version!==performanceVersion)return;if(cultivationScene)cultivationScene=v;strip?.webContents.send('garden:changed');if(v.tasks?.some(t=>t.plant===v.plots[plot]?.id&&t.done)){cultivatingPlot=null;stopPerformance();for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');}}).catch(()=>{if(version===performanceVersion)stopPerformance();}).finally(()=>{pending=false;});},5000);}
        else performanceTimer=setTimeout(()=>{cultivatingPlot=null;void gardenAction({type:'revealPlant',plot}).then(result=>{if(!result.ok)return gardenAction({type:'pauseCultivation',plot});}).finally(()=>stopPerformance());},Math.max(1,duration??180000)+100);
    } else performanceTimer = setTimeout(() => stopPerformance(), Math.min(12000, (actions[action].durationSec ?? 5) * 1000 + 600));
    return true;
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
    const p = pet.getBounds(), b = strip.getBounds();
    syncSpeechBounds();
    strip.webContents.send('garden:anchor', { farm,
        performer: home ? {left:p.x-b.x,right:p.x+p.width-b.x,top:p.y-b.y,bottom:p.y+p.height-b.y} : undefined,
        left:p.x-b.x,right:p.x+p.width-b.x,top:p.y-b.y,bottom:p.y+p.height-b.y-25 });
}
export function attachGarden(p: BrowserWindow): void {
    pet = p;
    p.webContents.on('did-start-loading',()=>stopPerformance());
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
    expanded = !expanded || (!!strip && !strip.isVisible());
    if (!expanded) {
        stopPerformance();
        strip?.hide();
        return;
    }
    const wa = screen.getDisplayMatching(pet.getBounds()).workArea;
    if (!strip || strip.isDestroyed()) {
        stripSize = {width:wa.width,height:wa.height};
        farm = {left:Math.max(8,(wa.width-455)/2),baseline:wa.height-66};
        strip = new BrowserWindow({ ...stripSize, x:wa.x,y:wa.y, frame: false, transparent: true, hasShadow: false, resizable: false, skipTaskbar: true, show: false,
            webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false } });
        strip.setAlwaysOnTop(true, 'floating');
        trackDesktopWindow(strip,'decoration'); allowDesktopWindow(strip);
        strip.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        strip.setIgnoreMouseEvents(true, { forward: true });
        strip.on('closed', () => { strip = null; expanded = false; stopPerformance(); });
        strip.webContents.on('did-finish-load', () => { anchor(); if (expanded && pet?.isVisible())
            strip?.showInactive(); });
        load(strip, 'strip');
    }
    else {
        allowDesktopWindow(strip);
        anchor();
        strip.showInactive();
    }
    // 土地使用独立位置；桌宠移动只更新提示避让区域。
    anchor();
}
let weatherPanel: BrowserWindow | null=null;
export function openGardenPanel(page: string): void {

    const allowed = /^(weather|travel|moments|bag|shop|book|plots|sow|daily|sprays|feeding|friends|notebook|visit:(?:test:[a-zA-Z0-9_.-]{1,160}|[0-9A-Z]{12})(?::[0-6]:[a-zA-Z0-9_-]{1,160})?|plot:[0-6])$/.test(page) ? page : 'bag';
    if(allowed==='weather'){
        allowDesktopWindow(weatherPanel);
        if(weatherPanel&&!weatherPanel.isDestroyed()){weatherPanel.show();weatherPanel.focus();return;}
        const wa=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
        const width=Math.min(420,wa.width),height=Math.min(620,wa.height);
        const petBounds=pet?.getBounds();
        const win=new BrowserWindow({title:'花园气象台',width,height,x:Math.max(wa.x,Math.min((petBounds?.x??wa.x)+ (petBounds?.width??0),wa.x+wa.width-width)),y:Math.max(wa.y,Math.min(petBounds?.y??wa.y,wa.y+wa.height-height)),resizable:false,backgroundColor:'#f4efe5',show:false,webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false}});
        weatherPanel=win;allowDesktopWindow(win);win.setMenuBarVisibility(false);win.setAlwaysOnTop(true,'floating');win.on('closed',()=>{if(weatherPanel===win)weatherPanel=null;});win.once('ready-to-show',()=>win.show());load(win,'weather');return;
    }
    if (allowed === 'travel' || allowed === 'moments') {
        allowDesktopWindow(travelPanel);
        if (!travelPanel || travelPanel.isDestroyed()) {
            const wa = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
            const height = Math.min(850, wa.height - 24), width = Math.min(560, wa.width - 24, Math.round(height * .72));
            const win = new BrowserWindow({title:'旅行手账',width,height,x:Math.round(wa.x+(wa.width-width)/2),y:Math.round(wa.y+(wa.height-height)/2),minWidth:Math.min(360,width),minHeight:Math.min(480,height),
                frame:false,transparent:true,hasShadow:true,backgroundColor:'#00000000',show:false,
                webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false}});
            travelPanel=win;win.setMenuBarVisibility(false);win.setAlwaysOnTop(true,'floating');
            allowDesktopWindow(win);
            win.on('closed',()=>{if(travelPanel===win)travelPanel=null;});
            win.once('ready-to-show',()=>win.show());load(win,allowed);
        } else {travelPanel.webContents.send('garden:page',allowed);travelPanel.show();travelPanel.focus();}
        return;
    }
    allowDesktopWindow(panel);
    if (!panel || panel.isDestroyed()) {
        const wa = screen.getPrimaryDisplay().workArea;
        panel = new BrowserWindow({ title: '小小花园 · 实验室', width: Math.min(860, wa.width), height: Math.min(720, wa.height), minWidth: 540, minHeight: 440, backgroundColor: '#faf6eb', show: false,
            webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: false } });
        panel.setMenuBarVisibility(false);
        allowDesktopWindow(panel);
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
    ipcMain.handle('garden:interact',async(_ev,target,kind)=>(await import('./network')).inviteInteraction(target,kind));
    ipcMain.handle('garden:answerInteraction',async(_ev,id,accept,response)=>(await import('./network')).answerInteraction(id,accept===true,response));
    ipcMain.handle('garden:online',async (_ev,enable)=>{await (await import('./network')).setNetworkGarden(enable===true);for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');});
    ipcMain.handle('garden:visit',async (_ev,owner,preview,task)=> (await import('./network')).visitGarden(owner,preview===true,task));
    ipcMain.handle('garden:cooperate',async (_ev,owner,plot,action,target,task)=> {
        const network=await import('./network');
        const visit=await network.cooperateGarden(owner,plot,action,target,task);
        if(action==='leave'&&cultivatingOwner===owner&&cultivatingPlot===plot){cultivatingPlot=null;stopPerformance();}
        if(action==='join'&&!visit.tasks?.some(t=>t.plant===visit.plots[plot]?.id&&t.done)&&!(cultivatingOwner===owner&&cultivatingPlot===plot)){
            let playing=false;try{playing=await perform(plot,'cultivate',undefined,owner,visit);}catch{stopPerformance();}
            if(!playing){await network.cooperateGarden(owner,plot,'leave');throw Error('请先显示桌宠并选择可播放动作的角色，再继续培育');}
        }
        return visit;
    });
    ipcMain.handle('garden:saveRehearsal', async (_ev,request) => (await import('./rehearsal-store')).saveRehearsal(request));
    ipcMain.handle('garden:journalStatus', async () => (await import('./journal-service')).journalStatus());
    ipcMain.handle('garden:rewriteDiary', async (_ev,request) => (await import('./journal-service')).rewriteDiary(request));
    ipcMain.handle('garden:generateMoment', async (_ev,requestId) => (await import('./journal-service')).generateMoment(requestId));
    ipcMain.handle('garden:weather', async () => gardenWeatherStatus(await getGarden()));
    startGardenWeatherClock();
    powerMonitor.on('suspend',()=>stopPerformance());
    ipcMain.handle('garden:get', async (ev) => {
        const state=publicGardenState(await getGarden());
        if(cultivationScene&&cultivatingPlot!==null&&ev.sender===strip?.webContents){state.plots=structuredClone(cultivationScene.plots);state.cooperations=structuredClone(cultivationScene.tasks);state.cultivationVisit={owner:cultivationScene.owner,plot:cultivatingPlot};}
        return state;
    });
    ipcMain.handle('garden:act', async (_ev, command) => {
        if(cultivationScene&&_ev.sender===strip?.webContents)return {ok:false,error:'正在朋友的花园培育，请先暂停再操作自己的土地'};
        const result = await gardenAction(command);
        if(result.ok && command.type==='cultivate' && !(cultivatingPlot===command.plot&&cultivatingOwner===(result.state.online?result.state.life?.owner:undefined))){
            const p=result.state.plots[command.plot]!;
            let playing=false;try{playing=await perform(command.plot,'cultivate',cultivationRemaining(p,Date.now()),result.state.online?result.state.life?.owner:undefined);}catch{stopPerformance();}
            if(!playing){await gardenAction({type:'pauseCultivation',plot:command.plot});return {ok:false,error:'请先显示桌宠并选择可播放动作的角色，再继续培育'};}
        }
        if(result.ok && command.type==='pauseCultivation')stopPerformance();
        if (result.ok && (command.type === 'plant' || command.type === 'harvest'))
            void perform(command.plot, command.type).catch(() => stopPerformance());
        if(result.ok&&command.type==='feed'){
            const actor=result.state.activeActor;
            if(actor)void getCharacter(actor).then(character=>{
                if(!character||!pet||pet.isDestroyed())return;
                const action=choosePairAction(character.manifest,'happy');
                if(action)pet.webContents.send('pet:menuCommand',{type:'play',action:action.id});
                pet.webContents.send('garden:interaction',{kind:'feed',caption:result.reveal?.message??'吃到了，谢谢你！',effect:({strawberry:'🍓',tomato:'🍅',blueberry:'🫐',pineapple:'🍍',apple:'🍎'} as Record<string,string>)[result.state.life?.characters[actor]?.wishes.find(w=>w.id===command.wish)?.species??'']??'🍓'});
            }).catch(()=>{});
        }
        return result;
    });
    ipcMain.on('pet:move', () => { if (home) stopPerformance(false); });
    ipcMain.on('garden:cancelPerformance', (_ev, restore) => stopPerformance(restore !== false));
    ipcMain.on('garden:toggle', toggle);
    ipcMain.on('garden:collapse', ev => {
        if(ev.sender!==strip?.webContents)return;
        farmDrag=null;expanded=false;stopPerformance();strip?.hide();
    });
    ipcMain.on('garden:drag', (ev, phase, x, y) => {
        if(!strip||ev.sender!==strip.webContents)return;
        if(phase==='end'){farmDrag=null;return;}
        if(!Number.isFinite(x)||!Number.isFinite(y))return;
        if(phase==='start'){stopPerformance();farmDrag={x,y,...farm};return;}
        if(phase!=='move'||!farmDrag)return;
        farm={left:Math.max(8,Math.min(stripSize.width-463,farmDrag.left+x-farmDrag.x)),
            baseline:Math.max(180,Math.min(stripSize.height-66,farmDrag.baseline+y-farmDrag.y))};
        anchor();
    });
    ipcMain.on('garden:open', (_ev, page) => openGardenPanel(typeof page === 'string' ? page : 'bag'));
    ipcMain.on('garden:closeTravel', ev => {if(travelPanel && ev.sender === travelPanel.webContents) travelPanel.close();});
    ipcMain.on('garden:ignore', (ev, ignore) => { if (strip && ev.sender === strip.webContents)
        strip.setIgnoreMouseEvents(ignore !== false, { forward: true }); });
    app.on('before-quit', () => { stopPerformance(); weatherPanel?.destroy(); strip?.destroy(); panel?.destroy(); travelPanel?.destroy(); });
}
