import {app} from 'electron';
import {gardenWeather} from '../../shared/garden-weather';
import {showScheduledWeather,clearScheduledWeather} from '../weather';
import {getGarden} from './service';
let started=false;
/** Calendar owns mutations; visual preview never affects the calendar or rolls. */
export function startGardenWeatherClock():void{
 if(started)return;started=true;
 let seen:string|undefined,busy=false,lastSettlement=0;
 const tick=async()=>{
  if(busy)return;busy=true;
  try{
   const now=Date.now(),status=gardenWeather(now),id=status.current?.id??'clear';
   if(now-lastSettlement>=60000){await getGarden();lastSettlement=now;}
   if(id!==seen){
    seen=id;
    if(process.platform==='win32'){
     if(status.current && (status.current.kind==='meteor'||status.current.kind==='aurora'))await showScheduledWeather(status.current.kind,status.current.end);
     else await clearScheduledWeather();
    }
   }
  }catch(error){console.warn('[garden-weather]',error);}finally{busy=false;}
 };
 const timer=setInterval(()=>void tick(),15000);timer.unref();
 app.once('before-quit',()=>clearInterval(timer));void tick();
}
