const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {mkdtemp,readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const latest=JSON.parse(await readFile(path.join(root,'.superpowers/sticker-demo/latest.json'),'utf8'));
  const real=path.join(root,'.superpowers/sticker-demo',latest.dirId);
  const data=await mkdtemp(path.join(os.tmpdir(),'qbot-sticker-real-'));
  const output=path.join(root,'.superpowers/sticker-preview');await mkdir(output,{recursive:true});
  const app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/nursery-main.cjs')],env:{...process.env,QBOT_QA_DATA:data,QBOT_QA_STICKERS:'1',QBOT_QA_REAL_STICKERS:real}});
  try{
    const page=await app.firstWindow();page.setDefaultTimeout(15000);
    await page.waitForSelector('#scene canvas');
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('console:navigate',{detail:{pane:'sticker-create',dirId:'white-dog'}})));
    await page.locator('.sw-card').first().waitFor();
    assert.equal(await page.locator('.sw-card').count(),18);
    await page.waitForFunction(()=>[...document.querySelectorAll('.sw-card img')].every(i=>i.naturalWidth>0));
    await page.screenshot({path:path.join(output,'white-dog-library.png')});
    await page.locator('[data-select]').first().click();
    const video=page.locator('[data-detail] video');await video.scrollIntoViewIfNeeded();
    await video.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('[data-detail] video')?.currentTime>.2);
    await page.screenshot({path:path.join(output,'white-dog-preview.png')});
    assert.equal(await app.evaluate(()=>global.qa.calls.filter(c=>['upload','activate','sticker-generate'].includes(c[0])).length),0);
    console.log('PASS: real 255-file library renders; original converted video plays; no generation/publication/activation');
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
