// Real 4.0 runtime exercise and deterministic preview captures in isolated Electron.
const { _electron }=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/spine-lab',process.env.SPINE_LAB_CAPTURE||'');
(async()=>{
 const app=await _electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(__dirname,'spine-lab-window.cjs')]});
 try{
  await fs.mkdir(out,{recursive:true});
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>document.body.dataset.ready==='true'||document.querySelector('#error')?.textContent);
  const loadError=await page.locator('#error').textContent();assert.equal(loadError,'');
  const report=await page.evaluate(()=>{
   const lab=window.spineLab;lab.setPaused(true);
   return lab.data.animations.map(animation=>{
    lab.setAnimation(animation.name);
    for(const fraction of [0,.25,.5,.75,1]){
     lab.setAnimation(animation.name);lab.draw(animation.duration*fraction);
     for(const sk of lab.skeletons)for(const bone of sk.bones)for(const k of ['worldX','worldY','a','b','c','d'])if(!Number.isFinite(bone[k]))throw Error(animation.name+' invalid '+bone.data.name+'.'+k);
     if(['小黄鸡兜帽少年','吴邪'].includes(document.querySelector('#new-name').textContent)){
      const sk=lab.skeletons[1],sleep=animation.name.includes('sleep');
      for(const [slot,open,closed]of [['eye_LA0','eye_L_default','hood_eye_L_closed'],['eye_RA0','eye_R_default','hood_eye_R_closed']]){
       const s=sk.findSlot(slot),name=s.getAttachment()?.name;
       if(s.color.a!==1||!(sleep?name===closed:[open,closed].includes(name)))throw Error('Bean eye missing in '+animation.name);
      }
      if(sk.findSlot('eye_L0').color.a!==0||sk.findSlot('eye_R0').color.a!==0||sk.findSlot('nose_0').color.a!==0)throw Error('Original face leaked');
      if(sk.findSlot('mouth_A0').getAttachment()?.name!=='mouth_0')throw Error('Neutral mouth replaced');
     }
    }
    return {name:animation.name,duration:animation.duration,finiteTransforms:true};
   });
  });
  for(const [label,name] of [['idle','ship_spine_idle'],['walk','ship_spine_walk'],['run','ship_spine_run'],['happy','town_face_xinxi'],['sleep','ship_spine_sleep_cute'],['tea','town_post_player_taketea'],['together','town_shuangren_tietie01']]){
   await page.evaluate(n=>{spineLab.setAnimation(n);spineLab.draw(.6);},name);
   await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});
   if(process.argv.includes('--poses')){
    for(const fraction of [0,.25,.5,.75]){
     const png=await page.evaluate(({name,fraction})=>{
      spineLab.setAnimation(name);spineLab.draw(spineLab.data.findAnimation(name).duration*fraction);
      const source=document.querySelector('canvas'),c=document.createElement('canvas');c.width=1100;c.height=500;
      const ctx=c.getContext('2d');ctx.fillStyle='#f0f0df';ctx.fillRect(0,0,1100,500);ctx.drawImage(source,0,0);
      return c.toDataURL().split(',')[1];
     },{name,fraction});
     await fs.writeFile(path.join(out,`${label}-${fraction}.png`),Buffer.from(png,'base64'));
    }
   }
  }
  if(process.argv.includes('--poses')){
   for(const [label,slots] of [['torso-only',['躯干上部']],['arms-only',['右手_1无袖','左手_1无袖']]]){
    const png=await page.evaluate(slots=>{
     const lab=spineLab;lab.setAnimation('ship_spine_idle');lab.draw(0);
     const sk=lab.skeletons[1];for(const slot of sk.slots)if(!slots.includes(slot.data.name))slot.color.a=0;
     const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl');gl.clear(gl.COLOR_BUFFER_BIT);
     lab.renderer.begin();lab.renderer.drawSkeleton(sk,false);lab.renderer.end();
     return canvas.toDataURL().split(',')[1];
    },slots);
    await fs.writeFile(path.join(out,label+'.png'),Buffer.from(png,'base64'));
   }
  }
  await page.locator('[data-animation="ship_spine_walk"]').click();
  assert.equal(await page.locator('#all').inputValue(),'ship_spine_walk');
  await page.locator('#bones').check();await page.screenshot({path:path.join(out,'bones.png'),fullPage:true});
  await page.locator('#bones').uncheck();assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({runtime:'4.0.31',sourceVersion:'4.0.64',animations:report,errors,scope:'All animations: finite bone transforms at five samples. Seven actions captured; --poses adds cycle quarters and isolated torso/arms. Visual review is separate and is not an automatic pass.'},null,2));
  if(process.argv.includes('--frames')){
   await fs.mkdir(path.join(out,'frames'),{recursive:true});
   const actions=['ship_spine_idle','ship_spine_walk','town_face_xinxi','ship_spine_sleep_cute'];
   for(let i=0;i<192;i++){
    await page.evaluate(({name,t})=>{spineLab.setAnimation(name);spineLab.draw(t);},{name:actions[Math.floor(i/48)],t:(i%48)/24});
    const png=await page.evaluate(()=>{
     const source=document.querySelector('canvas'),c=document.createElement('canvas');c.width=1100;c.height=500;
     const ctx=c.getContext('2d');ctx.fillStyle='#f0f0df';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,0);
     ctx.font='18px Microsoft YaHei';ctx.fillStyle='#4e6955';ctx.textAlign='center';ctx.fillText('原始角色',275,480);ctx.fillText(document.querySelector('#new-name').textContent+' · 同一骨骼',825,480);
     return c.toDataURL('image/png').split(',')[1];
    });
    await fs.writeFile(path.join(out,'frames',String(i).padStart(4,'0')+'.png'),Buffer.from(png,'base64'));
   }
  }
  console.log(JSON.stringify({animations:report.length,errors,screenshots:out}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
