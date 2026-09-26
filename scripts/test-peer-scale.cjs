// Exercise production window geometry in an isolated Electron process.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const esbuild = require('node:module').createRequire(require.resolve('../app/node_modules/vite'))('esbuild');

(async () => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'qbot-peer-scale-'));
  const outfile = path.join(root, 'app/out/main/peer-scale-qa.cjs');
  await esbuild.build({
    stdin: { resolveDir: root, loader: 'ts', contents: `
      import { app, screen, session } from 'electron';
      import assert from 'node:assert/strict';
      import * as W from './app/src/main/windows';
      import { fixedWindowSize } from './app/src/main/fixed-window';
      import { setWindowPeek, desktopSnapshot } from './app/src/main/desktop-visibility';
      app.setPath('userData', process.env.QBOT_QA_DATA!);
      app.whenReady().then(() => { try {
        session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']}, (_r, cb) => cb({cancel:true}));
        const check = (win, size) => {
          const b = win.getBounds();
          assert.ok(Math.abs(b.width - size) <= 3 && Math.abs(b.height - size) <= 3, JSON.stringify({b,size}));
          assert.equal(win.isResizable(), false);
        };
        W.setPetScale(.75);
        const first = W.ensureRoomPetWindow('test:first');
        check(first, 270);
        const host = W.createPetWindow();
        check(host, 270);
        W.layoutRoomPetWindows(['test:first']);
        const area = screen.getDisplayMatching(first.getBounds()).workArea;
        for (const scale of [1, .5, 1.5, 2, .75, 1]) {
          W.setPetScale(scale);
          check(first, 360 * scale); check(host, 360 * scale);
          assert.deepEqual(fixedWindowSize(first), {width:360*scale,height:360*scale});
          for(let i=0;i<30;i++) W.moveRoomPetWindow(first, area.x+40+i, area.y+40);
          check(first, 360 * scale);
        }
        const second = W.ensureRoomPetWindow('test:second');
        check(second, 360);
        W.layoutRoomPetWindows(['test:first', 'test:second']);
        assert.ok(first.getBounds().x + first.getBounds().width <= second.getBounds().x);
        for (const side of ['left', 'right'] as const) {
          setWindowPeek(first, side);
          W.setPetScale(.5); W.setPetScale(1);
          check(first, 360);
          assert.equal(desktopSnapshot(first).peek, side);
          const b=first.getBounds();
          assert.ok(Math.abs(b.x - (side==='left'?area.x:area.x+area.width-360))<=3);
        }
        W.closeRoomPetWindow('test:second');
        W.setPetScale(.5);
        check(W.ensureRoomPetWindow('test:second'), 180);
        console.log('PASS: native host/peer sizes match; live scale, late arrivals, drag stability, layout, edge peeking and rejoin.');
        app.exit(0);
      } catch(e) { console.error(e); app.exit(1); } });
    ` },
    outfile, bundle: true, platform: 'node', format: 'cjs', external: ['electron', 'ffmpeg-static'],
  });
  const child = spawn(require('../app/node_modules/electron'), [outfile], {
    cwd: root, env: { ...process.env, QBOT_QA_DATA: data }, windowsHide: true, stdio: 'inherit',
  });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  if (code !== 0) throw new Error('Peer scale verification failed: ' + code);
})().catch(error => { console.error(error); process.exitCode = 1; });
