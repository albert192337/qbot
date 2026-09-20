// Read-only real SDK/Electron check; no invitations, rich join state, achievements, or QBot saves.
const { mkdtemp, rm, mkdir } = require('node:fs/promises');
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  const data = await mkdtemp(path.join(os.tmpdir(), 'qbot-steam-smoke-'));
  const output = path.join(root, 'app/out/main/steam-smoke.cjs');
  await mkdir(path.dirname(output), { recursive: true });
  const fixture = `
    import { app, utilityProcess } from 'electron';
    import assert from 'node:assert/strict';
    import path from 'node:path';
    import { SteamBridge } from '${path.join(root, 'app/src/main/steam/bridge').replace(/\\/g, '/')}';
    app.setPath('userData', process.env.QBOT_SMOKE_DATA!);
    let steam: SteamBridge | undefined;
    app.whenReady().then(async () => {
      try {
        let worker: Electron.UtilityProcess;
        const isolation=process.env.QBOT_SMOKE_ISOLATION==='1';
        steam = new SteamBridge({config:{appId:480,demo:true},realm:'0000000000000000',
          spawn:()=>worker=utilityProcess.fork(path.join(__dirname,'steam-worker.js'),[],{stdio:'ignore'}),
          room:()=>null,changed:()=>{},incoming:()=>{},decode:state=>state});
        const data=await steam.refresh();
        if(!isolation){assert.equal(data.phase,'ready',data.reason); assert.match(data.self!.steamId,/^\\d{17}$/);}
        console.log('STEAM_SMOKE '+JSON.stringify({online:data.phase==='ready',friendCount:data.friends.length,appId:480}));
        await new Promise(resolve=>setTimeout(resolve,1000));
        if(isolation){
          const exited=new Promise(resolve=>worker!.on('exit',resolve)); worker!.kill(); await exited;
          assert.equal(steam.snapshot().phase,'unavailable');
          const retry=await steam.refresh();
          console.log('STEAM_ISOLATION '+JSON.stringify({mainSurvived:true,workerResponded:true,online:retry.phase==='ready'}));
        }
        steam.stop(); setTimeout(()=>app.quit(),200);
      } catch(error) { console.error('STEAM_SMOKE_FAILED',String(error)); steam?.stop(); app.exit(1); }
    });`;
  try {
    await require('esbuild').build({entryPoints:[path.join(root,'app/src/main/steam/worker.ts')],outfile:path.join(root,'app/out/main/steam-worker.js'),
      bundle:true,platform:'node',format:'cjs',external:['koffi','steamworks.js/package.json']});
    await require('esbuild').build({ stdin: { contents: fixture, resolveDir: root, loader: 'ts' }, outfile: output,
      bundle: true, platform: 'node', format: 'cjs', external: ['electron', 'koffi', 'steamworks.js', 'steamworks.js/package.json'] });
    const env = { ...process.env, QBOT_SMOKE_DATA: data, QBOT_SMOKE_ISOLATION:process.argv.includes('--isolation-only')?'1':'0' }; delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(require('electron'), [output], { cwd: root, env, stdio: 'inherit' });
    const timeout = setTimeout(() => { console.error('Steam smoke timed out'); child.kill(); }, 45000);
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code)); });
    clearTimeout(timeout); process.exitCode = code === 0 ? 0 : 1;
  } finally { await rm(data, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
