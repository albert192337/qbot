const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os'),net=require('node:net'),{spawn}=require('node:child_process');
const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/online-room');
(async()=>{
 await fs.mkdir(out,{recursive:true});let app,server,ws;
 try{
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/cozy-main.cjs')],env:{...process.env,QBOT_ONLINE_PREVIEW:'1',QBOT_QA_DATA:await fs.mkdtemp(path.join(os.tmpdir(),'qbot-panorama-')),QBOT_COZY_REAL_CHARACTERS:path.join(process.env.APPDATA,'@qbot/app/characters')}});
  let page=await app.firstWindow();await app.evaluate(()=>{global.cozyQA.win.show();global.cozyQA.win.focus();});page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForSelector('body[data-ready=true][data-members="4"]');assert.equal(await page.locator('#theme').inputValue(),'greenhouse');assert.equal(await page.locator('#size').inputValue(),'small');assert.ok(await page.evaluate(()=>innerWidth===600&&Math.abs(innerHeight-177)<=1));assert.equal(await page.locator('footer').count(),0);await page.mouse.move(300,140);await page.waitForTimeout(250);assert.equal(await page.locator('nav').evaluate(e=>getComputedStyle(e).opacity),'0');await page.mouse.move(500,15);await page.waitForTimeout(250);assert.equal(await page.locator('nav').evaluate(e=>getComputedStyle(e).opacity),'1');await page.waitForFunction(()=>[...document.querySelectorAll('#sources video')].filter(v=>v.currentTime>.1&&v.style.visibility==='visible').length===4);
  for(const theme of ['halloween','space','observatory','greenhouse']){await page.locator('#theme').selectOption(theme);await page.waitForFunction(t=>localStorage.getItem('qbot.onlineRoom.theme.v2')===t,theme);await page.locator('#theme').blur();await page.mouse.move(300,140);await page.waitForTimeout(600);await page.screenshot({path:path.join(out,theme+'.png')});}
  await page.reload();await page.waitForSelector('body[data-ready=true]');assert.equal(await page.locator('#theme').inputValue(),'greenhouse');
  await page.locator('#size').selectOption('small');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await app.close();app=null;
  const data=await fs.mkdtemp(path.join(os.tmpdir(),'qbot-panorama-network-'));const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
  server=spawn(process.execPath,['rooms/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:path.join(data,'server')},stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
  await new Promise((resolve,reject)=>{const end=Date.now()+10000,t=setInterval(()=>{if(log.includes('listening')){clearInterval(t);resolve();}else if(Date.now()>end){clearInterval(t);reject(Error(log));}},100);});
  await require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild').build({entryPoints:[path.join(root,'app/test/fixtures/social-main.ts')],outfile:path.join(root,'app/out/main/social-qa.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron','ffmpeg-static']});
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/out/main/social-qa.cjs')],env:{...process.env,QBOT_QA_ROOT:root,QBOT_QA_DATA:data,QBOT_ROOMS_URL:`ws://127.0.0.1:${port}`}});
  page=await app.firstWindow();page.setDefaultTimeout(25000);await page.locator('#my-character strong').waitFor();
  const id=await page.evaluate(()=>window.qbot.rooms.create({name:'横向联机验收',kind:'idle',capacity:12,listed:false}));
  ws=new WebSocket(`ws://127.0.0.1:${port}`);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map();ws.onmessage=e=>{const f=JSON.parse(e.data);const p=pending.get(f.requestId);if(p){pending.delete(f.requestId);p(f);}};
  const request=f=>new Promise((resolve,reject)=>{const requestId='qa-'+(++seq),timer=setTimeout(()=>reject(Error('request timeout '+f.t)),8000);pending.set(requestId,result=>{clearTimeout(timer);resolve(result);});ws.send(JSON.stringify({...f,requestId}));});
  const hello=await request({t:'hello',protoVer:2,nickname:'真实连接房友',character:'测试'});const joined=await request({t:'join',roomId:id});await fs.writeFile(path.join(out,'network-frames.json'),JSON.stringify({hello,joined},(key,value)=>key==='contactToken'?'[redacted]':value,2));
  await page.waitForFunction(()=>window.qbot.rooms.getSceneMembers().then(a=>a.length===1));
  const manifest=JSON.parse(await fs.readFile(path.join(data,'characters/guest/manifest.json'),'utf8'));
  await app.evaluate((_electron,manifest)=>{const q=globalThis.qa;for(const [id,s]of q.Pets.memberStates){s.character={dirId:'guest',manifest};q.Pets.onPresence(id,'idle','idle');}},manifest);
  await page.evaluate(()=>window.qbot.rooms.setDisplayMode('room'));
  let room;for(let i=0;i<60&&!room;i++){room=app.windows().find(p=>p.url().includes('/online-room/'));if(!room)await page.waitForTimeout(100);}assert.ok(room);room.on('pageerror',e=>errors.push(e.message));
  await room.waitForSelector('body[data-ready=true][data-members="2"]');assert.ok(await room.evaluate(()=>innerWidth===600&&Math.abs(innerHeight-177)<=1));await room.waitForFunction(()=>[...document.querySelectorAll('#sources video')].filter(v=>v.currentTime>.1&&v.style.visibility==='visible').length===2);
  assert.equal(app.windows().filter(p=>p.url().includes('roomPet=1')).length,0);
  const before=(await page.evaluate(()=>window.qbot.rooms.getCache())).room.roomId;
  await app.evaluate(({Menu})=>{Menu.prototype.popup=function(){globalThis.visibilityMenu=this;};});
  await room.locator('#off').click();await page.waitForTimeout(500);
  assert.deepEqual(await app.evaluate(()=>globalThis.visibilityMenu.items.map(i=>i.label)),['隐藏全部角色','只隐藏房间（保留角色）']);
  await app.evaluate(()=>globalThis.visibilityMenu.items[0].click());assert.equal((await page.evaluate(()=>window.qbot.desktop.get())).hidden,true);
  await page.evaluate(()=>window.qbot.desktop.openMenu());await page.waitForTimeout(300);assert.equal(await app.evaluate(()=>globalThis.visibilityMenu.items[0].label),'显示全部角色');await app.evaluate(()=>globalThis.visibilityMenu.items[0].click());
  await room.locator('#off').click();await page.waitForTimeout(300);await app.evaluate(()=>globalThis.visibilityMenu.items[1].click());
  await page.waitForFunction(()=>window.qbot.rooms.getDisplayMode().then(m=>m==='desktop'));for(let i=0;i<100&&!app.windows().some(p=>p.url().includes('roomPet=1'));i++)await page.waitForTimeout(100);await fs.writeFile(path.join(out,'toggle-debug.json'),JSON.stringify({urls:app.windows().map(p=>p.url()),members:await page.evaluate(()=>window.qbot.rooms.getSceneMembers())},null,2));assert.equal(app.windows().filter(p=>p.url().includes('roomPet=1')).length,1);assert.equal((await page.evaluate(()=>window.qbot.rooms.getCache())).room.roomId,before);
  assert.equal((await page.evaluate(()=>window.qbot.desktop.get())).hidden,false);
  await page.evaluate(()=>window.qbot.desktop.openMenu());await page.waitForTimeout(300);assert.equal(await app.evaluate(()=>globalThis.visibilityMenu.items[1].label),'显示房间背景');
  await page.evaluate(()=>window.qbot.rooms.setDisplayMode('room'));for(let i=0;i<60;i++){room=app.windows().find(p=>p.url().includes('/online-room/'));if(room)break;await page.waitForTimeout(100);}await room.waitForSelector('body[data-members="2"]');
  ws.close();ws=null;await room.waitForSelector('body[data-members="1"]');await page.evaluate(()=>window.qbot.rooms.leave());await page.waitForTimeout(400);assert.equal(app.windows().filter(p=>p.url().includes('/online-room/')).length,0);
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({passed:true,checks:['four real local actors across four backgrounds','theme retained on reload','600px layout','real websocket join and leave','cached peer media renders with own actor','background toggle keeps same network room','no duplicate peer windows','desktop restoration','room closes on leave'],errors},null,2));console.log('PASS online room');
 }finally{if(ws)ws.close();if(app)await app.close();if(server){server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));}}
})().catch(e=>{console.error(e);process.exitCode=1;});
