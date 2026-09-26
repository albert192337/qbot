// Isolated production renderer, simulated IPC, no paid calls or user data changes.
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { mkdtemp, rm, mkdir } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),data=await mkdtemp(path.join(os.tmpdir(),'qbot-perch-ui-'));
 const app=await electron.launch({executablePath:require(require.resolve('electron',{paths:[path.join(root,'app')]})),args:[path.join(root,'app/test/fixtures/nursery-main.cjs')],env:{...process.env,QBOT_QA_DATA:data}});
 try {
  const page=await app.firstWindow();page.setDefaultTimeout(15000);
  await page.waitForSelector('#scene canvas');
  await app.evaluate(({ipcMain})=>{
   delete global.qa.manifest.actions.perch;delete global.qa.manifest.actions.perch_sit;delete global.qa.manifest.actions.perch_lie;
   ipcMain.removeHandler('studio:getPrompts');ipcMain.handle('studio:getPrompts',()=>({actions:{perch:{poseDesc:'停靠',motionDesc:'保持姿势，轻微呼吸'}},turnaroundPrompt:''}));
   ipcMain.removeHandler('studio:regenerateActions');ipcMain.handle('studio:regenerateActions',()=>{throw Error('测试错误 E_PERCH：稍后重试 <保留>');});
  });
  const open=async()=>{await page.evaluate(()=>window.qbot.ui.openConsole('persona'));await page.locator('[data-pane="persona"]:not([hidden])[data-ready="true"]').waitFor();};
  await open();
  const card=page.locator('[data-pane="persona"] [data-action="perch"]');
  await card.getByRole('button',{name:'补充生成',exact:true}).waitFor();
  assert.equal(await card.locator('.status').textContent(),'未生成');
  await card.getByRole('button',{name:'补充生成',exact:true}).click();
  await page.locator('.studio-confirm-mask .btn.danger').click();
  await card.locator('.action-generation-error').waitFor();
  await page.waitForTimeout(1000);
  assert.match(await card.textContent(),/测试错误 E_PERCH.*<保留>/);
  await page.getByRole('button',{name:'合上手册',exact:true}).click();await open();
  assert.match(await card.locator('.action-generation-error').textContent(),/E_PERCH/);
  await app.evaluate(({ipcMain})=>{
   ipcMain.removeHandler('studio:regenerateActions');ipcMain.handle('studio:regenerateActions',()=>{
    global.qa.status={cloud:true,stage:'actions',running:true,actions:{perch:{status:'pending'}}};
    global.qa.win.webContents.send('hatch:cloudStatus',{dirId:'mascot',status:global.qa.status});
   });
  });
  await card.getByRole('button',{name:'补充生成',exact:true}).click();await page.locator('.studio-confirm-mask .btn.danger').click();
  await page.waitForFunction(()=>document.querySelector('[data-action="perch"] .status')?.textContent==='生成中');
  assert.equal(await card.locator('.action-generation-error').count(),0);
  assert.equal(await card.locator('.regenerate-action').count(),0);
  await mkdir(path.join(root,'.superpowers/perch-repair'),{recursive:true});
  await page.screenshot({path:path.join(root,'.superpowers/perch-repair/pending.png')});
  console.log('PASS: missing action, retained escaped error after redraw/reopen, retry clears error, cloud progress disables duplicate submission');
 }finally{await app.close();await rm(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

