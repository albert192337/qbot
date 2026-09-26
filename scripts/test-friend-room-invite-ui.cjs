const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const {mkdtemp,mkdir,rm,readFile}=require('node:fs/promises');
const {spawn}=require('node:child_process');const path=require('node:path');const os=require('node:os');const net=require('node:net');
const root=path.resolve(__dirname,'..');
(async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'qbot-social-ui-'));const output=path.join(root,'.superpowers/social-preview');await mkdir(output,{recursive:true});
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const proc=spawn(process.execPath,['rooms/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:path.join(data,'server')},stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);
 let app, friendSocket;
 try{
  await new Promise((resolve,reject)=>{const end=Date.now()+5000;const timer=setInterval(()=>{if(log.includes('listening')){clearInterval(timer);resolve();}else if(Date.now()>end){clearInterval(timer);reject(Error(log));}},30);});
  await require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild').build({entryPoints:[path.join(root,'app/test/fixtures/social-main.ts')],outfile:path.join(root,'app/out/main/social-qa.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron','ffmpeg-static']});
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/out/main/social-qa.cjs')],env:{...process.env,QBOT_QA_ROOT:root,QBOT_QA_DATA:data,QBOT_ROOMS_URL:`ws://127.0.0.1:${port}`}});
  const page=await app.firstWindow();page.setDefaultTimeout(10000);const errors=[];app.on('window',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#my-character strong').waitFor();await page.screenshot({path:path.join(output,'01-home.png')});
  await page.evaluate(()=>window.qbot.rooms.create({name:'旧小屋',capacity:6,listed:false}));
  const code=(await page.evaluate(()=>window.qbot.rooms.getCache())).room.roomId;
  friendSocket=new WebSocket('ws://127.0.0.1:'+port);await new Promise((r,j)=>{friendSocket.addEventListener('open',r,{once:true});friendSocket.addEventListener('error',j,{once:true});});
  let friendSeq=0;const friendPending=new Map();friendSocket.addEventListener('message',e=>{const f=JSON.parse(e.data);const p=friendPending.get(f.requestId);if(p){friendPending.delete(f.requestId);clearTimeout(p.timer);p.resolve(f);}});
  const friendReq=f=>new Promise((resolve,reject)=>{const requestId='friend-'+(++friendSeq);const timer=setTimeout(()=>reject(Error('friend timeout '+f.t)),4000);friendPending.set(requestId,{resolve,timer});friendSocket.send(JSON.stringify({...f,requestId}));});
  const friendHello=await friendReq({t:'hello',protoVer:2,nickname:'午后小鹿',character:'森林来客'});
  await friendReq({t:'join',roomId:code});
  await page.locator('[data-page=friends]').click();await page.locator('#refresh-contacts').click();await page.locator('[data-contact-tab=recent]').click();
  const friendRow=page.locator('[data-contact-id="'+friendHello.memberId+'"]');await friendRow.waitFor();assert.equal(await friendRow.locator('.interaction-badge').count(),0);

  await friendRow.getByRole('button',{name:'加好友',exact:true}).click();await friendRow.getByRole('button',{name:'取消申请'}).waitFor();
  const hostId=(await page.evaluate(()=>window.qbot.rooms.getCache())).status.memberId;
  await friendReq({t:'contacts:change',id:hostId,action:'accept'});
  await page.evaluate(()=>window.qbot.rooms.leave());await page.waitForFunction(async()=>!(await window.qbot.rooms.getCache()).room);
  await page.locator('[data-contact-tab=friends]').click();await friendRow.getByRole('button',{name:'邀请来玩'}).waitFor();
  assert.equal(await friendRow.getByRole('button',{name:'邀请来玩'}).isEnabled(),true);
  await friendRow.getByRole('button',{name:'邀请来玩'}).click();await page.waitForFunction(async()=>!!(await window.qbot.rooms.getCache()).room);
  const room=(await page.evaluate(()=>window.qbot.rooms.getCache())).room;assert.equal(room.listed,false);assert.notEqual(room.roomId,code);
  await page.waitForTimeout(500);assert.equal((await friendReq({t:'contacts:get'})).invitations.length,1);
  await page.screenshot({path:path.join(output,'invite-without-room.png')});assert.deepEqual(errors,[]);
  console.log('PASS: actual friends UI enables invitation without room, creates private room, joins and delivers invitation');
 }finally{if(friendSocket)friendSocket.close();if(app)await app.close();proc.kill();await new Promise(r=>proc.exitCode!==null?r():proc.once('exit',r));await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
