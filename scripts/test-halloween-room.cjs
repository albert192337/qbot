// Production renderer, real capsule rules, isolated inventory and room save.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/halloween-import');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-halloween-')));
const ts=require('typescript');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,f);
const {HALLOWEEN_FURNITURE,validateFurniture3dInventory}=require('../app/src/shared/halloween-furniture.ts');
const {validateRoom3d}=require('../app/src/shared/room3d.ts');
const {CAPSULE_3D_POOL}=require('../app/src/shared/social-economy.ts');
const {initialGarden,transition}=require('../app/src/main/garden/rules.ts');
const {ensureLife}=require('../app/src/main/garden/life-rules.ts');const {enableV3}=require('../app/src/main/garden/v3-rules.ts');
let seq=0;const now=Date.now(),rng={id:()=>`qa-${++seq}`,random:()=>.1};let state=initialGarden(now,rng);ensureLife(state,now,rng,'pet');enableV3(state,now);state.economy.tokens=420;
let saved={layout:[],wallsVisible:false};
ipcMain.handle('characters:getActive',()=>null);ipcMain.handle('characters:list',()=>[]);ipcMain.handle('garden:get',()=>state);ipcMain.handle('room:get3d',()=>saved);
ipcMain.handle('room:save3d',(_,v)=>{const clean=validateRoom3d(v);validateFurniture3dInventory(clean.layout,state.economy.furniture);saved=clean;return saved;});
app.whenReady().then(async()=>{try{
const w=new BrowserWindow({width:1380,height:960,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,offscreen:true,backgroundThrottling:false}});const errors=[];w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});const js=s=>w.webContents.executeJavaScript(s);const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async s=>{for(let i=0;i<200;i++){if(await js(s))return;await wait(50)}throw Error(s)};
await w.loadFile(path.join(root,'app/out/renderer/tea3d/index.html'),{query:{editor:'1'}});await until(`document.body.dataset.ready==='true'`);
assert.equal(await js(`document.querySelectorAll('.item[data-asset^="halloween-"]:disabled').length`),7);
await js(`window.tea3d.add('halloween-fireplace')`);assert.equal(await js('window.tea3d.layout.length'),0);
for(const item of HALLOWEEN_FURNITURE){const pool=CAPSULE_3D_POOL.filter(x=>x.tier===item.tier),i=pool.findIndex(x=>x.id===item.id),pick=(pool.slice(0,i).reduce((n,x)=>n+x.weight,0)+pool[i].weight/2)/100;let call=0;state=transition(state,{type:'capsuleDraw3d',count:1},now,{id:rng.id,random:()=>call++?pick:{common:.1,rare:.8,epic:.99}[item.tier]}).state;}
w.webContents.send('garden:changed');await until(`document.querySelectorAll('.item[data-asset^="halloween-"]:disabled').length===0`);
for(const item of HALLOWEEN_FURNITURE){await js(`window.tea3d.add(${JSON.stringify(item.id)})`);const count=await js('window.tea3d.layout.length');await js(`window.tea3d.add(${JSON.stringify(item.id)})`);assert.equal(await js('window.tea3d.layout.length'),count);}
assert.equal(await js('window.tea3d.layout.length'),7);await js(`document.querySelector('#save').click()`);await until(`document.querySelector('#save').textContent==='保存布置'`);assert.equal(saved.layout.length,7);
await w.webContents.reload();await until(`document.body.dataset.ready==='true'`);assert.equal(await js('window.tea3d.layout.length'),7);
// Photograph a curated arrangement using the same validated saved-state format.
const poses={'halloween-candles':[-2.4,1.1],'halloween-books':[-3.5,.8],'halloween-lantern':[-3,-1.4],'halloween-fireplace':[0,-1.65],'halloween-pumpkins':[0,.6],'halloween-cauldron':[3,-1.4],'halloween-chandelier':[0,0]};saved.layout=saved.layout.map(p=>({...p,x:poses[p.asset][0],z:poses[p.asset][1]}));
await w.webContents.reload();await until(`document.body.dataset.ready==='true'`);assert.equal(await js('window.tea3d.layout.length'),7);
await js(`window.tea3d.select(window.tea3d.layout.find(p=>p.asset==='halloween-books').key);document.querySelector('#rotate').click()`);assert.equal(await js(`window.tea3d.layout.find(p=>p.asset==='halloween-books').angle`),Math.PI/4);
await js(`document.querySelector('#remove').click()`);assert.equal(await js(`document.querySelector('.item[data-asset="halloween-books"]').disabled`),false);await js(`document.querySelector('#undo').click();window.tea3d.select(null)`);
await wait(500);fs.writeFileSync(path.join(out,'room.png'),(await w.webContents.capturePage()).toPNG());
assert.equal(await js(`document.body.dataset.modelFallback`),undefined);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['locked until won','all seven real rewards','live inventory refresh','duplicate placement rejected','save and reload','ceiling and floor coexist','rotate remove undo','all models loaded'],stats:await js('window.tea3d.stats()'),errors},null,2));const assets=fs.readdirSync(path.join(root,'app/out/renderer/assets')),bundle=assets.find(n=>/^rewards-.*\.js$/.test(n));
const styles=assets.filter(n=>/^(capsule|social-economy|appearance-shop)-.*\.css$/.test(n));
const html=path.join(root,'app/out/renderer/halloween-capsule-qa.html');
fs.writeFileSync(html,`<!doctype html><meta charset="utf-8">${styles.map(n=>`<link rel="stylesheet" href="assets/${n}">`).join('')}<style>body{background:#f8f3e9;font:14px Microsoft YaHei;margin:20px}.appearance-shop{display:none}</style><main></main><script type="module">import {mount} from './assets/${bundle}';await mount(document.querySelector('main'));document.body.dataset.ready='true';</script>`);
await w.loadFile(html);await until(`document.body.dataset.ready==='true'`);
await js(`document.querySelector('button[data-machine="3d"]').click()`);assert.ok(await js(`document.querySelector('.capsule-feature').textContent.includes('万圣夜')`));
await wait(400);fs.writeFileSync(path.join(out,'capsule.png'),(await w.webContents.capturePage()).toPNG());
await js(`document.querySelector('.capsule-link').click()`);
assert.equal(await js(`document.querySelectorAll('.capsule-pool-list>div').length`),CAPSULE_3D_POOL.length);
for(const item of HALLOWEEN_FURNITURE)assert.ok(await js(`document.querySelector('.capsule-pool-list').textContent.includes(${JSON.stringify(item.name)})`));
assert.ok(await js(`Array.from(document.querySelectorAll('.capsule-pool-list .garden-furniture-thumb')).filter(n=>n.getAttribute('aria-label').match(/幽夜|女巫|南瓜|万圣|古堡/)).every(n=>n.style.backgroundImage.includes('halloween-'))`));
await js(`document.querySelector('dialog').close()`);delete state.economy.furniture3dRevision;delete state.economy.capsuleMachineRevision;w.webContents.send('garden:changed');await until(`document.querySelector('.capsule-unavailable')`);await js(`document.querySelector('button[data-machine="2d"]').click()`);await js(`document.querySelector('.capsule-link').click()`);assert.equal(await js(`document.querySelector('.capsule-pool-list').textContent.includes('万圣壁炉')`),false);
assert.deepEqual(errors,[]);const report=JSON.parse(fs.readFileSync(path.join(out,'result.json'),'utf8'));report.checks.push('capsule theme and thumbnails','all seven published odds','older server keeps original pool');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log('Halloween room, inventory and capsule UI passed');app.exit(0);
}catch(e){console.error(e);app.exit(1)}});setTimeout(()=>app.exit(2),60000).unref();
