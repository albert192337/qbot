// Production UI + authoritative rules with an isolated, disposable player.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/capsule-machines');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-dual-capsule-')));
const ts=require('typescript');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,f);
const {CAPSULE_3D_POOL,APPEARANCE_CAPSULE_POOL}=require('../app/src/shared/social-economy.ts');
const {initialGarden,transition}=require('../app/src/main/garden/rules.ts');
const {ensureLife}=require('../app/src/main/garden/life-rules.ts');const {enableV3}=require('../app/src/main/garden/v3-rules.ts');
let seq=0,requests=[],fail=false,blockModels=false;const now=Date.now(),rng={id:()=>`qa-${++seq}`,random:()=>0};
let state=initialGarden(now,rng);ensureLife(state,now,rng,'pet');enableV3(state,now);state.economy.tokens=6000;
const order=['halloween-cauldron','halloween-fireplace','halloween-chandelier','halloween-lantern','halloween-pumpkins','halloween-candles','halloween-books','strawberry-pack','flower-pack','speed-pack'];
ipcMain.handle('garden:get',()=>state);ipcMain.handle('characters:list',()=>[]);ipcMain.handle('characters:getActive',()=>null);
ipcMain.handle('garden:act',(_,command)=>{
 requests.push(command);if(fail)return {ok:false,error:'测试：服务器暂时不可用'};
 let call=0;const pool=command.type==='capsuleDraw3d'?CAPSULE_3D_POOL:APPEARANCE_CAPSULE_POOL;
 const result=transition(state,command,now,{id:rng.id,random:()=>{const slot=Math.floor(call/2),item=pool.find(x=>x.id===(command.count===10?order[slot]:(command.type==='capsuleDraw3d'?'halloween-cauldron':'moon-terrarium'))),tier=pool.filter(x=>x.tier===item.tier),index=tier.indexOf(item);return call++%2===0?{common:.1,rare:.8,epic:.99}[item.tier]:(tier.slice(0,index).reduce((n,x)=>n+x.weight,0)+item.weight/2)/100;}});
 state=result.state;return {ok:true,...result};
});
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest((details,cb)=>cb({cancel:/^https?:/.test(details.url)||(blockModels&&/\.glb($|\?)/.test(details.url))}));
 const w=new BrowserWindow({width:1150,height:900,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 const errors=[];w.webContents.on('console-message',e=>{if(e.level==='error'&&!blockModels)errors.push(e.message);});
 const js=s=>w.webContents.executeJavaScript(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async s=>{for(let i=0;i<200;i++){if(await js(s))return;await wait(50);}throw Error('Timeout: '+s);};
 const shot=async name=>fs.writeFileSync(path.join(out,name+'.png'),(await w.webContents.capturePage()).toPNG());
 const assets=fs.readdirSync(path.join(root,'app/out/renderer/assets')),bundle=assets.find(n=>/^rewards-.*\.js$/.test(n)),styles=assets.filter(n=>/^(capsule|social-economy|appearance-shop)-.*\.css$/.test(n));
 const html=path.join(root,'app/out/renderer/dual-capsule-qa.html');
 fs.writeFileSync(html,`<!doctype html><meta charset="utf-8">${styles.map(n=>`<link rel="stylesheet" href="assets/${n}">`).join('')}<style>body{background:#f8f3e9;font:14px Microsoft YaHei;margin:20px}.appearance-shop{display:none}</style><main></main><script type="module">import {mount} from './assets/${bundle}';await mount(document.querySelector('main'));document.body.dataset.ready='true';</script>`);
 await w.loadFile(html);await until(`document.body.dataset.ready==='true'`);
 assert.equal(await js(`document.querySelector('.garden-capsule').dataset.machine`),'2d');
 await until(`document.querySelector('.capsule-machine img').naturalWidth>0`);
 await js(`document.querySelector('.capsule-link').click()`);assert.equal(await js(`document.querySelector('.capsule-pool-list').textContent.includes('万圣壁炉')`),false);await js(`document.querySelector('dialog').close()`);
 await shot('01-2d-machine');
 await js(`document.querySelector('[data-machine="3d"] button')?.click();document.querySelector('button[data-machine="3d"]').click()`);
 await until(`document.querySelector('.garden-capsule').dataset.machine==='3d'`);await wait(300);await shot('02-3d-machine');await js(`document.querySelector('.capsule-link').click()`);
 assert.equal(await js(`document.querySelectorAll('.capsule-pool-list>div').length`),CAPSULE_3D_POOL.length);assert.equal(await js(`document.querySelector('.capsule-pool-list').textContent.includes('月光玻璃庭院')`),false);await js(`document.querySelector('dialog').close()`);
 // Double click must still submit only one authoritative transaction.
 await js(`{const b=document.querySelector('.capsule-controls .capsule-primary');b.click();b.click();}`);
 await until(`document.querySelector('.reveal-stage')?.dataset.ready==='true'`);assert.equal(requests.length,1);assert.equal(state.economy.tokens,5940);assert.equal(state.economy.furniture['halloween-cauldron'],1);
 if(process.argv.includes('--record')){const frames=path.join(out,'frames');fs.mkdirSync(frames,{recursive:true});for(let i=0;i<40;i++){fs.writeFileSync(path.join(frames,String(i).padStart(3,'0')+'.png'),(await w.webContents.capturePage()).toPNG());await wait(65);}const ffmpeg=require('ffmpeg-static');require('child_process').execFileSync(ffmpeg,['-y','-framerate','12','-i',path.join(frames,'%03d.png'),'-vf','scale=960:-2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'3d-reveal.mp4')],{stdio:'ignore',windowsHide:true});}
 await wait(1500);await shot('03-epic-cauldron');const a=(await w.webContents.capturePage()).toPNG();await wait(700);const b=(await w.webContents.capturePage()).toPNG();assert.notDeepEqual(a,b,'The rotating reveal must change actual pixels');
 await js(`document.querySelector('.reveal-toolbar button').click()`);assert.equal(await js(`document.querySelector('.reveal-toolbar button').textContent`),'开启旋转');
 const bounds=await js(`(()=>{const r=document.querySelector('.reveal-canvas').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
 w.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...bounds});w.webContents.sendInputEvent({type:'mouseMove',x:bounds.x+90,y:bounds.y+20});w.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:bounds.x+90,y:bounds.y+20});await wait(200);
 await js(`document.querySelector('.reveal-next').click()`);await until(`document.querySelector('.capsule-results')`);assert.equal(await js(`document.querySelectorAll('.capsule-results .capsule-reward').length`),1);
 await js(`document.querySelector('.capsule-view-model').click()`);await until(`document.querySelector('.reveal-stage')?.dataset.ready==='true'`);await js(`document.querySelector('.reveal-skip').click()`);await wait(100);assert.equal(await js(`document.querySelectorAll('dialog').length`),1);await js(`document.querySelector('dialog').close()`);
 await js(`document.querySelector('.capsule-secondary').click()`);await until(`document.querySelector('.reveal-stage')?.dataset.ready==='true'`);
 const names=[];for(let i=0;i<7;i++){await until(`document.querySelector('.reveal-stage')?.dataset.ready==='true'`);names.push(await js(`document.querySelector('.reveal-heading h2').textContent`));await wait(1300);await shot('model-'+i);await js(`document.querySelector('.reveal-next').click()`);}
 await until(`document.querySelector('.capsule-results')`);assert.equal(await js(`document.querySelectorAll('.capsule-results .capsule-reward').length`),10);assert.equal(new Set(names).size,7);assert.equal(state.economy.tokens,5340);await shot('04-ten-results');await js(`document.querySelector('dialog').close()`);
 // Reduced motion + narrow screen + Esc still preserve the awarded inventory.
 w.webContents.debugger.attach('1.3');await w.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});w.setSize(390,700);
 await js(`Array.from(document.querySelectorAll('.capsule-link')).find(b=>b.textContent==='查看上次收获').click()`);await until(`document.querySelector('.reveal-stage')?.dataset.ready==='true'`);
 assert.equal(await js(`document.querySelector('.reveal-toolbar button').textContent`),'开启旋转');assert.equal(await js(`document.querySelector('.furniture-reveal').scrollWidth<=document.querySelector('.furniture-reveal').clientWidth`),true);await shot('05-mobile-reduced');
 w.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await until(`!document.querySelector('.furniture-reveal')`);await js(`document.querySelector('dialog').close()`);
 // Failures must never replay a previous success or consume more currency.
 fail=true;await js(`document.querySelector('.capsule-controls .capsule-primary').click()`);await until(`document.querySelector('dialog')?.textContent.includes('服务器暂时不可用')`);assert.equal(state.economy.tokens,5340);await js(`document.querySelector('dialog').close()`);fail=false;
 blockModels=true;await js(`Array.from(document.querySelectorAll('.capsule-link')).find(b=>b.textContent==='查看上次收获').click()`);await until(`document.querySelector('.reveal-stage')?.dataset.ready==='fallback'`);await shot('06-model-fallback');await js(`document.querySelector('.reveal-skip').click();document.querySelector('.capsule-dialog').close()`);blockModels=false;
 delete state.economy.capsuleMachineRevision;delete state.economy.furniture3dRevision;delete state.economy.capsule3d;w.webContents.send('garden:changed');await until(`document.querySelector('.capsule-unavailable')`);assert.equal(await js(`Array.from(document.querySelectorAll('.capsule-controls button')).every(b=>b.disabled)`),true);await shot('07-older-server');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,models:names,requests,checks:['separate pools','machine image loaded','single transaction on double click','real GLB models x7','animated pixels','pause and drag','ten rewards','reopen without dialog stacking','mobile','reduced motion','Esc','server error without false reward','model failure fallback','old server blocked'],errors},null,2));
 console.log('Dual capsule machines and all 7 model reveals passed');app.exit(0);
 }catch(error){console.error(error);app.exit(1);}});setTimeout(()=>app.exit(2),90000).unref();
