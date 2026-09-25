const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const p=require('node:child_process').spawn(require('../app/node_modules/electron'),[__filename],{env,stdio:'inherit',windowsHide:true});p.on('exit',c=>process.exitCode=c??1);setTimeout(()=>p.kill(),45000).unref();}
else {
const {app,BrowserWindow,ipcMain,session}=require('electron'),root=path.resolve(__dirname,'..');app.setPath('userData',fs.mkdtempSync(path.join(require('os').tmpdir(),'qbot-cultivation-hint-')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
const core=require('../rooms/generated/garden-core.cjs');let id=0;const now=Date.now(),rng={random:()=>.5,id:()=>String(++id)},state=core.initialGarden(now,rng);core.enableV3(state,now);core.ensureLife(state,now,rng,'pet');
const plant=core.makeV3Plant(state,{id:'seed',species:'strawberry',genes:['starcore','rainbow','halo'],bred:false},2,now,rng);plant.readyAt=now-1;plant.batch.settled=true;state.plots[2]=plant;
state.cultivationVisit={owner:'test:friend',plot:2};const task={id:'task',plant:plant.id,owner:'test:friend',plot:2,remaining:50000,workBudget:64800,updatedAt:now,members:{me:{work:0,seconds:0,seenAt:now}},done:false,claimed:[]};state.cooperations=[task];
let paused=false;ipcMain.handle('garden:get',()=>state);ipcMain.handle('settings:get',()=>({gardenRenderMode:'2d'}));ipcMain.handle('overlays:get',()=>({revision:0,winner:null}));ipcMain.on('garden:ignore',()=>{});ipcMain.handle('garden:cooperate',(_e,owner,plot,action)=>{assert.equal(action,'leave');paused=true;delete state.cultivationVisit;return {};});
const win=new BrowserWindow({width:900,height:700,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'app/out/preload/index.js')}}),js=c=>win.webContents.executeJavaScript(c);
win.webContents.on('console-message',(_e,level,message)=>{if(level>=2)console.log('renderer',message);});
await win.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'strip'}});await js("Object.defineProperty(document,'hidden',{get:()=>false});void 0");
for(let i=0;i<60&&!await js('!!document.querySelector(".cultivation-hint")');i++)await wait(100);
const anchor=performer=>win.webContents.send('garden:anchor',{left:650,right:850,top:100,bottom:275,side:'left',performer});anchor({left:400,right:600,top:150,bottom:350});await wait(200);
const rect=()=>js('(()=>{const r=document.querySelector(".cultivation-hint").getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()');let r=await rect();if(r.y!==358)console.log('DIAG',r,await js('({body:document.body.className,style:document.querySelector(".cultivation-hint").getAttribute("style"),html:document.querySelector(".cultivation-hint").outerHTML})'));assert.equal(r.y,358);assert.ok(Math.abs(r.x+r.w/2-500)<2);assert.equal(await js('document.querySelector(".cultivation-pause").textContent'),'暂停');
const before=await js('document.querySelector(".cultivation-hint-progress").value');await wait(1300);assert.ok(await js('document.querySelector(".cultivation-hint-progress").value')>before);
anchor({left:400,right:600,top:450,bottom:690});await wait(150);r=await rect();assert.ok(r.x>=608||r.x+r.w<=392||r.y+r.h<=442);assert.ok(r.y+r.h<=692);
const out=path.join(root,'.superpowers/cultivation-hint');fs.mkdirSync(out,{recursive:true});anchor({left:400,right:600,top:150,bottom:350});await wait(200);fs.writeFileSync(path.join(out,'below-progress.png'),(await win.webContents.capturePage()).toPNG());
await js('document.querySelector(".cultivation-pause").click()');await wait(200);assert.ok(paused);assert.equal(await js('!!document.querySelector(".cultivation-hint")'),false);
console.log('PASS: performer-relative below placement, edge avoidance, live timed progress, compact pause and leave action');app.exit(0);
}catch(e){console.error(e);app.exit(1)}});
}
