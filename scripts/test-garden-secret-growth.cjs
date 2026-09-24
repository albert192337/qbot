const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.superpowers/secret-growth');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-secret-')));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const core=require('../rooms/generated/garden-core.cjs');let id=0;
 const state=core.initialGarden(Date.now(),{random:()=>.5,id:()=>String(++id)});
 const now=Date.now();
 state.plots=[.2,.65,.95,1,1,1].map((g,i)=>({id:'secret'+i,species:i===2?'pineapple':'strawberry',traits:[],kg:1,value:10,bred:false,plantedAt:now-g*1000000,readyAt:now+(1-g)*1000000,fertilizers:[],harvestsLeft:3,harvestIndex:0,growthVersion:3,publicQuality:i>=4?'rainbow':i===2?'gold':'normal',revealed:i<4,cultivation:i===5?{remainingMs:600000,startedAt:now}:undefined}));
 ipcMain.handle('garden:get',()=>state);ipcMain.handle('settings:get',()=>({gardenRenderMode:'3d'}));ipcMain.handle('overlays:get',()=>({revision:0,winner:null}));ipcMain.on('garden:ignore',()=>{});
 const w=new BrowserWindow({width:1200,height:800,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 await w.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'strip'}});await wait(1800);
 const js=c=>w.webContents.executeJavaScript(c);
 const appearances=await js(`[...document.querySelectorAll('[data-plot]>.art')].map(a=>({secret:a.classList.contains('secret-growth'),sealed:a.classList.contains('secret-sealed'),active:a.classList.contains('secret-active'),image:!!a.querySelector('img'),canvas:!!a.querySelector('canvas'),gold:a.classList.contains('secret-gold')}))`);
 assert.equal(appearances.length,6);assert.equal(appearances[0].secret,false);
 for(const i of [1,2,4,5]){assert.equal(appearances[i].secret,true);assert.equal(appearances[i].image,false);assert.equal(appearances[i].canvas,false)}
 assert.equal(appearances[2].gold,true);assert.equal(appearances[3].secret,false);assert.equal(appearances[4].sealed,true);assert.equal(appearances[5].active,true);
 w.webContents.send('settings:changed',{gardenRenderMode:'2d'});await wait(500);
 assert.equal(await js(`document.querySelectorAll('[data-plot]>.secret-growth').length`),4);
 assert.equal(await js(`!!document.querySelector('[data-plot="3"]>.art>img')`),true);
 const art=await js(`[...document.querySelectorAll('[data-plot]>.art')].map(a=>a.outerHTML)`);
 await js(`document.body.className='';document.body.innerHTML='<h2>生长与揭晓</h2><main>'+${JSON.stringify(art)}.map((a,i)=>'<section>'+a+'<p>'+['幼苗','孕育中','金色 · 即将成熟','成熟','灵果 · 待培育','灵果 · 培育中'][i]+'</p></section>').join('')+'</main>';void 0`);
 await w.webContents.insertCSS('body{background:#faf6ed!important;color:#665344;padding:30px;margin:0}main{display:flex;gap:12px}section{width:170px;text-align:center;background:#fffaf1;border:1px solid #e5dccb;border-radius:24px;padding:16px 0}.art{position:relative!important;left:auto!important;bottom:auto!important;width:160px!important;height:220px!important;margin:auto!important}h2{font:24px sans-serif}p{font:14px sans-serif}');
 await wait(300);fs.writeFileSync(path.join(out,'stages.png'),(await w.webContents.capturePage()).toPNG());
 // Regrowth must not show a full mature fruit either.
 state.plots[0].harvestIndex=1;state.plots[4].revealed=true;
 await w.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'strip'}});await wait(1000);
 assert.equal(await js(`document.querySelector('[data-plot="0"]>.art').classList.contains('secret-growth')`),true);
 assert.equal(await js(`document.querySelector('[data-plot="4"]>.art').classList.contains('secret-sealed')`),false);
 console.log('PASS: immature/regrowth concealment, quality aura, sealed cultivation, reveal and 3D gating');app.exit(0);
 }catch(e){console.error(e);app.exit(1)}});
