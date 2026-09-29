// Refresh only the identified formal garden page; exercise display settings only.
import fs from 'node:fs/promises';
import path from 'node:path';
const pid=Number(process.argv[2]);if(!Number.isInteger(pid)||pid<1)throw Error('Formal PID required');
let priorInspector=false;
try{priorInspector=(await fetch('http://127.0.0.1:9229/json/list')).ok;}catch{}
process._debugProcess(pid);
let targets;
for(let i=0;i<30;i++){try{targets=await(await fetch('http://127.0.0.1:9229/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
if(!targets?.length)throw Error('Inspector unavailable');
const ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
let seq=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
const evaluate=expression=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,m=>m.result?.exceptionDetails?reject(Error(m.result.exceptionDetails.exception?.description||m.result.exceptionDetails.text)):resolve(m.result?.result?.value));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
const prefix=`const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/app/package.json')('electron');`;
try{
 const identity=await evaluate(`(()=>{${prefix}return {pid:process.pid,data:e.app.getPath('userData')}})()`);
 if(identity.pid!==pid||identity.data.replaceAll('\\','/').toLowerCase()!==path.join(process.env.APPDATA,'@qbot/app').replaceAll('\\','/').toLowerCase())throw Error('Not formal QBot');
 const report=await evaluate(`(async()=>{
  ${prefix}
  const windows=e.BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('/garden/index.html'));
  const strip=windows.find(w=>w.webContents.getURL().includes('view=strip'));
  if(!strip)throw Error('Open desktop garden not found');
  if(${process.argv.includes('--show')})strip.showInactive();
  const before=await strip.webContents.executeJavaScript("(async()=>({visible3d:!!document.querySelector('.farm-scene'),mode:(await window.qbot.settings.get()).gardenRenderMode,plots:JSON.stringify((await window.qbot.garden.get()).plots)}))()");
  for(const win of windows){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Garden reload timed out')),12000);win.webContents.once('did-finish-load',()=>{clearTimeout(timer);resolve();});win.webContents.reload();});}
  const js=code=>strip.webContents.executeJavaScript(code);
  if(!strip.isVisible()){
   const after=await js("(async()=>({mode:(await window.qbot.settings.get()).gardenRenderMode,plots:JSON.stringify((await window.qbot.garden.get()).plots)}))()");
   return {pid:process.pid,refreshed:true,hidden:true,mode:after.mode,plotsUnchanged:before.plots===after.plots,nativeClicks:false,restarted:false};
  }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const until=async(test)=>{for(let i=0;i<100;i++){if(await test())return;await wait(100);}throw Error('Display switch timed out');};
  await until(()=>js("!!document.querySelector('.strip-mode')"));
  const click=async()=>{const p=await js("(()=>{const r=document.querySelector('.strip-mode').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");strip.webContents.sendInputEvent({type:'mouseMove',...p});strip.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...p});strip.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...p});};
  // The user requested 3D. Verify both directions and leave that mode active.
  if(await js("document.body.classList.contains('garden-3d')")){await click();await until(()=>js("!document.body.classList.contains('garden-3d')&&!document.querySelector('.farm-scene')"));}
  await click();await until(()=>js("document.querySelector('.farm-scene')?.dataset.sceneReady==='true'"));
  await click();await until(()=>js("!document.body.classList.contains('garden-3d')&&!document.querySelector('.farm-scene')"));
  await click();await until(()=>js("document.querySelector('.farm-scene')?.dataset.sceneReady==='true'"));
  await wait(1200);
  const after=await js("(async()=>({visible3d:!!document.querySelector('.farm-scene'),ready:document.querySelector('.farm-scene')?.dataset.sceneReady,mode:(await window.qbot.settings.get()).gardenRenderMode,plots:JSON.stringify((await window.qbot.garden.get()).plots),plotCount:document.querySelectorAll('.farm-plot').length}))()");
  const bounds=await js("(()=>{const r=document.querySelector('.farm-scene').getBoundingClientRect();return {x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)}})()");
  const output=${JSON.stringify(path.resolve('output/garden-scene/live-switch.png'))};
  process.getBuiltinModule('fs').writeFileSync(output,(await strip.webContents.capturePage(bounds)).toPNG());
  return {pid:process.pid,before:{visible3d:before.visible3d,mode:before.mode},after:{visible3d:after.visible3d,mode:after.mode,ready:after.ready,plotCount:after.plotCount},plotsUnchanged:before.plots===after.plots,nativeClicks:true,restarted:false,screenshot:output};
 })()`);
 await fs.writeFile('output/garden-scene/live-switch.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){
 console.log(await evaluate(`(async()=>{${prefix}return await Promise.all(e.BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('/garden/index.html')).map(async w=>({visible:w.isVisible(),bounds:w.getBounds(),page:await w.webContents.executeJavaScript("({hidden:document.hidden,classes:document.body.className,scene:document.querySelector('.farm-scene')?.dataset,button:document.querySelector('.strip-mode')?.outerHTML})")})))})()`));
 throw error;
}finally{
 if(!priorInspector)await evaluate(`(()=>{setTimeout(()=>process.getBuiltinModule('inspector').close(),150);return true})()`).catch(()=>{});
 ws.close();
}
