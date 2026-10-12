const {build}=require('esbuild'),{spawn}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'app/out/main/garden-hybrid-test.cjs');
build({entryPoints:[path.join(root,'app/test/fixtures/garden-hybrid-main.cjs')],bundle:true,platform:'node',format:'cjs',outfile:output,external:['electron'],logLevel:'warning'}).then(()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(require('electron'),[output],{cwd:root,windowsHide:true,stdio:'inherit',env});child.on('exit',code=>process.exit(code||0));
}).catch(e=>{console.error(e);process.exitCode=1;});
