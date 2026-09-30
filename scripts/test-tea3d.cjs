// Actual Three.js/Spine renderer, offline assets and isolated layout storage.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/tea3d'),preview=process.argv.includes('--preview'),exporting=process.argv.includes('--export');
app.setPath('userData',preview?path.join(out,'profile'):path.join(os.tmpdir(),'qbot-tea3d-'+process.pid));
app.commandLine.appendSwitch('force-device-scale-factor','1');
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!preview)setTimeout(()=>{console.error('Tea test timed out');app.exit(2);},120000).unref();
app.whenReady().then(async()=>{let win;try{
 await fs.mkdir(out,{recursive:true});
 const chars=await Promise.all(['spine-wuxie','spine-zhangqiling','mascot'].map(async dirId=>({dirId,manifest:JSON.parse(await fs.readFile(path.join(root,'app/resources/presets',dirId,'manifest.json'),'utf8'))})));
 const bases=new Map(chars.map(c=>[c.dirId,path.join(root,'app/resources/presets',c.dirId)]));
 if(preview){const existing=process.env.QBOT_TEA_CHARACTERS||path.join(process.env.APPDATA,'@qbot/app/characters');
 try{for(const entry of await fs.readdir(existing,{withFileTypes:true})){if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
 try{const manifest=JSON.parse(await fs.readFile(path.join(existing,entry.name,'manifest.json'),'utf8'));const old=chars.findIndex(c=>c.dirId===entry.name);if(old>=0)chars.splice(old,1);chars.push({dirId:entry.name,manifest});bases.set(entry.name,path.join(existing,entry.name));}catch{}}}catch{}}
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 protocol.handle('qbot-asset',async req=>{const u=new URL(req.url);if(!chars.some(c=>c.dirId===u.hostname))return new Response(null,{status:403});const base=bases.get(u.hostname),rel=decodeURIComponent(u.pathname).replace(/^\//,'');const char=chars.find(c=>c.dirId===u.hostname);const file=path.resolve(base,rel==='__portrait.png'?(char.manifest.sourceImage||'source.png'):rel);if(!file.startsWith(base+path.sep))return new Response(null,{status:403});try{return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':file.endsWith('.webm')?'video/webm':'application/octet-stream'}});}catch{return new Response(null,{status:404});}});
 ipcMain.handle('characters:list',()=>chars);ipcMain.handle('pet:getCursor',()=>({x:-9999,y:0}));
 win=new BrowserWindow({width:1380,height:930,show:preview,title:'听雨茶室 · 3D 试住',backgroundColor:'#1c2625',autoHideMenuBar:true,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,offscreen:!preview,backgroundThrottling:false}});
 const ts=require('typescript');require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(require('fs').readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
 require('../app/src/main/tea3d-desktop.ts').installTeaDesktop(win,path.join(root,'app/out/preload/index.js'));
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const js=s=>win.webContents.executeJavaScript(s),until=async(s,label)=>{for(let n=0;n<180;n++){if(await js(s))return;await wait(100);}throw Error(label+' '+await js(`JSON.stringify({error:document.body.dataset.error,actors:window.tea3d?.actors,status:document.querySelector('#status').textContent})`));};
 const shot=async name=>{await wait(800);await fs.writeFile(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await win.loadFile(path.join(root,'app/out/renderer/tea3d/index.html'));
 await until(`document.body.dataset.ready==='true'`,'room ready');
 await until(`document.querySelector('#guest-1').options.length>0&&window.tea3d.actors.every(a=>a.ready==='true')`,'characters');
 if(preview){if(process.argv.includes('--compare')){await js(`window.tea3d.switchGuest(0,'mascot')`);await until(`window.tea3d.actors.some(a=>a.id==='mascot'&&a.media==='VIDEO')`,'preview animation');}if(process.argv.includes('--open-room'))await js(`document.querySelector('#front').click();document.querySelector('#walls').click();window.tea3d.select('sofa');document.querySelector('#sit').click();window.tea3d.select(null)`);win.hide();await wait(200);win.show();win.focus();if(process.argv.includes('--desktop'))await js(`document.querySelector('#desktop').click()`);await fs.writeFile(path.join(out,'preview-ready.json'),JSON.stringify({ready:true,visible:win.isVisible(),pid:process.pid,title:win.getTitle(),characters:chars.length,desktop:process.argv.includes('--desktop'),time:new Date().toISOString()}));console.log('Tea room preview ready');return;}
 assert.notEqual(await js(`document.body.dataset.modelFallback`),'true');assert.equal(await js(`document.querySelectorAll('.item').length`),8);assert.equal(await js(`window.tea3d.layout.length`),6);
 if(exporting){const models=await js(`window.tea3d.exportModels()`);for(const [id,bytes]of Object.entries(models)){const b=Buffer.from(bytes);assert.equal(b.toString('ascii',0,4),'glTF');await fs.writeFile(path.join(root,'app/src/renderer/tea3d/models',id+'.glb'),b);}console.log('Exported '+Object.keys(models).length+' independent GLB models');}
 await shot('01-tea-room');
 const stage=await js(`(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return{x:Math.round(r.left+10),y:Math.round(r.top+90),height:r.height}})()`);
 win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:stage.x,y:stage.y});
 for(let i=1;i<=12;i++){win.webContents.sendInputEvent({type:'mouseMove',x:stage.x,y:Math.round(stage.y+(stage.height-180)*i/12)});await wait(25);}
 win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:stage.x,y:Math.round(stage.y+stage.height-180)});await wait(1300);
 const overhead=await js(`window.tea3d.cameraState`),offset=overhead.position.map((v,i)=>v-overhead.target[i]);
 assert.ok(Math.acos(offset[1]/Math.hypot(...offset))<.3,'native drag reaches near overhead');await shot('10-overhead');
 await js(`document.querySelector('#front').click();for(let i=0;i<10;i++)document.querySelector('#right').click()`);await wait(400);
 const side=await js(`window.tea3d.cameraState`);assert.ok(Math.atan2(side.position[0]-side.target[0],side.position[2]-side.target[2])>1,'wide side angle');
 await js(`document.querySelector('#front').click()`);await wait(400);
 await js(`window.tea3d.select('sofa');document.querySelector('#sit').click();document.querySelector('#sit').click()`);
 assert.ok(await js(`window.tea3d.actors.every(a=>a.state==='seated'&&a.seatKey==='sofa')`));await shot('02-seated');assert.ok(await js(`window.tea3d.actors.every(a=>a.shadowVisible&&Math.abs(a.shadowPosition[1]-.649)<.001)`),'contact shadows sit on cushions');
 await js(`document.querySelector('#replace').value='walnut-bench';document.querySelector('#replace').dispatchEvent(new Event('change'))`);
 assert.equal(await js(`window.tea3d.layout.find(p=>p.key==='sofa').asset`),'walnut-bench');assert.ok(await js(`window.tea3d.actors.every(a=>a.seatKey==='sofa')`));await shot('03-replaced-sofa');
 // Native mouse drag from the model to an empty part of the floor.
 await js(`window.tea3d.select(null)`);const start=await js(`window.tea3d.project('lamp')`),a=await js(`window.tea3d.projectFloor(2.25,.6)`),b=await js(`window.tea3d.projectFloor(3.6,1.5)`);
 win.webContents.sendInputEvent({type:'mouseMove',...start});win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...start});
 for(let i=1;i<=10;i++){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(b.x-a.x)*i/10),y:Math.round(start.y+(b.y-a.y)*i/10)});await wait(30);}
 win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:Math.round(start.x+b.x-a.x),y:Math.round(start.y+b.y-a.y)});await wait(300);
 const moved=await js(`window.tea3d.layout.find(p=>p.key==='lamp')`);assert.ok(Math.abs(moved.x-2.25)>.3,'native drag moves lamp');
 await js(`document.querySelector('#rotate').click()`);assert.ok(await js(`window.tea3d.layout.find(p=>p.key==='lamp').angle>0`));
 await js(`document.querySelector('#undo').click()`);assert.equal(await js(`window.tea3d.layout.find(p=>p.key==='lamp').angle`),0);
 await js(`document.querySelector('#save').click()`);const saved=await js(`JSON.stringify(window.tea3d.layout)`);await win.webContents.reload();await until(`document.body.dataset.ready==='true'`,'reload saved');assert.equal(await js(`JSON.stringify(window.tea3d.layout)`),saved);
 await js(`window.tea3d.setView('edit')`);await shot('04-edit');await js(`window.tea3d.setView('tower')`);await shot('05-two-floors');
 await js(`window.tea3d.setView('home');window.tea3d.select('sofa')`);await wait(800);await js(`document.querySelector('#sit').click();document.querySelector('#remove').click()`);assert.ok(await js(`window.tea3d.actors.every(a=>a.state==='standing')`));
 await js(`document.querySelector('#undo').click();document.querySelector('#concept').click()`);assert.ok(await js(`document.querySelector('#art-dialog').open`));await shot('06-concept');await js(`document.querySelector('#close-art').click();window.tea3d.select(null)`);
 win.setSize(680,650);await wait(500);assert.ok(await js(`document.documentElement.scrollWidth===innerWidth&&document.querySelector('#stage').getBoundingClientRect().right<=innerWidth+1&&document.querySelector('header').getBoundingClientRect().right<=innerWidth+1`));await shot('07-small');
 // Exercise the same existing video player used by desktop pets, including cleanup.
 await js(`window.tea3d.switchGuest(0,'mascot')`);
 await until(`window.tea3d.actors.some(a=>a.id==='mascot'&&a.ready==='true'&&a.media==='VIDEO')`,'video texture');
 const time=await js(`document.querySelector('#sources video').currentTime`);await wait(450);
 assert.notEqual(await js(`document.querySelector('#sources video').currentTime`),time,'video advances');
 assert.equal(await js(`document.querySelectorAll('#sources>div').length`),2);
 await shot('08-video-guest');assert.ok(await js(`window.tea3d.actors.filter(a=>a.state==='standing').every(a=>a.shadowVisible&&a.shadowPosition[1]===.031)`),'grounded character shadows');
 await js(`window.tea3d.switchGuest(0,'spine-wuxie');window.tea3d.switchGuest(0,'mascot')`);
 await until(`window.tea3d.actors.some(a=>a.id==='mascot'&&a.media==='VIDEO')`,'repeat switch');
 assert.equal(await js(`document.querySelectorAll('#sources>div').length`),2);
 // Transfer an unsaved layout and selected character to a real transparent window.
 await js(`window.tea3d.add('lantern');window.tea3d.select('sofa');document.querySelector('#sit').click()`);
 const current=await js(`JSON.stringify(window.tea3d.layout)`);await js(`document.querySelector('#right').click();document.querySelector('#walls').click()`);await wait(500);const editorCamera=await js(`window.tea3d.cameraState`);
 console.log('Opening desktop');const created=new Promise((resolve,reject)=>{win.webContents.once('did-create-window',resolve);setTimeout(()=>reject(Error('desktop not created')),15000).unref();});
 await js(`document.querySelector('#desktop').click()`);const desk=await created;console.log('Desktop created');
 const dj=q=>desk.webContents.executeJavaScript(q);
 for(let i=0;i<180;i++){if(await dj(`document.body.dataset.ready==='true'&&window.tea3d?.actors.length===2&&window.tea3d.actors.every(a=>a.ready==='true')`))break;await wait(100);}
 assert.equal(await dj(`JSON.stringify(window.tea3d.layout)`),current,'unsaved layout copied');
 assert.ok(await dj(`window.tea3d.actors.some(a=>a.id==='mascot'&&a.media==='VIDEO')`));
 assert.ok(await dj(`window.tea3d.actors.some(a=>a.state==='seated')`),'seat state copied');
 assert.ok(desk.isAlwaysOnTop());const desktopCamera=await dj(`window.tea3d.cameraState`);assert.ok(desktopCamera.position.every((n,i)=>Math.abs(n-editorCamera.position[i])<1e-8),'desktop inherits camera');assert.deepEqual(desktopCamera.target,editorCamera.target);assert.equal(desktopCamera.wallMeshes,0,'hidden side walls inherited');await dj(`document.querySelector('#walls').click()`);assert.ok((await dj(`window.tea3d.cameraState`)).wallMeshes>0,'side walls restored');await dj(`document.querySelector('#walls').click()`);
 assert.equal(await dj(`getComputedStyle(document.body).backgroundColor`),'rgba(0, 0, 0, 0)');
 assert.equal(await dj(`window.tea3d.desktopHit(1,80)`),false,'empty area click-through');
 assert.equal(await dj(`(()=>{const p=window.tea3d.project('sofa');return window.tea3d.desktopHit(p.x,p.y)})()`),true,'room interactive');
 const beforeDrag=await dj(`window.tea3d.project('sofa')`);
 desk.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...beforeDrag});
 desk.webContents.sendInputEvent({type:'mouseMove',x:beforeDrag.x+110,y:beforeDrag.y+45});
 desk.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:beforeDrag.x+110,y:beforeDrag.y+45});await wait(400);
 assert.deepEqual(await dj(`window.tea3d.project('sofa')`),beforeDrag,'desktop drag cannot orbit');
 await dj(`document.querySelector('#left').click();window.tea3d.setView('tower')`);await wait(750);
 assert.deepEqual(await dj(`window.tea3d.project('sofa')`),beforeDrag,'desktop camera shortcuts locked');
 assert.equal(await dj(`getComputedStyle(document.querySelector('#left')).display`),'none');
 await dj(`document.querySelector('#zoom-in').click()`);await wait(200);
 assert.notDeepEqual(await dj(`window.tea3d.project('sofa')`),beforeDrag,'desktop zoom still works');
 await dj(`document.querySelector('#zoom-out').click()`);await wait(200);
 await dj(`document.querySelector('#front').click()`);await wait(300);assert.equal((await dj(`window.tea3d.cameraState`)).position[0],0,'front view centered');const capture=await desk.webContents.capturePage();assert.equal(capture.toBitmap()[3],0,'desktop corner really transparent');await fs.writeFile(path.join(out,'09-desktop.png'),capture.toPNG());
 await dj(`document.querySelector('#desktop-close').click()`);await wait(300);assert.ok(desk.isDestroyed());
 await js(`window.tea3d.switchGuest(0,'');window.tea3d.switchGuest(1,'')`);assert.equal(await js(`document.querySelectorAll('#sources>div').length`),0);
 assert.deepEqual(errors,[]);const stats=await js(`window.tea3d.stats()`);assert.ok(stats.models===8&&stats.triangles>1000);await fs.writeFile(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['eight independent models','two live Spine characters','two seat anchors','model replacement preserves seats','native furniture dragging','rotation and undo','saved layout reload','three camera modes and two floors','occupied seat removal','concept sheet','680px layout','existing video character switching and playback','switch disposes prior media','transparent desktop window with current unsaved state','desktop hit regions and close','desktop camera locked while zoom remains available','editor camera and wall visibility inherited','side walls toggle and centered front view','floor and cushion contact shadows','native near-overhead orbit and wider side angle'],stats,errors},null,2));
 console.log(JSON.stringify({ok:true,stats}));app.quit();
 }catch(e){console.error(e.stack);if(win&&!win.isDestroyed()){await fs.writeFile(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG());await fs.writeFile(path.join(out,'failure.html'),await win.webContents.executeJavaScript('document.body.outerHTML'));}app.exit(1);}});
app.on('window-all-closed',()=>app.quit());
