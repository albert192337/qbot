/**
 * Claude Code hooks 安装/卸载：往 ~/.claude/settings.json 写 7 类 hook，
 * 每个 hook = 一行 curl 把 stdin 的事件 JSON 原样转发到本机 agent-server。
 *
 * 原则：
 * - 显式同意：只由托盘菜单触发，弹确认框后才写文件，绝不启动时静默安装
 * - 幂等 + 可识别：命令串含 ~/.qbot/port 标记，安装先清后加，卸载按标记删
 * - 永不拖慢 agent：curl -m 2 + `; exit 0`，server 没起也瞬间放行
 * - 首次改写前备份 settings.json.qbot-backup
 * - 三平台同一条 POSIX 命令：Claude Code 在 Windows 上也用 bash 执行 hook
 */
import { dialog } from 'electron';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** 标记子串：属于 QBot 的 hook 条目靠它识别（安装/卸载/去重） */
const MARKER = '.qbot/port';

export const HOOK_EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'Stop',
  'SessionEnd',
] as const;

function settingsPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

/**
 * stdin 的 hook JSON 原样 POST；端口从 ~/.qbot/port 读（QBot 启动时写入）。
 *
 * 三平台同一条命令：Claude Code 在 Windows 上也用 bash 跑 hook
 * （实测 `$0` = /usr/bin/bash，随 Git for Windows 提供），所以 POSIX 写法通用。
 * `$HOME` 在 Git Bash 里正常有值，仅极少数环境缺失 → 退回 `$USERPROFILE`。
 */
export function hookCommand(): string {
  return (
    'sh -c \'curl -sf -m 2 -X POST -H "Content-Type: application/json" ' +
    '--data-binary @- "http://127.0.0.1:$(cat "${HOME:-$USERPROFILE}/' +
    MARKER +
    '" 2>/dev/null || echo 0)/state?agent=claude" >/dev/null 2>&1; exit 0\''
  );
}

export interface HookEntry {
  matcher?: string;
  hooks: Array<{ type: string; command: string; timeout?: number }>;
}

export type ClaudeSettings = Record<string, unknown> & {
  hooks?: Record<string, HookEntry[]>;
};

function isOurs(entry: HookEntry): boolean {
  return entry.hooks?.some((h) => typeof h.command === 'string' && h.command.includes(MARKER)) ?? false;
}

/** 纯变换：把 QBot 的 7 条 hook 并入 settings（先按标记清旧条目，故幂等） */
export function withHooks(s: ClaudeSettings, command = hookCommand()): ClaudeSettings {
  const hooks: Record<string, HookEntry[]> = { ...(s.hooks ?? {}) };
  for (const ev of HOOK_EVENTS) {
    const kept = (hooks[ev] ?? []).filter((e) => !isOurs(e));
    kept.push({ hooks: [{ type: 'command', command, timeout: 5 }] });
    hooks[ev] = kept;
  }
  return { ...s, hooks };
}

/** 纯变换：按标记摘掉 QBot 的 hook，别人的条目和其余配置一律不动 */
export function withoutHooks(s: ClaudeSettings): ClaudeSettings {
  if (!s.hooks) return s;
  const hooks: Record<string, HookEntry[]> = {};
  for (const [ev, entries] of Object.entries(s.hooks)) {
    const kept = Array.isArray(entries) ? entries.filter((e) => !isOurs(e)) : entries;
    if (Array.isArray(kept) && kept.length === 0) continue; // 空事件键不留
    hooks[ev] = kept as HookEntry[];
  }
  return { ...s, hooks };
}

/** 纯查询：settings 里是否已有 QBot 的 hook */
export function hasOurHooks(s: ClaudeSettings): boolean {
  return Object.values(s.hooks ?? {}).some((entries) =>
    Array.isArray(entries) ? entries.some(isOurs) : false,
  );
}

async function readSettings(): Promise<ClaudeSettings> {
  try {
    return JSON.parse(await readFile(settingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

export async function claudeHooksPresent(): Promise<boolean> {
  return hasOurHooks(await readSettings());
}

async function writeSettings(s: ClaudeSettings): Promise<void> {
  const p = settingsPath();
  await mkdir(path.dirname(p), { recursive: true });
  if (existsSync(p) && !existsSync(`${p}.qbot-backup`)) {
    await copyFile(p, `${p}.qbot-backup`);
  }
  await writeFile(p, `${JSON.stringify(s, null, 2)}\n`);
}

export async function installClaudeHooks(): Promise<void> {
  await writeSettings(withHooks(await readSettings()));
}

export async function uninstallClaudeHooks(): Promise<void> {
  const s = await readSettings();
  if (!s.hooks) return;
  await writeSettings(withoutHooks(s));
}

/**
 * hook 依赖 sh + curl（Windows 上由 Git for Windows 提供，Claude Code 自己也用它跑 hook）。
 * 缺了就装不了：写进去的 hook 每次都会失败刷 Claude Code 的错误。
 */
function findMissingDeps(): string[] {
  const missing: string[] = [];
  for (const bin of ['sh', 'curl']) {
    const probe = spawnSync(bin, ['--version'], { stdio: 'ignore', windowsHide: true });
    if (probe.error) missing.push(bin);
  }
  return missing;
}

/** 托盘入口：确认框 + 安装/卸载，返回操作后是否已安装 */
export async function toggleClaudeHooks(installed: boolean): Promise<boolean> {
  if (!installed) {
    const missing = findMissingDeps();
    if (missing.length > 0) {
      await dialog.showMessageBox({
        type: 'warning',
        message: '缺少联动所需的命令行工具',
        detail:
          `找不到：${missing.join('、')}。\n\n` +
          (process.platform === 'win32'
            ? 'Windows 上这些由 Git for Windows 提供（Claude Code 本身也用它执行 hook）。装好后重开 QBot 再试。'
            : '请确认它们在 PATH 中。'),
      });
      return false;
    }
  }
  if (installed) {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      message: '断开 Claude Code 联动？',
      detail: `将从 ~/.claude/settings.json 移除 QBot 的 ${HOOK_EVENTS.length} 条 hooks，其余配置不动。`,
      buttons: ['断开', '取消'],
      cancelId: 1,
    });
    if (response !== 0) return true;
    await uninstallClaudeHooks();
    return false;
  }
  const { response } = await dialog.showMessageBox({
    type: 'question',
    message: '接入 Claude Code 联动？',
    detail:
      `将往 ~/.claude/settings.json 写入 ${HOOK_EVENTS.length} 条 hooks（SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Notification/Stop/SessionEnd）。\n\n` +
      'Claude Code 干活时桌宠会跟着切状态：思考=喝茶、干活=聊天、要授权=蹦跳求关注、完成=开心。\n' +
      'hook 只把事件转发到本机 127.0.0.1，不出网。首次写入前自动备份。',
    buttons: ['接入', '取消'],
    cancelId: 1,
  });
  if (response !== 0) return false;
  await installClaudeHooks();
  return true;
}
