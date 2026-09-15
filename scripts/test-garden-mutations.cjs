// Production Electron renderer + rules. Ephemeral fixture garden; no user saves or network.
const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), ts = require(path.join(root, 'node_modules/typescript'));
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'qbot-mutation-')));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
 try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
    const { initialGarden, transition, value } = require('../app/src/main/garden/rules.ts');
    const { SPECIES } = require('../app/src/shared/garden.ts');
    let n = 0; const rng = { random: () => .99, id: () => `fx-${n++}` };
    let state = initialGarden(Date.now(), rng);
    const combos = [[], ['frost'], ['thunder'], ['rainbow', 'shiny'], ['frost', 'thunder', 'rainbow', 'shiny'], ['frost', 'thunder', 'rainbow', 'shiny', 'twin']];
    combos.forEach((traits, i) => {
        const p = { id: rng.id(), species: 'strawberry', traits, kg: .3, value: 0, bred: false };
        p.value = value(p); state.produce.push(p);
        state.plots[i] = { ...p, id: rng.id(), plantedAt: Date.now() - 1000000, readyAt: Date.now() - 1, fertilizers: [], harvestsLeft: 3, harvestIndex: 0 };
    });
    for (const species of Object.keys(SPECIES).filter(s => s !== 'strawberry')) {
        const p = { id: rng.id(), species, traits: combos[4], kg: 1, value: 0, bred: false }; p.value = value(p); state.produce.push(p);
    }
    ipcMain.handle('garden:get', () => state);
    ipcMain.handle('garden:act', (_, command) => { const r = transition(state, command, Date.now(), rng); state = r.state; return { ok: true, ...r }; });
    ipcMain.on('garden:ignore', () => {});
    const prefs = { preload: path.join(root, 'app/out/preload/index.js'), contextIsolation: true, offscreen: true, backgroundThrottling: false };
    const panel = new BrowserWindow({ width: 860, height: 800, show: false, webPreferences: prefs });
    const strip = new BrowserWindow({ width: 1100, height: 750, show: false, transparent: true, frame: false, webPreferences: prefs });
    const errors = []; for (const w of [panel, strip]) w.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
    await panel.loadFile(path.join(root, 'app/out/renderer/garden/index.html'), { query: { view: 'bag' } });
    await strip.loadFile(path.join(root, 'app/out/renderer/garden/index.html'), { query: { view: 'strip' } });
    strip.webContents.send('garden:anchor', { left: 780, right: 1040, top: 400, bottom: 640, side: 'left' });
    const out = path.join(root, '.superpowers/garden-mutations'); fs.mkdirSync(out, { recursive: true });
    const js = code => panel.webContents.executeJavaScript(code);
    const shot = async (w, name) => {
        await w.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode()))'); await wait(400);
        fs.writeFileSync(path.join(out, name + '.png'), (await w.webContents.capturePage()).toPNG());
    };
    await wait(650);
    assert.equal(await js('document.querySelectorAll(".produce-card").length'), 14);
    const rendering = await js(`(()=>{const a=document.querySelector('.produce-card .art.frost.thunder.rainbow.shiny');return {surfaces:a.querySelectorAll('.mutation-surface').length,arcs:a.querySelectorAll('.arc-core').length,ice:a.querySelectorAll('.particles-ice i').length,mask:getComputedStyle(a.querySelector('.mutation-surface')).maskImage,animation:getComputedStyle(a.querySelector('img')).animationName,particles:a.querySelectorAll('.mutation-particles i').length}})()`);
    assert.equal(rendering.surfaces, 1); assert.equal(rendering.arcs, 3); assert.equal(rendering.ice, 6);
    assert.notEqual(rendering.mask, 'none'); assert.equal(rendering.animation, 'none'); assert.equal(rendering.particles, 18);
    assert.equal(await js('document.querySelectorAll(".produce-card .art.twin .mutation-surface").length'), 2);
    assert.equal(await js('document.querySelector(".produce-card .art").querySelectorAll(".mutation-surface,.mutation-particles,.thunder-arcs").length'), 0);
    await shot(panel, 'combinations'); await shot(strip, 'desktop-plants');
    assert.ok(await strip.webContents.executeJavaScript(`(()=>{const a=document.querySelector('.art.thunder'),fx=a.querySelector('.thunder-arcs');return fx.getBoundingClientRect().height<=a.clientWidth*1.26})()`), 'ambient effects fit the actual sprite instead of empty layout height');
    await js(`(()=>{const c=[...document.querySelectorAll('.produce-card')].find(c=>c.textContent.includes('向日葵'));c.scrollIntoView({block:'center'})})()`);
    await shot(panel, 'png-and-svg');
    // Exercise a real harvest response and ensure the card uses the persisted traits and amount.
    const original = structuredClone(state.plots[4]);
    await strip.webContents.executeJavaScript('document.querySelectorAll("[data-plot] .art")[4].click()'); await wait(750);
    const reveal = await strip.webContents.executeJavaScript('document.querySelector(".result-card").textContent');
    assert.ok(reveal.includes('冰冻') && reveal.includes('雷击') && reveal.includes('4 重变异'));
    assert.equal(state.produce.at(-1).value, original.value); assert.deepEqual(state.produce.at(-1).traits, original.traits);
    await shot(strip, 'harvest');
    panel.setSize(480, 640); await wait(200); await shot(panel, 'narrow');
    assert.ok(await js('document.documentElement.scrollWidth <= innerWidth'));
    // Force reduced motion via Chromium's supported emulation for this isolated test window.
    panel.webContents.debugger.attach('1.3');
    await panel.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await js('getComputedStyle(document.querySelector(".arc")).animationName'), 'none');
    panel.webContents.debugger.detach();
    assert.deepEqual(errors, []);
    console.log('PASS: all 9 species, original/single/stacked/twin effects, bounded particles, persisted harvest reveal, 480px layout, reduced motion. Screenshots:', out);
    app.exit(0);
 } catch (error) { console.error(error); app.exit(1); }
});
