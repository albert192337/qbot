/**
 * 离线生图工具（不进 app 运行时）：gpt-image-2 生成小房间背景候选 / 装饰贴纸包。
 *
 *   npx tsx scripts/gen-room.mts room  --ref <参考图.png> [--n 3] [--out assets/rooms]
 *   npx tsx scripts/gen-room.mts decor [--out assets/rooms/decor] [--only 挂画,灯笼]
 *
 * key 读 config.local.json（gptImageApiKey）。每张 5~10 分钟、花钱（并发被管线限 2）。
 * 透明底策略：先带 background=transparent 试一张，服务端不支持（4xx / 无 alpha）
 * 则回退纯绿底 prompt + ffmpeg colorkey 抠像（容差沿用 chroma.ts 生产值）。
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { createGptImageGenerator } from '../pipeline/src/gpt-image.js';
import { COLORKEY_BLEND, COLORKEY_SIMILARITY, resolveFfmpegPath } from '../pipeline/src/chroma.js';
import type { GenerateImageOpts } from '../pipeline/src/ark.js';
import type { PipelineConfig } from '../pipeline/src/types.js';

const execFileP = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const GREEN = '00FF00';

const ROOM_PROMPT = `参考图是一个等距视角（isometric）小房间的构图模板。请严格保持相同构图与几何比例重新绘制一个精美的房间：
- 左右两面墙 + 菱形木地板，墙体与地板的轮廓位置、角度、边界与参考图完全一致
- 温馨中式风格：暖米色墙面、深棕木质踢脚线、红木家具（左墙靠柜子、右墙挂装饰画）、精细的木地板纹理
- 可爱贴纸插画风：粗深棕描边、扁平上色、柔和暖色调、细节丰富但不杂乱
- 不要出现任何角色、人物、动物、文字
- 房间实体以外的部分必须是纯绿色背景（#00FF00），不要任何阴影、渐变、装饰溢出到绿色区域`;

const DECOR_ITEMS: Array<{ id: string; name: string; prompt: string }> = [
  { id: 'painting', name: '山水挂画', prompt: '一幅中式山水小挂画，深红木相框' },
  { id: 'lantern', name: '红灯笼', prompt: '一只喜庆的中式红灯笼，带金色流苏' },
  { id: 'plant', name: '盆栽', prompt: '一盆青瓷花盆的绿植盆栽' },
  { id: 'window', name: '圆窗', prompt: '一扇中式圆形花格木窗，窗外淡蓝天色' },
  { id: 'clock', name: '挂钟', prompt: '一只木质圆挂钟，米色表盘' },
  { id: 'shelf', name: '书架', prompt: '一个小巧的红木书架，摆着几卷书册' },
  { id: 'screen', name: '屏风', prompt: '一扇三折中式屏风，绢面绘花鸟' },
  { id: 'teapot', name: '茶壶案几', prompt: '一张小案几，上面摆着紫砂茶壶和两只茶杯' },
  { id: 'fan', name: '折扇', prompt: '一把展开的中式折扇，扇面绘梅花' },
  { id: 'calligraphy', name: '字画卷轴', prompt: '一幅竖挂的空白意境书法卷轴（不要可辨认文字，仅写意笔触）' },
];

const decorPrompt = (item: string) =>
  `${item}。可爱贴纸插画风：粗深棕描边、扁平上色、温暖的中式配色，单个物件居中、四周留白。背景必须是纯绿色（#00FF00），物件本体不要用绿色系颜色，不要阴影不要文字。`;

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
}

async function loadConfig(): Promise<PipelineConfig> {
  const raw = JSON.parse(await readFile(path.join(ROOT, 'config.local.json'), 'utf8'));
  return { apiKey: raw.arkApiKey, gptImageApiKey: raw.gptImageApiKey, imageProvider: 'gpt-image-2' };
}

/** PNG 角落是否已透明；角落不透明且接近纯绿则必须走抠像（模型可能无视 transparent 参数照画绿底） */
async function cornerState(ffmpeg: string, file: string): Promise<'transparent' | 'green' | 'opaque'> {
  const { stdout } = await execFileP(
    ffmpeg,
    ['-v', 'error', '-i', file, '-vf', 'crop=24:24:0:0,format=rgba', '-f', 'rawvideo', '-'],
    { encoding: 'buffer', maxBuffer: 1 << 20 },
  );
  let transparent = 0;
  let green = 0;
  const n = stdout.length / 4;
  for (let i = 0; i < stdout.length; i += 4) {
    const [r, g, b, a] = [stdout[i], stdout[i + 1], stdout[i + 2], stdout[i + 3]];
    if (a < 8) transparent++;
    else if (g > 180 && r < 120 && b < 120) green++;
  }
  if (transparent > n / 2) return 'transparent';
  if (green > n / 2) return 'green';
  return 'opaque';
}

/** 绿底 → 透明（colorkey 容差沿用生产值） */
async function keyGreen(ffmpeg: string, src: string, dest: string): Promise<void> {
  await execFileP(ffmpeg, [
    '-v', 'error', '-y', '-i', src,
    '-vf', `colorkey=0x${GREEN}:${COLORKEY_SIMILARITY}:${COLORKEY_BLEND},format=rgba`,
    '-frames:v', '1', dest,
  ]);
}

/** 按 alpha 包围盒裁边（贴纸类留 margin，房间背景不裁） */
async function trimToAlphaBBox(ffmpeg: string, file: string, margin = 16): Promise<void> {
  const { stdout: probe } = await execFileP(ffmpeg, ['-i', file, '-f', 'null', '-'], {
    encoding: 'utf8',
  }).catch((e) => ({ stdout: String(e) }));
  const m = /(\d+)x(\d+)/.exec(probe) ?? ['', '1024', '1024'];
  const W = Number(m[1]);
  const H = Number(m[2]);
  const { stdout } = await execFileP(
    ffmpeg,
    ['-v', 'error', '-i', file, '-vf', 'format=rgba', '-f', 'rawvideo', '-'],
    { encoding: 'buffer', maxBuffer: 64 << 20 },
  );
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (stdout[(y * W + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX >= maxX || minY >= maxY) return; // 全透明/全不透明异常，不裁
  const x = Math.max(0, minX - margin);
  const y = Math.max(0, minY - margin);
  const w = Math.min(W - x, maxX - minX + margin * 2);
  const h = Math.min(H - y, maxY - minY + margin * 2);
  const tmp = `${file}.trim.png`;
  await execFileP(ffmpeg, ['-v', 'error', '-y', '-i', file, '-vf', `crop=${w}:${h}:${x}:${y}`, '-frames:v', '1', tmp]);
  await execFileP('/bin/mv', [tmp, file]);
}

/** 参考图合成到不透明绿底上（透明参考图会被 edits 当 mask 语义，必须铺底） */
async function flattenOnGreen(ffmpeg: string, src: string, dest: string): Promise<void> {
  await execFileP(ffmpeg, [
    '-v', 'error', '-y', '-i', src,
    '-filter_complex', `color=0x${GREEN}[bg];[bg][0:v]scale2ref[bg2][fg];[bg2][fg]overlay=format=auto,format=rgb24`,
    '-frames:v', '1', dest,
  ]);
}

const toDataUrl = async (file: string) =>
  `data:image/png;base64,${(await readFile(file)).toString('base64')}`;

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== 'room' && mode !== 'decor' && mode !== 'rekey') {
    console.error(
      'usage: gen-room.mts room --ref <png> [--n 3] [--out dir] | decor [--out dir] [--only id,id] | rekey --out <dir> [--trim]',
    );
    process.exit(1);
  }
  // rekey：对已生成的 *-raw.png 重新抠像（+可选裁边），零 API 成本
  if (mode === 'rekey') {
    const ffmpeg = await resolveFfmpegPath();
    const out = path.resolve(ROOT, arg('out')!);
    const { readdir } = await import('node:fs/promises');
    for (const f of await readdir(out)) {
      if (!f.endsWith('-raw.png')) continue;
      const dest = path.join(out, f.replace('-raw', ''));
      await keyGreen(ffmpeg, path.join(out, f), dest);
      if (process.argv.includes('--trim')) await trimToAlphaBBox(ffmpeg, dest);
      console.log(`[rekey] ${dest}`);
    }
    return;
  }
  const cfg = await loadConfig();
  const generate = createGptImageGenerator(cfg);
  const ffmpeg = await resolveFfmpegPath();
  /** 生成一张：先试 transparent 参数，4xx/无 alpha 回退绿底 keying */
  let transparentSupported: boolean | null = null;
  async function genOne(opts: Omit<GenerateImageOpts, 'size'>, rawPath: string, outPath: string): Promise<void> {
    let buf: Buffer | null = null;
    if (transparentSupported !== false) {
      try {
        buf = await generate({ ...opts, size: '2048x2048', background: 'transparent' });
      } catch (err) {
        console.warn(`[gen] background=transparent 被拒（${String(err).slice(0, 120)}）→ 回退绿底抠像`);
        transparentSupported = false;
      }
    }
    if (!buf) buf = await generate({ ...opts, size: '2048x2048' });
    await writeFile(rawPath, buf);
    const corner = await cornerState(ffmpeg, rawPath);
    if (corner === 'transparent') {
      transparentSupported ??= true;
      await writeFile(outPath, buf);
    } else {
      // 绿底或不透明底：一律 colorkey（不透明非绿底 = 模型跑偏，抠完人为复查）
      if (transparentSupported === null) transparentSupported = false;
      await keyGreen(ffmpeg, rawPath, outPath);
      if (corner === 'opaque') console.warn(`[gen] ${outPath} 底色非绿，抠像结果需人工复查`);
    }
    console.log(`[gen] done: ${outPath}`);
  }

  if (mode === 'room') {
    const ref = arg('ref');
    if (!ref) throw new Error('room 模式需要 --ref 参考图（锁构图）');
    const n = Number(arg('n', '3'));
    const out = path.resolve(ROOT, arg('out', 'assets/rooms')!);
    await mkdir(out, { recursive: true });
    const refGreen = path.join(out, 'ref-green.png');
    await flattenOnGreen(ffmpeg, path.resolve(ref), refGreen);
    const refDataUrl = await toDataUrl(refGreen);
    const results = await Promise.allSettled(
      Array.from({ length: n }, (_, i) =>
        genOne(
          { prompt: ROOM_PROMPT, refImageDataUrl: refDataUrl },
          path.join(out, `room-${i + 1}-raw.png`),
          path.join(out, `room-${i + 1}.png`),
        ),
      ),
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[gen] room-${i + 1} 失败:`, String(r.reason).slice(0, 300));
    });
  } else {
    const out = path.resolve(ROOT, arg('out', 'assets/rooms/decor')!);
    await mkdir(out, { recursive: true });
    const only = arg('only')?.split(',');
    const items = DECOR_ITEMS.filter((d) => !only || only.includes(d.id));
    const results = await Promise.allSettled(
      items.map((d) =>
        genOne(
          { prompt: decorPrompt(d.prompt) },
          path.join(out, `${d.id}-raw.png`),
          path.join(out, `${d.id}.png`),
        ),
      ),
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[gen] ${items[i].id} 失败:`, String(r.reason).slice(0, 300));
    });
    // 贴纸裁到内容包围盒（房间背景不裁：几何坐标依赖整幅画布）
    for (let i = 0; i < items.length; i++) {
      if (results[i].status === 'fulfilled') {
        await trimToAlphaBBox(ffmpeg, path.join(out, `${items[i].id}.png`));
      }
    }
    await writeFile(
      path.join(out, 'decor-pack.json'),
      JSON.stringify(
        { stickers: items.map((d) => ({ id: d.id, name: d.name, image: `${d.id}.png` })) },
        null,
        2,
      ),
    );
  }
}

void main();
