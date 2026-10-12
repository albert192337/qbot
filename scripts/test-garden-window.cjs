// Isolated production renderer: navigation must never remove the window exit.
const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ts = require('../node_modules/typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, f);
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'qbot-window-controls-')));
app.on('window-all-closed', () => {});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
    const { initialGarden } = require('../app/src/main/garden/rules.ts');
    const state = initialGarden(Date.now(), { random: () => .5, id: () => 'fixture' });
    ipcMain.handle('garden:get', () => state);
    ipcMain.handle('characters:list', () => []);
    ipcMain.handle('settings:get', () => ({ gardenRenderMode: '2d' }));
    ipcMain.handle('overlays:get', () => ({ winner: null }));
    ipcMain.handle('garden:journalStatus', () => ({ enabled: false }));
    for (const width of [540, 360]) {
      const win = new BrowserWindow({ width, height: 560, frame: false, show: false,
        webPreferences: { preload: path.join(root, 'app/out/preload/index.js'), sandbox: false, contextIsolation: true } });
      await win.loadFile(path.join(root, 'app/out/renderer/garden/index.html'), { query: { view: 'friends' } });
      const js = code => win.webContents.executeJavaScript(code);
      await wait(400);
      for (const page of ['friends', 'shop', 'travel', 'moments', 'friends']) {
        win.webContents.send('garden:page', page);
        await wait(150);
        await js('window.scrollTo(0, document.body.scrollHeight)');
        const rect = await js(`(() => { const b=document.querySelector('.garden-window-bar button'),r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b};})()`);
        assert(rect.x >= 0 && rect.y >= 0 && rect.right <= width && rect.bottom <= 560 && rect.hit, `${width} ${page}: close not reachable`);
      }
      // Escape dismisses the top dialog first and leaves the garden open.
      await js(`{const d=document.createElement('dialog');d.textContent='测试弹窗';document.body.append(d);d.showModal();}`);
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
      await wait(100);
      assert(!win.isDestroyed());
      assert.equal(await js(`!!document.querySelector('dialog[open]')`), false);
      const closed = new Promise(resolve => win.once('closed', resolve));
      if (width === 540) {
        const point = await js(`(() => { const r=document.querySelector('.garden-window-bar button').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
        win.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
      } else {
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      }
      await Promise.race([closed, wait(2000).then(() => { throw Error('Window did not close'); })]);
    }
    console.log('PASS: close stays visible across five pages at 540/360px; native click, Escape and dialog priority.');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
