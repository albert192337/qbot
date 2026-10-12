import { app,ipcMain,shell } from 'electron';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { readDesktopIconCopies, desktopIconCopy } from './desktop-icon-copies';
import { AutonomyEngine } from './autonomy-engine';
import { behaviorAudit } from './behavior-audit';
import { policyBlock, type BehaviorOpportunity, type BehaviorProposal } from '../shared/behavior-catalog';
import { PAIR_INTERACTIONS, pairActions } from '../shared/pair-interaction';
import { getSettings } from './config';
import { getCharacter, listCharacters } from './characters';
import { getPetWindow, getRoomPetWindow } from './windows';
import { desktopActorVisible, desktopQuiet } from './desktop-visibility';
import { getRoomsCache, getContacts, changeContact, supportsIconFight } from './rooms/rooms';
import { needsReveal } from '../shared/garden';
import { getMemberSnapshot, getContactRealm } from './rooms/room-pets';
import { relationships, localPerson, peerPerson } from './relationships';
import { relationshipKey, relationshipStage } from '../shared/relationships';
import { initUserMemory } from './user-memory';
import { shouldPauseAutomatic, isInputActive, conversationFor } from './conversation-memory';
import { getMeetingStatus } from './meeting-monitor';
import { getAgentStatus } from './agent-server';
import { getGarden, gardenAction } from './garden/service';
import { getRehearsal } from './garden/local-rehearsal';
import { generateMoment, hasNewMomentFacts } from './garden/journal-service';
import { inviteInteraction,setNetworkPairTracker } from './garden/network';
import { setBehaviorAudit } from './behavior-executor';

let ready = {actor:'',at:0,value:false,command:false};
const running = new Map<string,{proposal:BehaviorProposal;timer:ReturnType<typeof setTimeout>;started:boolean}>();
const peerInvitations=new Map<string,{proposal:BehaviorProposal;expiresAt:number}>();
function trackRunning(p:BehaviorProposal):void{
  const timer=setTimeout(()=>{
    if(!running.delete(p.id))return;
    getPetWindow()?.webContents.send('pet:menuCommand',{type:p.opportunity.behavior==='iconPlay'?'iconEnd':'pairEnd',requestId:p.id});
    void autonomy.record(p,'failed','互动未在期限内完成').catch(console.error);
  },75_000);
  running.set(p.id,{proposal:p,timer,started:false});
}
const revision = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
async function available(source:'auto'|'user'|'interaction'='auto'): Promise<boolean> {
  const s = await getSettings(), pet = getPetWindow();
  return !!s.activeCharacter && !desktopQuiet() && !!pet && desktopActorVisible(pet) &&
    ready.actor === s.activeCharacter && (source!=='auto'?ready.command:ready.value) && Date.now()-ready.at < 5000 && !running.size && !peerInvitations.size &&
    (source==='user'||source==='interaction' ? source==='user'||!!s.arkApiKey&&!isInputActive(s.activeCharacter)&&!getMeetingStatus().inMeeting : !!s.freeMode && !!s.arkApiKey && !shouldPauseAutomatic(s.activeCharacter) && !getMeetingStatus().inMeeting && getAgentStatus().activity === 'idle');
}
export const canRunUserCommand=()=>available('user');
export const canRunInteraction=(source:'auto'|'user'|'interaction')=>available(source);

/** Real, currently executable choices only. Reading this never connects or invites anyone. */
export async function behaviorOpportunities(ignoreBudget = false,includeHarvest = true,source:'auto'|'user'|'interaction'='auto'): Promise<BehaviorOpportunity[]> {
  if (!await available(source)) return [];
  const s = await getSettings(), host = await getCharacter(s.activeCharacter!);
  if (!host || !pairActions(host.manifest).size) return [];
  const actor = host.dirId, now = Date.now(), events = await behaviorAudit.list();
  const memory = await initUserMemory(), relations = await relationships.snapshot();
  const hostId = localPerson(host).id, room = getRoomsCache().room;
  const ownBounds = getPetWindow()!.getBounds();
  const base = [actor,host.manifest.name,host.manifest.persona,memory.revision,s.behaviorMode];
  const choices: BehaviorOpportunity[] = [];
  const allow = (b: BehaviorOpportunity['behavior']) => ignoreBudget || !policyBlock(events,actor,b,now);
  const contextFor = (id: string) => {
    const pair = relations.relationships.find(r => relationshipKey(...r.people) === relationshipKey(hostId,id));
    return pair ? {stage:relationshipStage(pair.points).label,settings:pair.settings[hostId],recent:pair.memories.slice(0,5)} : {stage:'初次相识'};
  };
  if (allow('pair') && room && !room.testing && s.gardenOnline) {
    for (const member of room.members) {
      const win = getRoomPetWindow(member.memberId), peer = getMemberSnapshot(member.memberId)?.character;
      if (!win || !desktopActorVisible(win) || !peer || !pairActions(peer.manifest).size) continue;
      const bounds = win.getBounds();
      if (Math.hypot(bounds.x + bounds.width/2 - ownBounds.x - ownBounds.width/2,
        bounds.y + bounds.height/2 - ownBounds.y - ownBounds.height/2) > 1000) continue;
      const relation = contextFor(peerPerson(peer,member.memberId,getContactRealm()).id);
      // Only kinds supported by historical servers; fight remains local until the server advertises it.
      for (const kind of PAIR_INTERACTIONS.filter(k=>k.id!=='fight'||supportsIconFight())) {
        const id = `pair:${member.memberId}:${kind.id}`;
        choices.push({id,behavior:'pair',target:member.memberId,targetName:peer.manifest.name,kind:kind.id,label:`和${peer.manifest.name}${kind.label}`,
          reason:`同场可见的角色；关系手账（数据）：${JSON.stringify(relation)}`,
          revision:revision([...base,room.roomId,peer.manifest,relation,id])});
      }
    }
  }
  if (allow('invite')) {
    for (const guest of (await listCharacters()).filter(c=>c.dirId!==actor && c.manifest && pairActions(c.manifest).size)) {
      const relation = contextFor(localPerson(guest).id);
      for(const kind of PAIR_INTERACTIONS){
      const id = `local:${guest.dirId}:${kind.id}`;
      choices.push({id,behavior:'invite',target:guest.dirId,targetName:guest.manifest.name,kind:kind.id,label:`邀请本地角色${guest.manifest.name}${kind.label}`,
        reason:`角色库中的伙伴，目前不在旁边；关系手账（数据）：${JSON.stringify(relation)}`,
        revision:revision([...base,guest.manifest,relation,id])});
      }
    }
    if (room && !room.testing && s.roomsChatConsent) {
      const contacts = await getContacts(false);
      for (const person of contacts.available ? contacts.people : []) {
        if (!person.online || person.relation !== 'friend' || room.members.some(m=>m.memberId===person.id)) continue;
        const id = `friend:${person.id}`;
        choices.push({id,behavior:'invite',target:person.id,targetName:person.nickname,targetAliases:person.character?[person.character]:[],label:`邀请好友${person.nickname}带${person.character||'角色'}来当前房间`,
          reason:'已经加为好友并且在线；获准后发送房间邀请，对方仍可拒绝',revision:revision([...base,room.roomId,person.id,person.character,id])});
      }
    }
  }
  if (includeHarvest && allow('harvest') && !getRehearsal()) {
    const garden = await getGarden();
    const ripe = garden.plots.map((p,i)=>p && p.readyAt<=now && !p.keep && !needsReveal(p) && !p.batch?.candidates.length && !Object.entries(garden.v3?.appraisals??{}).some(([id,a])=>id===p.id&&!a.done) ? {id:p.id,plot:i} : null).filter(Boolean);
    if (ripe.length) choices.push({id:'harvest',behavior:'harvest',label:`收取 ${ripe.length} 块成熟作物`,
      reason:'只收成熟且未保留的作物，收入仓库，不出售、不花钱',revision:revision([...base,s.gardenOnline,ripe])});
  }
  return choices;
}
async function valid(actor: string, choice: BehaviorOpportunity,source:'auto'|'user'|'interaction'='auto'): Promise<boolean> {
  if ((await getSettings()).activeCharacter !== actor || !await available(source)) return false;
  if(choice.behavior==='iconPlay')return (await (await import('./interaction-behaviors')).buildInteractionContext(source,true)).behaviorOpportunities.some(o=>o.id===choice.id&&o.revision===choice.revision);
  const current = (await behaviorOpportunities(true,choice.behavior==='harvest',source)).find(o=>o.id===choice.id);
  return !!current && current.revision===choice.revision;
}
export const autonomy = new AutonomyEngine({
  audit:behaviorAudit,now:Date.now,valid,
  publish:p=>getPetWindow()?.webContents.send('autonomy:proposal',p),
  execute:async p=>{
    const o = p.opportunity;
    if(o.behavior==='iconPlay'){
      const copy=await desktopIconCopy(o.target!);
      if(!copy||copy.object.name!==o.targetName)throw Error('指定的桌面图标已变化');
      if(!await available(p.source??'auto')||(await getSettings()).activeCharacter!==p.actor)throw Error('角色或场景已变化');
      trackRunning(p);
      getPetWindow()?.webContents.send('pet:menuCommand',{type:'iconPlay',actor:p.actor,requestId:p.id,image:copy.image});
      return 'sent';
    }
    if (o.id.startsWith('local:')) {
      trackRunning(p);
      getPetWindow()?.webContents.send('pet:menuCommand',{type:'pair',kind:o.kind,guestId:o.target,requestId:p.id});
      return 'sent';
    }
    if (o.behavior==='pair') {
      const id=await inviteInteraction(o.target!,o.kind!);
      if(id)peerInvitations.set(id,{proposal:p,expiresAt:Date.now()+150_000});
      return 'sent';
    }
    if (o.behavior==='invite') { await changeContact(o.target!,'invite'); return 'sent'; }
    if (o.behavior==='harvest') {
      const result = await gardenAction({type:'harvestMany'});
      if (!result.ok) throw Error(result.error);
      const character=await getCharacter(p.actor);
      if(character&&(await getSettings()).activeCharacter===p.actor){
        const actions=pairActions(character.manifest),action=['garden_harvest','cheer','talk_happy','wave'].find(id=>actions.has(id));
        if(action)getPetWindow()?.webContents.send('pet:menuCommand',{type:'play',action});
      }
      return 'completed';
    }
    throw Error('行为尚未接入');
  },
});
export async function proposeBehavior(actor: string, choice: BehaviorOpportunity, reason: string): Promise<boolean> {
  return autonomy.propose(actor,choice,reason);
}

let ticking = false;
export async function tickAutonomy(): Promise<void> {
  if (ticking) return; ticking = true;
  try {
    await autonomy.refresh();
    if (autonomy.get() || !await available() || getRehearsal()) return;
    const s = await getSettings(), actor = s.activeCharacter!, now = Date.now();
    if (new Date(now).getHours()<9 || new Date(now).getHours()>=23 || policyBlock(await behaviorAudit.list(),actor,'moment',now)) return;
    const state = await getGarden();
    if (!hasNewMomentFacts(state,actor,conversationFor(actor,now),now)) return;
    // The journal service itself reserves the durable budget before calling the model.
    await generateMoment(randomUUID(),'auto');
  } catch (error) { console.error('[autonomy]',error instanceof Error ? error.message : '运行失败'); }
  finally { ticking = false; }
}
let wired = false;
export function wireAutonomy(): void {
  if (wired) return; wired = true;
  void behaviorAudit.update(events=>{
    const latest=new Map(events.filter(e=>['auto','user','rule'].includes(e.source)&&['pair','invite','moment','harvest','iconPlay'].includes(e.behavior)).map(e=>[e.id,e]));
    for(const e of latest.values())if(['proposed','approved','reserved','started','sent'].includes(e.outcome))events.push({...e,at:Date.now(),outcome:'cancelled',reason:'应用重启，上一请求结果未确认；不会自动重放'});
  }).catch(console.error);
  setNetworkPairTracker((session,actor)=>{
    const invitation=peerInvitations.get(session);
    if(!invitation||invitation.proposal.actor!==actor||invitation.expiresAt<=Date.now())return;
    peerInvitations.delete(session);trackRunning(invitation.proposal);return invitation.proposal.id;
  });
  setBehaviorAudit((script,step)=>{
    const at=Date.now();
    void getSettings().then(s=>behaviorAudit.append({id:randomUUID(),at,actor:script.meta.characterId??s.activeCharacter??'default',
      behavior:step.op,source:script.meta.id==='llm-brain'?'auto':script.meta.id==='llm-interaction'?'rule':script.meta.source==='llm'?'user':script.meta.source,
      outcome:'sent',reason:step.op==='play'?step.action:step.op==='say'?step.text:step.op==='sign'?step.text??'收起留言':script.meta.reason??step.op})).catch(console.error);
  });
  const senderIsPet = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) =>
    event.sender===getPetWindow()?.webContents && event.senderFrame===event.sender.mainFrame;
  ipcMain.handle('autonomy:get',event=>senderIsPet(event)?autonomy.get():null);
  ipcMain.handle('autonomy:answer',(event,id,accept)=>{
    if (!senderIsPet(event) || typeof id!=='string' || typeof accept!=='boolean') throw Error('无效行为申请');
    return autonomy.answer(id,accept);
  });
  ipcMain.handle('autonomy:log',()=>behaviorAudit.list());
  ipcMain.handle('autonomy:openPhotos',async()=>{
    const directory=path.join(app.getPath('userData'),'pair-photos');
    await mkdir(directory,{recursive:true});const error=await shell.openPath(directory);if(error)throw Error('本机相册暂时无法打开');
  });
  ipcMain.on('autonomy:ready',(event,actor,value,command)=>{
    if (senderIsPet(event) && typeof actor==='string' && typeof value==='boolean') ready={actor,at:Date.now(),value,command:typeof command==='boolean'?command:value};
  });
  ipcMain.on('autonomy:observed',(event,actor,action,trigger)=>{
    if(!senderIsPet(event)||typeof actor!=='string'||typeof action!=='string'||!['idle','timer','perch'].includes(trigger))return;
    const at=Date.now();
    void getSettings().then(async s=>{
      if(s.activeCharacter!==actor)return;const character=await getCharacter(actor);
      if(!character||!pairActions(character.manifest).has(action))return;
      await behaviorAudit.append({id:randomUUID(),at,actor,behavior:'play',source:'auto',outcome:'sent',reason:`${trigger==='idle'?'自主待机':trigger==='timer'?'自主活动':'窗沿停靠'}：${action}`});
    }).catch(console.error);
  });
  ipcMain.on('autonomy:result',(event,id,outcome,reason)=>{
    if (!senderIsPet(event) || !['started','completed','cancelled','failed'].includes(outcome)) return;
    const run = running.get(id); if (!run || outcome==='started' && run.started) return;
    if (outcome==='started') run.started=true;
    else { clearTimeout(run.timer); running.delete(id); }
    void autonomy.record(run.proposal,outcome,typeof reason==='string'?reason.slice(0,160):undefined).catch(console.error);
  });
  ipcMain.handle('autonomy:icons',async event=>{
    if (!senderIsPet(event)) return [];
    return readDesktopIconCopies();
  });
  let lastPhoto=0,photoBusy=false;
  ipcMain.handle('autonomy:photo',async event=>{
    if(!senderIsPet(event)||photoBusy||Date.now()-lastPhoto<10_000)throw Error('合影还在保存，请稍候');
    const pet=getPetWindow();if(!pet||!desktopActorVisible(pet))throw Error('角色不在桌面上');
    photoBusy=true;
    try{
      const picture=await pet.webContents.capturePage();
      if(picture.isEmpty())throw Error('合影画面尚未就绪');
      const directory=path.join(app.getPath('userData'),'pair-photos');await mkdir(directory,{recursive:true});
      await writeFile(path.join(directory,`${Date.now()}-${randomUUID()}.png`),picture.toPNG());lastPhoto=Date.now();
      const actor=(await getSettings()).activeCharacter??'default';
      const run=[...running.values()].find(r=>r.proposal.actor===actor);
      await behaviorAudit.append({id:randomUUID(),at:Date.now(),actor,behavior:'photo',source:run?(run.proposal.source==='interaction'?'rule':run.proposal.source??'auto'):'user',outcome:'completed',reason:'双人合影已保存至本机相册（仅桌宠窗口）'});
    }finally{photoBusy=false;}
  });
  setInterval(()=>{
    for(const [id,value]of peerInvitations)if(value.expiresAt<=Date.now()){
      peerInvitations.delete(id);void autonomy.record(value.proposal,'expired','未收到对方接受并开演的回执').catch(console.error);
    }
  },5000).unref();
  setInterval(()=>void autonomy.refresh().catch(console.error),5000).unref();
  setInterval(()=>void tickAutonomy(),60_000).unref();
}
