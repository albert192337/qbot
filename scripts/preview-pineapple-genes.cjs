// Isolated preview: no preload, account access, network or real garden saves.
const {app,BrowserWindow,session,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/pineapple-genes');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'qbot-pineapple-genes-')));
const show=process.argv.includes('--show'),wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const area=screen.getPrimaryDisplay().workArea;
 const win=new BrowserWindow({width:Math.min(1380,area.width),height:Math.min(980,area.height),show:false,autoHideMenuBar:true,title:'菠萝词条工坊 · 果实 / 叶冠 / 挂饰',backgroundColor:'#f5f3ec',webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false,offscreen:!show}});
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});let specimenWindow=null;const specimenWindows=new Set();
 win.webContents.setWindowOpenHandler(({url})=>{const target=new URL(url),source=new URL(win.webContents.getURL());if(target.origin!==source.origin||target.pathname!==source.pathname||target.searchParams.get('desktop')!=='1')return {action:'deny'};const slot=specimenWindows.size,columns=Math.max(1,Math.floor(area.width/300));return {action:'allow',overrideBrowserWindowOptions:{show:true,width:360,height:460,x:area.x+Math.max(0,area.width-370-(slot%columns)*300),y:area.y+Math.max(0,area.height-470-(Math.floor(slot/columns)%2)*180),frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,alwaysOnTop:true,resizable:false,autoHideMenuBar:true,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false,offscreen:false}}};});
 win.webContents.on('did-create-window',child=>{specimenWindow=child;specimenWindows.add(child);child.webContents.setWindowOpenHandler(()=>({action:'deny'}));child.webContents.once('did-finish-load',()=>child.webContents.on('will-navigate',e=>e.preventDefault()));child.webContents.on('before-input-event',(_e,input)=>{if(input.key==='Escape')child.close();});child.on('closed',()=>{specimenWindows.delete(child);if(specimenWindow===child)specimenWindow=null;});});win.on('closed',()=>{for(const child of specimenWindows)if(!child.isDestroyed())child.close();});
 const bundled=path.join(root,'output/pineapple-lab/pineapple-preview/index.html');
 await win.loadFile(fs.existsSync(bundled)?bundled:path.join(root,'app/out/renderer/pineapple-preview/index.html'),{query:{...(process.argv.includes('--strawberry')?{model:'strawberry'}:{}),...(process.argv.includes('--bow')?{accessory:'pinkbow'}:{})}});
 if(show){win.show();win.focus();}
 const js=s=>win.webContents.executeJavaScript(s);
 for(let i=0;i<120&&await js('document.body.dataset.ready')!=='true';i++)await wait(200);
 assert.equal(await js('document.body.dataset.ready'),'true','model loaded');
 const shot=async name=>{await wait(160);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 if(!show&&process.argv.includes('--desktop-test')){
  const add=async()=>{await js("document.getElementById('desktop-toggle').click()");const child=specimenWindow;for(let i=0;i<150&&await child.webContents.executeJavaScript('document.body.dataset.ready')!=='true';i++)await wait(200);await wait(400);return child;};
  const first=await add();const initial=await first.webContents.executeJavaScript('document.body.dataset.selection');
  await js("document.getElementById('reset').click();document.querySelector('[data-trait=starcore]').click()");const second=await add();
  await js("document.getElementById('species').value='pineapple';document.getElementById('species').dispatchEvent(new Event('change'))");const third=await add();
  assert.equal(specimenWindows.size,3);assert.equal(await first.webContents.executeJavaScript('document.body.dataset.selection'),initial);assert.equal(await second.webContents.executeJavaScript('document.body.dataset.species'),'strawberry');assert.equal(await third.webContents.executeJavaScript('document.body.dataset.species'),'pineapple');
  assert.notEqual(first.getBounds().x,second.getBounds().x);await shot('multiple-desktop-fruits');
  await second.webContents.executeJavaScript("document.getElementById('desktop-return').click()");for(let i=0;i<30&&specimenWindows.size!==2;i++)await wait(100);assert.equal(specimenWindows.size,2);
  await js("document.getElementById('desktop-recall').click()");for(let i=0;i<30&&specimenWindows.size;i++)await wait(100);assert.equal(specimenWindows.size,0);
  await add();assert.equal(specimenWindows.size,1);win.close();for(let i=0;i<50&&specimenWindows.size;i++)await wait(100);assert.equal(specimenWindows.size,0);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'desktop-result.json'),JSON.stringify({ok:true,checks:['three independent snapshots','mixed species','staggered placement','single recall','recall all','parent close cleanup'],errors},null,2));app.quit();return;
 }
 if(!show&&process.argv.includes('--bow')){
  assert.ok(Number(await js('document.body.dataset.bowTriangles'))>0);
  await js("document.getElementById('motion').click()");await shot('bow-strawberry');
  await js("document.querySelector('[data-trait=balloon]').click()");await shot('bow-two-accessories');
  await js("document.getElementById('reset').click();document.querySelector('[data-trait=pinkbow]').click();document.getElementById('species').value='pineapple';document.getElementById('species').dispatchEvent(new Event('change'))");await shot('bow-pineapple');
  assert.ok(await js("document.querySelector('[data-trait=pinkbow]').checked"));assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'bow-result.json'),JSON.stringify({ok:true,errors},null,2));app.quit();return;
 }
 if(!show&&process.argv.includes('--strawberry')){
  assert.equal(await js('document.body.dataset.species'),'strawberry');
  const regions=JSON.parse(await js('document.body.dataset.strawberryRegions'));
  assert.equal(regions.filter(r=>!r.base).reduce((n,r)=>n+r.triangles,0),4876);
  assert.ok(regions.some(r=>r.leaf&&r.triangles>0));assert.ok(regions.some(r=>r.base));
  await js(`document.getElementById('motion').click()`);await shot('strawberry-original');
  for(const preset of [1,5,6]){await js(`document.querySelector('[data-preset="${preset}"]').click()`);await shot('strawberry-preset-'+preset);}
  await js(`document.getElementById('reset').click();document.querySelector('[data-trait=obsidian]').click()`);await shot('strawberry-black-calyx');
  await js(`document.getElementById('base-toggle').click()`);await shot('strawberry-no-base');
  await js(`document.getElementById('species').value='pineapple';document.getElementById('species').dispatchEvent(new Event('change'))`);assert.equal(await js('document.body.dataset.species'),'pineapple');await shot('pineapple-switch-back');
  await js(`document.getElementById('species').value='strawberry';document.getElementById('species').dispatchEvent(new Event('change'));document.getElementById('base-toggle').click();document.getElementById('reset').click();for(let i=0;i<10;i++)document.getElementById('scene').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))`);await shot('strawberry-side');
  win.setSize(720,900);await wait(200);assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);await shot('strawberry-narrow');assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'strawberry-result.json'),JSON.stringify({ok:true,regions,errors},null,2));app.quit();return;
 }
 if(!show){
  const ids=await js(`Array.from(document.querySelectorAll('[data-trait]'),e=>e.dataset.trait)`);assert.equal(ids.length,63);
  await js(`document.getElementById('motion').click()`);await wait(150);
  await shot('original');
  const repair=JSON.parse(await js('document.body.dataset.regionRepair'));assert.equal(repair.triangles,32000);assert.ok(repair.crownToFruit>0);assert.ok(repair.fruitToCrown>0);
  assert.equal(await js('document.querySelectorAll(".choice[data-quality]").length'),63);
  await js('document.querySelector("[data-trait=obsidian]").click()');await shot('obsidian-fixed');
  await js('document.getElementById("reset").click()');
  const rect=await js(`(()=>{const b=document.getElementById('scene').getBoundingClientRect();return {x:Math.round(b.x+b.width*.1),y:Math.round(b.y+b.height*.12),width:Math.round(b.width*.8),height:Math.round(b.height*.64)}})()`);
  const baseline=(await win.webContents.capturePage(rect)).toPNG();
  for(const id of ids){await js(`document.getElementById('reset').click();document.querySelector('[data-trait="${id}"]').click()`);assert.equal(await js(`document.body.dataset.selection`),id);await wait(130);const view=(await win.webContents.capturePage(rect)).toPNG();assert.notDeepEqual(view,baseline,'visible effect: '+id);}
  await js(`document.getElementById('reset').click();for(const id of ['shiny','moon','punk'])document.querySelector('[data-trait="'+id+'"]').click()`);assert.equal(await js(`document.querySelectorAll('[data-slot="accessory"]:checked').length`),2);
  await js(`document.querySelector('[data-trait="golden"]').click();document.querySelector('[data-trait="crystal"]').click()`);assert.equal(await js(`document.querySelectorAll('[data-slot="skin"]:checked').length`),1);
  for(let i=1;i<7;i++){await js(`document.querySelector('[data-preset="${i}"]').click()`);await shot('preset-'+i);}
  await js(`document.querySelector('[data-trait=giant]').click();document.getElementById('front').click()`);await shot('cotton-balloon-giant');
  await js(`for(let i=0;i<8;i++)document.getElementById('scene').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))`);await shot('cotton-balloon-side');
  await js(`document.getElementById('background').click()`);await shot('light');
  win.setSize(720,900);await wait(200);assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);await shot('narrow');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['62 traits rendered and changed model view','leaf single selection','two ornament maximum','six mixed presets','32000 faces preserved and islands reassigned','62 quality backgrounds','balloon with giant and reset' ,'narrow layout'],errors},null,2));app.quit();return;
 }
 if(!process.argv.includes('--strawberry'))await js(`document.querySelector('[data-preset="6"]').click()`);win.show();win.focus();fs.writeFileSync(path.join(out,'opened.json'),JSON.stringify({pid:process.pid,ready:true,errors},null,2));
}catch(e){fs.writeFileSync(path.join(out,'error.json'),JSON.stringify({error:String(e.stack)},null,2));console.error(e);app.exit(1);}});
app.on('window-all-closed',()=>{if(!process.argv.includes('--desktop-test'))app.quit();});
