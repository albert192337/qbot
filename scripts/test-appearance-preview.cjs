// Offline, read-only character assets; no formal app, social messages, or economic writes.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/appearance-preview'),preview=process.argv.includes('--preview');
app.setPath('userData',path.join(out,'profile',preview?'trial':'test-'+process.pid));
app.commandLine.appendSwitch('force-device-scale-factor','1');
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true,corsEnabled:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{let win;try{
  await fs.mkdir(out,{recursive:true});
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  const candidates=[
    ['spine-zhang',path.join(root,'app/resources/presets/spine-zhangqiling')],
    ['spine-wu',path.join(root,'app/resources/presets/spine-wuxie')],
    ['zhang',path.join(process.env.APPDATA,'@qbot/app/characters/53ed5068-dd60-4e2a-82c7-fb94250369d1')],
    ['mascot',path.join(root,'app/resources/presets/mascot')],
    ['dog',path.join(process.env.APPDATA,'@qbot/app/characters/8cfc5f76-2d6f-448b-9274-e9d0a51ea61c')],
  ];
  const chars=[],bases=new Map();
  for(const [id,base] of candidates){try{const manifest=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'));if(manifest.spine||manifest.actions.idle?.webm){chars.push({dirId:id,manifest});bases.set(id,base);}}catch{}}
  protocol.handle('qbot-asset',async req=>{
    const u=new URL(req.url),base=bases.get(u.hostname);if(!base)return new Response(null,{status:403});
    const file=path.resolve(base,decodeURIComponent(u.pathname).replace(/^\//,''));
    if(!file.startsWith(base+path.sep))return new Response(null,{status:403});
    try{return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.webm')?'video/webm':'image/png','Access-Control-Allow-Origin':'*'}});}catch{return new Response(null,{status:404});}
  });
  ipcMain.handle('characters:list',()=>chars);
  ipcMain.handle('pet:getCursor',()=>({x:0,y:0}));
  win=new BrowserWindow({width:1180,height:820,useContentSize:true,show:preview,title:'月蚀 · 外观试衣间',backgroundColor:'#13131b',autoHideMenuBar:true,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,offscreen:!preview,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
  const js=s=>win.webContents.executeJavaScript(s);
  const until=async(s,label)=>{for(let i=0;i<160;i++){if(await js(s))return;await wait(75);}throw Error(label+' '+await js('document.body.dataset.error'));};
  const shot=async name=>fs.writeFile(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
  await win.loadFile(path.join(root,'app/out/renderer/appearance-preview/index.html'),{query:{appearance:process.argv[process.argv.indexOf('--appearance')+1]??''}});
  if(!preview)await js("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});void 0");
  await until("document.body.dataset.ready==='true'",'ready');
  if(preview){win.show();win.focus();await fs.writeFile(path.join(out,'preview-ready.json'),JSON.stringify({pid:process.pid,visible:win.isVisible(),characters:chars.map(c=>c.manifest.name)}));return;}
  await js('window.appearancePreview.play()');await wait(600);await shot('01-portal-open');
  await wait(600);await shot('02-emergence');
  assert.ok(await js('window.appearancePreview.stats().portal'),'portal visible during entry');
  await until('!window.appearancePreview.stats().portal','entry ends');
  assert.equal(await js('window.appearancePreview.stats().actor.alpha'),1);
  await js("window.appearancePreview.mode('footprints')");await wait(1800);await shot('03-footprints');
  const feet=await js('window.appearancePreview.stats().feet');assert.ok(feet.length>=3,'footprints are emitted');
  await wait(100);const after=await js('window.appearancePreview.stats().feet');assert.equal(after[0].originX,feet[0].originX,'petal origins stay in scene coordinates');
  assert.equal(await js('window.appearancePreview.stats().backend'), 'spine');
  assert.equal(await js('window.appearancePreview.stats().pose.action'), 'walk');
  assert.ok(await js('window.appearancePreview.stats().landingCount>=2'), 'Spine footfall driven petals');
  await until('!window.appearancePreview.stats().walk&&window.appearancePreview.stats().traces===0','footprints expire');
  await js("window.appearancePreview.mode('echo')");await wait(1000);await shot('04-echo-demo');
  assert.ok(await js('window.appearancePreview.stats().ghosts>1'),'actual frame echoes');
  await until('!window.appearancePreview.stats().demoDrag&&window.appearancePreview.stats().traces===0','echoes expire');
  const start=await js("(()=>{const r=document.querySelector('#scene').getBoundingClientRect(),a=window.appearancePreview.stats().actor;return{x:r.left+a.x,y:r.top+a.y-120}})()");
  win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:Math.round(start.x),y:Math.round(start.y)});
  for(let i=1;i<=14;i++){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x-i*15),y:Math.round(start.y-30*Math.sin(i/14*Math.PI))});await wait(35);}
  assert.ok(await js('window.appearancePreview.stats().drag&&window.appearancePreview.stats().ghosts>0'),'native pointer dragging emits echoes');await shot('05-native-drag');
  win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:Math.round(start.x-210),y:Math.round(start.y)});
  await until('window.appearancePreview.stats().traces===0','release cleans up echoes');
  await js("document.querySelector('#reduced').click();window.appearancePreview.play()");await wait(250);
  assert.ok(await js('window.appearancePreview.stats().reduced&&!window.appearancePreview.stats().portal&&window.appearancePreview.stats().traces===0'));
  await js("document.querySelector('#reduced').click();window.appearancePreview.mode('portal');window.appearancePreview.mode('echo');window.appearancePreview.mode('footprints')");await wait(350);
  assert.equal(await js('window.appearancePreview.stats().ghosts'),0,'mode changes cancel previous effects');
  await js("document.querySelector('#character').value='mascot';document.querySelector('#character').dispatchEvent(new Event('change'));void 0");
  await until("document.body.dataset.ready==='true'",'character switch');
  await js("window.appearancePreview.mode('portal')");await wait(1200);await shot('06-mascot-portal');
  await js("document.querySelector('#backdrop').click()");await wait(300);await shot('07-light-background');
  await js("document.querySelector('#character').value='zhang';document.querySelector('#character').dispatchEvent(new Event('change'));void 0");
  await until("document.body.dataset.ready==='true'",'video Zhang');
  await js("document.body.classList.remove('light');window.appearancePreview.edgePreview(false,2.0)");await wait(250);await shot('09-video-original');
  await js("window.appearancePreview.edgePreview(true)");await wait(250);await shot('10-video-cleaned');
  await js("document.body.classList.add('light')");await wait(200);await shot('11-video-cleaned-light');
  win.setContentSize(760,680);await wait(300);assert.ok(await js('document.documentElement.scrollWidth===innerWidth'));await shot('08-small');
  await js("window.appearancePreview.mode('echo')");await wait(300);
  await js("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));void 0");
  assert.ok(await js('!window.appearancePreview.stats().running&&window.appearancePreview.stats().traces===0'),'hidden scene releases transient effects and stops rendering');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify({ok:true,characters:chars.map(c=>c.manifest.name),checks:['portal opens, character emerges, portal closes','Spine walk footfalls emit petals at skeleton foot positions','blue fire follows movement and fades','native pointer drag','bounded transient lifetime','mode switch cancellation','reduced motion','character switch','dark and light backgrounds','760px layout','hidden rendering pause'],errors},null,2));
  console.log('PASS: appearance preview, 11 behavior and rendering checks');app.quit();
}catch(error){console.error(error);if(win&&!win.isDestroyed())await fs.writeFile(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG());app.exit(1);}});
app.on('window-all-closed',()=>app.quit());
