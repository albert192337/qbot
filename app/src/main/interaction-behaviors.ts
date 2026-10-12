import {createHash,randomUUID} from 'node:crypto';
import {autonomy,behaviorOpportunities,canRunInteraction} from './autonomy';
import {getSettings} from './config';
import {desktopInventory} from './desktop-icon-copies';
import {behaviorAudit} from './behavior-audit';
import {initUserMemory} from './user-memory';
import {policyBlock,type BehaviorOpportunity} from '../shared/behavior-catalog';
import {generateMoment,hasNewMomentFacts} from './garden/journal-service';
import {getGarden} from './garden/service';
import {getRehearsal} from './garden/local-rehearsal';
import {conversationFor} from './conversation-memory';
import {PAIR_COMMAND_LABEL} from './pet-command-rules';

export async function buildInteractionContext(source:'auto'|'user'|'interaction',ignoreBudget=false) {
  const desktopObjects=await desktopInventory();
  const choices:BehaviorOpportunity[]=await behaviorOpportunities(source==='user'||ignoreBudget,true,source);
  const s=await getSettings(),actor=s.activeCharacter;
  if(actor&&await canRunInteraction(source)){
    const events=await behaviorAudit.list(),memory=await initUserMemory();
    const revision=(data:unknown)=>createHash('sha256').update(JSON.stringify([actor,memory.revision,s.behaviorMode,data])).digest('hex');
    if(source==='user'||ignoreBudget||!policyBlock(events,actor,'iconPlay',Date.now()))for(const icon of desktopObjects.items)
      choices.push({id:`icon:${icon.id}`,behavior:'iconPlay',label:`抛玩“${icon.name}”图标副本`,target:icon.id,targetName:icon.name,reason:'只使用这个桌面对象的图片副本，不打开软件，不改动原文件',revision:revision(icon)});
    if(!getRehearsal()&&s.freeMode&&s.arkApiKey&&!policyBlock(events,actor,'moment',Date.now())&&(source==='user'||hasNewMomentFacts(await getGarden(),actor,conversationFor(actor),Date.now())))
      choices.push({id:'moment',behavior:'moment',label:'写一条游戏内朋友圈',reason:'只用真实经历，不对外发布；共用每日3次/4小时预算',revision:revision('moment')});
  }
  return {behaviorOpportunities:choices,desktopObjects};
}

export async function performInteractionBehavior(actor:string,choice:BehaviorOpportunity,reason:string,source:'auto'|'user'|'interaction'):Promise<boolean>{
  if((await getSettings()).activeCharacter!==actor)return false;
  if(choice.behavior==='moment'){
    const current=(await buildInteractionContext(source)).behaviorOpportunities.find(o=>o.id===choice.id);
    if(!current||current.revision!==choice.revision)return false;
    // Journal service reserves its own durable budget. Do not reserve it twice.
    const result=await generateMoment(randomUUID(),source==='user'?'user':'auto');
    if(!result.ok)throw Error(result.error);
    return true;
  }
  const question=choice.kind?`我可以和${choice.targetName}${PAIR_COMMAND_LABEL[choice.kind]}吗？`:
    choice.behavior==='invite'?`我可以邀请${choice.targetName}过来玩吗？`:`我可以${choice.label}吗？`;
  return autonomy.propose(actor,{...choice,approvalText:question},`${choice.label}：${reason}`,source);
}
