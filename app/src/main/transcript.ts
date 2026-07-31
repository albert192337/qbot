/**
 * Claude Code transcript（JSONL）尾块读取。
 * 只做 fs 外壳，解析逻辑全在 agent-message.ts（纯函数，可单测）。
 *
 * 为什么反向读尾块：transcript 实测能到几百 KB ~ 几十 MB，且最后一行通常不是
 * assistant（尾部常是 system / last-prompt），必须从尾向前扫。
 */
import { open, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { lastAssistantEntry, type AssistantEntry } from './agent-message';

const TAIL_BYTES = 256 * 1024;
/** 尾块里全是 tool_result 时的加大重试上限 */
const TAIL_BYTES_MAX = 2 * 1024 * 1024;

/** transcript 允许的根目录（transcript_path 来自 HTTP body，不能无条件信任） */
function allowedRoots(): string[] {
  const roots = [path.join(os.homedir(), '.claude', 'projects')];
  const custom = process.env.CLAUDE_CONFIG_DIR;
  if (custom) roots.push(path.join(custom, 'projects'));
  return roots;
}

function isAllowed(p: string): boolean {
  return allowedRoots().some((root) => p.startsWith(root + path.sep));
}

async function readTail(
  p: string,
  bytes: number,
): Promise<{ entry: AssistantEntry | null; atFileStart: boolean }> {
  let fh;
  try {
    const st = await stat(p);
    if (!st.isFile() || st.size === 0) return { entry: null, atFileStart: true };
    const start = Math.max(0, st.size - bytes);
    const len = st.size - start;
    fh = await open(p, 'r');
    const buf = Buffer.allocUnsafe(len);
    await fh.read(buf, 0, len, start);
    const atFileStart = start === 0;
    return { entry: lastAssistantEntry(buf.toString('utf8'), atFileStart), atFileStart };
  } catch {
    return { entry: null, atFileStart: true }; // 文件不存在 / 无权限 / 读到一半被删
  } finally {
    await fh?.close();
  }
}

/**
 * 取最后一条 assistant 回复。任何异常一律返回 null（绝不抛给 HTTP handler）。
 * 路径必须落在 ~/.claude/projects（或 CLAUDE_CONFIG_DIR）下且以 .jsonl 结尾——
 * 否则等于允许任意文件的尾部被显示到桌面上。
 */
export async function readLastAssistantEntry(p: unknown): Promise<AssistantEntry | null> {
  if (typeof p !== 'string' || !p.endsWith('.jsonl') || !path.isAbsolute(p)) return null;
  const resolved = path.normalize(p);
  if (!isAllowed(resolved)) {
    console.warn('agent-server: transcript 路径不在允许目录内，跳过', resolved);
    return null;
  }
  const first = await readTail(resolved, TAIL_BYTES);
  if (first.entry || first.atFileStart) return first.entry;
  // 尾块 256KB 里一条 assistant 都没有（长工具输出刷屏）→ 加大再试一次
  return (await readTail(resolved, TAIL_BYTES_MAX)).entry;
}
