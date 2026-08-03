/**
 * relay 烟测：两个客户端走完 create → join → paired → 双向盲转 → 主动断开 → peer-left。
 * 用法：node smoke.mjs [ws://host:24250]（默认 localhost）
 * 全部断言通过 exit 0 并打印 SMOKE OK；任何一步超时 10s 即失败。
 */
import WebSocket from 'ws';

const URL = process.argv[2] || 'ws://127.0.0.1:24250';
const TIMEOUT_MS = 10_000;

const deadline = setTimeout(() => {
  console.error('SMOKE FAIL: timeout');
  process.exit(1);
}, TIMEOUT_MS);

function connect(name) {
  const ws = new WebSocket(URL);
  ws.name = name;
  const queue = [];
  const waiters = [];
  ws.on('message', (data) => {
    const frame = JSON.parse(data.toString());
    const w = waiters.shift();
    if (w) w(frame); else queue.push(frame);
  });
  ws.next = () => new Promise((res) => {
    const f = queue.shift();
    if (f) res(f); else waiters.push(res);
  });
  ws.sendJson = (obj) => ws.send(JSON.stringify(obj));
  return new Promise((res, rej) => {
    ws.on('open', () => res(ws));
    ws.on('error', rej);
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`SMOKE FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ok: ${msg}`);
}

const a = await connect('A');
console.log(`connected to ${URL}`);

// 建房
a.sendJson({ t: 'create' });
const roomFrame = await a.next();
assert(roomFrame.t === 'room' && /^[23456789A-HJ-NP-Z]{6}$/.test(roomFrame.code), `create → room code (${roomFrame.code})`);

// 错码
const b = await connect('B');
b.sendJson({ t: 'join', code: 'ZZZZZZ' });
assert((await b.next()).code === 'room_not_found', 'join 错码 → room_not_found');

// 正确 join → 双方 paired
b.sendJson({ t: 'join', code: roomFrame.code });
assert((await a.next()).t === 'paired', 'A 收到 paired');
assert((await b.next()).t === 'paired', 'B 收到 paired');

// 双向盲转（模拟 state 帧）
a.sendJson({ t: 'state', mode: 'working', action: 'talk_happy' });
const s1 = await b.next();
assert(s1.t === 'state' && s1.mode === 'working', 'A→B state 转发');
b.sendJson({ t: 'state', mode: 'music', action: 'talk_happy', song: '测试曲目 - 测试歌手' });
const s2 = await a.next();
assert(s2.t === 'state' && s2.song === '测试曲目 - 测试歌手', 'B→A state 转发（含中文）');

// 满房拒入
const c = await connect('C');
c.sendJson({ t: 'join', code: roomFrame.code });
assert((await c.next()).code === 'room_full', '第三人 join → room_full');
c.close();

// 掉线通知
b.close();
assert((await a.next()).t === 'peer-left', 'B 断开 → A 收到 peer-left');

a.close();
clearTimeout(deadline);
console.log('SMOKE OK');
process.exit(0);
