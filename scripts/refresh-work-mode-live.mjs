// Explicit live verification, called with the already identified formal QBot PID.
// Uses the process-local inspector temporarily; records only animation state and
// elapsed input inactivity, never keys or text. Leaves the formal app running.
import fs from 'node:fs/promises';
import path from 'node:path';
const pid=Number(process.argv[2]);if(!Number.isInteger(pid)||pid<=0)throw Error('Expected formal QBot PID');
process._debugProcess(pid);
let targets;
for(let n=0;n<30;n++){try{targets=await(await fetch('http://127.0.0.1:9229/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
if(!targets)throw Error('No local inspector');
const ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
const evaluate=expression=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,m=>m.result?.exceptionDetails?reject(Error(m.result.exceptionDetails.text+': '+m.result.exceptionDetails.exception?.description)):resolve(m.result?.result?.value));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
try {
 const identity=await evaluate(`({pid:process.pid,data:process.getBuiltinModule('module').createRequire(process.cwd()+'/app/package.json')('electron').app.getPath('userData')})`);
 if(identity.pid!==pid||identity.data.replaceAll('\\','/').toLowerCase()!==path.join(process.env.APPDATA,'@qbot/app').replaceAll('\\','/').toLowerCase())throw Error('Not formal app');
 const prefix=`const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/app/package.json')('electron');`;
 if(process.argv[3]==='diagnose'){
 const samples=await evaluate(`(async()=>{${prefix}const p=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/pet/index.html'));return p.webContents.executeJavaScript("(async()=>{const samples=[];for(let n=0;n<30;n++){const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible');samples.push({idle:await window.qbot.bubble.getWorkIdleMs(),mode:document.querySelector('#stage').dataset.workMode,paused:v?.paused,time:v?.currentTime,src:v?.src,breathing:v?.classList.contains('work-breathing')});await new Promise(r=>setTimeout(r,100));}return samples})()");})()`);
 console.log(samples);await fs.writeFile('output/work-mode/live-diagnosis.json',JSON.stringify(samples,null,2));
 } else if(process.argv[3]==='restart'){

  console.log(await evaluate(`(()=>{${prefix}e.app.relaunch();setTimeout(()=>e.app.quit(),200);return 'Normal save and relaunch requested';})()`));
 } else {
  const result=await evaluate(`(async()=>{${prefix}const p=e.BrowserWindow.getAllWindows().find(w=>/\\/pet\\/index.html$/.test(w.webContents.getURL()));const active=await p.webContents.executeJavaScript("window.qbot.characters.getActive()");if(active?.manifest?.name!=='张起灵')throw Error('Active character changed');if(!await p.webContents.executeJavaScript("!!document.querySelector('#stage').dataset.workMode"))p.webContents.send('pet:menuCommand',{type:'workMode'});await new Promise(r=>setTimeout(r,700));return p.webContents.executeJavaScript("(async()=>{const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible');return {idleMs:await window.qbot.bubble.getWorkIdleMs(),mode:document.querySelector('#stage').dataset.workMode,paused:v.paused,source:v.src,breathing:v.classList.contains('work-breathing')}})()");})()`);
  console.log(result);await fs.writeFile('output/work-mode/formal-fast-state.json',JSON.stringify(result,null,2));
 }
}finally{ws.close();}
