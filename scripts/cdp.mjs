// 一次性 CDP 小工具：node cdp.mjs <url子串> "<js表达式>"
// Node 22 原生 WebSocket，零依赖。表达式按 awaitPromise 求值，直接打 JSON。
const [, , urlPart, expr] = process.argv;
const list = await (await fetch('http://127.0.0.1:9223/json')).json();
const t = list.find((x) => x.type === 'page' && x.url.includes(urlPart));
if (!t) {
  console.error('no target for', urlPart, '\navailable:', list.map((x) => x.url).join('\n'));
  process.exit(2);
}
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
const res = await new Promise((resolve, reject) => {
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id === 1) resolve(m);
  };
  ws.onerror = reject;
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: expr, awaitPromise: true, returnByValue: true },
  }));
});
ws.close();
if (res.result?.exceptionDetails) {
  console.error('EXCEPTION:', JSON.stringify(res.result.exceptionDetails.exception ?? res.result.exceptionDetails));
  process.exit(1);
}
const v = res.result?.result;
console.log(typeof v?.value === 'object' ? JSON.stringify(v.value, null, 2) : String(v?.value));
