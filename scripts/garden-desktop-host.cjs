const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
async function startGardenDesktop(bounds,directory,onClick,onLost){
 if(process.platform!=='win32')throw Error('当前桌面底层小样仅支持 Windows');
 const source=fs.readFileSync(path.join(__dirname,'garden-desktop-host.cs'),'utf8');
 const script="$ErrorActionPreference='Stop'\n$ProgressPreference='SilentlyContinue'\n[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)\nAdd-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing,UIAutomationClient,UIAutomationTypes,WindowsBase -TypeDefinition @'\n"+source+"\n'@\n[GardenDesktopHost]::Run("+[process.pid,bounds.x,bounds.y,bounds.width,bounds.height].join(',')+")\n";
 const file=path.join(directory,'garden-desktop-host.ps1');fs.writeFileSync(file,'\ufeff'+script);
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NoLogo','-NonInteractive','-STA','-ExecutionPolicy','Bypass','-File',file],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let ready=false,closed=false,buffer='',stderr='',pending=false,latest=null,statusWait=null,probeWait=null;let lastFrame=Date.now();
  const host={pid:child.pid,info:null,frames:0,send(image){if(closed||!ready||image.isEmpty())return;if(pending){latest=image;return}pending=true;lastFrame=Date.now();child.stdin.write('frame|'+image.toPNG().toString('base64')+'\n');},status(){return new Promise((res,rej)=>{const waiter=statusWait={res,rej};child.stdin.write('status\n');setTimeout(()=>{if(statusWait===waiter){statusWait=null;rej(Error('Desktop status timeout'))}},2500).unref()})},probe(x,y){return new Promise((res,rej)=>{const waiter=probeWait={res,rej};child.stdin.write(`probe|${Math.round(x)}|${Math.round(y)}\n`);setTimeout(()=>{if(probeWait===waiter){probeWait=null;rej(Error('Desktop probe timeout'))}},2500).unref()})},dispose(){if(closed)return;closed=true;clearTimeout(startup);clearInterval(watchdog);statusWait?.rej(Error('Desktop closed'));probeWait?.rej(Error('Desktop closed'));child.stdin.end('quit\n');setTimeout(()=>child.kill(),800).unref();}};
  const fail=e=>{if(closed)return;host.dispose();if(ready)onLost(e);else reject(e)};
  const startup=setTimeout(()=>fail(Error('桌面花园启动超时')),25000);
  const watchdog=setInterval(()=>{if(pending&&Date.now()-lastFrame>8000)fail(Error('桌面花园绘制超时'))},2000);
  child.stdout.on('data',b=>{buffer+=b.toString();let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);if(!line.startsWith('{'))continue;try{const m=JSON.parse(line);if(m.ready){ready=true;host.info=m;clearTimeout(startup);resolve(host)}if(m.frame){host.frames=m.frame;pending=false;if(latest){const n=latest;latest=null;host.send(n)}}if(m.status&&statusWait){const p=statusWait;statusWait=null;p.res(m)}if(m.probe&&probeWait){const p=probeWait;probeWait=null;p.res(m.probe)}if(m.click)onClick(m);if(m.fatal)fail(Error(Buffer.from(m.fatal,'base64').toString()))}catch(e){fail(e)}}});
  child.stderr.on('data',b=>stderr=(stderr+b.toString()).slice(-4000));child.on('error',fail);child.stdin.on('error',fail);child.on('exit',()=>fail(Error(stderr||'原生桌面花园已关闭')));
 });
}
module.exports={startGardenDesktop};
