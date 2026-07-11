/**
 * gpt-image-2 生图后端（aiartmirror，OpenAI images 兼容）。
 * - 有参考图 → POST /images/edits（multipart/form-data）；无 → POST /images/generations（JSON）
 * - 同步接口极慢（实测单张 1024 约 288s），Node fetch 默认 300s headersTimeout 会掐在门口
 *   → 自带 node:https 传输层，超时 420s；httpImpl 可注入（单测全 mock，不花钱）
 * - 重试：仅普通 5xx/网络错误退避重试 2 次；4xx 与 503 model_not_found 永久失败不重试
 * - 响应是 b64_json 内嵌（单张 ~3.6MB），截断的 JSON 视为可重试的传输错误
 */
import { request as httpsRequest } from 'node:https';
import { randomUUID } from 'node:crypto';
import type { GenerateImageOpts } from './ark.js';
import { ArkApiError, DEFAULTS, type PipelineConfig } from './types.js';

/** 注入点：POST 一个 body，拿回状态码和完整响应体 */
export type HttpPost = (
  url: string,
  headers: Record<string, string>,
  body: Buffer,
) => Promise<{ status: number; body: Buffer }>;

const TIMEOUT_MS = 900_000; // 1536x1024 实测可能远超 1024 的 288s；420s 会掐在半路（2026-07-11 实翻车）
const RETRY_DELAYS_MS = [2000, 8000];
/** 服务端同账号疑似串行处理，并发挂太多只会占着连接排队直到超时 → 客户端限流 */
const MAX_CONCURRENT = 2;

/** gpt-image 尺寸白名单只有 1024/1536 系；管线内部尺寸按长宽比就近映射 */
const SIZE_MAP: Record<GenerateImageOpts['size'], string> = {
  '3072x1536': '1536x1024',
  '2048x2048': '1024x1024',
};

const httpsPost: HttpPost = (url, headers, body) =>
  new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: 'POST', headers, timeout: TIMEOUT_MS }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }),
      );
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`timeout after ${TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.end(body);
  });

/** data URL → PNG Buffer（管线的参考图统一走 data URL） */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) {
    throw new ArkApiError('invalid ref image data URL', 0, false);
  }
  return Buffer.from(dataUrl.slice(comma + 1), 'base64');
}

/** 手搓 multipart（传输层是裸 https，没有 FormData 自动序列化） */
function buildMultipart(
  fields: Record<string, string>,
  file: { field: string; filename: string; data: Buffer; mime: string },
): { contentType: string; body: Buffer } {
  const boundary = `----qbot-${randomUUID()}`;
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: ${file.mime}\r\n\r\n`,
    ),
    file.data,
    Buffer.from('\r\n'),
  );
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(parts),
  };
}

export function createGptImageGenerator(
  cfg: PipelineConfig,
  httpImpl: HttpPost = httpsPost,
): (opts: GenerateImageOpts) => Promise<Buffer> {
  const baseUrl = cfg.gptImageBaseUrl ?? DEFAULTS.gptImageBaseUrl;
  const apiKey = cfg.gptImageApiKey;
  if (!apiKey) {
    throw new ArkApiError('gpt-image-2 requires gptImageApiKey', 0, false);
  }

  // 简易信号量：每次 HTTP 尝试占一个槽（退避等待期间让出）
  let running = 0;
  const waiters: Array<() => void> = [];
  async function acquire(): Promise<void> {
    while (running >= MAX_CONCURRENT) {
      await new Promise<void>((r) => waiters.push(r));
    }
    running++;
  }
  function release(): void {
    running--;
    waiters.shift()?.();
  }

  async function post(
    url: string,
    headers: Record<string, string>,
    body: Buffer,
  ): Promise<Buffer> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
      }
      let res: { status: number; body: Buffer };
      await acquire();
      try {
        res = await httpImpl(url, { Authorization: `Bearer ${apiKey}`, ...headers }, body);
      } catch (err) {
        lastErr = err; // 网络错误/超时 → 重试
        continue;
      } finally {
        release();
      }
      const text = res.body.toString('utf8');
      if (res.status >= 200 && res.status < 300) {
        let json: { data?: Array<{ b64_json?: string }> };
        try {
          json = JSON.parse(text);
        } catch {
          // 200 但 JSON 截断（实测超时过短时会发生）→ 当传输错误重试
          lastErr = new ArkApiError('truncated JSON response', res.status, true);
          continue;
        }
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) throw new ArkApiError('image response missing b64_json', res.status, false);
        return Buffer.from(b64, 'base64');
      }
      // 503 model_not_found 是永久错误（模型名只能 gpt-image-2），重试无意义
      if (res.status >= 500 && !text.includes('model_not_found')) {
        lastErr = new ArkApiError(`HTTP ${res.status}: ${text.slice(0, 300)}`, res.status, true);
        continue;
      }
      throw new ArkApiError(`HTTP ${res.status}: ${text.slice(0, 300)}`, res.status, false);
    }
    if (lastErr instanceof ArkApiError) throw lastErr;
    throw new ArkApiError(`gpt-image error after retries: ${String(lastErr)}`, 0, true);
  }

  return async (opts) => {
    const model = DEFAULTS.gptImageModel;
    const size = SIZE_MAP[opts.size];
    if (opts.refImageDataUrl) {
      const { contentType, body } = buildMultipart(
        { model, prompt: opts.prompt, n: '1', size },
        {
          field: 'image',
          filename: 'ref.png',
          data: dataUrlToBuffer(opts.refImageDataUrl),
          mime: 'image/png',
        },
      );
      return post(`${baseUrl}/images/edits`, { 'Content-Type': contentType }, body);
    }
    return post(
      `${baseUrl}/images/generations`,
      { 'Content-Type': 'application/json' },
      Buffer.from(JSON.stringify({ model, prompt: opts.prompt, n: 1, size })),
    );
  };
}
