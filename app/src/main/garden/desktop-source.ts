// Native compositor shared in behavior with the approved prototype.
export const GARDEN_DESKTOP_SOURCE=String.raw`// Prototype compositor: a native GDI surface behind Explorer's icon view.
// Chromium stays offscreen; the helper never changes wallpaper, icon layout or files.
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
using System.Windows.Automation;

public static class GardenDesktopHost {
 public delegate bool EnumProc(IntPtr w,IntPtr p);
 delegate IntPtr HookProc(int code,IntPtr message,IntPtr data);
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; public POINT(int x,int y){X=x;Y=y;} }
 [StructLayout(LayoutKind.Sequential)] struct MouseData { public POINT Point; public uint Data,Flags,Time; public IntPtr Extra; }
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindow(string c,string t);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p,IntPtr after,string c,string t);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr w,StringBuilder s,int n);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc fn,IntPtr p);
 [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr w,uint m,IntPtr a,IntPtr b,uint flags,uint ms,out IntPtr result);
 [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr w,uint command);
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr w);
 [DllImport("user32.dll")] static extern bool IsWindow(IntPtr w);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr w);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr w,out uint pid);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
 [DllImport("user32.dll",SetLastError=true)] static extern bool SetWindowPos(IntPtr w,IntPtr after,int x,int y,int width,int height,uint flags);
 [DllImport("user32.dll")] static extern int MapWindowPoints(IntPtr from,IntPtr to,ref POINT p,uint count);
 [DllImport("user32.dll",SetLastError=true)] static extern bool SetLayeredWindowAttributes(IntPtr w,uint key,byte alpha,uint flags);
 [DllImport("user32.dll")] static extern bool InvalidateRect(IntPtr w,IntPtr rect,bool erase);
 [DllImport("user32.dll")] static extern bool ValidateRect(IntPtr w,IntPtr rect);
 [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr w);
 [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr w,IntPtr dc);
 [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT p);
 [DllImport("user32.dll")] static extern uint GetDoubleClickTime();
 [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int kind,HookProc callback,IntPtr module,uint thread);
 [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hook);
 [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook,int code,IntPtr message,IntPtr data);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr GetModuleHandle(string name);
 [StructLayout(LayoutKind.Sequential)] struct RECT {public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr w,uint flag);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr w,int index);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr w,out RECT rect);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr w,int attribute,out int value,int size);
 static IntPtr OpaqueRootAt(POINT p){
  IntPtr found=IntPtr.Zero;
  EnumWindows(delegate(IntPtr w,IntPtr unused){
   if(!IsWindowVisible(w)||(GetWindowLong(w,-20)&0x20)!=0)return true;
   int cloaked;DwmGetWindowAttribute(w,14,out cloaked,4);if(cloaked!=0)return true;
   RECT r;if(!GetWindowRect(w,out r)||p.X<r.Left||p.X>=r.Right||p.Y<r.Top||p.Y>=r.Bottom)return true;
   found=w;return false;
  },IntPtr.Zero);return found;
 }
 static string Class(IntPtr w){var b=new StringBuilder(256);GetClassName(w,b,256);return b.ToString();}
 static void Emit(string s){Console.WriteLine(s);Console.Out.Flush();}
 public class Desktop {
  public IntPtr Parent,Icons,Wallpaper,List;
  public bool Modern;
  public Desktop(){
   IntPtr progman=FindWindow("Progman",null),result;if(progman==IntPtr.Zero)throw new Exception("Windows desktop unavailable");
   SendMessageTimeout(progman,0x052C,new IntPtr(0xD),new IntPtr(1),2,1000,out result);
   Icons=FindWindowEx(progman,IntPtr.Zero,"SHELLDLL_DefView",null);Wallpaper=FindWindowEx(progman,IntPtr.Zero,"WorkerW",null);
   Modern=Icons!=IntPtr.Zero&&Wallpaper!=IntPtr.Zero&&IsWindowVisible(Wallpaper);
   if(Modern)Parent=progman;
   else {uint shellPid;GetWindowThreadProcessId(progman,out shellPid);EnumWindows(delegate(IntPtr top,IntPtr unused){uint pid;GetWindowThreadProcessId(top,out pid);var view=FindWindowEx(top,IntPtr.Zero,"SHELLDLL_DefView",null);if(pid==shellPid&&IsWindowVisible(top)&&view!=IntPtr.Zero){Icons=view;for(var w=FindWindowEx(IntPtr.Zero,top,"WorkerW",null);w!=IntPtr.Zero;w=FindWindowEx(IntPtr.Zero,w,"WorkerW",null)){GetWindowThreadProcessId(w,out pid);if(pid==shellPid&&IsWindowVisible(w)&&FindWindowEx(w,IntPtr.Zero,"SHELLDLL_DefView",null)==IntPtr.Zero){Parent=w;break;}}}return Parent==IntPtr.Zero;},IntPtr.Zero);}
   if(Parent==IntPtr.Zero)throw new Exception("Unsupported desktop composition");List=FindWindowEx(Icons,IntPtr.Zero,"SysListView32",null);
  }
  public bool Ordered(IntPtr w){if(!IsWindow(Parent)||!IsWindowVisible(Parent)||GetParent(w)!=Parent||!IsWindow(Icons))return false;if(!Modern)return true;bool icons=false,garden=false;for(var c=GetWindow(Parent,5);c!=IntPtr.Zero;c=GetWindow(c,2)){if(c==Icons)icons=true;if(c==w){if(!icons)return false;garden=true;}if(c==Wallpaper)return garden;}return false;}
  public string PointKind(POINT p){
   IntPtr under=WindowFromPoint(p),root=GetAncestor(under,2),desktopRoot=GetAncestor(Icons,2);
   if(root!=desktopRoot&&root!=GetAncestor(Parent,2)){
    // A click-through Chromium toolbar can still be returned by WindowFromPoint.
    // Skip transparent roots, but keep any real application underneath in front.
    if((GetWindowLong(root,-20)&0x20)==0)return "application";
    root=OpaqueRootAt(p);if(root!=desktopRoot&&root!=GetAncestor(Parent,2))return "application";
   }
   try{
    if(List==IntPtr.Zero)return "unknown";
    var list=AutomationElement.FromHandle(List);
    if(list==null||list.Current.ControlType!=ControlType.List)return "unknown";
    // FromPoint may return a transparent Electron overlay's accessibility pane.
    // WindowFromPoint already proved the real mouse target is Explorer; inspect
    // only icon rectangles in its list, without reading names or file contents.
    var children=list.FindAll(TreeScope.Children,Condition.TrueCondition);
    var point=new System.Windows.Point(p.X,p.Y);
    foreach(AutomationElement child in children){
     if(child.Current.IsOffscreen||child.Current.ControlType==ControlType.Header)continue;
     var rect=child.Current.BoundingRectangle;
     if(!rect.IsEmpty&&rect.Contains(point))return "icon";
    }
    return "background";
   }catch{return "unknown";}
  }
 }
 public class Layer:NativeWindow,IDisposable {
  Bitmap frame;readonly Desktop host;readonly Rectangle bounds;
  public Layer(Desktop h,Rectangle b){host=h;bounds=b;var p=new POINT(b.X,b.Y);MapWindowPoints(IntPtr.Zero,h.Parent,ref p,1);CreateHandle(new CreateParams{Caption="QBot Garden Desktop Canvas",ClassName="STATIC",Parent=h.Parent,X=p.X,Y=p.Y,Width=b.Width,Height=b.Height,Style=0x40000000,ExStyle=0x00080000|0x08000000|0x20|0x80});
   if(!SetLayeredWindowAttributes(Handle,0x00ff00ff,255,3))throw new Exception("Desktop transparency failed");
   if(!SetWindowPos(Handle,h.Modern?h.Icons:IntPtr.Zero,p.X,p.Y,b.Width,b.Height,0x0010|0x0040)||!h.Ordered(Handle))throw new Exception("Desktop layer order failed");
  }
  public void Frame(byte[] bytes){using(var stream=new MemoryStream(bytes))using(var image=Image.FromStream(stream)){var next=new Bitmap(bounds.Width,bounds.Height,PixelFormat.Format32bppPArgb);using(var g=Graphics.FromImage(next)){g.Clear(Color.Magenta);g.DrawImage(image,new Rectangle(0,0,bounds.Width,bounds.Height));}var old=frame;frame=next;if(old!=null)old.Dispose();}InvalidateRect(Handle,IntPtr.Zero,false);}
  protected override void WndProc(ref Message m){if(m.Msg==0x14){m.Result=new IntPtr(1);return;}if(m.Msg==0xF){var dc=GetDC(Handle);try{using(var g=Graphics.FromHdc(dc)){if(frame==null)g.Clear(Color.Magenta);else g.DrawImageUnscaled(frame,0,0);}}finally{ReleaseDC(Handle,dc);ValidateRect(Handle,IntPtr.Zero);}m.Result=IntPtr.Zero;return;}if(m.Msg==0x84){m.Result=new IntPtr(-1);return;}if(m.Msg==0x21){m.Result=new IntPtr(3);return;}base.WndProc(ref m);}
  public bool Ordered(){return host.Ordered(Handle);}
  public void Dispose(){if(Handle!=IntPtr.Zero)DestroyHandle();if(frame!=null){frame.Dispose();frame=null;}}
 }
 public static void Run(int owner,int x,int y,int width,int height){
  SetThreadDpiAwarenessContext(new IntPtr(-4));var bounds=new Rectangle(x,y,width,height);var host=new Desktop();var layer=new Layer(host,bounds);var ownerProcess=Process.GetProcessById(owner);var clock=Stopwatch.StartNew();var inputs=new ConcurrentQueue<POINT>();var commands=new ConcurrentQueue<string>();
  bool ended=false,down=false,dragged=false;POINT downPoint=new POINT();string pendingFrame=null;
  var reader=new Thread(()=>{try{string line;while((line=Console.ReadLine())!=null){if(line.StartsWith("frame|"))Interlocked.Exchange(ref pendingFrame,line.Substring(6));else commands.Enqueue(line);}}finally{ended=true;}});reader.IsBackground=true;reader.Start();
  HookProc callback=(code,message,data)=>{if(code>=0){var kind=message.ToInt32();if(kind==0x201||kind==0x200||kind==0x202){var mouse=(MouseData)Marshal.PtrToStructure(data,typeof(MouseData));if(kind==0x201){down=bounds.Contains(mouse.Point.X,mouse.Point.Y);downPoint=mouse.Point;dragged=false;}else if(kind==0x200&&down&&(Math.Abs(mouse.Point.X-downPoint.X)>5||Math.Abs(mouse.Point.Y-downPoint.Y)>5))dragged=true;else if(kind==0x202){if(down&&!dragged&&bounds.Contains(mouse.Point.X,mouse.Point.Y))inputs.Enqueue(mouse.Point);down=false;}}}return CallNextHookEx(IntPtr.Zero,code,message,data);};
  var hook=SetWindowsHookEx(14,callback,GetModuleHandle(null),0);if(hook==IntPtr.Zero){layer.Dispose();throw new Exception("Desktop mouse observation unavailable");}
  var context=new ApplicationContext();var timer=new System.Windows.Forms.Timer{Interval=33};long lastGuard=0,lastClick=-10000;POINT lastPoint=new POINT();int frames=0;
  Action close=()=>{timer.Stop();UnhookWindowsHookEx(hook);layer.Dispose();context.ExitThread();};
  timer.Tick+=(sender,args)=>{try{
   if(ended||ownerProcess.HasExited){close();return;}
   if(clock.ElapsedMilliseconds-lastGuard>1000){lastGuard=clock.ElapsedMilliseconds;if(!layer.Ordered())throw new Exception("Explorer desktop layer changed");}
   string command;while(commands.TryDequeue(out command)){if(command=="quit"){close();return;}if(command=="status")Emit("{\"status\":true,\"ordered\":"+layer.Ordered().ToString().ToLower()+",\"frames\":"+frames+",\"handle\":\""+layer.Handle+"\",\"parent\":\""+host.Parent+"\",\"icons\":\""+host.Icons+"\"}");else if(command.StartsWith("probe|")){var a=command.Split('|');var p=new POINT(int.Parse(a[1]),int.Parse(a[2]));Emit("{\"probe\":\""+host.PointKind(p)+"\"}");}}
   string frame=Interlocked.Exchange(ref pendingFrame,null);if(frame!=null){layer.Frame(Convert.FromBase64String(frame));frames++;Emit("{\"frame\":"+frames+"}");}
   POINT point;while(inputs.TryDequeue(out point)){
    if(host.PointKind(point)!="background"){lastClick=-10000;continue;}
    long now=clock.ElapsedMilliseconds;bool twice=now-lastClick<=GetDoubleClickTime()&&Math.Abs(point.X-lastPoint.X)<=SystemInformation.DoubleClickSize.Width&&Math.Abs(point.Y-lastPoint.Y)<=SystemInformation.DoubleClickSize.Height;
    lastClick=twice?-10000:now;lastPoint=point;Emit("{\"click\":true,\"double\":"+twice.ToString().ToLower()+",\"x\":"+(point.X-bounds.X)+",\"y\":"+(point.Y-bounds.Y)+"}");
   }
  }catch(Exception e){Emit("{\"fatal\":\""+Convert.ToBase64String(Encoding.UTF8.GetBytes(e.ToString()))+"\"}");close();}};
  Emit("{\"ready\":true,\"ordered\":true,\"handle\":\""+layer.Handle+"\",\"parent\":\""+host.Parent+"\",\"icons\":\""+host.Icons+"\"}");timer.Start();try{Application.Run(context);}finally{close();timer.Dispose();ownerProcess.Dispose();GC.KeepAlive(callback);}
 }
}
`;
