const { app, BrowserWindow, ipcMain, protocol, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const preset = process.env.QBOT_QA_ASSET_DIR || path.join(root, 'app/resources/presets/mascot');
app.setPath('userData', path.join(root, '.superpowers/pet-interaction-data'));
protocol.registerSchemesAsPrivileged([{ scheme: 'qbot-asset', privileges: { stream: true, supportFetchAPI: true, bypassCSP: true } }]);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_r, cb) => cb({ cancel: true }));
    const manifest = JSON.parse(await fs.readFile(path.join(preset, 'manifest.json'), 'utf8'));
    protocol.handle('qbot-asset', async request => {
      const relative = decodeURIComponent(new URL(request.url).pathname).replace(/^\//, '');
      const file = path.resolve(preset, relative);
      if (!file.startsWith(preset + path.sep)) return new Response(null, { status: 403 });
      return new Response(await fs.readFile(file), { headers: { 'Content-Type': file.endsWith('.webm') ? 'video/webm' : 'image/png' } });
    });
    const handlers = {
      'garden:get': () => ({ plots: [{readyAt:Date.now()-1000}] }),
      'settings:get': () => ({ voiceEnabled: false, talkFrequency: 'quiet' }),
      'progress:get': () => ({ points: 0, boxes: 0, inventory: {}, idleMs: 0, lastTickAt: Date.now() }),
      'characters:getActive': () => ({ dirId: 'mascot', manifest }),
      'agent:getStatus': () => ({ activity: 'idle', sessions: 0 }),
      'meeting:getStatus': () => ({ inMeeting: false }),
      'music:getStatus': () => ({ playing: false }),
    };
    for (const [key, value] of Object.entries(handlers)) ipcMain.handle(key, value);
    let boxProgress={points:10000,boxes:3,boxesOpened:0,inventory:{},idleMs:0};
    ipcMain.handle('progress:openBox',()=>{
      boxProgress={...boxProgress,points:boxProgress.points-500,boxes:boxProgress.boxes-1,boxesOpened:boxProgress.boxesOpened+1};
      return {ok:true,stickerId:'garden-supply',tier:'common',progress:boxProgress,gardenItems:[{kind:'seed',id:'strawberry',name:'草莓',count:1}]};
    });
    const events = [], speech = [], moves = [], visits = [];
    let chatOpens = 0;
    ipcMain.on('petChat:open', () => chatOpens++);
    ipcMain.on('perception:report', (_e, kind) => events.push(kind));
    ipcMain.on('bubble:say', (_e, msg) => speech.push(msg));
    ipcMain.on('pet:move', (_e, x, y) => moves.push([x, y]));
    ipcMain.handle('pet:setVisitMode', (_e, mode) => visits.push(mode));
    const win = new BrowserWindow({ width: 360, height: 360, show: false, webPreferences: { preload: path.join(root, 'app/out/preload/index.js'), backgroundThrottling: false, offscreen: true } });
    await win.loadFile(path.join(root, 'app/out/renderer/pet/index.html'));
    await win.webContents.executeJavaScript(`window.pointerLog=[];for(const type of ['pointerdown','pointermove','pointerup','lostpointercapture'])document.addEventListener(type,e=>window.pointerLog.push({type,id:e.pointerId,primary:e.isPrimary,x:e.screenX,y:e.screenY,clientX:e.clientX,clientY:e.clientY}),true);`);
    const read = () => win.webContents.executeJavaScript(`(() => {const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible');return {src:v?.src,time:v?.currentTime};})()`);
    for (let i = 0; i < 100 && !(await read()).src; i++) await wait(100);
    assert.ok((await read()).src?.includes('idle.webm'));
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.hud-garden').classList.contains('garden-ready')`), true);
    assert.equal(await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.hud-garden'),'::after').content`), '"✦"');
    win.webContents.send('garden:performance', 'talk_happy');
    for (let i=0;i<80 && !(await read()).src?.includes('talk_happy.webm');i++) await wait(100);
    assert.ok((await read()).src?.includes('talk_happy.webm'), 'garden performance plays an available action');
    assert.equal(await win.webContents.executeJavaScript(`document.body.classList.contains('garden-performing')`),true);
    const gardenTime=(await read()).time; await wait(300); assert.notEqual((await read()).time,gardenTime);
    win.webContents.send('garden:performance',null);await wait(300);
    assert.equal(await win.webContents.executeJavaScript(`document.body.classList.contains('garden-performing')`),false);
    await win.webContents.executeJavaScript(`document.querySelector('.hud-chat').click()`);
    await wait(50);
    assert.equal(chatOpens, 1, '积分左侧聊天按钮打开输入框');
    win.webContents.send('progress:changed',boxProgress);await wait(100);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelectorAll('.chest-dots .unopened').length`),3);
    await win.webContents.executeJavaScript(`document.querySelector('.hud-chest').click()`);await wait(100);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.hud-chest').classList.contains('opening')`),true);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelectorAll('.chest-dots .opened').length`),1);
    for(let i=0;i<2;i++){await win.webContents.executeJavaScript(`document.querySelector('.hud-chest').click()`);await wait(100);}
    await wait(900);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.hud-chest').hidden`),true);
    win.webContents.send('progress:changed',{...boxProgress,boxes:1,points:boxProgress.points+500});await wait(100);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelectorAll('.chest-dots i').length`),0);
    win.webContents.send('progress:changed',boxProgress);await wait(100);
    assert.equal(await win.webContents.executeJavaScript(`(()=>{const p=document.querySelector('.hud-pill').getBoundingClientRect(),g=document.querySelector('.hud-garden').getBoundingClientRect();return g.left>p.right&&g.left-p.right<30})()`),true);
    const mouse = (type, x, y) => win.webContents.sendInputEvent({ type, x, y, globalX: x + 100, globalY: y + 100, button: 'left', clickCount: 1 });
    mouse('mouseDown', 180, 180); mouse('mouseUp', 180, 180);
    await wait(350);
    assert.equal(events.includes('click'), false);
    assert.equal(speech.length, 0);
    mouse('mouseDown', 180, 180);
    mouse('mouseMove', 220, 210);
    for (let i = 0; i < 80 && !(await read()).src?.includes('drag.webm'); i++) await wait(100);
    if (!(await read()).src?.includes('drag.webm')) console.log({events,moves,visits,video:await read(),pointer:await win.webContents.executeJavaScript('window.pointerLog')});
    assert.ok((await read()).src?.includes('drag.webm'), '拖动须实际播放 drag 视频');
    const time = (await read()).time;
    await wait(400);
    assert.notEqual((await read()).time, time, 'drag 视频必须推进');
    mouse('mouseUp', 220, 210);
    await wait(500);
    assert.deepEqual(events.slice(-2), ['drag_start', 'drag_end']);
    assert.ok(moves.length > 0);
    assert.deepEqual(visits, [], '普通拖拽不调整串门窗口尺寸');
    win.webContents.send('pet:menuCommand', { type: 'speak' });
    await wait(500);
    assert.equal(speech.length, 1, '旧 Speaker 通过公共气泡通道发言');
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('#bubble').classList.contains('show')`), false);
    await fs.mkdir(path.join(root, '.superpowers/pet-interaction'), { recursive: true });
    await fs.writeFile(path.join(root, '.superpowers/pet-interaction/result.json'), JSON.stringify({ ok: true, events, moves: moves.length, speech: speech.length }));
    console.log('PASS: single click silent, drag animation advances and releases, no resize, unified speech.');
    if (process.env.QBOT_QA_VERIFY_SLEEP === '1') {
      win.webContents.send('behavior:action', { action: 'sleep', loops: 1, preview: true });
      for (let i = 0; i < 80 && !(await read()).src?.includes('sleep.webm'); i++) await wait(100);
      assert.ok((await read()).src?.includes('sleep.webm'));
      const ratio = await win.webContents.executeJavaScript(`(()=>{const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible');const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');ctx.drawImage(v,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let solid=0,visible=0;for(let i=3;i<data.length;i+=4){if(data[i]>32)visible++;if(data[i]>245)solid++;}return solid/visible})()`);
      assert.ok(ratio > 0.9, `睡觉透明度已恢复：${ratio}`);
      const before = (await read()).time;
      await wait(400);
      assert.notEqual((await read()).time, before);
      console.log('PASS: repaired sleep video plays in Chromium with opaque body', ratio);
    }
    let generatedRequests=0;
    ipcMain.handle('behavior:requestThink',(_ev,force)=>{assert.equal(force,true);generatedRequests++;});
    win.webContents.send('settings:changed',{freeMode:true,voiceEnabled:false,talkFrequency:'quiet'});await wait(100);
    const oldSpeech=speech.length;
    mouse('mouseDown',180,180);mouse('mouseUp',180,180);await wait(80);
    mouse('mouseDown',180,180);mouse('mouseUp',180,180);await wait(200);
    assert.equal(generatedRequests,1);assert.equal(speech.length,oldSpeech,'自由模式不发内置台词');
    app.exit(0);
  } catch (e) { console.error(e); app.exit(1); }
});
