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
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { createGptImageGenerator } from '../pipeline/src/gpt-image.js';
import { CHROMAKEY_BLEND, CHROMAKEY_SIMILARITY, resolveFfmpegPath } from '../pipeline/src/chroma.js';
import type { GenerateImageOpts } from '../pipeline/src/ark.js';
import type { PipelineConfig } from '../pipeline/src/types.js';

const execFileP = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const GREEN = '00FF00';

const ROOM_PROMPT = `参考图是一个等距视角（isometric）小房间。请严格保持完全相同的构图与几何：
- 左右两面墙 + 菱形地板，墙体与地板的轮廓位置、角度、边界、透视消失方向与参考图逐像素级一致
- 房间实体的外轮廓（六边形边界）必须和参考图完全重合，不得内缩或外扩

在保持上述几何的前提下，把画风整体换成【中式水彩宣纸风】：
- 淡雅水彩晕染质感，宣纸纤维底纹，柔和的湿边与颜色渐层，笔触自然
- 主色调：竹青、月白、浅赭、藕荷，整体清透明亮，低饱和
- 线条是细而柔的墨线勾边（不要粗黑描边、不要扁平色块填充）
- 墙面可有极淡的竹影或水墨远山晕染；地板是细腻的木纹或竹席纹理
- 空间感靠水彩浓淡与柔和投影塑造，不用硬阴影

严禁：任何角色、人物、动物、文字、水印；不要在房间里摆放家具（家具是另外的贴纸图层）
房间实体以外的部分必须是纯绿色背景（#00FF00），绿色区域内不得有任何阴影、渐变或笔触溢出`;

const DECOR_ITEMS: Array<{ id: string; name: string; prompt: string; anchor: 'wall' | 'floor' }> = [
  { id: 'painting', name: '山水挂画', anchor: 'wall', prompt: '一幅中式水墨山水小挂画，浅木色细相框' },
  { id: 'lantern', name: '灯笼', anchor: 'wall', prompt: '一只素雅的中式灯笼，米白绢面配淡青流苏' },
  { id: 'window', name: '圆窗', anchor: 'wall', prompt: '一扇中式圆形花格木窗，窗外淡青竹影' },
  { id: 'clock', name: '挂钟', anchor: 'wall', prompt: '一只浅木质圆挂钟，月白表盘' },
  { id: 'fan', name: '折扇', anchor: 'wall', prompt: '一把展开的中式折扇，扇面淡彩绘梅枝' },
  { id: 'calligraphy', name: '字画卷轴', anchor: 'wall', prompt: '一幅竖挂的写意书法卷轴（不要可辨认文字，仅写意笔触）' },
  { id: 'plant', name: '盆栽', anchor: 'floor', prompt: '一盆青瓷花盆的文竹盆栽，落地摆放' },
  { id: 'shelf', name: '书架', anchor: 'floor', prompt: '一个小巧的浅色木书架，摆着几卷书册，落地' },
  { id: 'screen', name: '屏风', anchor: 'floor', prompt: '一扇三折中式屏风，绢面淡彩绘竹，立在地面' },
  { id: 'teapot', name: '茶壶案几', anchor: 'floor', prompt: '一张矮案几，上面摆着紫砂茶壶和两只茶杯，落地' },
];

/**
 * 家具/贴纸 prompt。anchor 决定画法：
 * - floor：等距视角看下去的立体家具，有可见的顶面与侧面、底部是贴合地面的椭圆/菱形接触面
 * - wall：正对墙面的平面挂件，不画立体侧面（会被墙面仿射切变，画了立体反而歪）
 */
const decorPrompt = (item: string, anchor: 'wall' | 'floor') =>
  `${item}。中式水彩宣纸风：淡雅水彩晕染、细柔墨线勾边、竹青月白浅赭藕荷的低饱和配色，清透明亮。` +
  (anchor === 'floor'
    ? `等距视角（isometric）俯视约 30 度的立体家具，能看到顶面和侧面，底部有贴合地面的接触面，物件笔直站立不倾斜。`
    : `正面平视的平面挂件，不要画立体侧面与厚度。`) +
  `单个物件居中、四周留白、完整不裁切。背景必须是纯绿色（#00FF00），物件本体不要用绿色系颜色，不要投影不要文字。`;

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
}

/**
 * key 优先读仓库根的 config.local.json；没有就回落到 app 运行时设置
 * （托盘 → 设置 里填的那份），避免把密钥抄成两份。
 */
async function loadConfig(): Promise<PipelineConfig> {
  const candidates = [
    path.join(ROOT, 'config.local.json'),
    process.platform === 'win32'
      ? path.join(process.env.APPDATA ?? '', '@qbot', 'app', 'config.json')
      : path.join(
          process.env.HOME ?? '',
          'Library',
          'Application Support',
          '@qbot',
          'app',
          'config.json',
        ),
  ];
  for (const file of candidates) {
    try {
      const raw = JSON.parse(await readFile(file, 'utf8'));
      if (raw.gptImageApiKey || raw.arkApiKey) {
        console.log(`[cfg] 使用 ${path.basename(path.dirname(file))}/${path.basename(file)}`);
        return {
          apiKey: raw.arkApiKey,
          gptImageApiKey: raw.gptImageApiKey,
          imageProvider: 'gpt-image-2',
        };
      }
    } catch {
      // 下一个候选
    }
  }
  throw new Error(
    '找不到 API key：请在仓库根建 config.local.json（含 gptImageApiKey），或在 app 托盘 → 设置里填好',
  );
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
    '-vf', `colorkey=0x${GREEN}:${CHROMAKEY_SIMILARITY}:${CHROMAKEY_BLEND},format=rgba`,
    '-frames:v', '1', dest,
  ]);
}

/** 按 alpha 包围盒裁边（贴纸类留 margin，房间背景不裁） */
async function trimToAlphaBBox(ffmpeg: string, file: string, margin = 16): Promise<void> {
  // ffmpeg 把媒体信息写 stderr 不是 stdout；原来读 stdout 永远拿不到，
  // 静默回退默认 1024×1024，而实际图是 1254² → 裁边按错误尺寸算，结果偏掉。
  const probe = await execFileP(ffmpeg, ['-i', file, '-f', 'null', '-'], { encoding: 'utf8' })
    .then((o) => o.stderr)
    .catch((e) => String(e.stderr ?? e));
  const m = /,\s(\d{2,5})x(\d{2,5})/.exec(probe) ?? /(\d{2,5})x(\d{2,5})/.exec(probe);
  if (!m) throw new Error(`无法解析尺寸: ${file}`);
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
  await rename(tmp, file); // 不用 /bin/mv：Windows 上没有这个路径
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
          { prompt: decorPrompt(d.prompt, d.anchor) },
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
