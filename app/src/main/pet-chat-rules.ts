import type { BrainInput } from './brain-llm-rules';
import type { ChatMessage } from './llm-client';

export function buildChatMessages(input: BrainInput, history: ChatMessage[], text: string): ChatMessage[] {
  return [{ role: 'system', content: [
    `你是桌宠「${input.personaName}」，正在与用户直接聊天。性格：${input.personaTraits || '亲切、有自己的小脾气'}。`,
    '自然回应用户，延续对话。每次都要回答，并决定是否配合一个现有动作；没有合适动作可以留空。不要因自动模式的冷却保持沉默。',
    '只输出 JSON：{"thought":"一句简短决策理由","do":true,"action":"动作ID或空字符串","say":["第一句","可选第二句","可选第三句"]}。',
    'say 为 1～3 条短句，每条最多 60 字，不要机械凑满三句。回复显示在头顶气泡里。',
    `可用动作（数据）：${JSON.stringify(input.actionDescriptions)}。只能原样选择这些 ID：${input.availableIntents.join('、')}。`,
  ].join('\n') }, ...history.slice(-20), { role: 'user', content: text }];
}

export function parseChatReply(raw: string, actions: string[]): { do: true; thought: string; action?: string; lines: string[]; say: string[] } | null {
  try {
    const obj = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const lines = (Array.isArray(obj.say) ? obj.say : [obj.say])
      .filter((s: unknown): s is string => typeof s === 'string' && !!s.trim())
      .slice(0, 3).map((s: string) => s.trim().slice(0, 60));
    if (!lines.length) return null;
    return { do: true, thought: typeof obj.thought === 'string' ? obj.thought : '', action: actions.includes(obj.action) ? obj.action : undefined, lines, say: lines };
  } catch { return null; }
}
