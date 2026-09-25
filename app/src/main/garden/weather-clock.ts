import {app} from 'electron';
import {gardenWeatherStatus} from '../../shared/garden-weather-status';
import {showScheduledWeather,clearScheduledWeather} from '../weather';
import {getGarden} from './service';
import {desktopQuiet,onDesktopVisibilityChanged} from '../desktop-visibility';
import type {GardenState} from '../../shared/garden';
let started=false;
/** Calendar owns mutations; visual preview never affects the calendar or rolls. */
export function startGardenWeatherClock():void{
 if(started)return;started=true;
 let seen:string|undefined,busy=false,lastSettlement=0,state:GardenState|undefined;
 const tick=async()=>{
  if(busy)return;busy=true;
  try{
   const now=Date.now();
   if(now-lastSettlement>=60000){state=await getGarden();lastSettlement=now;}
   const status=gardenWeatherStatus(state??{},now),event=status.hourly?.current??status.current;
   const kind=event?.kind,id=event?.id??'clear';
   if(desktopQuiet())return;
   if(id!==seen){
    if(process.platform==='win32'){
     if(kind==='meteor'||kind==='aurora')await showScheduledWeather(kind,event!.end);
     else await clearScheduledWeather();
    }
    seen=id;
   }
  }catch(error){console.warn('[garden-weather]',error);}finally{busy=false;}
 };
 const timer=setInterval(()=>void tick(),15000);timer.unref();
 const unsubscribe=onDesktopVisibilityChanged(()=>{if(!desktopQuiet()){seen=undefined;void tick();}});
 app.once('before-quit',()=>{clearInterval(timer);unsubscribe();});void tick();
}
