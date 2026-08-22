#!/usr/bin/env node
/**
 * qbot-pipeline CLI：
 *   create --ref <img> --out <dir> [--auto-pick N] — 从参考图产出完整资产包
 *   resume --job <dir>                             — 断点续跑
 *   redo   --job <dir> --action <id>               — 单动作重生成（官方角色生产刚需）
 *   key    --in <mp4> --out <webm|gif>             — 裸抠像工具（验证 WebM alpha 参数用）
 *
 * API key 读取顺序：--api-key > ARK_API_KEY 环境变量 > 报错。
 */
import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { Job } from './job.js';
import { runPipeline, runActions, runPackage, keyActionVideo } from './stages.js';
import { resolveFfmpegPath, sampleBackgroundColors, sampleKeyColor, toGif, toWebm } from './chroma.js';
import { checkVideoDrift, selectDualKeys } from './qc.js';
import { ACTION_IDS, type ActionId, type PipelineConfig, type ProgressEvent } from './types.js';

function getApiKey(optKey?: string): string {
  const key = optKey ?? process.env.ARK_API_KEY;
  if (!key) {
    console.error('error: API key required (--api-key or ARK_API_KEY env)');
    process.exit(1);
  }
  return key;
}

/** gpt-image-2 的 key：--gpt-image-key > GPT_IMAGE_API_KEY 环境变量（选了该后端才必需） */
function gptImageKey(optKey?: string): string | undefined {
  return optKey ?? process.env.GPT_IMAGE_API_KEY;
}

function printProgress(ev: ProgressEvent): void {
  const parts = [`[${ev.stage}]`];
  if (ev.action) parts.push(`${ev.action} → ${ev.status}`);
  if (ev.error) parts.push(`error: ${ev.error}`);
  console.log(parts.join(' '));
}

/** readline 交互挑三视图 */
async function interactivePick(candidatePaths: string[]): Promise<number> {
  console.log('\n三视图候选已生成，请查看后挑选：');
  candidatePaths.forEach((p, i) => console.log(`  [${i}] ${p}`));
  console.log(`  （可执行 open ${path.dirname(candidatePaths[0])} 查看图片）`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (;;) {
    const answer = (await rl.question('输入编号选择，或 r 重新生成一轮: ')).trim();
    if (answer === 'r') {
      rl.close();
      return -1;
    }
    const idx = Number(answer);
    if (Number.isInteger(idx) && idx >= 0 && idx < candidatePaths.length) {
      rl.close();
      return idx;
    }
    console.log('无效输入');
  }
}

const program = new Command('qbot-pipeline');

program
  .command('create')
  .description('从参考图创建角色资产包')
  .requiredOption('--ref <image>', '参考图路径')
  .requiredOption('--out <dir>', '资产包输出目录')
  .option('--tier <tier>', '动作档位', 'S')
  .option('--auto-pick <n>', '自动选择第 N 张三视图候选（跳过交互）')
  .option('--api-key <key>', 'Ark API key（默认读 ARK_API_KEY）')
  .option('--image-provider <p>', '生图后端 seedream|gpt-image-2', 'seedream')
  .option('--gpt-image-key <key>', 'gpt-image-2 API key（默认读 GPT_IMAGE_API_KEY）')
  .option('--form <form>', '角色形态 humanoid|abstract（抽象角色如线条小狗选 abstract）', 'humanoid')
  .option('--style <style>', '人形档生成风格 chibi|faithful（chibi=二头身Q版，faithful=保持原图头身比）', 'chibi')
  .action(async (opts) => {
    const cfg: PipelineConfig = {
      apiKey: getApiKey(opts.apiKey),
      gptImageApiKey: gptImageKey(opts.gptImageKey),
    };
    const job = await Job.create(path.resolve(opts.out), {
      refImagePath: path.resolve(opts.ref),
      imageProvider: opts.imageProvider === 'gpt-image-2' ? 'gpt-image-2' : undefined,
      characterForm: opts.form === 'abstract' ? 'abstract' : undefined,
      characterStyle:
        opts.form === 'abstract' ? undefined : opts.style === 'faithful' ? 'faithful' : 'chibi',
    });
    job.on('progress', printProgress);
    const pickCandidate =
      opts.autoPick !== undefined
        ? async () => Number(opts.autoPick)
        : interactivePick;
    const manifest = await runPipeline(job, cfg, { pickCandidate });
    console.log(`\n✅ 资产包就绪: ${opts.out}`);
    console.log(
      `动作状态: ${Object.entries(manifest.actions)
        .map(([k, v]) => `${k}=${v.status}`)
        .join(' ')}`,
    );
  });

program
  .command('resume')
  .description('断点续跑未完成的生成任务')
  .requiredOption('--job <dir>', '资产包目录')
  .option('--auto-pick <n>', '自动选择三视图候选')
  .option('--api-key <key>', 'Ark API key')
  .option('--gpt-image-key <key>', 'gpt-image-2 API key（job 用该后端时需要）')
  .action(async (opts) => {
    const cfg: PipelineConfig = {
      apiKey: getApiKey(opts.apiKey),
      gptImageApiKey: gptImageKey(opts.gptImageKey),
    };
    const job = await Job.load(path.resolve(opts.job));
    job.on('progress', printProgress);
    const pickCandidate =
      opts.autoPick !== undefined
        ? async () => Number(opts.autoPick)
        : interactivePick;
    await runPipeline(job, cfg, { pickCandidate });
    console.log('\n✅ 续跑完成');
  });

program
  .command('redo')
  .description('重新生成单个动作（复用已选三视图）')
  .requiredOption('--job <dir>', '资产包目录')
  .requiredOption('--action <id>', `动作 ID（${ACTION_IDS.join('/')}）`)
  .option('--api-key <key>', 'Ark API key')
  .option('--gpt-image-key <key>', 'gpt-image-2 API key（job 用该后端时需要）')
  .action(async (opts) => {
    const action = opts.action as ActionId;
    if (!ACTION_IDS.includes(action)) {
      console.error(`error: unknown action ${action}`);
      process.exit(1);
    }
    const cfg: PipelineConfig = {
      apiKey: getApiKey(opts.apiKey),
      gptImageApiKey: gptImageKey(opts.gptImageKey),
    };
    const job = await Job.load(path.resolve(opts.job));
    // 沿用 job 创建时选定的生图后端
    if (job.state.imageProvider) cfg.imageProvider = job.state.imageProvider;
    job.on('progress', printProgress);
    // 重置该动作后走正常 actions 流程（其余动作已 done 会被跳过）
    job.state.actions[action] = {
      status: 'pending',
      attempts: { frame: 0, video: 0 },
    };
    await job.save();
    const { createArkClient } = await import('./ark.js');
    const ffmpegPath = await resolveFfmpegPath(cfg.ffmpegPath);
    await runActions(job, createArkClient(cfg), ffmpegPath);
    await runPackage(job);
    console.log(`\n✅ ${action} 重生成完成`);
  });

program
  .command('rekey')
  .description('对已下载的绿幕视频重新抠像转码（不重新生成视频，抠像调参后修复存量角色用）')
  .requiredOption('--job <dir>', '资产包目录')
  .option('--action <id>', `只重抠指定动作（${ACTION_IDS.join('/')}）`)
  .option('--despill <mix>', 'rim despill 强度 0~1（0 = 关闭，回退旧的 alpha 收边）', '0.5')
  .option('--erode <px>', 'alpha 收边像素数（仅 --despill 0 时生效）', '0')
  .action(async (opts) => {
    const job = await Job.load(path.resolve(opts.job));
    const ffmpegPath = await resolveFfmpegPath();
    const ids = opts.action ? [opts.action as ActionId] : ACTION_IDS;
    const despillMix = Number(opts.despill);
    const erodePx = parseInt(opts.erode, 10);
    for (const id of ids) {
      const a = job.state.actions[id];
      if (!a?.videoPath) {
        console.log(`- ${id}: 无绿幕视频，跳过`);
        continue;
      }
      try {
        await keyActionVideo(job, id, ffmpegPath, { despillMix, erodePx });
        console.log(`✅ ${id} 重抠完成 (keys: ${a.keyColors?.map((k) => `#${k}`).join(', ')})`);
      } catch (err) {
        console.log(`❌ ${id}: ${err instanceof Error ? err.message : err}`);
      }
    }
  });

program
  .command('key')
  .description('绿幕视频抠像（WebM alpha 参数验证工具）')
  .requiredOption('--in <mp4>', '绿幕视频输入')
  .requiredOption('--out <file>', '输出路径（.webm 或 .gif）')
  .action(async (opts) => {
    const ffmpegPath = await resolveFfmpegPath();
    const inPath = path.resolve(opts.in);
    const drift = await checkVideoDrift(inPath, ffmpegPath);
    console.log(
      `背景漂移: ${drift.maxDrift}/255 → ${
        drift.fail ? '判废' : drift.needDoubleKey ? '双 key' : '单 key'
      }`,
    );
    if (drift.fail) process.exit(1);
    const bgSamples = await sampleBackgroundColors(inPath, ffmpegPath);
    let keys = selectDualKeys(bgSamples);
    if (keys.length === 0) {
      keys = [await sampleKeyColor(inPath, ffmpegPath)];
    }
    console.log(`key 色: ${keys.map((k) => `#${k}`).join(', ')}`);
    const outPath = path.resolve(opts.out);
    if (outPath.endsWith('.gif')) {
      await toGif(inPath, outPath, keys, ffmpegPath);
    } else {
      await toWebm(inPath, outPath, keys, ffmpegPath);
    }
    console.log(`✅ ${outPath}`);
  });

program.parseAsync().catch((err) => {
  console.error(`\n❌ ${err.message ?? err}`);
  process.exit(1);
});
