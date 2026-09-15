// Isolated Windows native ownership/Z-order regression; no real data or model calls.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'qbot-layer-')));
const ts = require('../node_modules/typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { attachPetWindowLayer, raisePetWindowGroup } = require('../app/src/main/pet-window-layer.ts');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function snapshot(windows) {
  const handles = windows.map(w => w.getNativeWindowHandle().readBigUInt64LE().toString());
  const code = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class QBotLayerQA { [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h,uint c); [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); }'; $r = @(${handles.join(',')}) | ForEach-Object { $h=[IntPtr]$_; $rank=0; while (($h=[QBotLayerQA]::GetWindow($h,3)) -ne [IntPtr]::Zero) { $rank++ }; $rank }; @{ ranks=@($r); foreground=[QBotLayerQA]::GetForegroundWindow().ToInt64().ToString() } | ConvertTo-Json -Compress`;
  return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', code], { encoding: 'utf8', windowsHide: true }));
}
app.whenReady().then(async () => {
  try {
    if (process.platform !== 'win32') throw new Error('Windows-only native Z-order check');
    const make = (x, focusable = true) => new BrowserWindow({ x, y: 100, width: 120, height: 120, frame: false, transparent: true, show: false, focusable, skipTaskbar: true });
    const pet = make(100), bubble = make(230, false), chat = make(360), other = make(490);
    const group = () => [pet, bubble, chat];
    for (const w of [...group(), other]) { w.setAlwaysOnTop(true, 'floating'); await w.loadURL('data:text/html,<body style="background:beige">Layer QA</body>'); }
    attachPetWindowLayer(pet, group);
    attachPetWindowLayer(bubble, group, pet);
    attachPetWindowLayer(chat, group, pet);
    assert.equal(bubble.getParentWindow(), pet);
    assert.equal(chat.getParentWindow(), pet);
    for (const w of [...group(), other]) w.showInactive();
    await pause(100);
    const before = snapshot([...group(), other]);
    raisePetWindowGroup(group());
    await pause(100);
    const after = snapshot([...group(), other]);
    assert.equal(after.foreground, before.foreground, 'raising must not steal focus');
    assert.ok(after.ranks[2] < after.ranks[1] && after.ranks[1] < after.ranks[0] && after.ranks[0] < after.ranks[3], JSON.stringify(after));
    // Reproduce an external window inserted between the pet and its bubble.
    other.moveAbove(pet.getMediaSourceId());
    await pause(200);
    const switched = snapshot([...group(), other]);
    assert.ok(switched.ranks[2] < switched.ranks[1] && switched.ranks[1] < switched.ranks[0], JSON.stringify(switched));
    assert.ok(switched.ranks[3] < switched.ranks[2] || switched.ranks[3] > switched.ranks[0], 'external window must not split the group: '+JSON.stringify(switched));
    assert.equal(switched.foreground, after.foreground);
    for (let i = 0; i < 8; i++) {
      other.moveTop();
      await pause(120);
      const covered = snapshot([...group(), other]);
      assert.ok(covered.ranks[3] < covered.ranks[2], 'external topmost remains above the whole group: '+JSON.stringify(covered));
      other.moveAbove(pet.getMediaSourceId());
      await pause(120);
      const together = snapshot([...group(), other]);
      assert.ok(together.ranks[3] < together.ranks[2] || together.ranks[3] > together.ranks[0], JSON.stringify(together));
    }
    chat.hide(); raisePetWindowGroup(group()); assert.equal(chat.isVisible(), false);
    pet.hide(); raisePetWindowGroup(group()); assert.equal(pet.isVisible(), false);
    for (const w of [...group(), other]) if (!w.isDestroyed()) w.destroy();
    console.log('PASS: Windows owned overlays stay above pet and external window, without changing foreground focus or revealing hidden UI');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
