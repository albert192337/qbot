import {app,ipcMain,powerMonitor} from 'electron';
import {randomUUID} from 'node:crypto';
import {getPetWindow,getPetChatWindow,getRoomPetWindow} from './windows';
import {desktopActorVisible} from './desktop-visibility';
import {getSettings} from './config';
import {isChatting,onChattingChanged,setInputAttention} from './conversation-memory';
import {memberStates,myMemberId,onRoomPetEvent} from './rooms/room-pets';
import {behaviorAudit} from './behavior-audit';
import {emitEvent} from './perception';
import {ReturnGreetingGate,type PresenceSignal,type PresenceKind} from '../shared/pet-presence';

let wired=false;
export function wirePetPresence():void {
 if(wired)return;wired=true;
 let inputUntil=0,attentionKey='',revision=0,joining=false;
 const watched=new Set<number>(),pendingVisitors=new Map<string,number>(),greeted=new Map<string,number>();
 const returnGate=new ReturnGreetingGate();
 const send=(signal:PresenceSignal)=>{const pet=getPetWindow();if(pet&&!pet.isDestroyed())pet.webContents.send('pet:presence',signal);};
 const publishAttention=async()=>{
  const rev=++revision,s=await getSettings();if(rev!==revision||!s.activeCharacter)return;
  const active=Date.now()<inputUntil||isChatting(s.activeCharacter),key=`${s.activeCharacter}:${active}`;
  if(key===attentionKey)return;attentionKey=key;send({actor:s.activeCharacter,kind:'attention',active});
 };
 const releaseInput=()=>{inputUntil=0;setInputAttention(0);void publishAttention();};
 ipcMain.on('pet:inputAttention',(event,active)=>{
  const chat=getPetChatWindow();
  if(!chat||chat.isDestroyed()||event.sender!==chat.webContents||typeof active!=='boolean')return;
  if(active&&(!chat.isVisible()||!chat.isFocused()))return;
  inputUntil=active?Date.now()+6000:0;setInputAttention(inputUntil);
  if(!watched.has(chat.id)){watched.add(chat.id);chat.on('blur',releaseInput);chat.on('hide',releaseInput);chat.on('closed',()=>{watched.delete(chat.id);releaseInput();});chat.webContents.on('render-process-gone',releaseInput);}
  void publishAttention();
 });
 const unsubscribe=onChattingChanged(()=>{void publishAttention();});
 onRoomPetEvent(event=>{
  if(event.kind==='roomJoined'){joining=true;pendingVisitors.clear();queueMicrotask(()=>{joining=false;});}
  if(event.kind==='roomLeft')pendingVisitors.clear();
  if(event.kind==='memberOut')pendingVisitors.delete(event.memberId);
  if(event.kind==='memberIn'&&!joining&&event.member.memberId!==myMemberId&&Date.now()-(greeted.get(event.member.memberId)??0)>600000)
   pendingVisitors.set(event.member.memberId,Date.now());
 });
 let ticking=false;
 const tick=async()=>{
  if(ticking)return;ticking=true;
  try{
   if(inputUntil&&Date.now()>=inputUntil)releaseInput();
   const returned=returnGate.sample(powerMonitor.getSystemIdleTime(),powerMonitor.getSystemIdleState(15)==='locked',Date.now());
   const pet=getPetWindow();
   if(!pet||!desktopActorVisible(pet)){pendingVisitors.clear();return;}
   const visitors:string[]=[];
   for(const [id,at]of pendingVisitors){
    const peer=getRoomPetWindow(id);
    if(Date.now()-at>30000){pendingVisitors.delete(id);continue;}
    if(peer&&desktopActorVisible(peer)&&memberStates.get(id)?.character){visitors.push(id);pendingVisitors.delete(id);greeted.set(id,Date.now());}
   }
   if(returned||visitors.length){const actor=(await getSettings()).activeCharacter;if(actor){const kind=returned?'return':'visitor';send({actor,kind,target:visitors[0]});void emitEvent({type:'presence',at:Date.now(),kind,target:visitors[0]}).catch(console.error);}}
  }finally{ticking=false;}
 };
 const timer=setInterval(()=>{void tick().catch(console.error);},1000);timer.unref();
 const reportTimes=new Map<string,number>();
 ipcMain.on('pet:presenceReport',async(event,actor,kind:PresenceKind,action,outcome)=>{
  if(event.sender!==getPetWindow()?.webContents||typeof actor!=='string'||typeof action!=='string'||action.length>160||!['attention','return','visitor','resume'].includes(kind)||!['started','completed','cancelled'].includes(outcome))return;
  const key=`${actor}:${kind}:${outcome}`;if(Date.now()-(reportTimes.get(key)??0)<1000)return;reportTimes.set(key,Date.now());
  if((await getSettings()).activeCharacter!==actor)return;
  const reason={attention:'注意用户输入',return:'用户回到电脑',visitor:'回应实际到场的访客',resume:'继续被打断的活动'}[kind];
  await behaviorAudit.append({id:randomUUID(),at:Date.now(),actor,behavior:kind,source:'rule',outcome,reason:`${reason}：${action}`}).catch(console.error);
 });
 app.once('before-quit',()=>{clearInterval(timer);unsubscribe();setInputAttention(0);});
}
