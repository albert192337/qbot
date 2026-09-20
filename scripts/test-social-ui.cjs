const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const {mkdtemp,mkdir,rm,readFile}=require('node:fs/promises');
const {spawn}=require('node:child_process');const path=require('node:path');const os=require('node:os');const net=require('node:net');
const root=path.resolve(__dirname,'..');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-social-ui-'));const output=path.join(root,'.superpowers/social-preview');await mkdir(output,{recursive:true});
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:path.join(data,'server')},stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);
 let app;
 try{
  await new Promise((resolve,reject)=>{const end=Date.now()+5000;const timer=setInterval(()=>{if(log.includes('listening')){clearInterval(timer);resolve();}else if(Date.now()>end){clearInterval(timer);reject(Error(log));}},30);});
  await require('esbuild').build({entryPoints:[path.join(root,'app/test/fixtures/social-main.ts')],outfile:path.join(root,'app/out/main/social-qa.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron','ffmpeg-static']});
  app=await electron.launch({executablePath:require('electron'),args:[path.join(root,'app/out/main/social-qa.cjs')],env:{...process.env,QBOT_QA_ROOT:root,QBOT_QA_DATA:data,QBOT_ROOMS_URL:`ws://127.0.0.1:${port}`}});
  const page=await app.firstWindow();page.setDefaultTimeout(10000);const errors=[];app.on('window',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#my-character strong').waitFor();await page.screenshot({path:path.join(output,'01-home.png')});
  await page.locator('[data-page=test]').click();await page.locator('.guest-card').first().waitFor();assert.equal(await page.locator('.guest-card').count(),2);
  await page.locator('#start-test').click();await page.waitForFunction(()=>document.querySelector('#room-summary').textContent.includes('本地试演'));
  await page.locator('.guest-card button').first().click();await page.locator('.test-member').waitFor();
  let cache=await page.evaluate(()=>window.qbot.rooms.getCache());assert.equal(cache.room.members.length,2);assert.equal(cache.room.testing,true);
  const guest=cache.room.members.find(m=>m.testing);
  await page.locator('[data-interact=tea]').click();
  const chat=app.windows().find(p=>p.url().includes('compact=1'));assert.ok(chat,'independent chat window');
  await chat.locator('.message p').filter({hasText:'好呀'}).waitFor();
  await chat.locator('.composer textarea').fill('本地的问候');await chat.locator('.composer button').click();await chat.locator('.message p').filter({hasText:'本地的问候'}).waitFor();
  // IME Enter must not submit an in-progress Chinese composition.
  await chat.locator('.composer textarea').fill('拼音正在选字');await chat.locator('.composer textarea').dispatchEvent('keydown',{key:'Enter',isComposing:true});
  assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).chat.length,2);
  await chat.locator('.composer textarea').fill('');
  await chat.locator('#pin').click();await chat.waitForFunction(()=>document.querySelector('#pin').textContent==='已置顶');await new Promise(r=>setTimeout(r,300));assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('compact=1')).isAlwaysOnTop()),true);
  await chat.screenshot({path:path.join(output,'03-chat.png')});await page.screenshot({path:path.join(output,'02-local-test.png')});
  const pets=app.windows().filter(p=>p.url().includes('roomPet=1'));assert.equal(pets.length,1);await pets[0].locator('.player-nameplate').waitFor();assert.match(await pets[0].locator('.player-nameplate strong').innerText(),/测试/);
  await pets[0].screenshot({path:path.join(output,'04-nameplate.png')});
  const dragSizes=await app.evaluate(async({BrowserWindow})=>{
    const win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('roomPet=1'));
    const before=win.getSize();
    for(let drag=0;drag<12;drag++){
      win.webContents.sendInputEvent({type:'mouseDown',x:80,y:100,button:'left',clickCount:1});
      for(let step=1;step<=5;step++){
        win.webContents.sendInputEvent({type:'mouseMove',x:80+step*2,y:100+step,button:'left'});
        await new Promise(r=>setTimeout(r,18));
      }
      win.webContents.sendInputEvent({type:'mouseUp',x:90,y:105,button:'left',clickCount:1});
    }
    return {before,after:win.getSize()};
  });
  assert.deepEqual(dragSizes.after,dragSizes.before,'member dragging must preserve the fixed logical size at fractional DPI');
  await chat.locator('#close').click({noWaitAfter:true});assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).room.roomId,'LOCAL');
  const newChat=app.waitForEvent('window');await page.locator('#open-chat').click();const reopened=await newChat;await reopened.locator('.message').nth(1).waitFor();
  await page.locator('[data-remove]').click();await page.waitForFunction(async()=>{const c=await window.qbot.rooms.getCache();return c.room.members.length===1;});
  await page.locator('#leave').click();await page.waitForFunction(async()=>!(await window.qbot.rooms.getCache()).room);
  await page.locator('[data-page=home]').click();await page.locator('#publish').click();await page.locator('[name=name]').fill('午后的书房');await page.locator('[name=description]').fill('一起赶稿，偶尔聊两句。');await page.locator('[name=language]').selectOption('zh');await page.locator('#save-room').click();await page.locator('#edit-room').waitFor();
  cache=await page.evaluate(()=>window.qbot.rooms.getCache());assert.equal(cache.room.description,'一起赶稿，偶尔聊两句。');const code=cache.room.roomId;
  await page.locator('#copy-code').click();assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),code);
  await page.locator('#edit-room').click();await page.locator('[name=description]').fill('修改后仍是同一间房');await page.locator('#save-room').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).room.roomId,code);
  await reopened.locator('.composer textarea').fill('房内留言');await reopened.locator('.composer button').click();await reopened.locator('.message p').filter({hasText:'房内留言'}).waitFor();
  await reopened.locator('.composer textarea').fill('发送失败保留这段草稿');await reopened.locator('.composer button').click();await reopened.waitForFunction(()=>!document.querySelector('#toast').hidden);assert.equal(await reopened.locator('.composer textarea').inputValue(),'发送失败保留这段草稿');await reopened.locator('.composer textarea').fill('');
  await page.locator('[data-page=world]').click();await page.locator('.room-card').waitFor();await page.waitForFunction(()=>!document.querySelector('#world-chat textarea').disabled);
  // Shared main-process connection handles simultaneous windows/queries without overwriting requests.
  const lists=await page.evaluate(()=>Promise.all([window.qbot.rooms.list(),window.qbot.rooms.list(),window.qbot.rooms.list()]));assert.equal(lists.length,3);
  await new Promise(r=>setTimeout(r,3100));await page.locator('#world-chat textarea').fill('世界的问候');await page.locator('#world-chat .composer button').click();await page.locator('#world-chat .message p').filter({hasText:'世界的问候'}).waitFor();
  assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).chat.some(m=>m.text==='世界的问候'),false);
  await page.screenshot({path:path.join(output,'05-world.png')});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('social/index.html')&&!w.webContents.getURL().includes('compact=1')).setSize(680,560));
  await page.screenshot({path:path.join(output,'06-narrow.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#world-chat .composer').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),true);
  // A rejected send preserves its draft.
  await page.evaluate(()=>window.qbot.rooms.update({chatEnabled:false}));await reopened.waitForFunction(()=>document.querySelector('.composer textarea').disabled);
  await page.locator('[data-page=room]').click();await page.locator('#leave').click();await reopened.waitForFunction(()=>document.querySelector('.composer textarea').disabled);
  const config=JSON.parse(await readFile(path.join(data,'config.json'),'utf8'));assert.equal(config.activeCharacter,'host');assert.equal(config.progress,undefined);
  assert.deepEqual(errors,[]);console.log('PASS: native home/form/world, local invite/reply/remove, nameplate, independent chat/pin/reopen, IME, copy code, same-room edits, simultaneous requests, channel isolation, narrow window, untouched character selection');
 }finally{if(app)await app.close();proc.kill();await new Promise(r=>proc.exitCode!==null?r():proc.once('exit',r));await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});










