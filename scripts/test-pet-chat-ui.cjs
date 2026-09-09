// 真实 Electron renderer / preload 验证，模型与网络使用隔离替身。
const { app, BrowserWindow, ipcMain, session } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, '.superpowers/chat-ui-data'));
const wait = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_r, cb) => cb({ cancel: true }));
    const webPreferences = { preload: path.join(root, 'app/out/preload/index.js'), backgroundThrottling: false };
    const chat = new BrowserWindow({ width: 380, height: 130, show: false, frame: false, webPreferences });
    const bubbles = new BrowserWindow({ width: 340, height: 500, show: false, frame: false, webPreferences });
    ipcMain.handle('bubble:idleSeconds', () => 60);
    let calls = [], fail = false;
    ipcMain.handle('petChat:send', async (_e, text) => {
      calls.push(text); await wait(100);
      if (fail) return { ok: false, error: '测试网络失败' };
      for (const line of ['当然记得你，小刘。', '忙了一天，歇一会儿吧。', '要不要看我跳个新舞？']) bubbles.webContents.send('behavior:say', { source: 'chat', text: line, durationMs: 20000 });
      return { ok: true };
    });
    await chat.loadFile(path.join(root, 'app/out/renderer/chat/index.html'));
    await bubbles.loadFile(path.join(root, 'app/out/renderer/bubble/index.html'));
    chat.showInactive(); bubbles.showInactive();
    const key = event => chat.webContents.executeJavaScript(`document.querySelector('#message').dispatchEvent(new KeyboardEvent('keydown', ${JSON.stringify(event)}))`);
    await chat.webContents.executeJavaScript(`document.querySelector('#message').value='你好，记得我吗？'`);
    await key({ key: 'Enter', isComposing: true, bubbles: true });
    await key({ key: 'Enter', shiftKey: true, bubbles: true });
    assert.equal(calls.length, 0, '中文输入确认与换行不能发送');
    await key({ key: 'Enter', bubbles: true });
    await key({ key: 'Enter', bubbles: true });
    await wait(500);
    assert.deepEqual(calls, ['你好，记得我吗？']);
    const count = () => bubbles.webContents.executeJavaScript(`document.querySelectorAll('.bubble').length`);
    assert.equal(await count(), 3);
    bubbles.webContents.send('behavior:say', { source: 'behavior', text: '普通闲聊不能覆盖聊天', durationMs: 20000 });
    await wait(100);
    assert.equal(await count(), 3);
    assert.equal(await bubbles.webContents.executeJavaScript(`document.body.textContent.includes('普通闲聊')`), false);
    const styles = await bubbles.webContents.executeJavaScript(`(()=>{const el=document.querySelector('.bubble');return [getComputedStyle(el).backgroundColor,getComputedStyle(el).borderLeftColor,getComputedStyle(el.querySelector('.text')).fontSize]})()`);
    assert.deepEqual(styles, ['rgb(255, 249, 239)', 'rgb(89, 66, 53)', '15px']);
    await fs.mkdir(path.join(root, '.superpowers/chat-preview'), { recursive: true });
    await chat.webContents.executeJavaScript(`document.querySelector('#message').value='你好呀，阿呱～'`);
    await wait(400);
    await fs.writeFile(path.join(root, '.superpowers/chat-preview/input.png'), (await chat.webContents.capturePage()).toPNG());
    await fs.writeFile(path.join(root, '.superpowers/chat-preview/bubbles.png'), (await bubbles.webContents.capturePage()).toPNG());
    fail = true;
    await key({ key: 'Enter', bubbles: true });
    await wait(300);
    assert.equal(await chat.webContents.executeJavaScript(`document.querySelector('#message').value`), '你好呀，阿呱～');
    assert.equal(await chat.webContents.executeJavaScript(`document.querySelector('#status').textContent`), '测试网络失败');
    console.log('PASS: chat Enter/IME/duplicate-submit/error retention; 3 protected bubbles; new styles.');
    app.exit(0);
  } catch (e) { console.error(e); app.exit(1); }
});
