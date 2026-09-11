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
  const win = new BrowserWindow({width:1160,height:850,show:process.env.QBOT_COZY_SHOW==='1',backgroundColor:'#f6f1e8',autoHideMenuBar:true,title:'QBot · 奶油小屋试住',webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,sandbox:false}});
  global.cozyQA.win=win;
  win.once('ready-to-show',()=>{if(process.env.QBOT_COZY_SHOW==='1'){win.show();win.focus();}});
  await win.loadFile(path.join(root,process.env.QBOT_COZY_3D==='1'?'app/out/renderer/cozy3d/index.html':'app/out/renderer/cozy/index.html'));
});
app.on('window-all-closed',()=>app.quit());
