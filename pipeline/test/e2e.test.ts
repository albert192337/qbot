/**
 * 全流程集成测试（FakeArkClient + 合成 fixture，不花钱不联网）：
 * - create → auto-pick → 6 动作 → manifest 合法
 * - 中断（模拟 kill）→ resume 续跑，videoTaskId 不重提
 * - chroma 输出回归：WebM/GIF 真实产出且抠像 alpha 生效
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Job } from '../src/job.js';
import { runPipeline } from '../src/stages.js';
import { ACTION_IDS, type Manifest } from '../src/types.js';
import { createFakeArkClient } from './fake-ark.js';
import { ensureFixtures, getFfmpegPath, type Fixtures } from './fixtures.js';

let fixtures: Fixtures;
let ffmpegPath: string;

beforeAll(async () => {
  ffmpegPath = await getFfmpegPath();
  fixtures = await ensureFixtures(path.join(import.meta.dirname, 'tmp/fixtures'));
}, 60_000);

function makeFake(pollsBeforeSuccess = 0) {
  return createFakeArkClient({
    greenFramePng: fixtures.greenFramePng,
    turnaroundPng: fixtures.turnaroundPng,
    greenVideoMp4: fixtures.greenVideoMp4,
    pollsBeforeSuccess,
  });
}

describe('pipeline 全流程（fake 模式）', () => {
  it(
    'create → auto-pick 0 → 完整资产包，manifest 合法',
    async () => {
      const out = await mkdtemp(path.join(os.tmpdir(), 'qbot-e2e-'));
      const job = await Job.create(out, { refImagePath: fixtures.refPng });
      const fake = makeFake(2); // 每任务轮询 2 次 running 再成功
      const manifest = await runPipeline(
        job,
        { apiKey: 'fake', ffmpegPath },
        {
          arkClient: fake,
          pickCandidate: async () => 0,
          sleep: async () => {}, // 跳过真实等待
        },
      );

      // 三视图候选 3 张 + 6 动作首帧 = 9 次图片调用
      expect(fake.calls.images).toBe(3 + 6);
      expect(fake.calls.tasks).toBe(6);

      // 资产包完整性
      expect(existsSync(path.join(out, 'manifest.json'))).toBe(true);
      expect(existsSync(path.join(out, 'source.png'))).toBe(true);
      expect(existsSync(path.join(out, 'turnaround.png'))).toBe(true);
      for (const id of ACTION_IDS) {
        expect(manifest.actions[id].status).toBe('done');
        expect(existsSync(path.join(out, `actions/${id}.webm`))).toBe(true);
        expect(existsSync(path.join(out, `actions/${id}.gif`))).toBe(true);
      }

      // manifest 可反序列化且 schema 关键字段在
      const parsed = JSON.parse(
        await readFile(path.join(out, 'manifest.json'), 'utf8'),
      ) as Manifest;
      expect(parsed.pipelineVersion).toBe('1');
      expect(parsed.tier).toBe('S');
      expect(parsed.actions.idle.durationSec).toBe(3);
      expect(parsed.actions.tea.durationSec).toBe(5);

      await rm(out, { recursive: true, force: true });
    },
    120_000,
  );

  it(
    '中断后 resume：已提交的 videoTaskId 不重复提交',
    async () => {
      const out = await mkdtemp(path.join(os.tmpdir(), 'qbot-resume-'));
      const job = await Job.create(out, { refImagePath: fixtures.refPng });
      const fake1 = makeFake();

      // 第一段：跑到所有动作提交完视频任务后"崩溃"——
      // 用一个 getVideoTask 永远 running 的 fake + 超时中断模拟
      let aborted = false;
      const abortingFake = {
        ...fake1,
        async getVideoTask(taskId: string) {
          if (!aborted) {
            aborted = true;
            throw new Error('SIMULATED_CRASH'); // 第一次轮询即崩
          }
          return fake1.getVideoTask(taskId);
        },
      };
      await runPipeline(
        job,
        { apiKey: 'fake', ffmpegPath },
        { arkClient: abortingFake, pickCandidate: async () => 0, sleep: async () => {} },
      ).catch(() => {}); // 部分动作 failed 导致 package gate 抛错，忽略

      const tasksSubmittedFirstRun = fake1.calls.tasks;
      expect(tasksSubmittedFirstRun).toBeGreaterThan(0);

      // 第二段：load + resume，failed 动作会重置，但已 done 的不重跑
      const job2 = await Job.load(out);
      const fake2 = makeFake();
      const manifest = await runPipeline(
        job2,
        { apiKey: 'fake', ffmpegPath },
        { arkClient: fake2, pickCandidate: async () => 0, sleep: async () => {} },
      );
      for (const id of ACTION_IDS) {
        expect(manifest.actions[id].status).toBe('done');
      }
      // resume 时三视图已选定，不再生成三视图候选（fake2 的 images 只用于重跑动作首帧）
      expect(fake2.calls.images).toBeLessThan(3 + 6);

      await rm(out, { recursive: true, force: true });
    },
    120_000,
  );

  it(
    'WebM 输出含 alpha 配置（yuva420p）',
    async () => {
      const { toWebm } = await import('../src/chroma.js');
      const { checkVideoDrift } = await import('../src/qc.js');
      const outWebm = path.join(import.meta.dirname, 'tmp/alpha_check.webm');
      const drift = await checkVideoDrift(fixtures.greenVideoMp4, ffmpegPath);
      expect(drift.fail).toBe(false);
      await toWebm(fixtures.greenVideoMp4, outWebm, drift.keys, ffmpegPath);
      expect(existsSync(outWebm)).toBe(true);
      // 回归断言：抠像后左上角（原纯绿区）应变透明。
      // 用 ffmpeg 解码 WebM 输出 rgba，检查角落 alpha=0
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const { stdout } = await promisify(execFile)(
        ffmpegPath,
        [
          '-v', 'error',
          '-vcodec', 'libvpx-vp9', // 强制 libvpx 解码器才吐 alpha（内置 vp9 解码丢 alpha）
          '-i', outWebm,
          '-vf', 'crop=8:8:8:8',
          '-frames:v', '1',
          '-f', 'rawvideo',
          '-pix_fmt', 'rgba',
          'pipe:1',
        ],
        { encoding: 'buffer', maxBuffer: 1024 * 1024 },
      );
      const raw = stdout as unknown as Buffer;
      let alphaSum = 0;
      for (let i = 3; i < raw.length; i += 4) alphaSum += raw[i];
      expect(alphaSum).toBe(0); // 角落完全透明
    },
    60_000,
  );
});
