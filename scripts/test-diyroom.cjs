const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),out=path.join(root,'output/diyroom');await fs.mkdir(out,{recursive:true});
  const app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/cozy-main.cjs')],env:{...process.env,QBOT_DIYROOM:'1',QBOT_QA_DATA:await fs.mkdtemp(path.join(os.tmpdir(),'qbot-diy-qa-')),QBOT_COZY_REAL_CHARACTERS:process.env.QBOT_COZY_REAL_CHARACTERS||path.join(process.env.APPDATA,'@qbot/app/characters')}});
  try{
    const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
    await page.waitForSelector('body[data-ready=true]');
    await page.waitForFunction(()=>[...document.querySelectorAll('#sources>div')].filter(d=>[...d.querySelectorAll('video')].some(v=>v.currentTime>.2&&v.style.visibility==='visible')).length===4);
    const shot=async name=>{await page.waitForTimeout(700);await page.screenshot({path:path.join(out,name+'.png')});};
    const photo=async name=>{await page.locator('#edit').click();await page.waitForTimeout(300);const data=await page.evaluate(()=>document.querySelector('#scene').toDataURL('image/png'));await fs.writeFile(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));await page.locator('#edit').click();};
    await shot('01-princess-editor');await photo('princess-room');
    assert.equal(await page.locator('#catalog button').count(),9);
    await page.locator('[data-preset=warm]').click();await shot('02-warm-editor');await photo('warm-room');
    await page.locator('[data-family=pink]').click();await page.locator('[data-furniture=pink-sofa]').click();
    await page.locator('#wall').selectOption('pink');await page.locator('#save').click();
    let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.diyroom.v1')));
    assert.equal(saved.room.floor,'warm');assert.equal(saved.room.wall,'pink');assert.equal(saved.room.furniture.find(p=>p.id==='warm-sofa').visible,false);assert.equal(saved.room.furniture.find(p=>p.id==='pink-sofa').visible,true);
    await shot('03-mixed');await photo('mixed-room');
    // Drag from an opaque part of the sofa; use canvas contain geometry.
    const point=async(x,y)=>{const b=await page.locator('#scene').boundingBox(),s=Math.min(b.width/1536,b.height/1024);return {x:b.x+(b.width-1536*s)/2+x*s,y:b.y+(b.height-1024*s)/2+y*s};};
    const start=await point(340,560),end=await point(440,620);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();await page.locator('#save').click();
    saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.diyroom.v1')));assert.notEqual(saved.room.furniture.find(p=>p.id==='pink-sofa').x,390);
    await page.locator('#scene').focus();await page.keyboard.press('ArrowRight');await page.locator('#save').click();
    const moved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.diyroom.v1')));assert.equal(moved.room.furniture.find(p=>p.id==='pink-sofa').x,saved.room.furniture.find(p=>p.id==='pink-sofa').x+5);
    await page.reload();await page.waitForSelector('body[data-ready=true]');assert.equal(await page.locator('#wall').inputValue(),'pink');assert.equal(await page.locator('#floor').inputValue(),'warm');
    await page.locator('[data-family=pink]').click();await page.locator('[data-furniture=pink-sofa]').click();await page.locator('#stow').click();await page.locator('#save').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.diyroom.v1')).room.furniture.find(p=>p.id==='pink-sofa').visible),false);await shot('04-sofa-removed');
    await page.locator('#undo').click();await page.locator('#save').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qbot.diyroom.v1')).room.furniture.find(p=>p.id==='pink-sofa').visible),true);
    await page.locator('#clear').click();assert.equal(await page.locator('body').getAttribute('data-furniture'),'0');await photo('empty-room');
    // Clearing removes ALL furniture. Compare every scene pixel to the empty
    // architectural layers; no baked sofa, curtains, rug or contact shadows.
    await page.locator('#edit').click();await page.waitForTimeout(300);
    const assetDir=path.join(root,'app/out/renderer/assets'),assetNames=await fs.readdir(assetDir);
    const shellUrls=['shell-pink-','shell-warm-'].map(prefix=>require('node:url').pathToFileURL(path.join(assetDir,assetNames.find(n=>n.startsWith(prefix)&&n.endsWith('.png')))).href);
    const clean=await page.evaluate(async(urls)=>{
      const images=await Promise.all(urls.map(async url=>{const i=new Image();i.src=url;await i.decode();return i;}));
      const c=document.createElement('canvas');c.width=1536;c.height=1024;const g=c.getContext('2d');g.drawImage(images[0],0,0,1536,1024);g.save();g.beginPath();g.rect(0,635,1536,389);g.clip();g.drawImage(images[1],0,0,1536,1024);g.restore();
      const expected=g.getImageData(0,0,1536,1024).data,actual=document.querySelector('#scene').getContext('2d').getImageData(0,0,1536,1024).data;return expected.every((v,i)=>v===actual[i]);
    },shellUrls);assert.ok(clean,'empty canvas exactly matches empty shell, no baked furniture');await page.locator('#edit').click();
    await page.locator('#undo').click();await page.locator('[data-preset=pink]').click();await page.locator('#save').click();
    await app.evaluate(({session},filename)=>{global.diyPieceDownload=null;session.defaultSession.once('will-download',(_e,item)=>{item.setSavePath(filename);item.once('done',(_e,state)=>global.diyPieceDownload=state);});},path.join(out,'pink-sofa.png'));
    await page.locator('#exportPiece').click();for(let i=0;i<60&&await app.evaluate(()=>global.diyPieceDownload)===null;i++)await page.waitForTimeout(100);assert.equal(await app.evaluate(()=>global.diyPieceDownload),'completed');
    const transparent=await page.evaluate(async url=>{const i=new Image();i.src=url;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const pixels=g.getImageData(0,0,c.width,c.height).data;let clear=0,opaque=0;for(let n=3;n<pixels.length;n+=4){if(pixels[n]===0)clear++;if(pixels[n]>240)opaque++;}return clear>1000&&opaque>1000;},require('node:url').pathToFileURL(path.join(out,'pink-sofa.png')).href);assert.ok(transparent,'standalone furniture PNG retains actual alpha');
    await app.evaluate(({session},filename)=>{global.diyDownload=null;session.defaultSession.once('will-download',(_e,item)=>{item.setSavePath(filename);item.once('done',(_e,state)=>global.diyDownload=state);});},path.join(out,'exported-room.png'));
    await page.locator('#photo').click();for(let i=0;i<60&&await app.evaluate(()=>global.diyDownload)===null;i++)await page.waitForTimeout(100);assert.equal(await app.evaluate(()=>global.diyDownload),'completed');
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,680));await shot('05-small');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await app.evaluate(()=>global.cozyQA.writes),0);assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({passed:true,errors,checks:['18 independent sprites','warm/pink presets','mixed wallpaper/floor/furniture','real four character playback','alpha hit-test pointer drag','keyboard placement','save/reload','stow/undo','clear pixels exactly equal empty architectural shell','photo download','small window','no production writes']},null,2));console.log('PASS: modular DIY room, actual character animations, drag/stow/mix and zero furniture in cleared room');
  }catch(e){for(const p of app.windows())try{await p.screenshot({path:path.join(out,'failure.png')});console.error(await p.locator('#loading').textContent());}catch{}throw e;}finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
