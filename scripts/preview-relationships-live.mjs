import path from 'node:path';
const pid = Number(process.argv[2]);
if (!Number.isInteger(pid) || pid <= 0) throw Error('Expected formal app PID');
process._debugProcess(pid);
let targets;
for (let i = 0; i < 30; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9229/json/list')).json(); break; }
  catch { await new Promise(r => setTimeout(r, 100)); }
}
if (!targets) throw Error('Inspector unavailable');
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let seq = 0;
const pending = new Map();
ws.onmessage = event => {
  const m = JSON.parse(event.data);
  if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
};
const evaluate = expression => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, m => m.result?.exceptionDetails ? reject(Error(JSON.stringify(m.result.exceptionDetails))) : resolve(m.result?.result?.value));
  ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
});
const prefix = `const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/app/package.json')('electron');`;
try {
  const identity = await evaluate(`(()=>{${prefix}return {pid:process.pid,data:e.app.getPath('userData'),root:e.app.getAppPath()};})()`);
  const canonical = value => path.resolve(value).toLowerCase();
  if (identity.pid !== pid || canonical(identity.data) !== canonical(path.join(process.env.APPDATA, '@qbot/app')) || canonical(identity.root) !== canonical('app')) throw Error('Not this workspace formal app');
  console.log(await evaluate(`(async()=>{${prefix}
    const windows=e.BrowserWindow.getAllWindows();
    const views=windows.filter(w=>['/console/index.html','/nursery/index.html'].some(p=>w.webContents.getURL().includes(p)));
    for(const w of (${process.argv[3] === 'capture' || process.argv[3] === 'show'} ? [] : views)){
      const dirty=await w.webContents.executeJavaScript("[...document.querySelectorAll('[data-initial-value]')].some(c=>c.dataset.initialValue!==((c.type==='checkbox'||c.type==='radio')?(c.checked?'1':'0'):c.value))");
      if(dirty)throw Error('An editor has an unsaved draft; refusing to reload it.');
    }
    let w=views.find(w=>w.webContents.getURL().includes('/console/'))||views[0];
    if(!w){const pet=windows.find(w=>w.webContents.getURL().includes('/pet/index.html'));if(!pet)throw Error('No client entry window');await pet.webContents.executeJavaScript("window.qbot.ui.openConsole('relationships')");for(let n=0;n<50;n++){await new Promise(r=>setTimeout(r,100));w=e.BrowserWindow.getAllWindows().find(w=>['/console/index.html','/nursery/index.html'].some(p=>w.webContents.getURL().includes(p)));if(w)break;}}
    if(!w)throw Error('Relationship window did not open');
    if(!${process.argv[3] === 'capture' || process.argv[3] === 'show'}) await new Promise(r=>{w.webContents.once('did-finish-load',r);w.webContents.reload();});
    if(!${process.argv[3] === 'capture'}) await w.webContents.executeJavaScript("window.qbot.ui.openConsole('relationships')");
    for(let n=0;n<100;n++){if(await w.webContents.executeJavaScript("!!document.querySelector('#pane-relationships.active .rel-journal, #house-book[data-view=relationships]:not([hidden]) .rel-journal')"))break;await new Promise(r=>setTimeout(r,100));}
    await w.webContents.executeJavaScript("document.fonts.ready.then(()=>true)");
    w.show();w.focus();
    await new Promise(r=>setTimeout(r,500));
    const fs=process.getBuiltinModule('fs');fs.writeFileSync(e.app.getAppPath()+'/../output/relationship-game/live.png',(await w.webContents.capturePage()).toPNG());
    return {url:w.webContents.getURL(),state:await w.webContents.executeJavaScript("({journal:!!document.querySelector('#pane-relationships.active .rel-journal, #house-book[data-view=relationships]:not([hidden]) .rel-journal'),font:document.fonts.check('20px RelationshipRound'),friends:document.querySelectorAll('.rel-rail-friend').length,names:document.querySelector('.rel-card-names')?.textContent})")};
  })()`));
} finally {
  await evaluate("setTimeout(()=>process.getBuiltinModule('inspector').close(),200);true").catch(() => {});
  ws.close();
}

