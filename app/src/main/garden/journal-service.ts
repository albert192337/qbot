import { getSettings } from '../config';
import { playJournalWriting } from '../journal-animation';
import { getCharacter } from '../characters';
import { conversationFor } from '../conversation-memory';
import { initUserMemory } from '../user-memory';
import { getJournalInteractions } from '../perception';
import { chatComplete } from '../llm-client';
import { beginBrainCall, updateBrainCall } from '../brain-log';
import { getGarden, updateGardenJournal } from './service';
import { prepareTravelMemory, writeTravelDiary } from './travel-memory';
import { SPECIES, type GardenState } from '../../shared/garden';
import { journalPrompt, JOURNAL_FACT_BOUNDARY } from '../../shared/journal-prompts';
import { DESTINATIONS, initialTravel, localDay, rehearsalTravel, type DailyMoment, type DiaryRequest, type JournalResult, type JournalStatus, type TravelDiary } from '../../shared/travel';

export async function journalStatus():Promise<JournalStatus> {
  const s=await getSettings(),actor=s.activeCharacter??'default';
  const meta=s.activeCharacter?await getCharacter(s.activeCharacter):null;
  return {enabled:!!s.freeMode,configured:!!s.arkApiKey,actor,name:meta?.manifest.name??'桌宠'};
}
async function identity() {
  const settings=await getSettings();
  if(!settings.freeMode)throw Error('请先在工具抽屉开启 LLM 模式');
  if(!settings.arkApiKey)throw Error('请先配置 LLM API Key');
  const actor=settings.activeCharacter??'default',meta=settings.activeCharacter?await getCharacter(settings.activeCharacter):null;
  return {settings,actor,name:meta?.manifest.name??'桌宠',persona:meta?.manifest.persona??''};
}
const inFlight=new Map<string,Promise<JournalResult<TravelDiary>>>();
export async function rewriteDiary(request:DiaryRequest):Promise<JournalResult<TravelDiary>> {
  // Concurrent page refreshes share one request for the same city and rehearsal state.
  const settings=await getSettings();
  const key=JSON.stringify([settings.activeCharacter,settings.freeMode,settings.travelDiaryPrompt,request]);
  const pending=inFlight.get(key);if(pending)return pending;
  const task=doRewrite(request).catch((e):JournalResult<TravelDiary>=>({ok:false,error:e instanceof Error?e.message:'手账生成失败，请重试'})).finally(()=>inFlight.delete(key));
  inFlight.set(key,task);return task;
}
async function doRewrite(request:DiaryRequest):Promise<JournalResult<TravelDiary>> {
  if(!request||!Number.isInteger(request.city)||!DESTINATIONS[request.city])throw Error('目的地无效');
  const who=await identity(),store=await initUserMemory(),revision=store.revision;
  const now=Date.now(),city=request.city;
  let travel=(await getGarden()).travel;
  if(request.rehearsalId!==undefined){
    const saved=travel?.rehearsals?.find(e=>e.id===request.rehearsalId&&e.city===city&&e.actor===who.actor);
    if(!saved)throw Error('测试手账不存在或不属于当前角色');travel=rehearsalTravel(saved);
  }else if(request.rehearsal!==undefined){
    if(!Array.isArray(request.rehearsal)||request.rehearsal.length!==5||!request.rehearsal.every(n=>Number.isInteger(n)&&n>=0&&n<=3))throw Error('测试进度无效');
    travel=initialTravel(now);travel.current=city;
    request.rehearsal.forEach((count,project)=>{for(let step=0;step<count;step++)travel!.posts.push({id:`test-${project}-${step}`,at:now,city,project,step,title:DESTINATIONS[city].projects[project].steps[step],text:'',liked:false,actor:who.actor,name:who.name});});
  }
  if(!travel)throw Error('还没有旅行记录');
  const input=await prepareTravelMemory(travel,city,false);
  if(request.rehearsal||request.rehearsalId)input.facts.unshift('这是游戏旅行测试重玩，仅依据本次测试体验写手账，不代表正式旅行进度或现实出游。');
  const text=await writeTravelDiary(input);
  if(!text)throw Error('手账暂未生成，请稍后重试');
  const latest=await identity();
  if(latest.actor!==who.actor||store.revision!==revision)throw Error('角色或记忆已更新，请重新生成');
  const diary={...input.diary,text,generated:true,updatedAt:Date.now()};
  if(!request.rehearsal||request.rehearsalId)await updateGardenJournal(state=>{
    if(store.revision!==revision)throw Error('记忆已更新，请重新生成');
    const t=state.travel;if(!t)throw Error('旅行记录已更新');
    if(request.rehearsalId){
      const entry=t.rehearsals?.find(e=>e.id===request.rehearsalId&&e.actor===who.actor);
      if(!entry||entry.posts.filter(p=>localDay(p.at)===diary.day).map(p=>p.id).join('|')!==diary.signature)throw Error('测试体验已更新，请重新生成');
      entry.diary=diary;return;
    }
    const signature=t.posts.filter(p=>p.city===city&&p.actor===diary.actor&&localDay(p.at)===diary.day).map(p=>p.id).join('|');
    if(signature!==diary.signature)throw Error('旅行体验已更新，请重新生成');
    t.diaries=t.diaries.filter(d=>d.city!==city||d.actor!==diary.actor||d.day!==diary.day);t.diaries.push(diary);
  });
  return {ok:true,value:diary};
}

export function todayGardenFacts(state:GardenState,now:number) {
  const day=localDay(now);
  return {
    今日仍在土地中的播种:state.plots.filter(p=>p&&p.plantedAt<=now&&localDay(p.plantedAt)===day).map(p=>({植物:SPECIES[p!.species].name,播种时间:new Date(p!.plantedAt).toLocaleTimeString('zh-CN')})),
    当前花园概况并非今日收获记录:{种植中:state.plots.filter(Boolean).length,仓库果实:state.produce.length},
  };
}
let momentTask:Promise<JournalResult<DailyMoment>>|undefined;
export function generateMoment(requestId:string):Promise<JournalResult<DailyMoment>> {
  if(momentTask)return Promise.resolve({ok:false,error:'正在写今日朋友圈，请稍候'});
  momentTask=doGenerateMoment(requestId).catch((e):JournalResult<DailyMoment>=>({ok:false,error:e instanceof Error?e.message:'生成失败，请重试'})).finally(()=>{momentTask=undefined;});
  return momentTask;
}
async function doGenerateMoment(requestId:string):Promise<JournalResult<DailyMoment>> {
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw Error('生成请求无效');
  const who=await identity(),now=Date.now(),day=localDay(now),state=await getGarden();
  const existing=state.travel?.moments?.find(m=>m.id===requestId&&m.actor===who.actor);if(existing)return {ok:true,value:existing};
  const store=await initUserMemory(),revision=store.revision;
  const memories=store.candidates(who.actor).filter(m=>m.status==='active'&&m.proactive&&m.visible&&m.certainty==='explicit'&&(!m.expiresAt||m.expiresAt>now));
  const chats=conversationFor(who.actor,now).filter(c=>c.at<=now&&localDay(c.at)===day&&c.source==='chat').slice(-30).map(c=>({时间:new Date(c.at).toLocaleTimeString('zh-CN'),说话者:c.role==='user'?'用户':'桌宠（旧生成内容，不是用户事实）',内容:c.text.slice(0,800)}));
  const prompt=journalPrompt('dailyMomentPrompt',who.settings.dailyMomentPrompt);
  const records={本地日期:day,本地时间:new Date(now).toLocaleTimeString('zh-CN'),角色名:who.name,角色人设:who.persona,
    今日聊天:chats,今日桌宠互动汇总未区分历史角色:await getJournalInteractions(now),
    今日共同花园记录:memories.filter(m=>m.evidence.source==='garden'&&m.evidence.characterId===who.actor&&m.evidence.at<=now&&localDay(m.evidence.at)===day).slice(-15).map(m=>m.text.slice(0,350)),
    ...todayGardenFacts(state,now),
    今日花园操作:(state.journalEvents??[]).filter(e=>e.actor===who.actor&&e.at<=now&&localDay(e.at)===day).slice(-30).map(e=>({时间:new Date(e.at).toLocaleTimeString('zh-CN'),内容:e.summary})),
    今日真实游戏旅行:(state.travel?.posts??[]).filter(p=>p.actor===who.actor&&p.at<=now&&localDay(p.at)===day).slice(-20).map(p=>`${DESTINATIONS[p.city].name}：${p.title}`),
    用户明确偏好:memories.filter(m=>m.kind==='preference').slice(-8).map(m=>m.text.slice(0,250)),
    今日已发朋友圈仅供避开重复:(state.travel?.moments??[]).filter(m=>m.actor===who.actor&&m.day===day).slice(-3).map(m=>m.text),
    记录边界:'只提供当前仍保留的近期聊天和有记录的事件，不代表完整的一天。互动汇总未区分角色，只能说明用户与桌宠互动过；不要把统计数字写进正文。没有记录的收获、售出或聊天不能补写。',
  };
  const trace=await beginBrainCall('journal:daily-moment');
  let text:string;
  try{
    await playJournalWriting(who.actor).catch(()=>{});
    text=(await chatComplete({apiKey:who.settings.arkApiKey!,messages:[{role:'system',content:prompt+'\n'+JOURNAL_FACT_BOUNDARY},{role:'user',content:JSON.stringify(records)}],onTrace:(stage,detail)=>{if(store.revision===revision)void updateBrainCall(trace,stage,{},detail);}})).trim();
  }catch{if(store.revision===revision)await updateBrainCall(trace,'朋友圈生成失败');throw Error('朋友圈生成失败，请稍后重试');}
  const latest=await identity();
  if(store.revision!==revision||latest.actor!==who.actor||journalPrompt('dailyMomentPrompt',latest.settings.dailyMomentPrompt)!==prompt)throw Error('角色、记忆或提示词已更新，请重新生成');
  if(!text)throw Error('模型没有返回正文，请重试');
  const moment:DailyMoment={id:requestId,at:now,day,actor:who.actor,name:who.name,text:text.slice(0,1500),liked:false};
  await updateGardenJournal(state=>{
    if(store.revision!==revision)throw Error('记忆已更新，请重新生成');
    const t=state.travel??=initialTravel(now);t.moments??=[];
    if(!t.moments.some(m=>m.id===moment.id))t.moments.push(moment);
  });
  await updateBrainCall(trace,'朋友圈已保存');return {ok:true,value:moment};
}
