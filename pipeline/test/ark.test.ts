import { describe, expect, it, vi } from 'vitest';
import { createArkClient } from '../src/ark.js';
import { ArkApiError, type PipelineConfig } from '../src/types.js';

const CFG: PipelineConfig = { apiKey: 'test-key', baseUrl: 'https://ark.test/api/v3' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ark client', () => {
  it('generateImage 正常返回 buffer 并带 Bearer 头', async () => {
    const png = Buffer.from('fake-png');
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://ark.test/api/v3/images/generations');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
      const body = JSON.parse(init?.body as string);
      expect(body.watermark).toBe(false);
      expect(body.response_format).toBe('b64_json');
      return jsonResponse({ data: [{ b64_json: png.toString('base64') }] });
    });
    const ark = createArkClient(CFG, fetchMock as unknown as typeof fetch);
    const buf = await ark.generateImage({ prompt: 'p', size: '2048x2048' });
    expect(buf.equals(png)).toBe(true);
  });

  it('5xx 指数退避重试后成功', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls < 3) return jsonResponse({ error: 'busy' }, 503);
      return jsonResponse({ data: [{ b64_json: Buffer.from('x').toString('base64') }] });
    });
    const ark = createArkClient(CFG, fetchMock as unknown as typeof fetch);
    const p = ark.generateImage({ prompt: 'p', size: '2048x2048' });
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBeDefined();
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  it('4xx 不重试直接抛 ArkApiError(retryable=false)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'content policy' }, 400));
    const ark = createArkClient(CFG, fetchMock as unknown as typeof fetch);
    await expect(ark.generateImage({ prompt: 'p', size: '2048x2048' })).rejects.toSatisfy(
      (e: unknown) => e instanceof ArkApiError && !e.retryable && e.status === 400,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('submitVideoTask 传同一帧作 first/last frame', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      const images = body.content.filter((c: { type: string }) => c.type === 'image_url');
      expect(images).toHaveLength(2);
      expect(images[0].role).toBe('first_frame');
      expect(images[1].role).toBe('last_frame');
      expect(images[0].image_url.url).toBe(images[1].image_url.url);
      return jsonResponse({ id: 'cgt-123' });
    });
    const ark = createArkClient(CFG, fetchMock as unknown as typeof fetch);
    const id = await ark.submitVideoTask({ prompt: 'p', frameDataUrl: 'data:image/png;base64,x' });
    expect(id).toBe('cgt-123');
  });

  it('getVideoTask 解析状态与 video_url', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toBe('https://ark.test/api/v3/contents/generations/tasks/cgt-123');
      return jsonResponse({ status: 'succeeded', content: { video_url: 'https://v.test/a.mp4' } });
    });
    const ark = createArkClient(CFG, fetchMock as unknown as typeof fetch);
    const t = await ark.getVideoTask('cgt-123');
    expect(t.status).toBe('succeeded');
    expect(t.videoUrl).toBe('https://v.test/a.mp4');
  });
});
