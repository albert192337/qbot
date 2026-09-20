// Isolated social UI fixture: fake Steam invitations by default; --live reads real Steam friends.
// Uses only fixture saves and a loopback rooms server. No cloud model calls.
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
(async () => {
  const data = await mkdtemp(path.join(os.tmpdir(), 'qbot-steam-preview-'));
  const env = { ...process.env, QBOT_QA_ROOT: root, QBOT_QA_DATA: data, QBOT_STEAM_APP_ID: '480', QBOT_STEAM_DEMO: '1',
    QBOT_QA_STEAM: process.argv.includes('--live') ? 'live' : 'fake' };
  delete env.ELECTRON_RUN_AS_NODE;
  // The existing server logs its configured port; choose a free loopback port before launch.
  const net = require('node:net'); const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const rooms = spawn(process.execPath, [path.join(root, 'rooms/server.mjs')], {
    env: { ...env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: path.join(data, 'server') }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  let child;
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return; cleaned = true;
    await Promise.all([child, rooms].filter(Boolean).map(proc => new Promise(resolve => {
      if (proc.exitCode !== null || proc.signalCode !== null) return resolve();
      proc.once('exit', resolve); proc.kill();
    })));
    await rm(data, { recursive: true, force: true });
  };
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('rooms startup timed out')), 5000);
      rooms.once('error', reject);
      rooms.stdout.on('data', value => { if (String(value).includes('listening')) { clearTimeout(timer); resolve(); } });
    });
    const output = path.join(root, 'app/out/main/steam-preview.cjs');
    await require('esbuild').build({ entryPoints: [path.join(root, 'app/test/fixtures/social-main.ts')], outfile: output,
      bundle: true, platform: 'node', format: 'cjs', external: ['electron', 'ffmpeg-static', 'koffi', 'steamworks.js', 'steamworks.js/package.json'] });
    child = spawn(require('electron'), [output], { cwd: root, env: { ...env, QBOT_ROOMS_URL: `ws://127.0.0.1:${port}` }, stdio: 'inherit' });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void cleanup());
    await new Promise((resolve, reject) => { child.on('exit', resolve); child.on('error', reject); });
  } finally { await cleanup(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
