// Run with Electron; isolated from real application data.
const {app,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/strawberry-desktop');
fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-desktop-berry-')));
const ts=require('../node_modules/typescript');
const source=fs.readFileSync(path.join(root,'app/src/main/gene-preview.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const Module=require('node:module'),mod=new Module(__filename,module);mod.filename=__filename;mod.paths=module.paths;mod._compile(compiled,__filename);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
  const win=mod.exports.openDesktopGenePreview(path.join(root,'app/out/renderer/gene-preview/index.html'));
  const js=s=>win.webContents.executeJavaScript(s);
  await new Promise(r=>win.webContents.once('did-finish-load',r));
  for(let i=0;i<60&&await js('document.body.dataset.ready')!=='true';i++)await wait(250);
  assert.equal(await js('document.body.dataset.ready'),'true');
  assert.equal(await js('document.body.classList.contains("desktop")'),true);
  await wait(1200);
  const image=await win.webContents.capturePage(),bitmap=image.toBitmap();
  assert.equal(bitmap[3],0,'top-left pixel must be transparent');
  assert(bitmap.some((v,i)=>i%4===3&&v>100),'specimen must have visible pixels');
  fs.writeFileSync(path.join(out,'crystal.png'),image.toPNG());
  for(const i of [0,2,3]){await js(`document.querySelector('[data-preset="${i}"]').click()`);await wait(800);fs.writeFileSync(path.join(out,`preset-${i}.png`),(await win.webContents.capturePage()).toPNG());}
  await js(`document.querySelector('[data-preset="1"]').click()`);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,pid:process.pid,bounds:win.getBounds(),checks:['transparent corners','visible specimen','four desktop presets'],time:new Date().toISOString()},null,2));
  if(!process.argv.includes('--show'))app.quit();
 }catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:false,error:String(e.stack)}));app.exit(1);}
});
app.on('window-all-closed',()=>app.quit());
