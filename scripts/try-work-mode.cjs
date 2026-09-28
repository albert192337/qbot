// Real production client in an offline profile, using a copy of Zhang Qiling.
const {app,session,Menu,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),profile=path.join(root,'output/work-mode/trial-profile');
const id='53ed5068-dd60-4e2a-82c7-fb94250369d1';
const source=path.join(process.env.APPDATA,'@qbot/app/characters',id);
const target=path.join(profile,'characters',id);
fs.mkdirSync(target,{recursive:true});
for(const file of ['manifest.json','turnaround.png'])fs.copyFileSync(path.join(source,file),path.join(target,file));
fs.cpSync(path.join(source,'actions'),path.join(target,'actions'),{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(target,'manifest.json'),'utf8'));
manifest.customActions={...manifest.customActions};
manifest.resourceAnnotations={...manifest.resourceAnnotations};
for(const [action,name] of [['computer_idle','电脑前待机'],['computer_typing','敲键盘']]){
 for(const ext of ['webm','gif'])fs.copyFileSync(path.join(root,'output/work-mode',action+'.'+ext),path.join(target,'actions',action+'.'+ext));
 manifest.customActions[action]={webm:'actions/'+action+'.webm',gif:'actions/'+action+'.gif',durationSec:5,status:'done',facing:'left'};
 manifest.resourceAnnotations[action]={name,meaning:name,tags:['一起工作']};
}
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(profile,'config.json'),JSON.stringify({activeCharacter:id,voiceEnabled:false,talkFrequency:'quiet',freeMode:true,petScale:1,arkApiKey:'offline-trial',gptImageApiKey:'offline-trial'}));
process.env.QBOT_USER_DATA=profile;
delete process.env.ELECTRON_RENDERER_URL;
delete process.env.QBOT_ROOMS_AUTOJOIN;delete process.env.QBOT_ROOMS_AUTOCREATE;
app.whenReady().then(()=>session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true})));
const verify=process.argv.includes('--verify');
if(verify){
 const original=Menu.prototype.popup;
 Menu.prototype.popup=function(){
  const choice=this.items.find(i=>i.label==='一起工作（键鼠联动）');
  assert.ok(choice?.enabled,'production menu enables the complete pair');
  Menu.prototype.popup=original;choice.click();
 };
}
app.whenReady().then(()=>setTimeout(async()=>{
 try{
  const pet=BrowserWindow.getAllWindows().find(w=>/\/pet\/index.html/.test(w.webContents.getURL()));
  assert.ok(pet,'production pet window');
  if(verify)ipcMain.emit('pet:popupMenu',{sender:pet.webContents},['computer_idle','computer_typing'].map(id=>({id,label:id})),false);
  else pet.webContents.send('pet:menuCommand',{type:'workMode'});
  if(verify){
   await new Promise(r=>setTimeout(r,2000));
   const playing=await pet.webContents.executeJavaScript(`Array.from(document.querySelectorAll('#stage video')).some(v=>v.style.visibility==='visible'&&v.src.includes('computer_')&&!v.paused&&v.currentTime>0)`);
   assert.ok(playing,'production work video is playing');
   await fs.promises.writeFile(path.join(root,'output/work-mode/production.png'),(await pet.webContents.capturePage()).toPNG());
   console.log('PASS: production native menu and real global-input work mode');app.quit();
  }
 }catch(e){console.error(e);app.exit(1);}
},6000));
if(verify)setTimeout(()=>app.exit(1),30000).unref();
require('../app/out/main/index.js');
