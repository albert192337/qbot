// CDP 截图：node cdp-shot.mjs <url子串> <输出png>
const [, , urlPart, out] = process.argv;
const list = await (await fetch('http://127.0.0.1:9223/json')).json();
const t = list.find((x) => x.type === 'page' && x.url.includes(urlPart));
if (!t) { console.error('no target'); process.exit(2); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
const shot = await new Promise((resolve) => {
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id === 1) resolve(m); };
  ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
});
ws.close();
const { writeFile } = await import('node:fs/promises');
await writeFile(out, Buffer.from(shot.result.data, 'base64'));
console.log('saved', out);
