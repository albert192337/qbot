// Local application maintenance only: normal save/relaunch and display preference.
// Never harvest, sow, spend inventory, or print configuration secrets.
import fs from 'node:fs/promises';
import path from 'node:path';
const pid=Number(process.argv[2]),restart=process.argv.includes('--restart');
if(!Number.isInteger(pid)||pid<1)throw Error('Formal QBot PID required');
let prior=false;try{prior=(await fetch('http://127.0.0.1:9229/json/list')).ok;}catch{}
process._debugProcess(pid);let targets;
for(let i=0;i<30;i++){try{targets=await(await fetch('http://127.0.0.1:9229/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
if(!targets?.length)throw Error('Inspector unavailable');
const ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let serial=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
const evaluate=expression=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Live verification timed out'));},45000);pending.set(id,m=>{clearTimeout(timer);if(m.result?.exceptionDetails)reject(Error(m.result.exceptionDetails.exception?.description||m.result.exceptionDetails.text));else resolve(m.result?.result?.value);});ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
const prefix=`const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/app/package.json')('electron');`;
try{
 const identity=await evaluate(`(()=>{${prefix}return {pid:process.pid,data:e.app.getPath('userData'),app:e.app.getAppPath()}})()`);
 if(identity.pid!==pid||path.resolve(identity.data).toLowerCase()!==path.resolve(process.env.APPDATA,'@qbot/app').toLowerCase()||path.resolve(identity.app).toLowerCase()!==path.resolve('app').toLowerCase())throw Error('Not the identified formal QBot');
 if(process.argv.includes('--inspect')){console.log(JSON.stringify(await evaluate(`(async()=>{${prefix}return await Promise.all(e.BrowserWindow.getAllWindows().map(async w=>({id:w.id,visible:w.isVisible(),title:w.getTitle(),url:w.webContents.getURL(),bounds:w.getBounds(),hybrid:w.webContents.getURL().includes('/garden-hybrid/index.html')?await w.webContents.executeJavaScript("({data:document.querySelector('#garden')?.dataset,canvas:document.querySelectorAll('canvas').length,state:document.readyState})"):undefined,garden:w.webContents.getURL().includes('/garden/index.html')?await w.webContents.executeJavaScript("({mode:document.body.className,notice:document.querySelector('.notice')?.textContent,body:document.body.innerText.slice(-220)})"):undefined})))})()`)));}
 else if(restart){console.log(await evaluate(`(()=>{${prefix}e.app.relaunch();setTimeout(()=>e.app.quit(),200);return {normalSaveAndRelaunch:true,pid:process.pid}})()`));}
 else{
  const report=await evaluate(`(async()=>{${prefix}
   const pet=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/pet/index.html'));if(!pet)throw Error('Pet window unavailable');
   const controller=e.BrowserWindow.getAllWindows().find(w=>w.isVisible()&&(w.webContents.getURL().includes('/garden/index.html')||w.webContents.getURL().includes('/tea3d/index.html')))||pet;
   const js=code=>controller.webContents.executeJavaScript(code);
   const snapshot=await js("(async()=>{const s=await window.qbot.garden.get();return JSON.stringify({plots:s.plots,seeds:s.seeds,produce:s.produce,coins:s.coins})})()");
   await js("window.qbot.settings.set({gardenRenderMode:'hybrid'})");
   let strip=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/garden/index.html?view=strip'));
   if(${process.argv.includes('--refresh')}){const previous=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/garden-hybrid/index.html'));if(previous)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Garden reload timed out')),12000);previous.webContents.once('did-finish-load',()=>{clearTimeout(timeout);resolve();});previous.webContents.reload();});}
   if(!strip||!strip.isVisible())await js("window.qbot.garden.toggle()");
   const wait=ms=>new Promise(r=>setTimeout(r,ms));let canvas;
   for(let i=0;i<250;i++){canvas=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/garden-hybrid/index.html'));if(canvas&&await canvas.webContents.executeJavaScript("document.querySelector('#garden')?.dataset.ready==='true'"))break;await wait(100);}
   if(!canvas||canvas.isDestroyed())throw Error('Desktop garden failed to open');
   const rendered=await canvas.webContents.executeJavaScript("({ready:document.querySelector('#garden').dataset.ready,plants:Number(document.querySelector('#garden').dataset.plants),frames:Number(document.querySelector('#garden').dataset.frames)})");
   if(rendered.ready!=='true')throw Error('Desktop garden did not become ready');
   strip=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/garden/index.html?view=strip'));
   const controls=await strip.webContents.executeJavaScript("({hybrid:document.querySelector('.strip-hybrid')?.getAttribute('aria-pressed'),old:!!document.querySelector('.strip-mode'),oldPlots:document.querySelectorAll('.soil-side,.farm-scene').length})");
   const after=await js("(async()=>{const s=await window.qbot.garden.get();return JSON.stringify({plots:s.plots,seeds:s.seeds,produce:s.produce,coins:s.coins})})()");
   const output=${JSON.stringify(path.resolve('output/garden-hybrid/live.png'))};
   return{pid:process.pid,mode:'hybrid',rendered,controls,rendererHidden:!canvas.isVisible(),alwaysOnTop:canvas.isAlwaysOnTop(),assetsUnchanged:snapshot===after};
  })()`);
  await fs.writeFile('output/garden-hybrid/live-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }
}finally{if(!prior&&!restart)await evaluate(`(()=>{setTimeout(()=>process.getBuiltinModule('inspector').close(),150);return true})()`).catch(()=>{});ws.close();}
