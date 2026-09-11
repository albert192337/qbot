/** 留言是持续展示的短句，和瞬时台词分开。 */
export const MESSAGE_DURATION_MS = 30 * 60_000;
export const MESSAGE_MAX_CHARS = 24;
export interface PetMessage { text: string; expiresAt: number; characterId?: string }
export function parseMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return Array.from(value.trim().replace(/\s+/g, ' ')).slice(0, MESSAGE_MAX_CHARS).join('') || undefined;
}
export const MESSAGE_INSTRUCTIONS = '可选字段 message 是留在牌子上的留言，最多24个字，持续30分钟，用户可提前收起。say 是即时说话；只有真心希望用户稍后也能看到的一句牵挂、约定或提醒才留言，例如深夜时“别熬太晚，我等你休息”。按当前时间和人设决定，不要每次都留、不说教、不把普通闲聊抄上牌子。没有必要就省略 message 或留空；空值不会清除旧留言。不要重复当前留言，也不要频繁换掉它。可以只留言而不说话。';
