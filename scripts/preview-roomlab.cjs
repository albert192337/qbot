const path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'output/roomlab'),{recursive:true});
const log=fs.openSync(path.join(root,'output/roomlab/preview.log'),'a');
const child=spawn(require('../app/node_modules/electron'),[path.join(root,'app/test/fixtures/cozy-main.cjs')],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',log,log],env:{...process.env,QBOT_ROOMLAB:'1',QBOT_COZY_SHOW:'1',QBOT_QA_DATA:path.join(root,'output/roomlab/profile'),QBOT_COZY_REAL_CHARACTERS:process.env.QBOT_COZY_REAL_CHARACTERS||path.join(process.env.APPDATA,'@qbot/app/characters')}});
child.on('error',e=>{console.error(e);process.exitCode=1;});child.unref();
