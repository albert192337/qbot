import { app, BrowserWindow, screen } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WEATHER_PRESETS, type WeatherKind } from '../shared/weather';
import { startNativeWeather } from './weather-native';
import type { WeatherSurface } from './weather-session';

export async function loadWeatherPage(win: BrowserWindow): Promise<void> {
  if(process.env.ELECTRON_RENDERER_URL)await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/weather/index.html`);
  else await win.loadFile(path.join(__dirname,'../renderer/weather/index.html'));
}

/** Rasterize locally in an invisible offscreen renderer before touching the desktop. */
export async function createBitmapWeatherSurface(display: Electron.Display,onLost:()=>void,preview=false): Promise<WeatherSurface> {
  const bounds=preview?{x:160,y:120,width:960,height:640}:display.bounds;
  const raster=new BrowserWindow({width:bounds.width,height:bounds.height,show:false,frame:false,transparent:true,
    webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  let disposed=false,foreground:BrowserWindow|null=null;
  let native:Awaited<ReturnType<typeof startNativeWeather>>|undefined;
  const directory=path.join(app.getPath('userData'),'weather-bitmaps');
  const images=new Map<WeatherKind,string>();
  const stopForeground=()=>{const win=foreground;foreground=null;if(win&&!win.isDestroyed())win.destroy();};
  const dispose=()=>{if(disposed)return;disposed=true;stopForeground();native?.dispose();if(!raster.isDestroyed())raster.destroy();};
  const lose=()=>{dispose();onLost();};
  raster.webContents.on('render-process-gone',lose);
  try {
    await mkdir(directory,{recursive:true});await loadWeatherPage(raster);
    for(const preset of WEATHER_PRESETS){
      await raster.webContents.executeJavaScript(`window.qbotWeather.snapshot(${JSON.stringify(preset.id)})`);
      const image=await raster.webContents.capturePage();
      if(image.isEmpty())throw new Error('天气背景为空');
      const pixels=image.toBitmap();let dark=0;
      for(let i=0;i<pixels.length;i+=4*997){if(pixels[i]+pixels[i+1]+pixels[i+2]<600)dark++;}
      if(dark<10)throw new Error('天气背景渲染异常');
      const file=path.join(directory,`${preset.id}.png`);await writeFile(file,image.toPNG());images.set(preset.id,file);
    }
    raster.destroy();
    if(disposed)throw new Error('天气已取消');
    native=await startNativeWeather(screen.dipToScreenRect(null,bounds),directory,lose,preview);
    if(disposed){native.dispose();throw new Error('天气已取消');}
    return {dispose,async transition(kind){
      if(disposed)throw new Error('天气已关闭');
      stopForeground();
      await native!.show(kind?images.get(kind)!:null);
      if(!kind||disposed||preview)return;
      const win=new BrowserWindow({...bounds,show:false,frame:false,transparent:true,hasShadow:false,focusable:false,
        skipTaskbar:true,resizable:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
      foreground=win;win.setIgnoreMouseEvents(true);win.setAlwaysOnTop(true,'floating');
      win.webContents.on('render-process-gone',()=>{if(foreground===win)stopForeground();});
      await loadWeatherPage(win);
      if(disposed||foreground!==win){if(!win.isDestroyed())win.destroy();return;}
      win.showInactive();
      const deadline=setTimeout(()=>{if(foreground===win)stopForeground();},10000);
      void win.webContents.executeJavaScript(`window.qbotWeather.burst(${JSON.stringify(kind)})`).catch(error=>console.warn('[weather] foreground',error)).finally(()=>{
        clearTimeout(deadline);if(foreground===win)stopForeground();
      });
    }};
  }catch(error){dispose();throw error;}
}
