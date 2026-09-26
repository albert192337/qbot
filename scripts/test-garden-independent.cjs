// Isolated Electron renderer/preload and real garden window IPC; no user save or network.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(!process.versions.electron){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=require('node:child_process').spawn(require('../app/node_modules/electron'),[__filename],{env,stdio:'inherit',windowsHide:true});
 child.on('exit',code=>process.exitCode=code??1);setTimeout(()=>child.kill(),60000).unref();
}else{
 const {app,BrowserWindow,ipcMain,session}=require('electron'),root=path.resolve(__dirname,'..');
 app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'qbot-independent-')));
 const ts=require('typescript');require.extensions['.ts']=(m,f)=>{
  let source=fs.readFileSync(f,'utf8');
  if(f.endsWith('garden'+path.sep+'windows.ts'))source=source.replaceAll('__dirname',JSON.stringify(path.join(root,'app/out/main')));
  m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
 };
 const stub=(name,exports)=>{const filename=require.resolve('../app/src/main/'+name+'.ts');require.cache[filename]={id:filename,filename,loaded:true,exports};};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 app.whenReady().then(async()=>{try{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
  const {initialGarden,transition}=require('../app/src/main/garden/rules.ts');
  const {enableV3}=require('../app/src/main/garden/v3-rules.ts');
  let id=0;const rng={random:()=>.99,id:()=>`independent-${++id}`};let state=initialGarden(Date.now(),rng);enableV3(state,Date.now());
  state=transition(state,{type:'plant',plot:0,seed:state.seeds[0].id},Date.now(),rng).state;
  stub('garden/service',{getGarden:async()=>state,gardenAction:async cmd=>{try{const result=transition(state,cmd,Date.now(),rng);state=result.state;return {ok:true,...result};}catch(e){return {ok:false,error:String(e)};}}});
  stub('config',{getSettings:async()=>({})});stub('characters',{getCharacter:async()=>null});stub('garden/weather-clock',{startGardenWeatherClock:()=>{}});
  const {attachGarden,registerGardenIpc}=require('../app/src/main/garden/windows.ts');
  ipcMain.handle('characters:list',()=>[]);ipcMain.handle('settings:get',()=>({gardenRenderMode:'2d'}));ipcMain.handle('overlays:get',()=>({revision:0,winner:null}));
  const pet=new BrowserWindow({width:160,height:160,x:30,y:30,show:false,webPreferences:{offscreen:true}});
  attachGarden(pet);registerGardenIpc();pet.showInactive();ipcMain.emit('garden:toggle',{});
  const strip=BrowserWindow.getAllWindows().find(w=>w!==pet),js=code=>strip.webContents.executeJavaScript(code);
  const until=async fn=>{for(let i=0;i<80;i++){if(await fn())return;await wait(100);}throw Error('Timed out');};
  await until(()=>!strip.webContents.isLoading());await until(()=>js('!!document.querySelector(".strip-collapse")'));
  const rect=selector=>js(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
  const click=async selector=>{const r=await rect(selector),p={x:Math.round(r.x+r.w/2),y:Math.round(r.y+r.h/2)};for(const type of ['mouseMove','mouseDown','mouseUp'])strip.webContents.sendInputEvent({type,...p,button:'left',clickCount:1});await wait(200);};
  const before=await rect('.soil-side');pet.setPosition(800,80);await wait(100);assert.deepEqual(await rect('.soil-side'),before);
  const sow=await rect('.strip-sow'),close=await rect('.strip-collapse');assert.ok(close.x>=sow.x+sow.w);
  const handle=await rect('.strip-drag'),p={x:Math.round(handle.x+handle.w/2),y:Math.round(handle.y+handle.h/2)};
  const send=(type,x,y)=>strip.webContents.sendInputEvent({type,x,y,globalX:x+strip.getBounds().x,globalY:y+strip.getBounds().y,button:'left',clickCount:1});
  send('mouseMove',p.x,p.y);await wait(100);send('mouseDown',p.x,p.y);await wait(50);
  send('mouseMove',p.x-100,p.y-120);await wait(50);send('mouseUp',p.x-100,p.y-120);await wait(150);
  const moved=await rect('.soil-side');assert.ok(Math.abs(moved.x-before.x+100)<2);assert.ok(Math.abs(moved.y-before.y+120)<2);
  await click('.strip-collapse');assert.equal(strip.isVisible(),false);assert.equal(pet.isVisible(),true);
  ipcMain.emit('garden:toggle',{});await wait(150);assert.deepEqual(await rect('.soil-side'),moved);
  await click('[data-plot="0"] .soil');await until(()=>js('!!document.querySelector(".test-button")'));
  await click('.test-button');assert.ok(state.plots[0].readyAt<=Date.now());assert.equal(state.plots[0].batch.settled,true);
  assert.equal(await js('!!document.querySelector(".test-button")'),false);
  // A real online snapshot must not expose a rejected local test command.
  state=transition(state,{type:'plant',plot:1,seed:state.seeds[0].id},Date.now(),rng).state;state.online=true;
  strip.webContents.send('garden:changed');await wait(200);await click('[data-plot="1"] .soil');
  assert.equal(await js('!!document.querySelector(".test-button")'),false);
  assert.ok(await js('document.querySelector(".quick-menu").textContent.includes("仅限本地")'));
  await js('document.querySelector(".quick-close").click()').catch(()=>{});
  const out=path.join(root,'output/garden-independent');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'farm.png'),(await strip.webContents.capturePage()).toPNG());
  console.log('PASS: independent positioning, native drag, collapse/reopen, mature and online gating');app.exit(0);
 }catch(e){console.error(e);app.exit(1)}});
}
