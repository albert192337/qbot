/**
 * fixtures.ts：用 ffmpeg 现场合成测试素材（旧机器的真实绿幕样本不在本机，
 * 切片 2 真跑后可回填真实 fixture）。
 * - 绿幕首帧 PNG：纯绿底 + 中央红色方块（模拟角色）
 * - 绿幕视频 mp4：同上，2 秒
 * - 三视图 PNG：白底
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const execFileP = promisify(execFile);

export async function getFfmpegPath(): Promise<string> {
  const mod = await import('ffmpeg-static');
  return (mod.default ?? mod) as unknown as string;
}

export interface Fixtures {
  greenFramePng: string;
  turnaroundPng: string;
  greenVideoMp4: string;
  refPng: string;
}

/** 幂等：已存在则跳过合成 */
export async function ensureFixtures(dir: string): Promise<Fixtures> {
  await mkdir(dir, { recursive: true });
  const ffmpeg = await getFfmpegPath();
  const f: Fixtures = {
    greenFramePng: path.join(dir, 'green_frame.png'),
    turnaroundPng: path.join(dir, 'turnaround.png'),
    greenVideoMp4: path.join(dir, 'green_video.mp4'),
    refPng: path.join(dir, 'ref.png'),
  };

  if (!existsSync(f.greenFramePng)) {
    // 纯绿底 512x512 + 中央红方块（drawbox 模拟角色主体）
    await execFileP(ffmpeg, [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=0x3bfa2c:s=512x512:d=1',
      '-vf', 'drawbox=x=156:y=156:w=200:h=200:color=red:t=fill',
      '-frames:v', '1',
      f.greenFramePng,
    ]);
  }
  if (!existsSync(f.turnaroundPng)) {
    await execFileP(ffmpeg, [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=white:s=768x384:d=1',
      '-vf', 'drawbox=x=84:y=92:w=100:h=200:color=blue:t=fill,drawbox=x=334:y=92:w=100:h=200:color=blue:t=fill,drawbox=x=584:y=92:w=100:h=200:color=blue:t=fill',
      '-frames:v', '1',
      f.turnaroundPng,
    ]);
  }
  if (!existsSync(f.greenVideoMp4)) {
    await execFileP(ffmpeg, [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=0x3bfa2c:s=512x512:d=2:r=24',
      '-vf', 'drawbox=x=156:y=156:w=200:h=200:color=red:t=fill',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      f.greenVideoMp4,
    ]);
  }
  if (!existsSync(f.refPng)) {
    await execFileP(ffmpeg, [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=white:s=256x256:d=1',
      '-vf', 'drawbox=x=78:y=28:w=100:h=200:color=blue:t=fill',
      '-frames:v', '1',
      f.refPng,
    ]);
  }
  return f;
}
