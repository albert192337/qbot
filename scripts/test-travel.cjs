const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),os=require('os');
const root=path.resolve(__dirname,'..'),ts=require(path.join(root,'node_modules/typescript'));
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-travel-')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const mock=(file,exports)=>{require.cache[require.resolve(file)]={id:file,filename:file,loaded:true,exports};};
 mock('../app/src/main/config.ts',{getSettings:async()=>({activeCharacter:'demo'})});
 let portrait;
 // Optional read-only image fixture from the active pet, copied to the isolated test profile.
 try {
  const profile=path.join(process.env.APPDATA,'@qbot/app');
  const active=JSON.parse(fs.readFileSync(path.join(profile,'config.json'),'utf8')).activeCharacter;
  const base=path.resolve(profile,'characters',active),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
  const asset=manifest.actions?.idle?.gif??manifest.sourceImage,full=path.resolve(base,asset);
  if(full.startsWith(base+path.sep)) { portrait='portrait'+path.extname(full);const dest=path.join(app.getPath('userData'),'characters/demo');fs.mkdirSync(dest,{recursive:true});fs.copyFileSync(full,path.join(dest,portrait)); }
 } catch {}
 mock('../app/src/main/characters.ts',{getCharacter:async()=>({manifest:{name:'小旅伴',persona:'温柔好奇',sourceImage:portrait,actions:{}}})});
 mock('../app/src/main/music-monitor.ts',{getMusicStatus:()=>({playing:false})});
 mock('../app/src/main/perception.ts',{emitEvent:async()=>{}});
 mock('../app/src/main/progress.ts',{applyGardenTransaction:async()=>true});
 mock('../app/src/main/user-memory.ts',{initUserMemory:async()=>({episode:async()=>{}})});
 const {initialGarden}=require('../app/src/main/garden/rules.ts');
 let n=0;const initial=initialGarden(Date.now(),{random:()=>.9,id:()=>String(n++)});initial.coins=50000;
 fs.writeFileSync(path.join(app.getPath('userData'),'garden-demo.json'),JSON.stringify({state:initial}));
 const {getGarden,gardenAction}=require('../app/src/main/garden/service.ts');
 ipcMain.handle('garden:get',getGarden);ipcMain.handle('garden:act',(_,c)=>gardenAction(c));
 const w=new BrowserWindow({width:540,height:760,frame:false,transparent:true,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 const errors=[];w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 await w.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'travel'}});
 const js=s=>w.webContents.executeJavaScript(s);
 const until=async f=>{for(let i=0;i<80;i++){if(await f())return;await wait(70);}throw Error('timeout');};
 const pointer=async sel=>{await js(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center'})`);await wait(80);const p=await js(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}),r=b.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return {x,y,hit:b.contains(document.elementFromPoint(x,y))}})()`);assert.ok(p.hit);for(const type of ['mouseMove','mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x:p.x,y:p.y,button:'left',clickCount:1});await wait(180);};
 const out=path.join(root,'.superpowers/travel');fs.mkdirSync(out,{recursive:true});const shot=async name=>{await wait(180);fs.writeFileSync(path.join(out,name+'.png'),(await w.webContents.capturePage()).toPNG());};
 await until(()=>js('document.querySelectorAll(".map-pin").length===3'));await shot('world-map'); await pointer('.map-pin.current'); await until(()=>js('!!document.querySelector(".experience-buy")')); await shot('local');
 await pointer('.experience-buy');await until(async()=>((await getGarden()).travel?.posts.length===1));
 await until(()=>js('!!document.querySelector(".experience-celebration")'));await shot('experience-effect');
 let state=await getGarden();assert.equal(state.coins,49920);assert.equal(state.travel.diaries.length,1);
 const repeated=await Promise.all([gardenAction({type:'travelExperience',city:0,project:0,step:1}),gardenAction({type:'travelExperience',city:0,project:0,step:1})]);assert.equal(repeated.filter(r=>r.ok).length,1);
 state=await getGarden();assert.equal(state.coins,49780);assert.equal(state.travel.diaries.length,1);
 assert.equal((await gardenAction({type:'travelNext',city:0})).ok,false);
 await pointer('.travel-tabs button:nth-child(3)');await until(()=>js('document.querySelectorAll(".moment-card").length===1'));await js('scrollTo(0,0)');await shot('moments');
 await js('document.querySelector(".travel-photo").scrollIntoView({block:"center"})');await shot('postcard');
 await pointer('.moment-like');assert.ok((await getGarden()).travel.posts[0].liked);
 w.setSize(540,760);await js('scrollTo(0,0)');await shot('moments-narrow');assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
 w.reload();await until(()=>js('!!document.querySelector(".world-map")'));await pointer('.travel-tabs button:nth-child(3)');await until(()=>js('document.querySelectorAll(".moment-card").length===1'));
 const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'garden-demo.json'))).state;assert.equal(saved.travel.posts.length,2);assert.equal(saved.travel.diaries.length,1);
 for(let project=0;project<5;project++)for(let step=(await getGarden()).travel.progress[0][project];step<3;step++)assert.equal((await gardenAction({type:'travelExperience',city:0,project,step})).ok,true);
 assert.equal((await gardenAction({type:'travelNext',city:0})).ok,true);
 assert.equal((await getGarden()).travel.current,1);assert.equal((await getGarden()).travel.posts.length,15);
 await w.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'moments'}});
 await until(()=>js('document.querySelectorAll(".travel-photo").length===5'));
 assert.equal(await js('document.querySelectorAll(".moment-card").length'),1);
 w.setSize(860,950);await shot('city-album');
 await pointer('.travel-tabs button:first-child');await pointer('.map-pin.current');
 await until(()=>js('!!document.querySelector(".destination-view")'));
 await until(()=>js('[...document.querySelectorAll(".destination-view>img")].every(i=>i.complete&&i.naturalWidth>0)'));await shot('paris');
 await pointer('.place-pin:nth-of-type(5)');
 const activitySources=[];
 for(let step=0;step<3;step++){
  await until(()=>js('!!document.querySelector(".experience-thumbnail img")?.naturalWidth && document.querySelector(".experience-thumbnail img").alt==='+JSON.stringify(['逛花园','喷泉边野餐','留一束干花'][step])));
  activitySources.push(await js('document.querySelector(".experience-thumbnail img").src'));
  await shot('garden-activity-'+step);await pointer('.experience-thumbnail');
  await until(()=>js('!!document.querySelector(".experience-preview[open]")'));
  await shot('garden-activity-preview-'+step);await pointer('.preview-close');
  await pointer('.experience-buy');await until(async()=>((await getGarden()).travel.progress[1][4]===step+1));
  await until(()=>js('!!document.querySelector(".travel-photo-reveal.playing")'));
  assert.equal(await js('document.querySelector(".revealed-postcard .photo-window img").src'),activitySources[step]);
  if(step===0){
   await wait(650);await shot('photo-reveal-large');
   assert.ok(await js('document.querySelector(".revealed-postcard").getBoundingClientRect().width>innerWidth*.5'));
   await until(()=>js('!document.querySelector(".travel-photo-reveal")'));
   assert.ok(await js('!!document.querySelector(".place-pin.photo-collected")'));
  }
 }
 assert.equal(new Set(activitySources).size,3);
 await pointer('.travel-tabs button:nth-child(3)');
 await until(()=>js('!!document.querySelector(".activity-photo img")?.naturalWidth'));
 assert.equal(await js('document.querySelector(".activity-photo img").src'),activitySources[2]);
 for(let project=0;project<5;project++)for(let step=(await getGarden()).travel.progress[1][project];step<3;step++)assert.equal((await gardenAction({type:'travelExperience',city:1,project,step})).ok,true);
 assert.equal((await gardenAction({type:'travelNext',city:1})).ok,true);
 await w.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'travel'}});
 await until(()=>js('document.querySelectorAll(".map-pin").length===3'));
 await pointer('.map-pin.current');await until(()=>js('!!document.querySelector(".destination-view")'));
 await until(()=>js('[...document.querySelectorAll(".destination-view>img")].every(i=>i.complete&&i.naturalWidth>0)'));await shot('island');
 await js('matchMedia("(prefers-reduced-motion: reduce)")');w.setSize(540,760);await shot('local-narrow');
 assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
 for(const [width,height] of [[360,480],[900,600],[540,760]]){
  w.setSize(width,height);await wait(120);
  assert.ok(await js('document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth'));
  const fits=await js('[...document.querySelectorAll(".place-pin,.experience-buy,.travel-tabs button,.travel-close")].every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})');
  assert.ok(fits,'controls fit '+width+'x'+height);
 }
 await shot('fitted-local');await pointer('.travel-tabs button:first-child');await shot('fitted-world');
 const beforeReplay=await getGarden();
 await pointer('.map-pin:nth-of-type(2)');
 await pointer('.travel-replay');
 await pointer('.place-pin:nth-of-type(5)');
 assert.equal(await js('document.querySelector(".travel-day").textContent'),'测试中');
 for(let step=0;step<3;step++){
  await until(()=>js('document.querySelector(".experience-thumbnail img")?.alt==='+JSON.stringify(['逛花园','喷泉边野餐','留一束干花'][step])));
  await pointer('.experience-buy');
 }
 assert.ok(await js('document.querySelector(".experience-buy").disabled'));
 await pointer('.travel-replay');
 assert.equal(await js('document.querySelector(".experience-thumbnail img").alt'),'逛花园');
 for(const [width,height] of [[360,480],[540,760]]){
  w.setSize(width,height);await wait(120);
  assert.ok(await js('[...document.querySelectorAll(".travel-next button")].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})'));
 }
 await shot('paris-test-replay');
 await pointer('.travel-replay-exit');
 assert.notEqual(await js('document.querySelector(".travel-day").textContent'),'测试中');
 assert.ok(await js('document.querySelector(".experience-buy").disabled'));
 const afterReplay=await getGarden();
 assert.equal(afterReplay.coins,beforeReplay.coins);assert.deepEqual(afterReplay.travel,beforeReplay.travel);
 let closeRequested=false;ipcMain.on('garden:closeTravel',()=>{closeRequested=true;});await pointer('.travel-close');assert.ok(closeRequested);
 assert.deepEqual(errors,[]);console.log('PASS: native pointer, serial charges, stale clicks, diary upsert, persistence, locked/next city, like, fitted frameless UI and close; '+out);app.exit(0);
 }catch(e){console.error(e);app.exit(1);}});

