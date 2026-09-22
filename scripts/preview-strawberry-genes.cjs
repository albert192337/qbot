// Isolated visual preview and smoke test. Never loads the application or its save files.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'qbot-genes-')));
const show=process.argv.includes('--show');
const out=path.join(root,'output/strawberry-genes');fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
  const win=new BrowserWindow({width:1240,height:960,show,autoHideMenuBar:true,title:'QBot · 草莓基因工坊',backgroundColor:'#f6f4ed',webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
  await win.loadFile(path.join(root,'app/out/renderer/gene-preview/index.html'));
  if(show){win.show();win.focus();fs.writeFileSync(path.join(out,'opened.json'),JSON.stringify({pid:process.pid,title:win.getTitle(),time:new Date().toISOString()}));return;}
  const js=code=>win.webContents.executeJavaScript(code);
  for(let i=0;i<40&&await js('document.body.dataset.ready')!=='true';i++)await wait(250);
  assert.equal(await js('document.body.dataset.ready'),'true');
  assert.equal(await js('document.querySelectorAll("[data-slot]").length'),12);
  const screenshot=async name=>{await wait(350);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
  await screenshot('crystal');
  const first=(await win.webContents.capturePage()).toPNG();await wait(600);const second=(await win.webContents.capturePage()).toPNG();assert.notDeepEqual(first,second,'animation changes the scene');
  for(let i=0;i<4;i++){
   await js(`document.querySelector('[data-preset="${i}"]').click()`);
   assert.equal(await js(`document.querySelector('[data-preset="${i}"]').getAttribute('aria-pressed')`),'true');
   await screenshot('preset-'+i);
  }
  for(const slot of ['fruit','skin','ornament'])for(let i=0;i<4;i++){
   await js(`document.querySelectorAll('[data-slot="${slot}"]')[${i}].click()`);
   assert.equal(await js(`document.querySelectorAll('[data-slot="${slot}"][aria-pressed="true"]').length`),1);
  }
  await js(`document.querySelector('[data-preset="1"]').click();document.getElementById('backdrop').click()`);await screenshot('light');
  await js(`document.getElementById('motion').click();document.getElementById('rotate').click()`);
  await wait(600);
  assert.equal(await js('document.getElementById("motion").getAttribute("aria-pressed")'),'false');
  assert.equal(await js('document.getElementById("rotate").getAttribute("aria-pressed")'),'false');
  win.setSize(640,850);await wait(200);
  assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'),'no narrow horizontal overflow');await screenshot('narrow');
  await js(`document.getElementById('reset').click()`);assert.equal(await js('document.body.dataset.combination'),'normal/natural/none');
  win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await win.reload();await wait(800);
  assert.equal(await js('document.getElementById("motion").getAttribute("aria-pressed")'),'false');
  assert.equal(await js('document.getElementById("rotate").getAttribute("aria-pressed")'),'false');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['WebGL','12 slot choices','4 presets','animated frames','pause controls','640px layout','reset','reduced motion'],time:new Date().toISOString()},null,2));app.exit(0);
 }catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:false,error:String(e.stack)},null,2));console.error(e);app.exit(1);}
});
app.on('window-all-closed',()=>app.quit());
