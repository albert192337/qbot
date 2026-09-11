// Isolated native Electron regression. No real user data or generation APIs.
const { app, BrowserWindow, screen } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'qbot-drag-size-')));
if (process.env.QBOT_QA_DPI) app.commandLine.appendSwitch('force-device-scale-factor', process.env.QBOT_QA_DPI);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({width:180,height:180,x:100,y:100,transparent:true,frame:false,resizable:false,show:false});
    const initial = win.getSize();
    for(let i=0;i<80;i++) { win.setPosition(100+i%40,100+i%30); await delay(5); }
    const legacy = win.getSize();
    console.log(JSON.stringify({scale:screen.getPrimaryDisplay().scaleFactor,initial,legacy}));
    if (process.env.QBOT_QA_REPRO_ONLY === '1') { app.exit(0);return; }
    const ts = require('../node_modules/typescript');
    require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
    const {moveFixedSize} = require('../app/src/main/fixed-window.ts');
    for(const size of [{width:180,height:180},{width:360,height:360},{width:720,height:360},{width:380,height:110},{width:1100,height:800}]) {
      moveFixedSize(win,100,100,size,true);
      const baseline=win.getSize();
      for(let i=0;i<150;i++) { moveFixedSize(win,100+i%40,100+i%30,size); await delay(5); }
      const after=win.getSize();
      // Fractional pixel alignment can differ by one DIP at different positions.
      // Returning to the same position must return the exact same reported size.
      moveFixedSize(win,100,100,size);await delay(10);
      assert.deepEqual(win.getSize(),baseline,'drag must not accumulate DPI rounding');
      assert.ok(Math.abs(after[0]-size.width)<=3 && Math.abs(after[1]-size.height)<=3);
      console.log(JSON.stringify({size,baseline,after}));
    }
    win.destroy();console.log('PASS: native repeated drag keeps authoritative size at all pet scales and visit mode');app.exit(0);
  } catch(error) {console.error(error);app.exit(1);}
});
