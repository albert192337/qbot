// Isolated native renderer rehearsal; no network or real user data.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises'); const path=require('node:path'); const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), preset=path.join(root,'app/resources/presets/mascot');
app.setPath('userData',path.join(root,'.superpowers/pair-qa-data'));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const {buildSync}=require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild');
const visibilityBundle=path.join(root,'.superpowers/pair-visibility.cjs');
buildSync({entryPoints:[path.join(root,'app/src/main/desktop-visibility.ts')],outfile:visibilityBundle,bundle:true,platform:'node',external:['electron']});
let win;
app.whenReady().then(async()=>{try{
 const visibility=require(visibilityBundle);visibility.registerDesktopVisibility();
 const peer=new BrowserWindow({width:200,height:200,show:false,webPreferences:{offscreen:true}});
 visibility.trackDesktopWindow(peer,'peer','friend');peer.showInactive();
 visibility.setPairedMember('friend');visibility.setDesktopHidden(true);visibility.setDesktopHidden(false);
 assert.equal(peer.isVisible(),false,'global show does not reveal transferred peer');
 const latePeer=new BrowserWindow({width:200,height:200,show:false,webPreferences:{offscreen:true}});
 visibility.trackDesktopWindow(latePeer,'peer','friend');latePeer.showInactive();assert.equal(latePeer.isVisible(),false,'late-created peer stays hidden');latePeer.destroy();
 visibility.setPairedMember();assert.equal(peer.isVisible(),true,'transfer release restores peer');
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
 const manifest=JSON.parse(await fs.readFile(path.join(preset,'manifest.json'),'utf8'));
 const host={dirId:'host',manifest:structuredClone(manifest)}; host.manifest.name='小青';
 host.manifest.actions.tea.facing='left';host.manifest.actions.talk_happy.facing='right';
 const guest={dirId:'guest',manifest:structuredClone(manifest)};guest.manifest.name='来串门的小青';
 guest.manifest.customActions={st_heart:{...manifest.actions.talk_happy,facing:'left'},st_tea:{...manifest.actions.tea,facing:'right'}};
 guest.manifest.stickerLibrary={version:1,referenceId:'st_heart',scenes:{},items:[{id:'st_heart',name:'比心、开心',tags:['开心'],enabled:true,raw:''},{id:'st_tea',name:'喝茶',tags:[],enabled:true,raw:''}]};
 // Ensure selection tests the guest's independent sticker inventory.
 delete guest.manifest.actions.tea; delete guest.manifest.actions.talk_happy;
 let active=host, delayList=0, realGuestDir=null;
 protocol.handle('qbot-asset',async req=>{const base=new URL(req.url).hostname==='guest'&&realGuestDir?realGuestDir:preset; const p=path.resolve(base,decodeURIComponent(new URL(req.url).pathname).replace(/^\//,''));
  if(!p.startsWith(base+path.sep))return new Response(null,{status:403});
  return new Response(await fs.readFile(p),{headers:{'Content-Type':p.endsWith('.webm')?'video/webm':'image/png'}});
 });
 const handlers={
 'overlays:get':()=>({revision:0,winner:null}),
 'social:contacts':()=>({available:false,invitations:[],people:[]}),
 'rooms:getStatus':()=>({phase:'offline'}),'garden:weather':()=>({now:Date.now(),current:null,next:null,today:[],forecast:[]}),
 'garden:get':()=>({plots:[]}),'sign:getMessage':()=>null,'pet:getPerch':()=>null,'pet:perch':()=>({}),
 'behavior:getIdlePlan':()=>null,'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet',freeMode:true}),
 'progress:get':()=>({points:0,boxes:0,inventory:{},idleMs:0}), 'characters:getActive':()=>active,
 'characters:list':async()=>{await wait(delayList);return [host,guest]},
 'agent:getStatus':()=>({activity:'idle',sessions:0}), 'meeting:getStatus':()=>({inMeeting:false}), 'music:getStatus':()=>({playing:false})};
 for(const [key,fn] of Object.entries(handlers))ipcMain.handle(key,fn);
 win=new BrowserWindow({width:360,height:360,frame:false,transparent:true,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 visibility.trackDesktopWindow(win,'host');
 let concealedResizes=0;
 ipcMain.handle('pet:setVisitMode',async(_ev,enter,partner)=>{
  visibility.setPairedMember(enter?partner:undefined);
  if(!enter&&await win.webContents.executeJavaScript(`document.body.classList.contains('pair-returning')`)){
   assert.equal(await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('#stage')).opacity`),'0','native resize must be hidden');
   await wait(120);concealedResizes++;
  }
  win.setBounds({width:enter?720:360,height:360});
 });
 const evaluate=s=>win.webContents.executeJavaScript(s);
 const until=async(fn,msg)=>{for(let i=0;i<120;i++){if(await fn())return;await wait(100)}throw Error(msg)};
 const start=async kind=>{win.webContents.send('pet:menuCommand',{type:'pair',kind,guestId:'guest'});await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.kind===${JSON.stringify(kind)}&&document.querySelector('#pair-interaction').dataset.beat!==undefined`),'pair did not start');};
 const end=async()=>{win.webContents.send('pet:menuCommand',{type:'pairEnd'});await until(()=>evaluate(`!document.querySelector('#pair-interaction')&&!document.body.classList.contains('pair-returning')&&!document.body.classList.contains('pair-arriving')`),'pair did not stop');};
 await win.loadFile(path.join(root,'app/out/renderer/pet/index.html'));
 await until(()=>evaluate(`document.querySelector('#stage video')?.currentTime>0`),'host playback');
 await fs.mkdir(path.join(root,'output/garden-v3'),{recursive:true});
 win.webContents.send('pet:menuCommand',{type:'networkPhoto',guest:{...guest,hasUnfinishedJob:false}});await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.kind==='photo'`),'consented photo did not start');await until(()=>evaluate(`Array.from(document.querySelectorAll('#visitor-stage video')).some(v=>v.currentTime>0)`),'photo partner playback');assert.equal(await evaluate(`!!document.querySelector('.pair-toolbar')`),false);assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.pair-effects'),'::after').borderTopWidth)>8`),'photo frame visible at Windows scaling');await wait(250);await fs.writeFile(path.join(root,'output/garden-v3/photo-pair.png'),(await win.webContents.capturePage()).toPNG());await end();
 // Network entry uses the production two-player director for every kind and role.
 for(const kind of ['heart','tea','chat','wave','flower','photo','relay','celebrate']){
  for(const recipient of [false,true]){
   win.webContents.send('pet:menuCommand',{type:'networkPair',partner:'friend',kind,recipient,guest});
   await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.kind===${JSON.stringify(kind)}&&document.querySelector('#pair-interaction').dataset.beat!==undefined`),'network '+kind);
   assert.equal(peer.isVisible(),false,'original peer is hidden before shared playback');
   peer.show();peer.showInactive();assert.equal(peer.isVisible(),false,'late show cannot duplicate the actor');
   assert.equal(await evaluate(`!!document.querySelector('.pair-toolbar')`),false,'no rehearsal toolbar in live interaction');
   await until(()=>evaluate(`['#stage','#visitor-stage'].every(s=>[...document.querySelectorAll(s+' video')].some(v=>v.style.visibility==='visible'&&v.currentTime>0&&!v.paused))`),'both network videos play '+kind);
   assert.equal(await evaluate(`document.querySelectorAll('.pair-caption:not([hidden])').length`),0,'network captions stay outside actor');
   if(recipient)assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pair-effects')).getPropertyValue('--from').trim()`),'67%','recipient effects originate at the inviter');
   if(kind==='heart')assert.equal(await evaluate(`document.querySelector('#pair-interaction').dataset.hostAction==='idle'`),recipient,'recipient listens first');
   if(kind==='tea'&&!recipient){
    await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='1'`),'network tea response');
    assert.deepEqual(await evaluate(`(()=>{const p=document.querySelector('#pair-interaction');return [p.dataset.hostAction,p.dataset.guestAction]})()`),['tea','st_tea']);
    await wait(700);win.webContents.invalidate();await wait(100);await fs.writeFile(path.join(root,'output/garden-v3/network-tea.png'),(await win.webContents.capturePage()).toPNG());
   }
   await end();
   assert.equal(peer.isVisible(),true,'original peer restored on completion');
  }
 }
 win.webContents.send('pet:menuCommand',{type:'networkPair',partner:'friend',kind:'heart',recipient:false,guest});
 await until(()=>evaluate(`!!document.querySelector('#pair-interaction')`),'network departure setup');
 win.webContents.send('rooms:memberOut','friend');await until(()=>evaluate(`!document.querySelector('#pair-interaction')`),'partner departure cancels');
 win.webContents.send('pet:menuCommand',{type:'networkPair',partner:'friend',kind:'heart',recipient:false,guest});
 await until(()=>evaluate(`!!document.querySelector('#pair-interaction')`),'network disconnect setup');
 win.webContents.send('rooms:status',{phase:'off'});await until(()=>evaluate(`!document.querySelector('#pair-interaction')`),'disconnect cancels');
 await start('heart');
 assert.equal(await evaluate(`document.querySelectorAll('.pair-heart').length`),3);
 await until(()=>evaluate(`Array.from(document.querySelectorAll('#visitor-stage video')).some(v=>v.style.visibility==='visible'&&v.currentTime>0)`),'guest playback');
 const geo=await evaluate(`(()=>{const a=document.querySelector('#stage').getBoundingClientRect(),b=document.querySelector('#visitor-stage').getBoundingClientRect();return {distance:(b.left+b.width/2)-(a.left+a.width/2),left:a.left,right:b.right,w:innerWidth,bottom:b.bottom,h:innerHeight}})()`);
 assert.ok(geo.left>=0&&geo.distance<geo.w*.38&&geo.distance>geo.w*.30&&geo.right<=geo.w&&geo.bottom<=geo.h,'closer paired slots contained in canvas');
 const checkCaption=async who=>{
  const result=await evaluate(`(()=>{const c=document.querySelector('.pair-caption:not([hidden])'),s=document.querySelector('${who==='host'?'#stage':'#visitor-stage'}'),r=c.getBoundingClientRect(),b=s.getBoundingClientRect();return {speaker:c.dataset.speaker,delta:Math.abs(r.left+r.width/2-b.left-b.width/2),top:r.bottom,head:b.top+b.height*.35}})()`);
  assert.equal(result.speaker,who);assert.ok(result.delta<3,'bubble follows its speaker');assert.ok(result.top<result.head,'bubble sits near head');
 };
 await checkCaption('host');
 await fs.mkdir(path.join(root,'.superpowers/pair-preview'),{recursive:true});
 await wait(700); win.webContents.invalidate(); await wait(100);
 await fs.writeFile(path.join(root,'.superpowers/pair-preview/heart.png'),(await win.webContents.capturePage()).toPNG());
 await wait(2400);
 assert.equal(await evaluate(`(()=>{const v=[...document.querySelectorAll('#visitor-stage video')].find(v=>v.style.visibility==='visible');return !!v&&!v.ended&&!v.paused})()`),true,'short guest expression replays instead of freezing on its last frame');
 await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='1'`),'partner heart response');
 assert.equal(await evaluate(`document.querySelector('#pair-interaction').dataset.guestAction`),'st_heart'); await checkCaption('guest');
 await until(()=>evaluate(`!document.querySelector('#pair-interaction')&&!document.body.classList.contains('pair-returning')&&!document.body.classList.contains('pair-arriving')`),'natural completion');
 assert.ok(Math.abs(win.getBounds().width-360)<=1,'natural exit restores width within Windows DPI rounding'); assert.ok(concealedResizes>0,'natural exit waits for hidden resize');
 await start('tea');
 await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='1'`),'tea second beat');
 assert.deepEqual(await evaluate(`(()=>{const p=document.querySelector('#pair-interaction');return [p.dataset.hostAction,p.dataset.guestAction,document.body.classList.contains('flip-host'),document.body.classList.contains('flip-visitor')]})()`),['tea','st_tea',true,true]);
 await wait(600);
 await fs.writeFile(path.join(root,'.superpowers/pair-preview/tea.png'),(await win.webContents.capturePage()).toPNG());
 const b=await evaluate(`(()=>{const b=[...document.querySelectorAll('.pair-toolbar button')].find(b=>b.textContent==='换边').getBoundingClientRect();return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)}})()`);
 win.webContents.sendInputEvent({type:'mouseDown',button:'left',...b,clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',button:'left',...b,clickCount:1});
 await until(()=>evaluate(`document.body.classList.contains('pair-swapped')`),'native swap click'); await checkCaption('guest');
 assert.equal(await evaluate(`document.body.classList.contains('flip-host')`),false);
 await end();
 await start('chat'); await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='1'`),'chat partner turn');
 assert.equal(await evaluate(`document.querySelector('.pair-effects').dataset.effect`),'guest-talk');await end();
 await start('wave'); await until(()=>evaluate(`document.querySelector('#pair-interaction')?.dataset.beat==='1'`),'wave response');await end();
 await start('heart');active=guest;win.webContents.send('characters:activated',guest);
 await until(()=>evaluate(`!document.querySelector('#pair-interaction')`),'switch character cancellation');
 assert.equal(await evaluate(`document.querySelectorAll('#visitor-stage video').length`),0);
 active=host;win.webContents.send('characters:activated',host);await wait(200);
 delayList=500;win.webContents.send('pet:menuCommand',{type:'pair',kind:'heart',guestId:'guest'});await wait(100);
 win.webContents.send('pet:menuCommand',{type:'pairEnd'});await wait(700);
 assert.equal(await evaluate(`!!document.querySelector('#pair-interaction')`),false,'cancel invalidates pending character lookup');delayList=0;
 await start('chat');
 win.webContents.send('agent:status',{activity:'working',sessions:1});await end();await wait(200);
 assert.equal(await evaluate(`Array.from(document.querySelectorAll('#stage video')).find(v=>v.style.visibility==='visible')?.src.includes('/tea.webm')`),true,'restore latest agent work state');
 win.webContents.send('agent:status',{activity:'idle',sessions:0});
 await start('heart');
 const drag=await evaluate(`(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
 win.webContents.sendInputEvent({type:'mouseDown',...drag,button:'left',clickCount:1});await wait(60);
 win.webContents.sendInputEvent({type:'mouseMove',x:drag.x+45,y:drag.y,button:'left'});await wait(60);
 win.webContents.sendInputEvent({type:'mouseUp',x:drag.x+45,y:drag.y,button:'left',clickCount:1});
 await until(()=>evaluate(`!document.querySelector('#pair-interaction')`),'drag interruption');
 await start('tea');win.setBounds({width:360,height:180});await wait(200);
 const controls=await evaluate(`Array.from(document.querySelectorAll('.pair-toolbar button')).map(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})`);
 assert.ok(controls.every(Boolean),'toolbar fits small pet');await end();
 await start('heart');win.webContents.send('garden:performance','tea');await wait(200);
 assert.equal(await evaluate(`!!document.querySelector('#pair-interaction')`),false,'garden interrupts');
 if(process.env.QBOT_QA_PAIR_GUEST){
  win.webContents.send('garden:performance',null);await wait(100);
  realGuestDir=path.resolve(process.env.QBOT_QA_PAIR_GUEST);
  guest.manifest=JSON.parse(await fs.readFile(path.join(realGuestDir,'manifest.json'),'utf8'));
  await start('heart');
  await until(()=>evaluate(`Array.from(document.querySelectorAll('#visitor-stage video')).some(v=>v.style.visibility==='visible'&&v.currentTime>0)`),'real sticker guest playback');
  await wait(1000);win.webContents.invalidate();await wait(100);
  await fs.writeFile(path.join(root,'.superpowers/pair-preview/real-guest.png'),(await win.webContents.capturePage()).toPNG());
  console.log('Real guest actions:',await evaluate(`JSON.stringify(document.querySelector('#pair-interaction').dataset)`));
  await end();
 }
 console.log('PASS: eight network interactions in both roles, both videos playing, four local rehearsals, independent clips/facing, partner response, native swap, natural finish, character/garden interruption, stale request cancellation');
 peer.destroy();win.destroy();app.quit();
}catch(e){console.error(e);app.exit(1)}});
