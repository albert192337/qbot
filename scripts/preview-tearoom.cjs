// Isolated preview using installed marketplace characters and existing animation.
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const characters = process.env.QBOT_COZY_REAL_CHARACTERS || path.join(process.env.APPDATA, '@qbot/app/characters');
const fs = require('node:fs');
fs.mkdirSync(path.join(root,'output/tearoom'),{recursive:true});
const log = fs.openSync(path.join(root,'output/tearoom/preview.log'),'a');
const child = spawn(require('../app/node_modules/electron'), [path.join(root, 'app/test/fixtures/cozy-main.cjs')], {
  cwd: root, windowsHide: true, stdio: ['ignore',log,log], detached: true,
  env: { ...process.env, QBOT_TEAROOM: '1', QBOT_COZY_SHOW: '1', QBOT_COZY_REAL_CHARACTERS: characters },
});
child.on('error', e => { console.error(e.message); process.exitCode = 1; });
child.unref();
