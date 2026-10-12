const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const appRequire=require('node:module').createRequire(require.resolve('../app/package.json'));
const {build}=require('node:module').createRequire(appRequire.resolve('vite'))('esbuild');
const root=path.resolve(__dirname,'..'),outfile=path.join(root,'app/out/main/visibility-qa.cjs');
// Suppress only the scheduled native wallpaper test, which are outside this isolated UI run.
(async()=>{await build({entryPoints:[path.join(root,'app/test/fixtures/desktop-visibility-main.ts')],outfile,bundle:true,platform:'node',format:'cjs',external:['electron','ffmpeg-static','koffi'],plugins:[{name:'isolated-weather',setup(b){b.onResolve({filter:/weather-clock$/},()=>({path:path.join(root,'app/test/fixtures/visibility-weather-stub.ts')}));}}]});
const data=fs.mkdtempSync(path.join(os.tmpdir(),'qbot-visibility-'));
const env={...process.env,QBOT_QA_ROOT:root,QBOT_QA_DATA:data,QBOT_QA_ROOM_MENU:process.argv.includes('--room-menu')?'1':'0'};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(appRequire('electron'),[outfile],{cwd:root,env,stdio:'inherit',windowsHide:true});
const timeout=setTimeout(()=>{child.kill();process.exitCode=1;},90000);
child.on('exit',code=>{clearTimeout(timeout);process.exitCode=code??1;});

})().catch(error=>{console.error(error);process.exitCode=1;});
