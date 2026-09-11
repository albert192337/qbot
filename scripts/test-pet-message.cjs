// 本地隔离 Electron 验证；禁止网络，不访问真实用户数据。
const { app, BrowserWindow, ipcMain, protocol, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const preset = path.join(root, 'app/resources/presets/mascot');
app.setPath('userData', path.join(root, '.superpowers/message-qa-data'));
protocol.registerSchemesAsPrivileged([{ scheme: 'qbot-asset', privileges: { stream: true, supportFetchAPI: true } }]);
const wait = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_r, cb) => cb({ cancel: true }));
    const manifest = JSON.parse(await fs.readFile(path.join(preset, 'manifest.json'), 'utf8'));
    protocol.handle('qbot-asset', async req => {
      const file = path.resolve(preset, decodeURIComponent(new URL(req.url).pathname).replace(/^\//, ''));
      if (!file.startsWith(preset + path.sep)) return new Response(null, { status: 403 });
      return new Response(await fs.readFile(file), { headers: { 'Content-Type': file.endsWith('.webm') ? 'video/webm' : 'image/png' } });
    });
    const message = { text: '别熬太晚，我等你休息', characterId: 'mascot', expiresAt: Date.now() + 1800000 };
    for (const [key, handler] of Object.entries({
      'garden:get': () => ({ plots: [] }), 'sign:getMessage': () => message,
      'behavior:getIdlePlan': () => null,
      'settings:get': () => ({ voiceEnabled: false, talkFrequency: 'quiet', freeMode: true }),
      'progress:get': () => ({ points: 0, boxes: 0, inventory: {}, idleMs: 0 }),
      'characters:getActive': () => ({ dirId: 'mascot', manifest }),
      'agent:getStatus': () => ({ activity: 'idle', sessions: 0 }),
      'meeting:getStatus': () => ({ inMeeting: false }), 'music:getStatus': () => ({ playing: false }),
    })) ipcMain.handle(key, handler);
    const win = new BrowserWindow({ width: 360, height: 360, frame: false, show: false, transparent: true,
      webPreferences: { preload: path.join(root, 'app/out/preload/index.js'), backgroundThrottling: false, offscreen: true } });
    await win.loadFile(path.join(root, 'app/out/renderer/pet/index.html'));
    const text = () => win.webContents.executeJavaScript(`document.querySelector('#stage .signboard-board')?.textContent`);
    for (let i = 0; i < 60 && await text() !== message.text; i++) await wait(100);
    assert.equal(await text(), message.text, '首次加载从主进程恢复留言');
    const css = await win.webContents.executeJavaScript(`(()=>{const el=document.querySelector('#stage .signboard-board'),s=getComputedStyle(el),r=el.getBoundingClientRect();return {bg:s.backgroundColor,border:s.borderColor,font:s.fontFamily,left:r.left,right:r.right,width:innerWidth}})()`);
    assert.equal(css.bg, 'rgb(255, 249, 239)'); assert.equal(css.border, 'rgb(89, 66, 53)');
    assert.ok(css.font.includes('Microsoft YaHei')); assert.ok(css.left >= 0 && css.right <= css.width);
    await wait(1500);
    await fs.mkdir(path.join(root, '.superpowers/message-preview'), { recursive: true });
    await fs.writeFile(path.join(root, '.superpowers/message-preview/message.png'), (await win.webContents.capturePage()).toPNG());
    win.webContents.send('sign:message', { ...message, text: '这是一条二十四字的留言用来检查完整换行和边界效果' });
    await wait(100);
    assert.equal(await text(), '这是一条二十四字的留言用来检查完整换行和边界效果');
    const fit = await win.webContents.executeJavaScript(`(()=>{const e=document.querySelector('#stage .signboard-board');return e.scrollHeight<=e.clientHeight})()`);
    assert.ok(fit, '24字留言完整显示');
    win.webContents.send('sign:message', { ...message, characterId: 'other' }); await wait(100);
    assert.equal(await text(), '', '不同角色的留言不显示');
    win.webContents.send('sign:message', message); await wait(100);
    // 通过真实 preload 执行用户收牌，主进程随后广播清除。
    ipcMain.once('sign:set', (_e, value) => { if (value === null) win.webContents.send('sign:message', null); });
    win.webContents.send('pet:menuCommand', { type: 'signClear' }); await wait(100);
    assert.equal(await text(), '');
    console.log('留言恢复、样式、换行、角色隔离、收起验证通过');
    win.destroy(); app.quit();
  } catch (error) { console.error(error); app.exit(1); }
});
