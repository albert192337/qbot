$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WeatherTree {
 public delegate bool EnumProc(IntPtr w, IntPtr p);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback,IntPtr p);
 [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr w,uint command);
 [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr w);
 [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr w,int index);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr w);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr w,out RECT rect);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr w,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr w,StringBuilder name,int length);
 [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr w,int attribute,out int value,int size);
 public static string Class(IntPtr w) { var s=new StringBuilder(256); GetClassName(w,s,s.Capacity); return s.ToString(); }
 public static void Dump(IntPtr w,int depth) {
  RECT r; GetWindowRect(w,out r); uint pid; GetWindowThreadProcessId(w,out pid); int cloaked; DwmGetWindowAttribute(w,14,out cloaked,4);
  Console.WriteLine(new string(' ',depth*2)+w+" "+Class(w)+" pid="+pid+" visible="+IsWindowVisible(w)+" cloak="+cloaked+" rect="+r.Left+","+r.Top+","+r.Right+","+r.Bottom+" style="+GetWindowLong(w,-16).ToString("X8")+" ex="+GetWindowLong(w,-20).ToString("X8"));
  if(depth>=3) return;
  for(var child=GetWindow(w,5);child!=IntPtr.Zero;child=GetWindow(child,2)) Dump(child,depth+1);
 }
 public static void Run() {
  EnumWindows(delegate(IntPtr w,IntPtr p) { var c=Class(w); if(c=="WorkerW"||c=="Progman") Dump(w,0); return true; },IntPtr.Zero);
 }
}
'@
[WeatherTree]::Run()
