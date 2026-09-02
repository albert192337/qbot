/**
 * rooms 服务全流程自测（spec §9 M0 判据：三人进同一房 + 聊天 + 历史）。
 *
 * 用法：
 *   node rooms/smoke.mjs                    # 起本地服务自测（默认端口 24252）
 *   ROOMS_URL=ws://1.2.3.4:24252 node rooms/smoke.mjs   # 打线上
 *
 * 同 relay/smoke.mjs 的定位：不引任何测试框架，失败就非零退出。
 */
import { createHash } from 'node:crypto';
import { WebSocket } from 'ws';

const URL = process.env.ROOMS_URL || `ws://127.0.0.1:${process.env.PORT || 24252}`;
const PROTO_VER = 2;

let failures = 0;
function check(cond, label) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    failures++;
  }
}

/** 一个测试客户端：连上、发帧、按类型等帧 */
class Client {
  constructor(nickname) {
    this.nickname = nickname;
    this.frames = [];
    this.waiters = [];
  }

  async connect() {
    this.ws = new WebSocket(URL);
    await new Promise((resolve, reject) => {
      this.ws.once('open', resolve);
      this.ws.once('error', () => reject(new Error(`connect failed: ${URL}`)));
    });
    this.ws.on('message', (data) => {
      const f = JSON.parse(data.toString());
      this.frames.push(f);
      for (let i = this.waiters.length - 1; i >= 0; i--) {
        if (this.waiters[i].type === f.t) {
          this.waiters[i].resolve(f);
          this.waiters.splice(i, 1);
        }
      }
    });
    return this;
  }

  send(frame) {
    this.ws.send(JSON.stringify(frame));
  }

  /** 等一个指定类型的帧（已到过的也算） */
  wait(type, timeoutMs = 3000) {
    const seen = this.frames.find((f) => f.t === type);
    if (seen) return Promise.resolve(seen);
    return new Promise((resolve, reject) => {
      const w = { type, resolve };
      this.waiters.push(w);
      setTimeout(() => {
        const i = this.waiters.indexOf(w);
        if (i >= 0) {
          this.waiters.splice(i, 1);
          reject(new Error(`timeout waiting for '${type}' (${this.nickname})`));
        }
      }, timeoutMs);
    });
  }

  /** 清掉已收帧（下一段测试重新等同类型帧时用） */
  clear() {
    this.frames = [];
  }

  async hello(memberId) {
    this.send({ t: 'hello', protoVer: PROTO_VER, nickname: this.nickname, memberId });
    const ack = await this.wait('hello:ack');
    this.memberId = ack.memberId;
    return ack;
  }

  close() {
    this.ws?.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 轮询直到条件满足或超时（收多帧类测试用：wait() 只能找「第一个」匹配帧） */
async function waitFor(cond, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error('waitFor timeout');
    await sleep(25);
  }
}

async function main() {
  console.log(`[smoke] target ${URL}`);

  // ── 1. 连接与握手 ───────────────────────────────────────
  console.log('\n1. 握手');
  const alice = await new Client('阿蛋').connect();
  const bob = await new Client('小明').connect();
  const carol = await new Client('小红').connect();
  await alice.hello();
  await bob.hello();
  await carol.hello();
  check(!!alice.memberId, '服务端分配 memberId');
  check(alice.memberId !== bob.memberId, '不同连接拿到不同 memberId');

  // hello 之前的帧应被拒
  const stranger = await new Client('陌生人').connect();
  stranger.send({ t: 'list' });
  const needHello = await stranger.wait('error');
  check(needHello.code === 'need_hello', 'hello 前发帧被拒 (need_hello)');
  stranger.close();

  // ── 2. 开房与列表 ───────────────────────────────────────
  console.log('\n2. 开房与列表');
  alice.send({ t: 'create', name: '摸鱼小筑', kind: 'idle', capacity: 8, listed: true });
  const created = await alice.wait('room');
  check(/^[0-9A-Z]{8}$/.test(created.roomId), `房间 ID 格式正确 (${created.roomId})`);
  check(typeof created.ownerToken === 'string' && created.ownerToken.length > 0, '返回房主管理码');

  alice.send({ t: 'create', name: '深夜书房', kind: 'night', capacity: 4, listed: true });
  const night = await alice.wait('room');

  bob.send({ t: 'list' });
  const listed = await bob.wait('rooms');
  const ids = listed.rooms.map((r) => r.roomId);
  check(ids.includes(created.roomId) && ids.includes(night.roomId), '两个房都在公共列表里');

  bob.clear();
  bob.send({ t: 'list', kind: 'night' });
  const filtered = await bob.wait('rooms');
  check(filtered.rooms.every((r) => r.kind === 'night'), '按类型筛选生效');

  bob.clear();
  bob.send({ t: 'list', q: '摸鱼' });
  const searched = await bob.wait('rooms');
  check(searched.rooms.some((r) => r.roomId === created.roomId), '按名字搜索生效');

  // 私密房不上架
  carol.send({ t: 'create', name: '私密房', kind: 'coop', capacity: 4, listed: false });
  const secret = await carol.wait('room');
  bob.clear();
  bob.send({ t: 'list' });
  const listed2 = await bob.wait('rooms');
  check(!listed2.rooms.some((r) => r.roomId === secret.roomId), '私密房不出现在公共列表');

  // ── 3. 三人进同一房（M0 核心判据）──────────────────────
  console.log('\n3. 三人进同一房');
  const roomId = created.roomId;
  alice.send({ t: 'join', roomId });
  const aliceJoined = await alice.wait('joined');
  check(aliceJoined.room.roomId === roomId, 'alice 进房拿到快照');

  bob.send({ t: 'join', roomId });
  await bob.wait('joined');
  const aliceSawBob = await alice.wait('member:in');
  check(aliceSawBob.member.nickname === '小明', 'alice 看到 bob 进来');

  carol.send({ t: 'join', roomId });
  const carolJoined = await carol.wait('joined');
  check(carolJoined.room.members.length === 3, `carol 进房时看到 3 个成员`);
  check(carolJoined.room.members.filter((m) => m.online).length === 3, '三人都显示在线');

  // ── 4. 在场状态 ────────────────────────────────────────
  console.log('\n4. 在场状态');
  alice.clear();
  bob.send({ t: 'presence', mode: 'working', action: 'tea', sign: '正在修复问题' });
  const pres = await alice.wait('presence');
  check(pres.memberId === bob.memberId && pres.mode === 'working', 'alice 收到 bob 的状态变化');
  check(pres.sign === '正在修复问题', 'alice 收到 bob 的牌面文字');

  // ── 5. 聊天与最近记录 ──────────────────────────────────
  console.log('\n5. 聊天');
  carol.clear();
  bob.send({ t: 'chat', text: '今天需求又变了' });
  const chatFrame = await carol.wait('chat');
  check(chatFrame.msg.text === '今天需求又变了', 'carol 收到 bob 的发言');
  check(chatFrame.msg.nickname === '小明', '发言带昵称快照');
  check(typeof chatFrame.msg.at === 'number', '发言带服务端时间戳');

  // 冷却：3s 内连发第二条应被拒
  bob.clear();
  bob.send({ t: 'chat', text: '再来一条' });
  const limited = await bob.wait('error');
  check(limited.code === 'rate_limited', '3s 冷却内连发被拒');

  await sleep(3100);
  carol.clear();
  bob.send({ t: 'chat', text: '冷却过了' });
  const ok2 = await carol.wait('chat');
  check(ok2.msg.text === '冷却过了', '冷却结束后可继续发言');

  // 超长截断
  await sleep(3100);
  carol.clear();
  bob.send({ t: 'chat', text: 'x'.repeat(500) });
  const longMsg = await carol.wait('chat');
  check(longMsg.msg.text.length === 200, `超长发言被截断到 200 字`);

  // ── 6. 退房再进能看到最近记录（用户明确要求）───────────
  console.log('\n6. 退房再进看历史');
  carol.send({ t: 'leave', roomId });
  await sleep(200);
  carol.clear();
  carol.send({ t: 'join', roomId });
  const rejoined = await carol.wait('joined');
  check(Array.isArray(rejoined.chat) && rejoined.chat.length >= 3, `重进带回历史 (${rejoined.chat.length} 条)`);
  check(rejoined.chat.some((c) => c.text === '今天需求又变了'), '历史里有之前的发言');
  check(rejoined.chat[0].at <= rejoined.chat[rejoined.chat.length - 1].at, '历史按时间正序');
  check(
    rejoined.room.members.find((m) => m.memberId === bob.memberId)?.sign === '正在修复问题',
    '后来进房的人从快照看到当前牌面',
  );

  // ── 7. 撤回自己的发言 ──────────────────────────────────
  console.log('\n7. 撤回');
  const mine = rejoined.chat.find((c) => c.memberId === bob.memberId);
  carol.clear();
  carol.send({ t: 'chat:delete', id: mine.id });
  const notYours = await carol.wait('error');
  check(notYours.code === 'not_yours', '不能删别人的发言');

  bob.clear();
  bob.send({ t: 'chat:delete', id: mine.id });
  const deleted = await bob.wait('chat:deleted');
  check(deleted.id === mine.id, '能删自己的发言');

  // ── 7b. 举报 ───────────────────────────────────────────
  console.log('\n7b. 举报');
  await sleep(3100);
  carol.clear();
  bob.send({ t: 'chat', text: '这条会被举报' });
  const target = await carol.wait('chat');
  carol.clear();
  carol.send({ t: 'report', id: target.msg.id });
  const reported = await carol.wait('reported');
  check(reported.id === target.msg.id, '举报被受理');

  // 举报不该自动删帖（没有审核能力就别自动处置）
  carol.clear();
  carol.send({ t: 'join', roomId });
  const stillThere = await carol.wait('joined');
  check(
    stillThere.chat.some((c) => c.id === target.msg.id),
    '举报后消息仍在（不自动删，只留证据）',
  );

  // ── 8. 打招呼 ──────────────────────────────────────────
  console.log('\n8. 打招呼');
  bob.clear();
  alice.send({ t: 'wave', targetMemberId: bob.memberId });
  const wave = await bob.wait('wave');
  check(wave.fromMemberId === alice.memberId, 'bob 收到 alice 的招呼');

  // ── 8a. 应用层心跳（2026-08-30 心跳误杀修复）──────────
  // 客户端的 WebSocket 是 undici WHATWG 实现、没有协议层 ping/pong，
  // 靠这帧验双向链路；不认识它的旧服务端会回 bad_frame（客户端也认）
  console.log('\n8a. 应用层心跳');
  alice.clear();
  alice.send({ t: 'ping' });
  const pong = await alice.wait('pong');
  check(pong.t === 'pong', 'ping 收到 pong 应答');

  // ── 8b. 角色包分发（2026-08-24 上屏）──────────────────
  console.log('\n8b. 角色包分发');
  // 造一个假角色包：内容随便，hash 必须是 sha256 前 16 位（服务端收齐要校验）
  const packBuf = Buffer.alloc(300 * 1024, 7); // 300KB = 5 块，够测分块
  packBuf.write('QBot pack smoke', 100);
  const packHash = createHash('sha256').update(packBuf).digest('hex').slice(0, 16);
  const chunks = [];
  for (let i = 0; i < packBuf.length; i += 64 * 1024) {
    chunks.push(packBuf.subarray(i, Math.min(i + 64 * 1024, packBuf.length)).toString('base64'));
  }

  // 非法 hash 直接拒
  alice.clear();
  alice.send({ t: 'pack:have', hash: 'not-a-hash' });
  const badHash = await alice.wait('error');
  check(badHash.code === 'bad_frame', '非法 hash 被拒 (bad_frame)');

  // 未上传时 have 应报未缓存
  alice.clear();
  alice.send({ t: 'pack:have', hash: packHash });
  const haveAck = await alice.wait('pack:have:ack');
  check(haveAck.cached === false, '上传前 pack:have 报未缓存');

  // 乱序块被拒（先发 seq 1）
  alice.clear();
  alice.send({ t: 'pack:put', hash: packHash, seq: 1, total: chunks.length, data: chunks[1] });
  const badSeq = await alice.wait('error');
  check(badSeq.code === 'bad_frame', '乱序分块被拒 (bad_frame)');

  // 正常上传：逐块顺序
  alice.clear();
  for (let seq = 0; seq < chunks.length; seq++) {
    alice.send({ t: 'pack:put', hash: packHash, seq, total: chunks.length, data: chunks[seq] });
  }
  const putOk = await alice.wait('pack:put:ok');
  check(putOk.hash === packHash, '上传收齐回 put:ok');

  // 再 have 报已缓存；重复上传幂等直接 ok
  alice.clear();
  alice.send({ t: 'pack:have', hash: packHash });
  const haveAck2 = await alice.wait('pack:have:ack');
  check(haveAck2.cached === true, '上传后 pack:have 报已缓存');
  alice.clear();
  alice.send({ t: 'pack:put', hash: packHash, seq: 0, total: 1, data: chunks[0] });
  const putOk2 = await alice.wait('pack:put:ok');
  check(putOk2.hash === packHash, '重复上传幂等回 ok');

  // 内容与 hash 不符被拒
  const liarsHash = createHash('sha256').update(Buffer.from('liar')).digest('hex').slice(0, 16);
  alice.clear();
  alice.send({ t: 'pack:put', hash: liarsHash, seq: 0, total: 1, data: Buffer.from('not-liar').toString('base64') });
  const badPack = await alice.wait('error');
  check(badPack.code === 'pack:bad', '内容 hash 不符被拒 (pack:bad)');

  // 下载：begin + 分块，重组后逐字节一致
  // （wait() 只按类型找第一帧，多块要用队列过滤收集）
  bob.clear();
  bob.send({ t: 'pack:get', hash: packHash });
  const begin = await bob.wait('pack:begin');
  check(begin.total === chunks.length && begin.size === packBuf.length, 'pack:begin 带块数和字节数');
  await waitFor(() => bob.frames.filter((f) => f.t === 'pack:chunk').length >= begin.total, 5000);
  const got = bob.frames.filter((f) => f.t === 'pack:chunk');
  check(got.every((c, i) => c.seq === i && c.hash === packHash), '分块按序到达');
  const reassembled = Buffer.concat(got.map((c) => Buffer.from(c.data, 'base64')));
  check(reassembled.equals(packBuf), '下载重组与原包逐字节一致');

  // 下载中途再发一个 get：应回 busy（单连接一次一个下载）
  // 包要够大：服务端流是 64KB 块 × 5ms 节流，太小的包十几毫秒就流完了，
  // 经公网 wss 打时第二个 get 到达时下载早结束（RTT 一百多毫秒），busy 永远等不到。
  // 2MB = 32 块 ≈ 160ms 流时长，足够盖住两倍 RTT；本机跑也不拖时间。
  const manyChunks = Buffer.alloc(2 * 1024 * 1024, 9);
  const manyHash = createHash('sha256').update(manyChunks).digest('hex').slice(0, 16);
  const manyParts = [];
  for (let i = 0; i < manyChunks.length; i += 64 * 1024) {
    manyParts.push(manyChunks.subarray(i, Math.min(i + 64 * 1024, manyChunks.length)).toString('base64'));
  }
  carol.clear();
  for (let seq = 0; seq < manyParts.length; seq++) {
    carol.send({ t: 'pack:put', hash: manyHash, seq, total: manyParts.length, data: manyParts[seq] });
  }
  await carol.wait('pack:put:ok');
  carol.clear();
  carol.send({ t: 'pack:get', hash: manyHash });
  await carol.wait('pack:begin');
  carol.send({ t: 'pack:get', hash: manyHash });
  const busy = await carol.wait('error');
  check(busy.code === 'pack:busy', '下载中再请求被拒 (pack:busy)');
  // 收完这个包（避免影响后续测试的 downloading 状态）
  await waitFor(() => carol.frames.filter((f) => f.t === 'pack:chunk').length >= manyParts.length, 5000);

  // 不存在的包
  bob.clear();
  bob.send({ t: 'pack:get', hash: 'deadbeefdeadbeef' });
  const packNotFound = await bob.wait('error');
  check(packNotFound.code === 'pack:not_found', '下载不存在的包被拒 (pack:not_found)');

  // announce -> 房内广播 member:pack
  bob.clear();
  alice.send({ t: 'pack:announce', hash: packHash });
  const mp = await bob.wait('member:pack');
  check(mp.memberId === alice.memberId && mp.packHash === packHash, 'announce 广播到房内 (member:pack)');

  // member:in / joined 快照都带 packHash
  carol.clear();
  carol.send({ t: 'leave', roomId });
  await sleep(200);
  carol.send({ t: 'join', roomId });
  const rejoinedPack = await carol.wait('joined');
  const aliceMember = rejoinedPack.room.members.find((m) => m.memberId === alice.memberId);
  check(aliceMember?.packHash === packHash, '进房快照带在线成员的 packHash');

  // ── 9. 容量上限 ────────────────────────────────────────
  console.log('\n9. 容量');
  carol.clear();
  carol.send({ t: 'create', name: '小房', kind: 'idle', capacity: 4, listed: true });
  const small = await carol.wait('room');
  // capacity 下限 4：这里塞 5 个连接验证第 5 个被拒
  const crowd = [];
  for (let i = 0; i < 4; i++) {
    const c = await new Client(`路人${i}`).connect();
    await c.hello();
    c.send({ t: 'join', roomId: small.roomId });
    await c.wait('joined');
    crowd.push(c);
  }
  const overflow = await new Client('挤不进').connect();
  await overflow.hello();
  overflow.send({ t: 'join', roomId: small.roomId });
  const full = await overflow.wait('error');
  check(full.code === 'room_full', '满员时拒绝加入 (room_full)');
  overflow.close();
  crowd.forEach((c) => c.close());

  // ── 10. 房主权限 ───────────────────────────────────────
  console.log('\n10. 房主权限');
  bob.clear();
  bob.send({ t: 'room:update', name: '改名试试', token: 'wrong-token' });
  const notOwner = await bob.wait('error');
  check(notOwner.code === 'not_owner', '非房主改设置被拒');

  alice.clear();
  alice.send({ t: 'room:update', name: '摸鱼小筑改', token: created.ownerToken });
  const updated = await alice.wait('room:updated');
  check(updated.room.name === '摸鱼小筑改', '房主可改房间名');

  // 踢人
  bob.clear();
  alice.send({ t: 'room:kick', memberId: bob.memberId, token: created.ownerToken });
  const kicked = await bob.wait('kicked');
  check(kicked.roomId === roomId, 'bob 被踢出');
  bob.clear();
  bob.send({ t: 'join', roomId });
  const banned = await bob.wait('error');
  check(banned.code === 'banned', '被踢者再进被拒 (banned)');

  // ── 11. 错误处理 ───────────────────────────────────────
  console.log('\n11. 错误处理');
  alice.clear();
  alice.send({ t: 'join', roomId: 'NOTEXIST' });
  const notFound = await alice.wait('error');
  check(notFound.code === 'room_not_found', '进不存在的房被拒');

  alice.clear();
  alice.send({ t: 'nonsense' });
  const badFrame = await alice.wait('error');
  check(badFrame.code === 'bad_frame', '未知帧类型被拒');

  const oldProto = await new Client('老版本').connect();
  oldProto.send({ t: 'hello', protoVer: 999, nickname: '老版本' });
  const mismatch = await oldProto.wait('error');
  check(mismatch.code === 'proto_mismatch', '协议版本不一致被拒');
  oldProto.close();

  [alice, bob, carol].forEach((c) => c.close());

  console.log(`\n${failures === 0 ? '✅ 全部通过' : `❌ ${failures} 项失败`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\n[smoke] 异常:', err.message);
  process.exit(1);
});
