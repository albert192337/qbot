const path=require('node:path');
const {mkdtemp,mkdir}=require('node:fs/promises');
const os=require('node:os');
const assert=require('node:assert/strict');
const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),data=await mkdtemp(path.join(os.tmpdir(),'qbot-3d-'));
 const out=path.join(root,'.superpowers/cozy3d-preview');await mkdir(out,{recursive:true});
 const app=await electron.launch({executablePath:require(path.join(root,'app/node_modules/electron')),args:[path.join(root,'app/test/fixtures/cozy-main.cjs')],env:{...process.env,QBOT_QA_DATA:data,QBOT_COZY_3D:'1'}});
 try{const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.waitForSelector('body[data-ready=true]');
 await page.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.currentTime>.2));
 const shot=async name=>{await page.waitForTimeout(500);await page.screenshot({path:path.join(out,name+'.png')});};
 await shot('01-day');await page.locator('#behind').click();await shot('02-behind');await page.locator('#front').click();await shot('03-front');
 await page.locator('[data-light=night]').click();await shot('04-night');await page.locator('[data-light=day]').click();
 await page.locator('#rotate').click();await page.locator('#angle').click();await shot('05-rotate');await page.locator('#restore').click();
 const choices=await page.locator('#friend option').evaluateAll(o=>o.map(x=>({value:x.value,label:x.textContent})));
 for(const [name,pattern] of [['06-dog','小白狗'],['07-human','秦彻']]){const c=choices.find(x=>x.label.includes(pattern));if(c){await page.locator('#friend').selectOption(c.value);await page.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.currentTime>.2));await shot(name);}}
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,680));await shot('08-small');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await app.evaluate(()=>global.cozyQA.writes),0);assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,screenshots:out,checks:['WebGL boot','real video playback','front/back screenshots','lighting','rotation','small viewport','no production writes']}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
