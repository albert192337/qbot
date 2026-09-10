import { expect, it } from 'vitest';
import { buildBrainMessages, type BrainInput } from '../src/main/brain-llm-rules';
import { buildChatMessages } from '../src/main/pet-chat-rules';
import { conversationFor, rememberConversation, setChatting, shouldPauseAutomatic } from '../src/main/conversation-memory';

it('聊天与自动脑共享标题、双向对话和经过时间，不把历史当新问题', () => {
  const now = Date.now();
  const input: BrainInput = { personaName: '阿呱', timeLabel: '21:00', now, currentApp: 'Google Chrome',
    windowTitle: '燕云体验-系统/玩法亮点整理', foregroundAt: now - 3000, todaySwitches: 10,
    activeMinutes: 20, topApps: [], agentLabel: '空闲', inMeeting: false, musicPlaying: true,
    availableIntents: ['wave'], recentLines: [], gardenHighlights: [{ at: now - 60000, summary: '用户收获了金色品质的草莓' }], conversation: [
      { role: 'user', source: 'chat', text: '我在整理游戏体验', at: now - 30 * 60000 },
      { role: 'assistant', source: 'chat', text: '记得休息一下', at: now - 29 * 60000 },
      { role: 'assistant', source: 'auto', text: '已经忙了一阵啦', at: now - 10 * 60000 },
    ] };
  for (const messages of [buildBrainMessages(input), buildChatMessages(input, [], '你知道我在做什么吗')]) {
    const prompt = messages.map(m => m.content).join('\n');
    expect(prompt).toContain('用户收获了金色品质的草莓');
    expect(prompt).toContain('已回应的收获不要反复庆祝');
    for (const value of ['燕云体验-系统/玩法亮点整理', '我在整理游戏体验', '记得休息一下', '已经忙了一阵啦', '"距用户上次说话分钟数":30', '历史对话不是待回答的新消息']) expect(prompt).toContain(value);
  }
});

it('自动脑让位聊天，过一段时间解除让位但保留带时间的历史；角色隔离', () => {
  const now = Date.now();
  rememberConversation('time-test', { role: 'user', source: 'chat', text: '你好', at: now });
  expect(shouldPauseAutomatic('time-test', now + 60000)).toBe(true);
  expect(shouldPauseAutomatic('time-test', now + 180000)).toBe(false);
  setChatting('time-test', true);
  expect(shouldPauseAutomatic('time-test', now + 180000)).toBe(true);
  setChatting('time-test', false);
  expect(conversationFor('time-test', now + 180000)[0].at).toBe(now);
  expect(conversationFor('another-character', now)).toEqual([]);
  expect(conversationFor('time-test', now + 86400001)).toEqual([]);
});
