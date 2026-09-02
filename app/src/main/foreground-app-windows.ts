import { execFile } from 'node:child_process';

const POWERSHELL_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class QBotForegroundWindow {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hWnd);
}
'@
$handle = [QBotForegroundWindow]::GetForegroundWindow()
if ($handle -eq [IntPtr]::Zero) {
  @{ app = '' } | ConvertTo-Json -Compress
  exit 0
}
$processId = [uint32]0
[void][QBotForegroundWindow]::GetWindowThreadProcessId($handle, [ref]$processId)
$length = [QBotForegroundWindow]::GetWindowTextLength($handle)
$builder = New-Object System.Text.StringBuilder ($length + 1)
[void][QBotForegroundWindow]::GetWindowText($handle, $builder, $builder.Capacity)
$rect = New-Object QBotForegroundWindow+RECT
$hasRect = [QBotForegroundWindow]::GetWindowRect($handle, [ref]$rect)
$process = Get-Process -Id $processId -ErrorAction Stop
$path = ''
$productName = ''
try { $path = $process.MainModule.FileName } catch {}
try { $productName = $process.MainModule.FileVersionInfo.ProductName } catch {}
$appName = if ($productName) { $productName } else { $process.ProcessName }
[ordered]@{
  app = $appName
  windowTitle = $builder.ToString()
  processId = [int]$processId
  processName = $process.ProcessName
  executablePath = $path
  windowBounds = if ($hasRect) { [ordered]@{ x = $rect.Left; y = $rect.Top; width = $rect.Right - $rect.Left; height = $rect.Bottom - $rect.Top } } else { $null }
  windowState = if ([QBotForegroundWindow]::IsIconic($handle)) { 'minimized' } elseif ([QBotForegroundWindow]::IsZoomed($handle)) { 'maximized' } else { 'normal' }
  isResponding = [bool]$process.Responding
  detailLevel = 'full'
} | ConvertTo-Json -Compress
`;

export function collectWindowsForegroundJson(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', POWERSHELL_SCRIPT],
      { timeout: 4_000, windowsHide: true, maxBuffer: 64 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message).trim().slice(0, 300)));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}
