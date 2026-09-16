import { spawn } from 'node:child_process';
import type { BrowserWindow, Rectangle } from 'electron';

/** Shell attachment is deliberately isolated: no wallpaper/registry mutations, no
 * fallback to an ordinary overlay if this Windows shell layout is unsupported. */
export function attachWeatherToDesktop(win: BrowserWindow, bounds: Rectangle, onLost: () => void): Promise<() => void> {
  const handle = win.getNativeWindowHandle();
  const hwnd = handle.length === 8 ? handle.readBigUInt64LE().toString() : String(handle.readUInt32LE());
  const values = [bounds.x, bounds.y, bounds.width, bounds.height, process.pid];
  if (!values.every(Number.isSafeInteger)) return Promise.reject(new Error('Invalid desktop bounds'));
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class QBotWeatherDesktop {
  public delegate bool EnumProc(IntPtr w, IntPtr p);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr p, IntPtr after, string c, string t);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc fn, IntPtr p);
  [DllImport("user32.dll")] public static extern IntPtr SendMessageTimeout(IntPtr w, uint m, IntPtr a, IntPtr b, uint f, uint ms, out IntPtr r);
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SetParent(IntPtr w, IntPtr p);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr w);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr w, uint command);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr w);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr w);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr w, int n);
  [DllImport("user32.dll", SetLastError=true)] public static extern int SetWindowLong(IntPtr w, int n, int v);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetWindowPos(IntPtr w, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr w, int cmd);
  [DllImport("user32.dll")] public static extern int MapWindowPoints(IntPtr from, IntPtr to, ref POINT point, uint count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr w, out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  public static IntPtr Attach(IntPtr w, int pid, int x, int y, int width, int height) {
    uint owner; GetWindowThreadProcessId(w, out owner);
    if (owner != pid || !IsWindow(w)) throw new Exception("Weather window owner mismatch");
    SetThreadDpiAwarenessContext(new IntPtr(-4));
    IntPtr progman = FindWindow("Progman", null), result;
    if (progman == IntPtr.Zero) throw new Exception("Windows desktop is unavailable");
    // Explorer's WorkerW arrangement is not a public wallpaper API. Fail closed.
    SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(1), 2, 1000, out result);
    uint shellPid; GetWindowThreadProcessId(progman, out shellPid);
    IntPtr icons = FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
    IntPtr wallpaper = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
    // Windows 11's new shell hosts the opaque wallpaper inside a child WorkerW.
    // A child of that WorkerW can be covered by its own composition surface.
    // Be a sibling instead: Progman -> icons, weather, system wallpaper.
    bool modern = icons != IntPtr.Zero && wallpaper != IntPtr.Zero && IsWindowVisible(wallpaper);
    IntPtr desktop = modern ? progman : IntPtr.Zero;
    if (!modern) EnumWindows(delegate(IntPtr top, IntPtr ignored) {
      uint candidatePid; GetWindowThreadProcessId(top, out candidatePid);
      if (candidatePid == shellPid && IsWindowVisible(top) && FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero) {
        var candidate = FindWindowEx(IntPtr.Zero, top, "WorkerW", null);
        while (candidate != IntPtr.Zero) {
          GetWindowThreadProcessId(candidate, out candidatePid);
          if (candidatePid == shellPid && IsWindowVisible(candidate) && FindWindowEx(candidate, IntPtr.Zero, "SHELLDLL_DefView", null) == IntPtr.Zero) {
            desktop = candidate; break;
          }
          candidate = FindWindowEx(IntPtr.Zero, candidate, "WorkerW", null);
        }
      }
      return desktop == IntPtr.Zero;
    }, IntPtr.Zero);
    if (desktop == IntPtr.Zero)
      throw new Exception("This Windows desktop layout does not support weather backgrounds");
    // Match the child-window relationship and make the surface non-activating/click-through.
    SetWindowLong(w, -16, (GetWindowLong(w, -16) & ~unchecked((int)0x80000000)) | 0x40000000);
    SetWindowLong(w, -20, GetWindowLong(w, -20) | 0x08000020);
    SetParent(w, desktop);
    int attachError = Marshal.GetLastWin32Error();
    if (GetParent(w) != desktop) throw new Exception("Could not attach weather behind desktop icons (Win32 " + attachError + ")");
    POINT p = new POINT { X = x, Y = y };
    MapWindowPoints(IntPtr.Zero, desktop, ref p, 1);
    if (!SetWindowPos(w, modern ? icons : IntPtr.Zero, p.X, p.Y, width, height, 0x0010 | 0x0020 | 0x0040))
      throw new Exception("Could not position weather background");
    if (modern && !HasDesktopOrder(w, desktop)) throw new Exception("Weather background is behind the system wallpaper");
    return desktop;
  }
  public static bool HasDesktopOrder(IntPtr w, IntPtr desktop) {
    if (GetParent(w) != desktop || !IsWindowVisible(desktop)) return false;
    var icons = FindWindowEx(desktop, IntPtr.Zero, "SHELLDLL_DefView", null);
    var wallpaper = FindWindowEx(desktop, IntPtr.Zero, "WorkerW", null);
    if (icons == IntPtr.Zero || wallpaper == IntPtr.Zero) return true;
    bool sawIcons = false, sawWeather = false;
    for (var child = GetWindow(desktop, 5); child != IntPtr.Zero; child = GetWindow(child, 2)) {
      if (child == icons) sawIcons = true;
      if (child == w) { if (!sawIcons) return false; sawWeather = true; }
      if (child == wallpaper) return sawWeather;
    }
    return false;
  }
  public static bool Maintain(IntPtr w, IntPtr desktop) {
    if (!IsWindow(desktop) || GetParent(w) != desktop) return false;
    if (HasDesktopOrder(w, desktop)) return true;
    var icons = FindWindowEx(desktop, IntPtr.Zero, "SHELLDLL_DefView", null);
    if (icons == IntPtr.Zero) return false;
    SetWindowPos(w, icons, 0, 0, 0, 0, 0x0010 | 0x0001 | 0x0002);
    return HasDesktopOrder(w, desktop);
  }
}
'@
$weatherHandle = [IntPtr]::new(${hwnd})
try { $desktopHandle = [QBotWeatherDesktop]::Attach($weatherHandle, ${process.pid}, ${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height}) }
catch { [Console]::Error.WriteLine($_.Exception.GetBaseException().Message); exit 1 }
Write-Output ('{"ready":true,"parent":"' + $desktopHandle.ToInt64() + '"}')
while ([QBotWeatherDesktop]::IsWindow($weatherHandle)) {
  if (-not [QBotWeatherDesktop]::Maintain($weatherHandle, $desktopHandle)) {
    [void][QBotWeatherDesktop]::ShowWindow($weatherHandle, 0)
    Write-Output '{"lost":true}'
    break
  }
  Start-Sleep -Milliseconds 1000
}
`;
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false, disposed = false, stdout = '', stderr = '';
    const cleanup = () => { disposed = true; clearTimeout(timeout); child.kill(); };
    const fail = (message: string) => {
      if (disposed) return;
      cleanup();
      if (ready) onLost();
      else reject(new Error(message));
    };
    const timeout = setTimeout(() => fail('天气背景启动超时'), 15_000);
    child.stdout.on('data', data => {
      stdout += data.toString();
      let newline: number;
      while ((newline = stdout.indexOf('\n')) >= 0) {
        const line = stdout.slice(0, newline).trim(); stdout = stdout.slice(newline + 1);
        if (line.startsWith('{"ready":true') && !ready && !disposed) {
          console.info('[weather] desktop attached', line);
          ready = true; clearTimeout(timeout); resolve(cleanup);
        } else if (line === '{"lost":true}') fail('桌面背景层已失效');
      }
      if (stdout.length > 8192) fail('天气背景返回了无效状态');
    });
    child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-2000); });
    child.on('error', error => fail(error.message));
    child.on('exit', () => fail(stderr.trim() || '天气背景进程已结束'));
  });
}
