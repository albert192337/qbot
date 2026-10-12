import {randomUUID} from 'node:crypto';
import {getSettings} from './config';
import {getCharacter} from './characters';
import {brainActions} from './brain-actions';
import {resourceText,scenePool} from '../shared/action-resources';
import {autonomy,behaviorOpportunities,canRunUserCommand} from './autonomy';
import {generateMoment} from './garden/journal-service';
import {execute} from './behavior-executor';
import {commandName,parsePetCommand,chooseCommandOpportunity,PAIR_COMMAND_LABEL} from './pet-command-rules';

export interface CommandResult {ok:boolean;error?:string;message?:string}
const HELP='试试：指令双人打闹、指令和角色名一起喝茶、指令邀请角色名来玩、指令收菜、指令发朋友圈、指令播放动作名、指令取消。';
const ACTION_ALIASES:Record<string,string[]>={idle:['待机','发呆','休息'],sleep:['睡觉','睡眠'],walk:['走路','走一走','散步'],wave:['挥手'],writing:['写字'],talk_happy:['开心','笑一笑'],talk_annoyed:['生气'],cheer:['欢呼'],dance:['跳舞']};
export async function sendPetCommand(text:string,actor:string):Promise<CommandResult> {
 const command=parsePetCommand(text);if(!command)return {ok:false,error:'请用“指令”开头。'};
 if(command.type==='help')return {ok:true,message:HELP};
 if(command.type==='cancel'){
  const pending=autonomy.get();if(pending)await autonomy.answer(pending.id,false);
  return {ok:true,message:pending?'已取消这次申请。':'目前没有等待同意的申请。'};
 }
 const settings=await getSettings();
 if(!settings.activeCharacter||settings.activeCharacter!==actor)return {ok:false,error:'请先选择桌面角色，再重新发送指令。'};
 if(!await canRunUserCommand())return {ok:false,error:'请先让角色回到桌面，结束拖动或正在进行的双人、花园互动后重试。'};
 if(command.type==='moment'){
  const result=await generateMoment(randomUUID(),'user');
  return result.ok?{ok:true,message:'朋友圈已保存在游戏内手账。'}:result;
 }
 if(command.type==='action'){
  const character=await getCharacter(actor);if(!character)return {ok:false,error:'当前角色不可用。'};
  const actions=brainActions(character.manifest),query=commandName(command.name);
  const scene=Object.entries(ACTION_ALIASES).find(([id,aliases])=>[id,...aliases].includes(query))?.[0];
  let matches=actions.filter(a=>commandName(a.id)===query||commandName(resourceText(character.manifest,a.id).name)===query);
  if(!matches.length&&scene){const ids=[scene,...scenePool(character.manifest,scene)];matches=actions.filter(a=>ids.includes(a.id));}
  if(!matches.length)return {ok:false,error:`没有找到可执行的动作“${command.name}”。${HELP}`};
  if((await getSettings()).activeCharacter!==actor||!await canRunUserCommand())return {ok:false,error:'角色或场景已变化，请重试。'};
  execute({meta:{id:`user-command:${randomUUID()}`,characterId:actor,source:'user',priority:100,reason:text.slice(0,160)},steps:[{op:'play',action:matches[0].id,loops:1}]});
  return {ok:true,message:`已请求播放：${resourceText(character.manifest,matches[0].id).name}。`};
 }
 const choices=await behaviorOpportunities(true,command.type==='harvest','user');
 const selected=chooseCommandOpportunity(command,choices);
 if(!selected){
  const error=command.type==='harvest'?'目前没有可收取的成熟作物。':
   'target' in command&&command.target?`没有找到能执行这条指令的“${command.target}”。请核对角色名、在线状态和动作能力。`:
   '目前没有可互动的伙伴。请先添加另一个本地角色，或让支持此行为的房友出现在桌面上。';
  return {ok:false,error};
 }
 const approvalText=command.type==='pair'?`我可以和${selected.targetName}${PAIR_COMMAND_LABEL[command.kind]}吗？`:
  command.type==='invite'?`我可以邀请${selected.targetName}过来玩吗？`:`我可以${selected.label}吗？`;
 const detail=selected.id.startsWith('local:')?'对方是本地角色，同意后会来到身边。':selected.id.startsWith('friend:')||selected.id.startsWith('pair:')?'同意后发送邀请，对方也需要接受。':'同意后收进仓库，不出售。';
 const proposed=await autonomy.propose(actor,{...selected,approvalText:`${approvalText}\n${detail}`},`用户指令：${text.slice(0,130)}`,'user');
 return proposed?{ok:true,message:'已弹出申请，请在角色旁点“同意”。'}:{ok:false,error:'暂时无法提出申请，角色或场景可能已变化，请稍后重试。'};
}
