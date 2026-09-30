// Isolated visual/native preview. Does not load accounts, pets or garden saves.
const {app,BrowserWindow,screen,desktopCapturer,session}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('url');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const out=path.resolve(__dirname,'../output/nebula-weather');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',path.join(out,'profile'));
app.on('window-all-closed',()=>{});
process.env.ELECTRON_RENDERER_URL=pathToFileURL(path.resolve(__dirname,'../app/out/renderer')).href;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 let win,surface;let lost=false;
 const guard=setTimeout(()=>{surface?.dispose();app.exit(2)},90000);
 try{
  session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/^https?:/.test(d.url)}));
  win=new BrowserWindow({width:1280,height:800,show:false,webPreferences:{sandbox:true,backgroundThrottling:false}});
  await win.loadURL(process.env.ELECTRON_RENDERER_URL+'/weather/index.html');
  win.showInactive();
  await win.webContents.executeJavaScript("window.qbotWeather.snapshot('nebula')");
  const first=await win.webContents.capturePage();fs.writeFileSync(path.join(out,'nebula.png'),first.toPNG());
  await delay(4000);const second=await win.webContents.capturePage();
  assert(!first.toPNG().equals(second.toPNG()),'Clouds continue moving after snapshot');
  await win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await delay(200);const still=await win.webContents.capturePage();await delay(500);
  assert(still.toPNG().equals((await win.webContents.capturePage()).toPNG()),'Reduced motion is static');
  win.destroy();win=null;
  const {createBitmapWeatherSurface}=require('../app/src/main/weather-surface.ts');
  surface=await createBitmapWeatherSurface(screen.getPrimaryDisplay(),()=>{lost=true},true);
  await surface.transition('nebula');await delay(400);
  const capture=async name=>{const d=screen.getPrimaryDisplay();const all=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:Math.round(d.size.width*d.scaleFactor),height:Math.round(d.size.height*d.scaleFactor)}});const img=(all.find(s=>s.display_id===String(d.id))||all[0]).thumbnail;fs.writeFileSync(path.join(out,name+'.png'),img.toPNG());return img;};
  const a=await capture('native-start');await delay(4000);const b=await capture('native-moving');
  const d=screen.getPrimaryDisplay(),factor=d.scaleFactor;
  const region={x:Math.round((180-d.bounds.x)*factor),y:Math.round((140-d.bounds.y)*factor),width:Math.round(900*factor),height:Math.round(580*factor)};
  assert(!a.crop(region).toPNG().equals(b.crop(region).toPNG()),'Native preview keeps animating');
  assert.equal(BrowserWindow.getAllWindows().length,0,'Nebula has no always-on-top foreground');
  await surface.transition('meteor');await surface.transition('nebula');await surface.transition(null);surface.dispose();surface=null;
  assert.equal(lost,false,'Native compositor stays healthy');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({rendererMotion:true,reducedMotion:true,nativeMotion:true,switchRestore:true},null,2));
  console.log('PASS: nebula movement, reduced motion, native preview, switching, restoration');
  clearTimeout(guard);
  if(process.argv.includes('--preview')){
   win=new BrowserWindow({width:1280,height:800,title:'星云梦境 · 天气试用',autoHideMenuBar:true,webPreferences:{sandbox:true}});
   await win.loadURL(process.env.ELECTRON_RENDERER_URL+'/weather/index.html');await win.webContents.executeJavaScript("window.qbotWeather.transition('nebula')");
   win.on('closed',()=>app.quit());
  }else app.quit();
 }catch(e){console.error(e);surface?.dispose();win?.destroy();clearTimeout(guard);app.exit(1);}
});
