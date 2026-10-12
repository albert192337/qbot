const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/garden-style-lab');fs.mkdirSync(out,{recursive:true});
const verify=process.argv.includes('--verify'),log=fs.openSync(path.join(out,verify?'verify.log':'preview.log'),'a');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(require('electron'),[path.join(__dirname,'garden-style-lab-main.cjs'),...process.argv.slice(2)],{cwd:root,windowsHide:true,detached:!verify,stdio:verify?'inherit':['ignore',log,log],env});
child.on('error',e=>{console.error(e);process.exitCode=1});
if(verify)child.on('exit',code=>process.exit(code||0));else child.unref();
