/**
 * Ark API 薄封装（Seedream 图生图 + Seedance i2v 异步任务）。
 * - fetchImpl 可注入：单测全 mock，不花钱。
 * - 重试策略内置：网络错误/429/5xx 指数退避 ×3；4xx（含内容审核拒绝）不重试。
 * - 轮询节奏由 stages 层控制，这里只提供单次 getVideoTask（断点续跑需要）。
 */
import { writeFile } from 'node:fs/promises';
import {
  ArkApiError,
  DEFAULTS,
  type PipelineConfig,
} from './types.js';

export interface GenerateImageOpts {
  prompt: string;
  /** data URL（base64）；三视图阶段传用户参考图，首帧阶段传选定三视图 */
  refImageDataUrl?: string;
  size: '3072x1536' | '2048x2048';
}

export interface VideoTaskStatus {
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  videoUrl?: string;
  error?: string;
}

export interface ArkClient {
  generateImage(opts: GenerateImageOpts): Promise<Buffer>;
  /** 返回 taskId。frame 同时作 first_frame 和 last_frame（循环靠生成层保证） */
  submitVideoTask(opts: { prompt: string; frameDataUrl: string }): Promise<string>;
  getVideoTask(taskId: string): Promise<VideoTaskStatus>;
  downloadVideo(url: string, destPath: string): Promise<void>;
}

const RETRY_DELAYS_MS = [1000, 4000, 16000];

export function createArkClient(
  cfg: PipelineConfig,
  fetchImpl: typeof fetch = globalThis.fetch,
): ArkClient {
  const baseUrl = cfg.baseUrl ?? DEFAULTS.baseUrl;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey}`,
  };

  /** 带指数退避的 fetch：仅网络错误/429/5xx 重试 */
  async function request(url: string, init: RequestInit): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
      }
      let res: Response;
      try {
        res = await fetchImpl(url, init);
      } catch (err) {
        lastErr = err; // 网络错误 → 重试
        continue;
      }
      if (res.ok) return res;
      const body = await res.text().catch(() => '');
      if (res.status === 429 || res.status >= 500) {
        lastErr = new ArkApiError(`HTTP ${res.status}: ${body}`, res.status, true);
        continue;
      }
      // 4xx：内容审核拒绝、参数错误等 —— 不重试，直接抛给上层标记 failed
      throw new ArkApiError(`HTTP ${res.status}: ${body}`, res.status, false);
    }
    if (lastErr instanceof ArkApiError) throw lastErr;
    throw new ArkApiError(`network error after retries: ${String(lastErr)}`, 0, true);
  }

  return {
    async generateImage(opts) {
      const body: Record<string, unknown> = {
        model: cfg.imageModel ?? DEFAULTS.imageModel,
        prompt: opts.prompt,
        size: opts.size,
        response_format: 'b64_json',
        watermark: false,
      };
      if (opts.refImageDataUrl) body.image = opts.refImageDataUrl;
      const res = await request(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data: Array<{ b64_json: string }> };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new ArkApiError('image response missing b64_json', 200, false);
      return Buffer.from(b64, 'base64');
    },

    async submitVideoTask(opts) {
      const body = {
        model: cfg.videoModel ?? DEFAULTS.videoModel,
        content: [
          { type: 'text', text: opts.prompt },
          {
            type: 'image_url',
            image_url: { url: opts.frameDataUrl },
            role: 'first_frame',
          },
          {
            type: 'image_url',
            image_url: { url: opts.frameDataUrl },
            role: 'last_frame',
          },
        ],
      };
      const res = await request(`${baseUrl}/contents/generations/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { id: string };
      if (!json.id) throw new ArkApiError('video task response missing id', 200, false);
      return json.id;
    },

    async getVideoTask(taskId) {
      const res = await request(`${baseUrl}/contents/generations/tasks/${taskId}`, {
        method: 'GET',
        headers,
      });
      const json = (await res.json()) as {
        status: string;
        content?: { video_url?: string };
        error?: { message?: string };
      };
      const status = json.status as VideoTaskStatus['status'];
      return {
        status,
        videoUrl: json.content?.video_url,
        error: json.error?.message,
      };
    },

    async downloadVideo(url, destPath) {
      const res = await request(url, { method: 'GET' });
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(destPath, buf);
    },
  };
}

/** 图片文件 → data URL（Ark 接口的 image 字段格式） */
export function toDataUrl(pngBuffer: Buffer, mime = 'image/png'): string {
  return `data:${mime};base64,${pngBuffer.toString('base64')}`;
}
