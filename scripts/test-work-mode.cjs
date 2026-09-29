// Run with app/node_modules/electron/cli.js after building the app.
// Real renderer and media, isolated profile, no external network or user data.
const {app,BrowserWindow,ipcMain,protocol,session,Menu,powerMonitor}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const trial=process.argv.includes('--preview');
const preset=trial?path.join(process.env.APPDATA,'@qbot/app/characters/53ed5068-dd60-4e2a-82c7-fb94250369d1'):path.join(root,'app/resources/presets/mascot');
let idle=10000;
app.setPath('userData',path.join(os.tmpdir(),'qbot-work-mode-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{try{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  const manifest=JSON.parse(await fs.readFile(path.join(preset,'manifest.json'),'utf8'));
  manifest.customActions={...manifest.customActions};
  for(const id of ['computer_idle','computer_typing'])manifest.customActions[id]={webm:'actions/'+id+'.webm',gif:'actions/'+id+'.gif',durationSec:5,status:'done'};
  protocol.handle('qbot-asset',async req=>{
    const file=path.resolve(preset,decodeURIComponent(new URL(req.url).pathname).replace(/^\//,''));
    if(!file.startsWith(preset+path.sep))return new Response(null,{status:403});
    const asset=['computer_idle.webm','computer_typing.webm'].includes(path.basename(file)) ? path.join(root,'output/work-mode',path.basename(file)) : file;
    try{return new Response(await fs.readFile(asset),{headers:{'Content-Type':file.endsWith('.webm')?'video/webm':'image/png'}});}
    catch{return new Response(null,{status:404});}
  });
  const handlers={
    'pet:workIdleMs':()=>trial?(powerMonitor.getSystemIdleState(15)==='locked'?15:powerMonitor.getSystemIdleTime()*1000):idle,
    'desktop:get':()=>({revision:0,hidden:false,hiddenMembers:[],peek:null}),
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
  const win=new BrowserWindow({width:420,height:420,show:trial,frame:!trial,transparent:trial,alwaysOnTop:trial,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:!trial,backgroundThrottling:false}});
  ipcMain.on('pet:move',(_e,x,y)=>win.setPosition(Math.round(x),Math.round(y)));
  ipcMain.on('pet:popupMenu',(_e,actions,working)=>Menu.buildFromTemplate([
    {label:working?'结束一起工作':'一起工作（键鼠联动）',click:()=>win.webContents.send('pet:menuCommand',{type:'workMode'})},
    {label:'关闭试用',click:()=>app.quit()}
  ]).popup({window:win}));
  const evaluate=code=>win.webContents.executeJavaScript(code);
  const until=async(code,label,timeout=3000)=>{for(let i=0;i<timeout/50;i++){if(await evaluate(code))return;await wait(50);}throw Error(label);};
  const visible=action=>action==='computer_idle'?`[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'&&v.src.includes('/computer_typing.webm')&&v.paused&&v.classList.contains('work-breathing'))`:`[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'&&v.src.includes('/${action}.webm')&&!v.paused&&v.currentTime>0)`;
  const play=async action=>{win.webContents.send('pet:menuCommand',{type:'play',action});await until(visible(action),'manual playback: '+action);};
  const doubleClick=async()=>{
    const point=await evaluate(`(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
    for(let n=0;n<2;n++){
      win.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:n+1});
      win.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:n+1});
      await wait(60);
    }
  };
  await win.loadFile(path.join(root,'app/out/renderer/pet/index.html'));
  await until(visible('idle'),'initial idle');
  await until(`document.querySelector('#stage').getBoundingClientRect().width>0`,'desktop visible before pointer testing');
  await evaluate(`window.workPointerLog=[];for(const event of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,e=>window.workPointerLog.push({event,primary:e.isPrimary,button:e.button,id:e.pointerId,target:e.target.className}),true)`);
  await doubleClick();
  try{await until(visible('computer_idle'),'work idle starts');}catch(e){console.log(await evaluate(`({events:window.workPointerLog,stage:document.querySelector('#stage').getBoundingClientRect().toJSON(),body:document.body.className,center:document.elementFromPoint(210,210)?.outerHTML.slice(0,250)})`));throw e;}
  if(trial){console.log('Interactive Zhang Qiling trial: right click to stop or close.');return;}
  const entryTime=await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`);
  assert.equal(entryTime,0,'entry loads a still frame without playing');
  await wait(500);
  assert.equal(await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`),entryTime,'no automatic playback after entry');
  idle=0;await until(visible('computer_typing'),'input starts typing');
  await fs.writeFile(path.join(root,'output/work-mode/desktop.png'),(await win.webContents.capturePage()).toPNG());
  const alpha=await evaluate(`(()=>{const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible');const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');ctx.drawImage(v,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;return {corner:p[3],bottomLeft:p[((c.height-1)*c.width)*4+3],bottomRight:p[p.length-1],center:p[((Math.floor(c.height/2)*c.width)+Math.floor(c.width/2))*4+3]};})()`);
  assert.equal(alpha.corner,0,'transparent background');assert.equal(alpha.bottomLeft,0,'transparent lower left');assert.equal(alpha.bottomRight,0,'transparent lower right');assert.ok(alpha.center>245,'opaque face');
  await wait(800);const time=await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`);
  assert.ok(time>0.5,'polling must not restart video');
  win.webContents.send('behavior:action',{action:'tea',loops:8});await wait(300);
  assert.equal(await evaluate(visible('computer_typing')),true,'behavior must not interrupt work');
  const beforeStop=await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`);
  const stopAt=Date.now();idle=101;await until(visible('computer_idle'),'pause returns to computer idle');
  const stopLatencyMs=Date.now()-stopAt;
  assert.ok(stopLatencyMs<200,'stop must be observed within 200ms');
  const frozen=await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`);
  assert.ok(frozen>=beforeStop&&frozen-beforeStop<0.2,'no timeline reset on stop');
  await wait(250);assert.equal(await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`),frozen,'hands remain frozen');
  const idleAlpha=await evaluate(`(()=>{const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible');const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');ctx.drawImage(v,0,0);return [[0,0],[c.width-1,0],[0,c.height-1],[c.width-1,c.height-1]].map(([x,y])=>ctx.getImageData(x,y,1,1).data[3])})()`);
  assert.deepEqual(idleAlpha,[0,0,0,0],'all idle corners must be transparent');
  await fs.writeFile(path.join(root,'output/work-mode/fast-idle.png'),(await win.webContents.capturePage()).toPNG());
  idle=0;await until(visible('computer_typing'),'resume typing');
  const resumed=await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`);
  assert.ok(resumed>=frozen&&resumed-frozen<0.2,'resume must continue from frozen frame');
  await fs.writeFile(path.join(root,'output/work-mode/fast-stop-verification.json'),JSON.stringify({stopLatencyMs,beforeStop,frozen,resumed,pausedFrameStable:true},null,2));
  await doubleClick();await until(visible('idle'),'double click exits and restores normal idle');
  await wait(300);assert.equal(await evaluate(visible('computer_typing')),false);
  idle=10000;
  for(let n=0;n<3;n++){
    await doubleClick();await until(visible('computer_idle'),'warm reentry shows the still computer frame');
    await wait(150);assert.equal(await evaluate(`[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').currentTime`),0);
    idle=0;await until(visible('computer_typing'),'warm reentry resumes on input');
    await wait(200);await doubleClick();await until(visible('idle'),'warm reentry exits');idle=10000;
  }
  idle=0;
  win.webContents.send('pet:menuCommand',{type:'workMode'});await until(visible('computer_typing'),'reenter');
  await play('sleep');
  win.webContents.send('pet:menuCommand',{type:'workMode'});await until(visible('computer_typing'),'reenter after manual playback');
  win.webContents.send('characters:activated',{dirId:'other',manifest});await until(visible('idle'),'character switch exits work');
  console.log('PASS: real media typing/idle transitions, uninterrupted continuous playback, behavior priority, exit/reentry, manual playback and character switch');
  app.exit(0);
}catch(error){console.error(error);app.exit(1);}});
