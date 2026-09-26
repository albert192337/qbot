// Local UI fixture with real bundled character animation; no production state/network.
const { app, BrowserWindow, ipcMain, protocol, session } = require('electron');
const { readFile, mkdtemp, readdir } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '../../..');
const preset = path.join(root, 'app/resources/presets/mascot');
if (process.env.QBOT_QA_DATA) app.setPath('userData',process.env.QBOT_QA_DATA);
protocol.registerSchemesAsPrivileged([{ scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true,bypassCSP:true} }]);
app.whenReady().then(async()=>{
  if (!process.env.QBOT_QA_DATA) app.setPath('userData',await mkdtemp(path.join(os.tmpdir(),'qbot-cozy-preview-')));
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  const manifest=JSON.parse(await readFile(path.join(preset,'manifest.json'),'utf8'));
  const meta={dirId:'mascot',manifest,hasUnfinishedJob:false};
  const list=[meta], roots=new Map([['mascot',preset]]);
  if(process.env.QBOT_COZY_REAL_CHARACTERS){
    const directory=path.resolve(process.env.QBOT_COZY_REAL_CHARACTERS);
    for(const entry of await readdir(directory,{withFileTypes:true})){
      if(!entry.isDirectory()||entry.name.startsWith('.')||entry.name==='mascot')continue;
      try{
        const dir=path.join(directory,entry.name),m=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
        roots.set(entry.name,dir);list.push({dirId:entry.name,manifest:m,hasUnfinishedJob:false});
      }catch{/* An incomplete local character need not block the art preview. */}
    }
  }
  protocol.handle('qbot-asset',async request=>{
    const url = new URL(request.url);
    const sourceRoot=roots.get(url.hostname);if(!sourceRoot)return new Response(null,{status:404});
    const filename=path.resolve(sourceRoot,decodeURIComponent(url.pathname).replace(/^\//,''));
    if (!filename.startsWith(sourceRoot+path.sep)) return new Response(null,{status:403});
    try{return new Response(await readFile(filename),{headers:{'Content-Type':filename.endsWith('.webm')?'video/webm':'image/png'}});}catch{return new Response(null,{status:404});}
  });
  global.cozyQA={writes:0};
  ipcMain.handle('characters:list',()=>list);
  ipcMain.handle('characters:getActive',()=>meta);
  ipcMain.handle('characters:activate',()=>{global.cozyQA.writes++;});
  ipcMain.handle('decor:set',()=>{global.cozyQA.writes++;});
  const panorama=process.env.QBOT_ONLINE_PREVIEW==='1';
  const roomlab=process.env.QBOT_ROOMLAB==='1';
  const win = new BrowserWindow({width:1160,height:850,show:process.env.QBOT_COZY_SHOW==='1',backgroundColor:roomlab?'#191a1c':'#f6f1e8',autoHideMenuBar:true,title:'QBot · 奶油小屋试住',webPreferences:{preload:path.join(root,roomlab?'app/test/fixtures/roomlab-preload.cjs':'app/out/preload/index.js'),contextIsolation:true,sandbox:false}});
  if(roomlab){
    win.setContentSize(800,296);
    ipcMain.on('roomlab:resize',(event,width,editing)=>{if(event.sender===win.webContents && [600,800,1000].includes(width) && typeof editing==='boolean')win.setContentSize(width,Math.ceil(width*295/1000)+60+(editing?165:0));});
    ipcMain.on('roomlab:pin',(event,value)=>{if(event.sender===win.webContents && typeof value==='boolean')win.setAlwaysOnTop(value);});
  }
  global.cozyQA.win=win;
  if(panorama){
    const market=list.filter(m=>m.dirId.startsWith('market-')),chosen=[...market,...list.filter(m=>!market.includes(m))].slice(0,4);
    ipcMain.removeHandler('characters:getActive');ipcMain.handle('characters:getActive',()=>chosen[0]);
    ipcMain.handle('rooms:getSceneMembers',()=>chosen.slice(1).map((m,i)=>({id:'preview-'+i,nickname:m.manifest.name,character:{dirId:m.dirId,manifest:m.manifest},mode:'idle'})));
    ipcMain.handle('desktop:get',()=>({revision:0,hidden:false,hiddenMembers:[],peek:null}));
    let preset='small';ipcMain.handle('room:getSizePreset',()=>preset);
    ipcMain.handle('room:setSizePreset',(_e,value)=>{if(!['small','medium','large'].includes(value))return preset;preset=value;const width={small:600,medium:800,large:1000}[value];win.setContentSize(width,Math.ceil(width*.295));return preset;});
    ipcMain.handle('rooms:setDisplayMode',()=>{win.close();return 'desktop';});
    ipcMain.on('desktop:menu',()=>require('electron').Menu.buildFromTemplate([
      {label:'这是背景试住，显隐功能请在联机房间中使用',enabled:false},
      {label:'关闭试住窗口',click:()=>win.close()},
    ]).popup({window:win}));
    win.setContentSize(600,177);win.setAlwaysOnTop(true);win.setTitle('QBot · 联机房间背景试住');
  }
  win.once('ready-to-show',()=>{if(process.env.QBOT_COZY_SHOW==='1'){win.show();win.focus();}});
  if(process.env.QBOT_TEAROOM==='1')win.setTitle('QBot · 窗边茶室试住');
  if(process.env.QBOT_DIYROOM==='1')win.setTitle('QBot · 我的小屋 · 自由布置');
  await win.loadFile(path.join(root,panorama?'app/out/renderer/online-room/index.html':roomlab?'app/out/renderer/roomlab/index.html':process.env.QBOT_DIYROOM==='1'?'app/out/renderer/diyroom/index.html':process.env.QBOT_TEAROOM==='1'?'app/out/renderer/tearoom/index.html':process.env.QBOT_COZY_3D==='1'?'app/out/renderer/cozy3d/index.html':'app/out/renderer/cozy/index.html'));
  if(roomlab && process.env.QBOT_COZY_SHOW==='1'){
    const fs=require('node:fs/promises'),out=path.join(root,'output/roomlab');await fs.mkdir(out,{recursive:true});win.show();win.focus();
    setTimeout(async()=>{if(win.isDestroyed())return;await fs.writeFile(path.join(out,'opened.json'),JSON.stringify({pid:process.pid,visible:win.isVisible(),ready:await win.webContents.executeJavaScript('document.body.dataset.ready'),at:Date.now()}));await fs.writeFile(path.join(out,'live-preview.png'),(await win.webContents.capturePage()).toPNG());},4500);
  }
  if(panorama && process.env.QBOT_COZY_SHOW==='1'){
    if(['space','observatory','greenhouse','halloween'].includes(process.env.QBOT_PREVIEW_THEME)) await win.webContents.executeJavaScript(`document.getElementById('theme').value=${JSON.stringify(process.env.QBOT_PREVIEW_THEME)};document.getElementById('theme').dispatchEvent(new Event('change'));`);
    const fs=require('node:fs/promises'),out=path.join(root,'output/online-room');await fs.mkdir(out,{recursive:true});win.show();win.focus();
    setTimeout(async()=>{if(win.isDestroyed())return;await fs.writeFile(path.join(out,'opened.json'),JSON.stringify({pid:process.pid,visible:win.isVisible(),ready:await win.webContents.executeJavaScript('document.body.dataset.ready'),at:Date.now()}));},4500);
  }
  if(process.env.QBOT_DIYROOM==='1' && process.env.QBOT_COZY_SHOW==='1'){
    const fs=require('node:fs/promises'),out=path.join(root,'output/diyroom');await fs.mkdir(out,{recursive:true});win.show();win.focus();
    setTimeout(async()=>{if(win.isDestroyed())return;await fs.writeFile(path.join(out,'opened.json'),JSON.stringify({pid:process.pid,visible:win.isVisible(),ready:await win.webContents.executeJavaScript('document.body.dataset.ready'),at:Date.now()}));await fs.writeFile(path.join(out,'live-preview.png'),(await win.webContents.capturePage()).toPNG());},4500);
  }
  if(process.env.QBOT_TEAROOM==='1' && process.env.QBOT_COZY_SHOW==='1'){
    const fs=require('node:fs/promises'),out=path.join(root,'output/tearoom');await fs.mkdir(out,{recursive:true});
    win.show();win.focus();
    setTimeout(async()=>{if(win.isDestroyed())return;await fs.writeFile(path.join(out,'opened.json'),JSON.stringify({pid:process.pid,visible:win.isVisible(),ready:await win.webContents.executeJavaScript('document.body.dataset.ready'),at:Date.now()}));await fs.writeFile(path.join(out,'live-preview.png'),(await win.webContents.capturePage()).toPNG());},3500);
  }
});
app.on('window-all-closed',()=>app.quit());
