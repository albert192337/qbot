const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'output/roomlab');await fs.mkdir(out,{recursive:true});
 const app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/cozy-main.cjs')],env:{...process.env,QBOT_ROOMLAB:'1',QBOT_QA_DATA:await fs.mkdtemp(path.join(os.tmpdir(),'qbot-roomlab-qa-')),QBOT_COZY_REAL_CHARACTERS:path.join(process.env.APPDATA,'@qbot/app/characters')}});
 try{
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.waitForSelector('body[data-ready=true]');
  await page.waitForFunction(()=>[...document.querySelectorAll('#sources>div')].filter(d=>[...d.querySelectorAll('video')].some(v=>v.currentTime>.2&&v.style.visibility==='visible')).length===4);
  await page.screenshot({path:path.join(out,'800-room.png')});
  await page.locator('#width').selectOption('600');await page.waitForTimeout(250);
  const size=await app.evaluate(()=>global.cozyQA.win.getContentSize());assert.equal(size[0],600);assert.ok(Math.abs(size[1]-237)<=2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(out,'600-room.png')});
  await page.locator('#pin').click();assert.equal(await app.evaluate(()=>global.cozyQA.win.isAlwaysOnTop()),true);await page.locator('#pin').click();
  await page.locator('#edit').click();await page.locator('#size').fill('120');await page.locator('#save').click();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.roomlab.arrangement.v1')));assert.equal(saved[0].size,120);
  const box=await page.locator('#scene').boundingBox();await page.mouse.move(box.x+245*box.width/1000,box.y+240*box.height/295);await page.mouse.down();await page.mouse.move(box.x+280*box.width/1000,box.y+245*box.height/295,{steps:5});await page.mouse.up();await page.locator('#save').click();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.roomlab.arrangement.v1')));assert.ok(saved[0].x>260);
  await page.reload();await page.waitForSelector('body[data-ready=true]');await page.locator('#edit').click();assert.equal(await page.locator('#size').inputValue(),'120');
  await page.locator('#width').selectOption('1000');await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'editor.png')});
  assert.equal(await app.evaluate(()=>global.cozyQA.writes),0);assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({passed:true,checks:['four real character animations','600px native window and no horizontal overflow','always-on-top toggle','character drag/scale','save/reload','zero production writes'],errors},null,2));console.log('PASS roomlab');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
