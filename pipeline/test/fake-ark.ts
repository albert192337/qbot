/**
 * FakeArkClient：全流程 dry-run 用的假客户端。
 * - generateImage 返回 1×1 PNG（或用 ffmpeg 现场合成的绿幕图，由测试注入）
 * - submitVideoTask/getVideoTask 模拟异步任务，立即 succeeded
 * - downloadVideo 复制本地 fixture
 */
import { copyFile, readFile } from 'node:fs/promises';
import type { ArkClient, GenerateImageOpts, VideoTaskStatus } from '../src/ark.js';

export interface FakeArkOptions {
  /** 绿幕首帧 fixture PNG 路径（四角必须纯绿，过 QC 用） */
  greenFramePng: string;
  /** 三视图 fixture PNG 路径 */
  turnaroundPng: string;
  /** 绿幕视频 fixture mp4 路径 */
  greenVideoMp4: string;
  /** 让指定次数的 getVideoTask 返回 running（测轮询） */
  pollsBeforeSuccess?: number;
}

export function createFakeArkClient(opts: FakeArkOptions): ArkClient & {
  calls: { images: number; tasks: number; polls: number };
} {
  const calls = { images: 0, tasks: 0, polls: 0 };
  let taskCounter = 0;
  const pollsNeeded = opts.pollsBeforeSuccess ?? 0;
  const pollCount = new Map<string, number>();

  return {
    calls,
    async generateImage(o: GenerateImageOpts) {
      calls.images++;
      // 三视图尺寸 → 三视图 fixture；首帧尺寸 → 绿幕 fixture
      const src = o.size === '3072x1536' ? opts.turnaroundPng : opts.greenFramePng;
      return readFile(src);
    },
    async submitVideoTask() {
      calls.tasks++;
      const id = `fake-task-${taskCounter++}`;
      pollCount.set(id, 0);
      return id;
    },
    async getVideoTask(taskId: string): Promise<VideoTaskStatus> {
      calls.polls++;
      const n = (pollCount.get(taskId) ?? 0) + 1;
      pollCount.set(taskId, n);
      if (n <= pollsNeeded) return { status: 'running' };
      return { status: 'succeeded', videoUrl: `fake://video/${taskId}` };
    },
    async downloadVideo(_url: string, destPath: string) {
      await copyFile(opts.greenVideoMp4, destPath);
    },
  };
}
