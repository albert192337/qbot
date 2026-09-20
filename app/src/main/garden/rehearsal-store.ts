import { getSettings } from '../config';
import { getCharacter } from '../characters';
import { updateGardenJournal } from './service';
import { DESTINATIONS, initialTravel, type RehearsalRequest, type TravelRehearsal, type JournalResult } from '../../shared/travel';
export async function saveRehearsal(request:RehearsalRequest):Promise<JournalResult<TravelRehearsal>> {
 try{
  if(!request||typeof request.id!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(request.id)||!Number.isInteger(request.city)||!DESTINATIONS[request.city]||!Array.isArray(request.progress)||request.progress.length!==5||!request.progress.every(n=>Number.isInteger(n)&&n>=0&&n<=3)||!request.progress.some(Boolean))throw Error('测试旅行进度无效');
  const settings=await getSettings(),actor=settings.activeCharacter??'default',meta=settings.activeCharacter?await getCharacter(settings.activeCharacter):null,name=meta?.manifest.name??'桌宠';
  const value=await updateGardenJournal(state=>{
   const now=Date.now(),t=state.travel??=initialTravel(now);t.rehearsals??=[];
   let entry=t.rehearsals.find(e=>e.id===request.id);
   if(entry&&(entry.actor!==actor||entry.city!==request.city))throw Error('测试角色或地点已变更，请重新开始测试');
   if(!entry){entry={id:request.id,city:request.city,actor,name,at:now,progress:[0,0,0,0,0],posts:[],liked:false};t.rehearsals.push(entry);}
   let changed=false;
   request.progress.forEach((count,project)=>{for(let step=entry!.progress[project];step<count;step++){
    const title=DESTINATIONS[entry!.city].projects[project].steps[step];
    entry!.posts.push({id:`${entry!.id}-${project}-${step}`,at:now,city:entry!.city,project,step,title,text:title,liked:false,actor,name});changed=true;
   }entry!.progress[project]=Math.max(entry!.progress[project],count);});
   if(changed){entry.at=now;entry.diary=undefined;}return structuredClone(entry);
  });return {ok:true,value};
 }catch(e){return {ok:false,error:e instanceof Error?e.message:'测试手账保存失败，请重试'};}
}
