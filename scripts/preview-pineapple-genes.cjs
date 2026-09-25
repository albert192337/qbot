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
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 const bundled=path.join(root,'output/pineapple-lab/pineapple-preview/index.html');
 await win.loadFile(fs.existsSync(bundled)?bundled:path.join(root,'app/out/renderer/pineapple-preview/index.html'));
 const js=s=>win.webContents.executeJavaScript(s);
 for(let i=0;i<120&&await js('document.body.dataset.ready')!=='true';i++)await wait(200);
 assert.equal(await js('document.body.dataset.ready'),'true','model loaded');
 const shot=async name=>{await wait(160);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 if(!show){
  const ids=await js(`Array.from(document.querySelectorAll('[data-trait]'),e=>e.dataset.trait)`);assert.equal(ids.length,60);
  await js(`document.getElementById('motion').click()`);await wait(150);
  await shot('original');
  const rect=await js(`(()=>{const b=document.getElementById('scene').getBoundingClientRect();return {x:Math.round(b.x+b.width*.1),y:Math.round(b.y+b.height*.12),width:Math.round(b.width*.8),height:Math.round(b.height*.64)}})()`);
  const baseline=(await win.webContents.capturePage(rect)).toPNG();
  for(const id of ids){await js(`document.getElementById('reset').click();document.querySelector('[data-trait="${id}"]').click()`);assert.equal(await js(`document.body.dataset.selection`),id);await wait(130);const view=(await win.webContents.capturePage(rect)).toPNG();assert.notDeepEqual(view,baseline,'visible effect: '+id);}
  await js(`document.getElementById('reset').click();for(const id of ['shiny','moon','punk'])document.querySelector('[data-trait="'+id+'"]').click()`);assert.equal(await js(`document.querySelectorAll('[data-slot="accessory"]:checked').length`),2);
  await js(`document.querySelector('[data-trait="golden"]').click();document.querySelector('[data-trait="crystal"]').click()`);assert.equal(await js(`document.querySelectorAll('[data-slot="skin"]:checked').length`),1);
  for(let i=1;i<6;i++){await js(`document.querySelector('[data-preset="${i}"]').click()`);await shot('preset-'+i);}
  await js(`document.getElementById('background').click()`);await shot('light');
  win.setSize(720,900);await wait(200);assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);await shot('narrow');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['60 traits rendered and changed model view','leaf single selection','two ornament maximum','five mixed presets','narrow layout'],errors},null,2));app.quit();return;
 }
 await js(`document.querySelector('[data-preset="1"]').click()`);await shot('opened');win.show();win.focus();fs.writeFileSync(path.join(out,'opened.json'),JSON.stringify({pid:process.pid,ready:true,errors},null,2));
}catch(e){fs.writeFileSync(path.join(out,'error.json'),JSON.stringify({error:String(e.stack)},null,2));console.error(e);app.exit(1);}});
app.on('window-all-closed',()=>app.quit());
