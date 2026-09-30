const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),core=require(path.join(root,'rooms/generated/garden-core.cjs'));
const directory=process.env.QBOT_ECONOMY_DATA||fs.mkdtempSync(path.join(os.tmpdir(),'qbot-economy-preview-'));
app.setPath('userData',directory);
const file=path.join(directory,'garden.json'),rng={id:randomUUID,random:Math.random};
let state=fs.existsSync(file)?core.validateGarden(JSON.parse(fs.readFileSync(file,'utf8'))):core.initialGarden(Date.now(),rng);
core.ensureLife(state,Date.now(),rng,'mascot');core.ensureLife(state,Date.now(),rng,'spine-zhangqiling');core.enableV3(state,Date.now());
if(process.env.QBOT_APPEARANCE_TRIAL==='1'&&!fs.existsSync(file)){state.coins=20000;state.economy.tokens=600;}
const save=()=>{fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(state));fs.renameSync(file+'.tmp',file);};save();
app.whenReady().then(async()=>{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  ipcMain.handle('characters:list',()=>['mascot','spine-zhangqiling'].map(dirId=>({dirId,manifest:JSON.parse(fs.readFileSync(path.join(root,'app/resources/presets',dirId,'manifest.json'),'utf8')),hasUnfinishedJob:false})));
  ipcMain.handle('appearance:preview',(_e,id)=>{if(process.env.QBOT_APPEARANCE_TRIAL==='1'&&['petal-steps','eclipse-portal'].includes(id)){const child=require('node:child_process').spawn(process.execPath,[path.join(root,'scripts/test-appearance-preview.cjs'),'--preview','--appearance',id],{stdio:'ignore',windowsHide:true,detached:true});child.unref();}});
  ipcMain.handle('garden:get',()=>{core.advanceV3(state,Date.now());save();return core.publicGardenState(state);});
  ipcMain.handle('garden:act',(_e,command)=>{try{const r=core.transition(state,command,Date.now(),rng,{actor:'mascot'});state=r.state;save();return {ok:true,state:core.publicGardenState(state),reveal:r.reveal};}catch(e){return {ok:false,error:e.message};}});
  const layoutFile=path.join(directory,'decor.json');let layout=fs.existsSync(layoutFile)?JSON.parse(fs.readFileSync(layoutFile,'utf8')):[];
  ipcMain.handle('decor:get',()=>layout);
  ipcMain.handle('decor:set',(_e,_key,value)=>{layout=value;fs.writeFileSync(layoutFile,JSON.stringify(layout));return layout;});
  ipcMain.handle('progress:get',()=>({inventory:{}}));
  ipcMain.on('ui:openConsole',()=>win.webContents.executeJavaScript("window.showEconomyView('furnish')"));
  const win=new BrowserWindow({width:1000,height:820,show:process.env.QBOT_ECONOMY_SHOW==='1',title:process.env.QBOT_APPEARANCE_TRIAL==='1'?'外观商城 · 本地试用':'QBot · 新版家具与繁育试玩',webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,sandbox:false}});
  global.economyQA={getState:()=>state,win,setRolls:values=>{let i=0;rng.random=()=>values[i++]??Math.random();}};
  await win.loadFile(path.join(root,'app/out/renderer/economy-qa.html'));
  if(process.env.QBOT_APPEARANCE_TRIAL==='1'){win.show();win.focus();fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify({pid:process.pid,visible:win.isVisible(),isolated:true}));}
});
app.on('window-all-closed',()=>app.quit());
