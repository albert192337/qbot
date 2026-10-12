import type {PairKind} from '../shared/pair-interaction';
import type {BehaviorOpportunity} from '../shared/behavior-catalog';

export type PetCommand = {type:'pair';kind:PairKind;target?:string}|{type:'invite';target:string}|{type:'harvest'|'moment'|'cancel'|'help'}|{type:'action';name:string};
export const commandText=(text:string):string|null=>/^指令/.test(text.trim())?text.trim().slice(2).replace(/^\s*[:：]?\s*/,''):null;
export const commandName=(text:string)=>text.trim().replace(/\s+/g,'').toLocaleLowerCase();
const PAIRS:ReadonlyArray<[PairKind,string[]]>=[
 ['fight',['双人打闹','图标打闹','双人打架','打闹','打架']],
 ['tea',['双人喝茶','一起喝茶','请喝茶','喝茶']],
 ['chat',['双人聊天','一起聊天','聊天']],
 ['photo',['并排合影','双人合影','拍照留念','一起拍照','合影','拍照']],
 ['heart',['送小心心','小心心','比心']],['wave',['打招呼']],
 ['flower',['送一朵花','送花']],['relay',['表情接力']],['celebrate',['共同庆祝','一起庆祝','庆祝']],
];
export const PAIR_COMMAND_LABEL:Record<PairKind,string>={fight:'一起打闹',tea:'一起喝茶',chat:'一起聊天',photo:'一起合影',heart:'互送小心心',wave:'打个招呼',flower:'送一朵花',relay:'玩表情接力',celebrate:'一起庆祝'};
/** Parse the explicit prefix only; quoted prose, compound/unknown targets cannot silently choose a different action. */
export function parsePetCommand(text:string):PetCommand|null {
 const raw=commandText(text);if(raw===null)return null;
 const payload=commandName(raw).replace(/[。！!？?]+$/,'');
 if(!payload||['帮助','列表','有哪些'].includes(payload))return {type:'help'};
 if(['取消','取消申请','算了'].includes(payload))return {type:'cancel'};
 if(['收菜','收获','采摘','收取成熟作物','收获成熟作物'].includes(payload))return {type:'harvest'};
 if(['发朋友圈','写朋友圈','写一条朋友圈','发一条朋友圈','写今日朋友圈'].includes(payload))return {type:'moment'};
 for(const [kind,aliases]of PAIRS)for(const alias of aliases){
  if(!payload.endsWith(alias))continue;
  const prefix=payload.slice(0,-alias.length);
  const target=prefix.replace(/^(?:请)?(?:和|跟|找|邀请)/,'').replace(/(?:一起|过来|进行|来)$/,'');
  return {type:'pair',kind,...(target&&target!=='请'?{target}: {})};
 }
 const invite=/^邀请(.+?)(?:过来玩|来房间|来玩|过来)?$/.exec(payload);
 if(invite)return {type:'invite',target:invite[1]};
 return {type:'action',name:payload.replace(/^播放(?:动作)?[:：]?/,'')};
}
export function chooseCommandOpportunity(command:PetCommand,choices:BehaviorOpportunity[]):BehaviorOpportunity|undefined {
 let candidates=choices.filter(o=>command.type==='pair'?o.kind===command.kind:
  command.type==='harvest'?o.behavior==='harvest':command.type==='invite'?(o.id.startsWith('friend:')||o.id.startsWith('local:')&&o.kind==='tea'):false);
 if(command.type==='pair'&&command.target||command.type==='invite'){
  const target=commandName(command.target!);
  candidates=candidates.filter(o=>[o.targetName,...o.targetAliases??[]].some(n=>n&&commandName(n)===target));
 }
 // Prefer an actual visible peer. Never substitute a different named partner.
 candidates.sort((a,b)=>Number(b.id.startsWith('pair:'))-Number(a.id.startsWith('pair:')));
 if('target' in command&&command.target){
  const family=candidates[0]?.id.split(':')[0];
  if(new Set(candidates.filter(o=>o.id.split(':')[0]===family).map(o=>o.target)).size>1)throw Error('有多个同名对象，请先给角色设置不同名字。');
 }
 return candidates[0];
}
