import type { WeatherKind } from '../shared/weather';
import { weatherReaction } from '../shared/weather-reaction';
import { getSettings } from './config';
import { getCharacter } from './characters';
import { getPetWindow, showBubbleWindow } from './windows';
let generation=0;
export function cancelWeatherReaction():void {generation++;}
/** Explicit weather test feedback is local, including in free mode; no LLM call. */
export async function reactToWeather(kind:WeatherKind):Promise<void> {
  const version=++generation,pet=getPetWindow();
  if(!pet||pet.isDestroyed()||!pet.isVisible())return;
  const settings=await getSettings();
  if(!settings.activeCharacter)return;
  const character=await getCharacter(settings.activeCharacter);
  if(!character)return;
  const latest=await getSettings();
  const valid=()=>version===generation&&getPetWindow()===pet&&!pet.isDestroyed()&&pet.isVisible();
  if(!valid()||latest.activeCharacter!==settings.activeCharacter)return;
  const reaction=weatherReaction(kind,character.manifest),bubble=showBubbleWindow();
  const deliver=async()=>{
    const current=await getSettings();
    if(!valid()||bubble.isDestroyed()||current.activeCharacter!==settings.activeCharacter)return;
    bubble.webContents.send('behavior:say',{text:reaction.text,source:'behavior',durationMs:8000});
    if(reaction.action)pet.webContents.send('pet:menuCommand',{type:'play',action:reaction.action});
    console.info('[weather] pet reaction',kind,reaction.action??'bubble-only');
  };
  if(bubble.webContents.isLoading())bubble.webContents.once('did-finish-load',()=>{void deliver().catch(console.error);});
  else await deliver();
}
