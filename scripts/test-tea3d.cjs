// Actual Three.js/Spine renderer, offline assets and isolated layout storage.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/tea3d'),preview=process.argv.includes('--preview'),exporting=process.argv.includes('--export');
app.setPath('userData',preview?path.join(out,'profile'):path.join(os.tmpdir(),'qbot-tea3d-'+process.pid));
app.commandLine.appendSwitch('force-device-scale-factor','1');
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{let win;try{
 await fs.mkdir(out,{recursive:true});
 const chars=await Promise.all(['spine-wuxie','spine-zhangqiling'].map(async dirId=>({dirId,manifest:JSON.parse(await fs.readFile(path.join(root,'app/resources/presets',dirId,'manifest.json'),'utf8'))})));
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 protocol.handle('qbot-asset',async req=>{const u=new URL(req.url);if(!chars.some(c=>c.dirId===u.hostname))return new Response(null,{status:403});const base=path.join(root,'app/resources/presets',u.hostname),file=path.resolve(base,decodeURIComponent(u.pathname).replace(/^\//,''));if(!file.startsWith(base+path.sep))return new Response(null,{status:403});try{return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'text/plain'}});}catch{return new Response(null,{status:404});}});
 ipcMain.handle('characters:list',()=>chars);ipcMain.handle('pet:getCursor',()=>({x:-9999,y:0}));
 win=new BrowserWindow({width:1380,height:930,show:preview,title:'听雨茶室 · 3D 试住',backgroundColor:'#1c2625',autoHideMenuBar:true,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,offscreen:!preview,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const js=s=>win.webContents.executeJavaScript(s),until=async(s,label)=>{for(let n=0;n<180;n++){if(await js(s))return;await wait(100);}throw Error(label+' '+await js(`JSON.stringify({error:document.body.dataset.error,actors:window.tea3d?.actors,status:document.querySelector('#status').textContent})`));};
 const shot=async name=>{await wait(800);await fs.writeFile(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await win.loadFile(path.join(root,'app/out/renderer/tea3d/index.html'));
 await until(`document.body.dataset.ready==='true'`,'room ready');
 await until(`window.tea3d.actors.length===2&&window.tea3d.actors.every(a=>a.ready==='true')`,'Spine characters');
 if(preview){win.hide();await wait(200);win.show();win.focus();await fs.writeFile(path.join(out,'preview-ready.json'),JSON.stringify({ready:true,visible:win.isVisible(),pid:process.pid,title:win.getTitle(),time:new Date().toISOString()}));console.log('Tea room preview ready');return;}
 assert.notEqual(await js(`document.body.dataset.modelFallback`),'true');assert.equal(await js(`document.querySelectorAll('.item').length`),8);assert.equal(await js(`window.tea3d.layout.length`),6);
 if(exporting){const models=await js(`window.tea3d.exportModels()`);for(const [id,bytes]of Object.entries(models)){const b=Buffer.from(bytes);assert.equal(b.toString('ascii',0,4),'glTF');await fs.writeFile(path.join(root,'app/src/renderer/tea3d/models',id+'.glb'),b);}console.log('Exported '+Object.keys(models).length+' independent GLB models');}
 await shot('01-tea-room');
 await js(`window.tea3d.select('sofa');document.querySelector('#sit').click();document.querySelector('#sit').click()`);
 assert.ok(await js(`window.tea3d.actors.every(a=>a.state==='seated'&&a.seatKey==='sofa')`));await shot('02-seated');
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
 assert.deepEqual(errors,[]);const stats=await js(`window.tea3d.stats()`);assert.ok(stats.models===8&&stats.triangles>1000);await fs.writeFile(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['eight independent models','two live Spine characters','two seat anchors','model replacement preserves seats','native furniture dragging','rotation and undo','saved layout reload','three camera modes and two floors','occupied seat removal','concept sheet','680px layout'],stats,errors},null,2));
 console.log(JSON.stringify({ok:true,stats}));app.quit();
 }catch(e){console.error(e.stack);if(win&&!win.isDestroyed()){await fs.writeFile(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG());await fs.writeFile(path.join(out,'failure.html'),await win.webContents.executeJavaScript('document.body.outerHTML'));}app.exit(1);}});
app.on('window-all-closed',()=>app.quit());
