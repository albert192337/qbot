import {app,BrowserWindow,ipcMain,screen} from 'electron';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import nativeSource from '../../../../scripts/desktop-pinball-native.cs?raw';
import {PinballStore} from './store.mjs';
import {TYPES,LAUNCH_COUNTS,placeIcon,classify} from '../../renderer/desktop-pinball/model.mjs';
import {trackDesktopWindow,allowDesktopWindow,desktopHidden} from '../desktop-visibility';

let store,win,helper,display,opening,timer,poll,resizeTimer,registered=false,disposed=false;
let icons=[],images=new Map(),rects=[],snapshotAt=0,active=true,ready=false;
function getStore(){
 if(store)return store;
 const file=path.join(app.getPath('userData'),'desktop-pinball.json');
 // Development upgrade only: adopt the existing local preview once, never merge two wallets.
 const legacy=path.resolve(__dirname,'../../../output/desktop-pinball/profile/wallet.json');
 const canAdopt=!app.isPackaged&&!fs.existsSync(file)&&!fs.existsSync(file+'.bak')&&fs.existsSync(legacy)&&!process.env.QBOT_PINBALL_NO_IMPORT;
 return store=new PinballStore(file,fs,Date.now(),canAdopt?JSON.parse(fs.readFileSync(legacy,'utf8')):null);
}
function petAnchor(){const pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().split('?')[0].endsWith('/pet/index.html'));if(!pet||!display)return null;const b=pet.getBounds();return {x:b.x+b.width/2-display.bounds.x,y:b.y+b.height*.1-display.bounds.y};}
function state(){const s=getStore().snapshot();return {...s,petAnchor:petAnchor(),cancelledRoundIds:s.rounds.filter(r=>r.cancelled).map(r=>r.result.id),icons,width:display.bounds.width,height:display.workArea.y-display.bounds.y+display.workArea.height,ready,active:active&&!desktopHidden()&&!!win?.isVisible(),formal:true};}
let lastSummary='',lastAnchor='';
function publish(full=true){
 const summary=getStore().snapshot().summary;
 const key=JSON.stringify(summary);if(key!==lastSummary){lastSummary=key;for(const target of BrowserWindow.getAllWindows())if(!target.isDestroyed())target.webContents.send('pinball:summary',summary);}
 const anchor=JSON.stringify(petAnchor());if(anchor!==lastAnchor){lastAnchor=anchor;full=true;}
 if(full&&win&&!win.isDestroyed()&&!win.webContents.isLoadingMainFrame())win.webContents.send('pinball:state',state());
}
function guard(e){if(!win||e.sender!==win.webContents)throw Error('无效的弹珠窗口');}
function trusted(e){const owner=BrowserWindow.fromWebContents(e.sender);if(!owner||e.senderFrame!==e.sender.mainFrame)throw Error('无效的宝箱入口');return owner;}
function convert(snapshot){
 const old=JSON.stringify(icons.map(({imageRevision,...p})=>p)),nextImages=new Map();
 const next=(snapshot.visible?snapshot.icons:[]).map(icon=>{
  const p=screen.screenToDipPoint({x:icon.x,y:icon.y}),id=createHash('sha256').update(icon.name+'|'+icon.kind).digest('hex').slice(0,20);
  const image=icon.image||'',imageRevision=createHash('sha256').update(image).digest('hex').slice(0,20);nextImages.set(id,{image,revision:imageRevision});
  return {id,name:icon.name,kind:icon.kind,imageRevision,...placeIcon(p.x-display.bounds.x,p.y-display.bounds.y,icon.size),type:getStore().data.wallet.overrides[id]||classify(icon)};
 }).filter(p=>p.x>0&&p.x<display.bounds.width&&p.y>0&&p.y<state().height);
 if(snapshotAt&&JSON.stringify(next.map(({imageRevision,...p})=>p))!==old)getStore().cancelGeometry();
 icons=next;images=nextImages;snapshotAt=Date.now();ready=true;publish();
}
function startNative(){
 return new Promise((resolve,reject)=>{
  const handle=win.getNativeWindowHandle().readBigUInt64LE().toString();
  const code=`$ErrorActionPreference='Stop'\nAdd-Type -ReferencedAssemblies System.Core,Microsoft.CSharp,System.Web.Extensions,System.Drawing -TypeDefinition @'\n${nativeSource}\n'@\ntry { [PinballDesktop]::ValidateOverlay(${handle},${process.pid}) | Out-Null; [PinballDesktop]::Run(${process.pid},$false) } catch { @{fatal=$_.Exception.Message} | ConvertTo-Json -Compress }`;
  const script=path.join(app.getPath('userData'),'pinball-native.ps1');fs.writeFileSync(script,'\ufeff'+code);
  const child=helper=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let buffer='',settled=false;
  const timeout=setTimeout(()=>fail(Error('读取桌面超时，请重试')),15000);
  function fail(error){clearTimeout(timeout);ready=false;if(!settled){settled=true;reject(error);}else{console.error('[pinball]',error);if(win&&!win.isDestroyed())win.close();}}
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{
   buffer+=chunk;if(buffer.length>24*1024*1024){fail(Error('桌面数据过大'));child.kill();return;}
   let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).replace(/^\uFEFF/,'').trim();buffer=buffer.slice(end+1);if(!line)continue;
    try{const data=JSON.parse(line);if(child!==helper||disposed)return;
     if(data.fatal)throw Error(data.fatal);
     if(data.snapshot){convert(data.snapshot);if(!settled){settled=true;clearTimeout(timeout);resolve();}}
     if(data.desktopRequested&&ready){allowDesktopWindow(win);win.showInactive();}
     if('desktopActive'in data){active=data.desktopActive;publish();}
     // Keyboard counts come from the existing formal input monitor, never twice.
    }catch(error){fail(error);}
   }
  });
  child.stderr.on('data',data=>console.error('[pinball native]',String(data).slice(0,500)));
  child.on('error',fail);child.on('exit',()=>{if(child===helper&&!disposed)fail(Error('桌面读取已停止，请重试'));});
 });
}
async function ensureWindow(owner){
 if(process.platform!=='win32')throw Error('桌面弹珠目前支持 Windows');
 if(opening)return opening;
 if(win&&!win.isDestroyed()&&ready){allowDesktopWindow(win);helper?.stdin.write('show\n');win.show();return;}
 opening=(async()=>{
  getStore();display=screen.getDisplayMatching(owner.getBounds());
  if(getStore().data.rounds.some(r=>r.width!==state().width||r.height!==state().height))getStore().cancelGeometry();
  const w=win=new BrowserWindow({...display.bounds,height:state().height,show:false,transparent:true,frame:false,hasShadow:false,skipTaskbar:true,resizable:false,title:'桌面弹珠',webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
  ready=false;snapshotAt=0;icons=[];images.clear();rects=[];active=true;
  trackDesktopWindow(w,'aux');allowDesktopWindow(w);w.setIgnoreMouseEvents(true,{forward:true});
  w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());
  w.on('hide',()=>{if(!w.isDestroyed())w.webContents.send('pinball:state',{...state(),active:false});});
  w.on('closed',()=>{if(win===w){win=null;ready=false;const child=helper;helper=null;child?.stdin.end();child?.kill();clearInterval(poll);rects=[];}});
  w.webContents.on('render-process-gone',()=>{if(!w.isDestroyed())w.close();});
  try{
   await Promise.all([startNative(),process.env.ELECTRON_RENDERER_URL?w.loadURL(`${process.env.ELECTRON_RENDERER_URL}/desktop-pinball/index.html`):w.loadFile(path.join(__dirname,'../renderer/desktop-pinball/index.html'))]);
   if(w.isDestroyed())throw Error('弹珠窗口已关闭');w.show();publish();
   poll=setInterval(()=>{if(w.isDestroyed())return;const p=screen.getCursorScreenPoint(),x=p.x-display.bounds.x,y=p.y-display.bounds.y;const hit=rects.some(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height);w.setIgnoreMouseEvents(!hit,{forward:true});},40);
  }catch(error){if(!w.isDestroyed())w.close();throw error;}
 })().finally(()=>{opening=null;});return opening;
}
function launch(x,count,origin){
 if(!ready||Date.now()-snapshotAt>15000)throw Error('桌面图标读取中');
 if(!Number.isFinite(x)||!LAUNCH_COUNTS.includes(count))throw Error('无效的弹珠数量');
 const round=getStore().launch({width:state().width,height:state().height,icons,launchX:x,launchCount:count},origin);publish();return round;
}
export function addPinballKeys(keys){if(!registered||disposed)return;try{const changed=getStore().tick(Date.now(),keys);publish(changed);}catch(error){console.error('[pinball save]',error);}}
export function disposeDesktopPinball(){disposed=true;clearInterval(timer);clearInterval(poll);clearTimeout(resizeTimer);const child=helper;helper=null;child?.stdin.end();child?.kill();if(win&&!win.isDestroyed())win.close();}
export function registerDesktopPinball(){
 if(registered)return;registered=true;
 ipcMain.handle('pinball:summary',e=>{trusted(e);getStore().tick();return getStore().snapshot().summary;});
 ipcMain.handle('pinball:open',async e=>{const owner=trusted(e);await ensureWindow(owner);});
 ipcMain.handle('pinball:openChest',async(e,point)=>{
  const owner=trusted(e),bounds=owner.getBounds();
  const p=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)?{x:bounds.x+Math.max(0,Math.min(bounds.width,point.x)),y:bounds.y+Math.max(0,Math.min(bounds.height,point.y))}:{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
  await ensureWindow(owner);
  const origin={x:Math.max(8,Math.min(state().width-8,p.x-display.bounds.x)),y:Math.max(8,Math.min(state().height-8,p.y-display.bounds.y))};
  launch(origin.x,1,origin);return getStore().snapshot().summary;
 });
 ipcMain.handle('pinball:get',e=>{guard(e);return state();});
 ipcMain.handle('pinball:launch',(e,x,count=1)=>{guard(e);return launch(x,count);});
 ipcMain.handle('pinball:icon',(e,id)=>{guard(e);return images.get(id)||{image:'',revision:''};});
 ipcMain.handle('pinball:assign',(e,id,type)=>{guard(e);if(getStore().data.rounds.some(r=>!r.cancelled&&r.ends>Date.now()))throw Error('弹珠落定后再换');if(!icons.some(p=>p.id===id)||!TYPES[type])throw Error('图标已移走');getStore().assign(id,type);icons=icons.map(p=>p.id===id?{...p,type}:p);publish();});
 ipcMain.on('pinball:rects',(e,data)=>{guard(e);if(Array.isArray(data)&&data.length<600)rects=data.filter(r=>[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0);});
 ipcMain.on('pinball:close',e=>{guard(e);win.close();});
 timer=setInterval(()=>{try{if(store){const changed=store.tick();publish(changed);}}catch(error){console.error('[pinball save]',error);}},250);
 const resize=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
  if(!win||win.isDestroyed())return;
  try{
   const next=screen.getAllDisplays().find(d=>d.id===display.id)??screen.getPrimaryDisplay();
   if(JSON.stringify([next.bounds,next.workArea,next.scaleFactor])===JSON.stringify([display.bounds,display.workArea,display.scaleFactor]))return;
   getStore().cancelGeometry();display=next;snapshotAt=0;ready=false;icons=[];images.clear();rects=[];
   win.setBounds({...display.bounds,height:state().height});publish();
  }catch(error){console.error('[pinball display]',error);}
 },250);};
 screen.on('display-metrics-changed',resize);screen.on('display-removed',resize);
 app.once('before-quit',disposeDesktopPinball);
}
