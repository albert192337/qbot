// Real Electron UI and preload, mocked model calls, isolated userData; no network or paid generation.
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const {mkdtemp,mkdir,readFile} = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
(async()=>{
  const root=path.resolve(__dirname,'..');const data=await mkdtemp(path.join(os.tmpdir(),'qbot-images-ui-'));
  const output=path.join(root,'.superpowers/character-images');await mkdir(output,{recursive:true});
  const app=await electron.launch({executablePath:require('electron'),args:[path.join(root,'app/test/fixtures/nursery-main.cjs')],env:{...process.env,QBOT_QA_DATA:data}});
  try {
    const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('#scene canvas');
    const png=await readFile(path.join(root,'app/resources/presets/mascot/source.png'));
    await app.evaluate(async({ipcMain},image)=>{
      global.qa.manifest.generationMode='original';
      const handlers={
        'studio:imageChoices':()=>[{selection:{kind:'source'},label:'原始参考图'},{selection:{kind:'turnaround-front'},label:'三视图第一幅'},{selection:{kind:'action',actionId:'idle',seconds:0},label:'无聊'}],
        'studio:previewImage':(_e,dir,selection)=>{global.qa.calls.push(['preview-image',selection]);return image;},
        'studio:saveCover':(_e,dir,selection)=>{global.qa.calls.push(['cover',selection]);},
        'studio:actionReference':()=>image,
        'studio:pendingActionFrame':()=>global.qa.pendingFrame??null,
        'studio:prepareActionFrame':(_e,dir,id,selection)=>{global.qa.calls.push(['prepare',id,selection]);global.qa.pendingFrame=image;return image;},
        'studio:approveActionFrame':(_e,dir,id,frame)=>{if(frame!==image)throw new Error('wrong frame');global.qa.calls.push(['approve',id]);global.qa.pendingFrame=null;},
      };
      for(const [channel,handler] of Object.entries(handlers))ipcMain.handle(channel,handler);
    },`data:image/png;base64,${png.toString('base64')}`);
    await page.evaluate(()=>window.qbot.ui.openConsole('profile'));
    await page.locator('[data-cover]').click();await page.locator('[data-image-choice]').selectOption('2');
    await page.locator('[data-image-time]').fill('0.4');await page.locator('[data-use]').click();
    assert.deepEqual(await app.evaluate(()=>global.qa.calls.find(c=>c[0]==='cover')[1]),{kind:'action',actionId:'idle',seconds:0.4});
    await page.evaluate(()=>window.qbot.ui.openConsole('persona'));await page.locator('.regenerate-action').first().click();
    await page.getByRole('button',{name:'确定',exact:true}).click();
    await page.locator('[data-image-choice]').selectOption('2');await page.locator('[data-image-time]').fill('0.3');
    await page.screenshot({path:path.join(output,'reference-picker.png')});await page.locator('[data-use]').click();
    await page.getByRole('button',{name:'确定',exact:true}).click();await page.getByAltText('待确认的生成首帧').waitFor();
    await page.screenshot({path:path.join(output,'frame-review.png')});
    const button=await page.getByRole('button',{name:'确定',exact:true}).boundingBox();const viewport=page.viewportSize();assert.ok(button && (!viewport || button.y+button.height <= viewport.height));
    assert.equal(await app.evaluate(()=>global.qa.calls.filter(c=>c[0]==='approve').length),0);
    await page.getByRole('button',{name:'取消',exact:true}).click();
    await page.locator('.regenerate-action').first().click();await page.getByRole('button',{name:'确定',exact:true}).click();
    await page.getByRole('button',{name:'确定',exact:true}).click();await page.getByAltText('待确认的生成首帧').waitFor();
    await page.getByRole('button',{name:'确定',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('.regenerate-action').disabled);
    assert.equal(await app.evaluate(()=>global.qa.calls.filter(c=>c[0]==='prepare').length),1);
    assert.equal(await app.evaluate(()=>global.qa.calls.filter(c=>c[0]==='approve').length),1);
    console.log('PASS cover choice, frame timestamp, cancel/resume review, and no duplicate generation');
  } finally {await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
