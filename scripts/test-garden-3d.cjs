// Production garden UI + real rules, in-memory fixtures, no user saves or network.
const {app,BrowserWindow,ipcMain,session,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/garden-3d');fs.mkdirSync(out,{recursive:true});
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-garden3d-')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const {initialGarden,transition}=require('../app/src/main/garden/rules.ts');
 const {TRAITS}=require('../app/src/shared/garden.ts');
 let serial=0;const rng={random:()=>.99,id:()=>`test-${serial++}`};
 let state=initialGarden(Date.now(),rng),settings={gardenRenderMode:'3d'};const commands=[];
 const plant=(ratio,traits=[],species='strawberry')=>({id:rng.id(),species,traits,baseTraits:traits,bred:false,kg:.25,value:60,plantedAt:Date.now()-ratio*1800000,readyAt:Date.now()+(1-ratio)*1800000,fertilizers:[],harvestsLeft:species==='strawberry'?3:1,harvestIndex:0});
 state.plots=[plant(.1),plant(.4),plant(.65),plant(1.1),null,plant(1.1,[],'sunflower')];
 const original=structuredClone(state);
 const wins=[];const changed=()=>wins.forEach(w=>w.webContents.send('garden:changed'));
 ipcMain.handle('settings:get',()=>settings);ipcMain.handle('settings:set',(_e,p)=>{settings={...settings,...p};wins.forEach(w=>w.webContents.send('settings:changed',settings));});
 ipcMain.handle('garden:get',()=>state);ipcMain.on('garden:ignore',()=>{});
 ipcMain.handle('garden:act',(_e,c)=>{try{commands.push(c);const result=transition(state,c,Date.now(),rng);state=result.state;changed();return {ok:true,...result};}catch(e){fs.writeFileSync(path.join(out,'action-error.json'),JSON.stringify({command:c,error:String(e.stack)}));return {ok:false,error:String(e.message)}}});
 ipcMain.on('garden:open',(_e,p)=>{panel.webContents.send('garden:page',p);panel.show();});
 const prefs={preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,backgroundThrottling:false};
 const panel=new BrowserWindow({width:1000,height:800,show:false,title:'3D 草莓种植 · 隔离试种',webPreferences:prefs});
 const strip=new BrowserWindow({width:1100,height:330,show:false,transparent:true,frame:false,backgroundColor:'#00000000',webPreferences:prefs});wins.push(panel,strip);
 panel.on('closed',()=>{if(!strip.isDestroyed())strip.close();});
 const errors=[];wins.forEach(w=>w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)}));
 const load=async(w,view)=>{await w.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view}});};
 const js=s=>panel.webContents.executeJavaScript(s),sj=s=>strip.webContents.executeJavaScript(s);
 const until=async(test,label)=>{for(let i=0;i<80;i++){if(await test())return;await wait(150);}throw Error(label);};
 const shot=async(w,name)=>{await wait(1000);await w.webContents.capturePage();await wait(250);fs.writeFileSync(path.join(out,name+'.png'),(await w.webContents.capturePage()).toPNG());};
 await load(panel,'plot:3');await load(strip,'strip');
 panel.webContents.setZoomFactor(.85);
 strip.webContents.send('garden:anchor',{left:800,right:1060,top:10,bottom:235,side:'left'});
 await until(()=>sj(`document.querySelectorAll('.strawberry-canvas[data-ready=true]').length>=5`),'all plot models rendered');
 assert.deepEqual(await sj(`[...document.querySelectorAll('[data-plot]>.art-3d')].map(e=>e.dataset.stage)`),['sprout','flower','green','ripe','soil']);
 assert.equal(await sj(`document.querySelector('[data-plot="5"] img').naturalWidth>0`),true,'existing other species remains 2D');
 await shot(strip,'desktop-stages');await shot(panel,'strawberry-in-soil');
 state.plots[3].traits=[TRAITS.crystal?'crystal':'frost','shiny'];changed();await wait(350);await shot(panel,'crystal-in-soil');
 state=structuredClone(original);changed();await wait(350);
 // Switch via the actual UI. Both open windows must update without changing data.
 await js(`document.querySelector('.garden-render-toggle').click()`);
 await until(()=>sj(`!document.body.classList.contains('garden-3d')&&document.querySelectorAll('.art-3d').length===0`),'2D switch propagated');
 assert.deepEqual(state,original,'mode switch must not mutate garden');
 await js(`document.querySelector('.garden-render-toggle').click()`);
 await until(()=>sj(`document.querySelectorAll('.strawberry-canvas[data-ready=true]').length>=5`),'3D restored');
 // Real seed picker restricts other species, then real planting and fertilizing rules.
 panel.webContents.send('garden:page','plot:4');
 await until(()=>js(`document.querySelectorAll('.seed-card').length>0`),'seed picker');
 assert.equal(await js(`[...document.querySelectorAll('.seed-card')].filter(c=>c.querySelector('[data-species]')?.dataset.species!=='strawberry').every(c=>![...c.querySelectorAll('button')].some(b=>b.textContent.includes('种')))`),true);
 await js(`[...document.querySelectorAll('.seed-card')].find(c=>c.querySelector('[data-species="strawberry"]')).querySelector('button').click()`);
 await until(()=>Promise.resolve(state.plots[4]?.species==='strawberry'),'plant transaction');
 await until(()=>js(`!!document.querySelector('.fert-button:not(:disabled)')`),'fertilizer controls');
 await js(`document.querySelector('.fert-button:not(:disabled)').click()`);
 await until(()=>Promise.resolve(state.plots[4].fertilizers.length===1),'fertilizer applied');
 // Existing mature specimen can be harvested normally and regrows in place.
 panel.webContents.send('garden:page','plot:3');await wait(350);
 await js(`[...document.querySelectorAll('button')].find(b=>b.textContent==='收获 ✦').click()`);
 await until(()=>Promise.resolve(state.produce.length===1),'harvest transaction');
 assert.equal(state.plots[3].harvestIndex,1);assert.equal(state.plots[3].harvestsLeft,2);
 await js(`document.querySelector('dialog[open]')?.close()`);
 panel.webContents.send('garden:page','bag');
 await until(()=>js(`!!document.querySelector('.produce-card .strawberry-canvas[data-ready=true]')`),'3D harvested fruit in bag');
 await shot(panel,'harvest-basket');
 // Restore the display fixtures only in this isolated test, so users can compare stages.
 state=structuredClone(original);changed();panel.webContents.send('garden:page','plot:3');await wait(500);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,pid:process.pid,checks:['five field stages','existing non-strawberry preserved','2D/3D switch in both windows without save changes','strawberry-only seed picker','plant','fertilize','harvest and regrow','3D harvest basket'],errors},null,2));
 if(process.argv.includes('--show')){const a=screen.getPrimaryDisplay().workArea;panel.setPosition(a.x+30,a.y+20);panel.show();strip.setPosition(a.x+Math.max(0,a.width-1100),a.y+a.height-330);strip.setAlwaysOnTop(true);strip.showInactive();}
 else app.quit();
 }catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:false,error:String(e.stack)},null,2));app.exit(1);}
});
app.on('window-all-closed',()=>app.quit());
