import { expect, it, vi } from 'vitest';
import { chatComplete } from '../src/main/llm-client';
it('single-frame vision is sent as an image part but never copied to request traces', async () => {
  const trace=vi.fn(), fetchImpl=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:'画面描述'}}]})));
  await chatComplete({apiKey:'test',messages:[{role:'system',content:'只描述画面'}],imageUrl:'data:image/png;base64,private-frame',onTrace:trace,fetchImpl:fetchImpl as typeof fetch});
  const body=JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
  expect(body.messages.at(-1).content[1].image_url.url).toContain('private-frame');
  expect(JSON.stringify(trace.mock.calls)).not.toContain('private-frame');
});
it('完整记录请求体和响应体（含供应商返回的思考字段），不记录认证头', async () => {
  const trace = vi.fn();
  const response = JSON.stringify({ choices: [{ message: { content: '{"do":false}', reasoning_content: '返回的思考'.repeat(300) } }] });
  const result = await chatComplete({ apiKey: 'secret-test-key', messages: [{ role: 'user', content: '输入'.repeat(500) }], onTrace: trace, fetchImpl: vi.fn(async () => new Response(response, { status: 200 })) as typeof fetch });
  expect(result).toBe('{"do":false}');
  expect(trace.mock.calls[1]).toEqual(['HTTP 响应 200', response]);
  expect(JSON.stringify(trace.mock.calls)).not.toContain('secret-test-key');
});
