import { describe, expect, it } from 'vitest';
import { buildChatMessages, parseChatReply } from '../src/main/pet-chat-rules';
import type { BrainInput } from '../src/main/brain-llm-rules';
describe('主动聊天', () => {
  it('只允许真实动作且最多三条气泡', () => {
    const reply = parseChatReply(JSON.stringify({ action: 'newDance', say: ['第一句', '第二句', '第三句', '第四句'] }), ['newDance']);
    expect(reply?.action).toBe('newDance');
    expect(reply?.lines).toEqual(['第一句', '第二句', '第三句']);
    expect(parseChatReply('{"say":"你好","action":"invented"}', [])?.action).toBeUndefined();
  });
  it('解析失败不伪造嗯或成功', () => {
    expect(parseChatReply('服务器异常', [])).toBeNull();
    expect(parseChatReply('{"do":false,"say":[]}', [])).toBeNull();
  });
  it('输入和最近对话作为消息传递，动作取当前角色', () => {
    const input = { personaName: '阿呱', availableIntents: ['newDance'], actionDescriptions: [{ id: 'newDance', description: '新舞蹈' }] } as BrainInput;
    const messages = buildChatMessages(input, [{ role: 'user', content: '我叫小刘' }, { role: 'assistant', content: '你好小刘' }], '记得我吗？');
    expect(messages.map(m => m.content)).toContain('我叫小刘');
    expect(messages.at(-1)?.content).toBe('记得我吗？');
    expect(messages[0].content).toContain('newDance');
  });
});
