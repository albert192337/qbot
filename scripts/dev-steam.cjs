// Explicit SpaceWar development mode. Existing QBOT_USER_DATA/ROOMS_URL overrides are respected.
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = { ...process.env, QBOT_STEAM_APP_ID: process.env.QBOT_STEAM_APP_ID || '480' };
if (env.QBOT_STEAM_APP_ID === '480') env.QBOT_STEAM_DEMO = '1';
delete env.ELECTRON_RUN_AS_NODE;
console.log(env.QBOT_STEAM_APP_ID === '480'
  ? 'Steam SpaceWar 开发测试（AppID 480）：读取真实好友；仅在点击邀请时发送。右键桌宠 → 一起玩。'
  : `Steam 开发启动，AppID ${env.QBOT_STEAM_APP_ID}`);
const child = spawn(process.execPath, [path.join(root, 'node_modules/electron-vite/bin/electron-vite.js'), 'dev'], {
  cwd: path.join(root, 'app'), env, stdio: 'inherit', windowsHide: true,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
