// Isolated built renderer acceptance; no real saves, accounts, or paid requests.
if(!process.versions.electron){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=require('node:child_process').spawn(require('../app/node_modules/electron'),[__filename],{env,stdio:'inherit',windowsHide:true});child.on('exit',c=>process.exitCode=c??1);setTimeout(()=>child.kill(),60000).unref();
}else{
 const {app,ipcMain}=require('electron'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
 process.env.QBOT_QA_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'qbot-character-game-'));process.env.QBOT_QA_PORTRAITS='1';
 require(process.env.QBOT_CHARACTER_FIXTURE || '../app/test/fixtures/nursery-main.cjs');
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 (async()=>{try{
  while(!global.qa?.win)await wait(50);const qa=global.qa,win=qa.win;
  while(win.webContents.isLoading())await wait(50);await wait(700);
  const js=s=>win.webContents.executeJavaScript(s);const until=async s=>{for(let n=0;n<100;n++){if(await js(s))return;await wait(50);}throw Error('timeout '+s);};
  const output=path.resolve(__dirname,'../output/character-game');fs.mkdirSync(output,{recursive:true});
  let chars=Array.from({length:12},(_,i)=>({dirId:'friend'+i,coverImage:'__portrait.png',manifest:{...qa.manifest,name:['小星','栗子','晚风','月亮'][i%4]+(i>3?i:''),persona:i===0?'来自星光深处的小小伙伴。\n喜欢收集日常里的温柔，陪你把普通的一天过成闪闪发光的回忆。':''},hasUnfinishedJob:false}));let active='friend0';
  ipcMain.removeHandler('characters:list');ipcMain.handle('characters:list',()=>chars);
  ipcMain.removeHandler('characters:getActive');ipcMain.handle('characters:getActive',()=>chars.find(c=>c.dirId===active));
  ipcMain.removeHandler('characters:activate');ipcMain.handle('characters:activate',(_,id)=>{if(qa.failActivate)throw Error('测试上桌失败');active=id;qa.calls.push(['activate',id]);});
  ipcMain.removeHandler('characters:rename');ipcMain.handle('characters:rename',(_,id,name)=>{chars.find(c=>c.dirId===id).manifest.name=name;});
  ipcMain.handle('characters:delete',(_,id)=>{chars=chars.filter(c=>c.dirId!==id);});
  const open=async()=>{await js("window.qbot.ui.openConsole('characters')");await until('document.querySelectorAll(".cg-choice").length>0');};
  await open();await until('document.querySelector(".cg-video")?.readyState>=2');
  const shot=async name=>{await wait(350);fs.writeFileSync(path.join(output,name+'.png'),(await win.webContents.capturePage()).toPNG());};
  await js('document.querySelector(".cg-play").click()');await until('document.querySelector(".cg-video").currentTime>0.1');await js('document.querySelector(".cg-play").click()');await shot('wide');assert.equal(await js('document.querySelector(".use-char").disabled'),true);
  await js('document.querySelectorAll(".cg-choice")[1].click()');await until('document.querySelector(".char-name").textContent==="栗子"');assert.equal(active,'friend0');
  qa.failActivate=true;await js('document.querySelector(".use-char").click()');await wait(200);assert.equal(active,'friend0');qa.failActivate=false;
  await js('document.querySelector(".use-char").click()');await until('document.querySelector(".use-char").disabled');assert.equal(active,'friend1');
  await js('document.querySelector(".rename-char").click();document.querySelector(".rename-input").value="星星 <朋友>";document.querySelector(".rename-input").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))');await until('document.querySelector(".char-name").textContent==="星星 <朋友>"');
  await js('document.querySelector(".del-char").click()');await until('!!document.querySelector("[role=dialog]")');await js('document.querySelector(".studio-confirm .ghost").click()');assert.equal(chars.length,12);
  await js('document.querySelector(".del-char").click()');await until('!!document.querySelector("[role=dialog]")');await js('document.querySelector(".studio-confirm .danger").click()');await until('document.querySelectorAll(".cg-choice").length===11');
  win.setSize(840,570);await wait(250);await shot('small');assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
  await js('document.querySelector(".edit-char").click()');await until('!!document.querySelector("[data-pane=profile]:not([hidden]) #profile-name")');assert.equal(await js('document.querySelector("#house-book").dataset.view'),'profile');
  await open();chars=[];await js("window.qbot.ui.openConsole('characters')");await until('!!document.querySelector(".cg-empty")');await shot('empty');
  console.log('PASS: portraits, selection without activation, activation/failure, rename escaping, delete cancel/confirm, 12-character scrolling, small window, edit navigation, empty state. '+output);app.exit(0);
 }catch(e){console.error(e);app.exit(1);}})();
}
