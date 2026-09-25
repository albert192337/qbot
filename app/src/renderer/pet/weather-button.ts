import './weather-button.css';
import {weatherIcon,weatherName} from '../weather-ui';
import {weatherCountdown} from '../../shared/garden-weather';
import type {GardenApi} from '../../shared/garden';
export function attachWeatherButton(root:HTMLElement,api:GardenApi):()=>void{
 const b=document.createElement('button');b.className='hud-chat hud-weather';b.title='查看天气';b.setAttribute('aria-label','查看天气');b.innerHTML=weatherIcon(null);root.append(b);
 b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',e=>{e.stopPropagation();api.open('weather');});
 let stopped=false,busy=false;
 const update=async()=>{
  if(stopped||busy||typeof api.weather!=='function')return;busy=true;
  try{const s=await api.weather();if(stopped)return;const kind=s.preview??s.test?.kind??s.hourly?.current.kind??s.current?.kind??null,next=s.hourly?.next??s.next;
   b.innerHTML=weatherIcon(kind);b.dataset.weather=kind??'clear';b.classList.toggle('weather-special',!!kind&&kind!=='sunny');
   b.title=`${weatherName(kind)}${s.test?' · 测试天气（真实生效）':''}\n下场${weatherName(next.kind)}还有 ${weatherCountdown(next.start-s.now)}`;b.setAttribute('aria-label',b.title);
  }catch{b.title='天气暂时无法读取，点击重试';}finally{busy=false;}
 };
 const timer=setInterval(()=>void update(),5000);void update();
 return ()=>{stopped=true;clearInterval(timer);};
}
