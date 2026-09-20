// Actual pet/chat/preload plus production thinking/sign controllers; isolated model and storage.
const { app, BrowserWindow, ipcMain, protocol, session, screen } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), ts = require('../node_modules/typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, f);
const mock = (file, exports) => { const id = require.resolve(file); require.cache[id] = { id, filename: id, loaded: true, exports }; };
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'qbot-chat-overlays-')));
protocol.registerSchemesAsPrivileged([{ scheme: 'qbot-asset', privileges: { stream: true, supportFetchAPI: true } }]);
const wait = ms => new Promise(r => setTimeout(r, ms));
// Isolate cursor coordinates too: never fight the user's physical mouse during QA.
let testCursor = { x: -10000, y: -10000 };
const until = async fn => { for (let i = 0; i < 100; i++) { if (await fn()) return; await wait(50); } throw Error('Timed out'); };
app.whenReady().then(async () => { try {
  screen.getCursorScreenPoint = () => testCursor;
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
  const preset = path.join(root, 'app/resources/presets/mascot');
  const manifest = JSON.parse(fs.readFileSync(path.join(preset, 'manifest.json'), 'utf8'));
  protocol.handle('qbot-asset', async request => {
    const file = path.resolve(preset, decodeURIComponent(new URL(request.url).pathname).replace(/^\//, ''));
    if (!file.startsWith(preset + path.sep)) return new Response(null, { status: 403 });
    return new Response(fs.readFileSync(file), { headers: { 'Content-Type': file.endsWith('.webm') ? 'video/webm' : 'image/png' } });
  });
  const preload = path.join(root, 'app/out/preload/index.js');
  const { attachPetWindowLayer } = require('../app/src/main/pet-window-layer.ts');
  const { aboveBubbleLayout } = require('../app/src/main/bubble-layout.ts');
  const { createDesktopSign, desktopSignPosition, SIGN_SIZE, PET_BASELINE } = require('../app/src/main/desktop-sign.ts');
  const area = screen.getPrimaryDisplay().workArea;
  const pet = new BrowserWindow({ x: area.x + 300, y: area.y + 330, width: 250, height: 250, transparent: true, frame: false, show: false, webPreferences: { preload } });
  let bubble = null, sign;
  const chat = new BrowserWindow({ x: area.x + 250, y: area.y + 590, width: 380, height: 110, transparent: true, frame: false, show: false, webPreferences: { preload } });
  const group = () => [pet, sign?.getWindow() ?? null, bubble, chat];
  attachPetWindowLayer(pet, group); attachPetWindowLayer(chat, group, pet);
  sign = createDesktopSign(pet, group, preload, w => w.loadFile(path.join(root, 'app/out/renderer/sign/index.html')),
    () => pet.webContents.send('pet:menuCommand', { type: 'signDismiss' }));
  const showBubbleWindow = () => {
    if (!bubble) {
      bubble = new BrowserWindow({ width: 340, height: 500, transparent: true, frame: false, focusable: false, show: false, webPreferences: { preload } });
      bubble.setIgnoreMouseEvents(true); attachPetWindowLayer(bubble, group, pet);
      bubble.webContents.on('did-finish-load', () => bubble.webContents.send('bubble:anchor', 'above', 330));
      bubble.loadFile(path.join(root, 'app/out/renderer/bubble/index.html'));
    }
    const b = aboveBubbleLayout(pet.getBounds(), area, 340, 500, 42);
    bubble.setPosition(b.x, b.y); bubble.showInactive();
    return bubble;
  };
  mock('../app/src/main/windows.ts', { getPetWindow: () => pet, isRoomOpen: () => false, showBubbleWindow });
  let resolveModel;
  mock('../app/src/main/config.ts', { getSettings: async () => ({ activeCharacter: 'mascot', arkApiKey: 'mock-only' }) });
  mock('../app/src/main/brain-llm.ts', { buildInput: async () => ({ availableIntents: [], actionDescriptions: [] }) });
  mock('../app/src/main/llm-client.ts', { BRAIN_MODEL: 'mock', chatCompleteWithRetry: () => new Promise(r => { resolveModel = r; }) });
  mock('../app/src/main/idle-plan.ts', { applyIdleDecision() {} });
  mock('../app/src/main/user-memory.ts', { queueMemoryExtraction: async () => {} });
  mock('../app/src/main/conversation-memory.ts', { rememberConversation() {}, setChatting() {}, automaticSpeechBudget: () => ({ allowed: true }) });
  mock('../app/src/main/brain-log.ts', { beginBrainCall: async () => 'test', updateBrainCall: async () => {} });
  mock('../app/src/main/behavior-executor.ts', { execute: script => {
    for (const step of script.steps) if (step.op === 'say') bubble.webContents.send('behavior:say', { source: 'chat', text: step.text });
  } });
  const { sendPetChat } = require('../app/src/main/pet-chat.ts');
  const handlers = {
    'garden:get': () => ({ plots: [] }), 'sign:getMessage': () => null, 'pet:getPerch': () => null, 'pet:perch': () => ({}),
    'behavior:getIdlePlan': () => null, 'settings:get': () => ({ voiceEnabled: false, talkFrequency: 'quiet' }),
    'progress:get': () => ({ points: 0, boxes: 0, inventory: {}, idleMs: 0 }),
    'characters:getActive': () => ({ dirId: 'mascot', manifest }), 'agent:getStatus': () => ({ activity: 'idle', sessions: 0 }),
    'meeting:getStatus': () => ({ inMeeting: false }), 'music:getStatus': () => ({ playing: false }),
    'bubble:idleSeconds': () => 60, 'petChat:send': (_, text) => sendPetChat(text), 'pet:setVisitMode': () => {},
  };
  for (const [key, fn] of Object.entries(handlers)) ipcMain.handle(key, fn);
  ipcMain.on('sign:display', (ev, text) => { if (ev.sender === pet.webContents) sign.setText(text); });
  let clearedMessages = 0;
  ipcMain.on('sign:set', (_ev, text) => { if (text === null) { clearedMessages++; pet.webContents.send('sign:message', null); } });
  ipcMain.on('bubble:empty', () => { bubble?.webContents.send('bubble:clear'); bubble?.hide(); });
  await pet.loadFile(path.join(root, 'app/out/renderer/pet/index.html'));
  await chat.loadFile(path.join(root, 'app/out/renderer/chat/index.html'));
  pet.showInactive(); chat.show();
  await until(() => pet.webContents.executeJavaScript(`!!document.querySelector('#stage video')?.currentTime`));
  assert.equal(await pet.webContents.executeJavaScript(`document.querySelector('#stage > .signboard')`), null, 'no board over body');
  assert.equal(bubble, null, 'first request starts without a bubble window');
  await chat.webContents.executeJavaScript(`document.querySelector('#message').value='你好';document.querySelector('#chat-form').requestSubmit()`);
  await until(() => bubble && bubble.webContents.executeJavaScript(`!!document.querySelector('.thinking-bubble')`));
  assert.ok(bubble.isVisible(), 'production request shows lazy-created thinking window');
  await wait(1500);
  assert.equal(await bubble.webContents.executeJavaScript(`!!document.querySelector('.thinking-bubble')`), true, 'remains while model is delayed');
  assert.ok(await bubble.webContents.executeJavaScript(`document.querySelector('.thinking-bubble').getBoundingClientRect().width < 90`), 'compact cloud');
  pet.webContents.send('sign:message', { text: '别熬太晚哦', characterId: 'mascot', expiresAt: Date.now() + 60000 });
  await until(() => sign.getWindow()?.isVisible());
  const side = sign.getWindow();
  assert.equal(side.getParentWindow(), pet);
  assert.ok(side.getBounds().x >= pet.getBounds().x + pet.getBounds().width, 'entire board and post outside body');
  await wait(300);
  const foot = await side.webContents.executeJavaScript(`document.querySelector('.post').getBoundingClientRect().bottom`);
  assert.ok(Math.abs(side.getBounds().y + foot - (pet.getBounds().y + pet.getBounds().height * PET_BASELINE)) <= 2, 'post bottom meets pet ground line');
  assert.equal(await side.webContents.executeJavaScript(`getComputedStyle(document.querySelector('#dismiss')).opacity`), '0', 'close hidden initially');
  let ignoring = true;
  const originalIgnore = side.setIgnoreMouseEvents.bind(side);
  side.setIgnoreMouseEvents = (ignore, options) => { ignoring = ignore; originalIgnore(ignore, options); };
  const center = await side.webContents.executeJavaScript(`(()=>{const r=document.querySelector('#board').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
  testCursor = { x: side.getBounds().x + center.x, y: side.getBounds().y + center.y };
  await until(() => !ignoring); await wait(200);
  assert.equal(ignoring, false, 'hover enables native mouse hit area');
  assert.equal(await side.webContents.executeJavaScript(`getComputedStyle(document.querySelector('#dismiss')).opacity`), '1', 'hover reveals close');
  const out = path.join(root, '.superpowers/chat-preview'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'side-sign.png'), (await side.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(out, 'thinking-native.png'), (await bubble.webContents.capturePage()).toPNG());
  const close = await side.webContents.executeJavaScript(`(()=>{const r=document.querySelector('#dismiss').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
  testCursor = { x: side.getBounds().x + close.x, y: side.getBounds().y + close.y };
  await wait(120);
  side.webContents.sendInputEvent({ type: 'mouseMove', ...close });
  side.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...close });
  side.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...close });
  await until(() => !side.isVisible() && clearedMessages > 0);
  pet.webContents.send('agent:status', { activity: 'idle', sessions: 0 });
  await wait(150); assert.equal(side.isVisible(), false, 'status refresh does not resurrect dismissed sign');
  pet.webContents.send('sign:message', { text: '深夜别熬太久，早点休息哦', characterId: 'mascot', expiresAt: Date.now() + 60000 });
  await until(() => side.isVisible());
  await wait(250);
  assert.ok(await side.webContents.executeJavaScript(`document.querySelector('#text').getBoundingClientRect().height>=40`), 'sentence wraps to short lines');
  assert.equal(await side.webContents.executeJavaScript(`document.querySelector('#text').textContent`), '深夜别熬太久，\n早点休息哦', 'prefer clause boundary instead of splitting 太久');
  fs.writeFileSync(path.join(out, 'wrapped-sign.png'), (await side.webContents.capturePage()).toPNG());
  resolveModel('{"say":["收到啦"]}');
  await until(() => chat.webContents.executeJavaScript(`!document.querySelector('#send').disabled`));
  assert.equal(await bubble.webContents.executeJavaScript(`!!document.querySelector('.thinking-bubble')`), false);
  assert.ok(bubble.isVisible(), 'reply remains visible');
  pet.setPosition(area.x + area.width - 260, area.y + 300); await wait(150);
  assert.ok(side.getBounds().x + side.getBounds().width <= pet.getBounds().x, 'screen right edge uses left side');
  sign.setText('这是一条用于检查长留言的文字'.repeat(5).slice(0, 60)); await wait(150);
  assert.ok(await side.webContents.executeJavaScript(`document.querySelector('#board').getBoundingClientRect().top>=0&&document.querySelector('.post').getBoundingClientRect().bottom<=innerHeight`), '60 characters and post fit');
  sign.setText('你好，'.repeat(20)); await wait(100);
  assert.ok(await side.webContents.executeJavaScript(`document.querySelector('#board').getBoundingClientRect().top>=0`), 'dense punctuation stays within window');
  pet.hide(); await wait(100); assert.equal(side.isVisible(), false);
  pet.showInactive(); await wait(100); assert.equal(side.isVisible(), true);
  sign.setText(null); await wait(100); assert.equal(side.isVisible(), false);
  for (const scale of [.5, 1, 2]) {
    const p = { x: area.x + 50, y: area.y, width: 360 * scale, height: 360 * scale };
    const pos = desktopSignPosition(p, area);
    assert.ok(pos.x >= p.x + p.width || pos.x + SIGN_SIZE.width <= p.x);
  }
  pet.destroy(); assert.equal(side.isDestroyed(), true);
  console.log('PASS: compact thinking, grounded sign, clause wrapping, hover/close native input, dismissal and new message, bounds/edge/long text/hide/close');
  app.exit(0);
} catch (e) { console.error(e); app.exit(1); } });

