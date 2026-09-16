import { spawn } from 'node:child_process';
import type { Rectangle } from 'electron';
import { WEATHER_FADE_MS } from '../shared/weather';
import { WEATHER_NATIVE_SOURCE } from './weather-native-source';

export interface NativeWeatherHost {
  show(file: string | null): Promise<void>;
  dispose(): void;
  handle: string;
}

export function startNativeWeather(bounds: Rectangle, directory: string, onLost: () => void, preview = false): Promise<NativeWeatherHost> {
  if (![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isSafeInteger)) return Promise.reject(new Error('Invalid screen bounds'));
  const script = `$ErrorActionPreference='Stop'\n$ProgressPreference='SilentlyContinue'\n[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)\n` +
    `Add-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing -TypeDefinition @'\n${WEATHER_NATIVE_SOURCE}\n'@\n` +
    `[WeatherNative]::Run(${process.pid},${bounds.x},${bounds.y},${bounds.width},${bounds.height},[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(directory).toString('base64')}')),$${preview},${WEATHER_FADE_MS})`;
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile','-NoLogo','-NonInteractive','-STA','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')], {
      windowsHide: true, stdio: ['pipe','pipe','pipe'],
    });
    let disposed=false, ready=false, buffer='', errors='', id=0;
    const pending = new Map<number,{resolve():void;reject(error:Error):void;timer:ReturnType<typeof setTimeout>}>();
    const rejectPending = (error: Error) => { for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear(); };
    const dispose=()=>{if(disposed)return;disposed=true;clearTimeout(startup);rejectPending(new Error('天气已关闭'));child.stdin.end('quit\n');setTimeout(()=>child.kill(),500).unref();};
    const fail=(error:Error)=>{if(disposed)return;dispose();if(ready)onLost();else reject(error);};
    const startup=setTimeout(()=>fail(new Error('原生天气窗口启动超时')),20000);
    const host: NativeWeatherHost={handle:'0',dispose,show(file){
      if(disposed)return Promise.reject(new Error('天气已关闭'));
      const request=++id;
      return new Promise<void>((res,rej)=>{
        const timer=setTimeout(()=>fail(new Error('天气过渡超时')),15000);
        pending.set(request,{resolve:res,reject:rej,timer});
        child.stdin.write(file?`show|${request}|${Buffer.from(file).toString('base64')}\n`:`hide|${request}\n`);
      });
    }};
    child.stdout.on('data',data=>{
      buffer+=data.toString();let newline;
      while((newline=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,newline).trim();buffer=buffer.slice(newline+1);
        if(!line.startsWith('{'))continue;
        try {
          const message=JSON.parse(line);
          if(message.ready&&!ready&&!disposed){ready=true;clearTimeout(startup);resolve(host);}
          if(message.fatal)fail(new Error(Buffer.from(message.fatal,'base64').toString()));
          if(message.done){const request=pending.get(message.done);if(request){clearTimeout(request.timer);pending.delete(message.done);host.handle=message.handle;console.info('[weather-native]',line);request.resolve();}}
        }catch(error){fail(error instanceof Error?error:new Error(String(error)));}
      }
      if(buffer.length>8192)fail(new Error('天气返回数据过长'));
    });
    child.stderr.on('data',data=>{errors=(errors+data.toString()).slice(-2500);});
    child.stdin.on('error',error=>fail(error));
    child.on('error',fail);
    child.on('exit',()=>fail(new Error(errors||'原生天气窗口已退出')));
  });
}
