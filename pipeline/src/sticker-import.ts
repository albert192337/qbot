/**
 * 表情包导入：GIF 贴纸 → 语义打标 → 动作槽位映射。
 * spec: docs/superpowers/specs/2026-08-21-sticker-pack-import-design.md
 *
 * 设计要点：
 * - 模型输出**语义类别**（happy/annoyed/…）而非动作 ID：贴纸是任意素材，
 *   用户关心的是「它表达什么」；类别比动作 ID 稳定，动作体系重构后映射表不用改。
 * - 抽帧后批量送一次请求（每组帧前插「贴纸 #N」标记防错位），一批 ≤50 张。
 * - 解析容错：单张贴纸的类别非法/缺失 → 降级 other 进备选库，不拖垮整批。
 * - 本文件纯逻辑 + ffmpeg 调用，零 Electron 依赖（pipeline 模块铁律）。
 */
import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { toDataUrl, type ArkClient } from './ark.js';

const execFileP = promisify(execFile);

/** 一批打标的贴纸上限（spec §七：防打标过载、复核网格不爆） */
export const MAX_STICKERS_PER_BATCH = 50;

/** 每张贴纸抽的帧数（首/中/尾，够模型判断动作倾向） */
export const FRAMES_PER_STICKER = 3;

/** v1 只支持 GIF（APNG/WebP 留扩展位） */
export const SUPPORTED_EXTS = ['.gif'] as const;

/**
 * 打标语义类别。模型只能输出这些值之一。
 * 前 5 个落基础动作槽位；celebrate/focus/wave 是动作体系重构（S+ 场景动作）
 * 的预留类别，v1 进备选库；other = 都不像。
 */
export const STICKER_CATEGORIES = [
  'idle',
  'sleep',
  'tea',
  'happy',
  'annoyed',
  'celebrate',
  'focus',
  'wave',
  'other',
] as const;

export type StickerCategory = (typeof STICKER_CATEGORIES)[number];

/**
 * 语义类别 → 动作槽位。
 * v1 只有前 5 个有落点；celebrate/focus/wave 等动作体系重构落地后补映射
 * （届时只改这张表，打标逻辑不动）；other/未映射 → 备选库。
 */
export const CATEGORY_TO_SLOT: Partial<Record<StickerCategory, string>> = {
  idle: 'idle',
  sleep: 'sleep',
  tea: 'tea',
  happy: 'talk_happy',
  annoyed: 'talk_annoyed',
};

/** 置信度阈值（复核界面三色徽标 / 是否自动采纳） */
export const CONFIDENCE_HIGH = 0.6;
export const CONFIDENCE_LOW = 0.35;

/** 单张贴纸的打标结果 */
export interface StickerLabel {
  /** 贴纸文件名（批次内唯一标识） */
  sourceName: string;
  category: StickerCategory;
  confidence: number;
  /** 模型给的一句话理由（复核界面展示，帮用户理解判断） */
  reason: string;
  /** 映射到的动作槽位；undefined = 进备选库 */
  slot?: string;
}

/** 打标输入：一张贴纸的路径 + 抽出的帧 */
export interface StickerFrames {
  sourceName: string;
  /** 抽帧的 PNG buffer（首/中/尾） */
  frames: Buffer[];
}

/** 打标提示词：类别定义 + 输出格式 + 判定倾向 */
export const LABEL_SYSTEM_PROMPT = `你是表情包动作分类助手。用户会给你若干张表情包贴纸，每张贴纸提供 2~3 个关键帧（按时间顺序）。
你要判断每张贴纸表达的**情绪/状态语义**，归入下列类别之一：

- idle：静止待机，轻微呼吸/眨眼/发呆，无强烈情绪
- sleep：闭眼睡觉、ZZZ、瘫倒、趴着不动
- tea：悠闲放松，喝茶/喝饮料/慢节奏晃动，惬意
- happy：开心兴奋，笑、蹦跳、转圈、雀跃
- annoyed：生气、不耐烦、叹气、翻白眼、催促
- celebrate：庆祝，撒花、比耶、举杯、鼓掌
- focus：专注做事，写字、敲键盘、看书、思考
- wave：打招呼，挥手、你好、再见
- other：以上都不像（如哭泣、震惊、纯文字梗图）

判定原则：
1. 看**主体的动作和表情**，不要被贴纸上的文字带跑
2. 宁可给低置信度，也不要硬凑类别——不确定就选 other 或给低 confidence
3. confidence 要**学会用档次**，只有真正明确无疑才给高分：
   - 0.85~1.0：非常明确，主体动作/表情清楚对得上类别（不要轻易给）
   - 0.6~0.85：较像，主体和类别对得上但有些许含糊
   - 0.35~0.6：勉强像，能对上但明显有歧义或主体不清晰
   - 0~0.35：说不准，纯猜。注意：**不是 every 贴纸都要≥0.6**，
     一张 20 张表情包里常有 5~10 张是含糊的，请大胆用 0.2~0.5 的区间

输出**严格的 JSON 数组**，不要 markdown 代码块，不要任何解释文字。每个元素：
{"index": 贴纸序号(从1开始), "category": "类别", "confidence": 0.0~1.0, "reason": "一句话中文理由(20字内)"}

数组长度必须等于贴纸张数，index 从 1 连续递增。`;

/** 构造批量打标的用户内容块（每组帧前插序号标记，防模型把图对错贴纸） */
export function buildLabelParts(
  stickers: StickerFrames[],
): Array<{ type: 'text'; text: string } | { type: 'image'; dataUrl: string }> {
  const parts: Array<
    { type: 'text'; text: string } | { type: 'image'; dataUrl: string }
  > = [
    {
      type: 'text',
      text: `共 ${stickers.length} 张贴纸，请逐张分类，输出长度为 ${stickers.length} 的 JSON 数组。`,
    },
  ];
  stickers.forEach((s, i) => {
    parts.push({ type: 'text', text: `贴纸 #${i + 1}（${s.frames.length} 帧）：` });
    for (const frame of s.frames) {
      parts.push({ type: 'image', dataUrl: toDataUrl(frame) });
    }
  });
  return parts;
}

/** 模型返回的单条原始记录（字段全部当不可信处理） */
interface RawLabel {
  index?: unknown;
  category?: unknown;
  confidence?: unknown;
  reason?: unknown;
}

/**
 * 从模型回复里抽 JSON 数组。
 * 模型时常裹 markdown 代码块或加前后说明，所以取第一个 `[` 到最后一个 `]`，
 * 而不是直接 JSON.parse 全文。
 */
export function extractJsonArray(text: string): unknown {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) {
    throw new Error(`打标返回里找不到 JSON 数组：${text.slice(0, 200)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

function asCategory(v: unknown): StickerCategory | null {
  return typeof v === 'string' && (STICKER_CATEGORIES as readonly string[]).includes(v)
    ? (v as StickerCategory)
    : null;
}

/** 置信度归一化：非数字/越界 → 夹到 [0,1]，无法解析给 0（强制人工指定） */
function asConfidence(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * 解析打标结果 → 与输入等长的 StickerLabel[]。
 * 容错策略（spec §4.6）：
 * - 数组顺序不可信，优先按 index 对位；index 缺失/越界时按数组下标兜底
 * - 类别非法/条目缺失 → 降级 other + confidence 0（进备选库，标红要人工指定）
 * - 永远返回与 stickers 等长的结果，不让单张坏数据拖垮整批
 */
export function parseLabels(text: string, stickers: StickerFrames[]): StickerLabel[] {
  const parsed = extractJsonArray(text);
  const arr: RawLabel[] = Array.isArray(parsed) ? (parsed as RawLabel[]) : [];

  // 按 index 建表（1-based）；index 不可用的条目留给下标兜底
  const byIndex = new Map<number, RawLabel>();
  const leftovers: RawLabel[] = [];
  for (const item of arr) {
    const idx = typeof item?.index === 'number' ? item.index : Number(item?.index);
    if (Number.isInteger(idx) && idx >= 1 && idx <= stickers.length && !byIndex.has(idx)) {
      byIndex.set(idx, item);
    } else {
      leftovers.push(item);
    }
  }

  return stickers.map((s, i) => {
    const raw = byIndex.get(i + 1) ?? leftovers.shift();
    const category = asCategory(raw?.category);
    if (!category) {
      return {
        sourceName: s.sourceName,
        category: 'other' as StickerCategory,
        confidence: 0,
        reason: raw ? '模型返回的类别无法识别' : '模型未返回该贴纸的结果',
        slot: undefined,
      };
    }
    return {
      sourceName: s.sourceName,
      category,
      confidence: asConfidence(raw?.confidence),
      reason: typeof raw?.reason === 'string' ? raw.reason.slice(0, 60) : '',
      slot: CATEGORY_TO_SLOT[category],
    };
  });
}

/** 复核界面用的置信度分级 */
export type ConfidenceTier = 'high' | 'medium' | 'low';

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= CONFIDENCE_HIGH) return 'high';
  if (confidence >= CONFIDENCE_LOW) return 'medium';
  return 'low';
}

/** 槽位竞争消解后的分配方案（复核界面的初始状态） */
export interface SlotAssignment {
  /** 槽位 → 中选贴纸 */
  assigned: Map<string, StickerLabel>;
  /** 落选/无槽位的贴纸（备选库） */
  spares: StickerLabel[];
}

/**
 * 槽位竞争消解（spec §4.6）：同一槽位多张贴纸时取最高置信度，其余进备选库。
 * 平票时按 sourceName 排序取前者——纯为了结果可复现（同一批贴纸每次导入
 * 得到同样的分配），避免用户重试时看到不同结果。
 */
export function resolveSlots(labels: StickerLabel[]): SlotAssignment {
  const assigned = new Map<string, StickerLabel>();
  const spares: StickerLabel[] = [];

  // 无槽位的（other / 未映射类别）直接进备选库
  const contenders = labels.filter((l) => l.slot !== undefined);
  spares.push(...labels.filter((l) => l.slot === undefined));

  // 置信度降序、同分按名字升序 → 先到先得即最优
  const sorted = [...contenders].sort(
    (a, b) =>
      b.confidence - a.confidence || a.sourceName.localeCompare(b.sourceName),
  );
  for (const label of sorted) {
    const slot = label.slot!;
    if (assigned.has(slot)) {
      spares.push(label);
    } else {
      assigned.set(slot, label);
    }
  }
  // 备选库按名字排序，界面展示稳定
  spares.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
  return { assigned, spares };
}

/**
 * GIF 抽帧：等间隔取 n 帧转 PNG，**一次 ffmpeg 调用完成**。
 * select 表达式按帧序号挑（多个 eq 相加 = 选多个帧），`-vsync 0`
 * 让匹配帧逐个输出（否则按默认 fps 打时间戳会丢帧）。
 * 单次调用的理由：每张 GIF 跑 n 次 ffmpeg 子进程，50 张 × 3 帧 = 150 次，
 * 进程启动成本远大于抽帧本身，实测串行要 100s。
 */
export async function extractFrames(
  gifPath: string,
  ffmpegPath: string,
  count = FRAMES_PER_STICKER,
): Promise<Buffer[]> {
  const total = await countGifFrames(gifPath, ffmpegPath);
  if (total <= 0) throw new Error(`GIF 无法解码或零帧：${path.basename(gifPath)}`);
  // 等间隔取样：单帧 GIF 也能工作（只取第 0 帧）
  const n = Math.min(count, total);
  const picks =
    n === 1
      ? [0]
      : Array.from({ length: n }, (_, i) =>
          Math.round((i * (total - 1)) / (n - 1)),
        );
  const uniq = [...new Set(picks)];
  // eq(n,a)+eq(n,b)+…：任一帧号命中即输出
  const selectExpr = uniq.map((idx) => `eq(n\\,${idx})`).join('+');
  const { stdout } = await execFileP(
    ffmpegPath,
    [
      '-v', 'error',
      '-i', gifPath,
      '-vf', `select='${selectExpr}'`,
      '-vsync', '0',
      '-frames:v', String(uniq.length),
      '-f', 'image2pipe', // 多帧写同一 pipe 必须 image2pipe（image2 要求文件名序列）
      '-c:v', 'png',
      'pipe:1',
    ],
    { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 },
  );
  if (stdout.length === 0) {
    throw new Error(`GIF 抽帧全部失败：${path.basename(gifPath)}`);
  }
  // pipe 里是 n 张 PNG 首尾相接，按 PNG magic 切分
  return splitPngStream(stdout);
}

/** PNG magic 前 8 字节（89504E470D0A1A0A），用来切分多帧 PNG 流 */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 把首尾相接的多张 PNG 切成数组（PNG 流内 magic 只会出现在帧边界） */
export function splitPngStream(buf: Buffer): Buffer[] {
  const frames: Buffer[] = [];
  let start = -1;
  for (let i = 0; i + 8 <= buf.length; i++) {
    if (buf.subarray(i, i + 8).equals(PNG_MAGIC)) {
      if (start >= 0) frames.push(buf.subarray(start, i));
      start = i;
    }
  }
  if (start >= 0) frames.push(buf.subarray(start));
  return frames;
}

/** GIF 帧数（ffmpeg-static 不带 ffprobe，解析 stderr 的 frame= 计数） */
async function countGifFrames(gifPath: string, ffmpegPath: string): Promise<number> {
  const { stderr } = await execFileP(
    ffmpegPath,
    ['-i', gifPath, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  ).catch((err: { stderr?: string }) => ({ stderr: err?.stderr ?? '' }));
  // 取最后一个 frame= N（ffmpeg 进度行会多次出现）
  const matches = [...String(stderr).matchAll(/frame=\s*(\d+)/g)];
  const last = matches.at(-1);
  return last ? Number(last[1]) : 0;
}

/** 扫描目录下的贴纸文件（v1 只认 .gif，非递归） */
export async function scanStickerDir(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isFile() &&
        (SUPPORTED_EXTS as readonly string[]).includes(
          path.extname(e.name).toLowerCase(),
        ),
    )
    .map((e) => path.join(dir, e.name))
    .sort();
}

/** 打标批次大小：一次请求送多少张贴纸。
 *  太大则单次请求 token 量高、模型对位容易乱；12 张（≈36 帧）是经验折中。 */
export const LABEL_CHUNK_SIZE = 12;

/** 抽帧并发上限：每张 GIF 要跑 1+ 次 ffmpeg 子进程，
 *  全串行 50 张 ≈ 100s 太久；5 路并发是机器资源与耗时的折中。 */
const EXTRACT_CONCURRENCY = 5;

/** 有界并发执行：results[i] = fn(items[i]) 的返回值；单个失败不影响其余 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * 批量打标：抽帧 → 分块请求 → 解析。
 * 抽帧并发（EXTRACT_CONCURRENCY 路），分块是必需的——
 * 50 张 × 3 帧 = 150 张图挤一次请求，模型对位准确率会掉。
 * 单块失败不中断其余块（该块整体降级 other，用户在复核界面人工指定）。
 */
export async function labelStickers(
  gifPaths: string[],
  ark: ArkClient,
  ffmpegPath: string,
  onProgress?: (done: number, total: number) => void,
): Promise<StickerLabel[]> {
  if (gifPaths.length > MAX_STICKERS_PER_BATCH) {
    throw new Error(
      `一次最多导入 ${MAX_STICKERS_PER_BATCH} 张贴纸（当前 ${gifPaths.length} 张）`,
    );
  }

  // 抽帧（并发）：坏 GIF 记为解码失败，不阻断其余
  const framed: StickerFrames[] = [];
  const broken: StickerLabel[] = [];
  let done = 0;
  const progress = () => {
    done++;
    onProgress?.(done, gifPaths.length);
  };
  const frameResults = await mapLimit(gifPaths, EXTRACT_CONCURRENCY, async (p) => {
    const sourceName = path.basename(p);
    try {
      const frames = await extractFrames(p, ffmpegPath);
      progress();
      return { ok: true as const, sourceName, frames };
    } catch (err) {
      progress();
      return {
        ok: false as const,
        sourceName,
        reason: `无法解码：${err instanceof Error ? err.message : String(err)}`,
      };
    }
  });
  for (const r of frameResults) {
    if (r.ok) {
      framed.push({ sourceName: r.sourceName, frames: r.frames });
    } else {
      broken.push({
        sourceName: r.sourceName,
        category: 'other',
        confidence: 0,
        reason: r.reason,
        slot: undefined,
      });
    }
  }

  const labels: StickerLabel[] = [];
  for (let i = 0; i < framed.length; i += LABEL_CHUNK_SIZE) {
    const chunk = framed.slice(i, i + LABEL_CHUNK_SIZE);
    try {
      const text = await ark.visionChat({
        system: LABEL_SYSTEM_PROMPT,
        parts: buildLabelParts(chunk),
      });
      labels.push(...parseLabels(text, chunk));
    } catch (err) {
      // 整块失败 → 全部降级 other（标红，用户人工指定），不中断其余块
      const msg = err instanceof Error ? err.message : String(err);
      labels.push(
        ...chunk.map((s) => ({
          sourceName: s.sourceName,
          category: 'other' as StickerCategory,
          confidence: 0,
          reason: `打标失败：${msg.slice(0, 40)}`,
          slot: undefined,
        })),
      );
    }
  }

  return [...labels, ...broken];
}
