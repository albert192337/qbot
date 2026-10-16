// Read-only Explorer geometry for the isolated desktop pinball trial.
// No file contents, icon movement, selection, registry writes or input injection.
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

public static class PinballDesktop {
 [ComImport, Guid("6D5140C1-7436-11CE-8034-00AA006009FA"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface IServiceProvider { void QueryService(ref Guid service, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object result); }
 [ComImport, Guid("000214E2-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface IShellBrowser {
  void GetWindow(out IntPtr hwnd); void ContextSensitiveHelp(bool enter); void InsertMenusSB(IntPtr a,IntPtr b); void SetMenuSB(IntPtr a,IntPtr b,IntPtr c); void RemoveMenusSB(IntPtr a); void SetStatusTextSB(IntPtr a); void EnableModelessSB(bool a); void TranslateAcceleratorSB(IntPtr a,ushort b); void BrowseObject(IntPtr a,uint b); void GetViewStateStream(uint a,IntPtr b); void GetControlWindow(uint a,IntPtr b); void SendControlMsg(uint a,uint b,IntPtr c,IntPtr d,IntPtr e);
  void QueryActiveShellView([MarshalAs(UnmanagedType.IUnknown)] out object view);
 }
 [ComImport, Guid("CDE725B0-CCC9-4519-917E-325D72FAB4CE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface IFolderView {
  void GetCurrentViewMode(out uint mode); void SetCurrentViewMode(uint mode); void GetFolder(ref Guid iid,[MarshalAs(UnmanagedType.Interface)] out object folder); void Item(int index,out IntPtr pidl); void ItemCount(uint flags,out int count); void Items(uint flags,ref Guid iid,out IntPtr items); void GetSelectionMarkedItem(out int index); void GetFocusedItem(out int index); void GetItemPosition(IntPtr pidl,out POINT point);
  void GetSpacing(out POINT point);
 }
 [StructLayout(LayoutKind.Sequential)] public struct POINT {public int X,Y;}
 [DllImport("shell32.dll")] static extern int SHGetNameFromIDList(IntPtr pidl,uint kind,out IntPtr name);
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct SHFILEINFO {public IntPtr Icon;public int Index;public uint Attributes;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=260)]public string Display;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=80)]public string Type;}
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)] static extern IntPtr SHGetFileInfo(IntPtr pidl,uint attrs,ref SHFILEINFO info,uint size,uint flags);
 [DllImport("shell32.dll")] static extern int SHGetImageList(int size,ref Guid iid,out IntPtr images);
 [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int GetImageIcon(IntPtr self,int index,int flags,out IntPtr icon);
 [DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr icon);
 class IconImage {public int Index,Size;public long Modified;public DateTime Created;public string Data;}
 static Dictionary<string,IconImage> iconImages=new Dictionary<string,IconImage>();
 static string ShellImage(IntPtr pidl,string location,int size){
  var info=new SHFILEINFO();IntPtr images=IntPtr.Zero,largeIcon=IntPtr.Zero;
  try{
   // Use the actual desktop Shell item. Never request USEFILEATTRIBUTES/type icons:
   // that replaces custom .url/.lnk artwork with a generic globe or document.
   if(SHGetFileInfo(pidl,0,ref info,(uint)Marshal.SizeOf(info),0x100|0x8|0x20|0x40)==IntPtr.Zero||info.Icon==IntPtr.Zero)return "";
   long modified=location.StartsWith("::{")?0:System.IO.File.GetLastWriteTimeUtc(location).Ticks;
   IconImage cached;if(iconImages.TryGetValue(location,out cached)&&cached.Index==info.Index&&cached.Size==size&&cached.Modified==modified&&(DateTime.UtcNow-cached.Created).TotalSeconds<60)return cached.Data;
   // The Shell image list preserves the per-item icon and its shortcut overlay,
   // with DPI-aware 48-DIP artwork for the usual desktop icon size.
   Guid iid=new Guid("46EB5926-582E-4017-9FDF-E8998DAA0950");
   if(SHGetImageList(size>32?2:0,ref iid,out images)==0){
    var fn=(GetImageIcon)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(Marshal.ReadIntPtr(images),10*IntPtr.Size),typeof(GetImageIcon));
    if(fn(images,info.Index&0xFFFFFF,1|((info.Index>>24)&0xFF)<<8,out largeIcon)!=0){if(largeIcon!=IntPtr.Zero)DestroyIcon(largeIcon);largeIcon=IntPtr.Zero;}
   }
   using(var icon=System.Drawing.Icon.FromHandle(largeIcon!=IntPtr.Zero?largeIcon:info.Icon))using(var bitmap=icon.ToBitmap())using(var stream=new System.IO.MemoryStream()){
    bitmap.Save(stream,System.Drawing.Imaging.ImageFormat.Png);string value="data:image/png;base64,"+Convert.ToBase64String(stream.ToArray());
    iconImages[location]=new IconImage{Index=info.Index,Size=size,Modified=modified,Created=DateTime.UtcNow,Data=value};return value;
   }
  }catch{return "";}finally{if(largeIcon!=IntPtr.Zero)DestroyIcon(largeIcon);if(images!=IntPtr.Zero)Marshal.Release(images);if(info.Icon!=IntPtr.Zero)DestroyIcon(info.Icon);}
 }
 static JavaScriptSerializer Serializer(){return new JavaScriptSerializer{MaxJsonLength=16*1024*1024};}
 [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hwnd,ref POINT p);
 [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hwnd);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr hwnd);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr ctx);
 [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd,StringBuilder name,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string title);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd,int index);
 public static object ValidateOverlay(long handle,int owner){
  SetThreadDpiAwarenessContext(new IntPtr(-4));var w=new IntPtr(handle);uint pid;GetWindowThreadProcessId(w,out pid);
  if(pid!=owner||!IsWindow(w))throw new Exception("Preview window owner mismatch");
  var serializer=Serializer();var data=serializer.Deserialize<Dictionary<string,object>>(serializer.Serialize(Snapshot()));
  if((GetWindowLong(w,-16)&0x40000000)!=0)throw new Exception("Preview must be a top-level composition surface");
  return new{attached=true,mode="top-level-overlay",parent=(string)data["desktop"],window=w.ToString()};
 }
 // Called only for an explicit launch/reopen command, never on passive desktop polling.
 static void ShowDesktop(){object shell=null;try{shell=Activator.CreateInstance(Type.GetTypeFromProgID("Shell.Application"));((dynamic)shell).MinimizeAll();}finally{if(shell!=null)Marshal.ReleaseComObject(shell);}}
 [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int ViewSize(IntPtr self,out uint mode,out int size);
 static bool[] keys=new bool[256]; static bool seeded=false;
 static int PollKeys(){int n=0;for(int k=8;k<256;k++){bool down=(GetAsyncKeyState(k)&0x8000)!=0;if(down&&!keys[k])n++;keys[k]=down;}if(!seeded){seeded=true;return 0;}return n;}
 static string Class(IntPtr w){var b=new StringBuilder(128);GetClassName(w,b,128);return b.ToString();}
 static string Name(IntPtr pidl,uint kind){IntPtr p;Marshal.ThrowExceptionForHR(SHGetNameFromIDList(pidl,kind,out p));try{return Marshal.PtrToStringUni(p);}finally{Marshal.FreeCoTaskMem(p);}}
 public static object Snapshot(){
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  object shell=null,dispatch=null,browser=null,view=null;
  try{
   shell=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("9BA05972-F6A8-11CF-A442-00A0C90A8F39")));
   object loc=0,empty=null;int hwnd=0;
   dispatch=((dynamic)shell).FindWindowSW(ref loc,ref empty,8,out hwnd,1);
   if(dispatch==null)throw new Exception("Desktop shell unavailable");
   Guid service=new Guid("4C96BE40-915C-11CF-99D3-00AA004AE837"),iid=new Guid("000214E2-0000-0000-C000-000000000046");
   ((IServiceProvider)dispatch).QueryService(ref service,ref iid,out browser);
   ((IShellBrowser)browser).QueryActiveShellView(out view);
   var folder=(IFolderView)view;IntPtr viewHwnd;
   // IShellView inherits IOleWindow, whose first vtable method is GetWindow.
   var ole=(IShellView)view;ole.GetWindow(out viewHwnd);
   IntPtr list=FindWindowEx(viewHwnd,IntPtr.Zero,"SysListView32",null);
   if(list==IntPtr.Zero)throw new Exception("Desktop icon view unavailable");
   int size=48;uint mode=0;IntPtr unknown=Marshal.GetIUnknownForObject(view),v2=IntPtr.Zero;
   try{var iid2=new Guid("1AF3A467-214F-4298-908E-06B03E0B39F9");if(Marshal.QueryInterface(unknown,ref iid2,out v2)==0){var table=Marshal.ReadIntPtr(v2);var fn=(ViewSize)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(table,36*IntPtr.Size),typeof(ViewSize));if(fn(v2,out mode,out size)!=0)size=48;}}finally{if(v2!=IntPtr.Zero)Marshal.Release(v2);Marshal.Release(unknown);}
   size=Math.Max(16,Math.Min(256,size));int count;folder.ItemCount(2,out count);var icons=new List<object>();
   for(int i=0;i<Math.Min(count,500);i++){IntPtr pidl;folder.Item(i,out pidl);try{POINT p;folder.GetItemPosition(pidl,out p);ClientToScreen(list,ref p);string name=Name(pidl,0),location=Name(pidl,0x80028000);string kind=location.StartsWith("::{")?"virtual":System.IO.Directory.Exists(location)?"folder":location.EndsWith(".lnk",StringComparison.OrdinalIgnoreCase)||location.EndsWith(".url",StringComparison.OrdinalIgnoreCase)?"shortcut":"file";
    // Location stays in the local main process, solely for the OS icon bitmap.
    icons.Add(new{name=name,kind=kind,x=p.X,y=p.Y,size=size,location=location,image=ShellImage(pidl,location,size)});
   }finally{Marshal.FreeCoTaskMem(pidl);}}
   return new{icons=icons,iconSize=size,view=viewHwnd.ToString(),list=list.ToString(),desktop=GetParent(viewHwnd).ToString(),visible=IsWindowVisible(list)};
  }finally{foreach(object o in new[]{view,browser,dispatch,shell})if(o!=null&&Marshal.IsComObject(o))Marshal.ReleaseComObject(o);}
 }
 [ComImport,Guid("000214E3-0000-0000-C000-000000000046"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IShellView {void GetWindow(out IntPtr w);void ContextSensitiveHelp(bool enter);}
 public static void Run(int owner,bool once){
  Console.OutputEncoding=new UTF8Encoding(false);var json=Serializer();var proc=System.Diagnostics.Process.GetProcessById(owner);int ticks=0,acc=0;bool ended=false;IntPtr lastForeground=new IntPtr(-1);var commands=new ConcurrentQueue<string>();
  if(!once){commands.Enqueue("show");var reader=new Thread(()=>{try{string line;while((line=Console.ReadLine())!=null)commands.Enqueue(line);}finally{ended=true;}});reader.IsBackground=true;reader.Start();}
  while(!ended&&!proc.HasExited){try{
   string command;while(commands.TryDequeue(out command))if(command=="show"){ShowDesktop();Thread.Sleep(200);Console.WriteLine("{\"desktopRequested\":true}");}
   if(ticks%100==0)Console.WriteLine(json.Serialize(new{snapshot=Snapshot()}));if(once)return;
   var fg=GetForegroundWindow();if(fg!=lastForeground){uint foregroundPid;GetWindowThreadProcessId(fg,out foregroundPid);string cls=Class(fg);Console.WriteLine(json.Serialize(new{desktopActive=cls=="Progman"||cls=="WorkerW"||cls=="Shell_TrayWnd"||foregroundPid==owner}));lastForeground=fg;}
   acc+=PollKeys();if(ticks%20==0){Console.WriteLine(json.Serialize(new{activity=Math.Min(20,acc)}));acc=0;}
  }catch(Exception e){Console.WriteLine(json.Serialize(new{error=e.Message}));if(once)return;}Console.Out.Flush();ticks++;Thread.Sleep(50);}
 }
}
