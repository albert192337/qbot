/**
 * Claude Code hooks 安装/卸载：往 ~/.claude/settings.json 写 7 类 hook，
 * 每个 hook = 一行 curl 把 stdin 的事件 JSON 原样转发到本机 agent-server。
 *
 * 原则：
 * - 显式同意：只由托盘菜单触发，弹确认框后才写文件，绝不启动时静默安装
 * - 幂等 + 可识别：命令串含 ~/.qbot/port 标记，安装先清后加，卸载按标记删
 * - 永不拖慢 agent：curl -m 2 + `; exit 0`，server 没起也瞬间放行
 * - 首次改写前备份 settings.json.qbot-backup
 */
import { dialog } from 'electron';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** 标记子串：属于 QBot 的 hook 条目靠它识别（安装/卸载/去重） */
const MARKER = '.qbot/port';

const HOOK_EVENTS = [
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

function hookCommand(): string {
  // stdin 的 hook JSON 原样 POST；端口从 ~/.qbot/port 读（QBot 启动时写入）
  return (
    'sh -c \'curl -sf -m 2 -X POST -H "Content-Type: application/json" ' +
    '--data-binary @- "http://127.0.0.1:$(cat "$HOME/' +
    MARKER +
    '" 2>/dev/null || echo 0)/state?agent=claude" >/dev/null 2>&1; exit 0\''
  );
}

interface HookEntry {
  matcher?: string;
  hooks: Array<{ type: string; command: string; timeout?: number }>;
}

type ClaudeSettings = Record<string, unknown> & {
  hooks?: Record<string, HookEntry[]>;
};

function isOurs(entry: HookEntry): boolean {
  return entry.hooks?.some((h) => typeof h.command === 'string' && h.command.includes(MARKER)) ?? false;
}

async function readSettings(): Promise<ClaudeSettings> {
  try {
    return JSON.parse(await readFile(settingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

export async function claudeHooksPresent(): Promise<boolean> {
  const s = await readSettings();
  return Object.values(s.hooks ?? {}).some((entries) =>
    Array.isArray(entries) ? entries.some(isOurs) : false,
  );
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
  const s = await readSettings();
  const hooks: Record<string, HookEntry[]> = { ...(s.hooks ?? {}) };
  for (const ev of HOOK_EVENTS) {
    const kept = (hooks[ev] ?? []).filter((e) => !isOurs(e));
    kept.push({ hooks: [{ type: 'command', command: hookCommand(), timeout: 5 }] });
    hooks[ev] = kept;
  }
  await writeSettings({ ...s, hooks });
}

export async function uninstallClaudeHooks(): Promise<void> {
  const s = await readSettings();
  if (!s.hooks) return;
  const hooks: Record<string, HookEntry[]> = {};
  for (const [ev, entries] of Object.entries(s.hooks)) {
    const kept = Array.isArray(entries) ? entries.filter((e) => !isOurs(e)) : entries;
    if (Array.isArray(kept) && kept.length === 0) continue; // 空事件键不留
    hooks[ev] = kept as HookEntry[];
  }
  await writeSettings({ ...s, hooks });
}

/** 托盘入口：确认框 + 安装/卸载，返回操作后是否已安装 */
export async function toggleClaudeHooks(installed: boolean): Promise<boolean> {
  if (process.platform === 'win32') {
    await dialog.showMessageBox({
      type: 'info',
      message: 'Windows 的 Claude Code 联动还在路上',
      detail: '当前 hook 依赖 sh + curl，Windows 版本会用独立实现。',
    });
    return installed;
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
