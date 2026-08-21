/**
 * rooms 服务全流程自测（spec §9 M0 判据：三人进同一房 + 聊天 + 历史）。
 *
 * 用法：
 *   node rooms/smoke.mjs                    # 起本地服务自测（默认端口 24252）
 *   ROOMS_URL=ws://1.2.3.4:24252 node rooms/smoke.mjs   # 打线上
 *
 * 同 relay/smoke.mjs 的定位：不引任何测试框架，失败就非零退出。
 */
import { WebSocket } from 'ws';

const URL = process.env.ROOMS_URL || `ws://127.0.0.1:${process.env.PORT || 24252}`;
const PROTO_VER = 1;

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
  bob.send({ t: 'presence', mode: 'working', action: 'tea' });
  const pres = await alice.wait('presence');
  check(pres.memberId === bob.memberId && pres.mode === 'working', 'alice 收到 bob 的状态变化');

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

  // ── 8. 打招呼 ──────────────────────────────────────────
  console.log('\n8. 打招呼');
  bob.clear();
  alice.send({ t: 'wave', targetMemberId: bob.memberId });
  const wave = await bob.wait('wave');
  check(wave.fromMemberId === alice.memberId, 'bob 收到 alice 的招呼');

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
