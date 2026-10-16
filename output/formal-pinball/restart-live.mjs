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
  console.log(await evaluate(`(()=>{${prefix}e.app.relaunch();setTimeout(()=>e.app.quit(),500);return {restarting:true,pid:process.pid};})()`));
} finally {
  await evaluate("setTimeout(()=>process.getBuiltinModule('inspector').close(),200);true").catch(() => {});
  ws.close();
}
