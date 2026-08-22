/**
 * 表情包导入的 main 侧：打标 → 复核（渲染层）→ 落盘 → 热重载。
 * spec: docs/superpowers/specs/2026-08-21-sticker-pack-import-design.md
 *
 * 两阶段设计（关键）：
 * - analyze：只抽帧 + 打标，**不落盘**。复核期间取消 = 什么都没发生（spec §2.2）
 * - apply：用户确认后才转码落盘 + 改 manifest + 热重载
 *
 * 打标结果不进主进程长期状态——渲染层持有，apply 时原样送回。
 * 理由：复核可能持续几分钟，主进程存一份就要处理「窗口关了/角色被删/多窗并发」，
 * 无状态实现天然没这些问题。
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createArkClient,
  gifToWebm,
  labelStickers,
  probeDurationSec,
  resolveFfmpegPath,
  scanStickerDir,
  MAX_STICKERS_PER_BATCH,
  type Manifest,
  type ManifestImportedAction,
  type StickerLabel,
} from '@qbot/pipeline';
import { charactersDir, getCharacter } from './characters';
import { getSettings } from './config';
import { buildConfig } from './pipeline-bridge';
import {
  isManualOverride,
  mergeImported,
  mergeSpares,
  safeFileName,
  stemFor,
} from './sticker-rules';
import { broadcastCharacterActivated } from './windows';
import { rebuildTray } from './tray';

/** 打标结果 + 贴纸绝对路径（渲染层复核用；apply 时原样回传） */
export interface AnalyzedSticker extends StickerLabel {
  /** 贴纸绝对路径（apply 阶段读它转码） */
  absPath: string;
  /** 复核界面预览用的首帧 data URL */
  previewDataUrl: string;
}

/** 用户复核后的最终分配（渲染层提交） */
export interface StickerAssignment {
  absPath: string;
  sourceName: string;
  /** 用户确认的槽位；null = 进备选库 */
  slot: string | null;
  category?: string;
  /** 模型原建议（追溯 manualOverride 用） */
  suggestedSlot?: string;
  confidence?: number;
}

/** 导入结果（渲染层展示「已导入 N 个，备选 M 个」） */
export interface ImportResult {
  slots: string[];
  spareCount: number;
  failed: Array<{ sourceName: string; error: string }>;
}

/**
 * 阶段一：扫描 + 打标（不落盘）。
 * 目录或文件列表都接受——Studio 支持选文件夹和拖入多文件两种入口。
 */
export async function analyzeStickers(
  input: { dir?: string; files?: string[] },
): Promise<AnalyzedSticker[]> {
  const gifs = input.dir
    ? await scanStickerDir(input.dir)
    : (input.files ?? []).filter((f) => f.toLowerCase().endsWith('.gif')).sort();

  if (gifs.length === 0) throw new Error('没找到 GIF 贴纸（v1 只支持 .gif）');
  if (gifs.length > MAX_STICKERS_PER_BATCH) {
    throw new Error(
      `一次最多导入 ${MAX_STICKERS_PER_BATCH} 张（当前 ${gifs.length} 张），请分批`,
    );
  }

  const cfg = await buildConfig();
  const ffmpegPath = await resolveFfmpegPath(cfg.ffmpegPath);
  const ark = createArkClient(cfg);
  const labels = await labelStickers(gifs, ark, ffmpegPath);

  // 预览图：GIF 本身能在 <img> 里直接动起来，直接内联原文件（省一次抽帧转码）
  const byName = new Map(gifs.map((p) => [path.basename(p), p]));
  return Promise.all(
    labels.map(async (l) => {
      const absPath = byName.get(l.sourceName) ?? '';
      let previewDataUrl = '';
      try {
        const buf = await readFile(absPath);
        previewDataUrl = `data:image/gif;base64,${buf.toString('base64')}`;
      } catch {
        // 读不到就没预览，复核界面已按 confidence=0 标红
      }
      return { ...l, absPath, previewDataUrl };
    }),
  );
}

/**
 * 阶段二：转码落盘 + 写 manifest + 热重载。
 *
 * 落盘顺序刻意如此：先把原始 GIF 拷进 imported/_raw/，再转码。
 * 这样中途失败也留着原件，重试/改映射零成本（与血泪坑 4「原始 mp4 永久留在 .job/」同思路）。
 */
export async function applyStickers(
  dirId: string,
  assignments: StickerAssignment[],
): Promise<ImportResult> {
  const outDir = path.join(charactersDir(), dirId);
  const manifestPath = path.join(outDir, 'manifest.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;

  const cfg = await buildConfig();
  const ffmpegPath = await resolveFfmpegPath(cfg.ffmpegPath);

  const importedDir = path.join(outDir, 'imported');
  const rawDir = path.join(importedDir, '_raw');
  await mkdir(rawDir, { recursive: true });

  const imported: Record<string, ManifestImportedAction> = {};
  const spares: ManifestImportedAction[] = [];
  const failed: ImportResult['failed'] = [];

  for (const a of assignments) {
    const base = safeFileName(a.sourceName);
    const stem = stemFor(a.slot, a.sourceName);
    const rawRel = path.posix.join('imported/_raw', base);
    const webmRel = path.posix.join('imported', `${stem}.webm`);
    try {
      await copyFile(a.absPath, path.join(outDir, rawRel));
      const webmAbs = path.join(outDir, 'imported', `${stem}.webm`);
      await gifToWebm(a.absPath, webmAbs, ffmpegPath);
      const entry: ManifestImportedAction = {
        webm: webmRel,
        raw: rawRel,
        // 探不到时长给 5s 兜底（播放层只拿它做安全超时，不值得为此让导入失败）
        durationSec: (await probeDurationSec(webmAbs, ffmpegPath)) ?? 5,
        sourceName: a.sourceName,
        category: a.category,
        suggestedSlot: a.suggestedSlot,
        confidence: a.confidence,
        manualOverride: isManualOverride(a.suggestedSlot, a.slot),
      };
      if (a.slot) imported[a.slot] = entry;
      else spares.push(entry);
    } catch (err) {
      failed.push({
        sourceName: a.sourceName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 合并而非覆盖：分批导入时前一批的槽位要保住
  manifest.importedActions = mergeImported(manifest.importedActions, imported);
  manifest.spareStickers = mergeSpares(manifest.spareStickers, spares);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  // 热重载：重发 characters:activated 让 pet 重建 Player（否则新 webm 不会被加载）
  const meta = await getCharacter(dirId);
  if (meta?.manifest && (await getSettings()).activeCharacter === dirId) {
    broadcastCharacterActivated(meta);
  }
  await rebuildTray();

  return { slots: Object.keys(imported), spareCount: spares.length, failed };
}

/**
 * 一步回退：删掉 importedActions（+ 备选库），恢复生成动作。
 * 只改 manifest，imported/ 里的文件留着——用户后悔了还能再导一次同一批。
 */
export async function clearImportedStickers(dirId: string): Promise<void> {
  const manifestPath = path.join(charactersDir(), dirId, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  manifest.importedActions = undefined;
  manifest.spareStickers = undefined;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  const meta = await getCharacter(dirId);
  if (meta?.manifest && (await getSettings()).activeCharacter === dirId) {
    broadcastCharacterActivated(meta);
  }
  await rebuildTray();
}
