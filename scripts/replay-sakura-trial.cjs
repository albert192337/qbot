// Rebuild from existing approved image files. Never invokes a paid image API.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'output/spine-lab');
const out='sakura-replay-'+new Date().toISOString().replace(/[:.]/g,'-');
const env={...process.env,SPINE_LAB_URL:'http://127.0.0.1:24361/?skin=sakura&expressions=1',SPINE_LAB_CAPTURE:out+'/runtime',SPINE_EXPRESSION_CAPTURE:out+'/expressions'};
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw Error(cmd+' failed: '+r.status);}
fs.mkdirSync(path.join(dir,out),{recursive:true});
fs.copyFileSync(path.join(dir,'sakura.json'),path.join(dir,out,'before.json'));
run('python',['scripts/prepare-sakura-trial.py']);
run('python',['scripts/spine-lab-hood.py','output/spine-lab/sakura-parts.png','sakura']);
run(process.execPath,['scripts/calibrate-naruto-mesh.cjs','sakura']);
run(process.execPath,['scripts/rig-spine-landmarks.cjs','sakura']);
run(process.execPath,['--test','scripts/test-spine-anatomy-check.cjs']);
run(process.execPath,['scripts/check-spine-anatomy-render.cjs','sakura',path.join(dir,out,'anatomy')]);
run(process.execPath,['scripts/check-spine-lab.cjs']);
run(process.execPath,['scripts/test-spine-expressions.cjs']);
// A new rendering never inherits a visual approval from an earlier build.
console.log('Evidence: '+path.join(dir,out)+'; visual review required before release.');
