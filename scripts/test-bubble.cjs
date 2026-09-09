// 原生 Electron 气泡烟测：使用已构建页面与真实 preload，不调用生成 API。
const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, '.superpowers/bubble-qa-data'));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  let idleSeconds = 60;
  ipcMain.handle('bubble:idleSeconds', () => idleSeconds);
  const win = new BrowserWindow({
    width: 340, height: 500, show: false, frame: false,
    webPreferences: { preload: path.join(root, 'app/out/preload/index.js'), backgroundThrottling: false },
  });
  try {
    await win.loadFile(path.join(root, 'app/out/renderer/bubble/index.html'));
    win.webContents.send('bubble:anchor', 'above', 130);
    win.webContents.send('behavior:say', { text: '听歌的中午好舒服', durationMs: 20_000 });
    await wait(500);
    const read = () => win.webContents.executeJavaScript(`(() => {
      const el = document.querySelector('.bubble.show');
      return { text: el?.querySelector('.text')?.textContent, opacity: el && getComputedStyle(el).opacity,
        below: document.body.classList.contains('below'), count: document.querySelectorAll('.bubble').length };
    })()`);
    assert.deepEqual(await read(), { text: '听歌的中午好舒服', opacity: '1', below: false, count: 1 });
    assert.equal(await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.bubble')).borderLeftWidth`), '2px');
    assert.equal(await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.bubble .src')).display`), 'none');
    assert.ok(await win.webContents.executeJavaScript(`document.querySelector('.bubble').getBoundingClientRect().bottom <= 131`));
    win.webContents.send('bubble:anchor', 'above', 0);
    await wait(100);
    assert.ok(await win.webContents.executeJavaScript(`document.querySelector('.bubble').getBoundingClientRect().top >= 0`));
    win.webContents.send('bubble:anchor', 'above', 130);
    await wait(250);
    await fs.mkdir(path.join(root, '.superpowers/bubble-preview'), { recursive: true });
    const shot = await win.webContents.capturePage();
    await fs.writeFile(path.join(root, '.superpowers/bubble-preview/say.png'), shot.toPNG());
    await wait(21_000);
    assert.equal((await read()).text, '听歌的中午好舒服');
    idleSeconds = 0;
    await wait(11_000);
    assert.equal((await read()).text, '听歌的中午好舒服');
    win.webContents.send('behavior:say', { text: '再次点击也会回应', durationMs: 20_000 });
    await wait(10_000);
    assert.equal((await read()).text, '再次点击也会回应');
    assert.equal((await read()).count, 1);
    await wait(11_500);
    assert.equal((await read()).count, 0);
    console.log('PASS: native bubble renders, remains beyond 10s, repeated message renews 20s, then expires.');
    await fs.writeFile(path.join(root, '.superpowers/bubble-preview/result.json'), JSON.stringify({ ok: true, checks: ['render', 'anchor', 'retained-while-away', 'read-after-return', 'repeat-renews-20s', 'expire'] }));
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
