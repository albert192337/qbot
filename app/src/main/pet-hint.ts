import {BrowserWindow,ipcMain,screen} from 'electron';
import path from 'node:path';
import {HINT_SIZE,exteriorHintPosition,type PetHint} from '../shared/pet-hint';
import {desktopActorVisible,trackDesktopWindow,allowDesktopWindow,onDesktopVisibilityChanged} from './desktop-visibility';
import {moveFixedSize} from './fixed-window';
import {attachPetWindowLayer} from './pet-window-layer';

/** A separate exterior surface: no assumption about transparent margins in user artwork. */
export function registerPetHints():void {
  const hints=new Map<BrowserWindow,{win:BrowserWindow;value:PetHint|null;ready:boolean}>();
  const sync=(owner:BrowserWindow)=>{
    const state=hints.get(owner);if(!state||state.win.isDestroyed())return;
    const position=exteriorHintPosition(owner.getBounds(),screen.getDisplayMatching(owner.getBounds()).workArea);
    if(!state.ready||!state.value||!desktopActorVisible(owner)||!position){state.win.hide();return;}
    moveFixedSize(state.win,position.x,position.y,HINT_SIZE);
    state.win.webContents.send('hint:changed',state.value);
    allowDesktopWindow(state.win);state.win.showInactive();
  };
  ipcMain.on('hint:set',(event,value:PetHint|null)=>{
    const owner=BrowserWindow.fromWebContents(event.sender);if(!owner)return;
    if(value&&(!desktopActorVisible(owner,false)||!['wish','interaction','speech'].includes(value.kind)||typeof value.text!=='string'))return;
    let state=hints.get(owner);
    if(!state){
      if(!value)return;
      const win=new BrowserWindow({...HINT_SIZE,transparent:true,frame:false,hasShadow:false,resizable:false,focusable:false,skipTaskbar:true,show:false,
        webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false}});
      state={win,value:null,ready:false};hints.set(owner,state);trackDesktopWindow(win);
      win.setAlwaysOnTop(true,'floating');attachPetWindowLayer(win,()=>[owner,win],owner);
      win.setIgnoreMouseEvents(true,{forward:true});
      const update=()=>sync(owner),clear=()=>{const s=hints.get(owner);if(s){s.value=null;s.win.hide();}};
      owner.on('move',update);owner.on('resize',update);owner.on('show',update);owner.on('hide',clear);owner.webContents.on('did-start-loading',clear);
      owner.once('closed',()=>{hints.delete(owner);if(!win.isDestroyed())win.destroy();});
      win.webContents.once('did-finish-load',()=>{const s=hints.get(owner);if(s)s.ready=true;sync(owner);});
      if(process.env.ELECTRON_RENDERER_URL)void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/pet-hint/index.html`);
      else void win.loadFile(path.join(__dirname,'../renderer/pet-hint/index.html'));
    }
    const invitation=value?.kind==='interaction'&&typeof value.invitation?.id==='string'&&Number.isFinite(value.invitation.expiresAt)&&value.invitation.expiresAt>Date.now()?{id:value.invitation.id.slice(0,200),expiresAt:value.invitation.expiresAt}:undefined;
    state.value=value?{kind:value.kind,text:value.text.slice(0,200),icon:typeof value.icon==='string'?value.icon.slice(0,20):'',title:typeof value.title==='string'?value.title.slice(0,200):'',invitation}:null;
    sync(owner);
  });
  ipcMain.on('hint:action',(event,action)=>{
    for(const [owner,s] of hints){
      if(s.win.webContents!==event.sender||!s.win.isVisible()||!desktopActorVisible(owner))continue;
      const invitation=s.value?.invitation;
      if(invitation&&action&&typeof action==='object'&&action.invitationId===invitation.id&&typeof action.accept==='boolean'&&invitation.expiresAt>Date.now())owner.webContents.send('hint:action',{invitationId:invitation.id,accept:action.accept});
      else if(s.value?.kind==='wish'&&['open','dismiss'].includes(action))owner.webContents.send('hint:action',action);
    }
  });
  ipcMain.on('hint:hover',(event,hit)=>{for(const s of hints.values())if(s.win.webContents===event.sender)s.win.setIgnoreMouseEvents(!hit,{forward:true});});
  onDesktopVisibilityChanged(()=>{for(const [owner,s] of hints){if(!desktopActorVisible(owner))s.value=null;sync(owner);}});
}
