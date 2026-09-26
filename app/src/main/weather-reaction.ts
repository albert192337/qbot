import type { WeatherKind } from '../shared/weather';
import { weatherReaction } from '../shared/weather-reaction';
import { getSettings } from './config';
import { getCharacter } from './characters';
import { getPetWindow, showBubbleWindow } from './windows';
import { weatherMessages, writeWeatherLine } from './weather-dialogue';
import { beginBrainCall, updateBrainCall } from './brain-log';
import { BRAIN_MODEL } from './llm-client';
import { beginChatThinking } from './bubble';
let generation=0;
let stopThinking: (() => void) | undefined;
export function cancelWeatherReaction():void {generation++;stopThinking?.();stopThinking=undefined;}
/** Explicit and scheduled scenery reactions use the current character's persona. */
export async function reactToWeather(kind:WeatherKind):Promise<void> {
  cancelWeatherReaction();
  const version=generation,pet=getPetWindow();
  if(!pet||pet.isDestroyed()||!pet.isVisible())return;
  const settings=await getSettings();
  if(!settings.activeCharacter)return;
  const character=await getCharacter(settings.activeCharacter);
  if(!character)return;
  const latest=await getSettings();
  const valid=()=>version===generation&&getPetWindow()===pet&&!pet.isDestroyed()&&pet.isVisible();
  if(!valid()||latest.activeCharacter!==settings.activeCharacter)return;
  const reaction=weatherReaction(kind,character.manifest);
  const traceId=await beginBrainCall(`weather:${kind}`);
  let text: string | undefined;
  if(settings.arkApiKey){
    const messages=weatherMessages(kind,character.manifest);
    await updateBrainCall(traceId,'按人设生成天气台词',{input:{model:BRAIN_MODEL,messages}});
    const stop=beginChatThinking();stopThinking=stop;
    try { text=await writeWeatherLine(settings.arkApiKey,messages);await updateBrainCall(traceId,'LLM 台词生成成功',{raw:text}); }
    catch(error){await updateBrainCall(traceId,'生成失败，保持安静',{},error instanceof Error?error.message:String(error));}
    finally {stop();if(stopThinking===stop)stopThinking=undefined;}
  }else await updateBrainCall(traceId,'未配置 API Key，仅播放动作');
  const currentSettings=await getSettings();
  const currentCharacter=await getCharacter(settings.activeCharacter);
  if(!valid()||currentSettings.activeCharacter!==settings.activeCharacter||currentSettings.arkApiKey!==settings.arkApiKey||
      !currentCharacter||currentCharacter.manifest.persona!==character.manifest.persona||currentCharacter.manifest.name!==character.manifest.name){
    await updateBrainCall(traceId,'场景或人设已变化，丢弃台词');return;
  }
  if(!text){if(reaction.action)pet.webContents.send('pet:menuCommand',{type:'play',action:reaction.action});return;}
  const bubble=showBubbleWindow();
  const deliver=async()=>{
    const current=await getSettings();
    if(!valid()||bubble.isDestroyed()||current.activeCharacter!==settings.activeCharacter)return;
    bubble.webContents.send('behavior:say',{text,source:'llm',durationMs:8000,traceId});
    await updateBrainCall(traceId,'天气台词已发送');
    if(reaction.action)pet.webContents.send('pet:menuCommand',{type:'play',action:reaction.action});
    console.info('[weather] pet reaction',kind,reaction.action??'bubble-only');
  };
  if(bubble.webContents.isLoading())bubble.webContents.once('did-finish-load',()=>{void deliver().catch(console.error);});
  else await deliver();
}
