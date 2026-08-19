/**
 * 全局键盘敲击**计数**（Windows 专属）——「敲键盘 +1 点」的数据来源。
 *
 * 隐私边界（重要，改这个文件前先读）：
 * - 只统计「按下次数」，**不记录、不上报按了哪个键**。PowerShell 子进程 stdout
 *   里只有 `{"keys":N}` 一个数字，C# 侧的 vk 值出不了那个 for 循环。
 * - 纯本地，不进网络、不写盘（只有汇总点数落 progress.json）。
 * - 非 Windows 静默禁用；退出时随 before-quit 收进程。
 *
 * 为什么要在 PowerShell 里编译 C#（`Add-Type -TypeDefinition`）而不是纯 PS 轮询：
 * 数键要对 vk 8..255 逐个 GetAsyncKeyState，20 次/秒 × 248 个 = 每秒 5000 次
 * P/Invoke，纯 PowerShell 跑这个吃掉小半个核；放进编译好的 C# 循环后，PS 侧
 * 每 50ms 只做一次方法调用，CPU 可忽略。
 *
 * 踩过的坑：**首轮 Poll 必须只播种不计数**。prev 初始全 false，而部分保留 vk
 * 首次调用会返回置位的脏值 —— 实测启动瞬间会凭空多算 5 下。
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { addKeystrokes } from './progress';

/** C# 内部轮询间隔（越小越不容易漏掉快速连击） */
const POLL_MS = 50;
/** 每多少次轮询汇报一次（POLL_MS × 这个 = 汇报周期，约 1s） */
const REPORT_EVERY = 20;
/** 进程意外退出后的重启延迟 */
const RESPAWN_MS = 10_000;
/** 单次汇报的计数上限：真人一秒敲不了这么多，超了说明读到脏值，丢弃防作弊/防脏数据 */
const MAX_KEYS_PER_REPORT = 40;

let child: ChildProcess | null = null;
let respawnTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;

/** 常驻脚本：每 REPORT_EVERY × POLL_MS 输出一行 {"keys":N} */
const SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class QBotKeys {
  [DllImport("user32.dll")]
  private static extern short GetAsyncKeyState(int vKey);
  private static bool[] prev = new bool[256];
  private static bool seeded = false;
  // 只回「新按下了几个键」；vk 值不出这个循环，调用方拿不到是哪个键
  public static int Poll() {
    int n = 0;
    for (int vk = 8; vk < 256; vk++) {
      bool down = (GetAsyncKeyState(vk) & 0x8000) != 0;
      if (down && !prev[vk]) n++;
      prev[vk] = down;
    }
    if (!seeded) { seeded = true; return 0; }
    return n;
  }
}
'@
} catch {
  Write-Output ('{"fatal":"' + ($_.Exception.Message -replace '"','') + '"}')
  exit 1
}
$acc = 0
$ticks = 0
while ($true) {
  try { $acc += [QBotKeys]::Poll() } catch { }
  Start-Sleep -Milliseconds ${POLL_MS}
  $ticks++
  if ($ticks -ge ${REPORT_EVERY}) {
    $ticks = 0
    if ($acc -gt 0) {
      Write-Output ('{"keys":' + $acc + '}')
      $acc = 0
    }
  }
}
`.trim();

function handleLine(line: string): void {
  const s = line.trim();
  if (!s.startsWith('{')) return;
  let parsed: { keys?: unknown; fatal?: unknown };
  try {
    parsed = JSON.parse(s);
  } catch {
    return;
  }
  if (typeof parsed.fatal === 'string') {
    console.error('[input-monitor] PowerShell 初始化失败，键盘计分禁用:', parsed.fatal.slice(0, 200));
    return; // 进程自己 exit 1，重启交给 exit 处理器
  }
  const keys = parsed.keys;
  if (typeof keys !== 'number' || !Number.isFinite(keys) || keys <= 0) return;
  if (keys > MAX_KEYS_PER_REPORT) return;
  void addKeystrokes(keys);
}

function scheduleRespawn(): void {
  if (stopped || respawnTimer) return;
  respawnTimer = setTimeout(() => {
    respawnTimer = null;
    spawnMonitor();
  }, RESPAWN_MS);
}

function spawnMonitor(): void {
  if (stopped) return;
  // 血泪坑 13：必须 spawn + 显式 args，exec + shell:'powershell.exe' 会静默不执行
  child = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', SCRIPT],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let buf = '';
  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    buf += chunk;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? ''; // 末尾可能是半行，留到下次
    for (const l of lines) handleLine(l);
  });
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (d: string) => {
    const msg = d.trim();
    if (msg) console.error('[input-monitor] powershell stderr:', msg.slice(0, 300));
  });
  child.on('error', (err) => {
    console.error('[input-monitor] 启动 powershell 失败:', err.message);
    child = null;
    scheduleRespawn();
  });
  child.on('exit', () => {
    child = null;
    scheduleRespawn();
  });
}

export function startInputMonitor(): void {
  if (process.platform !== 'win32') return; // GetAsyncKeyState 是 Win32 API
  stopped = false;
  spawnMonitor();
}

export function stopInputMonitor(): void {
  stopped = true;
  if (respawnTimer) {
    clearTimeout(respawnTimer);
    respawnTimer = null;
  }
  child?.kill();
  child = null;
}
