import { afterEach, expect, it, vi } from 'vitest';
import { leavePetMessage, getPetMessage, clearPetMessage, onPetMessageChanged } from '../src/main/pet-message';
import { parseBrainResponse } from '../src/main/brain-llm-rules';
import { parseChatReply } from '../src/main/pet-chat-rules';
import { MESSAGE_DURATION_MS } from '../src/shared/pet-message';
afterEach(() => { clearPetMessage(); vi.useRealTimers(); });
it('模型可以仅留言；不行动和非法留言不会产生牌面', () => {
  expect(parseBrainResponse('{"do":true,"message":"别熬太晚"}', [])).toMatchObject({ do: true, message: '别熬太晚' });
  expect(parseBrainResponse('{"do":false,"message":"别熬太晚"}', [])).not.toHaveProperty('message');
  expect(parseBrainResponse('{"do":true,"message":{}}', [])).toMatchObject({ do: false });
  expect(parseChatReply('{"say":["好呀"],"message":"约好早点睡"}', [])).toMatchObject({ message: '约好早点睡', lines: ['好呀'] });
});
it('留言限24字符，重复不续期，到期发布清除，旧计时器不会清掉新留言', () => {
  vi.useFakeTimers();
  const publish = vi.fn(); onPetMessageChanged(publish);
  leavePetMessage('🌱'.repeat(30), 'a');
  expect(Array.from(getPetMessage()!.text)).toHaveLength(24);
  const firstExpiry = getPetMessage()!.expiresAt;
  vi.advanceTimersByTime(1000);
  leavePetMessage('🌱'.repeat(30), 'a');
  expect(getPetMessage()!.expiresAt).toBe(firstExpiry);
  leavePetMessage('新留言', 'a');
  vi.advanceTimersByTime(MESSAGE_DURATION_MS - 1000);
  expect(getPetMessage()?.text).toBe('新留言');
  vi.advanceTimersByTime(1000);
  expect(getPetMessage()).toBeNull();
  expect(publish).toHaveBeenLastCalledWith(null);
});
it('空留言保留旧牌，显式收起立即清除', () => {
  leavePetMessage('早点睡'); leavePetMessage('');
  expect(getPetMessage()?.text).toBe('早点睡');
  clearPetMessage(); expect(getPetMessage()).toBeNull();
});
