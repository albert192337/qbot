// Production application in an independent offline trial profile.
const {app,session,Menu,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),profile=path.join(root,'output/spine-desktop/trial-profile');
process.env.QBOT_USER_DATA=profile;
delete process.env.QBOT_ROOMS_AUTOJOIN;delete process.env.QBOT_ROOMS_AUTOCREATE;
delete process.env.ELECTRON_RENDERER_URL;
fs.mkdirSync(profile,{recursive:true});
const config=path.join(profile,'config.json');
if(!fs.existsSync(config))fs.writeFileSync(config,JSON.stringify({activeCharacter:'spine-wuxie',voiceEnabled:false,talkFrequency:'quiet',freeMode:true,petScale:1,arkApiKey:'offline-trial',gptImageApiKey:'offline-trial'}));
app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));});
if(process.argv.includes('--verify')){
 const popup=Menu.prototype.popup;
 Menu.prototype.popup=function(){
  const choices=this.items.find(i=>i.label==='切换角色')?.submenu?.items;
  if(!choices?.some(i=>i.label==='Spine 吴邪')||!choices?.some(i=>i.label==='Spine 张起灵'))throw Error('Missing realtime character menu');
  fs.writeFileSync(path.join(root,'output/spine-desktop/live/native-menu.json'),JSON.stringify(choices.map(i=>i.label)));
  Menu.prototype.popup=popup;
  choices.find(i=>i.label==='Spine 张起灵').click();
  setTimeout(async()=>{
   try{const pet=BrowserWindow.getAllWindows().find(w=>/\/pet\/index.html/.test(w.webContents.getURL()));
    const state=await pet.webContents.executeJavaScript(`({name:document.querySelector('.player-nameplate')?.textContent,canvas:!!document.querySelector('canvas.spine-player[data-ready=true]'),videos:document.querySelectorAll('#stage video').length})`);
    if(!state.canvas||state.videos)throw Error('Native menu did not activate Spine');
    fs.writeFileSync(path.join(root,'output/spine-desktop/live/native-menu-result.json'),JSON.stringify(state));
    console.log('PASS production right-click menu switches to live Spine');app.quit();
   }catch(e){console.error(e);app.exit(1);}
  },4000);
 };
 app.whenReady().then(()=>setTimeout(()=>{
  const pet=BrowserWindow.getAllWindows().find(w=>/\/pet\/index.html/.test(w.webContents.getURL()));
  if(!pet){console.error('Missing production pet');app.exit(1);return;}
  ipcMain.emit('pet:popupMenu',{sender:pet.webContents},[]);
 },6000));
 setTimeout(()=>app.exit(1),25000).unref();
}
require('../app/out/main/index.js');
