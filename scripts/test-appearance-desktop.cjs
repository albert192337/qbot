// Isolated native overlay test. Run with node; only its own windows are created.
const {buildSync}=require('esbuild'),path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),entry=path.join(root,'app/out/main/appearance-native-qa.cjs');
buildSync({stdin:{resolveDir:root,contents:"import {EquippedEffects} from './app/src/renderer/pet/appearance-effects';window.qaEquipped=new EquippedEffects(document.getElementById('stage'),{getSceneFeet:()=>null});window.qaEquipped.activate('one');"},bundle:true,platform:'browser',format:'esm',outfile:path.join(root,'app/out/renderer/appearance-equipped-qa.js')});
buildSync({stdin:{resolveDir:root,contents:`
import {app,BrowserWindow,screen,ipcMain} from 'electron';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {registerAppearances} from './app/src/main/appearances';import {trackDesktopWindow} from './app/src/main/desktop-visibility';
const root=${JSON.stringify(root)},out=path.join(root,'output/appearance-preview');app.setPath('userData',path.join(out,'native-profile'));const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
registerAppearances();ipcMain.handle('garden:get',()=>({economy:{appearances:{owned:{'eclipse-portal':true,'petal-steps':true},equipped:{'eclipse-portal':'one','petal-steps':'one'}}}}));ipcMain.handle('desktop:get',()=>({revision:0,hidden:false,hiddenMembers:[],peek:null}));const bounds=screen.getPrimaryDisplay().workArea;const owner=new BrowserWindow({x:bounds.x+100,y:bounds.y+100,width:500,height:500,show:true,frame:false,transparent:true,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true}});trackDesktopWindow(owner,'host');
await fs.writeFile(path.join(root,'app/out/renderer/appearance-equipped-qa.html'),'<style>body{margin:0;background:transparent}#stage{position:relative;width:500px;height:500px;z-index:1}#stage div{position:absolute;left:175px;top:150px;width:150px;height:280px;border-radius:70px;background:#8978ad}</style><div id="stage"><div></div></div><script type="module" src="./appearance-equipped-qa.js"></script>');
const errors=[];owner.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});await owner.loadFile(path.join(root,'app/out/renderer/appearance-equipped-qa.html'));
for(let i=0;i<100;i++){if(await owner.webContents.executeJavaScript('document.querySelectorAll("canvas").length>0'))break;await wait(50);}
assert.ok(await owner.webContents.executeJavaScript('document.querySelectorAll("canvas").length>0'),'equipped portal rendered');await wait(3400);assert.equal(await owner.webContents.executeJavaScript('document.querySelectorAll("canvas").length'),0,'portal releases after entry');assert.deepEqual(errors,[]);
await owner.webContents.executeJavaScript('window.qaEquipped.beginWalk();window.qaEquipped.stepWalk(0,1.33)');
let overlay;for(let i=0;i<100;i++){overlay=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('appearance-overlay'));if(overlay?.isVisible())break;await wait(50);}
assert.ok(overlay?.isVisible(),'native transparent overlay visible');assert.equal(overlay.isFocusable(),false);const fixed=overlay.getBounds();
await wait(300);owner.setBounds({x:bounds.x+350,y:bounds.y+100,width:500,height:500});await wait(100);assert.deepEqual(overlay.getBounds(),fixed,'footprint surface does not follow moving character');
const image=await overlay.webContents.capturePage();await fs.writeFile(path.join(out,'desktop-petals.png'),image.toPNG());
const bytes=image.toBitmap();assert.ok(bytes.some((v,i)=>i%4===3&&v>20),'petals have visible pixels');
owner.hide();await wait(150);assert.ok(overlay.isDestroyed(),'hide clears exterior effects');await fs.writeFile(path.join(out,'desktop-result.json'),JSON.stringify({ok:true,checks:['equipped portal renders and releases','equipped footsteps trigger exterior surface','native transparent overlay','mouse-pass-through configured','fixed screen coordinates while owner moves','visible petal pixels','owner hide disposes overlay']}));console.log('PASS desktop appearance overlay');owner.destroy();app.quit();
}catch(e){console.error(e);app.exit(1);}});
`},bundle:true,platform:'node',format:'cjs',external:['electron'],outfile:entry});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const result=spawnSync(require('../app/node_modules/electron'),[entry],{cwd:root,env,stdio:'inherit'});process.exitCode=result.status??1;
