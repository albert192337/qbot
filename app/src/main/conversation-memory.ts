export interface ConversationLine { at: number; role: 'user' | 'assistant'; source: 'chat' | 'auto'; text: string }
const memories = new Map<string, ConversationLine[]>();
const chatting = new Set<string>();
let revision = 0;
export function conversationRevision(): number { return revision; }
let persist: ((character: string, line: ConversationLine) => void) | undefined;
export function configureConversationMemory(saved: Record<string, ConversationLine[]>, sink: typeof persist): void {
  memories.clear();
  for (const [id, lines] of Object.entries(saved)) memories.set(id, lines.slice(-40));
  persist = sink;
}
export function clearConversationMemory(): void { memories.clear(); revision++; }
export function rememberConversation(character: string, line: ConversationLine): void {
  memories.set(character, [...conversationFor(character, line.at), line].slice(-40));
  persist?.(character, line);
}
export function conversationFor(character: string, now = Date.now()): ConversationLine[] {
  return (memories.get(character) ?? []).filter(line => now - line.at < 86400000).map(line => ({ ...line }));
}
export function setChatting(character: string, active: boolean): void { if (active) chatting.add(character); else chatting.delete(character); }
export function isChatting(character:string):boolean {return chatting.has(character);}
export function lastUserAt(character: string): number | undefined {
  return conversationFor(character).filter(line => line.role === 'user').at(-1)?.at;
}
export function shouldPauseAutomatic(character: string, now = Date.now()): boolean {
  const last = conversationFor(character, now).filter(line => line.source === 'chat').at(-1)?.at;
  return chatting.has(character) || (last !== undefined && now - last < 120000);
}

/** 主动文字预算独立于动作/思考频率；用实际发送且持久化的记录恢复。 */
export function automaticSpeechBudget(lines: ConversationLine[], now = Date.now()): { allowed: boolean; unanswered: number; nextAt: number } {
  const recent = lines.filter(line => line.at <= now && now - line.at < 86400000);
  const lastUser = recent.filter(line => line.role === 'user').at(-1)?.at ?? -Infinity;
  const automatic = recent.filter(line => line.role === 'assistant' && line.source === 'auto');
  const unanswered = automatic.filter(line => line.at > lastUser).length;
  const last = automatic.at(-1)?.at;
  const nextAt = last === undefined ? 0 : last + 3 * 60000;
  return { allowed: now >= nextAt, unanswered, nextAt };
}
