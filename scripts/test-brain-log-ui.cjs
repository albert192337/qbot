const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
process.env.QBOT_QA_DATA = path.join(root, '.superpowers/brain-ui-data');
process.env.QBOT_QA_LOGS = '1';
require('../app/test/fixtures/nursery-main.cjs');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    for(let i=0;i<100 && !global.qa?.win;i++) await wait(100);
    const win=global.qa.win;
    for(let i=0;i<100;i++) {
      await wait(100);
      if(await win.webContents.executeJavaScript(`!!document.querySelector('#scene canvas')`))break;
    }
    win.webContents.send('ui:showScreen','devtools');
    for(let i=0;i<100;i++) {
      await wait(100);
      if(await win.webContents.executeJavaScript(`!!document.querySelector('#dev-brain-log details')`))break;
    }
    const content=await win.webContents.executeJavaScript(`(() => {const d=document.querySelector('#dev-brain-log details');if(!d)throw Error('日志未挂载');d.open=true;return d.textContent;})()`);
    await win.webContents.executeJavaScript(`document.querySelector('[data-pet-mode="free"]').click()`);await wait(200);
    assert.equal(global.qa.settings.behaviorMode,'free');assert.equal(global.qa.settings.freeMode,true);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('[data-pet-mode="free"]').getAttribute('aria-pressed')`),'true');
    await win.webContents.executeJavaScript(`document.querySelector('[data-pet-mode="companion"]').click()`);await wait(200);
    assert.equal(global.qa.settings.behaviorMode,'companion');assert.equal(global.qa.settings.freeMode,true);
    for(const text of ['完整输入','原始输出','想庆祝一下','cheer','辛苦啦','气泡已渲染'])assert.ok(content.includes(text),text);
    assert.equal(await win.webContents.executeJavaScript('window.injected'),undefined);
    await wait(2200);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('#dev-brain-log details').open`),true);
    await fs.mkdir(path.join(root,'.superpowers/brain-ui'),{recursive:true});
    await fs.writeFile(path.join(root,'.superpowers/brain-ui/logs.png'),(await win.webContents.capturePage()).toPNG());
    console.log('PASS: full LLM input/output/decision/timeline displayed; HTML escaped; expansion survives refresh.');
    app.exit(0);
  }catch(e){console.error(e);app.exit(1);}
});
