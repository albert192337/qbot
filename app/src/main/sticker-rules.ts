/**
 * 表情包导入的纯逻辑（可单测，零 Electron / 零 IO）。
 * sticker-importer.ts 负责 IO 与 IPC，判断都在这里。
 * spec: docs/superpowers/specs/2026-08-21-sticker-pack-import-design.md
 */
import type { ManifestImportedAction } from '@qbot/pipeline';

/**
 * 文件名消毒：贴纸名来自用户文件系统，进落盘路径前必须清干净。
 * 只保留字母数字/下划线/点/连字符/中文，其余一律换 `_`。
 * 重点防三样：路径分隔符（`/` `\`）、`..` 目录穿越、Windows 保留字符。
 */
export function safeFileName(name: string): string {
  // 先剥目录部分（同时处理 POSIX 和 Windows 分隔符），再洗剩下的字符
  const base = name.split(/[/\\]/).pop() ?? '';
  const cleaned = base.replace(/[^\w.\-一-鿿]/g, '_');
  // 全是点的名字（. / .. / ...）洗完仍是点，直接判废
  return /^\.+$/.test(cleaned) || cleaned === '' ? 'sticker' : cleaned;
}

/**
 * 落盘文件名主干：槽位贴纸按槽位命名（idle.webm），
 * 备选库按原名加前缀（避免和槽位文件重名互相覆盖）。
 */
export function stemFor(slot: string | null, sourceName: string): string {
  if (slot) return slot;
  const safe = safeFileName(sourceName);
  const dot = safe.lastIndexOf('.');
  return `spare_${dot > 0 ? safe.slice(0, dot) : safe}`;
}

/**
 * 用户是否改过模型的建议。
 * 两个方向都算：建议落槽 A 但用户改成 B / 用户扔进备选库，
 * 或模型没给建议但用户手动指定了槽位。
 */
export function isManualOverride(
  suggestedSlot: string | undefined,
  chosenSlot: string | null,
): boolean {
  return (suggestedSlot ?? null) !== (chosenSlot ?? null);
}

/**
 * 合并导入结果到既有 manifest 字段。
 * 合并而非替换：分批导入时前一批占的槽位要保住（同槽位后来者覆盖）。
 */
export function mergeImported(
  existing: Record<string, ManifestImportedAction> | undefined,
  incoming: Record<string, ManifestImportedAction>,
): Record<string, ManifestImportedAction> {
  return { ...existing, ...incoming };
}

/** 备选库追加（同名不去重：同一张贴纸可以按不同参数导入多次） */
export function mergeSpares(
  existing: ManifestImportedAction[] | undefined,
  incoming: ManifestImportedAction[],
): ManifestImportedAction[] | undefined {
  const all = [...(existing ?? []), ...incoming];
  return all.length > 0 ? all : undefined;
}

/**
 * 播放层可用动作合并顺序（spec §4.3）：标准动作 → 导入贴纸 → 自定义动作。
 * 后者覆盖同名前者。这里只算 key 集合，供测试和调试面板核对。
 */
export function mergedActionIds(m: {
  actions: Record<string, { status?: string }>;
  importedActions?: Record<string, unknown>;
  customActions?: Record<string, { status?: string }>;
}): string[] {
  const ids = new Set<string>();
  for (const [id, a] of Object.entries(m.actions)) {
    if (a.status === 'done') ids.add(id);
  }
  // 导入贴纸没有 status（落盘即可用）
  for (const id of Object.keys(m.importedActions ?? {})) ids.add(id);
  for (const [id, a] of Object.entries(m.customActions ?? {})) {
    if (a.status === 'done') ids.add(id);
  }
  return [...ids];
}
