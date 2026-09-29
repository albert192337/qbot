// 原生 Electron 气泡烟测：使用已构建页面与真实 preload，不调用生成 API。
const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, '.superpowers/thought-qa-data'));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  let idleSeconds = 60;
  ipcMain.handle('bubble:idleSeconds', () => idleSeconds);
  ipcMain.handle('overlays:get', () => ({ revision: 0, winner: null }));
  const win = new BrowserWindow({
    width: 340, height: 500, show: false, frame: false, skipTaskbar: true,
    webPreferences: { preload: path.join(root, 'app/out/preload/index.js'), backgroundThrottling: false },
  });
  try {
    await win.loadFile(path.join(root, 'app/out/renderer/bubble/index.html'));

    win.showInactive();
    const output=path.join(root,'output/thought-bubble');
    await fs.mkdir(output,{recursive:true});
    const send=(expression,text='他忙他的，我先把今天的小快乐攒起来。')=>win.webContents.send('behavior:say',{source:'llm',expression,text,durationMs:20000});
    win.webContents.send('bubble:anchor','above',240);
    send('thought');
    await wait(1200);
    const inspect=()=>win.webContents.executeJavaScript(`(() => {
      const el=document.querySelector('.bubble'),t=el.querySelector('.text'),s=getComputedStyle(t),r=el.getBoundingClientRect();
      return {thought:el.classList.contains('pet-thought'),font:s.fontSize,text:t.textContent,clipped:t.scrollHeight>t.clientHeight,top:r.top,bottom:r.bottom,count:document.querySelectorAll('.bubble').length};
    })()`);
    let result=await inspect();
    assert.equal(result.thought,true);assert.equal(result.font,'15px');assert.equal(result.clipped,false);
    assert.ok(result.top>=0 && result.bottom<=240);
    await fs.writeFile(path.join(output,'thought.png'),(await win.webContents.capturePage()).toPNG());
    send('speech','嗯，我在这里。');await wait(300);
    assert.equal((await inspect()).thought,false);assert.equal((await inspect()).count,1);
    send('thought','<img src=x onerror=alert(1)>');await wait(200);
    assert.equal(await win.webContents.executeJavaScript("document.querySelectorAll('.bubble img').length"),0);
    win.webContents.send('bubble:anchor','below',240);
    send('thought');await wait(300);
    result=await inspect();assert.equal(result.text,'他忙他的，我先把今天的小快乐攒起来。');await wait(500);assert.ok(result.top>=0 && result.bottom<=240);
    await fs.writeFile(path.join(output,'below.png'),(await win.webContents.capturePage()).toPNG());
    win.webContents.send('bubble:thinking',true);await wait(100);
    win.webContents.send('behavior:say',{source:'chat',expression:'thought',text:'好像又多了一件值得开心的小事。',durationMs:20000});await wait(200);
    assert.equal(await win.webContents.executeJavaScript("document.querySelectorAll('.thinking-bubble').length"),0);
    win.webContents.send('bubble:clear');await wait(100);
    assert.equal(await win.webContents.executeJavaScript("document.querySelector('#stack').children.length"),0);
    await fs.writeFile(path.join(output,'result.json'),JSON.stringify({ok:true,checks:['thought','font','bounds','speech-switch','text-safety','below','loading-clear','clear']}));
    console.log('PASS: thought bubble native rendering and lifecycle');
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
