import { expect, it, vi } from 'vitest';
import { chatComplete } from '../src/main/llm-client';
it('完整记录请求体和响应体（含供应商返回的思考字段），不记录认证头', async () => {
  const trace = vi.fn();
  const response = JSON.stringify({ choices: [{ message: { content: '{"do":false}', reasoning_content: '返回的思考'.repeat(300) } }] });
  const result = await chatComplete({ apiKey: 'secret-test-key', messages: [{ role: 'user', content: '输入'.repeat(500) }], onTrace: trace, fetchImpl: vi.fn(async () => new Response(response, { status: 200 })) as typeof fetch });
  expect(result).toBe('{"do":false}');
  expect(trace.mock.calls[1]).toEqual(['HTTP 响应 200', response]);
  expect(JSON.stringify(trace.mock.calls)).not.toContain('secret-test-key');
});
