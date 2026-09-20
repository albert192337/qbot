import { app } from 'electron';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { getSettings } from '../config';
import { playJournalWriting } from '../journal-animation';
import { getCharacter } from '../characters';
import { conversationFor, conversationRevision } from '../conversation-memory';
import { journalPrompt, JOURNAL_FACT_BOUNDARY } from '../../shared/journal-prompts';
import { chatComplete } from '../llm-client';
import { beginBrainCall, updateBrainCall } from '../brain-log';
import { DESTINATIONS, localDay, type TravelState, type TravelDiary } from '../../shared/travel';
export async function prepareTravelMemory(t:TravelState,city=t.posts.at(-1)!.city,recordLast=true) {
 const settings=await getSettings(),actor=settings.activeCharacter??'default',meta=settings.activeCharacter?await getCharacter(settings.activeCharacter):null;
 const post=recordLast?t.posts.at(-1)!:t.posts.filter(p=>p.city===city&&p.actor===actor).at(-1);
 if(!post)throw Error('当前角色在这里还没有旅行记录');
 const now=post.at,day=localDay(now);post.actor=actor;post.name=meta?.manifest?.name??'桌宠';
 const filename=meta?.manifest?.actions.idle?.gif??meta?.manifest?.sourceImage;
 if(filename&&settings.activeCharacter){
  const base=path.resolve(app.getPath('userData'),'characters',settings.activeCharacter),full=path.resolve(base,filename);
  if(full.startsWith(base+path.sep))try{const data=await readFile(full);const ext=path.extname(full).slice(1).toLowerCase();if(data.length<1500000&&['png','jpg','jpeg','gif','webp'].includes(ext))post.portrait=`data:image/${ext==='jpg'?'jpeg':ext};base64,${data.toString('base64')}`;}catch{}
 }
 const today=t.posts.filter(p=>p.city===city&&p.actor===actor&&localDay(p.at)===day);
 const facts=today.map(p=>`${new Date(p.at).toLocaleTimeString('zh-CN')}: ${DESTINATIONS[p.city].name}，${p.title}`);
 const chats=conversationFor(actor,now).filter(l=>l.at<=now&&l.source==='chat'&&l.role==='user'&&localDay(l.at)===day).slice(-6);
 const signature=today.map(p=>p.id).join('|');
 const diary:TravelDiary={city,day,actor,name:post.name,text:`今天和你一起去了${DESTINATIONS[city].name}，${today.map(p=>p.title).join('、')}。这些小小的瞬间，都记在这里了。`,signature,updatedAt:now};
 t.diaries=t.diaries.filter(d=>d.city!==city||d.day!==day||d.actor!==actor);t.diaries.push(diary);
 return {diary,persona:meta?.manifest?.persona??'',apiKey:settings.freeMode?settings.arkApiKey:undefined,prompt:journalPrompt('travelDiaryPrompt',settings.travelDiaryPrompt),revision:conversationRevision(),facts:[...facts,...chats.map(c=>`当天用户聊天提到（只用于理解语气，不必引用私事）：${c.text.slice(0,600)}`)]};
}
export async function writeTravelDiary(input:Awaited<ReturnType<typeof prepareTravelMemory>>):Promise<string|undefined>{
 if(!input.apiKey)return;
 const trace=await beginBrainCall('travel:diary');
 try{
  await playJournalWriting(input.diary.actor).catch(()=>{});
  const text=await chatComplete({apiKey:input.apiKey,messages:[{role:'system',content:input.prompt+'\n'+JOURNAL_FACT_BOUNDARY},{role:'user',content:JSON.stringify({角色名:input.diary.name,角色人设:input.persona,day:input.diary.day,records:input.facts})}],onTrace:(stage,detail)=>{if(input.revision===conversationRevision())void updateBrainCall(trace,stage,{},detail);}});
  const settings=await getSettings();
  if(input.revision!==conversationRevision()||!settings.freeMode||(settings.activeCharacter??'default')!==input.diary.actor||journalPrompt('travelDiaryPrompt',settings.travelDiaryPrompt)!==input.prompt)return;
  await updateBrainCall(trace,'旅行日记已生成',{raw:text});return text.trim().slice(0,600)||undefined;
 }catch(e){await updateBrainCall(trace,'保留事实日记',{},String(e));return;}
}
