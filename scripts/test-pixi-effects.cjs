// node app/node_modules/electron/cli.js scripts/test-pixi-effects.cjs [--preview]
// Real pet renderer and preload, isolated data, offline event fixtures, no XP writes.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),preview=process.argv.includes('--preview');
const out=path.join(root,'output/pixi-preview'),preset=process.env.QBOT_QA_ASSET_DIR||path.join(root,'app/resources/presets/mascot');
app.setPath('userData',path.join(os.tmpdir(),'qbot-pixi-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
  await fs.mkdir(out,{recursive:true});
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  const manifest=JSON.parse(await fs.readFile(path.join(preset,'manifest.json'),'utf8'));
  protocol.handle('qbot-asset',async req=>{
    const file=path.resolve(preset,decodeURIComponent(new URL(req.url).pathname).replace(/^\//,''));
    if(!file.startsWith(preset+path.sep))return new Response(null,{status:403});
    try{return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.webm')?'video/webm':'image/png'}});}catch{return new Response(null,{status:404});}
  });
  const handlers={
    'desktop:get':()=>({revision:0,hidden:false,hiddenMembers:[],peek:null}),
    'overlays:get':()=>({revision:0,winner:null}),
    'social:contacts':()=>({available:false,invitations:[],people:[]}),
    'social:pet':()=>({ok:true}),'rooms:getStatus':()=>({phase:'offline'}),
    'garden:weather':()=>({now:Date.now(),current:null,next:null,today:[],forecast:[]}),
    'garden:get':()=>({plots:[],activeActor:'pet'}),
    'sign:getMessage':()=>null,'pet:getPerch':()=>null,'behavior:getIdlePlan':()=>null,
    'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet',freeMode:false}),
    'progress:get':()=>({points:0,boxes:0,inventory:{},idleMs:0}),
    'characters:getActive':()=>({dirId:'host',manifest}),
    'agent:getStatus':()=>({activity:'idle',sessions:0}),
    'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false}),
  };
  for(const [channel,fn] of Object.entries(handlers))ipcMain.handle(channel,fn);
  await fs.mkdir(path.join(out,'profile'),{recursive:true});
  const preload=path.join(out,'profile','preview-preload.cjs');
  await fs.writeFile(preload,(await fs.readFile(path.join(root,'app/out/preload/index.js'),'utf8'))+
    '\nrequire("electron").contextBridge.exposeInMainWorld("fxDemo",{play:kind=>require("electron").ipcRenderer.send("fx:demo",kind)});');
  const win=new BrowserWindow({width:460,height:560,useContentSize:true,show:preview,frame:preview,transparent:!preview,title:'QBot · PixiJS 动效试用',
    webPreferences:{preload,backgroundThrottling:false,offscreen:!preview}});
  const errors=[];win.webContents.on('console-message',(_e,_level,msg)=>{if(msg.includes('[pet-effects]'))errors.push(msg);});
  const js=code=>win.webContents.executeJavaScript(code);
  const until=async(code,label)=>{for(let i=0;i<120;i++){if(await js(code))return;await wait(50);}throw Error(label);};
  const sendUpgrade=(from=10,to=30,actor='pet')=>win.webContents.send('garden:interaction',{kind:'feed',effect:'',caption:`+${to-from} 经验`,experience:{actor,from,to}});
  let demoTimer;
  const demo=kind=>{
    clearInterval(demoTimer);
    if(kind==='star')sendUpgrade();
    else if(kind==='heart'){
      win.webContents.send('social:pet','start');let n=0;
      demoTimer=setInterval(()=>{win.webContents.send('social:pet',++n<8?'keep':'end');if(n>=8)clearInterval(demoTimer);},250);
    }
  };
  ipcMain.on('fx:demo',(_e,kind)=>demo(kind));
  await win.loadFile(path.join(root,'app/out/renderer/pet/index.html'));
  await js("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});void 0");
  await win.webContents.insertCSS('html,body{background:radial-gradient(ellipse at 50% 40%,#3d5366,#172331)!important;color:#fff!important}#stage{width:400px;height:400px;margin:10px auto 0}#pet-hud{display:none!important}.fx-controls{position:fixed;bottom:16px;left:0;right:0;text-align:center;font:13px system-ui;z-index:10}.fx-controls p{color:#c2d0dc}.fx-controls button{border:1px solid #ffffff30;background:#364959!important;color:#fff!important;border-radius:20px;padding:10px 22px;margin:0 5px;cursor:pointer}');
  await js(`Object.assign(document.querySelector('#stage').style,{width:'400px',height:'400px',margin:'10px auto 0'});const controls=document.createElement('section');controls.className='fx-controls';controls.innerHTML='<p>在角色身上来回摸摸，或点击试试看</p><button data-fx="heart">♡ 摸摸爱心</button><button data-fx="star">✦ 升级星光</button><p>独立试用 · 不消耗物品，也不改变经验</p>';controls.querySelectorAll('button').forEach(b=>b.onclick=()=>window.fxDemo.play(b.dataset.fx));document.body.append(controls);void 0`);
  await until("[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'&&v.readyState>=2)",'pet video ready');
  await wait(200);
  if(preview){win.show();win.focus();await fs.writeFile(path.join(out,'preview-ready.json'),JSON.stringify({pid:process.pid,visible:win.isVisible(),title:win.getTitle()}));demo('heart');win.on('closed',()=>{clearInterval(demoTimer);app.quit();});return;}
  const running="document.querySelector('.pet-interaction-effects')?.dataset.running==='true'";
  const stopped="document.querySelector('.pet-interaction-effects')?.dataset.running==='false'";
  assert.equal(await js("!!document.querySelector('.pet-interaction-effects')"),false,'no GPU layer before interaction');
  // Cancel the first request while lazy loading is still in flight.
  win.webContents.send('social:pet','start');win.webContents.send('social:pet','end');
  await wait(1000);assert.equal(await js(running),false,'cancelled lazy load never replays');
  for(const x of [170,220,170,220]){
    await js(`document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:${x},clientY:180}));void 0`);await wait(140);
  }
  await until(running,'hearts on real petting gesture');
  for(let i=0;i<4;i++){await js(`document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:${i%2?190:220},clientY:180}));void 0`);await wait(160);}
  assert.equal(await js("getComputedStyle(document.querySelector('.pet-interaction-effects')).pointerEvents"),'none');
  await fs.writeFile(path.join(out,'hearts.png'),(await win.webContents.capturePage()).toPNG());
  await js("document.querySelector('#stage').dispatchEvent(new PointerEvent('pointerleave'));void 0");
  await until(stopped,'heart cleanup after leaving');
  sendUpgrade(1,2);await wait(200);assert.equal(await js(running),false,'ordinary XP does not celebrate level');
  sendUpgrade(10,30,'someone-else');await wait(200);assert.equal(await js(running),false,'other character XP ignored');
  sendUpgrade();await until(running,'upgrade particles');await wait(350);
  await fs.writeFile(path.join(out,'level-up.png'),(await win.webContents.capturePage()).toPNG());
  assert.ok(await js("Number(document.querySelector('.pet-interaction-effects').dataset.particles)<=64"));
  await js("document.querySelector('#stage').style.width='260px';document.querySelector('#stage').style.height='260px';void 0");await wait(80);
  assert.equal(await js("Math.round(document.querySelector('.pet-interaction-effects').getBoundingClientRect().width)"),260,'tracks resized pet');
  await until(stopped,'ticker stops after all particles expire');
  const idleCpu=app.getAppMetrics().map(m=>({type:m.type,cpu:m.cpu.percentCPUUsage}));
  sendUpgrade();await until(running,'second upgrade');
  win.webContents.send('characters:activated',{dirId:'other',manifest});await until(stopped,'character switch clears particles');
  sendUpgrade();await until(running,'third upgrade');
  await js("document.body.classList.add('desktop-hidden');void 0");await until(stopped,'hide clears particles');
  await js("document.body.classList.remove('desktop-hidden');void 0");await wait(100);assert.equal(await js(running),false,'show does not replay');
  await win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await wait(100);sendUpgrade();win.webContents.send('social:pet','start');await wait(250);
  assert.equal(await js(running),false,'reduced motion suppresses both effects');
  win.webContents.debugger.detach();
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify({passed:true,checks:['gesture hearts','lazy cancellation','pointer passthrough','XP threshold and actor','resize','idle ticker stopped','switch and hide cleanup','reduced motion'],idleCpu},null,2));
  console.log('PASS PixiJS effects: real renderer, gesture, level up, cancellation, resize, idle stop, reduced motion.');
  app.quit();
}catch(error){console.error(error);app.exit(1);}});
