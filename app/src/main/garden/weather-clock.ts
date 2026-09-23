import {app} from 'electron';
import {gardenWeather} from '../../shared/garden-weather';
import {showScheduledWeather,clearScheduledWeather} from '../weather';
import {getGarden} from './service';
import {hourlyWeather} from '../../shared/garden-v3';
import type {GardenState} from '../../shared/garden';
let started=false;
/** Calendar owns mutations; visual preview never affects the calendar or rolls. */
export function startGardenWeatherClock():void{
 if(started)return;started=true;
 let seen:string|undefined,busy=false,lastSettlement=0,state:GardenState|undefined;
 const tick=async()=>{
  if(busy)return;busy=true;
  try{
   const now=Date.now(),status=gardenWeather(now);
   if(now-lastSettlement>=60000){state=await getGarden();lastSettlement=now;}
   const hour=Math.floor(now/3600000),kind=state?.v3?hourlyWeather(hour,state.v3.realm??'garden'):status.current?.kind;
   const id=state?.v3?`v3:${state.v3.realm??'garden'}:${hour}`:status.current?.id??'clear';
   if(id!==seen){
    seen=id;
    if(process.platform==='win32'){
     if(kind==='meteor'||kind==='aurora')await showScheduledWeather(kind,state?.v3?(hour+1)*3600000:status.current!.end);
     else await clearScheduledWeather();
    }
   }
  }catch(error){console.warn('[garden-weather]',error);}finally{busy=false;}
 };
 const timer=setInterval(()=>void tick(),15000);timer.unref();
 app.once('before-quit',()=>clearInterval(timer));void tick();
}
