// Isolated hands-on review harness: real renderer, real rules, simulated clock/peers.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildSync}=require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.superpowers/experience-review');fs.mkdirSync(out,{recursive:true});
buildSync({entryPoints:[path.join(root,'app/src/main/garden/local-rehearsal.ts')],outfile:path.join(out,'core.cjs'),bundle:true,platform:'node'});
const {LocalGardenRehearsal}=require(path.join(out,'core.cjs')),core=require('../rooms/generated/garden-core.cjs');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-experience-')));
let clock=Date.now(),n=0;const rehearsal=new LocalGardenRehearsal([{id:'test:me',name:'我'},{id:'test:guest',name:'棉花糖'}],()=>clock);
const resume=process.argv.includes('--resume')?JSON.parse(fs.readFileSync(path.join(out,'result.json'),'utf8')).state:null;
rehearsal.initializeOwn(resume??core.initialGarden(clock,{id:()=>String(++n),random:()=>.5}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_,cb)=>cb({cancel:true}));
 ipcMain.handle('settings:get',()=>({gardenRenderMode:'2d'}));ipcMain.handle('overlays:get',()=>({revision:0,winner:null}));ipcMain.handle('characters:getActive',()=>null);
 ipcMain.handle('garden:get',()=>rehearsal.get('pet'));ipcMain.handle('garden:act',(_,c)=>rehearsal.act(c,'pet'));
 ipcMain.handle('garden:visit',(_,o)=>rehearsal.visit(o));ipcMain.handle('garden:cooperate',(_,o,p,a,t,k)=>rehearsal.cooperate(o,p,a,t,k));
 ipcMain.on('garden:ignore',()=>{});ipcMain.on('garden:cancelPerformance',()=>{});
 const win=new BrowserWindow({width:860,height:760,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
 await win.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'plots'}});await wait(500);
 await win.webContents.executeJavaScript('window.confirm=(message)=>{window.lastReviewConfirmation=message;return true};void 0');
 // Adaptive commands are written by the reviewer after each observed screen.
 fs.writeFileSync(path.join(out,'ready'),'ready');let last='';
 const timer=setTimeout(()=>app.exit(0),20*60000);
 while(true){
  let cmd;try{cmd=JSON.parse(fs.readFileSync(path.join(out,'command.json'),'utf8'))}catch{await wait(150);continue}
  if(cmd.id===last){await wait(150);continue}last=cmd.id;
  try{
   if(cmd.advance){clock+=cmd.advance;win.webContents.send('garden:changed');}
   if(cmd.size)win.setSize(...cmd.size);
   if(cmd.page)win.webContents.send('garden:page',cmd.page);
   const value=cmd.js?await win.webContents.executeJavaScript(cmd.js):null;
   await wait(500);
   const data=await win.webContents.executeJavaScript(`({text:document.body.innerText,buttons:[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>({text:b.innerText,disabled:b.disabled})),overflow:document.documentElement.scrollWidth>innerWidth})`);
   fs.writeFileSync(path.join(out,cmd.id+'.png'),(await win.webContents.capturePage()).toPNG());
   fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({id:cmd.id,value,...data,state:rehearsal.get('pet')},null,2));
   fs.writeFileSync(path.join(out,cmd.id+'.json'),JSON.stringify({id:cmd.id,value,...data},null,2));
  }catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({id:cmd.id,error:String(e)}))}
  if(cmd.exit){clearTimeout(timer);app.exit(0);return}
 }
 }catch(e){console.error(e);app.exit(1)}});
