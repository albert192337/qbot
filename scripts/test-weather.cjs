// Experimental native diagnostics, NOT proof of correct desktop composition.
// Isolated userData, no accounts, no wallpaper writes. May reproduce a white desktop.
const {app, BrowserWindow, screen, session: electronSession} = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const ts = require('../node_modules/typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText, filename);
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'qbot-weather-')));
app.on('window-all-closed', () => {});
process.env.ELECTRON_RENDERER_URL = pathToFileURL(path.resolve(__dirname, '../app/out/renderer')).href;
const output = path.resolve(__dirname, '../.superpowers/weather-preview');
fs.mkdirSync(output, {recursive:true});
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
const inspectNative = hwnd => JSON.parse(execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-Command', `
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WeatherInspect {
 [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr w);
 [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr w, uint cmd);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr w);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr w, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr w, int n);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@
$w = [IntPtr]::new(${hwnd})
$p = [WeatherInspect]::GetParent($w)
$s = [Text.StringBuilder]::new(256)
[void][WeatherInspect]::GetClassName($p,$s,256)
$children = @()
if ($p -ne [IntPtr]::Zero) {
 for ($child=[WeatherInspect]::GetWindow($p,5); $child -ne [IntPtr]::Zero; $child=[WeatherInspect]::GetWindow($child,2)) {
  $name=[Text.StringBuilder]::new(256)
  [void][WeatherInspect]::GetClassName($child,$name,256)
  $children += @{handle=$child.ToInt64().ToString();class=$name.ToString()}
 }
}
@{ parent=$s.ToString(); parentVisible=[WeatherInspect]::IsWindowVisible($p); children=$children; style=[WeatherInspect]::GetWindowLong($w,-16); exStyle=[WeatherInspect]::GetWindowLong($w,-20); foreground=[WeatherInspect]::GetForegroundWindow().ToInt64().ToString() } | ConvertTo-Json -Compress -Depth 4
`], {windowsHide:true,encoding:'utf8',timeout:10000}));

app.whenReady().then(async()=>{
  const {changeWeatherTest, stopWeatherTest, weatherTestMenu} = require('../app/src/main/weather.ts');
  electronSession.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({cancel:/^https?:/.test(details.url)}));
  const deadline = setTimeout(()=>{stopWeatherTest();app.exit(1);},60000);
  try {
    const before = inspectNative('0');
    const menu = weatherTestMenu();
    assert.equal(menu.label, '切换天气（测试）');
    assert.equal(menu.submenu[0].enabled, false, 'desktop compositor remains disabled in user menus');
    const start = changeWeatherTest('meteor', screen.getPrimaryDisplay().bounds);
    void start.catch(()=>{}); // Observed below, without an early unhandled rejection.
    let win;
    for (let i=0;i<100;i++) {
      win = BrowserWindow.getAllWindows()[0];
      if (win && !win.webContents.isLoading() && await win.webContents.executeJavaScript('!!window.qbotWeather').catch(()=>false)) break;
      await delay(100);
    }
    assert.ok(win, 'weather window created');
    win.webContents.on('console-message', (_e, _level, message) => console.log('renderer:',message));
    await start;
    const handle = win.getNativeWindowHandle().readBigUInt64LE().toString();
    const native = inspectNative(handle);
    assert.ok(['WorkerW','Progman'].includes(native.parent));
    assert.equal(native.parentVisible,true,'desktop parent is visible');
    if (native.parent==='Progman') {
      const icons = native.children.findIndex(w=>w.class==='SHELLDLL_DefView');
      const weather = native.children.findIndex(w=>w.handle===handle);
      const wallpaper = native.children.findIndex(w=>w.class==='WorkerW');
      assert.ok(icons>=0 && icons<weather && weather<wallpaper,'icons > weather > opaque system wallpaper');
    }
    assert.ok(native.style & 0x40000000, 'native child window');
    assert.ok(native.exStyle & 0x08000000, 'non-activating');
    assert.ok(native.exStyle & 0x20, 'click-through');
    assert.notEqual(native.foreground,handle,'does not take foreground');
    console.log(JSON.stringify({before,native,bounds:win.getBounds()}));
    assert.equal(win.isAlwaysOnTop(), false);
    assert.equal(await win.webContents.executeJavaScript('document.documentElement.dataset.weather'),'meteor');
    await delay(750);
    fs.writeFileSync(path.join(output,'meteor.png'),(await win.webContents.capturePage()).toPNG());
    const switching = changeWeatherTest('aurora');
    await delay(750);
    const midpoint = await win.webContents.executeJavaScript('[...document.querySelectorAll(".scene")].map(s=>Number(getComputedStyle(s).opacity))');
    console.log(JSON.stringify({midpoint, visible:win.isVisible()}));
    assert.equal(midpoint.length,2); assert.equal(midpoint[0],1); assert.ok(midpoint[1]>0 && midpoint[1]<1);
    fs.writeFileSync(path.join(output,'transition.png'),(await win.webContents.capturePage()).toPNG());
    await switching;
    fs.writeFileSync(path.join(output,'aurora.png'),(await win.webContents.capturePage()).toPNG());
    assert.equal(await win.webContents.executeJavaScript('document.querySelectorAll(".scene").length'),1);
    const restoring = changeWeatherTest(null);
    await delay(750);
    const restoringAlpha = await win.webContents.executeJavaScript('Number(getComputedStyle(document.querySelector(".scene")).opacity)');
    assert.ok(restoringAlpha>0 && restoringAlpha<1);
    await restoring;
    assert.equal(BrowserWindow.getAllWindows().length,0);
    await Promise.all([changeWeatherTest('meteor'),changeWeatherTest('aurora'),changeWeatherTest(null)]);
    assert.equal(BrowserWindow.getAllWindows().length,0);
    await changeWeatherTest('meteor');
    stopWeatherTest();
    assert.equal(BrowserWindow.getAllWindows().length,0);
    console.log('PASS: native desktop parenting, no activation, click-through, crossfade, restore, rapid switching and cleanup');
    clearTimeout(deadline); app.exit(0);
  } catch(error) { console.error(error); stopWeatherTest(); clearTimeout(deadline); app.exit(1); }
});
