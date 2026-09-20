// Isolated Electron UI; model and persistence endpoints are fixtures, all external network blocked.
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const data=await mkdtemp(path.join(os.tmpdir(),'qbot-workspace-ui-'));
  const output=path.join(root,'.superpowers/character-workspace');await mkdir(output,{recursive:true});
  const app=await electron.launch({executablePath:require('electron'),args:[path.join(root,'app/test/fixtures/nursery-main.cjs')],env:{...process.env,QBOT_QA_DATA:data,QBOT_QA_CONSOLE:'1',QBOT_QA_STICKERS:'1'}});
  try{
    const page=await app.firstWindow();page.setDefaultTimeout(12000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const png=`data:image/png;base64,${(await readFile(path.join(root,'app/resources/presets/mascot/source.png'))).toString('base64')}`;
    await app.evaluate(({ipcMain},image)=>{
      const handlers={
        'studio:saveResourceAnnotation':(_e,dir,id,value)=>{global.qa.manifest.resourceAnnotations={...global.qa.manifest.resourceAnnotations,[id]:value};global.qa.calls.push(['annotation',id,value]);},
        'studio:saveScenePools':(_e,dir,pools)=>{global.qa.manifest.scenePools=pools;global.qa.calls.push(['pools',pools]);},
        'studio:imageChoices':()=>[{selection:{kind:'source'},label:'原图'},{selection:{kind:'action',actionId:'idle',seconds:0},label:'待机',durationSec:2}],
        'studio:previewImage':async(_e,dir,value)=>{global.qa.calls.push(['preview',value]);await new Promise(r=>setTimeout(r,value.seconds===0.5?180:10));return image;},
        'studio:saveCover':(_e,dir,value)=>global.qa.calls.push(['cover',value]),
      };for(const [id,handler]of Object.entries(handlers))ipcMain.handle(id,handler);
    },png);
    const singlePane=async(id)=>{
      assert.deepEqual(await page.locator('#content>.pane').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.dataset.pane)),[id]);
      assert.equal(await page.locator('#content>.pane[hidden]').evaluateAll(nodes=>nodes.every(n=>n.inert)),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.locator('#content>.pane.active').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,`${id} should not overflow horizontally`);
    };
    await page.locator('.action-library-grid').waitFor();
    assert.equal(await page.locator('#scene').count(),0);
    // Reproduce the reported navigation sequence: lazy lounge CSS must not reveal old panes or style nav buttons.
    await page.locator('.side-item[data-pane="lounge"]').click();
    await page.locator('#pane-lounge .room').waitFor();
    await singlePane('lounge');
    assert.equal(await page.locator('.side-item[data-pane="lounge"]').evaluate(el=>getComputedStyle(el).flexDirection),'row');
    assert.ok((await page.locator('.side-item[data-pane="lounge"]').boundingBox()).height<60);
    await page.screenshot({path:path.join(output,'lounge.png')});
    await page.locator('.side-item[data-pane="characters"]').click();
    await page.locator('.edit-char').first().click();
    await page.locator('.subnav-tab[data-pane="persona"]').click();
    await page.locator('.action-library-grid').waitFor();
    await singlePane('persona');
    const card=page.locator('[data-action="idle"]');
    await card.locator('summary').click();await card.locator('[data-resource-name]').fill('安静陪伴');await card.locator('[data-resource-meaning]').fill('安静等你回来，适合日常待机');
    await card.locator('[data-save-resource]').click();
    await page.waitForFunction(()=>document.querySelector('[data-action="idle"] b')?.textContent==='安静陪伴');
    await page.screenshot({path:path.join(output,'actions.png')});
    await page.locator('.subnav-tab[data-pane="scene-actions"]').click();
    await page.locator('[data-pool="idle"]').click();
    await page.locator('.resource-picker [data-id="sleep"]').check();
    await page.locator('.resource-picker [data-confirm]').click();
    await page.locator('[data-save-pools]').click();
    await page.waitForFunction(()=>document.querySelector('.studio-toast')?.textContent?.includes('保存'));
    assert.deepEqual(await app.evaluate(()=>global.qa.manifest.scenePools.idle),['idle','sleep']);
    await page.locator('[data-pool="idle"]').click();
    await page.locator('.resource-picker [data-id="sleep"]').uncheck();await page.locator('.resource-picker [data-cancel]').click();
    assert.match(await page.locator('[data-pool="idle"]').textContent(),/2/);
    await page.locator('[data-pool="idle"]').click();
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,600));
    await page.screenshot({path:path.join(output,'multi-select.png')});
    const bounds=await page.locator('.resource-picker [data-confirm]').boundingBox();assert.ok(bounds.y+bounds.height<=600);
    await page.keyboard.press('Escape');
    await page.locator('.subnav-tab[data-pane="profile"]').click();await page.locator('[data-cover]').click();
    await page.locator('[data-image-choice]').selectOption('1');
    await page.locator('[data-image-slider]').fill('0.5');await page.locator('[data-image-slider]').fill('1.2');
    await page.waitForFunction(()=>!document.querySelector('[data-use]').disabled&&document.querySelector('[data-image-preview]').naturalWidth>0);
    const frameButton=await page.locator('[data-use]').boundingBox();assert.ok(frameButton.y+frameButton.height<=600);
    await page.screenshot({path:path.join(output,'timeline.png')});
    await page.locator('[data-use]').click();
    assert.equal(await app.evaluate(()=>global.qa.calls.find(c=>c[0]==='cover')[1].seconds),1.2);
    await page.locator('.side-item[data-pane="hatch"]').click();await page.locator('#hatch-btn-start').waitFor();
    await singlePane('hatch');
    await page.screenshot({path:path.join(output,'create.png')});
    assert.equal(await page.locator('#scene').count(),0);
    await page.locator('.side-item[data-pane="sticker-create"]').click();await page.locator('[data-scan]').click();
    await singlePane('sticker-create');
    assert.equal(await page.locator('.subnav-tab').count(),0);
    await page.locator('[data-select="st_0"]').click();await page.locator('[data-item-name]').fill('等你回来');await page.locator('[data-item-meaning]').fill('安静陪伴');
    await page.locator('[data-next-stage]').click();
    assert.match(await page.locator('[data-scene-pick="idle"]').textContent(),/2/);
    await page.locator('[data-scene-pick="idle"]').click();await page.locator('.resource-picker [data-filter]').selectOption('selected');
    assert.equal(await page.locator('.resource-picker [data-id]').count(),2);
    await page.locator('.resource-picker [data-confirm]').click();
    await page.locator('[data-create]').click();await page.waitForFunction(()=>document.querySelector('[data-save]'));
    const request=await app.evaluate(()=>global.qa.calls.find(c=>c[0]==='sticker-create')[1]);
    assert.deepEqual(request.sceneCandidates.idle,['st_0','st_1']);assert.equal(request.items[0].name,'等你回来');assert.equal(request.items[0].meaning,'安静陪伴');
    await page.screenshot({path:path.join(output,'import.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1180,820));
    await page.locator('#pane-sticker-create').evaluate(el=>el.scrollTop=0);
    await page.screenshot({path:path.join(output,'import-wide.png')});
    await page.locator('.side-item[data-pane="lounge"]').click();await page.locator('#pane-lounge .room').waitFor();
    await singlePane('lounge');
    await page.locator('.side-item[data-pane="sticker-create"]').click();await page.locator('.sticker-workshop').waitFor();
    await singlePane('sticker-create');
    // New sticker versions: local validation, cancellation, IPC failure, pending task and completion.
    const imported=await page.evaluate(async()=>(await window.qbot.characters.list()).find(c=>c.dirId==='white-dog'));
    await app.evaluate(({ipcMain},character)=>{
      global.qa.variantCharacter=character;global.qa.rejectVariant=true;
      ipcMain.removeHandler('characters:list');
      ipcMain.handle('characters:list',()=>[{dirId:'mascot',manifest:global.qa.manifest,hasUnfinishedJob:false},global.qa.variantCharacter]);
      ipcMain.removeHandler('stickerLibrary:save');
      ipcMain.handle('stickerLibrary:save',(_e,_dir,library)=>{global.qa.variantCharacter.manifest.stickerLibrary=library;});
      ipcMain.removeHandler('stickerLibrary:generate');
      ipcMain.handle('stickerLibrary:generate',(_e,dir,source,seconds,description)=>{
        global.qa.calls.push(['variant-submit',dir,source,seconds,description]);
        if(global.qa.rejectVariant)throw new Error('测试：生成服务暂时不可用');
        const m=global.qa.variantCharacter.manifest;
        m.customActions.variant_test={...m.actions.idle,status:'pending'};
        m.stickerLibrary.variants={...m.stickerLibrary.variants,variant_test:{description,enabled:false,sourceId:source}};
        global.qa.win.webContents.send('studio:customAction',{dirId:dir,name:'variant_test',status:'pending'});
        return 'variant_test';
      });
    },imported);
    await page.locator('[data-select="st_0"]').click();
    await page.locator('[data-method]').selectOption('frame');
    await page.locator('[data-generate]').click();
    assert.match(await page.locator('[data-generation-feedback]').textContent(),/请先填写/);
    assert.equal(await app.evaluate(()=>global.qa.calls.filter(c=>c[0]==='variant-submit').length),0);
    await page.locator('[data-seconds]').fill('0.4');await page.locator('[data-description]').fill('安静睡觉，轻微呼吸');
    await page.locator('[data-generate]').click();await page.locator('.studio-confirm-mask').getByRole('button',{name:'取消',exact:true}).click();
    assert.equal(await page.locator('[data-method]').inputValue(),'frame');
    assert.equal(await page.locator('[data-description]').inputValue(),'安静睡觉，轻微呼吸');
    await page.locator('[data-generate]').click();await page.locator('.studio-confirm-mask').getByRole('button',{name:'确定',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-generation-feedback]')?.textContent.includes('提交失败'));
    assert.equal(await page.locator('[data-seconds]').inputValue(),'0.4');
    assert.equal(await page.locator('[data-description]').inputValue(),'安静睡觉，轻微呼吸');
    await app.evaluate(()=>{global.qa.rejectVariant=false;});
    await page.locator('[data-generate]').click();await page.locator('.studio-confirm-mask').getByRole('button',{name:'确定',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-generation-feedback]')?.textContent.includes('已提交'));
    assert.equal(await page.locator('[data-generate]').isDisabled(),true);
    assert.match(await page.locator('[data-version="variant_test"]').textContent(),/生成中/);
    const feedbackBounds=await page.locator('[data-generation-feedback]').boundingBox();
    assert.ok(feedbackBounds.y>=0&&feedbackBounds.y+feedbackBounds.height<=await page.evaluate(()=>innerHeight));
    await page.screenshot({path:path.join(output,'generation-feedback.png')});
    await page.locator('[data-generation-tasks]').click();
    await page.locator('.task-row').waitFor();
    assert.match(await page.locator('.task-row').textContent(),/1 个生成中/);
    await page.locator('.side-item[data-pane="sticker-create"]').click();
    await app.evaluate(()=>{
      global.qa.variantCharacter.manifest.customActions.variant_test.status='done';
      global.qa.win.webContents.send('studio:customAction',{dirId:'white-dog',name:'variant_test',status:'done'});
    });
    await page.waitForFunction(()=>document.querySelector('[data-version="variant_test"]')?.textContent.includes('已完成'));
    assert.match(await page.locator('[data-generation-feedback]').textContent(),/生成完成/);
    assert.equal(await page.locator('[data-description]').inputValue(),'安静睡觉，轻微呼吸');
    await page.locator('[data-generation-tasks]').click();await page.locator('.pane.active .pane-placeholder').waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS direct navigation, resource labels, multi-select/save/cancel, timeline, recommended import, and 800x600 layout');
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
