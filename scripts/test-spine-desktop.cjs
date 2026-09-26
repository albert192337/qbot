// Real production renderer/preload, actual Spine assets, isolated profile, offline.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/spine-desktop/live');
app.setPath('userData',path.join(os.tmpdir(),'qbot-spine-live-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 await fs.mkdir(out,{recursive:true});
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
 const chars=await Promise.all(['spine-wuxie','spine-zhangqiling','mascot'].map(async dirId=>({dirId,manifest:JSON.parse(await fs.readFile(path.join(root,'app/resources/presets',dirId,'manifest.json'),'utf8'))})));
 let active=chars[0],cursor={x:620,y:180};
 protocol.handle('qbot-asset',async req=>{const u=new URL(req.url),base=path.join(root,'app/resources/presets',u.hostname);if(!chars.some(c=>c.dirId===u.hostname))return new Response(null,{status:403});const rel=u.pathname==='/__portrait.png'?'source.png':decodeURIComponent(u.pathname).replace(/^\//,'');const file=path.resolve(base,rel);if(!file.startsWith(base+path.sep))return new Response(null,{status:403});try{return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.webm')?'video/webm':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'text/plain'}});}catch{return new Response(null,{status:404});}});
 const handlers={
 'desktop:get':()=>({revision:0,hidden:false,peek:null,hiddenMembers:[]}),'overlays:get':()=>({revision:0,winner:null}),
 'social:contacts':()=>({available:false,invitations:[],people:[]}),'social:pet':()=>({ok:true}),
 'rooms:getStatus':()=>({phase:'offline'}),'garden:weather':()=>({now:Date.now(),current:null,next:null,today:[],forecast:[]}),
 'garden:get':()=>({plots:[]}),'sign:getMessage':()=>null,'pet:getPerch':()=>null,'pet:getCursor':()=>cursor,
 'behavior:getIdlePlan':()=>null,'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet',freeMode:true}),
 'progress:get':()=>({points:0,boxes:0,inventory:{},idleMs:0}),'characters:getActive':()=>active,'characters:list':()=>chars,
 'characters:pairDialogue':()=>['一起坐一会儿。','好。'],'pet:setVisitMode':()=>true,
 'agent:getStatus':()=>({activity:'idle',sessions:0}),'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false})};
 for(const [n,fn]of Object.entries(handlers))ipcMain.handle(n,fn);
 const win=new BrowserWindow({width:700,height:540,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',(_e,level,msg)=>{if(level>=3&&msg.includes('spine-player'))errors.push(msg);});
 const ev=code=>win.webContents.executeJavaScript(code);
 const until=async(code,label,ms=10000)=>{for(let i=0;i<ms/60;i++){if(await ev(code))return;await wait(60);}throw Error(label+' '+await ev(`JSON.stringify([...document.querySelectorAll('canvas.spine-player')].map(c=>({...c.dataset})))`));};
 const ready=`document.querySelector('#stage canvas.spine-player')?.dataset.ready==='true'`;
 await win.loadFile(path.join(root,'app/out/renderer/pet/index.html'));
 await until(ready,'initial live skin');await until(`!document.body.classList.contains('desktop-loading')`,'desktop visible');
 const play=async id=>{win.webContents.send('pet:menuCommand',{type:'play',action:id});await until(`document.querySelector('#stage canvas')?.dataset.action===${JSON.stringify(id)}&&Number(document.querySelector('#stage canvas').dataset.time)>.1`,'play '+id);};
 for(const character of chars.slice(0,2)){
  active=character;win.webContents.send('characters:activated',active);await until(ready,'switch '+active.dirId);
  for(const id of Object.keys(active.manifest.spine.actions))await play(id);
  assert.equal(await ev(`document.querySelectorAll('#stage video').length`),0);
  await play('wave');await until(`document.querySelector('#stage canvas')?.dataset.action==='idle'`,'one-shot completion');
  await fs.writeFile(path.join(out,active.dirId+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 active=chars[0];win.webContents.send('characters:activated',active);await until(ready,'switch back');await wait(300);
 win.webContents.send('pet:menuCommand',{type:'networkPair',kind:'tea',guest:chars[1],recipient:false,partner:'test-peer',lines:['坐会儿。','好。']});
 await until(`document.querySelectorAll('canvas.spine-player[data-gaze="partner"]').length===2`,'pair gaze');
 await wait(1600);
 const before=await ev(`JSON.stringify([...document.querySelectorAll('canvas.spine-player')].map(c=>c.dataset.gazeX))`);
 cursor={x:-2000,y:900};await wait(600);
 const after=await ev(`JSON.stringify([...document.querySelectorAll('canvas.spine-player')].map(c=>c.dataset.gazeX))`);
 assert.ok(JSON.parse(before).every((v,i)=>Math.abs(Number(v)-Number(JSON.parse(after)[i]))<.03),'mouse must not steal partner attention');
 assert.equal(await ev(`document.body.classList.contains('flip-host')`),true,'left actor faces right');
 assert.equal(await ev(`document.body.classList.contains('flip-visitor')`),false,'right actor faces left');
 await fs.writeFile(path.join(out,'pair-tea.png'),(await win.webContents.capturePage()).toPNG());
 win.webContents.send('pet:menuCommand',{type:'pairEnd'});
 await until(`!document.body.classList.contains('pair-mode')&&document.querySelector('#stage canvas')?.dataset.gaze==='pointer'`,'restore mouse gaze');
 win.webContents.send('pet:menuCommand',{type:'pair',kind:'wave',guestId:chars[1].dirId});
 await until(`!!document.querySelector('.pair-toolbar')&&document.querySelectorAll('canvas[data-gaze="partner"]').length===2`,'local pair');
 await ev(`[...document.querySelectorAll('.pair-toolbar button')].find(b=>b.textContent==='换边').click()`);
 await until(`document.body.classList.contains('pair-swapped')&&!document.body.classList.contains('flip-host')&&document.body.classList.contains('flip-visitor')`,'swapped facing');
 await wait(500);await fs.writeFile(path.join(out,'pair-swapped.png'),(await win.webContents.capturePage()).toPNG());
 win.webContents.send('pet:menuCommand',{type:'pairEnd'});
 await until(`!document.body.classList.contains('pair-mode')`,'local pair ends');
 await play('sleep');await until(`document.querySelector('#stage canvas').dataset.gaze==='pose'`,'sleep gaze off');
 await play('wave');await until(`document.querySelector('#stage canvas')?.dataset.action==='idle'`,'ready for petting');
 await ev(`(async()=>{for(const x of [150,220,150,220,150]){document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:180}));await new Promise(r=>setTimeout(r,130));}})()`);
 await until(`document.querySelector('#stage').classList.contains('petting')`,'petting works');
 await play('wave');assert.equal(await ev(`document.querySelector('#stage').classList.contains('petting')`),false);
 active=chars[2];win.webContents.send('characters:activated',active);
 await until(`document.querySelectorAll('canvas.spine-player').length===0&&[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'&&!v.paused)`,'video compatibility and cleanup');
 active=chars[0];
 ipcMain.handle('room:getSizePreset',()=> 'small');
 ipcMain.handle('rooms:getSceneMembers',()=>[{id:'guest',nickname:chars[1].manifest.name,character:chars[1],mode:'idle'}]);
 const room=new BrowserWindow({width:800,height:300,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 await room.loadFile(path.join(root,'app/out/renderer/online-room/index.html'));
 for(let i=0;i<150;i++){if(await room.webContents.executeJavaScript(`document.querySelectorAll('canvas.spine-player[data-ready=true]').length===2`))break;await wait(60);}
 assert.equal(await room.webContents.executeJavaScript(`document.querySelectorAll('canvas.spine-player[data-ready=true]').length`),2);
 await wait(800);await fs.writeFile(path.join(out,'online-room.png'),(await room.webContents.capturePage()).toPNG());room.close();
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({skins:2,actionsEach:22,realtime:true,pairFacesPartner:true,pairSwapped:true,mouseCannotOverridePartner:true,endRestoresPointer:true,sleepSuppressesGaze:true,petting:true,videoSwitch:true,onlineRoomCanvas:true,errors},null,2));
 console.log('PASS realtime Spine: 44 actions, pair attention, gaze priority, sleep, petting, completion and video switch');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
