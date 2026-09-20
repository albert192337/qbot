// Actual production renderer, isolated fixtures. Contact sheets rearrange its DOM only.
const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), ts = require(path.join(root, 'node_modules/typescript'));
require.extensions['.ts'] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'qbot-art-')));
const wait = ms => new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try {
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
  const { initialGarden, value } = require('../app/src/main/garden/rules.ts');
  const { SPECIES, TRAITS } = require('../app/src/shared/garden.ts');
  const species = ['pineapple','strawberry','carrot','sunflower','lotus','tulip','tomato','blueberry','apple'];
  let n=0; const rng={random:()=>.99,id:()=>String(n++)};
  let state = initialGarden(Date.now(),rng);
  const item=(sp,traits=[])=>{const p={id:rng.id(),species:sp,traits,kg:1,value:0,bred:false};p.value=value(p);return p;};
  state.produce=species.map(sp=>item(sp));
  state.plots=state.produce.map(p=>({...p,plantedAt:Date.now()-1e6,readyAt:Date.now()-1,fertilizers:[],harvestsLeft:3,harvestIndex:0}));
  state.seeds=species.map(sp=>({id:rng.id(),species:sp,genes:['punk','petals'],generation:0}));
  ipcMain.handle('garden:get',()=>state);ipcMain.on('garden:ignore',()=>{});
  const prefs={preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,offscreen:true,backgroundThrottling:false};
  const panel=new BrowserWindow({width:1050,height:890,show:false,webPreferences:prefs});
  const strip=new BrowserWindow({width:1200,height:800,show:false,transparent:true,webPreferences:prefs});
  const errors=[];for(const w of [panel,strip])w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
  const load=async(w,view)=>{await w.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view}});await wait(350);await w.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode()))');await wait(150)};
  const js=c=>panel.webContents.executeJavaScript(c);
  const out=path.join(root,'output/plant-art-study-2026-09-19/rollout');fs.mkdirSync(out,{recursive:true});
  const shot=async(name)=>{await wait(350);fs.writeFileSync(path.join(out,name+'.png'),(await panel.webContents.capturePage()).toPNG());};
  await load(panel,'bag');await load(strip,'strip');
  const assets=await js('[...document.querySelectorAll(".produce-card .art>img")].map(i=>({src:i.src,w:i.naturalWidth}))');
  assert.equal(assets.length,9);assert.ok(assets.every(i=>i.w>500&&!i.src.startsWith('data:')));
  assert.equal(new Set(assets.map(i=>i.src)).size,9);
  const plants=await strip.webContents.executeJavaScript('[...document.querySelectorAll("[data-plot]>.art")].map(a=>a.outerHTML)');
  const fruits=await js('[...document.querySelectorAll(".produce-card>.art")].map(a=>a.outerHTML)');
  assert.equal(plants.length,9);
  const seedCheck=await js('[...document.querySelectorAll(".seed-art")].map(a=>({n:a.querySelectorAll(":scope > img").length,emblem:a.querySelector(".seed-emblem")?.dataset.species,filter:getComputedStyle(a.querySelector("img")).filter}))');
  assert.equal(seedCheck.length,9);assert.ok(seedCheck.every(s=>s.n===1&&s.emblem&&s.filter==='none'));
  const gallery=async(title,subtitle,contents,cols)=>js(`(()=>{
   document.body.className='art-review';document.querySelector('#app').innerHTML='<h1>'+ ${JSON.stringify(title)} +'</h1><p>'+ ${JSON.stringify(subtitle)} +'</p><section class="review-grid">'+${JSON.stringify(contents)}+'</section>';
   let s=document.querySelector('#art-review-style');if(!s){s=document.createElement('style');s.id='art-review-style';document.head.append(s)}
   s.textContent='.art-review{margin:0;padding:28px 36px;background:#faf6ec;color:#684d59;overflow:hidden}.art-review #app{max-width:none;padding:0;background:none;border:0;border-radius:0;box-shadow:none}.art-review h1{font:600 25px Georgia,serif;margin:0 0 8px}.art-review p{font-size:13px;color:#938576;margin:0 0 24px}.review-grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px}.review-cell{padding:14px 10px;border:1px solid #e8dfcd;border-radius:18px;background:#fffdf7;text-align:center}.review-row{display:flex;align-items:end;justify-content:center;gap:10px}.review-cell .art{position:relative!important;left:auto!important;bottom:auto!important;width:130px!important;height:130px!important;--fx-width:130px!important;--fx-height:130px!important;--fx-bottom:0px!important;background:none;padding:0;margin:0}.review-cell strong{display:block;font-size:14px;margin-top:10px}.review-cell small{display:block;color:#9e8e7d;font-size:11px;margin-top:5px}.review-cell .art.giant{scale:1.08}';
   for(const a of document.querySelectorAll('.art')){a.classList.remove('fx-offscreen');a.removeAttribute('data-plant')}
  })()`);
  const cards=species.map((sp,i)=>'<article class="review-cell"><div class="review-row">'+plants[i]+fruits[i]+'</div><strong>'+SPECIES[sp].name+'</strong><small>种植形态 · 收获形态</small></article>').join('');
  await gallery('小小花园 · 全植物','简约、可爱、精致 · 实际游戏素材与渲染',cards,3);await shot('all-species');
  // Exercise every trait independently, then combinations and twins in the normal bag.
  const traitList=Object.keys(TRAITS);
  const combos=[...traitList.map(t=>[t]),['punk','rainbow','shiny'],['classical','petals','golden'],['frost','thunder','shiny'],['twin','punk','petals']];
  state.produce=combos.map((t,i)=>item(i%2?'strawberry':'pineapple',t));
  await load(panel,'bag');
  assert.equal(await js('document.querySelectorAll(".produce-card .accessory-punk").length'),4);
  assert.ok(await js('[...document.querySelectorAll(".produce-card .art")].every(a=>getComputedStyle(a.querySelector("img")).filter==="none")'));
  assert.equal(await js('document.querySelector(".art.firefly").querySelectorAll(".particles-firefly i").length'),5);
  assert.equal(await js('document.querySelector(".art.petals").querySelectorAll(".particles-petal i").length'),7);
  assert.equal(await js('document.querySelectorAll(".accessory-layer").length'),0);
  assert.ok(await js(`(()=>{
   const a=document.querySelector('.produce-card .art.purple'),img=a.querySelector('img').getBoundingClientRect(),fx=a.querySelector('.mutation-surface').getBoundingClientRect();
   const side=Math.min(img.width,img.height);
   return Math.abs(fx.width-side)<1&&Math.abs(fx.left-(img.left+(img.width-side)/2))<1&&Math.abs(fx.bottom-img.bottom)<1;
  })()`),'Material sprite stays registered to the image including card padding');
  const traits=await js('[...document.querySelectorAll(".produce-card>.art")].map(a=>a.outerHTML)');
  const traitCards=traits.map((art,i)=>'<article class="review-cell"><div class="review-row">'+art+'</div><strong>'+combos[i].map(t=>TRAITS[t].name).join(' · ')+'</strong></article>').join('');
  panel.setSize(1180,850);
  await gallery('小小花园 · 词条效果','配饰、染色与轻量粒子 · 最后一排为组合效果',traitCards,6);await shot('trait-effects');
  // Reduced motion and narrow bag still run against the untouched production layout.
  await load(panel,'bag');panel.setSize(480,640);await wait(200);
  assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
  panel.webContents.debugger.attach('1.3');
  await panel.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await js('[...document.querySelectorAll(".mutation-art *")].every(e=>getComputedStyle(e).animationName==="none")'));
  assert.deepEqual(errors,[]);
  console.log('PASS: nine painted plant/fruit pairs, seed emblems, all 14 traits, 4 combinations, twins, 480px layout, reduced motion. '+out);
  app.exit(0);
 } catch(e){console.error(e);app.exit(1)}
});
