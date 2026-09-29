import { expect, it } from 'vitest';
import { parseBrainResponse } from '../src/main/brain-llm-rules';
import { parseChatReply } from '../src/main/pet-chat-rules';
import { validateScript } from '../src/shared/behavior-dsl';
it('主动与聊天都可选择思考，展示文字和日记分离', () => {
 const raw = JSON.stringify({ do: true, thought: '日记内容', say: '今天想陪着他慢慢过。', expression: 'thought' });
 expect(parseBrainResponse(raw, [])).toMatchObject({ do: true, expression: 'thought', say: '今天想陪着他慢慢过。' });
 expect(parseChatReply(raw, [])).toMatchObject({ expression: 'thought', lines: ['今天想陪着他慢慢过。'] });
 expect(parseBrainResponse(JSON.stringify({ do: false, thought: '只写日记', expression: 'thought' }), [])).toEqual({ do: false, thought: '只写日记' });
});
it('旧输出与非法表达方式按普通说话兼容，脚本拒绝非法类型', () => {
 expect(parseChatReply('{"say":"你好","expression":"invalid"}', [])?.expression).toBeUndefined();
 expect(validateScript({ meta: { id: 'a', priority: 1 }, steps: [{ op: 'say', text: '你好', expression: 'invalid' }] }).ok).toBe(false);
});
