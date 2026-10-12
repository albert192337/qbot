import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Rectangle, NativeImage } from 'electron';
import { GARDEN_DESKTOP_SOURCE } from './desktop-source';

export interface GardenDesktopHost { send(image:NativeImage):void; dispose():void; frames:number; handle:string; probe(x:number,y:number):Promise<string>; }
export async function startGardenDesktop(bounds:Rectangle,directory:string,onClick:(p:{x:number;y:number;double:boolean})=>void,onLost:(e:Error)=>void):Promise<GardenDesktopHost> {
  if(process.platform!=='win32'||![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isSafeInteger))throw Error('当前桌面不支持草地模式');
  const script="$ErrorActionPreference='Stop'\n$ProgressPreference='SilentlyContinue'\n[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)\nAdd-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing,UIAutomationClient,UIAutomationTypes,WindowsBase -TypeDefinition @'\n"+GARDEN_DESKTOP_SOURCE+"\n'@\n[GardenDesktopHost]::Run("+[process.pid,bounds.x,bounds.y,bounds.width,bounds.height].join(',')+")\n";
  const file=path.join(directory,'garden-desktop-host.ps1');await writeFile(file,'\ufeff'+script);
  return new Promise((resolve,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NoLogo','-NonInteractive','-STA','-ExecutionPolicy','Bypass','-File',file],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let probeWait:{resolve:(kind:string)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|undefined;
    let ready=false,closed=false,buffer='',stderr='',pending=false,latest:NativeImage|null=null,lastFrame=Date.now();
    // Coalesce pending frames before PNG encoding; retain the final still frame for reduced motion.
    const send=(png:Buffer)=>{pending=true;lastFrame=Date.now();child.stdin.write('frame|'+png.toString('base64')+'\n');};
    const host:GardenDesktopHost={frames:0,handle:'0',probe(x,y){return new Promise((resolve,reject)=>{if(closed||probeWait){reject(Error('Desktop probe unavailable'));return;}const timer=setTimeout(()=>{probeWait=undefined;reject(Error('Desktop probe timeout'));},3000);probeWait={resolve,reject,timer};child.stdin.write(`probe|${Math.round(x)}|${Math.round(y)}\n`);});},send(image){if(closed||!ready||image.isEmpty())return;if(pending){latest=image;return;}const source=image.getSize().width>1920?image.resize({width:1920,quality:'good'}):image;send(source.toPNG());},dispose(){if(closed)return;closed=true;if(probeWait){clearTimeout(probeWait.timer);probeWait.reject(Error('Desktop closed'));probeWait=undefined;}latest=null;clearTimeout(startup);clearInterval(watchdog);child.stdin.end('quit\n');setTimeout(()=>child.kill(),800).unref();}};
    const fail=(e:Error)=>{if(closed)return;host.dispose();if(ready)onLost(e);else reject(e);};
    const startup=setTimeout(()=>fail(Error('桌面草地启动超时')),25000);
    const watchdog=setInterval(()=>{if(pending&&Date.now()-lastFrame>8000)fail(Error('桌面草地绘制超时'));},2000);
    child.stdout.on('data',b=>{buffer+=b.toString();let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);if(!line.startsWith('{'))continue;try{const m=JSON.parse(line);if(closed)continue;if(m.ready&&!ready){ready=true;host.handle=m.handle;clearTimeout(startup);resolve(host);}if(m.frame){host.frames=m.frame;pending=false;if(latest){const image=latest;latest=null;host.send(image);}}if(m.probe&&probeWait){clearTimeout(probeWait.timer);probeWait.resolve(m.probe);probeWait=undefined;}if(m.click&&Number.isFinite(m.x)&&Number.isFinite(m.y))onClick({x:m.x,y:m.y,double:m.double===true});if(m.fatal)fail(Error(Buffer.from(m.fatal,'base64').toString()));}catch(e){fail(e instanceof Error?e:Error(String(e)));}}if(buffer.length>8192)fail(Error('桌面草地返回数据无效'));});
    child.stderr.on('data',b=>stderr=(stderr+b.toString()).slice(-4000));child.on('error',fail);child.stdin.on('error',fail);child.on('exit',()=>fail(Error(stderr||'桌面草地已关闭')));
  });
}
