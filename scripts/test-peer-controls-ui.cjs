const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const {mkdtemp,mkdir,rm,readFile}=require('node:fs/promises');
const {spawn}=require('node:child_process');const path=require('node:path');const os=require('node:os');const net=require('node:net');
const root=path.resolve(__dirname,'..');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-peer-controls-'));const output=path.join(root,'.superpowers/peer-controls-preview');await mkdir(output,{recursive:true});
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
  const open=async()=>{
    await pet.locator('#stage').dispatchEvent('pointerenter');
    await pet.getByRole('button',{name:'互动',exact:true}).click();
    await pet.locator('.peer-wheel').waitFor({state:'visible'});
  };
  await open();
  // Crossing the original stage boundary / gaps must not arm auto-dismiss for a clicked menu.
  await pet.locator('#stage').dispatchEvent('pointerleave');
  await pet.locator('.peer-controls').dispatchEvent('pointerleave');
  await new Promise(r=>setTimeout(r,1000));
  assert.equal(await pet.locator('.peer-wheel').isVisible(),true);
  assert.equal(await pet.locator('.peer-wheel button').count(),8);
  await pet.screenshot({path:path.join(output,'interaction-open.png')});
  const before=(await page.evaluate(()=>window.qbot.rooms.getCache())).chat.length;
  await pet.getByRole('button',{name:'打招呼',exact:true}).click();
  await pet.locator('.peer-wheel').waitFor({state:'hidden'});
  await page.waitForFunction(n=>window.qbot.rooms.getCache().then(c=>c.chat.length===n+1),before);
  await open();await pet.getByRole('button',{name:'互动',exact:true}).click();assert.equal(await pet.locator('.peer-wheel').isVisible(),false);
  await open();await pet.keyboard.press('Escape');assert.equal(await pet.locator('.peer-wheel').isVisible(),false);
  await open();await pet.locator('#stage').dispatchEvent('pointerdown',{button:2});assert.equal(await pet.locator('.peer-wheel').isVisible(),false);
  await open();await pet.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await pet.locator('.peer-wheel').isVisible(),false);
  console.log('PASS: interaction menu stays open across leave timers; all 8 choices visible, real wave action succeeds; toggle, Escape, outside click and blur close it.');
 }finally{if(friendSocket)friendSocket.close();if(app)await app.close();proc.kill();await new Promise(r=>proc.exitCode!==null?r():proc.once('exit',r));await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
