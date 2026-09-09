import { getSettings } from './config';
import { buildInput } from './brain-llm';
import { BRAIN_MODEL, chatCompleteWithRetry, type ChatMessage } from './llm-client';
import { beginBrainCall, updateBrainCall } from './brain-log';
import { execute } from './behavior-executor';
import { buildChatMessages, parseChatReply } from './pet-chat-rules';

const histories = new Map<string, ChatMessage[]>();
let busy = false;
/** 主动对话独立于自由模式和自动思考冷却；同一时刻仅接受一条。 */
export async function sendPetChat(text: unknown): Promise<{ ok: boolean; error?: string }> {
  if (typeof text !== 'string' || !text.trim() || text.length > 1000) return { ok: false, error: '请输入 1～1000 字。' };
  if (busy) return { ok: false, error: '正在回复上一句话，请稍等。' };
  busy = true;
  let traceId: string | undefined;
  try {
    const settings = await getSettings();
    if (!settings.arkApiKey) return { ok: false, error: '请先在设置中配置 LLM API Key。' };
    const character = settings.activeCharacter ?? 'default';
    const input = await buildInput();
    const history = histories.get(character) ?? [];
    const messages = buildChatMessages(input, history, text.trim());
    traceId = await beginBrainCall('chat');
    await updateBrainCall(traceId, '用户聊天请求', { input: { model: BRAIN_MODEL, messages } });
    const raw = await chatCompleteWithRetry({ apiKey: settings.arkApiKey, messages,
      onTrace: (stage, detail) => { void updateBrainCall(traceId, stage, {}, detail); },
    });
    await updateBrainCall(traceId, '收到原始输出', { raw });
    const decision = parseChatReply(raw, input.availableIntents);
    if (!decision) throw new Error('回复格式不完整，请重试。');
    await updateBrainCall(traceId, '聊天动作决策', { decision });
    if ((await getSettings()).activeCharacter !== settings.activeCharacter) throw new Error('角色已切换，请与当前角色重新对话。');
    const latest = await buildInput();
    if (decision.action && !latest.availableIntents.includes(decision.action)) decision.action = undefined;
    histories.set(character, [...history, { role: 'user', content: text.trim() }, { role: 'assistant', content: JSON.stringify(decision) }].slice(-20) as ChatMessage[]);
    execute({ meta: { id: 'llm-chat', source: 'llm', priority: 100, reason: '用户主动聊天', traceId },
      steps: [...decision.lines.map(line => ({ op: 'say' as const, text: line })),
        ...(decision.action ? [{ op: 'play' as const, action: decision.action, loops: 1 }] : [])] });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateBrainCall(traceId, '聊天失败', {}, message);
    return { ok: false, error: message };
  } finally { busy = false; }
}
