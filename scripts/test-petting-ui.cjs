const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const {mkdtemp,mkdir,rm,readFile}=require('node:fs/promises');
const {spawn}=require('node:child_process');const path=require('node:path');const os=require('node:os');const net=require('node:net');
const root=path.resolve(__dirname,'..');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-petting-ui-'));const output=path.join(root,'.superpowers/petting-preview');await mkdir(output,{recursive:true});
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:path.join(data,'server')},stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);
 let app, friendSocket;
 try{
  await new Promise((resolve,reject)=>{const end=Date.now()+5000;const timer=setInterval(()=>{if(log.includes('listening')){clearInterval(timer);resolve();}else if(Date.now()>end){clearInterval(timer);reject(Error(log));}},30);});
  await require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild').build({entryPoints:[path.join(root,'app/test/fixtures/social-main.ts')],outfile:path.join(root,'app/out/main/social-qa.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron','ffmpeg-static']});
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/out/main/social-qa.cjs')],env:{...process.env,QBOT_QA_ROOT:root,QBOT_QA_DATA:data,QBOT_ROOMS_URL:`ws://127.0.0.1:${port}`}});
  const page=await app.firstWindow();page.setDefaultTimeout(10000);const errors=[];app.on('window',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#my-character strong').waitFor();await page.screenshot({path:path.join(output,'01-home.png')});
  await page.locator('[data-page=test]').click();await page.locator('.guest-card').first().waitFor();assert.equal(await page.locator('.guest-card').count(),2);
  await page.locator('#start-test').click();await page.waitForFunction(()=>document.querySelector('#room-summary').textContent.includes('本地试演'));
  await page.locator('.guest-card button').first().click();await page.locator('.test-member').waitFor();
  let cache=await page.evaluate(()=>window.qbot.rooms.getCache());assert.equal(cache.room.members.length,2);assert.equal(cache.room.testing,true);
  let pet;for(let i=0;i<100&&!pet;i++){pet=app.windows().find(p=>p.url().includes('roomPet=1'));if(!pet)await new Promise(r=>setTimeout(r,100));}
  assert.ok(pet);await pet.waitForFunction(()=>[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'));
  const before=(await page.evaluate(()=>window.qbot.rooms.getCache())).chat.length;
  async function hover(xs,buttons=0){for(const x of xs){await pet.evaluate(({x,buttons})=>document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:140,buttons})),{x,buttons});await new Promise(r=>setTimeout(r,130));}}
  await hover([100,130,160,190]);assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).chat.length,before);
  await pet.evaluate(()=>document.querySelector('#stage').dispatchEvent(new PointerEvent('pointerleave')));
  await hover([100,140,100,140],1);assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).chat.length,before);
  await hover([100,140,100,140]);
  await pet.waitForFunction(()=>document.querySelector('#stage').classList.contains('petting'));
  const style=await pet.evaluate(()=>({cursor:getComputedStyle(document.querySelector('#stage')).cursor,animation:getComputedStyle(document.querySelector('#stage video')).animationName}));
  assert.ok(style.cursor.includes('data:image/svg+xml'));assert.equal(style.animation,'petting-nuzzle');
  for(let i=0;i<18;i++){
    await hover([100,140]);
    assert.equal(await pet.locator('#stage').evaluate(e=>e.classList.contains('petting')),true);
    assert.equal(await pet.evaluate(()=>[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible')?.loop),true);
    await new Promise(r=>setTimeout(r,250));
  }
  assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).chat.length,before+1);
  await page.waitForFunction(()=>document.querySelector('#room-summary').textContent.includes('本地试演'));
  cache=await page.evaluate(()=>window.qbot.rooms.getCache());assert.equal(cache.chat.length,before+1);assert.equal(cache.chat.at(-1).interaction,'petting');assert.ok(cache.chat.at(-1).text.includes('轻轻摸了摸'));
  await pet.screenshot({path:path.join(output,'petting.png')});
  await hover([100,140,100,140]);assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).chat.length,before+1);
  await pet.waitForFunction(()=>!document.querySelector('#stage').classList.contains('petting'));
  await page.evaluate(()=>window.qbot.social.openChat());
  const chat=app.windows().find(p=>p.url().includes('compact=1'))||await app.waitForEvent('window');
  await chat.locator('.interaction-message').waitFor();assert.ok((await chat.locator('.interaction-message p').innerText()).includes('轻轻摸了摸'));
  await chat.screenshot({path:path.join(output,'petting-chat.png')});
  await pet.emulateMedia({reducedMotion:'reduce'});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('roomPet=1')).webContents.send('social:pet'));
  await pet.waitForFunction(()=>document.querySelector('#stage').classList.contains('petting'));
  assert.equal(await pet.evaluate(()=>getComputedStyle(document.querySelector('#stage video')).animationName),'none');
  await pet.evaluate(()=>document.querySelector('#stage').dispatchEvent(new PointerEvent('pointerdown',{button:2})));
  assert.equal(await pet.locator('#stage').evaluate(e=>e.classList.contains('petting')),false);
  const manifest=JSON.parse(await readFile(path.join(root,'app/resources/presets/mascot/manifest.json'),'utf8'));
  await app.evaluate(({ipcMain},manifest)=>{
    const handlers={
      'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet'}),
      'characters:getActive':()=>({dirId:'host',manifest}),
      'pet:getPerch':()=>null,'behavior:getIdlePlan':()=>null,'sign:getMessage':()=>null,
      'agent:getStatus':()=>({activity:'idle',sessions:0}),'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false}),
      'progress:get':()=>({points:0,boxes:0,inventory:{},idleMs:0,lastTickAt:Date.now()}),
      'garden:get':()=>({plots:[]}),'garden:weather':()=>({now:Date.now(),next:{kind:'sunny',start:Date.now()+1000}}),
    };
    for(const [name,handler] of Object.entries(handlers)){ipcMain.removeHandler(name);ipcMain.handle(name,handler);}
    globalThis.qa.Windows.createPetWindow().showInactive();
  },manifest);
  let self;for(let i=0;i<100&&!self;i++){self=app.windows().find(p=>p.url().includes('/pet/index.html')&&!p.url().includes('roomPet'));if(!self)await new Promise(r=>setTimeout(r,100));}
  assert.ok(self);await self.waitForFunction(()=>[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'));
  for(const x of [100,140,100,140]){await self.evaluate(x=>document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:140})),x);await new Promise(r=>setTimeout(r,130));}
  await self.waitForFunction(()=>document.querySelector('#stage').classList.contains('petting'));
  assert.ok((await page.evaluate(()=>window.qbot.rooms.getCache())).chat.at(-1).text.includes('摸了摸自己的桌宠'));
  for(let i=0;i<10;i++){
    await self.evaluate(x=>document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:140})),i%2?100:140);
    await new Promise(r=>setTimeout(r,400));
    assert.equal(await self.locator('#stage').evaluate(e=>e.classList.contains('petting')),true);
    assert.equal(await self.evaluate(()=>[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible')?.loop),true);
  }
  await self.screenshot({path:path.join(output,'petting-self.png')});
  await self.evaluate(()=>document.querySelector('#stage').dispatchEvent(new PointerEvent('pointerleave')));
  await self.waitForFunction(()=>!document.querySelector('#stage').classList.contains('petting'));
  await self.waitForFunction(()=>[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'&&v.src.includes('idle.webm')));
  console.log('PASS: own pet uses real local renderer/IPC and records self-petting.');
  console.log('PASS: production peer renderer/preload/IPC/test-room chat, hover discrimination, cute cursor, reaction, cooldown, history UI, reduced motion and pointer cancellation.');
 }finally{if(friendSocket)friendSocket.close();if(app)await app.close();proc.kill();await new Promise(r=>proc.exitCode!==null?r():proc.once('exit',r));await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
