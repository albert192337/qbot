import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { PerchRect } from '../shared/window-perch';
export interface PerchTarget { handle: string; pid: number; title: string; bounds: PerchRect; frame?: string | null }
// One private helper per docking session; no polling process startup on every frame.
const SCRIPT = String.raw`
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices;
public class QBotPerch {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
 public delegate bool Callback(IntPtr h, IntPtr p);
 [DllImport("user32.dll")] public static extern bool EnumWindows(Callback cb,IntPtr p);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr h,int index);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h,int a,out int v,int n);
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);
 public static bool Valid(IntPtr h,int own) {
  uint p; GetWindowThreadProcessId(h,out p); int cloak=0; DwmGetWindowAttribute(h,14,out cloak,4);
  var c=new StringBuilder(256); GetClassName(h,c,256);
  long ex=GetWindowLongPtr(h,-20).ToInt64();
  return p!=own && (ex & (0x20|0x80|0x08000000))==0 && IsWindowVisible(h) && !IsIconic(h) && cloak==0 && c.ToString()!="Progman" && c.ToString()!="WorkerW" && !c.ToString().Contains("TrayWnd");
 }
 public static long Find(int x,int y,int own) {
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  long found=0; EnumWindows((h,p)=> { Rect r; if(Valid(h,own) && GetWindowRect(h,out r) && x>=r.Left && x<r.Right && y>=r.Top && y<r.Bottom) { found=h.ToInt64(); return false; } return true; },IntPtr.Zero); return found;
 }
 public static string Capture(IntPtr h) {
  SetThreadDpiAwarenessContext(new IntPtr(-4)); Rect r; if(!GetWindowRect(h,out r))return null;
  int w=r.Right-r.Left,hh=r.Bottom-r.Top; if(w<=0||hh<=0||w>8192||hh>8192||(long)w*hh>33554432)return null;
  using(var bitmap=new System.Drawing.Bitmap(w,hh,System.Drawing.Imaging.PixelFormat.Format24bppRgb)) {
   using(var g=System.Drawing.Graphics.FromImage(bitmap)) { IntPtr dc=g.GetHdc(); bool ok; try{ok=PrintWindow(h,dc,2);}finally{g.ReleaseHdc(dc);}if(!ok)return null; }
   double scale=Math.Min(1,Math.Min(1280.0/w,800.0/hh));
   using(var small=new System.Drawing.Bitmap(bitmap,Math.Max(1,(int)(w*scale)),Math.Max(1,(int)(hh*scale))))
   using(var stream=new System.IO.MemoryStream()) { small.Save(stream,System.Drawing.Imaging.ImageFormat.Png);return Convert.ToBase64String(stream.ToArray()); }
  }
 }
}
'@
[void][QBotPerch]::SetThreadDpiAwarenessContext([IntPtr](-4))
while ($null -ne ($line=[Console]::ReadLine())) {
 try {
  $q=$line | ConvertFrom-Json
  $h=if($q.handle){[IntPtr]([long]$q.handle)}else{[IntPtr]([QBotPerch]::Find([int]$q.x,[int]$q.y,[int]$q.own))}
  if($h -eq [IntPtr]::Zero -or -not [QBotPerch]::Valid($h,[int]$q.own)){[Console]::WriteLine('null');continue}
  $r=New-Object QBotPerch+Rect; [void][QBotPerch]::GetWindowRect($h,[ref]$r)
  $p=[uint32]0; [void][QBotPerch]::GetWindowThreadProcessId($h,[ref]$p)
  $b=New-Object System.Text.StringBuilder 512; [void][QBotPerch]::GetWindowText($h,$b,512)
  $result=@{handle=$h.ToInt64().ToString();pid=$p;title=$b.ToString();bounds=@{x=$r.Left;y=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
  if($q.capture){$result.frame=[QBotPerch]::Capture($h)}
  [Console]::WriteLine(($result | ConvertTo-Json -Compress))
 } catch { [Console]::WriteLine('null') }
}
`;
export class PerchNative {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending: ((v: PerchTarget | null) => void) | null = null;
  private buffer = '';
  async query(pointOrHandle: { x: number; y: number } | { handle: string; capture?: boolean }): Promise<PerchTarget | null> {
    if (process.platform !== 'win32' || this.pending) return null;
    if (!this.child) {
      this.child = spawn('powershell.exe', ['-NoLogo','-NoProfile','-NonInteractive','-Command',SCRIPT], { windowsHide: true });
      this.child.stdout.setEncoding('utf8');
      this.child.stdout.on('data', (part: string) => {
        this.buffer += part;
        let end: number;
        while ((end = this.buffer.indexOf('\n')) >= 0) {
          const line = this.buffer.slice(0,end).trim(); this.buffer = this.buffer.slice(end+1);
          try { const value = JSON.parse(line); this.pending?.(value); } catch { this.pending?.(null); }
        }
      });
      const child=this.child;
      const closed=()=>{if(this.child===child)this.close();};
      child.on('error', closed); child.on('exit', closed); child.stdin.on('error',closed);
      this.child.stderr.resume();
    }
    return new Promise(resolve => {
      const timeout = setTimeout(() => this.close(), 5000);
      this.pending = value => { clearTimeout(timeout); this.pending = null; resolve(value); };
      this.child!.stdin.write(JSON.stringify({ ...pointOrHandle, own: process.pid })+'\n');
    });
  }
  async capture(handle: string): Promise<PerchTarget | null> { return this.query({handle,capture:true}); }
  close(): void { const child=this.child; this.child=null; this.buffer=''; this.pending?.(null); child?.kill(); }
}
