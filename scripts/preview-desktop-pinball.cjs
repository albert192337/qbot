const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url'),{randomUUID}=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'output/desktop-pinball');fs.mkdirSync(out,{recursive:true});
 const {build}=await import(pathToFileURL(require.resolve('vite',{paths:[path.join(root,'app')]})).href);
 await build({configFile:false,root:path.join(root,'app/src/renderer'),base:'./',build:{outDir:path.join(out,'dist'),emptyOutDir:true,rollupOptions:{input:path.join(root,'app/src/renderer/desktop-pinball/index.html')}}});
 const verify=process.argv.includes('--verify'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const log=fs.openSync(path.join(out,'preview.log'),'a');
 const launchToken=randomUUID();
 const child=spawn(require('electron'),[path.join(__dirname,'desktop-pinball-main.cjs'),'--launch-token='+launchToken,...process.argv.slice(2)],{cwd:root,env,windowsHide:true,detached:!verify,stdio:verify?'inherit':['ignore',log,log]});
 child.on('error',e=>{console.error(e);process.exitCode=1;});
 if(verify)child.on('exit',code=>process.exit(code||0));else{
  child.unref();let failure;child.on('exit',code=>{if(code)failure=Error('Desktop pinball exited: '+code);});
  const deadline=Date.now()+25000;
  while(Date.now()<deadline){if(failure)throw failure;try{const status=JSON.parse(fs.readFileSync(path.join(out,'live-status.json'),'utf8'));if(status.ready&&status.visible&&status.launchTokens?.includes(launchToken)){console.log('Desktop pinball visible: '+status.pid);return;}}catch{}await new Promise(resolve=>setTimeout(resolve,150));}
  throw Error('Desktop pinball did not become visible. See output/desktop-pinball/preview.log');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
