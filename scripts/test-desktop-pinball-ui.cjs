const assert=require('node:assert/strict');
module.exports=async function({app,win,fs,path,out,profile,getState,save,getWallet,model,setLaunchSeed,resizeDisplay}){
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),js=s=>win.webContents.executeJavaScript(s),checks=[];
 const until=async(code,label,timeout=20000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await js(code))return;await wait(100);}const diagnostics=await js('({stats:window.pinballPreview?.stats(),hidden:document.hidden,visibility:document.visibilityState,now:performance.now()})');fs.writeFileSync(path.join(out,'timeout-diagnostics.json'),JSON.stringify({label,diagnostics,mainRounds:getState().rounds.map(r=>({id:r.result.id,started:r.started,ends:r.ends}))},null,2));throw Error(label);};
 const shot=async name=>fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 const financial=w=>({coins:w.coins,balls:w.balls,stars:w.stars,rounds:w.rounds,unlocked:w.unlocked,equipped:w.equipped,last:w.last});
 const seedFor=prize=>{for(let seed=1;seed<1000;seed++){const s=getState(),r=model.simulate({width:s.width,height:s.height,icons:s.icons,launchX:s.width*.97,stars:3,unlocked:getWallet().unlocked,seed});if(r.wheel&&(prize?r.wheel.prize===prize:r.wheel.coins>0))return seed;}throw Error('Missing wheel fixture');};
 const click=async selector=>{const previous=selector==='#fire'?getWallet().rounds:null;const p=await js(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);win.webContents.sendInputEvent({type:'mouseMove',...p});win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...p});win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...p});await wait(80);if(previous!==null)await until(`window.pinballPreview.stats().wallet.rounds>${previous}&&!document.querySelector('#fire').textContent.includes('发射中')`,'launch IPC completes');};
 try{
  win.webContents.setAudioMuted(true); // Exercise audio graphs without playing automated test runs aloud.
  win.webContents.setBackgroundThrottling(false); // The test must also drain while Codex covers its fixture window.
  await until("window.pinballPreview?.stats().ready==='true'",'Renderer ready');checks.push('reward-card renderer loads');assert.equal(await js("document.querySelector('#shelf')===null&&document.querySelector('#actor')===null"),true);
  await shot('01-ready');assert.equal(await js('window.pinballPreview.stats().icons'),20);
  await until('window.pinballPreview.stats().iconImages===20','hit image assets');
  const audioReport=await js('window.pinballPreview.auditAudio()');
  for(const [type,r] of Object.entries(audioReport)){assert.ok(r.peak>.001&&r.peak<.8,type+' peak');assert.ok(r.rms>.0001,type+' signal');}
  assert.equal(Object.keys(audioReport).length,10);assert.ok(audioReport.jackpot.duration>audioReport.hit.duration*10);fs.writeFileSync(path.join(out,'audio-verification.json'),JSON.stringify(audioReport,null,2));checks.push('ten real Web Audio cues render non-clipping signals, including wheel start and ticking');
  const shellIcons=getState().icons.some(p=>p.imageRevision);
  if(shellIcons){
   assert.deepEqual(await js("window.pinball.icon('missing-item')"),{image:'',revision:''});
   await js(`window.__hitImages=new Set();window.__originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(this.canvas.id==='field'&&image instanceof HTMLImageElement)window.__hitImages.add(image.src);return window.__originalDrawImage.call(this,image,...args)};void 0`);
  }
  await click('#edit');assert.equal(await js('window.pinballPreview.stats().editing'),true);const old=getState().icons[0].type;await click('.pin-edit');assert.notEqual(getState().icons[0].type,old);await click('#edit');checks.push('native click changes an icon role and persists override');
  await click('#edit');assert.equal(await js("document.querySelector('#edit').textContent"),'退出编辑');
  // Reproduce a real desktop icon lying directly underneath the toolbar exit button.
  await js("(()=>{const r=document.querySelector('#edit').getBoundingClientRect(),p=document.querySelector('.pin-edit');p.style.left=(r.left+r.width/2-28)+'px';p.style.top=(r.top+r.height/2-28)+'px';})()");
  const roleBeforeExit=getState().icons[0].type;await click('#edit');assert.equal(await js('window.pinballPreview.stats().editing'),false);assert.equal(getState().icons[0].type,roleBeforeExit);
  await click('#edit');win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await until('!window.pinballPreview.stats().editing','Escape leaves editor');checks.push('toolbar exit beats overlapping icon hotspot; Escape also exits editing');
  await js("document.querySelector('#aim').value='13.2';void 0");await click('#fire');assert.equal(getWallet().balls,19);assert.ok(await js('window.pinballPreview.stats().running'));
  const first=getState().rounds[0];assert.equal(await js("document.querySelector('#fire').disabled"),false);await click('#fire');assert.equal(getWallet().balls,18);
  assert.equal(getState().rounds.length,2);assert.deepEqual(getState().rounds[0],first);await until('window.pinballPreview.stats().activeRounds===2','second click appends');checks.push('clicking fire again during flight adds another shot and preserves the first trajectory');
  assert.ok(await js('window.pinballPreview.stats().openingFrames>0'));await until('window.pinballPreview.stats().jitterFrames>0','actual icon impact animation');await shot('02-playing');await until('!window.pinballPreview.stats().running','round drains');assert.ok(getWallet().coins>0);
  await until(`document.querySelector('#reward-amount').textContent===${JSON.stringify('+'+getWallet().coins.toLocaleString('en-US'))}`,'aggregate reward reaches exact payout');
  assert.ok(await js('window.pinballPreview.stats().trailFrames>0&&window.pinballPreview.stats().landingFrames>0'));assert.equal(await js('window.pinballPreview.stats().result.coins'),getWallet().coins);
  const mix=await js('window.pinballPreview.stats().audio');assert.ok(mix.played>0);assert.ok(mix.peakVoices<=24);await click('#sound');assert.equal(await js('window.pinballPreview.stats().audio.enabled'),false);assert.equal(await js('window.pinballPreview.stats().audio.voices'),0);
  await shot('03-reward');checks.push('short trails and slot flashes play; concurrent shot results reconcile exactly; audio is bounded and mute stops all voices');
  if(shellIcons){
   const result=await js(`(async()=>{const expected=new Set(await Promise.all(window.pinballPreview.state().icons.map(async p=>(await window.pinball.icon(p.id)).image)));const drawn=[...window.__hitImages];CanvasRenderingContext2D.prototype.drawImage=window.__originalDrawImage;return{count:drawn.length,allOriginal:drawn.every(src=>expected.has(src)),poPoImage:(await window.pinball.icon(window.pinballPreview.state().icons.find(p=>p.name==='POPO云文档').id)).image};})()`);
   assert.ok(result.count>0);assert.equal(result.allOriginal,true);
   const nativeFixtures=JSON.parse(fs.readFileSync(path.join(out,'shell-icon-fixtures.json'),'utf8'));
   assert.equal(result.poPoImage,nativeFixtures.find(p=>p.name==='POPO云文档').image);
   checks.push('real Shell artwork survives main IPC and impact drawImage unchanged; missing artwork has no generic fallback');
  }
  await wait(700);save({...getWallet(),stars:3});
  // Controlled aim at empty rightmost bucket; tests payout/UI without chance or production state.
  setLaunchSeed(seedFor('petals'));await js("document.querySelector('#aim').value='97';void 0");await click('#fire');
  await until("window.pinballPreview.stats().wheel.phase==='spinning'",'top slot starts automatic roulette');
  const firstTicket=getWallet().pendingWheels[0],firstId=firstTicket.id;assert.equal(await js("document.querySelector('#reward-prizes').textContent.includes('花瓣')"),false);assert.equal(await js("document.querySelector('#fire').disabled"),false);await shot('07-roulette-spinning');
  assert.equal(await js("document.querySelector('#test-wheel').disabled"),true);
  const beforeResize=financial(getWallet());resizeDisplay(1200,800);
  await until('innerWidth===1200&&window.pinballPreview.state().width===1200','display geometry updates in place');
  assert.equal(win.isDestroyed(),false);assert.deepEqual(financial(getWallet()),beforeResize);assert.equal(getWallet().pendingWheels[0].startedAt,firstTicket.startedAt);assert.equal(getWallet().pendingWheels[0].id,firstId);
  resizeDisplay(1440,900);await until('innerWidth===1440&&window.pinballPreview.state().width===1440','display restores');checks.push('screen resize preserves window, settled wallet and active roulette without restarting or redrawing rewards');
  save({...getWallet(),stars:3});setLaunchSeed(seedFor(null));await click('#fire');assert.equal(getWallet().pendingWheels.length,2);assert.equal(getWallet().pendingWheels[0].startedAt,firstTicket.startedAt);
  const both=financial(getWallet()),secondTicket=getWallet().pendingWheels.find(t=>t.id!==firstId);assert.equal(secondTicket.startedAt,null);
  await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload();});await until("window.pinballPreview?.stats().wheel.phase==='spinning'",'wheel resumes after reload');
  assert.equal(await js('window.pinballPreview.stats().wheel.id'),firstId);assert.equal(getWallet().pendingWheels[0].startedAt,firstTicket.startedAt);assert.deepEqual(financial(getWallet()),both);
  await until("window.pinballPreview.stats().wheel.phase==='revealed'",'wheel stops itself');assert.equal(await js("document.querySelector('#wheel-result').textContent"),'花瓣足迹');await shot('08-roulette-prize');
  await until(`window.pinballPreview.stats().wheel.id===${JSON.stringify(secondTicket.id)}&&window.pinballPreview.stats().wheel.phase==='spinning'`,'queued wheel starts automatically');await shot('09-roulette-queued');
  await until('!window.pinballPreview.stats().running','both jackpots and wheels drain');
  assert.deepEqual(financial(getWallet()),both);checks.push('top slot auto-spins; another launch queues a second wheel; reload preserves draw, clock and rewards; cosmetics stay hidden until stop');
  assert.equal(getWallet().stars,0);assert.ok(getWallet().last.jackpot);assert.equal(getWallet().unlocked.length,1);const id=getWallet().unlocked[0];assert.equal(getWallet().equipped,id);
  const jackpotTotal=firstTicket.receipt.coins+secondTicket.receipt.coins;
  await until(`document.querySelector('#reward-amount').textContent===${JSON.stringify('+'+jackpotTotal.toLocaleString('en-US'))}`,'jackpot plus wheel rewards');
  assert.equal(await js("document.querySelector('#reward').dataset.tier"),'jackpot');assert.ok(await js("document.querySelector('#reward-prizes').textContent.length>0"));
  const layout=await js("(()=>{const r=document.querySelector('.treasure').getBoundingClientRect();const f=document.querySelector('#fire').getBoundingClientRect();return{bottom:r.bottom,top:r.top,screen:innerHeight,overlap:r.left<f.right&&r.right>f.left&&r.top<f.bottom&&r.bottom>f.top}})()");assert.ok(layout.top>=0&&layout.bottom<layout.screen-134);assert.equal(layout.overlap,false);
  await shot('04-jackpot');checks.push('two-stage rewards reconcile exactly; compact wheel fits without covering chest');await until('window.pinballPreview.stats().wallet.pendingWheels.length===0','finished wheels cleared');
  await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload();});await until("window.pinballPreview?.stats().ready==='true'",'reload');assert.equal(await js('window.pinballPreview.stats().wallet.coins'),getWallet().coins);assert.equal(await js('window.pinballPreview.stats().wallet.equipped'),id);assert.equal(await js('window.pinballPreview.stats().audio.enabled'),false);assert.equal(await js("Number(document.querySelector('#reward').dataset.coins)"),getWallet().last.coins);checks.push('reload preserves wallet, cosmetic, mute preference and last result without settling or replaying reward audio');
  await wait(700);await click('#volley [data-count="3"]');assert.equal(await js('window.pinballPreview.stats().launchCount'),3);
  await js("document.querySelector('#aim').value='13.2';void 0");await click('#fire');assert.equal(getWallet().balls,13);
  await until('window.pinballPreview.stats().activeBalls>=3','three visible balls');assert.equal(getState().rounds[0].result.frames[0].balls.length,3);
  assert.equal(await js("document.querySelector('#volley [data-count=\"5\"]').disabled||document.querySelector('#aim').disabled||document.querySelector('#fire').disabled"),false);
  const three=getState().rounds[0];await shot('05-three-balls');
  await click('#volley [data-count="5"]');await js("document.querySelector('#aim').value='75';document.querySelector('#aim').dispatchEvent(new Event('input'));void 0");await click('#fire');assert.equal(getWallet().balls,8);
  await until('window.pinballPreview.stats().activeBalls>=8','old three balls plus new five balls');assert.equal(getState().rounds.length,2);assert.deepEqual(getState().rounds[0],three);
  assert.ok(getState().rounds[1].result.frames[0].balls.every(b=>b.x>900));await shot('06-continuous-launch');const launched=getWallet(),activeIds=getState().rounds.map(r=>r.result.id);
  checks.push('aim and 1/3/5 selectors stay enabled in flight; a second batch adds five without replacing the existing three');
  await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload();});
  await until("window.pinballPreview?.stats().ready==='true'",'reload during volley');assert.equal(await js('window.pinballPreview.stats().launchCount'),5);assert.deepEqual(getWallet(),launched);
  assert.deepEqual(await js('window.pinballPreview.stats().roundIds'),activeIds);
  await click('#volley [data-count="1"]');await click('#fire');assert.equal(getWallet().balls,7);const afterReload=financial(getWallet());
  await until('!window.pinballPreview.stats().running','all concurrent batches drain');assert.deepEqual(financial(getWallet()),afterReload);checks.push('reload restores every active trajectory and permits another launch without replaying previous debits or payouts');
  await wait(700);const funded=getWallet();save({...funded,balls:2,refillAt:Date.now()});win.webContents.send('pinball:state',getState());
  await until("!document.querySelector('#fire').disabled&&document.querySelector('#volley [data-count=\"3\"]').disabled&&document.querySelector('#volley [data-count=\"5\"]').disabled",'insufficient batch controls');
  const short=getWallet();assert.match(await js("window.pinball.launch(200,3).then(()=>'',e=>e.message)"),/弹珠不足/);
  for(const value of ['0','2','6','1.5','null','"5"'])assert.match(await js(`window.pinball.launch(200,${value}).then(()=>'',e=>e.message)`),/Invalid launch/);
  assert.deepEqual(getWallet(),short);await click('#volley [data-count="1"]');assert.equal(await js("document.querySelector('#fire').disabled"),false);
  checks.push('low balance disables unavailable counts; main IPC rejects insufficient or malformed batches without mutation');
  const burst=await js("Promise.allSettled([window.pinball.launch(1080,1),window.pinball.launch(1100,1),window.pinball.launch(1120,1)]).then(results=>results.map(r=>r.status))");
  assert.equal(burst.filter(s=>s==='fulfilled').length,2);assert.equal(burst.filter(s=>s==='rejected').length,1);assert.equal(getWallet().balls,0);
  await until('window.pinballPreview.stats().activeRounds===2','last two balls remain visible at zero inventory');assert.equal(await js("document.querySelector('#fire').disabled"),true);
  const empty=financial(getWallet());await until('!window.pinballPreview.stats().running','last two shots drain');assert.deepEqual(financial(getWallet()),empty);checks.push('rapid concurrent requests spend only the remaining balance and let launched balls finish after inventory reaches zero');
  await until("!document.querySelector('#test-wheel').disabled",'real roulette reveal hold completes before preview');
  await until("document.querySelector('#reward-amount').textContent==='+'+Number(document.querySelector('#reward').dataset.coins).toLocaleString('en-US')",'real reward count-up completes before preview');
  const beforePreview=JSON.stringify(getWallet()),savedBeforePreview=fs.readFileSync(path.join(profile,'wallet.json'),'utf8'),rewardBeforePreview=await js("document.querySelector('#reward').textContent");
  await click('#edit');await click('#test-wheel');await until("window.pinballPreview.stats().wheel.phase==='spinning'",'test wheel starts at zero inventory');assert.equal(await js('window.pinballPreview.stats().editing'),false);assert.equal(await js("document.querySelector('#wheel-result').textContent"),'测试');await shot('10-test-wheel');
  const previewId=await js('window.pinballPreview.stats().wheel.id');await click('#test-wheel');await until(`window.pinballPreview.stats().wheel.id!==${JSON.stringify(previewId)}`,'test wheel can restart');
  await until("window.pinballPreview.stats().wheel.phase==='revealed'",'test wheel reveals itself');assert.ok((await js("document.querySelector('#wheel-result').textContent")).startsWith('测试 · '));await shot('11-test-wheel-result');
  await until("window.pinballPreview.stats().wheel.phase==='idle'",'test wheel finishes');assert.equal(JSON.stringify(getWallet()),beforePreview);assert.equal(fs.readFileSync(path.join(profile,'wallet.json'),'utf8'),savedBeforePreview);assert.equal(await js("document.querySelector('#reward').textContent"),rewardBeforePreview);checks.push('zero-cost test wheel exits editing, spins, restarts and reveals without touching wallet, save or real result');
  const saved=JSON.parse(fs.readFileSync(path.join(profile,'wallet.json'),'utf8'));assert.equal(saved.balls,0);assert.equal(saved.rounds,9);assert.ok(Object.keys(saved.overrides).length===1);
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  resizeDisplay(640,700);await until('innerWidth===640&&matchMedia("(prefers-reduced-motion: reduce)").matches','narrow reduced motion');
  save({...getWallet(),balls:1,refillAt:Date.now()});win.webContents.send('pinball:state',getState());
  await until('!document.querySelector("#fire").disabled','fund isolated reduced-motion shot');
  const reducedBefore=financial(getWallet());await js("document.querySelector('#aim').value='80';void 0");await click('#fire');
  assert.equal(getWallet().balls,0);await until('!window.pinballPreview.stats().running','reduced motion still settles');
  assert.equal(getWallet().rounds,reducedBefore.rounds+1);assert.ok(getWallet().coins>reducedBefore.coins);
  assert.equal(await js("document.querySelectorAll('.chest-lid').length===1&&document.querySelector('.chest-lid').getAnimations().length===0"),true);
  assert.equal(await js("(()=>{const r=document.querySelector('#launcher').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<innerHeight-134;})()"),true);
  await shot('12-narrow-reduced-motion');checks.push('640px desktop: chest stays on screen; reduced motion removes lid animation and preserves real payout');
  win.webContents.debugger.detach();
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks,profile,wallet:getWallet()},null,2));console.log('PASS desktop pinball UI: '+checks.length+' checks');app.quit();
 }catch(e){console.error(e);await shot('failure');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:false,error:e.stack,checks},null,2));app.exit(1);}
};
