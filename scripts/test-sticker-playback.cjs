// Real alpha videos and Electron events, no API calls or real user-data writes.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {enrichStickerBehavior}=require('../app/src/shared/sticker-behavior.ts');
const latest=JSON.parse(fs.readFileSync(path.join(root,'.superpowers/sticker-demo/latest.json')));
const source=path.join(root,'.superpowers/sticker-demo',latest.dirId);
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'qbot-playback-')));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true,bypassCSP:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
 const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json')));enrichStickerBehavior(manifest);
 protocol.handle('qbot-asset',async req=>{const f=path.resolve(source,decodeURIComponent(new URL(req.url).pathname).slice(1));if(!f.startsWith(source+path.sep))return new Response(null,{status:403});return new Response(fs.readFileSync(f),{headers:{'Content-Type':f.endsWith('.webm')?'video/webm':'image/png'}});});
 for(const [key,fn]of Object.entries({'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet',freeMode:true}),'characters:getActive':()=>({dirId:'test',manifest}),'garden:get':()=>({plots:[]}), 'progress:get':()=>({points:0,boxes:0,inventory:{},lastTickAt:Date.now()}),'agent:getStatus':()=>({activity:'idle',sessions:0}),'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false})}))ipcMain.handle(key,fn);
 const win=new BrowserWindow({width:360,height:360,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'app/out/preload/index.js')}});
 win.webContents.on('console-message',(_e,_l,message)=>console.log(message));
 ipcMain.handle('sign:getMessage',()=>null);ipcMain.handle('behavior:getIdlePlan',()=>null);
 await win.loadFile(path.join(root,'app/out/renderer/pet/index.html'));
 await win.webContents.executeJavaScript(`{const warn=console.warn;console.warn=(...a)=>warn(...a.map(v=>typeof v==='object'?JSON.stringify(v):v));} void 0`);
 const read=()=>win.webContents.executeJavaScript(`(()=>{const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible');return {src:v?.src,time:v?.currentTime}})()`);
 for(let i=0;i<100&&!(await read()).src;i++)await wait(100);
 const action=manifest.agentActions.error;const clip=manifest.customActions[action].webm;
 win.webContents.send('behavior:action',{action,loops:1,preview:true});
 for(let i=0;i<50&&!(await read()).src?.includes(clip);i++)await wait(100);
 assert.ok((await read()).src.includes(clip));
 const started=Date.now();let wraps=0;let last=0;
 while(Date.now()-started<5500){win.webContents.send('agent:status',{activity:'working',sessions:1});await wait(200);const v=await read();assert.ok(v.src.includes(clip),'working state must not steal the chat expression');if(v.time<last)wraps++;last=v.time;}
 for(let i=0;i<100&&(await read()).src.includes(clip);i++)await wait(150);
 assert.ok((await read()).src.includes(manifest.customActions[manifest.agentActions.working].webm),'restore latest work state after expression');
 win.webContents.send('agent:status',{activity:'idle',sessions:0});await wait(600);
 const initial=(await read()).src;
 for(let i=0;i<70;i++){await wait(200);assert.equal((await read()).src,initial,'AI mode keeps idle until a new decision');}
 const target=manifest.stickerLibrary.idleCandidates.find(id=>!initial.includes(manifest.customActions[id].webm));
 assert.ok(target);
 const plan={characterId:'test',action:target,chosenAt:Date.now(),until:Date.now()+300000};
 win.webContents.send('behavior:idlePlan',{...plan,characterId:'another-pet'});await wait(500);
 assert.equal((await read()).src,initial,'ignore other character plans');
 win.webContents.send('behavior:idlePlan',plan);
 for(let i=0;i<100&&(await read()).src===initial;i++)await wait(200);
 assert.ok((await read()).src.includes(manifest.customActions[target].webm),'adopt model choice on next complete idle loop '+JSON.stringify({initial,target,current:await read()}));
 console.log('PASS real playback: protected chat, working restored, stable AI idle, model plan adopted, character isolation', {wraps});
 app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
