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
try{
 const identity=await evaluate(`({pid:process.pid,data:process.getBuiltinModule('module').createRequire(process.cwd()+'/app/package.json')('electron').app.getPath('userData')})`);
 if(identity.pid!==pid||identity.data.replaceAll('\\','/').toLowerCase()!==path.join(process.env.APPDATA,'@qbot/app').replaceAll('\\','/').toLowerCase())throw Error('Not the formal QBot');
 await evaluate(`globalThis.workLiveQA={electron:process.getBuiltinModule('module').createRequire(process.cwd()+'/app/package.json')('electron')};workLiveQA.pet=workLiveQA.electron.BrowserWindow.getAllWindows().find(w=>/\\/pet\\/index.html$/.test(w.webContents.getURL()));if(!workLiveQA.pet)throw Error('Missing pet');workLiveQA.pet.webContents.executeJavaScript("window.qbot.characters.activate('53ed5068-dd60-4e2a-82c7-fb94250369d1')")`);
 await new Promise(r=>setTimeout(r,1200));
 await evaluate(`(async()=>{if(await workLiveQA.pet.webContents.executeJavaScript("!!document.querySelector('#stage').dataset.workMode")){workLiveQA.pet.webContents.send('pet:menuCommand',{type:'workMode'});await new Promise(r=>setTimeout(r,300));}})()`);
 await evaluate(`(async()=>{const p=await workLiveQA.pet.webContents.executeJavaScript("(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),width:r.width}})()");if(!p.width)throw Error('Pet hidden');for(let i=0;i<2;i++){for(const type of ['mouseDown','mouseUp'])workLiveQA.pet.webContents.sendInputEvent({type,x:p.x,y:p.y,button:'left',clickCount:i+1});await new Promise(r=>setTimeout(r,60));}})()`);
 await new Promise(r=>setTimeout(r,500));
 const initial=await evaluate(`workLiveQA.pet.webContents.executeJavaScript("({mode:document.querySelector('#stage').dataset.workMode,src:[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible')?.src})")`);
 if(!initial.mode)throw Error('Double click did not enter work mode');
 console.log('Formal double-click entered: '+initial.mode);
 await evaluate(`(async()=>{workLiveQA.input=new workLiveQA.electron.BrowserWindow({width:340,height:180,title:'QBot 工作模式检查',alwaysOnTop:true,webPreferences:{nodeIntegration:false,contextIsolation:true}});await workLiveQA.input.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<title>QBot 工作模式检查</title><body style="font:18px sans-serif;padding:24px;background:#faf6eb">工作模式已开启<br><small>停下操作，桌宠就会休息。</small></body>'));workLiveQA.input.show();workLiveQA.input.focus();})()`);
 const samples=[];console.log('Ready for a real keyboard pulse in QBot 工作模式检查');
 for(let n=0;n<450;n++){
  samples.push(await evaluate(`(async()=>({idle:workLiveQA.electron.powerMonitor.getSystemIdleTime(),...await workLiveQA.pet.webContents.executeJavaScript("({mode:document.querySelector('#stage').dataset.workMode,src:[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible')?.src})")}))()`));
  await new Promise(r=>setTimeout(r,200));
  if(samples.some(s=>s.mode==='typing')&&samples.at(-1).mode==='idle'&&samples.at(-1).idle>=2)break;
 }
 const seen=samples.map(s=>s.mode);const typing=seen.indexOf('typing');
 const passed=typing>=0&&seen.slice(typing+1).includes('idle')&&samples.some(s=>s.idle>=2&&s.mode==='idle');
 await fs.writeFile('output/work-mode/formal-input-verification.json',JSON.stringify({pid,passed,initial,samples},null,2));
 await evaluate(`(async()=>{await process.getBuiltinModule('fs').promises.writeFile(process.cwd()+'/output/work-mode/formal.png',(await workLiveQA.pet.webContents.capturePage()).toPNG());workLiveQA.input.close();delete globalThis.workLiveQA;})()`);
 if(!passed)throw Error('Did not observe real input followed by idle; see recorded states');
 console.log('PASS: formal character, double click, real input -> typing -> idle.');
}finally{ws.close();}
