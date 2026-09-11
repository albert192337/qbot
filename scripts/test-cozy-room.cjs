const path = require('node:path');
const os = require('node:os');
const { mkdtemp, mkdir } = require('node:fs/promises');
const assert = require('node:assert/strict');
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const data=await mkdtemp(path.join(os.tmpdir(),'qbot-cozy-qa-'));
  const output=path.join(root,'.superpowers/cozy-preview');await mkdir(output,{recursive:true});
  const app=await electron.launch({executablePath:require(path.join(root,'app/node_modules/electron')),args:[path.join(root,'app/test/fixtures/cozy-main.cjs')],env:{...process.env,QBOT_QA_DATA:data}});
  try{
    const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(15000);
    await page.waitForSelector('body[data-ready=true]');
    await page.waitForFunction(()=>[...document.querySelectorAll('#actorSource video')].some(v=>v.currentTime>0&&v.style.visibility==='visible'));
    const shot=async n=>{await page.waitForTimeout(150);await page.screenshot({path:path.join(output,n+'.png')});};
    await shot('01-day');
    assert.equal(await page.locator('#catalog button').count(),6);
    await page.getByRole('button',{name:'蘑菇暖灯',exact:true}).click();
    await page.getByRole('button',{name:'收起来',exact:true}).click();
    await page.getByRole('button',{name:'保存布置',exact:true}).click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.cozy.preview.layout.v1')));
    assert.equal(saved.furniture.find(f=>f.id==='lamp').visible,false);
    await page.reload();await page.waitForSelector('body[data-ready=true]');
    assert.equal(await page.locator('#catalog button[data-id=lamp] i').textContent(),'已收起');
    await page.getByRole('button',{name:'蘑菇暖灯',exact:true}).click();
    await page.getByRole('button',{name:'夜晚',exact:true}).click();await shot('02-night');
    await page.getByRole('button',{name:'落日',exact:true}).click();await shot('03-sunset');
    await page.getByRole('button',{name:'午后',exact:true}).click();
    if(process.env.QBOT_COZY_REAL_CHARACTERS){
      const choices=await page.locator('#friend option').evaluateAll(options=>options.map(o=>({value:o.value,label:o.textContent})));
      for(const [id,pattern] of [['05-line-dog','小白狗'],['06-human','秦彻']]){
        const choice=choices.find(c=>c.label.includes(pattern));if(!choice)continue;
        await page.locator('#friend').selectOption(choice.value);
        await page.waitForFunction(()=>[...document.querySelectorAll('#actorSource video')].some(v=>v.currentTime>0&&v.style.visibility==='visible'));
        await shot(id);
      }
      await page.locator('#friend').selectOption('mascot');
    }
    await page.getByRole('button',{name:'奶油沙发',exact:true}).click();
    await page.locator('#roomCanvas').focus();await page.keyboard.press('ArrowRight');
    await page.getByRole('button',{name:'保存布置',exact:true}).click();
    const moved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.cozy.preview.layout.v1')));
    assert.notEqual(moved.furniture[0].u,saved.furniture[0].u);
    // Pointer dragging at the rendered sofa center, then persisted coordinates.
    const box=await page.locator('#roomCanvas').boundingBox();
    const fit=Math.min((box.width-12)/1024,(box.height-22)/920);
    const ox=(box.width-1024*fit)/2,oy=(box.height-920*fit)/2-55*fit;
    const f=moved.furniture[0],px=512+(f.u-f.v)*454,py=418+(f.u+f.v)*232;
    await page.mouse.move(box.x+ox+px*fit,box.y+oy+(py-60)*fit);await page.mouse.down();
    await page.mouse.move(box.x+ox+(px+50)*fit,box.y+oy+(py-42)*fit,{steps:12});await page.mouse.up();
    await page.getByRole('button',{name:'保存布置',exact:true}).click();
    const dragged=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.cozy.preview.layout.v1')));
    assert.notEqual(dragged.furniture[0].u,moved.furniture[0].u);
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,680));await shot('04-small');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await app.evaluate(()=>global.cozyQA.writes),0);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,checks:['real-character-playback','six-independent-sprites','stow-restore-save-reload','three-lighting-modes','keyboard-and-pointer-placement','small-window','no-production-mutations'],screenshots:output}));
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
