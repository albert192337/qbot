// Isolated review captures; uses simulated assets and never loads the user's save.
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
const { app, BrowserWindow, ipcMain, session } = require('electron');
const core = require(path.join(root, 'rooms/generated/garden-core.cjs'));
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'qbot-figma-')));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_, cb) => cb({ cancel: true }));
    let id = 0;
    const now = Date.now(), rng = { random: () => .5, id: () => `review-${++id}` };
    const state = core.initialGarden(now, rng);
    core.ensureLife(state, now, rng, 'pet'); core.enableV3(state, now); state.coins = 5000;
    state.produce = [{ id: 'review-fruit', species: 'strawberry', traits: ['juicy'], kg: .872, value: 26, bred: false, growthVersion: 3, revealed: true }];
    ipcMain.handle('garden:get', () => state);
    ipcMain.handle('settings:get', () => ({ gardenRenderMode: '2d' }));
    ipcMain.handle('overlays:get', () => ({ revision: 0, winner: null }));
    ipcMain.handle('characters:getActive', () => null);
    const win = new BrowserWindow({ width: 900, height: 800, show: false, webPreferences: { preload: path.join(root, 'app/out/preload/index.js'), offscreen: true, backgroundThrottling: false } });
    const report = [];
    for (const page of ['bag', 'daily', 'shop', 'book']) {
      await win.loadFile(path.join(root, 'app/out/renderer/garden/index.html'), { query: { view: page } });
      await wait(900);
      const check = await win.webContents.executeJavaScript(`({tabs:[...document.querySelectorAll('#app > nav.tabs button')].map(b=>b.textContent),content:!!document.querySelector('.content'),overflow:document.documentElement.scrollWidth>innerWidth})`);
      if (!check.content || check.tabs.includes('我的土地')) throw Error('Navigation capture failed: ' + page);
      fs.writeFileSync(path.join(__dirname, page + '.png'), (await win.webContents.capturePage()).toPNG());
      report.push({ page, ...check });
    }
    fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 2));
    console.log('PASS: four garden review screens captured; removed tab absent.');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
