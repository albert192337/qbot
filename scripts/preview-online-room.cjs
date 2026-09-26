const path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/online-room');fs.mkdirSync(out,{recursive:true});
const log=fs.openSync(path.join(out,'preview.log'),'a');
const child=spawn(require('../app/node_modules/electron'),[path.join(root,'app/test/fixtures/cozy-main.cjs')],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',log,log],env:{...process.env,QBOT_ONLINE_PREVIEW:'1',QBOT_COZY_SHOW:'1',QBOT_QA_DATA:path.join(out,'profile'),QBOT_COZY_REAL_CHARACTERS:path.join(process.env.APPDATA,'@qbot/app/characters')}});child.on('error',e=>console.error(e));child.unref();
