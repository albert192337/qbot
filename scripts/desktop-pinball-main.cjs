// Isolated, offline desktop experiment. No formal QBot IPC, accounts or economic state.
const {app,BrowserWindow,ipcMain,screen,protocol,session,dialog,Tray,Menu}=require('electron');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/desktop-pinball'),verify=process.argv.includes('--verify');
const profile=path.join(out,verify?'test-profile-'+process.pid:'profile');fs.mkdirSync(profile,{recursive:true});
app.setPath('userData',profile);app.setName('QBot Desktop Pinball Trial');
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const launchToken=process.argv.find(a=>a.startsWith('--launch-token='))?.slice(15)||crypto.randomUUID();
if(!app.requestSingleInstanceLock({launchToken})){app.quit();}else{
 let win,helper,poll,timer,wheelTimer,displayTimer,tray,wallet,model,display,pins=[],native=null,attached=null,rects=[],ignoring=true,rounds=[],visibleDesktop=false,snapshotAt=0,savingAt=0,disposed=false,nextTestSeed=null;
 const pendingLaunches=new Set([launchToken]),acknowledgedLaunches=new Set();
 const iconImages=new Map();let iconBitmapCount=0;
 const walletPath=path.join(profile,'wallet.json'),statusPath=path.join(out,verify?'test-status.json':'live-status.json');
 function save(next){const temp=walletPath+'.tmp';fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,walletPath);wallet=next;savingAt=Date.now();}
 function activeRounds(){rounds=rounds.filter(round=>Date.now()<round.ends||wallet.pendingWheels?.some(t=>t.id===round.result.id));return rounds;}
 function state(){return{wallet,icons:pins,width:display.bounds.width,height:display.workArea.y-display.bounds.y+display.workArea.height,ready:verify||!!attached,error:null,active:visibleDesktop,rounds:activeRounds()};}
 function send(extra={}){if(win&&!win.isDestroyed())win.webContents.send('pinball:state',{...state(),...extra});}
 function writeStatus(){if(!display)return;fs.writeFileSync(statusPath,JSON.stringify({pid:process.pid,helperPid:helper?.pid,attached,icons:pins.length,iconBitmapCount,iconSource:'shell-item',launchCounts:model?.LAUNCH_COUNTS,continuousLaunch:true,feedbackVersion:4,automaticRoulette:true,display,profile,ready:!disposed&&!!attached&&snapshotAt>0,visible:!disposed&&!!win&&!win.isDestroyed()&&win.isVisible()&&!win.isMinimized(),launchTokens:[...acknowledgedLaunches].slice(-20),updatedAt:Date.now()},null,2));}
 function reveal(){if(!win||win.isDestroyed())return;visibleDesktop=true;if(win.isMinimized())win.restore();win.setAlwaysOnTop(false);win.show();win.moveTop();win.focus();for(const token of pendingLaunches)acknowledgedLaunches.add(token);pendingLaunches.clear();writeStatus();send();}
 function requestReveal(){if(helper?.stdin.writable)helper.stdin.write('show\n');}
 // Ordinary top-level z-order lets other apps cover the game naturally. Hiding on
 // every foreground transition made launcher-console focus changes erase the UI.
 function syncVisibility(){if(!win||win.isDestroyed()||!attached||!visibleDesktop)return;if(win.isMinimized())win.restore();if(!win.isVisible())win.showInactive();}
 function resizeDisplay(next){
  if(disposed||!win||win.isDestroyed())return;
  const geometry=d=>JSON.stringify([d.bounds,d.workArea,d.scaleFactor]);
  if(geometry(display)===geometry(next))return;
  const cancelledRoundIds=activeRounds().map(r=>r.result.id);
  display=next;
  // Old trajectories no longer fit; already settled rewards and queued wheels survive.
  rounds=rounds.filter(r=>wallet.pendingWheels?.some(t=>t.id===r.result.id)).map(r=>({...r,cancelled:true}));
  rects=[];ignoring=true;win.setIgnoreMouseEvents(true,{forward:true});
  win.setBounds({...display.bounds,height:state().height});
  if(native)convert(native);
  send({cancelledRoundIds});writeStatus();
 }
 app.on('second-instance',(_event,_argv,_cwd,data)=>{if(data?.launchToken)pendingLaunches.add(data.launchToken);requestReveal();});
 function guard(event){if(event.sender!==win?.webContents)throw Error('Unknown sender');}
 function convert(snapshot){
  const geometry=items=>JSON.stringify(items.map(({imageRevision,...pin})=>pin));
  const previous=geometry(pins);native=snapshot;snapshotAt=Date.now();const b=display.bounds;iconImages.clear();
  pins=snapshot.visible?snapshot.icons.map(icon=>{
   const p=screen.screenToDipPoint({x:icon.x,y:icon.y}),size=icon.size;
   const id=crypto.createHash('sha256').update(icon.name+'|'+icon.kind).digest('hex').slice(0,20);
   const image=icon.image||'',imageRevision=crypto.createHash('sha256').update(image).digest('hex').slice(0,20);
   iconImages.set(id,{image,revision:imageRevision});
   return{id,imageRevision,name:icon.name,kind:icon.kind,...model.placeIcon(p.x-b.x,p.y-b.y,size),type:wallet.overrides[id]||model.classify(icon)};
  }).filter(p=>p.x>0&&p.x<b.width&&p.y>0&&p.y<state().height):[];
  iconBitmapCount=pins.filter(p=>iconImages.get(p.id)?.image).length;
  const changed=previous!==geometry(pins),cancelledRoundIds=changed?activeRounds().map(round=>round.result.id):[];
  if(changed)rounds=rounds.filter(r=>wallet.pendingWheels?.some(t=>t.id===r.result.id)).map(r=>({...r,cancelled:true}));
  send({cancelledRoundIds});
 }
 function startNative(){
  const handle=win.getNativeWindowHandle().readBigUInt64LE().toString();
  const source=fs.readFileSync(path.join(__dirname,'desktop-pinball-native.cs'),'utf8');
  const code=`$ErrorActionPreference='Stop'\nAdd-Type -ReferencedAssemblies System.Core,Microsoft.CSharp,System.Web.Extensions,System.Drawing -TypeDefinition @'\n${source}\n'@\ntry { $result=[PinballDesktop]::ValidateOverlay(${handle},${process.pid}); $result | ConvertTo-Json -Compress; [PinballDesktop]::Run(${process.pid},$false) } catch { @{fatal=$_.Exception.Message} | ConvertTo-Json -Compress }`;
  const script=path.join(out,'native-live.ps1');fs.writeFileSync(script,'\ufeff'+code);
  helper=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let pending='',captured=false;helper.stdout.setEncoding('utf8');helper.stdout.on('data',chunk=>{pending+=chunk;let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end).replace(/^\ufeff/,'').trim();pending=pending.slice(end+1);if(!line)continue;try{
   const data=JSON.parse(line);
   if(data.fatal){console.error(data.fatal);dialog.showErrorBox('桌面弹珠未启动',data.fatal);app.quit();return;}
   if(data.attached){
    attached=data;
    // Read flags on our own HWND and exercise Electron's reversible mouse-routing toggle.
    // This checks native routing configuration, not physical SendInput/Explorer interaction.
    const koffi=require('koffi'),user32=koffi.load('user32.dll'),flags=user32.func('int __stdcall GetWindowLongW(intptr_t hwnd, int index)');
    const own=Number(handle);win.setIgnoreMouseEvents(true,{forward:true});const idle=flags(own,-20);win.setIgnoreMouseEvents(false);const interactive=flags(own,-20);win.setIgnoreMouseEvents(true,{forward:true});ignoring=true;
    attached.inputFlags={clickThrough:!!(idle&0x20),interactive:!(interactive&0x20),restored:!!(flags(own,-20)&0x20),topLevel:!(flags(own,-16)&0x40000000)};
    if(!Object.values(attached.inputFlags).every(Boolean))throw Error('Unexpected desktop input flags');
    console.log('attached',JSON.stringify(attached));
   }
   if(data.desktopRequested)reveal();
   if(data.snapshot){if(attached&&data.snapshot.desktop!==attached.parent){app.quit();return;}convert(data.snapshot);writeStatus();if(!captured){captured=true;setTimeout(async()=>{try{fs.writeFileSync(path.join(out,'live-overlay.png'),(await win.webContents.capturePage()).toPNG());}catch(e){console.error(e);}},1200);}}
   if('desktopActive'in data){visibleDesktop=data.desktopActive;syncVisibility();writeStatus();send();}
   if('activity'in data){const next=model.replenish(wallet,Date.now(),data.activity);if(next.balls!==wallet.balls||Date.now()-savingAt>10000)save(next);else wallet=next;syncVisibility();send();}
   if(data.error)console.error('native',data.error);
  }catch(e){console.error('native output',e.message);}}});
  helper.stderr.on('data',data=>console.error(String(data)));helper.on('error',e=>{console.error(e);app.quit();});helper.on('exit',()=>{if(!disposed)app.quit();});
 }
 app.whenReady().then(async()=>{
  model=await import(pathToFileURL(path.join(root,'app/src/renderer/desktop-pinball/model.mjs')).href);
  try{const data=JSON.parse(fs.readFileSync(walletPath,'utf8'));if(data.version!==1||!Number.isSafeInteger(data.balls)||data.balls<0||data.balls>30||!Number.isFinite(data.refillAt)||!Array.isArray(data.unlocked)||!data.overrides)throw Error('Invalid trial save');wallet=model.replenish(data,Date.now());}catch(e){if(fs.existsSync(walletPath))fs.copyFileSync(walletPath,walletPath+'.backup-'+Date.now());wallet=model.newWallet();}save(wallet);
  display=screen.getPrimaryDisplay();if(verify)display={...display,bounds:{x:0,y:0,width:1440,height:900},workArea:{x:0,y:0,width:1440,height:900},scaleFactor:1};
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  const base=path.join(root,'app/resources/presets/spine-zhangqiling');
  protocol.handle('qbot-asset',async req=>{try{const url=new URL(req.url);if(url.hostname!=='pinball-pet')return new Response(null,{status:403});const file=path.resolve(base,decodeURIComponent(url.pathname).replace(/^\//,''));if(!file.startsWith(base+path.sep))return new Response(null,{status:403});const ext=path.extname(file);return new Response(await fs.promises.readFile(file),{headers:{'Content-Type':ext==='.json'?'application/json':ext==='.png'?'image/png':'text/plain','Access-Control-Allow-Origin':'*'}});}catch{return new Response(null,{status:404});}});
  win=new BrowserWindow({...display.bounds,height:state().height,title:'桌面弹珠',show:false,transparent:!verify,backgroundColor:verify?'#a8c9dc':'#00000000',frame:false,hasShadow:false,focusable:true,skipTaskbar:false,resizable:false,alwaysOnTop:false,webPreferences:{preload:path.join(__dirname,'desktop-pinball-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.on('console-message',e=>{if(e.level==='error')console.error(e.message);});
  ipcMain.handle('pinball:get',e=>{guard(e);return{...state(),manifest:JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8')),verify};});
  // Missing Shell artwork means glow only; never substitute a generic file icon.
  ipcMain.handle('pinball:icon',(e,id)=>{guard(e);return iconImages.get(id)||{image:'',revision:''};});
  ipcMain.handle('pinball:launch',(e,x,count=1)=>{guard(e);if(!verify&&(!attached||Date.now()-snapshotAt>15000))throw Error('桌面图标读取中');if(!Number.isFinite(x)||!model.LAUNCH_COUNTS.includes(count))throw Error('Invalid launch');
   const now=Date.now(),before=model.replenish(wallet,now);if(before.balls<count)throw Error('弹珠不足');
   const seed=verify&&nextTestSeed!=null?nextTestSeed:crypto.randomBytes(4).readUInt32LE();nextTestSeed=null;
   const result=model.simulate({width:state().width,height:state().height,icons:pins,launchX:x,launchCount:count,seed,id:crypto.randomUUID(),stars:before.stars,unlocked:before.unlocked});
   const started=now+model.OPEN_MS;
   save(model.settle(before,result,started));const round={result,openedAt:now,started,ends:started+result.duration*1000+600,before};activeRounds().push(round);send();return round;
  });
  ipcMain.handle('pinball:assign',(e,id,type)=>{guard(e);if(activeRounds().length)throw Error('弹珠落定后再换');if(!model.TYPES[type]||!pins.some(p=>p.id===id))throw Error('图标已移走');save({...wallet,overrides:{...wallet.overrides,[id]:type}});pins=pins.map(p=>p.id===id?{...p,type}:p);send();});
  ipcMain.handle('pinball:equip',(e,id)=>{guard(e);if(id!==null&&!wallet.unlocked.includes(id))throw Error('外观尚未获得');save({...wallet,equipped:id});send();});
  ipcMain.handle('pinball:cursor',e=>{guard(e);const p=screen.getCursorScreenPoint();return{x:p.x-display.bounds.x,y:p.y-display.bounds.y};});
  ipcMain.on('pinball:rects',(e,data)=>{guard(e);if(Array.isArray(data)&&data.length<600)rects=data.filter(r=>[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0);});
  ipcMain.on('pinball:close',e=>{guard(e);app.quit();});
  if(verify){
   const names=[['项目','folder'],['笔记.md','file'],['Chrome','shortcut'],['Steam','shortcut'],['回收站','virtual']];
   const shellFixtures=process.argv.includes('--shell-icons')?JSON.parse(fs.readFileSync(path.join(out,'shell-icon-fixtures.json'),'utf8')):null;
   pins=Array.from({length:20},(_,i)=>{
    const [name,kind]=names[i%5],pin={id:String(i),name,kind,type:model.classify({name,kind}),x:65+Math.floor(i/5)*125,y:145+i%5*122,r:28,size:48};
    if(shellFixtures){const item=shellFixtures[i%shellFixtures.length];pin.name=item.name;pin.imageRevision=crypto.createHash('sha256').update(item.image).digest('hex').slice(0,20);iconImages.set(pin.id,{image:item.image,revision:pin.imageRevision});}
    return pin;
   });
  }
  wheelTimer=setInterval(()=>{if(!wallet)return;const next=model.advanceWheels(wallet,Date.now());if(next!==wallet){save(next);send();}},100);
  await win.loadFile(path.join(out,'dist/desktop-pinball/index.html'));
  if(verify){win.show();await require('./test-desktop-pinball-ui.cjs')({app,win,fs,path,out,profile,getState:state,save,getWallet:()=>wallet,model,setLaunchSeed:seed=>{nextTestSeed=seed;},resizeDisplay:(width,height)=>resizeDisplay({...display,bounds:{...display.bounds,width,height},workArea:{...display.workArea,width,height}})});return;}
  tray=new Tray(path.join(root,'app/resources/tray-win.png'));tray.setToolTip('桌面弹珠');tray.setContextMenu(Menu.buildFromTemplate([{label:'回到弹珠',click:requestReveal},{label:'退出',click:()=>app.quit()}]));tray.on('click',requestReveal);
  win.setIgnoreMouseEvents(true,{forward:true});startNative();
  poll=setInterval(()=>{if(win.isDestroyed())return;const p=screen.getCursorScreenPoint(),x=p.x-display.bounds.x,y=p.y-display.bounds.y;const interactive=rects.some(r=>x>=r.x-4&&x<=r.x+r.width+4&&y>=r.y-4&&y<=r.y+r.height+4);if(interactive===ignoring){ignoring=!interactive;win.setIgnoreMouseEvents(ignoring,{forward:true});}},35);
  const startupDeadline=Date.now()+20000;
  timer=setInterval(()=>{if(!attached&&Date.now()>startupDeadline){dialog.showErrorBox('桌面弹珠未启动','读取桌面超时，请重新启动。');app.quit();}else if(attached&&snapshotAt&&Date.now()-snapshotAt>20000){console.error('Desktop lost');app.quit();}},5000);
  const adaptDisplay=()=>{clearTimeout(displayTimer);displayTimer=setTimeout(()=>resizeDisplay(screen.getPrimaryDisplay()),350);};
  screen.on('display-metrics-changed',adaptDisplay);screen.on('display-removed',adaptDisplay);screen.on('display-added',adaptDisplay);
 }).catch(e=>{console.error(e);app.exit(1);});
 app.on('before-quit',()=>{disposed=true;clearTimeout(displayTimer);clearInterval(poll);clearInterval(timer);clearInterval(wheelTimer);try{if(wallet)save(wallet);writeStatus();}catch(e){console.error(e);}tray?.destroy();helper?.stdin.end();helper?.kill();});
 app.on('window-all-closed',()=>app.quit());
}
