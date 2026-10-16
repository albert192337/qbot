// Real pet HUD + packaged preload + formal pinball main + native Shell bridge.
// Only unrelated pet services are fixtures; all currency lives in a temporary profile.
const {app,BrowserWindow,ipcMain,protocol,session,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {build}=require('node:module').createRequire(require.resolve('vite'))('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/formal-pinball'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'qbot-formal-pinball-'));
process.env.QBOT_PINBALL_NO_IMPORT='1';
app.setPath('userData',profile);fs.mkdirSync(out,{recursive:true});
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.on('window-all-closed',()=>{});app.on('browser-window-created',(_e,w)=>w.webContents.setAudioMuted(true));
const bundle=path.join(root,'app/out/main/formal-pinball-qa.cjs');
const built=build({stdin:{contents:"export * from './app/src/main/pinball/index.mjs';",resolveDir:root},outfile:bundle,bundle:true,platform:'node',packages:'external',plugins:[{name:'native-source',setup(b){b.onResolve({filter:/\.cs\?raw$/},a=>({path:path.resolve(path.dirname(a.importer),a.path.slice(0,-4)),namespace:'native'}));b.onLoad({filter:/.*/,namespace:'native'},a=>({contents:JSON.stringify(fs.readFileSync(a.path,'utf8')),loader:'json'}));}}]});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),run=(w,s)=>w.webContents.executeJavaScript(s);
async function until(fn,label,ms=30000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await wait(100);}throw Error(label);}
let pet,api;const checks=[];
app.whenReady().then(async()=>{try{
 await built;api=require(bundle);api.registerDesktopPinball();
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const base=path.join(root,'app/resources/presets/mascot'),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8')),actor={dirId:'host',manifest};
 protocol.handle('qbot-asset',async req=>{const u=new URL(req.url),p=path.resolve(base,decodeURIComponent(u.pathname).replace(/^\//,''));if(!p.startsWith(base+path.sep))return new Response(null,{status:403});try{return new Response(fs.readFileSync(p),{headers:{'Content-Type':p.endsWith('.webm')?'video/webm':p.endsWith('.json')?'application/json':'image/png'}});}catch{return new Response(null,{status:404});}});
 const area=screen.getPrimaryDisplay().workArea;
 pet=new BrowserWindow({x:area.x+area.width-420,y:area.y+Math.max(100,area.height-450),width:360,height:380,show:false,transparent:true,frame:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),backgroundThrottling:false}});
 const handlers={
  'overlays:get':()=>({winner:null}),'pet:setVisitMode':()=>{},'autonomy:get':()=>null,'autonomy:icons':()=>[],'social:contacts':()=>({available:false,invitations:[],people:[]}),
  'rooms:getStatus':()=>({phase:'off'}),'garden:weather':()=>({now:Date.now(),current:null,next:null,today:[],forecast:[]}),
  'garden:get':()=>({plots:[]}),'sign:getMessage':()=>null,'pet:getPerch':()=>null,'pet:getCursor':()=>({x:0,y:0}),
  'behavior:getIdlePlan':()=>null,'settings:get':()=>({activeCharacter:'host',freeMode:false,voiceEnabled:false,talkFrequency:'quiet'}),
  'progress:get':()=>({points:9000,boxes:3,inventory:{},idleMs:0}),'characters:getActive':()=>actor,'characters:list':()=>[actor],
  'agent:getStatus':()=>({activity:'idle',sessions:0}),'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false}),
  'desktop:get':()=>({revision:0,hidden:false,hiddenMembers:[],peek:null}),
 };
 let legacyCalls=0;ipcMain.handle('progress:openBox',()=>{legacyCalls++;throw Error('Legacy chest must not be charged');});
 for(const [id,fn]of Object.entries(handlers))ipcMain.handle(id,fn);
 await pet.loadFile(path.join(root,'app/out/renderer/pet/index.html'));pet.show();
 await until(()=>run(pet,"document.querySelector('.hud-chest')?.title.includes('20/30')"),'formal HUD inventory');
 const walletFile=path.join(profile,'desktop-pinball.json'),read=()=>JSON.parse(fs.readFileSync(walletFile,'utf8'));
 assert.equal(read().wallet.balls,20);checks.push('actual pet HUD uses formal pinball inventory, not legacy boxes/points');
 await fs.promises.writeFile(path.join(out,'01-pet-entry.png'),(await pet.webContents.capturePage()).toPNG());
 const p=await run(pet,"(()=>{const r=document.querySelector('.hud-chest').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
 pet.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...p});pet.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...p});
 const overlay=()=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/desktop-pinball/index.html'));
 await until(()=>read().wallet.rounds===1,'pet opens and launches through native formal main');
 await until(()=>overlay()&&run(overlay(),"window.pinballPreview?.stats().ready==='true'"),'formal overlay ready');
 const first=read(),round=first.rounds[0];assert.equal(first.wallet.balls,19);assert.equal(legacyCalls,0);assert.ok(round.origin.x>area.width/2);assert.ok(round.origin.y>100);
 assert.equal(await run(overlay(),"window.pinballPreview.state().formal"),true);assert.equal(await run(overlay(),"document.querySelector('#test-wheel').hidden"),true);assert.equal(await run(overlay(),"document.querySelector('#shelf')"),null);
 await until(()=>run(overlay(),"window.pinballPreview.stats().iconImages>0"),'actual Shell bitmaps');
 assert.equal(await run(overlay(),"['#toolbar','#launcher','#reward'].every(s=>document.querySelector(s).getClientRects().length===0)"),true);
 assert.equal(await run(overlay(),"[...document.querySelectorAll('.interactive')].filter(e=>e.getClientRects().length).length"),0);
 const cardsPainted="(()=>{const c=document.querySelector('#field'),s=c.height/innerHeight,d=c.getContext('2d').getImageData(0,Math.ceil((innerHeight-28)*s),c.width,Math.floor(24*s)).data;return d.some((v,i)=>i%4===3&&v>0)})()";
 assert.equal(await run(overlay(),cardsPainted),true,'cards appear during chest opening');
 checks.push('native pet click emits one ball from pet origin; real Shell icons load; no old charge or temporary shelf');
 await fs.promises.writeFile(path.join(out,'02-desktop-flight.png'),(await overlay().webContents.capturePage()).toPNG());
 const financial=()=>{const w=read().wallet;return{balls:w.balls,coins:w.coins,rounds:w.rounds,unlocked:w.unlocked};};
 const before=financial();overlay().close();await until(()=>!overlay(),'close only pinball overlay');assert.equal(pet.isDestroyed(),false);
 await run(pet,'window.qbot.pinball.open()');await until(()=>overlay()&&run(overlay(),"window.pinballPreview?.stats().ready==='true'"),'reopen existing settled rounds');assert.deepEqual(financial(),before);
 checks.push('closing overlay keeps pet alive; reopening resumes saved session without spending or redrawing');
 assert.match(await run(pet,"window.pinball.launch(200,1).then(()=>'',e=>e.message)"),/无效的弹珠窗口/);
 checks.push('non-overlay renderer cannot invoke simulation or alter icon assignments');
 await run(pet,'window.qbot.pinball.openChest({x:180,y:200})');assert.equal(read().wallet.rounds,2);assert.equal(read().wallet.balls,18);
 await until(()=>run(overlay(),"!window.pinballPreview.stats().running"),'formal shots and wheels complete');
 await wait(1400);assert.equal(await run(overlay(),cardsPainted),false,'cards disappear after landing effects finish');
 await until(()=>run(pet,`document.querySelector('.hud-num').textContent.length>0&&document.querySelector('.hud-chest').title.includes('18/30')`),'HUD receives updated balance');
 assert.equal(legacyCalls,0);await fs.promises.writeFile(path.join(out,'03-result.png'),(await overlay().webContents.capturePage()).toPNG());
 checks.push('second pet opening debits exactly once; result returns to real HUD; both old wallet and garden untouched');
 await run(overlay(),"document.querySelector('#test-wheel').click()");
 await until(()=>run(overlay(),"window.pinballPreview.stats().wheel.active"),'compact wheel preview');
 const wheel=await run(overlay(),"(()=>{const h=document.querySelector('.treasure'),r=h.getBoundingClientRect(),a=window.pinballPreview.state().petAnchor;return {width:r.width,height:r.height,top:r.top,head:a.y,bg:getComputedStyle(h).backgroundColor,labels:['#wheel-result','#wheel-queue'].every(s=>!document.querySelector(s).getClientRects().length)}})()");
 assert.equal(wheel.width,120);assert.equal(wheel.height,120);assert.ok(wheel.top+wheel.height<=wheel.head);assert.equal(wheel.bg,'rgba(0, 0, 0, 0)');assert.equal(wheel.labels,true);
 await fs.promises.writeFile(path.join(out,'05-compact-head-wheel.png'),(await overlay().webContents.capturePage()).toPNG());
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks,profile,summary:financial(),icons:await run(overlay(),'window.pinballPreview.stats().iconImages')},null,2));
 api.disposeDesktopPinball();pet.destroy();console.log('PASS formal pinball: '+checks.length+' checks');app.quit();
 }catch(e){console.error(e);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:false,error:e.stack,checks,profile},null,2));api?.disposeDesktopPinball();app.exit(1);}});
