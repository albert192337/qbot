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
try{const report=await evaluate(`(async()=>{${prefix}const w=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=strip'));const info=await w.webContents.executeJavaScript("({scene:document.querySelector('.farm-scene')?.dataset,scripts:[...document.scripts].map(s=>s.src)})");process.getBuiltinModule('fs').writeFileSync('C:/Users/beta/Documents/Codex/2026-08-25/github-albert192337-qbot/output/garden-scene/live-refinement.png',(await w.webContents.capturePage()).toPNG());return info;})()`);console.log(JSON.stringify(report));await fs.writeFile('output/garden-scene/live-refinement.json',JSON.stringify(report,null,2));}finally{if(!priorInspector)await evaluate(`(()=>{setTimeout(()=>process.getBuiltinModule('inspector').close(),150);return true})()`);ws.close();}
