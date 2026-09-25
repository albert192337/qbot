const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.superpowers/harvest-actions');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-harvest-actions-')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const c=require('../rooms/generated/garden-core.cjs');let id=0,s,failSell=false,calls=[];const rng={random:()=>.5,id:()=>String(++id)},now=Date.now();
 function reset(matches=true){s=c.initialGarden(now,rng);c.enableV3(s,now);c.ensureLife(s,now,rng,'pet');s.activeActor='pet';s.life.characters.pet.wishes=[{id:'wish',species:matches?'strawberry':'apple',traits:[],xp:10,done:false}];
  const p=c.makeV3Plant(s,{id:'seed',species:'strawberry',genes:['juicy'],bred:false},0,now-3600000,rng);p.readyAt=now-1;p.batch.settled=true;p.batch.seedlingEnd=now-1;p.kg=.372;p.value=26;p.revealed=true;s.plots[0]=p;calls=[];
 }
 ipcMain.handle('garden:get',()=>c.publicGardenState(s));ipcMain.handle('garden:act',async(_e,cmd)=>{calls.push(cmd);await wait(150);if(failSell&&cmd.type==='sell'){failSell=false;return {ok:false,error:'模拟失败，请重试'};}try{const r=c.transition(s,cmd,now,rng,{actor:'pet'});s=r.state;return {ok:true,...r,state:c.publicGardenState(s)};}catch(e){return {ok:false,error:e.message};}});
 ipcMain.handle('settings:get',()=>({gardenRenderMode:'2d'}));ipcMain.handle('overlays:get',()=>({revision:0,winner:null}));ipcMain.on('garden:ignore',()=>{});
 const win=new BrowserWindow({width:900,height:760,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error(event.message);});
 const js=async code=>{try{return await win.webContents.executeJavaScript(code);}catch(e){console.error('Failed renderer check:',code);throw e;}},until=async fn=>{for(let i=0;i<60;i++){if(await fn())return;await wait(100);}throw Error('UI timeout');};
 const click=async label=>{await js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(label)}&&!b.disabled);if(!b)throw Error('Missing button '+${JSON.stringify(label)});b.click();})()`);await wait(350);};
 async function harvest(view='plot:0'){await win.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view}});await until(()=>js('!!document.querySelector(".plant-detail,[data-plot]")'));if(view==='strip'){await js('document.querySelector("[data-plot]").click()');await wait(100);}await click('收获 ✦');await until(()=>js('!!document.querySelector(".result-actions")'));}
 reset();await harvest();assert.deepEqual(await js('[...document.querySelectorAll(".result-actions button")].map(b=>b.textContent)'),['出售','投喂']);
 await wait(1400);
 fs.writeFileSync(path.join(out,'harvest-buttons.png'),(await win.webContents.capturePage()).toPNG());
 const fruit=s.produce[0],coins=s.coins;failSell=true;await click('出售');assert.ok(s.produce.some(p=>p.id===fruit.id));assert.ok(await js('!!document.querySelector(".result-actions")'));
 await js('(()=>{const b=document.querySelector(".result-actions button");b.click();b.click();})()');await wait(400);assert.equal(s.coins,coins+fruit.value);assert.equal(s.produce.length,0);assert.equal(calls.filter(c=>c.type==='sell').length,2);assert.equal(await js('document.querySelectorAll(".result-actions").length'),0);
 reset();await harvest('strip');await click('投喂');assert.equal(s.produce.length,0);assert.equal(s.life.characters.pet.xp,10);assert.equal(calls.filter(c=>c.type==='feed').length,1);assert.ok(await js('document.body.innerText.includes("吃到了")'));
 reset(false);await harvest();assert.equal(await js('document.querySelector(".result-actions button.primary").disabled'),true);assert.match(await js('document.querySelector(".result-popup").innerText'),/不符合当前角色/);await js('document.querySelector(".result-popup .quick-close").click()');assert.equal(s.produce.length,1);assert.equal(calls.filter(c=>['sell','feed'].includes(c.type)).length,0);
 for(const view of ['strip','plots'])for(const count of [2,6]){
  reset();const first=structuredClone(s.plots[0]);for(let i=1;i<count;i++)s.plots[i]={...structuredClone(first),id:'batch-'+i};
  win.setSize(500,420);
  await win.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view}});
  await until(()=>js('!!document.querySelector("[data-plot],.plot-card")||document.body.innerText.includes("一键采摘")'));
  await click(view==='strip'?`采摘 ${count}`:`一键采摘 · ${count}`);
  await until(()=>js('!!document.querySelector(".result-card>.result-action-area button")'));
  await wait(1200);
  const check=()=>js(`(()=>{const c=document.querySelector('.result-card'),b=c.querySelector('.result-action-area button'),r=b.getBoundingClientRect(),p=c.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {visible:r.height>=24&&r.top>=p.top&&r.bottom<=p.bottom-4&&r.bottom<=innerHeight,hit:hit===b||b.contains(hit)}})()`);
  assert.deepEqual(await check(),{visible:true,hit:true},`${view} ${count}: initial footer`);
  await js(`document.querySelector('.result-card>.quick-list').scrollTop=10000`);await wait(100);
  assert.deepEqual(await check(),{visible:true,hit:true},`${view} ${count}: scrolled footer`);
  fs.writeFileSync(path.join(out,`batch-${view}-${count}.png`),(await win.webContents.capturePage()).toPNG());
  await click('收好');assert.equal(await js('document.querySelectorAll(".result-card").length'),0);assert.equal(s.produce.length,count);
 }
 console.log('PASS: single harvest actions and fixed batch footer for 2/6 items in strip/popup at 500x420, before/after scroll');app.exit(0);
 }catch(e){console.error(e);app.exit(1);}});
