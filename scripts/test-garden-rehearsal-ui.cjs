// Run after App build and bundling local-rehearsal.ts to .superpowers/garden-rehearsal-core.cjs.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {LocalGardenRehearsal}=require('../.superpowers/garden-rehearsal-core.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.superpowers/garden-rehearsal-ui');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-rehearsal-ui-')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_,cb)=>cb({cancel:true}));
  const rehearsal=new LocalGardenRehearsal([{id:'test:me',name:'我'},{id:'test:guest',name:'棉花糖'}]);
  ipcMain.handle('settings:get',()=>({gardenRenderMode:'2d'}));ipcMain.handle('characters:getActive',()=>null);
  ipcMain.handle('garden:get',()=>rehearsal.get('pet'));ipcMain.handle('garden:act',(_,cmd)=>rehearsal.act(cmd,'pet'));
  ipcMain.handle('garden:visit',(_,owner)=>rehearsal.visit(owner));ipcMain.handle('garden:cooperate',(_,owner,plot,action,target,task)=>rehearsal.cooperate(owner,plot,action,target,task));
  ipcMain.handle('garden:weather',()=>({}));ipcMain.on('garden:cancelPerformance',()=>{});
  const win=new BrowserWindow({width:860,height:760,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
  const js=async s=>{try{return await win.webContents.executeJavaScript(s)}catch(e){console.error('Failed renderer step:',s,errors);throw e}},until=async fn=>{for(let n=0;n<100;n++){if(await fn())return;await wait(50)}throw Error('UI timeout')};
  const click=async text=>{await js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled);if(!b)throw Error('Missing button: '+${JSON.stringify(text)});b.click()})()`);await wait(150)};
  const page=async name=>{win.webContents.send('garden:page',name);await wait(200)};
  fs.mkdirSync(out,{recursive:true});const shot=async name=>fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
  await win.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'friends'}});
  await until(()=>js('document.body.textContent.includes("虚拟花园与商店")'));
  await click('看土地 / 逛商店');await until(()=>js('document.body.textContent.includes("棉花糖 · 模拟的花园名片")'));
  await click('一起培育');assert.ok(rehearsal.visit('test:guest').tasks[0].members['test:me']);await click('暂停参与');await shot('friend-garden');
  await click('我的土地');await until(()=>js('!!document.querySelector(".plot-sprays")'));
  await js('document.querySelector(".plot-sprays").open=true');await click('使用色彩喷雾');
  assert.equal(rehearsal.get().life.sprays.color,4);await until(()=>js('document.body.textContent.includes("保留原样（喷雾已消耗）")'));await js('document.querySelector(".plot-sprays").scrollIntoView({block:"start"})');await wait(100);await shot('crop-spray');
  await click('保留原样（喷雾已消耗）');await js('document.querySelectorAll(".result-popup button").forEach(b=>b.click())');
  await click('与背包果实繁育 ♡');assert.ok(await js('document.body.textContent.includes("精油")'));
  await page('shop');assert.equal(await js('document.querySelectorAll(".shop-tabs button").length'),2);await click('今日小店');await shot('shop-tabs');
  await page('sow');assert.ok(await js('[...document.querySelectorAll(".seed-card")].every(c=>c.textContent.includes("分钟成熟"))'));await shot('sowing');
  win.setSize(560,680);await wait(200);assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));await shot('sowing-small');
  await page('bag');assert.equal(await js('document.body.textContent.includes("用喷雾换个模样")'),false);
  // Verify the small menu beside a desktop plot, not just the full seed page.
  await win.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'strip'}});
  await until(()=>js('document.querySelectorAll("[data-plot]").length===6'));
  await js('document.querySelectorAll("[data-plot]")[3].click()');assert.ok(await js('document.querySelector(".quick-menu").textContent.includes("分钟成熟")'));
  assert.deepEqual(errors,[]);console.log('PASS: rehearsal visits/cooperation, field spray, breeding entry, merged shop, sowing duration and narrow layout. '+out);app.exit(0);
}catch(e){console.error(e);app.exit(1)}});
