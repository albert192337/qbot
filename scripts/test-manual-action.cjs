// Run with app/node_modules/electron/cli.js after building the app.
// Real renderer and media, isolated profile, no external network or user data.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),preset=path.join(root,'app/resources/presets/mascot');
app.setPath('userData',path.join(os.tmpdir(),'qbot-manual-action-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{try{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  const manifest=JSON.parse(await fs.readFile(path.join(preset,'manifest.json'),'utf8'));
  protocol.handle('qbot-asset',async req=>{
    const file=path.resolve(preset,decodeURIComponent(new URL(req.url).pathname).replace(/^\//,''));
    if(!file.startsWith(preset+path.sep))return new Response(null,{status:403});
    try{return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.webm')?'video/webm':'image/png'}});}
    catch{return new Response(null,{status:404});}
  });
  const handlers={
    'desktop:get':()=>({hidden:false,peek:null}),
    'overlays:get':()=>({revision:0,winner:null}),
    'social:contacts':()=>({available:false,invitations:[],people:[]}),
    'social:pet':()=>({ok:true}),
    'rooms:getStatus':()=>({phase:'offline'}),
    'garden:weather':()=>({now:Date.now(),current:null,next:null,today:[],forecast:[]}),
    'garden:get':()=>({plots:[]}), 'sign:getMessage':()=>null,'pet:getPerch':()=>null,
    'behavior:getIdlePlan':()=>null,
    'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet',freeMode:true}),
    'progress:get':()=>({points:0,boxes:0,inventory:{},idleMs:0}),
    'characters:getActive':()=>({dirId:'host',manifest}),
    'agent:getStatus':()=>({activity:'idle',sessions:0}),
    'meeting:getStatus':()=>({inMeeting:false}), 'music:getStatus':()=>({playing:false}),
  };
  for(const [channel,fn] of Object.entries(handlers))ipcMain.handle(channel,fn);
  const win=new BrowserWindow({width:360,height:360,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
  const evaluate=code=>win.webContents.executeJavaScript(code);
  const until=async(code,label,timeout=3000)=>{for(let i=0;i<timeout/50;i++){if(await evaluate(code))return;await wait(50);}throw Error(label);};
  const visible=action=>`[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'&&v.src.includes('/${action}.webm')&&!v.paused&&v.currentTime>0)`;
  const play=async action=>{win.webContents.send('pet:menuCommand',{type:'play',action});await until(visible(action),'manual playback: '+action);};
  await win.loadFile(path.join(root,'app/out/renderer/pet/index.html'));
  await until(visible('idle'),'initial idle');
  // Mouse petting followed by the same menu command twice.
  await evaluate(`(async()=>{for(const x of [90,130,90,130,90]){document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:120}));await new Promise(r=>setTimeout(r,130));}})()`);
  await until(`document.querySelector('#stage').classList.contains('petting')`,'petting starts');
  await play('sleep');
  assert.equal(await evaluate(`document.querySelector('#stage').classList.contains('petting')`),false);
  await wait(700);await play('sleep');
  assert.ok(await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime<0.6`),'same action restarts');
  // A behavior response can arrive after the first manual action. Its lease
  // must not swallow the second command or later restore the cancelled action.
  win.webContents.send('behavior:action',{action:'tea',loops:8});
  await until(visible('tea'),'behavior begins');
  await play('sleep');
  await until(visible('idle'),'manual action completes',12000);
  await play('talk_happy');
  await until(visible('idle'),'subsequent action completes',12000);
  win.webContents.send('pet:perch',{action:'perch_sit'});
  await play('sleep');
  console.log('PASS: petting, repeated menu playback, behavior interruption, completion, subsequent playback and perch interruption');
  app.exit(0);
}catch(error){console.error(error);app.exit(1);}});
