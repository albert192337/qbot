/**
 * 极简 Ark chat/completions 客户端（自由模式 LLM 脑用）。
 *
 * 刻意不碰 pipeline/src/ark.ts：那个 client 绑着生图/视频/视觉打标的重配置，
 * 这里只要纯文本对话。fetch 可注入 → 单测全 mock，不花钱。
 *
 * 端点/模型与 pipeline DEFAULTS 同源（plan 端点），key 走 settings.arkApiKey。
 */

export const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3';
/** 自由模式用最便宜档（输入 ¥0.2/M、输出 ¥2/M），延迟低；桌宠即兴反应够用 */
export const BRAIN_MODEL = 'doubao-seed-2-0-mini-260428';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOpts {
  apiKey: string;
  messages: ChatMessage[];
  /** 采样温度：桌宠即兴要一点变化，默认 0.8 */
  temperature?: number;
  /** 超时 ms，默认 20s（桌宠反应不能等太久） */
  timeoutMs?: number;
  baseUrl?: string;
  model?: string;
  /** 测试注入 */
  fetchImpl?: typeof fetch;
}

export class LlmError extends Error {
  constructor(
    message: string,
    /** 是否值得重试（网络/429/5xx）；4xx 内容/参数错误不重试 */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

/** 单次 chat/completions，返回助手回复纯文本。网络错误/超时/5xx 抛 retryable 错误。 */
export async function chatComplete(opts: ChatOpts): Promise<string> {
  const {
    apiKey,
    messages,
    temperature = 0.8,
    timeoutMs = 20_000,
    baseUrl = ARK_BASE_URL,
    model = BRAIN_MODEL,
    fetchImpl = globalThis.fetch,
  } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new LlmError(
      err instanceof Error ? `network: ${err.message}` : 'network error',
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const retryable = res.status === 429 || res.status >= 500;
    throw new LlmError(`HTTP ${res.status}: ${body.slice(0, 300)}`, retryable);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new LlmError('response missing message content', false);
  }
  return text;
}

/** 带一次重试的 chat（仅 retryable 错误重试一次，间隔 2s） */
export async function chatCompleteWithRetry(opts: ChatOpts): Promise<string> {
  try {
    return await chatComplete(opts);
  } catch (err) {
    if (err instanceof LlmError && err.retryable) {
      await new Promise((r) => setTimeout(r, 2_000));
      return chatComplete(opts);
    }
    throw err;
  }
}
