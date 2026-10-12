import { EXPRESSION_INSTRUCTIONS, parseExpression, type PetExpression } from '../shared/pet-expression';
import type { BrainInput } from './brain-llm-rules';
import { MESSAGE_INSTRUCTIONS, parseMessage } from '../shared/pet-message';
import type { ChatMessage } from './llm-client';
import { formatBrainContext } from './brain-context';
import { idleInstructions,parseIdleDecision,type IdleDecision } from '../shared/idle-plan';
import {interactionInstructions,selectedBehavior} from '../shared/interaction-behaviors';

export function buildChatMessages(input: BrainInput, history: ChatMessage[], text: string): ChatMessage[] {
  return [{ role: 'system', content: [
    MESSAGE_INSTRUCTIONS,
    EXPRESSION_INSTRUCTIONS,
    '聊天可用say回应，也可只做行为或提出授权申请。message仅为可选额外留言。',
    input.currentMessage ? `当前留言（数据）：${JSON.stringify(input.currentMessage)}` : '当前没有留言。',
    idleInstructions(input.idleCandidates,input.idlePlan),
    interactionInstructions(input.behaviorOpportunities,input.desktopObjects,'用户本次聊天'),
    `你是桌宠「${input.personaName}」，正在与用户直接聊天。性格：${input.personaTraits || '亲切、有自己的小脾气'}。`,
    '自然回应用户，延续对话，并判断是否执行现有行为。没有合适动作可以留空。不要因自动模式的冷却拒绝用户要求。',
    '只输出 JSON：{"thought":"一句简短决策理由","do":true,"behavior":"本次行为机会id或空字符串","action":"即时动作ID或空字符串","expression":"speech或thought","say":[],"idleAction":"接下来待机ID或空字符串","idleMinutes":5}。',
    'say为0～3条短句，每条最多60字。选择behavior时say必须为空，已有授权窗不重复配一句流程说明。',
    `可用动作（数据）：${JSON.stringify(input.actionDescriptions)}。只能原样选择这些 ID：${input.availableIntents.join('、')}。`,
    formatBrainContext(input),
  ].join('\n') }, ...history.slice(-20), { role: 'user', content: text }];
}

export function parseChatReply(raw: string, actions: string[],idleCandidates:string[]=[],allowedBehaviors:string[]=[]): ({ do: true; behavior?:string; expression?: PetExpression; thought: string; action?: string; message?: string; lines: string[]; say: string[] } & IdleDecision) | null {
  try {
    const obj = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const lines = (Array.isArray(obj.say) ? obj.say : [obj.say])
      .filter((s: unknown): s is string => typeof s === 'string' && !!s.trim())
      .slice(0, 3).map((s: string) => s.trim().slice(0, 60));
    const behavior=selectedBehavior(obj.behavior,allowedBehaviors);
    if(behavior)return {do:true,behavior,thought:typeof obj.thought==='string'?obj.thought:'',lines:[],say:[]};
    if (!lines.length&&!actions.includes(obj.action)&&!obj.message&&!obj.idleAction&&obj.do!==false) return null;
    const message = parseMessage(obj.message);
    return { do: true, ...(parseExpression(obj.expression) === 'thought' ? { expression: 'thought' as const } : {}), thought: typeof obj.thought === 'string' ? obj.thought : '', action: actions.includes(obj.action) ? obj.action : undefined, lines, say: lines,...(message ? { message } : {}),...parseIdleDecision(obj,idleCandidates) };
  } catch { return null; }
}
