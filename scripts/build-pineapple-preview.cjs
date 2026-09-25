const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{const root=path.resolve(__dirname,'..');const {build}=await import(pathToFileURL(require.resolve('vite',{paths:[path.join(root,'app')]})).href);await build({configFile:false,root:path.join(root,'app/src/renderer'),base:'./',build:{outDir:path.join(root,'output/pineapple-lab'),emptyOutDir:true,rollupOptions:{input:path.join(root,'app/src/renderer/pineapple-preview/index.html')}}});})().catch(e=>{console.error(e);process.exitCode=1;});
