// Isolated WebGL test of the actual lab UI; never touches the desktop pet.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/spine-lab',process.env.SPINE_EXPRESSION_CAPTURE||'expression-review');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')],env:{...process.env,SPINE_LAB_URL:process.env.SPINE_LAB_URL||'http://127.0.0.1:24361/?skin=naruto'}});
 try{
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>document.body.dataset.ready==='true'||document.querySelector('#error').textContent);
  assert.equal(await page.locator('#error').textContent(),'');
  // Reload with foreground visibility set BEFORE any application startup code.
  // Previously manual draw() calls concealed a failed first requestAnimationFrame.
  await page.addInitScript(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
   const raf=window.requestAnimationFrame.bind(window);let first=true;
   window.requestAnimationFrame=cb=>raf(t=>{const initial=first;first=false;cb(initial?t-100:t);});
  });
  await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');
  await page.waitForFunction(()=>spineLab.expressionPlayer.snapshot().time>.1);
  assert.equal(await page.locator('#error').textContent(),'');
  await page.locator('[data-animation="ship_spine_sleep_cute"]').click();
  await page.waitForTimeout(300);
  const visible=await page.evaluate(()=>{
   const c=document.querySelector('canvas'),gl=c.getContext('webgl'),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   let left=0,right=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>128){if(x<c.width/2)left++;else right++;}return {left,right};
  });
  assert(visible.left>1000&&visible.right>1000,'Both characters must actually render after live sleep click');
  await page.locator('[data-expression="happy"]').click();
  await page.waitForTimeout(200);assert.equal(await page.locator('#error').textContent(),'');
  // Hidden test window: simulate foreground visibility without opening a window.
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}));
  const ids=await page.locator('[data-expression]').evaluateAll(es=>es.map(e=>e.dataset.expression));
  assert.equal(ids.length,23);assert.equal(new Set(ids).size,23);assert(!ids.includes('searching'));assert(!ids.includes('curious'));
  const reports=[];
  for(const id of ids){
   await page.locator(`[data-expression="${id}"]`).click();
   assert.equal(await page.locator(`[data-expression="${id}"]`).getAttribute('aria-pressed'),'true');
   const evidence=await page.evaluate(id=>{
    const l=spineLab;l.setPaused(true);l.playExpression(id);l.setPaused(true);l.draw(.15);
    const first=l.expressionPlayer.snapshot();l.draw(.45);const second=l.expressionPlayer.snapshot();
    for(const p of second.points.flat())for(const n of p)if(!Number.isFinite(n)||n<0||n>129)throw Error('Invalid face coordinates '+id);
    const sk=l.skeletons[1];if(sk.findSlot('mouth_A0').color.a!==0)throw Error('Static mouth leaked');
    if(sk.findSlot('nose_0').color.a!==0)throw Error('Old nose leaked');
    const before=JSON.stringify(second.points);l.draw(0);if(JSON.stringify(l.expressionPlayer.snapshot().points)!==before)throw Error('Clock moved on paused step');
    return {id,animated:JSON.stringify(first.points)!==JSON.stringify(second.points),png:document.querySelector('canvas').toDataURL().split(',')[1]};
   },id);
   assert(evidence.animated,id+' must animate');
   await fs.writeFile(path.join(out,id+'.png'),Buffer.from(evidence.png,'base64'));delete evidence.png;reports.push(evidence);
  }
  const transitions=await page.evaluate(ids=>{
   const l=spineLab;l.setPaused(true);let count=0;
   for(const from of ids)for(const to of ids){l.playExpression(from);l.setPaused(true);l.draw(.1);l.playExpression(to);l.setPaused(true);l.draw(.25);
    for(const v of l.expressionPlayer.snapshot().points.flat(2))if(!Number.isFinite(v))throw Error('Bad transition');count++;}
   l.setAnimation('ship_spine_sleep_cute');l.draw(1);const p=l.expressionPlayer.snapshot().points;
   if(p.some(r=>Math.max(...r.map(v=>v[1]))-Math.min(...r.map(v=>v[1]))>4))throw Error('Sleep eyes not closed');
   l.playExpression('happy');l.setPaused(true);l.draw(.6);
   if(document.querySelector('#all').value!=='ship_spine_idle')throw Error('Expression click cannot exit body sleep');
   // Pure eye updates must not modify hair, head mesh or any bone.
   const sk=l.skeletons[1],head=sk.findSlot('发中面部').getAttachment();
   const before=JSON.stringify({bones:sk.bones.map(b=>[b.x,b.y,b.scaleX,b.scaleY,b.rotation]),vertices:Array.from(head.vertices)});
   l.expressionPlayer.select('angry');l.expressionPlayer.update(.4);l.expressionPlayer.apply(sk);
   if(before!==JSON.stringify({bones:sk.bones.map(b=>[b.x,b.y,b.scaleX,b.scaleY,b.rotation]),vertices:Array.from(head.vertices)}))throw Error('Expression changed head/body');
   let rejected=0;for(const id of ['searching','curious','unknown'])try{l.expressionPlayer.select(id);}catch{rejected++;}if(rejected!==3)throw Error('Removed expressions accepted');
   return count;
  },ids);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{const l=spineLab;l.playExpression('neutral');l.setPaused(true);l.draw(0);const a=JSON.stringify(l.expressionPlayer.snapshot().points);l.draw(1);if(JSON.stringify(l.expressionPlayer.snapshot().points)!==a)throw Error('Reduced motion drift');});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-expression="happy"]').click();await page.waitForTimeout(650);
  await page.screenshot({path:path.join(out,'interactive.png'),fullPage:true});
  const rev=await page.evaluate(()=>spineLab.expressionPlayer.snapshot().revision);
  await page.locator('[data-expression="happy"]').click();assert.equal(await page.evaluate(()=>spineLab.expressionPlayer.snapshot().revision),rev+1);
  await page.locator('#pause').click();const t=await page.evaluate(()=>spineLab.expressionPlayer.snapshot().time);await page.waitForTimeout(160);assert.equal(await page.evaluate(()=>spineLab.expressionPlayer.snapshot().time),t);
  await page.locator('#pause').click();await page.waitForFunction(t=>spineLab.expressionPlayer.snapshot().time>t,t);
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
  const hiddenTime=await page.evaluate(()=>spineLab.expressionPlayer.snapshot().time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>spineLab.expressionPlayer.snapshot().time),hiddenTime);
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}));
  await page.setViewportSize({width:600,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({expressions:reports,transitions,errors,checks:['click labels','replay','pause/resume','eye-only geometry','sleep override/recovery','removed IDs rejected','reduced motion','narrow viewport'],scope:'Runtime checks and captures; visual review separately required.'},null,2));
  console.log(JSON.stringify({expressions:ids.length,transitions,errors,out}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
