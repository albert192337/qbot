const fs=require('node:fs/promises');
const expectedPid=Number(process.argv[2]),restart=process.argv.includes('--restart'),layout=process.argv.includes('--layout');
if(!Number.isInteger(expectedPid)||expectedPid<=0)throw Error('Provide the observed QBot PID');
(async()=>{
 process._debugProcess(expectedPid);
 let targets;
 for(let n=0;n<30;n++){try{targets=await(await fetch('http://127.0.0.1:9229/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!targets?.[0])throw Error('Local inspector unavailable');
 const ws=new WebSocket(targets[0].webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 const pending=new Map();let seq=0;
 ws.onmessage=e=>{const f=JSON.parse(e.data);pending.get(f.id)?.(f);};
 const evaluate=expression=>new Promise((resolve,reject)=>{
  const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('Verification timed out'));},8000);
  pending.set(id,f=>{clearTimeout(timer);pending.delete(id);if(f.error||f.result?.exceptionDetails)reject(Error(f.result?.exceptionDetails?.exception?.description??'Runtime inspection failed'));else resolve(f.result.result.value);});
  ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));
 });
 try{
  const identity=await evaluate(`({pid:process.pid,appPath:process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron').app.getAppPath()})`);
  if(identity.pid!==expectedPid||identity.appPath.replaceAll('\\','/').toLowerCase()!=='f:/dev/qbot/app')throw Error('Unexpected application');
  if(restart){
   await evaluate(`(()=>{const {app}=process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron');app.relaunch();setTimeout(()=>{process.getBuiltinModule('inspector').close();app.quit();},300);return true})()`);
   console.log('Requested graceful QBot relaunch');
  }else if(process.argv.includes('--interaction')){
   const result=await evaluate(`(async()=>{const {BrowserWindow}=process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron');const pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/pet/index.html'));if(!pet)throw Error('Pet window unavailable');const debug=pet.webContents.debugger;if(debug.isAttached())throw Error('Renderer debugger already in use');const scripts=[];const receive=(_event,method,params)=>{if(method==='Debugger.scriptParsed'&&params.url.includes('/assets/local-main-'))scripts.push(params.scriptId)};debug.on('message',receive);debug.attach('1.3');try{await debug.sendCommand('Debugger.enable');let code='';for(const scriptId of scripts)code+=(await debug.sendCommand('Debugger.getScriptSource',{scriptId})).scriptSource;return {pid:process.pid,iconRenderer:code.includes('pet-icon-copy'),objectBridge:code.includes('iconPlay'),presenceBridge:await pet.webContents.executeJavaScript("typeof window.qbot.presence?.input==='function'"),rendererResources:scripts.length};}finally{debug.removeListener('message',receive);debug.detach();}})()`);
   if(!result.iconRenderer||!result.objectBridge||!result.presenceBridge)throw Error('Interaction behavior feature not loaded: '+JSON.stringify(result));
   await fs.writeFile('output/interaction-behaviors/live-verification.json',JSON.stringify({at:new Date().toISOString(),...result},null,2));console.log(JSON.stringify(result));
  }else if(process.argv.includes('--presence')){
   const result=await evaluate(`(async()=>{const {BrowserWindow,ipcMain}=process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron');const pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/pet/index.html'));if(!pet)throw Error('Pet window unavailable');return {pid:process.pid,inputHandler:ipcMain.listenerCount('pet:inputAttention')>0,reportHandler:ipcMain.listenerCount('pet:presenceReport')>0,renderer:await pet.webContents.executeJavaScript("({input:typeof window.qbot.presence?.input==='function',signal:typeof window.qbot.presence?.onSignal==='function',style:[...document.styleSheets].some(s=>[...s.cssRules].some(r=>r.cssText.includes('presence-listen')))})")}})()`);
   if(!result.inputHandler||!result.reportHandler||!result.renderer.input||!result.renderer.signal||!result.renderer.style)throw Error('Presence feature not loaded');
   await fs.writeFile('output/presence/live-verification.json',JSON.stringify({at:new Date().toISOString(),...result},null,2));console.log(JSON.stringify(result));
  }else if(process.argv.includes('--refresh-chat')){
   const result=await evaluate(`(async()=>{const {BrowserWindow}=process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron');const chat=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/chat/index.html'));if(!chat)return {pid:process.pid,chatOpen:false};const draft=await chat.webContents.executeJavaScript("document.querySelector('#message').value");await new Promise(resolve=>{chat.webContents.once('did-finish-load',resolve);chat.webContents.reloadIgnoringCache();});await chat.webContents.executeJavaScript("document.querySelector('#message').value="+JSON.stringify(draft));return {pid:process.pid,chatOpen:true,status:await chat.webContents.executeJavaScript("document.querySelector('#status').textContent")}})()`);
   if(result.status)throw Error('Unexpected status text after refresh');
   console.log(JSON.stringify(result));
  }else if(layout){
   const result=await evaluate(`(async()=>{const {BrowserWindow}=process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron');const pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/pet/index.html'));if(!pet)throw Error('Pet window unavailable');return {pid:process.pid,pairLayoutLoaded:await pet.webContents.executeJavaScript("[...document.styleSheets].some(s=>[...s.cssRules].some(r=>r.cssText.includes('--pair-headroom')))")}})()`);
   if(!result.pairLayoutLoaded)throw Error('Pair layout not loaded');
   await fs.writeFile('output/pair-layout/live-verification.json',JSON.stringify({at:new Date().toISOString(),...result},null,2));console.log(JSON.stringify(result));
  }else{
   const result=await evaluate(`(async()=>{const {BrowserWindow}=process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron');const pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/pet/index.html'));if(!pet)throw Error('Pet window unavailable');return {pid:process.pid,visible:pet.isVisible(),command:await pet.webContents.executeJavaScript("window.qbot.bubble.sendChat('指令帮助')")}})()`);
   if(!result.command.ok||!result.command.message?.includes('指令双人打闹'))throw Error('Command handler not loaded: '+JSON.stringify(result));
   await fs.writeFile('output/chat-command/live-verification.json',JSON.stringify({at:new Date().toISOString(),...result},null,2));
   console.log(JSON.stringify(result));
  }
 }finally{
  if(!restart)await evaluate("setTimeout(()=>process.getBuiltinModule('inspector').close(),150);true").catch(()=>{});
  ws.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
