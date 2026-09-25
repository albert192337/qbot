import type {GardenWeatherKind} from '../shared/garden-weather';
import {V3_WEATHER,type V3Weather} from '../shared/garden-v3';
export function weatherIcon(kind:GardenWeatherKind|V3Weather|null):string{
 if(kind&&kind!=='meteor'&&kind!=='aurora')return `<span class="weather-symbol" aria-hidden="true">${V3_WEATHER[kind].icon}</span>`;
 const shape=kind==='meteor'?'<path d="m27 3-15 13M28 10 17 21M20 3 8 15" stroke="#b3d7ff"/><path d="m10 15 2 5 5 1-4 3v5l-4-3-5 1 2-5-3-4z" fill="#ffe9ae" stroke="#876d54"/>'
 :kind==='aurora'?'<path d="M4 21Q10 3 17 13T29 7M3 27Q12 11 20 20T30 15" stroke="#9becce" stroke-width="4"/><path d="M4 15Q12 1 22 10" stroke="#c7b9ff"/>'
 :'<circle cx="17" cy="14" r="7" fill="#ffe5a0"/><path d="M17 2v3M17 23v3M4 14h3M27 14h3M7 4l3 3M25 4l-3 3" stroke="#bca578"/><path d="M5 26h18a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0-7 10Z" fill="#faf5e8" stroke="#786956"/>';
 return `<svg viewBox="0 0 32 32" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}
export const weatherName=(kind:GardenWeatherKind|V3Weather|null)=>kind?V3_WEATHER[kind].name:'晴朗';
