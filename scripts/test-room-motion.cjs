const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const out = path.join(root, 'output/room-motion');
  await fs.mkdir(out, { recursive: true });
  const app = await electron.launch({
    executablePath: require('../app/node_modules/electron'),
    args: [path.join(root, 'app/test/fixtures/cozy-main.cjs')],
    env: { ...process.env, QBOT_ONLINE_PREVIEW: '1', QBOT_QA_DATA: await fs.mkdtemp(path.join(os.tmpdir(), 'qbot-motion-')) },
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await app.evaluate(() => { global.cozyQA.win.show(); });
    await page.waitForSelector('body[data-ready=true]');
    await page.waitForFunction(() => [...document.querySelectorAll('#sources video')].some(v => v.readyState >= 2 && v.style.visibility === 'visible'));
    await page.evaluate(() => {
      window.motionSamples = [];
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas.id === 'scene' && args[0] instanceof HTMLVideoElement) {
          const m = this.getTransform();
          window.motionSamples.push({ x: m.e, y: m.f, angle: Math.atan2(m.b, m.a), time: performance.now() });
        }
        return original.apply(this, args);
      };
    });
    const move = () => app.evaluate(async () => {
      const win = global.cozyQA.win, [x, y] = win.getPosition();
      for (let i = 0; i < 35; i++) {
        win.setPosition(x + Math.round(Math.sin(i / 5) * 100), y + Math.round(Math.sin(i / 7) * 20));
        await new Promise(r => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(150);
    const base = await page.evaluate(() => window.motionSamples.at(-1));
    await page.evaluate(() => { window.motionSamples = []; });
    const moving = move();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, 'floating.png') });
    await moving;
    const samples = await page.evaluate(() => window.motionSamples);
    assert.ok(samples.some(s => s.y < base.y - 15), 'real window movement lifts character');
    assert.ok(samples.some(s => Math.abs(s.angle) > .03), 'real window movement tilts character');
    await page.waitForTimeout(2400);
    const settled = await page.evaluate(() => window.motionSamples.at(-1));
    assert.ok(Math.abs(settled.x - base.x) < .1);
    assert.ok(Math.abs(settled.y - base.y) < 1);
    assert.ok(Math.abs(settled.angle) < .001);
    await page.screenshot({ path: path.join(out, 'settled.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.motionSamples = []; });
    await move();
    const reduced = await page.evaluate(() => window.motionSamples);
    assert.ok(reduced.length > 5);
    assert.ok(reduced.every(s => s.angle === 0 && s.x === base.x));
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify({ passed: true, base, settled, samples: samples.length, errors }, null, 2));
    console.log('PASS real Electron room movement, float, tilt, settle, reduced motion');
  } finally { await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
