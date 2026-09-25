// Real renderer + real marketplace media + isolated local service; transcript and screenshots are retained.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const net=require('node:net');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output/companion-review'),market=path.join(output,'market');
const playwright=process.env.PLAYWRIGHT_MODULE||'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {_electron:electron}=require(playwright);const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await fs.mkdir(market,{recursive:true});const {readMarketPack}=await import('../rooms/companions.mjs');
 const base='http://14.103.59.73:24251';const catalog=(await (await fetch(base+'/skins')).json()).skins.sort((a,b)=>a.size-b.size).slice(0,6);
 for(const skin of catalog){const dir=path.join(market,skin.hash),file=path.join(dir,'pack.bin');let buffer;try{buffer=await fs.readFile(file);readMarketPack(buffer,skin.hash);}catch{const response=await fetch(`${base}/skins/${skin.hash}/pack`,{signal:AbortSignal.timeout(120000)});assert.ok(response.ok);buffer=Buffer.from(await response.arrayBuffer());readMarketPack(buffer,skin.hash);await fs.mkdir(dir,{recursive:true});await fs.writeFile(file,buffer);}console.log('Market asset ready:',skin.name);}
 await fs.writeFile(path.join(output,'market.json'),JSON.stringify(catalog,null,2));
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'qbot-companion-review-'));
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:path.join(data,'server'),QBOT_COMPANIONS:'1',QBOT_COMPANION_MARKET_DIR:market},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let logs='',app;proc.stdout.on('data',b=>logs+=b);proc.stderr.on('data',b=>logs+=b);
 const transcript=[];
 try{
  for(let i=0;i<100&&!logs.includes('listening');i++)await delay(50);assert.match(logs,/residents=6 rooms=3/);
  await require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild').build({entryPoints:[path.join(root,'app/test/fixtures/social-main.ts')],outfile:path.join(root,'app/out/main/companion-review.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron','ffmpeg-static']});
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/out/main/companion-review.cjs')],env:{...process.env,QBOT_QA_ROOT:root,QBOT_QA_DATA:data,QBOT_QA_COMPANIONS:'1',QBOT_ROOMS_URL:`ws://127.0.0.1:${port}`}});
  const page=await app.firstWindow();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));app.on('window',p=>p.on('pageerror',e=>errors.push(e.message)));
  await page.locator('#my-character strong').waitFor();await page.locator('[data-page=world]').click();await page.locator('.room-card').first().waitFor();
  if(process.env.QBOT_COMPANION_PLAY==='1'){
    await app.evaluate(({BrowserWindow,app})=>{const win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('social/index.html'));if(win){win.setTitle('QBot · 陪伴角色试玩（独立测试环境）');win.show();win.focus();win.once('closed',()=>app.quit());}});
    console.log('PLAY_READY: 世界广场已打开，三个陪伴房间可拜访；关闭一起玩主窗口退出测试。');
    await app.waitForEvent('close',{timeout:0});app=null;return;
  }
  await page.locator('#world-chat .message').first().waitFor();await page.screenshot({path:path.join(output,'01-world.png')});
  const card=page.locator('.room-card').filter({hasText:'苔苔的花园茶会'});await card.locator('[data-join]').click();await page.waitForFunction(()=>document.querySelector('#room-summary').textContent.includes('苔苔'));
  await page.locator('[data-page=room]').click();await page.screenshot({path:path.join(output,'02-room.png')});
  await page.locator('#open-chat').click();let chat;for(let i=0;i<100&&!chat;i++){chat=app.windows().find(p=>p.url().includes('compact=1'));await delay(50);}assert.ok(chat);
  await chat.locator('.message').first().waitFor();await delay(20000);
  const say=async text=>{await chat.locator('.composer textarea').fill(text);await chat.locator('.composer button').click();};
  await say('大家好');await delay(3200);await say('今天有点累，想在这里歇一会儿');
  await chat.locator('.message p').filter({hasText:'辛苦啦'}).waitFor();await chat.screenshot({path:path.join(output,'03-welcome-and-reply.png')});
  // The proactive invitation must be discoverable without opening the friends page.
  await chat.locator('#pair-notice').waitFor({state:'visible',timeout:60000});await chat.screenshot({path:path.join(output,'04-invitation.png')});
  await chat.locator('#pair-notice button').filter({hasText:'一起玩'}).click();await chat.locator('#pair-notice').waitFor({state:'hidden'});
  const pets=app.windows().filter(p=>p.url().includes('roomPet=1'));assert.equal(pets.length,2);
  for(const [i,p] of pets.entries()){
    await p.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.readyState>=2&&v.currentTime>0),{},{timeout:30000});await p.screenshot({path:path.join(output,`05-market-pet-${i}.png`)});
  }
  const cache=await page.evaluate(()=>window.qbot.rooms.getCache());const visits=await page.evaluate(async()=>{const c=await window.qbot.rooms.getCache();return Promise.all(c.room.members.filter(m=>m.companion).map(m=>window.qbot.garden.visit(m.memberId)));});
  await fs.writeFile(path.join(output,'gardens.json'),JSON.stringify(visits,null,2));assert.notEqual(JSON.stringify(visits[0].plots),JSON.stringify(visits[1].plots));
  if(process.env.QBOT_REVIEW_LAYOUT_ONLY==='1'){assert.deepEqual(errors,[]);console.log('PASS: final world/chat/invitation layout with real marketplace playback');return;}
  await say('谢谢，我想安静一会儿');await chat.locator('.message p').filter({hasText:'好，那就安静陪你'}).waitFor();
  const quietAt=Date.now();await delay(65000);const quietCache=await page.evaluate(()=>window.qbot.rooms.getCache());assert.equal(quietCache.chat.filter(m=>m.companion&&m.at>quietAt).length,0);
  await chat.screenshot({path:path.join(output,'06-quiet.png')});transcript.push(...quietCache.chat);
  await fs.writeFile(path.join(output,'transcript.json'),JSON.stringify(transcript,null,2));await fs.writeFile(path.join(output,'result.json'),JSON.stringify({errors,market:catalog.map(s=>s.name),room:cache.room.name,playablePets:pets.length,quietSeconds:65,passed:true},null,2));assert.deepEqual(errors,[]);
  console.log('PASS: actual UI, six real marketplace assets, both visitor videos playing, welcome, latest-message reply, visible accepted invitation, distinct gardens, 65s quiet');
 }catch(error){await fs.writeFile(path.join(output,'server.log'),logs);if(app){for(const [i,p] of app.windows().entries())try{await p.screenshot({path:path.join(output,`failure-${i}.png`)});}catch{}}throw error;}
 finally{if(app)await app.close();proc.kill();await new Promise(r=>proc.once('exit',r));assert.equal(path.dirname(path.resolve(data)),path.resolve(os.tmpdir()));assert.ok(path.basename(data).startsWith('qbot-companion-review-'));await fs.rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
