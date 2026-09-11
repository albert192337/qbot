// Optional local fallback for machines unable to reach ffmpeg-static's GitHub release.
// Download a checksummed npm binary package; never run package install scripts.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
(async()=>{
  const root=path.resolve(__dirname,'../.superpowers/ffmpeg-local');
  await fs.mkdir(root,{recursive:true});
  const get=url=>execFileSync('curl.exe',['--fail','--silent','--show-error','-L','--max-time','120',url],{windowsHide:true,maxBuffer:100*1024*1024});
  const pkg=JSON.parse(get('https://registry.npmjs.org/@ffmpeg-installer/win32-x64/latest').toString());
  if(!pkg.dist.tarball.startsWith('https://registry.npmjs.org/'))throw new Error('Unexpected registry URL');
  const data=get(pkg.dist.tarball);
  const sum=crypto.createHash('sha1').update(data).digest('hex');
  if(sum!==pkg.dist.shasum)throw new Error('package checksum mismatch');
  const archive=path.join(root,'ffmpeg.tgz');await fs.writeFile(archive,data);
  execFileSync('tar.exe',['-xf',archive,'-C',root,'package/ffmpeg.exe'],{windowsHide:true});
  const exe=path.join(root,'package/ffmpeg.exe');
  console.log(execFileSync(exe,['-version'],{windowsHide:true,encoding:'utf8'}).split('\n')[0]);
  console.log(exe);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
