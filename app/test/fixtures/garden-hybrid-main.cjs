const {app,BrowserWindow,ipcMain,session,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {initialGarden,transition}=require('../../src/main/garden/rules.ts');
const {openHybridGarden,closeHybridGarden,isHybridGarden,hybridDesktopStatus,probeHybridDesktop}=require('../../src/main/garden/desktop-layer.ts');
const {notifyGardenRenderMode}=require('../../src/main/garden/render-settings.ts');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'output/garden-hybrid');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-hybrid-test-')));app.commandLine.appendSwitch('force-device-scale-factor','1');
const wait=ms=>new Promise(r=>setTimeout(r,ms));const errors=[],checks=[];let win;
const native=()=>BrowserWindow.getAllWindows().find(w=>isHybridGarden(w.webContents.id));
async function until(test,label){for(let i=0;i<200;i++){if(await test())return;await wait(100);}throw Error('Timed out: '+label+' '+errors.join(';'));}
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 let serial=0;const rng={random:()=>.99,id:()=>`hybrid-${serial++}`},now=Date.now();
 const crop=(species='strawberry',extra={})=>({id:rng.id(),species,traits:[],bred:false,kg:1,value:100,plantedAt:now-100000,readyAt:now-1,fertilizers:[],revealed:true,harvestsLeft:1,...extra});
 let state=initialGarden(now,rng),settings={gardenRenderMode:'hybrid'},actions=[],opened=[];
 state.plots=[crop(),null,crop('lotus',{traits:['rainbow'],growthVersion:3,revealed:false,publicQuality:'rainbow'}),crop('sunflower',{plantedAt:now-1000,readyAt:now+100000}),crop('tomato',{plantedAt:now-70000,readyAt:now+30000}),crop('pineapple',{traits:['purple','twin','shiny']}),crop('apple',{keep:true,traits:['golden','giant']})];
 const changed=()=>BrowserWindow.getAllWindows().forEach(w=>w.webContents.send('garden:changed'));
 const area={x:0,y:0,width:1280,height:850};
 ipcMain.handle('overlays:get',()=>({winner:null}));ipcMain.handle('characters:list',()=>[]);ipcMain.handle('settings:get',()=>settings);
 ipcMain.handle('settings:set',async(_e,p)=>{settings={...settings,...p};notifyGardenRenderMode(settings.gardenRenderMode);if(settings.gardenRenderMode==='hybrid')void openHybridGarden(area,e=>errors.push(e));else closeHybridGarden();});
 ipcMain.handle('garden:get',()=>state);ipcMain.handle('garden:act',(_e,command)=>{actions.push(command);try{const result=transition(state,command,Date.now(),rng);state=result.state;changed();return{ok:true,...result};}catch(e){return{ok:false,error:e.message};}});
 ipcMain.on('garden:open',(_e,p)=>opened.push(p));ipcMain.on('garden:scenePlacement',()=>{});ipcMain.on('garden:ignore',()=>{});ipcMain.on('garden:desktopFailed',(_e,e)=>errors.push(e));
 const prefs={preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,backgroundThrottling:false};
 win=new BrowserWindow({x:0,y:0,width:1280,height:850,show:false,transparent:true,frame:false,webPreferences:prefs});
 const js=s=>win.webContents.executeJavaScript(s),nj=s=>native().webContents.executeJavaScript(s);
 await win.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'strip'}});
 win.setIgnoreMouseEvents(true,{forward:true});await openHybridGarden(area,e=>errors.push(e));await until(()=>native()?.webContents.executeJavaScript(`document.querySelector('#garden').dataset.ready==='true'&&!!document.querySelector('#garden').dataset.hits`),'native renderer');
 await until(()=>Promise.resolve(hybridDesktopStatus()?.frames>1),'native frames delivered');
 const physical=screen.dipToScreenPoint({x:1260,y:830});const pointKind=await probeHybridDesktop(physical.x,physical.y);assert.notEqual(pointKind,'unknown');win.showInactive();await wait(100);assert.equal(await probeHybridDesktop(physical.x,physical.y),pointKind,'transparent toolbar must preserve underlying target');win.setIgnoreMouseEvents(false);assert.equal(await probeHybridDesktop(physical.x,physical.y),'application');win.setIgnoreMouseEvents(true,{forward:true});checks.push('native mouse hit test passes transparent strip and rejects foreground application');
 assert.equal(native().isVisible(),false);assert.equal(native().isAlwaysOnTop(),false);assert.equal(await js(`document.querySelectorAll('.soil-side,.farm-scene').length`),0);
 const hits=()=>nj(`JSON.parse(document.querySelector('#garden').dataset.hits)`);
 async function pointer(index,twice=false){const h=(await hits()).find(h=>h.index===index);assert.ok(h);native().webContents.send('garden:desktopPointer',{x:h.x+h.width/2,y:h.y+h.height/2,double:twice});await wait(250);}
 async function shot(name){await wait(300);await native().webContents.capturePage();await wait(200);fs.writeFileSync(path.join(out,name+'.png'),(await native().webContents.capturePage()).toPNG());}
 await shot('formal-stages');const stages=await nj(`JSON.parse(document.querySelector('#garden').dataset.stages)`);assert.equal(stages.find(p=>p.index===2).species,undefined);assert.equal(stages.find(p=>p.index===2).stage,'hidden');checks.push('production stages and unrevealed appearance privacy');
 await pointer(0);assert.equal(await nj(`document.querySelector('#garden').dataset.lastShake`),'0');assert.equal(actions.length,0);
 await pointer(0,true);await until(()=>Promise.resolve(state.produce.length===1),'real harvest');await pointer(0,true);assert.equal(actions.filter(a=>a.type==='harvest').length,1);checks.push('native coordinates: shake; real harvest; repeated harvest blocked');
 for(const index of [2,3,6])await pointer(index,true);assert.equal(actions.length,1);assert.ok(opened.includes('plot:2')&&opened.includes('plot:3')&&opened.includes('plot:6'));
 await pointer(1);assert.equal(opened.at(-1),'plot:1');checks.push('empty sow entry; growing, mystery and kept crops open details');
 const seed=state.seeds.find(s=>s.species==='lotus');const planted=transition(state,{type:'plant',plot:1,seed:seed.id},Date.now(),rng);state=planted.state;changed();await until(()=>nj(`JSON.parse(document.querySelector('#garden').dataset.stages).find(p=>p.index===1).stage==='sprout'`),'sowing sync');checks.push('all-species sowing through existing rules updates desktop');
 const before=structuredClone(state);await js(`document.querySelector('.strip-mode').click()`);await until(()=>Promise.resolve(!native()),'legacy cleanup');assert.equal(await js(`document.body.classList.contains('garden-hybrid')`),false);
 await js(`document.querySelector('.strip-mode').click()`);await until(()=>js(`!!document.querySelector('.farm-scene')`),'legacy 3D');
 await js(`document.querySelector('.strip-hybrid').click()`);await until(()=>native()?.webContents.executeJavaScript(`document.querySelector('#garden')?.dataset.ready==='true'`),'hybrid restore');assert.deepEqual(state,before);checks.push('hybrid -> old 2D -> old 3D -> hybrid preserves all state');
 const n=native();n.webContents.debugger.attach('1.3');await n.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait(700);const stopped=await nj(`Number(document.querySelector('#garden').dataset.frames)`);await wait(800);assert.ok((await nj(`Number(document.querySelector('#garden').dataset.frames)`))-stopped<=1);n.webContents.debugger.detach();checks.push('reduced motion settles without a continuous rendering loop');
 closeHybridGarden();assert.ok(!native());const pending=openHybridGarden(area,e=>errors.push(e));closeHybridGarden();await pending;assert.ok(!native());checks.push('close and canceled startup leave no hidden renderer');
 await openHybridGarden({x:0,y:0,width:680,height:640},e=>errors.push(e));await until(()=>native()?.webContents.executeJavaScript(`document.querySelector('#garden').dataset.ready==='true'&&!!document.querySelector('#garden').dataset.hits`),'small scene');assert.ok((await hits()).every(h=>h.x>=0&&h.x+h.width<=680&&h.y>=0));await shot('small');checks.push('680px display fits every real plot');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({ok:true,checks,actions,errors,scope:'Production renderer, preload, native layer and local rules; isolated state; pointer injected at bridge; no real account crops harvested'},null,2));closeHybridGarden();app.quit();
 }catch(e){console.error(e);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({ok:false,error:String(e.stack),errors,checks},null,2));if(native())fs.writeFileSync(path.join(out,'failure.png'),(await native().webContents.capturePage()).toPNG());closeHybridGarden();app.exit(1);}});
