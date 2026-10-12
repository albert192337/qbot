import { weatherIcon, weatherName } from '../weather-ui';
import type { GardenWeatherStatus } from '../../shared/garden-weather';
export function mountPanelWeather(host:HTMLElement):()=>void {
 const b=document.createElement('button');b.className='c-weather';b.type='button';b.setAttribute('aria-label','花园天气');b.onclick=()=>window.qbot.garden.open('weather');host.append(b);
 let status:GardenWeatherStatus|undefined,received=0,stopped=false,fetching=false;
 const draw=()=>{if(!status)return;const now=status.now+Date.now()-received,current=status.test??status.hourly?.current??status.current;
   const active=current&&current.kind!=='sunny'&&current.end>now?current:null;const event=active??status.hourly?.nextSpecial??status.hourly?.next??status.next;if(!event)return;
   const remaining=Math.max(0,Math.ceil(((active?event.end:event.start)-now)/1000));const h=Math.floor(remaining/3600),m=Math.floor(remaining/60)%60,s=remaining%60;
   const clock=h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
   b.innerHTML=weatherIcon(event.kind);const time=document.createElement('small');time.textContent=clock;b.append(time);b.title=`${active?'当前':'下次'}${weatherName(event.kind)} · ${new Date(active?event.end:event.start).toLocaleTimeString()}`;b.setAttribute('aria-label',b.title);b.classList.toggle('active',!!active);
 };
 const refresh=async()=>{if(stopped||fetching)return;fetching=true;try{const s=await window.qbot.garden.weather();if(!stopped){status=s;received=Date.now();draw();}}catch{b.title='天气暂时无法读取';}finally{fetching=false;}};
 const tick=setInterval(draw,1000),poll=setInterval(()=>void refresh(),15000);void refresh();
 return()=>{stopped=true;clearInterval(tick);clearInterval(poll);};
}
