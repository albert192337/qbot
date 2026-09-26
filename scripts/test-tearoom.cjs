const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const root = path.resolve(__dirname, '..'), output = path.join(root, 'output/tearoom');
  await fs.mkdir(output, { recursive: true });
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'qbot-tearoom-qa-'));
  const app = await electron.launch({ executablePath: require('../app/node_modules/electron'), args: [path.join(root, 'app/test/fixtures/cozy-main.cjs')], env: { ...process.env, QBOT_TEAROOM: '1', QBOT_QA_DATA: data, QBOT_COZY_REAL_CHARACTERS: process.env.QBOT_COZY_REAL_CHARACTERS || path.join(process.env.APPDATA, '@qbot/app/characters') } });
  try {
    const page = await app.firstWindow(), errors = []; page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(20000);
    await page.waitForSelector('body[data-ready=true]');
    await page.waitForFunction(() => [...document.querySelectorAll('#sources>div')].filter(d => [...d.querySelectorAll('video')].some(v => v.readyState >= 2 && v.currentTime > .2 && v.style.visibility === 'visible')).length === 4);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(output, '01-four-friends.png') });
    const names = await page.locator('#spots small').allTextContents();
    const options = await page.locator('#character option').evaluateAll(os => os.map(o => ({ value: o.value, name: o.textContent })));
    assert.ok(options.filter(o => o.value.startsWith('market-')).length >= 2, 'use real installed marketplace characters');
    await page.locator('#spots button').nth(1).click();
    await page.locator('#size').fill('110'); await page.locator('#offset').fill('5');
    await page.locator('#save').click();
    await page.reload(); await page.waitForSelector('body[data-ready=true]');
    await page.locator('#spots button').nth(1).click();
    assert.equal(await page.locator('#size').inputValue(), '110'); assert.equal(await page.locator('#offset').inputValue(), '5');
    // Switching characters/actions must release the former Player and keep real playback.
    const dog = options.find(o => o.name.includes('小白狗'));
    if (dog) { await page.locator('#spots button').nth(3).click(); await page.locator('#character').selectOption(dog.value); }
    await page.waitForTimeout(2500); await page.screenshot({ path: path.join(output, '02-line-character.png') });
    await page.locator('#spots button').nth(0).click();
    const actions = await page.locator('#action option').evaluateAll(os => os.map(o => o.value));
    if (actions.includes('tea')) { await page.locator('#action').selectOption('tea'); await page.waitForTimeout(2000); await page.screenshot({ path: path.join(output, '03-existing-tea.png') }); }
    await page.locator('#edit').click(); assert.equal(await page.locator('#controls').isVisible(), false);
    await page.screenshot({ path: path.join(output, '04-room-only.png') });
    const photoData = await page.evaluate(() => { try { return document.querySelector('#scene').toDataURL('image/png'); } catch(e) { return String(e); } });
    assert.ok(photoData.startsWith('data:image/png;base64,'), photoData);
    await fs.writeFile(path.join(output, 'tea-room.png'), Buffer.from(photoData.split(',')[1], 'base64'));
    await app.evaluate(({session}, filename) => { global.tearoomDownload = null; session.defaultSession.once('will-download', (_e,item) => { item.setSavePath(filename); item.once('done', (_event,state) => {global.tearoomDownload=state;}); }); }, path.join(output,'exported-photo.png'));
    await page.locator('#photo').click();
    for(let i=0;i<40 && await app.evaluate(() => global.tearoomDownload) === null;i++)await page.waitForTimeout(100);
    assert.equal(await app.evaluate(() => global.tearoomDownload), 'completed');
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(740, 640));
    await page.locator('#edit').click(); await page.screenshot({ path: path.join(output, '05-small.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#character').selectOption(''); await page.waitForTimeout(250);
    assert.equal(await page.locator('#sources>div').nth(0).locator('video').count(), 0);
    // Invalid persisted inputs are clamped and unknown characters remain empty.
    await page.evaluate(() => localStorage.setItem('qbot.tearoom.arrangement.v1', JSON.stringify(Array.from({length:4}, () => ({ id: 'not-installed', action: 'bad', size: 99999, offset: -99999 })))));
    await page.reload(); await page.waitForSelector('body[data-ready=true]');
    assert.equal(await page.locator('#size').inputValue(), '145'); assert.equal(await page.locator('#offset').inputValue(), '-45');
    assert.equal(await page.locator('#character').inputValue(), '');
    assert.equal(await app.evaluate(() => global.cozyQA.writes), 0); assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ passed: true, names, options, errors, checks: ['four simultaneous actual character animations', 'installed marketplace assets', 'action and character switching', 'save/reload', 'photo export', 'small window', 'remove actor releases videos', 'invalid stored inputs', 'no activation or decor writes'] }, null, 2));
    console.log('PASS: tearoom actual marketplace playback, placement, persistence, export and isolated state');
  } finally { await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
