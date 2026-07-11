/**
 * gpt-image-2 生图后端单测（httpImpl 全 mock，不花钱）：
 * - 无参考图 → /images/generations JSON；有参考图 → /images/edits multipart
 * - 尺寸映射：3072x1536→1536x1024，2048x2048→1024x1024
 * - 重试策略：普通 5xx 重试；4xx / 503 model_not_found / 截断 JSON 按各自语义处理
 */
import { describe, expect, it, vi } from 'vitest';
import { createGptImageGenerator, type HttpPost } from '../src/gpt-image.js';
import { ArkApiError } from '../src/types.js';

const CFG = { apiKey: 'ark-x', gptImageApiKey: 'sk-test' };
const PNG = Buffer.from('89504e470d0a1a0a', 'hex'); // PNG magic
const DATA_URL = `data:image/png;base64,${PNG.toString('base64')}`;

function okResponse(b64 = Buffer.from('img').toString('base64')) {
  return {
    status: 200,
    body: Buffer.from(JSON.stringify({ data: [{ b64_json: b64 }] })),
  };
}

describe('gpt-image', () => {
  it('无参考图 → generations JSON，带鉴权与尺寸映射', async () => {
    const http = vi.fn<HttpPost>().mockResolvedValue(okResponse());
    const gen = createGptImageGenerator(CFG, http);
    const buf = await gen({ prompt: 'p', size: '2048x2048' });
    expect(buf.toString()).toBe('img');
    const [url, headers, body] = http.mock.calls[0];
    expect(url).toBe('https://www.aiartmirror.com/v1/images/generations');
    expect(headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(body.toString())).toEqual({
      model: 'gpt-image-2',
      prompt: 'p',
      n: 1,
      size: '1024x1024',
    });
  });

  it('有参考图 → edits multipart，含 PNG 字节与字段', async () => {
    const http = vi.fn<HttpPost>().mockResolvedValue(okResponse());
    const gen = createGptImageGenerator(CFG, http);
    await gen({ prompt: '三视图', size: '3072x1536', refImageDataUrl: DATA_URL });
    const [url, headers, body] = http.mock.calls[0];
    expect(url).toBe('https://www.aiartmirror.com/v1/images/edits');
    expect(headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
    const text = body.toString('latin1');
    expect(text).toContain('name="size"\r\n\r\n1536x1024');
    expect(text).toContain('name="model"\r\n\r\ngpt-image-2');
    expect(text).toContain('filename="ref.png"');
    expect(body.includes(PNG)).toBe(true);
  });

  it('普通 5xx → 退避重试后成功', async () => {
    const http = vi
      .fn<HttpPost>()
      .mockResolvedValueOnce({ status: 500, body: Buffer.from('oops') })
      .mockResolvedValueOnce(okResponse());
    const gen = createGptImageGenerator(CFG, http);
    const promise = gen({ prompt: 'p', size: '2048x2048' });
    // 真实退避 2s，测试直接等（vitest fake timer 会和 await 纠缠，用真实短等待更稳）
    await expect(promise).resolves.toBeInstanceOf(Buffer);
    expect(http).toHaveBeenCalledTimes(2);
  }, 15_000);

  it('503 model_not_found → 永久失败不重试', async () => {
    const http = vi.fn<HttpPost>().mockResolvedValue({
      status: 503,
      body: Buffer.from('{"error":{"code":"model_not_found"}}'),
    });
    const gen = createGptImageGenerator(CFG, http);
    await expect(gen({ prompt: 'p', size: '2048x2048' })).rejects.toThrow(ArkApiError);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('4xx → 不重试直接抛', async () => {
    const http = vi.fn<HttpPost>().mockResolvedValue({
      status: 422,
      body: Buffer.from('{"error":"bad_size"}'),
    });
    const gen = createGptImageGenerator(CFG, http);
    await expect(gen({ prompt: 'p', size: '2048x2048' })).rejects.toThrow(/422/);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('200 但 JSON 截断 → 视为传输错误重试', async () => {
    const http = vi
      .fn<HttpPost>()
      .mockResolvedValueOnce({ status: 200, body: Buffer.from('{"data":[{"b64_js') })
      .mockResolvedValueOnce(okResponse());
    const gen = createGptImageGenerator(CFG, http);
    await expect(gen({ prompt: 'p', size: '2048x2048' })).resolves.toBeInstanceOf(Buffer);
    expect(http).toHaveBeenCalledTimes(2);
  }, 15_000);

  it('未配置 gptImageApiKey → 构造即抛', () => {
    expect(() => createGptImageGenerator({ apiKey: 'ark-x' })).toThrow(/gptImageApiKey/);
  });
});
