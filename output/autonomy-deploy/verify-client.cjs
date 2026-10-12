const fs=require('node:fs/promises');
const expectedPid=Number(process.argv[2]);
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
  const details=await evaluate(`(async()=>{
   const {app,BrowserWindow,ipcMain}=process.getBuiltinModule('module').createRequire('F:/dev/qbot/app/package.json')('electron');
   const pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/pet/index.html'));
   if(!pet)throw Error('Desktop pet window unavailable');
   const renderer=await pet.webContents.executeJavaScript("(async()=>({autonomyApi:typeof window.qbot.autonomy?.log==='function',logEntries:(await window.qbot.autonomy.log()).length}))()");
   return {pid:process.pid,petVisible:pet.isVisible(),logHandler:ipcMain._invokeHandlers.has('autonomy:log'),approvalHandler:ipcMain._invokeHandlers.has('autonomy:answer'),renderer};
  })()`);
  if(!details.logHandler||!details.approvalHandler||!details.renderer.autonomyApi)throw Error('New behavior capability not loaded');
  await fs.writeFile('output/autonomy-deploy/client-verification.json',JSON.stringify({at:new Date().toISOString(),ok:true,...details},null,2));
  console.log(JSON.stringify(details));
 }finally{
  await evaluate("setTimeout(()=>process.getBuiltinModule('inspector').close(),150);true").catch(()=>{});
  ws.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
