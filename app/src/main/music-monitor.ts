/**
 * 网易云音乐播放监控：通过 Windows SMTC（SystemMediaTransportControls）
 * 读取当前媒体会话，检测云音乐播放状态与曲目信息，广播给 pet 窗口。
 *
 * 实测（PowerShell 5.1 / Win11）：云音乐的 SourceAppUserModelId 就是 "cloudmusic.exe"，
 * PlaybackStatus 为 "Playing"/"Paused"。
 *
 * 实现要点（血泪）：
 * 1. 必须 spawn + 显式 -Command 传脚本。用 exec({shell:'powershell.exe'}) 时 Node 会塞
 *    cmd.exe 的 /d /s /c 开关给 powershell.exe，脚本根本不执行。
 * 2. WinRT 的 IAsyncOperation 要用 System.Runtime.WindowsRuntime 的 AsTask 包装后 Wait，
 *    直接摸 .IsCompleted/.GetResults() 不可靠。程序集名是 Windows.Media.Control。
 * 3. 曲名多为中文 → 脚本里必须设 [Console]::OutputEncoding = UTF8，否则拿到乱码。
 * 4. 常驻一个 PowerShell 进程内部循环，而不是每 3s 重启一个（省掉 ~0.5s 启动开销）。
 *
 * Windows-only：其他平台静默禁用。
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { getPetWindow } from './windows';
import type { MusicStatus } from '../shared/ipc-types';

/** 轮询间隔（PowerShell 进程内部循环） */
const POLL_SEC = 3;
/** 进程意外退出后的重启延迟 */
const RESPAWN_MS = 10_000;

let child: ChildProcess | null = null;
let respawnTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;
let currentStatus: MusicStatus = { playing: false };

/** 常驻脚本：每 POLL_SEC 秒输出一行 JSON 描述云音乐当前状态 */
const SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'
  })[0]
  function Await($op, $t) {
    $m = $asTaskGeneric.MakeGenericMethod($t)
    $task = $m.Invoke($null, @($op))
    $task.Wait(-1) | Out-Null
    $task.Result
  }
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
  $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
  $propType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
  $mgr = Await ($mgrType::RequestAsync()) ($mgrType)
} catch {
  Write-Output ('{"fatal":"' + ($_.Exception.Message -replace '"','') + '"}')
  exit 1
}
while ($true) {
  $out = '{"playing":false}'
  try {
    foreach ($s in $mgr.GetSessions()) {
      $id = $s.SourceAppUserModelId
      # 云音乐 AUMID 实测为 cloudmusic.exe；-like 大小写不敏感
      if ($id -notlike '*cloudmusic*' -and $id -notlike '*netease*') { continue }
      if ($s.GetPlaybackInfo().PlaybackStatus -ne 'Playing') { continue }
      $title = ''
      $artist = ''
      try {
        $p = Await ($s.TryGetMediaPropertiesAsync()) ($propType)
        if ($p) {
          $title = "$($p.Title)"
          $artist = "$($p.Artist)"
        }
      } catch { }
      $obj = [ordered]@{ playing = $true; title = $title; artist = $artist }
      $out = $obj | ConvertTo-Json -Compress
      break
    }
  } catch { }
  Write-Output $out
  Start-Sleep -Seconds ${POLL_SEC}
}
`.trim();

function handleLine(line: string): void {
  const text = line.trim();
  if (!text.startsWith('{')) return;
  let parsed: { playing?: boolean; title?: string; artist?: string; fatal?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    return;
  }
  if (parsed.fatal) {
    console.error('[music-monitor] SMTC 初始化失败，音乐联动禁用:', parsed.fatal);
    return;
  }
  updateStatus({
    playing: !!parsed.playing,
    title: parsed.title || undefined,
    artist: parsed.artist || undefined,
  });
}

function updateStatus(next: MusicStatus): void {
  // 曲目切换也要播报（举牌文字要更新），但同状态同曲目不重复广播
  if (
    next.playing === currentStatus.playing &&
    next.title === currentStatus.title &&
    next.artist === currentStatus.artist
  ) {
    return;
  }
  currentStatus = next;
  getPetWindow()?.webContents.send('music:status', next);
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
    if (msg) console.error('[music-monitor] powershell stderr:', msg.slice(0, 300));
  });
  child.on('error', (err) => {
    console.error('[music-monitor] 启动 powershell 失败:', err.message);
    child = null;
    scheduleRespawn();
  });
  child.on('exit', () => {
    child = null;
    // 进程意外退出（脚本报错/被杀）→ 状态归零并延时重启
    updateStatus({ playing: false });
    scheduleRespawn();
  });
}

export function startMusicMonitor(): void {
  if (process.platform !== 'win32') return; // 仅 Windows 支持 SMTC
  stopped = false;
  spawnMonitor();
}

export function stopMusicMonitor(): void {
  stopped = true;
  if (respawnTimer) {
    clearTimeout(respawnTimer);
    respawnTimer = null;
  }
  child?.kill();
  child = null;
}

export function getMusicStatus(): MusicStatus {
  return currentStatus;
}
