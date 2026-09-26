import {getRehearsal} from './local-rehearsal';
import { app, BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile,writeFile,rename,mkdir,unlink } from 'node:fs/promises';
import path from 'node:path';
import { getSettings,setSettings } from '../config';
import { gardenRequest,gardenRealm } from '../rooms/rooms';
import type { GardenCommand,GardenResult,GardenState } from '../../shared/garden';
import type { GardenVisit } from '../../shared/garden-life';
import {PAIR_INTERACTIONS,choosePairAction,pairBeats,type PairKind,type PairIntent} from '../../shared/pair-interaction';
const notify=()=>{for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:changed');};
type Pending={id:string;command:GardenCommand;actor?:string;realm:string};
const pendingFile=()=>path.join(app.getPath('userData'),'garden-network-pending.json');
async function readPending():Promise<Pending|undefined>{try{return JSON.parse(await readFile(pendingFile(),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
async function clearPending():Promise<void>{try{await unlink(pendingFile());}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
export async function networkGarden():Promise<GardenState>{
  await (await import('./network-box')).onlineBox(false);
  const s=await getSettings();let r=await gardenRequest({action:'get',actor:s.activeCharacter});if(!r.ok)throw Error(String(r.error));
  // A response can be lost after the server consumed the item. Reconcile by receipt, even when
  // the original fruit/button no longer exists; never require the player to recreate the command.
  const pending=await readPending();
  if(pending&&pending.realm===gardenRealm()&&pending.actor===(s.activeCharacter??undefined)){
    const replay=await gardenRequest({action:'act',command:pending.command,actor:pending.actor,operation:pending.id});
    await clearPending();if(replay.ok)r=replay;
    else{r=await gardenRequest({action:'get',actor:s.activeCharacter});if(!r.ok)throw Error(String(r.error));}
  }
  return r.state as GardenState;
}
export async function setNetworkGarden(enable:boolean):Promise<void>{if(getRehearsal())return; if(enable)await networkGarden();await setSettings({gardenOnline:enable});notify();}
/** Persist an uncertain command so retries after restart keep the same transaction identity. */
export async function networkAction(command:GardenCommand):Promise<GardenResult>{
  const s=await getSettings(),file=pendingFile();
  await gardenRequest({action:'get',actor:s.activeCharacter});
  const realm=gardenRealm();
  let pending=await readPending();
  if(pending&&(pending.realm!==realm||pending.actor!==(s.activeCharacter??undefined)||JSON.stringify(pending.command)!==JSON.stringify(command)))throw Error('上一次联机操作尚未确认，请切回原角色并重试该操作后继续');
  pending??={id:`${Date.now()}-${randomUUID()}`,command,actor:s.activeCharacter??undefined,realm};
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(pending));await rename(file+'.tmp',file);
  const r=await gardenRequest({action:'act',command:pending.command,actor:pending.actor,operation:pending.id});
  await clearPending();notify();return r as unknown as GardenResult;
}
export async function visitGarden(owner:string,preview=false,task?:string):Promise<GardenVisit>{if(getRehearsal())return getRehearsal()!.visit(owner);if(!/^[0-9A-Z]{12}$/.test(owner))throw Error('玩家不存在');const r=await gardenRequest({action:preview?'preview':'visit',owner,task});if(!r.ok)throw Error(String(r.error));return r.visit as GardenVisit;}
export async function cooperateGarden(owner:string,plot:number,action:'join'|'leave'|'claim'|'share'|'invite',target?:string,task?:string):Promise<GardenVisit>{
  if(getRehearsal()){const v=getRehearsal()!.cooperate(owner,plot,action,target,task);if(action!=='join')notify();return v;}
  if(!/^[0-9A-Z]{12}$/.test(owner)||!Number.isInteger(plot)||plot<0||plot>6||!['join','leave','claim','share','invite'].includes(action))throw Error('无效培育请求');
  if(action==='invite'&&(!target||!/^[0-9A-Z]{12}$/.test(target)))throw Error('请选择好友');
  const r=await gardenRequest({action:'coop',owner,plot,command:action,target,task});if(!r.ok)throw Error(String(r.error));if(action!=='join')notify();return r.visit as GardenVisit;
}
export async function inviteInteraction(target:string,kind:PairKind):Promise<void>{
  if(!/^[0-9A-Z]{12}$/.test(target)||!PAIR_INTERACTIONS.some(k=>k.id===kind))throw Error('无效互动');
  const s=await getSettings();if(!s.gardenOnline)throw Error('请先进入联机花园，以同步角色等级');
  const r=await gardenRequest({action:'pair:invite',target,kind,actor:s.activeCharacter});if(!r.ok)throw Error(String(r.error));
}
export async function answerInteraction(id:string,accept:boolean,response?:'happy'|'heart'|'wave'):Promise<void>{const s=await getSettings();const r=await gardenRequest({action:'pair:answer',id,accept,response,actor:s.activeCharacter});if(!r.ok)throw Error(String(r.error));}
export async function playNetworkInteraction(frame:Record<string,unknown>):Promise<void>{
  const s=await getSettings();if(!s.activeCharacter||s.activeCharacter!==frame.actor)return;
  const {getCharacter}=await import('../characters'),{getPetWindow}=await import('../windows');
  const character=await getCharacter(s.activeCharacter);if(!character)return;
  const intent=frame.intent;if(!['heart','happy','tea','talk','listen','wave'].includes(String(intent)))return;
  const action=choosePairAction(character.manifest,intent as PairIntent);
  if(!PAIR_INTERACTIONS.some(k=>k.id===frame.kind))return;
  const kind=frame.kind as PairKind;
  let paired=false;
  if(typeof frame.partner==='string'){
    const {getMemberSnapshot}=await import('../rooms/room-pets');
    const guest=getMemberSnapshot(frame.partner)?.character;
    if(guest){
      paired=true;
      // All first beats have distinct intents, so existing servers also identify the
      // recipient without a protocol upgrade. Later network beats must not restart media.
      if(frame.step===0)getPetWindow()?.webContents.send('pet:menuCommand',{type:'networkPair',partner:frame.partner,kind,recipient:typeof frame.recipient==='boolean'?frame.recipient:intent===pairBeats(kind)[0].guest,lines:Array.isArray(frame.lines)&&frame.lines.length===pairBeats(kind).length&&frame.lines.every(l=>typeof l==='string'&&l.length<=120)?frame.lines:undefined,guest:{...guest,hasUnfinishedJob:false}});
    }
  }
  if(!paired&&action)getPetWindow()?.webContents.send('pet:menuCommand',{type:'play',action:action.id});
  if(paired&&Array.isArray(frame.lines))return;
  for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('garden:interaction',{kind:frame.kind,caption:frame.caption,effect:frame.effect});
}
