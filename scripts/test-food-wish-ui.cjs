// The actual food-wish component + actual preload; isolated IPC data and no network.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),core=require('../rooms/generated/garden-core.cjs');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-food-wish-ui-')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 let seq=0;const rng={random:()=>.5,id:()=>`fixture-${++seq}`},state=core.initialGarden(Date.now(),rng);core.ensureLife(state,Date.now(),rng,'pet-a');
 let opened;ipcMain.handle('garden:get',()=>state);ipcMain.on('garden:open',(_,page)=>opened=page);
 const win=new BrowserWindow({width:320,height:350,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 const mascot=fs.readFileSync(path.join(root,'app/resources/presets/mascot/actions/idle.gif')).toString('base64');
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<html><body style="background:#f5f0df"><img alt="测试角色" src="data:image/gif;base64,${mascot}" style="position:absolute;left:40px;top:80px;width:240px;height:240px;object-fit:contain"></body></html>`));
 const built=require('esbuild').buildSync({entryPoints:[path.join(root,'app/src/renderer/pet/food-wish.ts')],bundle:true,write:false,format:'iife',globalName:'FoodWish',loader:{'.css':'empty'}}).outputFiles[0].text;
 await win.webContents.insertCSS(fs.readFileSync(path.join(root,'app/src/renderer/pet/food-wish.css'),'utf8'));
 const js=code=>win.webContents.executeJavaScript(code);await js(built+';window.disposeWish=FoodWish.mountFoodWish();void 0;');await wait(200);
 assert.equal(await js('document.querySelector("#food-wish").hidden'),false);
 await js('document.querySelector(".food-wish-open").click()');await wait(50);assert.equal(opened,'feeding');
 await js('document.querySelector(".food-wish-close").click()');win.webContents.send('garden:changed');await wait(100);assert.equal(await js('document.querySelector("#food-wish").hidden'),true);
 state.life.characters['pet-a'].wishes[0].done=true;win.webContents.send('garden:changed');await wait(100);assert.equal(await js('document.querySelector("#food-wish").hidden'),false);
 const out=path.join(root,'output/garden-life');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'food-bubble.png'),(await win.webContents.capturePage()).toPNG());
 win.webContents.send('garden:interaction',{effect:'flower',kind:'flower',caption:'这朵花送给你'});await wait(100);assert.equal(await js('document.querySelector("#network-interaction").hidden'),false);
 assert.equal(await js('document.querySelector("#food-wish").hidden'),true);await js('window.disposeWish()');assert.equal(await js('document.querySelector("#food-wish")'),null);
 console.log('PASS: food bubble opens feeding, dismiss survives refresh, next wish returns, accepted interaction feedback, disposal');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
