// Production renderer with isolated copies of the reported fruit combinations.
const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), c = require('../rooms/generated/garden-core.cjs');
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'qbot-gold-')));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => { try {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
  const now = Date.now(), state = c.initialGarden(now, { random: () => .5, id: () => 'fixture' });
  const fruit = (id, species, traits, kg) => ({ id, species, traits, kg, value: 25, bred: false, growthVersion: 3, revealed: true });
  state.produce = [fruit('wax', 'strawberry', ['juicy', 'wax', 'shiny'], .211), fruit('gold', 'carrot', ['juicy', 'golden', 'shiny', 'plump'], .290), fruit('plain', 'strawberry', [], .2), fruit('weighted', 'strawberry', ['juicy', 'wax', 'shiny', 'large'], .6)];
  state.plots = state.produce.map(p => ({ ...p, plantedAt: now - 100000, readyAt: now - 1, fertilizers: [], harvestsLeft: 1, harvestIndex: 0 }));
  ipcMain.handle('garden:get', () => state);
  ipcMain.handle('overlays:get', () => ({ revision: 0, winner: null }));
  ipcMain.handle('characters:getActive', () => null);
  ipcMain.handle('settings:get', () => ({}));
  ipcMain.on('garden:ignore', () => {});
  const win = new BrowserWindow({ width: 1080, height: 760, show: false, webPreferences: { preload: path.join(root, 'app/out/preload/index.js'), offscreen: true, backgroundThrottling: false } });
  const js = code => win.webContents.executeJavaScript(code);
  const out = path.join(root, 'output/gold-quality'); fs.mkdirSync(out, { recursive: true });
  for (const view of ['bag', 'strip']) {
    await win.loadFile(path.join(root, 'app/out/renderer/garden/index.html'), { query: { view } });
    await wait(800);
    await js('Promise.all([...document.images].map(i=>i.decode()))');
    const selector = view === 'bag' ? '.produce-card > .art' : '[data-plot] > .art';
    const arts = await js(`Array.from(document.querySelectorAll(${JSON.stringify(selector)}), a=>({quality:a.className,gold:a.querySelectorAll('.particles-gold-quality i').length,stars:a.querySelector('.particles-star i')?getComputedStyle(a.querySelector('.particles-star i')).backgroundColor:null,count:a.querySelectorAll('.mutation-particles i').length}))`);
    assert.equal(arts.length, 4);
    assert.equal(arts[0].gold, 0); assert.match(arts[0].quality, /quality-blue/);
    assert.equal(arts[0].stars, 'rgb(231, 247, 255)');
    assert.equal(arts[1].gold, 5); assert.match(arts[1].quality, /quality-gold/);
    assert.equal(arts[2].gold, 0);
    assert.equal(arts[3].gold, 5, 'Weight-based gold also gets quality particles without a golden trait');
    assert.ok(arts.every(a => a.count <= 8));
    fs.writeFileSync(path.join(out, view + '.png'), (await win.webContents.capturePage()).toPNG());
  }
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await js('getComputedStyle(document.querySelector(".particles-gold-quality i")).animationName'), 'none');
  console.log('PASS: wax/shiny vs gold, weight-based quality, bag and desktop, particle budget, reduced motion. ' + out);
  app.exit(0);
} catch (error) { console.error(error); app.exit(1); } });
