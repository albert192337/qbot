const { app, screen, BrowserWindow, desktopCapturer, nativeImage }=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-weather-bitmap-')));
app.on('window-all-closed',()=>{});
process.env.ELECTRON_RENDERER_URL=pathToFileURL(path.resolve(__dirname,'../app/out/renderer')).href;
const out=path.resolve(__dirname,'../.superpowers/weather-bitmap');fs.mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 let surface; const guard=setTimeout(()=>{surface?.dispose();app.exit(2);},60000);
 try{
  const {createBitmapWeatherSurface}=require('../app/src/main/weather-surface.ts');
  const desktop=process.argv.includes('--desktop');
  const capture=async(name)=>{
   const d=screen.getPrimaryDisplay();
   const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:Math.round(d.size.width*d.scaleFactor),height:Math.round(d.size.height*d.scaleFactor)}});
   const img=(sources.find(s=>s.display_id===String(d.id))||sources[0]).thumbnail;
   fs.writeFileSync(path.join(out,name+'.png'),img.toPNG());return img;
  };
  const before=await capture('before');
  surface=await createBitmapWeatherSurface(screen.getPrimaryDisplay(),()=>console.error('NATIVE LOST'),!desktop);
  console.log('PREPARED');
  const transition=surface.transition('meteor');await delay(1100);const middle=await capture('middle');
  await transition;console.log('METEOR');
  await delay(1500);
  const display=screen.getPrimaryDisplay();
  const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:Math.round(display.size.width*display.scaleFactor),height:Math.round(display.size.height*display.scaleFactor)}});
  const source=sources.find(s=>s.display_id===String(display.id))||sources[0];
  fs.writeFileSync(path.join(out,desktop?'desktop-composed.png':'preview-composed.png'),source.thumbnail.toPNG());
  console.log('COMPOSED CAPTURE');
  for(const win of BrowserWindow.getAllWindows())if(!win.isDestroyed()){
   const img=await win.webContents.capturePage();fs.writeFileSync(path.join(out,'foreground.png'),img.toPNG());
   const p=img.toBitmap();let visible=0;for(let i=3;i<p.length;i+=4)if(p[i])visible++;
   assert(visible>20&&visible<p.length/4*.1,'Foreground must have visible trails and >90% transparent pixels');
   assert.equal(win.isFocusable(),false);
  }
  await delay(desktop?12000:3000);
  assert.equal(BrowserWindow.getAllWindows().length,0,'Foreground must self-remove');
  await surface.transition('aurora');console.log('AURORA');
  await delay(2500);
  const aurora=await capture('aurora');
  await surface.transition(null);surface.dispose();
  await delay(800);const restored=await capture('restored');
  if(desktop){
   const size=source.thumbnail.getSize();const target=nativeImage.createFromPath(path.join(app.getPath('userData'),'weather-bitmaps/meteor.png')).resize(size).toBitmap();
   const b=before.toBitmap(),m=source.thumbnail.toBitmap(),mid=middle.toBitmap(),a=aurora.toBitmap(),r=restored.toBitmap();
   const diff=(a,b,i)=>Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
   let changed=0,blended=0,recovered=0,switched=0;
   for(let y=10;y<size.height-60;y+=12)for(let x=10;x<size.width-10;x+=12){
    // Use exposed outer edges: application movement in the center is not a wallpaper failure.
    if(y>size.height*.65 || (x>size.width*.025 && x<size.width*.97))continue;
    const i=(y*size.width+x)*4;
    if(diff(m,target,i)<20&&diff(b,m,i)>70){changed++;if(diff(mid,b,i)>10&&diff(mid,m,i)>10)blended++;if(diff(r,b,i)<20)recovered++;if(diff(a,m,i)>25)switched++;}
   }
   console.log(JSON.stringify({changed,blended,recovered,switched}));
   assert(changed>100,'Real desktop must show new sky pixels');assert(blended>changed*.2,'Transition must show intermediate colors');
   assert(recovered>changed*.85,'Original desktop must be restored');assert(switched>changed*.2,'Aurora must visibly differ');
  }
  console.log('RESTORED');clearTimeout(guard);app.exit(0);
 }catch(e){console.error(e);surface?.dispose();clearTimeout(guard);app.exit(1);}
});
