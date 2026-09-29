const {app,BrowserWindow,ipcMain,protocol,session,screen}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),base=path.resolve(process.env.QBOT_HYBRID_OUTPUT||'D:/QBot-Spine-Hybrid');
const free=process.argv.includes('--free'),out=free?path.join(base,'free-v2'):base;
app.setPath('userData',path.join(os.tmpdir(),'qbot-hybrid-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
 let win;
 ipcMain.handle('pet:getCursor',()=>{const p=screen.getCursorScreenPoint(),b=win?.getContentBounds();return{x:p.x-(b?.x||0),y:p.y-(b?.y||0)};});
 protocol.handle('qbot-asset',async req=>{const u=new URL(req.url);if(!['spine-wuxie','spine-zhangqiling'].includes(u.hostname))return new Response(null,{status:403});const base=path.join(out,'characters',u.hostname),file=path.resolve(base,decodeURIComponent(u.pathname).replace(/^\//,''));if(!file.startsWith(base+path.sep))return new Response(null,{status:403});try{return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.webm')?'video/webm':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'text/plain'}});}catch{return new Response(null,{status:404});}});
 const verify=process.argv.includes('--capture');
 win=new BrowserWindow({width:1120,height:860,show:!verify,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:verify,backgroundThrottling:false}});
 win.webContents.on('console-message',(_e,level,msg)=>{if(level>=3)console.error(msg);});
 await win.loadFile(path.join(root,'app/out/renderer/spine-preview/index.html'));
 if(free){
  for(let n=0;n<200;n++){if(await win.webContents.executeJavaScript(`!!window.hybrid&&document.querySelectorAll('canvas.spine-player[data-ready=true]').length===2`))break;await wait(80);}
  await win.webContents.executeJavaScript(`
    document.title='吴邪与张起灵 · 首帧自由演出 V2';
    document.querySelector('h1').textContent='Spine 首帧 → 新生成的自由动作';
    document.querySelector('h1 + p').textContent='吴邪：小跳转身挥手　／　张起灵：俯身接住小鸡再托起';
    document.querySelector('.note').textContent='待机、走路、坐板凳和表情按钮是实时 Spine；「播放新生成视频」是新的 5 秒 AI 动画，仅约束首帧。结束直接切回 Spine，保留接缝供比较。';
    [...document.querySelectorAll('#actions button')].find(b=>b.textContent==='高光动画').textContent='播放新生成视频';
    const labels=[...document.querySelectorAll('.status')];
    setInterval(()=>hybrid.stages.forEach((s,i)=>{
      const v=[...s.querySelectorAll('video')].find(v=>v.style.visibility==='visible');
      labels[i].textContent=v?'新生成视频 · '+v.currentTime.toFixed(1)+' 秒':'实时 Spine · '+(s.querySelector('canvas')?.dataset.action==='perch'?'坐板凳':'骨骼动画');
    }),100);
  `);
  if(!verify){win.show();win.focus();setTimeout(()=>{if(!win.isDestroyed())void win.webContents.executeJavaScript(`hybrid.play('highlight')`);},2000);}
 }
 if(process.argv.includes('--spine')){
  for(let n=0;n<200;n++){if(await win.webContents.executeJavaScript(`!!window.hybrid&&document.querySelectorAll('canvas.spine-player[data-ready=true]').length===2`))break;await wait(80);}
  await win.webContents.executeJavaScript(`
    document.title='吴邪与张起灵 · 实时 Spine';
    document.querySelector('h1').textContent='实时 Spine · 表情与坐姿';
    document.querySelector('.note').textContent='当前角色由骨骼实时驱动。移动鼠标看视线，点击按钮切换动作或表情，按住角色试拖拽姿势。';
    [...document.querySelectorAll('#actions button')].find(b=>b.textContent==='高光动画')?.remove();
    hybrid.play('perch');
  `);
  win.show();win.focus();
  console.log('Ready: two live Spine canvases, seated pose');
 }
 if(!verify)return;
 const ev=s=>win.webContents.executeJavaScript(s);
 for(let n=0;n<200;n++){if(await ev(`document.querySelectorAll('canvas.spine-player[data-ready=true]').length===2`))break;await wait(80);}
 if(!await ev(`document.querySelectorAll('canvas.spine-player[data-ready=true]').length===2`))throw Error('Spine load failed');
 await wait(400);
 const save=async name=>fs.writeFile(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 await save('neutral');
 for(const expression of ['happy','curious','annoyed','sleepy','surprised']){await ev(`hybrid.expression('${expression}')`);await wait(180);await save(expression);}
 await ev(`hybrid.expression('neutral');hybrid.play('idle')`);await wait(350);
 await ev(`hybrid.players.forEach(p=>p.setSuspended(true))`);
 // Deterministic pose uses the last actual rendered frame, without a separately generated character.
 for(const [i,id]of ['spine-wuxie','spine-zhangqiling'].entries()){
  await fs.mkdir(path.join(out,id),{recursive:true});
  const png=await ev(`document.querySelectorAll('canvas.spine-player')[${i}].toDataURL().split(',')[1]`);
  if(!await fs.stat(path.join(out,'generation.json')).catch(()=>null))await fs.writeFile(path.join(out,id,'spine-frame.png'),Buffer.from(png,'base64'));
 }
 await ev(`hybrid.players.forEach(p=>p.setSuspended(false));hybrid.play('perch')`);await wait(1100);await save('seated');
 const bones=await ev(`hybrid.players.map(p=>{const sk=p.spine.sk;return Object.fromEntries(['pelvis','hip','head','foot_L','foot_R'].map(n=>{const b=sk.findBone(n);return [n,[b.worldX,b.worldY]]}))})`);
 await fs.writeFile(path.join(out,'seat-bones.json'),JSON.stringify(bones,null,2));
 for(const i of [1,2,3]){await wait(700);await save('seated-'+i);}
 if(await fs.stat(path.join(out,'spine-wuxie/highlight.webm')).catch(()=>null)){
  const assert=require('node:assert/strict');
  await ev(`hybrid.expression(null);hybrid.play('idle')`);await wait(300);await save('before-video');
  await ev(`hybrid.play('highlight')`);
  for(let i=0;i<150;i++){if(await ev(`[...document.querySelectorAll('video')].filter(v=>v.style.visibility==='visible'&&v.currentTime>.05).length===2`))break;await wait(50);}
  assert.equal(await ev(`[...document.querySelectorAll('canvas.spine-player')].filter(c=>c.style.visibility==='hidden').length`),2);
  await save('video-start');
  for(const i of [1,2,3,4]){await wait(850);await save('video-'+i);}
  await wait(2000);
  assert.equal(await ev(`[...document.querySelectorAll('canvas.spine-player')].filter(c=>c.style.visibility==='visible'&&c.dataset.action==='idle').length`),2);
  await save('after-video');
  await ev(`hybrid.play('highlight')`);await wait(500);
  await ev(`hybrid.stages.forEach(s=>s.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,bubbles:true})))`);await wait(150);
  assert.equal(await ev(`[...document.querySelectorAll('canvas.spine-player')].filter(c=>c.style.visibility==='visible'&&c.dataset.action==='drag').length`),2);
  await ev(`hybrid.stages.forEach(s=>s.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true})))`);await wait(200);
  assert.equal(await ev(`[...document.querySelectorAll('video')].filter(v=>v.style.visibility==='visible').length`),0);
  await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({bothVideosPlayed:true,bothReturnedToSpine:true,dragInterruptsBoth:true,seatSamples:4,faces:6},null,2));
 }
 console.log('Captured faces, seat and Spine reference frames');app.quit();
}catch(e){console.error(e);app.exit(1);}});
