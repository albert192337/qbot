// Real renderer + real marketplace media + isolated local service; transcript and screenshots are retained.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const net=require('node:net');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.superpowers/companion-petting');
const playwright=process.env.PLAYWRIGHT_MODULE||'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {_electron:electron}=require(playwright);const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'qbot-companion-review-'));
 const market=path.join(data,'market');await fs.mkdir(market);
 const preset=path.join(root,'app/resources/presets/mascot');
 for(let i=0;i<6;i++){
   const manifest=JSON.parse(await fs.readFile(path.join(preset,'manifest.json'),'utf8'));manifest.name='隔离陪伴角色'+i;
   manifest.actions=Object.fromEntries(Object.entries(manifest.actions).filter(([id])=>['idle','talk_happy','wave'].includes(id)));
   const assets=[...new Set([manifest.sourceImage,...Object.values(manifest.actions).map(a=>a.webm)].filter(Boolean))];
   const entries=[{path:'manifest.json',bytes:Buffer.from(JSON.stringify(manifest))}];
   for(const file of assets)entries.push({path:file,bytes:await fs.readFile(path.join(preset,file))});
   const header=Buffer.from(JSON.stringify({files:entries.map(e=>({path:e.path,size:e.bytes.length}))}));const size=Buffer.alloc(4);size.writeUInt32BE(header.length);
   const buffer=Buffer.concat([size,header,...entries.map(e=>e.bytes)]),hash=require('node:crypto').createHash('sha256').update(buffer).digest('hex').slice(0,16);
   await fs.mkdir(path.join(market,hash));await fs.writeFile(path.join(market,hash,'pack.bin'),buffer);
 }

 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:path.join(data,'server'),QBOT_COMPANIONS:'1',QBOT_COMPANION_MARKET_DIR:market},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let logs='',app;proc.stdout.on('data',b=>logs+=b);proc.stderr.on('data',b=>logs+=b);
 const transcript=[];
 try{
  for(let i=0;i<100&&!logs.includes('listening');i++)await delay(50);assert.match(logs,/residents=6 rooms=3/);
  await require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild').build({entryPoints:[path.join(root,'app/test/fixtures/social-main.ts')],outfile:path.join(root,'app/out/main/companion-petting-qa.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron','ffmpeg-static']});
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/out/main/companion-petting-qa.cjs')],env:{...process.env,QBOT_QA_ROOT:root,QBOT_QA_DATA:data,QBOT_QA_COMPANIONS:'1',QBOT_ROOMS_URL:`ws://127.0.0.1:${port}`}});
  const page=await app.firstWindow();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));app.on('window',p=>p.on('pageerror',e=>errors.push(e.message)));
  await page.locator('#my-character strong').waitFor();await page.locator('[data-page=world]').click();await page.locator('.room-card').first().waitFor();
  const card=page.locator('.room-card').filter({hasText:'翻页声自习室'});await card.locator('[data-join]').click();
  let pet;for(let i=0;i<200&&!pet;i++){pet=app.windows().find(p=>p.url().includes('roomPet=1'));if(!pet)await delay(100);}
  assert.ok(pet);await pet.waitForFunction(()=>[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'));
  assert.equal((await pet.evaluate(()=>window.qbot.roomPet.getCache())).state.mode,'working');
  const hover=async xs=>{for(const x of xs){await pet.locator('#stage').dispatchEvent('pointermove',{pointerType:'mouse',clientX:x,clientY:120,buttons:0});await delay(130);}};
  await pet.evaluate(async()=>{
    const stage=document.querySelector('#stage');
    for(const x of [90,130,90,130]){stage.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:120}));await new Promise(r=>setTimeout(r,130));}
    let x=90;window.qaPetMotion=setInterval(()=>{x=x===90?130:90;stage.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:120}));},200);
  });
  await pet.waitForFunction(()=>document.querySelector('#stage').classList.contains('petting'));
  await delay(4000);assert.equal(await pet.locator('#stage').evaluate(e=>e.classList.contains('petting')),true);
  const cache=await page.evaluate(()=>window.qbot.rooms.getCache());assert.ok(cache.chat.some(m=>m.interaction==='petting'));
  assert.equal((await pet.evaluate(()=>window.qbot.roomPet.getCache())).state.mode,'working');
  const during=await pet.evaluate(()=>[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').src);
  await app.evaluate(({BrowserWindow},url)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url).webContents.send('roomPet:state',{mode:'music',action:'idle'}),pet.url());
  await hover([90,130]);assert.equal(await pet.evaluate(()=>[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible').src),during);
  await pet.screenshot({path:path.join(output,'working-companion-petted.png')});
  await pet.evaluate(()=>clearInterval(window.qaPetMotion));
  await pet.locator('#stage').dispatchEvent('pointerleave');await pet.waitForFunction(()=>!document.querySelector('#stage').classList.contains('petting'));
  await pet.waitForFunction(()=>[...document.querySelectorAll('#stage video')].some(v=>v.style.visibility==='visible'&&v.src.includes('idle')));
  assert.deepEqual(errors,[]);
  console.log('PASS: real working companion can be petted directly, loops continuously, records direct interaction; presence updates do not interrupt, exit restores latest action.');
 }catch(error){await fs.writeFile(path.join(output,'server.log'),logs);if(app){for(const [i,p] of app.windows().entries())try{await p.screenshot({path:path.join(output,`failure-${i}.png`)});}catch{}}throw error;}
 finally{if(app)await app.close();proc.kill();await new Promise(r=>proc.once('exit',r));assert.equal(path.dirname(path.resolve(data)),path.resolve(os.tmpdir()));assert.ok(path.basename(data).startsWith('qbot-companion-review-'));await fs.rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
