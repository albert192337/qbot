// Isolated real Electron surfaces and media. No network, paid models or user profile writes.
const {app,BrowserWindow,ipcMain,protocol,session,screen}=require('electron');
const fs=require('node:fs/promises'),fsSync=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {buildSync}=require('node:module').createRequire(require.resolve('vite'))('esbuild');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output/autonomy-ui');
app.setPath('userData',fsSync.mkdtempSync(path.join(os.tmpdir(),'qbot-autonomy-ui-')));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.on('window-all-closed',()=>{});
const bundle=path.join(root,'app/out/main/autonomy-ui-qa.cjs');
buildSync({stdin:{contents:"export * from './app/src/main/autonomy-engine';export * from './app/src/main/behavior-audit';export * from './app/src/main/pet-hint';export * from './app/src/main/desktop-visibility';export * from './app/src/main/desktop-overlays';",resolveDir:root},outfile:bundle,bundle:true,platform:'node',external:['electron']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 await fs.mkdir(output,{recursive:true});
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const api=require(bundle);api.registerDesktopVisibility();api.registerDesktopOverlays(()=>true);api.registerPetHints();
 const preset=path.join(root,'app/resources/presets/mascot');
 const manifest=JSON.parse(await fs.readFile(path.join(preset,'manifest.json'),'utf8'));
 let host={dirId:'host',manifest:{...structuredClone(manifest),name:'小青'}},guest={dirId:'guest',manifest:{...structuredClone(manifest),name:'小伙伴'}};
 guest.manifest.customActions={st_tea:{...manifest.actions.tea,sourceName:'喝茶'}};
 guest.manifest.stickerLibrary={version:1,referenceId:'st_tea',scenes:{},items:[{id:'st_tea',name:'喝茶',tags:[],enabled:true,raw:''}]};delete guest.manifest.actions.tea;
 let baseById={host:preset,guest:preset};
 protocol.handle('qbot-asset',async req=>{
  const u=new URL(req.url),base=baseById[u.hostname]??preset,p=path.resolve(base,decodeURIComponent(u.pathname).replace(/^\//,''));
  if(!p.startsWith(base+path.sep))return new Response(null,{status:403});
  try{return new Response(await fs.readFile(p),{headers:{'Content-Type':p.endsWith('.webm')?'video/webm':p.endsWith('.json')?'application/json':p.endsWith('.png')?'image/png':'text/plain'}});}catch{return new Response(null,{status:404});}
 });
 const area=screen.getPrimaryDisplay().workArea;
 const pet=new BrowserWindow({x:area.x+150,y:area.y+250,width:360,height:360,show:false,frame:false,transparent:true,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),backgroundThrottling:false}});
 api.trackDesktopWindow(pet,'host');
 const evaluate=s=>pet.webContents.executeJavaScript(s),until=async(fn,label,tries=150)=>{for(let i=0;i<tries;i++){if(await fn())return;await wait(100);}throw Error(label);};
 let valid=true,delayDialogue=0,dispatches=0,photos=0;
 const icon=(await app.getFileIcon(path.join(root,'package.json'),{size:'normal'})).toDataURL();
 const engine=new api.AutonomyEngine({audit:api.behaviorAudit,now:Date.now,valid:async()=>valid,
  publish:p=>pet.webContents.send('autonomy:proposal',p),execute:async p=>{dispatches++;pet.webContents.send('pet:menuCommand',{type:'pair',kind:p.opportunity.kind,guestId:'guest',requestId:p.id});return 'sent';}});
 const handlers={
  'autonomy:get':()=>engine.get(),'autonomy:answer':(_,id,accept)=>engine.answer(id,accept),'autonomy:icons':()=>[icon],
  'autonomy:photo':async()=>{photos++;await fs.writeFile(path.join(output,'saved-photo.png'),(await pet.webContents.capturePage()).toPNG());},
  'relationships:recordLocal':()=>{},'social:contacts':()=>({available:false,invitations:[],people:[]}),
  'rooms:getStatus':()=>({phase:'off'}),'garden:weather':()=>({now:Date.now(),current:null,next:null,today:[],forecast:[]}),
  'garden:get':()=>({plots:[]}), 'sign:getMessage':()=>null,'pet:getPerch':()=>null,'pet:perch':()=>({}),
  'behavior:getIdlePlan':()=>null,'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet',freeMode:true}),
  'pet:getCursor':()=>({x:0,y:0}),
  'progress:get':()=>({points:0,boxes:0,inventory:{},idleMs:0}),'characters:getActive':()=>host,'characters:list':()=>[host,guest],
  'characters:pairDialogue':async()=>{await wait(delayDialogue);return ['茶还温着，过来坐坐。','好呀，我来陪你。'];},
  'agent:getStatus':()=>({activity:'idle',sessions:0}),'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false}),
  'pet:setVisitMode':async(_,enter)=>{pet.setBounds({width:enter?720:360,height:enter?600:360});},
 };
 for(const [key,fn] of Object.entries(handlers))ipcMain.handle(key,fn);
 const results=[];ipcMain.on('autonomy:result',(_,id,outcome)=>results.push({id,outcome}));
 await pet.loadFile(path.join(root,'app/out/renderer/pet/index.html'));pet.showInactive();
 await until(()=>evaluate(`[...document.querySelectorAll('#stage video')].some(v=>v.currentTime>0)`),'real host playback');
 const choice={id:'local:guest',behavior:'invite',target:'guest',kind:'tea',label:'邀请本地角色小伙伴喝杯茶',reason:'关系手账记着上次一起喝茶',revision:'fixture'};
 await engine.propose('host',choice,'上次一起喝茶很开心，想再陪他坐一会儿。');
 const hint=()=>BrowserWindow.getAllWindows().find(w=>w!==pet&&w.webContents.getURL().includes('pet-hint/index.html'));
 await until(()=>hint()?.isVisible(),'approval exterior appears');
 assert.equal(dispatches,0);assert.equal(await evaluate(`!!document.querySelector('#pair-interaction')`),false);
 const hintText=await hint().webContents.executeJavaScript('document.body.innerText');assert.match(hintText,/同意/);assert.match(hintText,/小伙伴/);
 const bounds=hint().getBounds(),pb=pet.getBounds();assert.ok(bounds.y+bounds.height<=pb.y||bounds.x+bounds.width<=pb.x||bounds.x>=pb.x+pb.width||bounds.y>=pb.y+pb.height,'approval never covers actor');
 const textSize=await hint().webContents.executeJavaScript(`(()=>{const t=document.querySelector('#text');return {scroll:t.scrollHeight,client:t.clientHeight}})()`);assert.ok(textSize.scroll<=textSize.client+1,'approval rationale is readable');
 await fs.writeFile(path.join(output,'approval.png'),(await hint().webContents.capturePage()).toPNG());
 await hint().webContents.executeJavaScript(`document.querySelector('#invitation-actions button').click();document.querySelector('#invitation-actions button').click()`);
 await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='0'`),'accepted pair starts');assert.equal(dispatches,1);
 await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='1'`),'tea response');
 await fs.writeFile(path.join(output,'tea.png'),(await pet.webContents.capturePage()).toPNG());
 await until(()=>evaluate(`!document.querySelector('#pair-interaction')&&!document.body.classList.contains('pair-returning')`),'pair ends naturally');
 assert.ok(Math.abs(pet.getBounds().width-360)<=2);assert.ok(results.some(r=>r.outcome==='completed'));
 pet.webContents.send('pet:menuCommand',{type:'pair',kind:'fight',guestId:'guest'});
 await until(()=>evaluate(`document.querySelectorAll('.pair-icon-copy').length===3`),'real icon copies on first fight beat');
 assert.equal(await evaluate(`document.querySelector('.pair-icon-copy').tagName`),'IMG');
 await wait(750);await fs.writeFile(path.join(output,'fight.png'),(await pet.webContents.capturePage()).toPNG());
 await until(()=>evaluate(`document.querySelector('.pair-effects')?.dataset.thrower==='guest'`),'return throw');
 await until(()=>evaluate(`!document.querySelector('#pair-interaction')&&!document.body.classList.contains('pair-returning')`),'fight ends naturally',350);
 pet.webContents.send('pet:menuCommand',{type:'pair',kind:'photo',guestId:'guest'});
 await until(()=>photos===1,'photo captured on final beat',350);
 await until(()=>evaluate(`!document.querySelector('#pair-interaction')&&!document.body.classList.contains('pair-returning')`),'photo ends naturally',350);
 assert.equal(photos,1);assert.ok((await fs.stat(path.join(output,'saved-photo.png'))).size>1000);
 // Cancellation while dialogue is loading must not resurrect a visitor or leave a wide window.
 delayDialogue=700;pet.webContents.send('pet:menuCommand',{type:'pair',kind:'tea',guestId:'guest'});await wait(100);pet.webContents.send('pet:menuCommand',{type:'pairEnd'});await wait(1000);
 assert.equal(await evaluate(`!!document.querySelector('#pair-interaction')`),false);assert.ok(Math.abs(pet.getBounds().width-360)<=2);delayDialogue=0;
 // Actual Spine media also finishes, with neither video ended events nor a video URL.
 const spineBase=path.join(root,'app/resources/presets/spine-wuxie');
 const spineManifest=JSON.parse(await fs.readFile(path.join(spineBase,'manifest.json'),'utf8'));
 host={dirId:'host',manifest:spineManifest};guest={dirId:'guest',manifest:{...structuredClone(spineManifest),name:'骨骼伙伴'}};baseById={host:spineBase,guest:spineBase};
 pet.webContents.send('characters:activated',host);await until(()=>evaluate(`!!document.querySelector('#stage canvas[data-time]')`),'Spine loaded');
 pet.webContents.send('pet:menuCommand',{type:'pair',kind:'tea',guestId:'guest'});
 await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='1'`),'Spine tea responds');
 await fs.writeFile(path.join(output,'spine-tea.png'),(await pet.webContents.capturePage()).toPNG());
 await until(()=>evaluate(`!document.querySelector('#pair-interaction')&&!document.body.classList.contains('pair-returning')`),'Spine ends naturally');
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify({passed:true,dispatches,photos,results,profile:app.getPath('userData'),checks:['approval before action','double click once','exterior placement','video/sticker complete','icon toss and return','photo capture once','cancel during generation','Spine complete']},null,2));
 pet.destroy();console.log('PASS: production approval UI, video/sticker/Spine natural completion, icon copies, duplicate acceptance and delayed cancellation');app.exit(0);
 }catch(e){console.error(e);app.exit(1);}});
