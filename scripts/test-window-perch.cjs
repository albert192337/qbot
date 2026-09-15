// Native Windows fixture only: no user-window screenshots and no model requests.
const {app,BrowserWindow,screen,nativeImage}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-perch-')));
if(process.env.QBOT_QA_DPI)app.commandLine.appendSwitch('force-device-scale-factor',process.env.QBOT_QA_DPI);
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 if(process.env.QBOT_PERCH_FIXTURE==='1'){
   const target=new BrowserWindow({x:120,y:350,width:620,height:400,show:false,title:'QBot window perch fixture'});
   await target.loadURL('data:text/html,<title>QBot window perch fixture</title><body style="background:%23b3dfe0"><h1>Fixture only</h1><p>Window screenshot test</p></body>');
   target.setAlwaysOnTop(true,'floating');target.showInactive();target.moveTop();process.send({handle:target.getNativeWindowHandle().readBigUInt64LE().toString()});
   process.on('message',cmd=>{if(cmd==='move'){target.setBounds({x:220,y:400,width:680,height:420});process.send('moved');}if(cmd==='minimize'){target.minimize();process.send('minimized');}if(cmd==='quit')app.exit(0);});
   return;
 }
 let child,native;
 try {
   assert.equal(process.platform,'win32');
   child=spawn(process.execPath,[__filename],{env:{...process.env,QBOT_PERCH_FIXTURE:'1'},stdio:['ignore','ignore','pipe','ipc']});
   const message=()=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('fixture timeout')),10000);child.once('message',v=>{clearTimeout(timeout);resolve(v);});});
   const info=await message();
   const {PerchNative}=require('../app/src/main/window-perch-native.ts');
   const {perchPosition,perchAnchor}=require('../app/src/shared/window-perch.ts');
   native=new PerchNative();
   const first=await native.query({handle:info.handle});
   assert.ok(first,'reads the external fixture window');assert.equal(first.pid,child.pid);
   const physical={x:first.bounds.x+Math.floor(first.bounds.width/2),y:first.bounds.y+Math.floor(first.bounds.height/2)};
   // Other live windows can cover the fixture; hit-testing must respect that Z order.
   const found=await native.query(physical);assert.ok(found && found.pid!==process.pid,'hit-testing selects an eligible external window');
   const pet=new BrowserWindow({x:100,y:50,width:240,height:240,transparent:true,frame:false,show:false});
   const {moveFixedSize}=require('../app/src/main/fixed-window.ts');
   const place=t=>{const b=screen.screenToDipRect(null,t.bounds);const p=perchPosition(b,pet.getBounds(),screen.getDisplayMatching(b).workArea,0.5,perchAnchor('perch_sit'));assert.ok(p);moveFixedSize(pet,p.x,p.y,{width:240,height:240});return p;};
   const p1=place(first);
   const ack=message();child.send('move');await ack;await pause(100);
   const second=await native.query({handle:info.handle});const p2=place(second);assert.ok(p2.y>p1.y);
   const frame=await native.capture(info.handle);assert.equal(frame?.handle,info.handle);assert.ok(frame?.frame?.startsWith('iVBOR'),'selected window capture produces a PNG frame');
   const pixels=nativeImage.createFromBuffer(Buffer.from(frame.frame,'base64')).getBitmap();
   let visible=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>200&&pixels[i+3]>0)visible++;
   assert.ok(visible>1000,'captured fixture must contain visible pixels, not a blank/transparent frame');
   const minimized=message();child.send('minimize');await minimized;await pause(150);
   assert.equal(await native.query({handle:info.handle}),null,'minimized targets no longer dock');
   native.close();child.send('quit');pet.destroy();
   console.log('PASS: Windows hit-testing, physical/DIP placement, movement, window-only screenshot identity, minimized-target exit');app.exit(0);
 }catch(e){native?.close();child?.kill();console.error(e);app.exit(1);}
});
