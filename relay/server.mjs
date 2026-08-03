/**
 * QBot 联机 presence 中继（spec: docs/superpowers/specs/2026-08-02-multiplayer-presence-design.md §6）
 *
 * 职责只有两件：房间码配对（1v1）、paired 之后逐帧盲转。
 * 铁律：paired 后不解析帧内容、不落盘、日志不记正文——relay 按不可信节点设计，这里也不给自己留后门。
 * 禁止 import 仓库其他模块：单文件 + ws，可整目录 scp 到任意机器跑。
 */
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 24250);
/** 单帧上限：asset:chunk 64KB base64 ≈ 88KB，留余量 */
const MAX_PAYLOAD = 256 * 1024;
const MAX_ROOMS = 500;
/** 单人房（对端掉线/还没来）保留时长，等重连 */
const LONE_ROOM_TTL_MS = 10 * 60 * 1000;
const PING_INTERVAL_MS = 30 * 1000;
/** 房间码字符集：去易混 0O1I */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LEN = 6;

/** @type {Map<string, {peers: Set<import('ws').WebSocket>, loneTimer: NodeJS.Timeout | null}>} */
const rooms = new Map();

function genCode() {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LEN; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return null; // 500 房上限内撞 100 次几乎不可能
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

/** 房间进入单人状态：起 TTL 定时器，到点解散 */
function armLoneTimer(code, room) {
  if (room.loneTimer) clearTimeout(room.loneTimer);
  room.loneTimer = setTimeout(() => {
    for (const p of room.peers) p.close();
    rooms.delete(code);
  }, LONE_ROOM_TTL_MS);
}

function joinRoom(ws, code, room) {
  room.peers.add(ws);
  ws.roomCode = code;
  if (room.peers.size === 2) {
    if (room.loneTimer) { clearTimeout(room.loneTimer); room.loneTimer = null; }
    for (const p of room.peers) {
      p.peer = [...room.peers].find((x) => x !== p);
      send(p, { t: 'paired' });
    }
  } else {
    armLoneTimer(code, room);
  }
}

const wss = new WebSocketServer({ port: PORT, maxPayload: MAX_PAYLOAD });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data, isBinary) => {
    // 已配对 → 盲转，不解析（含二进制）
    if (ws.peer) {
      if (ws.peer.readyState === ws.peer.OPEN) ws.peer.send(data, { binary: isBinary });
      return;
    }
    // 未配对 → 只认 create / join 控制帧
    let frame;
    try {
      frame = JSON.parse(data.toString());
    } catch {
      send(ws, { t: 'error', code: 'bad_frame' });
      return;
    }
    if (frame.t === 'create') {
      if (ws.roomCode) return; // 已在房里，忽略
      if (rooms.size >= MAX_ROOMS) { send(ws, { t: 'error', code: 'server_full' }); return; }
      const code = genCode();
      if (!code) { send(ws, { t: 'error', code: 'server_full' }); return; }
      const room = { peers: new Set(), loneTimer: null };
      rooms.set(code, room);
      joinRoom(ws, code, room);
      send(ws, { t: 'room', code });
    } else if (frame.t === 'join') {
      if (ws.roomCode) return;
      const code = String(frame.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) { send(ws, { t: 'error', code: 'room_not_found' }); return; }
      if (room.peers.size >= 2) { send(ws, { t: 'error', code: 'room_full' }); return; }
      joinRoom(ws, code, room);
    } else {
      send(ws, { t: 'error', code: 'bad_frame' });
    }
  });

  ws.on('close', () => {
    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
    if (!room) return;
    room.peers.delete(ws);
    if (room.peers.size === 0) {
      if (room.loneTimer) clearTimeout(room.loneTimer);
      rooms.delete(ws.roomCode);
    } else {
      // 剩一人：通知 + 解除互指 + 开 TTL 等重连
      for (const p of room.peers) {
        p.peer = null;
        send(p, { t: 'peer-left' });
      }
      armLoneTimer(ws.roomCode, room);
    }
  });

  ws.on('error', () => ws.close());
});

// 心跳踢死连接（NAT 半开、断电对端）
const pinger = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, PING_INTERVAL_MS);
wss.on('close', () => clearInterval(pinger));

// 运营日志只记数字，不记内容
setInterval(() => {
  console.log(`[relay] rooms=${rooms.size} conns=${wss.clients.size}`);
}, 60 * 1000).unref();

console.log(`[relay] listening on :${PORT}`);
