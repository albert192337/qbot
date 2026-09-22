/** Native bitmap surfaces: Chromium never becomes a child of Explorer. */
export const WEATHER_NATIVE_SOURCE = String.raw`
using System;
using System.IO;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
using System.Diagnostics;
using System.Threading;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class WeatherNative {
 public delegate bool EnumProc(IntPtr w, IntPtr p);
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; public POINT(int x,int y){X=x;Y=y;} }
 [StructLayout(LayoutKind.Sequential)] public struct SIZE { public int X,Y; public SIZE(int x,int y){X=x;Y=y;} }
 [StructLayout(LayoutKind.Sequential,Pack=1)] public struct BLEND { public byte Op,Flags,Alpha,Format; }
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindow(string c,string t);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p,IntPtr after,string c,string t);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc fn,IntPtr p);
 [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr w,uint m,IntPtr a,IntPtr b,uint f,uint ms,out IntPtr result);
 [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr w,uint cmd);
 [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr w);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr w);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr w);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr w,out uint pid);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
 [DllImport("user32.dll",SetLastError=true)] static extern bool SetWindowPos(IntPtr w,IntPtr after,int x,int y,int width,int height,uint flags);
 [DllImport("user32.dll")] static extern int MapWindowPoints(IntPtr from,IntPtr to,ref POINT point,uint count);
 [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr w,int command);
 [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr w);
 [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr w,IntPtr dc);
 [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr dc);
 [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);
 [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc,IntPtr obj);
 [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr obj);
 [DllImport("user32.dll",SetLastError=true)] static extern bool UpdateLayeredWindow(IntPtr w,IntPtr dstDC,IntPtr destination,ref SIZE size,IntPtr sourceDC,ref POINT source,uint key,ref BLEND blend,uint flags);

 [DllImport("user32.dll",SetLastError=true)] static extern bool SetLayeredWindowAttributes(IntPtr w,uint key,byte alpha,uint flags);
 [DllImport("user32.dll")] static extern bool InvalidateRect(IntPtr w,IntPtr rect,bool erase);
 [DllImport("user32.dll")] static extern bool ValidateRect(IntPtr w,IntPtr rect);
 [DllImport("gdi32.dll")] static extern bool BitBlt(IntPtr dst,int x,int y,int width,int height,IntPtr src,int sx,int sy,uint op);
 public class Desktop {
  public IntPtr Parent,Icons,Wallpaper;
  public bool Modern;
  public Desktop(bool preview) {
   if(preview) return;
   IntPtr progman=FindWindow("Progman",null), result;
   if(progman==IntPtr.Zero) throw new Exception("Windows desktop unavailable");
   SendMessageTimeout(progman,0x052C,new IntPtr(0xD),new IntPtr(1),2,1000,out result);
   Icons=FindWindowEx(progman,IntPtr.Zero,"SHELLDLL_DefView",null);
   Wallpaper=FindWindowEx(progman,IntPtr.Zero,"WorkerW",null);
   Modern=Icons!=IntPtr.Zero && Wallpaper!=IntPtr.Zero && IsWindowVisible(Wallpaper);
   if(Modern) { Parent=progman; return; }
   uint shellPid; GetWindowThreadProcessId(progman,out shellPid);
   EnumWindows(delegate(IntPtr top,IntPtr ignored) {
    uint pid; GetWindowThreadProcessId(top,out pid);
    if(pid==shellPid && IsWindowVisible(top) && FindWindowEx(top,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero) {
     for(var c=FindWindowEx(IntPtr.Zero,top,"WorkerW",null);c!=IntPtr.Zero;c=FindWindowEx(IntPtr.Zero,c,"WorkerW",null)) {
      GetWindowThreadProcessId(c,out pid);
      if(pid==shellPid && IsWindowVisible(c) && FindWindowEx(c,IntPtr.Zero,"SHELLDLL_DefView",null)==IntPtr.Zero) { Parent=c;break; }
     }
    }
    return Parent==IntPtr.Zero;
   },IntPtr.Zero);
   if(Parent==IntPtr.Zero) throw new Exception("Unsupported desktop layout");
  }
  public bool Ordered(IntPtr w) {
   if(Parent==IntPtr.Zero) return true;
   if(!IsWindow(Parent)||GetParent(w)!=Parent) return false;
   if(!Modern) return true;
   if(!IsWindow(Icons)||!IsWindow(Wallpaper)) return false;
   bool icons=false,weather=false;
   for(var c=GetWindow(Parent,5);c!=IntPtr.Zero;c=GetWindow(c,2)) {
    if(c==Icons) icons=true;
    if(c==w) {if(!icons)return false; weather=true;}
    if(c==Wallpaper)return weather;
   }
   return false;
  }
 }

 public class Layer : NativeWindow, IDisposable {
  IntPtr dc=IntPtr.Zero,bitmap=IntPtr.Zero,old=IntPtr.Zero;
  SIZE size; Desktop desktop;
  public Layer(string path,Rectangle bounds,Desktop host) {
   desktop=host; size=new SIZE(bounds.Width,bounds.Height);
   var p=new POINT(bounds.X,bounds.Y);
   if(host.Parent!=IntPtr.Zero) MapWindowPoints(IntPtr.Zero,host.Parent,ref p,1);
   try {
    using(var image=Image.FromFile(path))
    using(var scaled=new Bitmap(size.X,size.Y,PixelFormat.Format32bppPArgb)) {
     using(var g=Graphics.FromImage(scaled)) { g.Clear(Color.Transparent);g.DrawImage(image,new Rectangle(0,0,size.X,size.Y)); }
     bitmap=scaled.GetHbitmap(Color.FromArgb(0));
    }
    dc=CreateCompatibleDC(IntPtr.Zero); if(dc==IntPtr.Zero||bitmap==IntPtr.Zero)throw new Exception("Bitmap allocation failed");
    old=SelectObject(dc,bitmap);
    CreateHandle(new CreateParams { Caption="QBot Weather Bitmap",ClassName="STATIC",Parent=host.Parent,
     X=p.X,Y=p.Y,Width=size.X,Height=size.Y,Style=host.Parent==IntPtr.Zero?unchecked((int)0x80000000):0x40000000,
     ExStyle=0x00080000|0x08000000|0x20|0x80 });
    Alpha(0);
    if(!SetWindowPos(Handle,host.Modern?host.Icons:IntPtr.Zero,p.X,p.Y,size.X,size.Y,0x0010|0x0040))throw new Exception("Weather placement failed");
    if(!host.Ordered(Handle))throw new Exception("Weather desktop order invalid");
   } catch {Dispose();throw;}
  }
  public void Alpha(byte alpha) {
   if(!SetLayeredWindowAttributes(Handle,0,alpha,2))throw new Exception("Native alpha failed: "+Marshal.GetLastWin32Error());
   InvalidateRect(Handle,IntPtr.Zero,false);
  }
  protected override void WndProc(ref Message m) {
   if(m.Msg==0x14){m.Result=new IntPtr(1);return;}
   if(m.Msg==0xF){
    var target=GetDC(Handle);
    try{BitBlt(target,0,0,size.X,size.Y,dc,0,0,0x00CC0020);}finally{ReleaseDC(Handle,target);ValidateRect(Handle,IntPtr.Zero);}
    m.Result=IntPtr.Zero;return;
   }
   if(m.Msg==0x84){m.Result=new IntPtr(-1);return;} // HTTRANSPARENT
   if(m.Msg==0x21){m.Result=new IntPtr(3);return;} // MA_NOACTIVATE
   base.WndProc(ref m);
  }
  public bool Validate(){return desktop.Ordered(Handle);}
  public void Dispose(){
   if(Handle!=IntPtr.Zero)DestroyHandle();
   if(dc!=IntPtr.Zero){if(old!=IntPtr.Zero)SelectObject(dc,old);DeleteDC(dc);dc=IntPtr.Zero;}
   if(bitmap!=IntPtr.Zero){DeleteObject(bitmap);bitmap=IntPtr.Zero;}
  }
 }

 public static void Run(int owner,int x,int y,int width,int height,string directory,bool preview,int fadeMs) {
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  var queue=new ConcurrentQueue<string>();
  bool inputClosed=false;
  var reader=new Thread(()=>{try{string line;while((line=Console.ReadLine())!=null)queue.Enqueue(line);}finally{inputClosed=true;}});
  reader.IsBackground=true; reader.Start();
  var ownerProcess=Process.GetProcessById(owner);
  var host=new Desktop(preview);
  var bounds=new Rectangle(x,y,width,height);
  var root=Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
  Layer current=null,incoming=null;
  var animation=new Stopwatch();
  int request=0;bool hiding=false;
  var context=new ApplicationContext();
  var timer=new System.Windows.Forms.Timer {Interval=33};
  var lifetime=Stopwatch.StartNew();
  var watchdog=Stopwatch.StartNew();
  Action close=()=>{timer.Stop();if(incoming!=null){incoming.Dispose();incoming=null;}if(current!=null){current.Dispose();current=null;}context.ExitThread();};
  timer.Tick+=(sender,args)=>{
   try {
    if(inputClosed||ownerProcess.HasExited||lifetime.ElapsedMilliseconds>3600000){close();return;}
    if(watchdog.ElapsedMilliseconds>1000){
     watchdog.Restart();
     if((current!=null&&!current.Validate())||(incoming!=null&&!incoming.Validate()))throw new Exception("Desktop layer changed");
    }
    string command;
    if(!animation.IsRunning && queue.TryDequeue(out command)) {
     var parts=command.Split('|');
     if(parts[0]=="quit"){close();return;}
     request=int.Parse(parts[1]); hiding=parts[0]=="hide";
     if(!hiding) {
      if(parts[0]!="show"||parts.Length!=3)throw new Exception("Invalid weather command");
      string file=Path.GetFullPath(Encoding.UTF8.GetString(Convert.FromBase64String(parts[2])));
      if(!file.StartsWith(root,StringComparison.OrdinalIgnoreCase)||Path.GetExtension(file)!=".png")throw new Exception("Invalid weather image path");
      incoming=new Layer(file,bounds,host);
     }
     lifetime.Restart(); animation.Restart();
    }
    if(animation.IsRunning) {
     double t=Math.Min(1,animation.Elapsed.TotalMilliseconds/fadeMs);double eased=t*t*(3-2*t);
     if(hiding){if(current!=null)current.Alpha((byte)Math.Round(255*(1-eased)));}
     else incoming.Alpha((byte)Math.Round(255*eased));
     if(t>=1){
      if(current!=null)current.Dispose(); current=hiding?null:incoming; incoming=null;animation.Reset();
      Console.WriteLine("{\"done\":"+request+",\"handle\":\""+(current==null?"0":current.Handle.ToString())+"\",\"parent\":\""+host.Parent+"\"}");
     }
    }
   } catch(Exception error) {Console.WriteLine("{\"fatal\":\""+Convert.ToBase64String(Encoding.UTF8.GetBytes(error.Message))+"\"}");close();}
  };
  Console.WriteLine("{\"ready\":true}");
  timer.Start();
  try{Application.Run(context);}finally{close();timer.Dispose();ownerProcess.Dispose();}
 }
}
`;
