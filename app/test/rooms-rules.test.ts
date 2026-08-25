/**
 * 公共房间纯逻辑的单测（spec 2026-08-21 §9.1）。
 *
 * 只测 rooms-rules.ts —— 网络/落盘/窗口在 rooms.ts，那层要 Electron，不在覆盖范围。
 * 服务端 rooms/server.mjs 的对应规则由 rooms/smoke.mjs 端到端覆盖。
 */
import { describe, expect, it } from 'vitest';
import {
  buildChatFrame,
  buildPresenceFrame,
  PACK_HASH_RE,
  PRESENCE_ALLOWED_KEYS,
  CAPACITY_DEFAULT,
  CAPACITY_MAX,
  CAPACITY_MIN,
  CHAT_MAX,
  NAME_MAX,
  clampText,
  errorText,
  filterRooms,
  isRoomKind,
  layoutRoomPets,
  mergeChat,
  normalizeCreateInput,
  precheckChat,
  selectPruneTargets,
  sortRooms,
} from '../src/main/rooms/rooms-rules';
import type { RoomBrief, RoomChatMsg } from '../src/shared/ipc-types';

const brief = (over: Partial<RoomBrief>): RoomBrief => ({
  roomId: 'AAAAAAAA',
  name: '房',
  kind: 'idle',
  capacity: 8,
  members: 0,
  online: 0,
  lastActiveAt: 0,
  ...over,
});

const msg = (id: string, at: number, text = 't'): RoomChatMsg => ({
  id,
  memberId: 'm1',
  nickname: 'n',
  text,
  at,
});

describe('clampText', () => {
  it('折叠空白并截断', () => {
    expect(clampText('  a   b  ', 10)).toBe('a b');
    expect(clampText('x'.repeat(50), 10)).toHaveLength(10);
  });

  it('非字符串一律空串', () => {
    expect(clampText(undefined, 10)).toBe('');
    expect(clampText(42, 10)).toBe('');
    expect(clampText(null, 10)).toBe('');
  });
});

describe('isRoomKind', () => {
  it('认四种合法类型', () => {
    expect(isRoomKind('idle')).toBe(true);
    expect(isRoomKind('coop')).toBe(true);
  });

  it('拒非法值', () => {
    expect(isRoomKind('party')).toBe(false);
    expect(isRoomKind(undefined)).toBe(false);
  });
});

describe('normalizeCreateInput', () => {
  it('没名字的房不让开', () => {
    expect(normalizeCreateInput({ name: '   ' })).toBeNull();
    expect(normalizeCreateInput({})).toBeNull();
  });

  it('容量夹到 [4,12]', () => {
    expect(normalizeCreateInput({ name: 'a', capacity: 1 })?.capacity).toBe(CAPACITY_MIN);
    expect(normalizeCreateInput({ name: 'a', capacity: 999 })?.capacity).toBe(CAPACITY_MAX);
    expect(normalizeCreateInput({ name: 'a', capacity: 6 })?.capacity).toBe(6);
  });

  it('容量缺省/非法退默认', () => {
    expect(normalizeCreateInput({ name: 'a' })?.capacity).toBe(CAPACITY_DEFAULT);
    expect(normalizeCreateInput({ name: 'a', capacity: NaN })?.capacity).toBe(CAPACITY_DEFAULT);
  });

  it('非法 kind 退 idle，listed 默认 true', () => {
    const r = normalizeCreateInput({ name: 'a', kind: 'party' });
    expect(r?.kind).toBe('idle');
    expect(r?.listed).toBe(true);
    expect(normalizeCreateInput({ name: 'a', listed: false })?.listed).toBe(false);
  });

  it('房名超长截断', () => {
    expect(normalizeCreateInput({ name: '长'.repeat(99) })?.name).toHaveLength(NAME_MAX);
  });
});

describe('precheckChat', () => {
  const now = 100_000;

  it('空内容拒', () => {
    expect(precheckChat('   ', [], now)).toBeTruthy();
  });

  it('3 秒冷却内拒，冷却后放行', () => {
    const history = [{ at: now - 1000, text: 'a' }];
    expect(precheckChat('b', history, now)).toContain('秒后');
    expect(precheckChat('b', [{ at: now - 3100, text: 'a' }], now)).toBeNull();
  });

  it('一分钟 10 条封顶', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ at: now - 50_000 + i * 100, text: `${i}` }));
    expect(precheckChat('x', history, now)).toContain('太快');
  });

  it('一分钟外的旧消息不计入配额', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ at: now - 120_000 + i, text: `${i}` }));
    expect(precheckChat('x', history, now)).toBeNull();
  });

  it('连发同内容被拒', () => {
    const history = [
      { at: now - 10_000, text: '刷' },
      { at: now - 5000, text: '刷' },
    ];
    expect(precheckChat('刷', history, now)).toContain('刷屏');
  });

  it('中间插了别的内容就不算连发', () => {
    const history = [
      { at: now - 10_000, text: '刷' },
      { at: now - 5000, text: '别的' },
    ];
    expect(precheckChat('刷', history, now)).toBeNull();
  });

  it('超长内容截断后仍放行（不因超长拒绝）', () => {
    expect(precheckChat('x'.repeat(CHAT_MAX + 100), [], now)).toBeNull();
  });
});

describe('sortRooms', () => {
  it('收藏置顶，其次在线多，再次最近活跃', () => {
    const rooms = [
      brief({ roomId: 'A', online: 5, lastActiveAt: 1 }),
      brief({ roomId: 'B', online: 0, lastActiveAt: 9 }),
      brief({ roomId: 'C', online: 1, lastActiveAt: 5 }),
    ];
    const sorted = sortRooms(rooms, new Set(['B']));
    expect(sorted.map((r) => r.roomId)).toEqual(['B', 'A', 'C']);
  });

  it('不改入参', () => {
    const rooms = [brief({ roomId: 'A', online: 0 }), brief({ roomId: 'B', online: 9 })];
    sortRooms(rooms, new Set());
    expect(rooms[0].roomId).toBe('A');
  });
});

describe('filterRooms', () => {
  const rooms = [
    brief({ roomId: 'A', name: '摸鱼小筑', kind: 'idle' }),
    brief({ roomId: 'B', name: '深夜书房', kind: 'night' }),
  ];

  it('按类型筛', () => {
    expect(filterRooms(rooms, 'night', '').map((r) => r.roomId)).toEqual(['B']);
  });

  it('按名字筛（大小写不敏感）', () => {
    expect(filterRooms(rooms, null, '书房').map((r) => r.roomId)).toEqual(['B']);
    expect(filterRooms([brief({ roomId: 'C', name: 'GoGo' })], null, 'gogo')).toHaveLength(1);
  });

  it('空条件全放行', () => {
    expect(filterRooms(rooms, null, '  ')).toHaveLength(2);
  });
});

describe('mergeChat', () => {
  it('按 id 去重（重连时快照与增量重叠）', () => {
    const merged = mergeChat([msg('a', 1), msg('b', 2)], [msg('b', 2), msg('c', 3)]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('按时间正序', () => {
    const merged = mergeChat([], [msg('c', 30), msg('a', 10), msg('b', 20)]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('同时间戳按 id 稳定排序', () => {
    const merged = mergeChat([], [msg('b', 5), msg('a', 5)]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('只留最近 keep 条', () => {
    const many = Array.from({ length: 80 }, (_, i) => msg(`m${i}`, i));
    expect(mergeChat([], many, 50)).toHaveLength(50);
    expect(mergeChat([], many, 50)[0].id).toBe('m30');
  });

  it('后来的同 id 覆盖旧的（服务端修订以最新为准）', () => {
    const merged = mergeChat([msg('a', 1, '旧')], [msg('a', 1, '新')]);
    expect(merged[0].text).toBe('新');
  });
});

describe('errorText', () => {
  it('已知错误码有人话', () => {
    expect(errorText('room_full')).toContain('满员');
    expect(errorText('banned')).toContain('移出');
    expect(errorText('proto_mismatch')).toContain('升级');
  });

  it('未知码兜底带上原码（便于排查）', () => {
    expect(errorText('weird_code')).toContain('weird_code');
  });
});

// ── 隐私铁律（spec §5.3）──────────────────────────────────────
// 与 link-asset-pack 的「persona 不出包」同一形状：把边界写成可执行的断言，
// 而不是靠注释和自觉。新增字段若想出本机，必须先改白名单并改这里的测试。

describe('隐私铁律：presence 帧不带任何敏感内容', () => {
  /** 本机全量状态：故意塞满敏感字段，断言它们一个都出不去 */
  const dirty = {
    activity: 'working',
    songTitle: '周杰伦 - 晴天',
    bubbleText: '我把 auth.ts 的登录 bug 修好了',
    lastAssistantMessage: '已修复 src/auth.ts:42 的空指针',
    cwd: '/Users/me/secret-project',
    persona: '一只毒舌的猫',
    transcriptPath: '/Users/me/.claude/projects/x/transcript.jsonl',
  };

  it('只出 t/mode/action 三个字段', () => {
    const frame = buildPresenceFrame(dirty, 'tea');
    expect(Object.keys(frame).sort()).toEqual([...PRESENCE_ALLOWED_KEYS].sort());
  });

  it('序列化后不含曲名（公共房间对陌生人，连曲名都不发）', () => {
    const wire = JSON.stringify(buildPresenceFrame(dirty, 'tea'));
    expect(wire).not.toContain('晴天');
    expect(wire).not.toContain('周杰伦');
  });

  it('序列化后不含气泡正文 / last_assistant_message', () => {
    const wire = JSON.stringify(buildPresenceFrame(dirty, 'tea'));
    expect(wire).not.toContain('auth.ts');
    expect(wire).not.toContain('登录 bug');
    expect(wire).not.toContain('空指针');
  });

  it('序列化后不含 cwd / transcript 路径 / persona', () => {
    const wire = JSON.stringify(buildPresenceFrame(dirty, 'tea'));
    expect(wire).not.toContain('secret-project');
    expect(wire).not.toContain('transcript');
    expect(wire).not.toContain('毒舌');
  });

  it('mode 只是枚举，action 只是动作名', () => {
    const frame = buildPresenceFrame(dirty, 'tea');
    expect(frame.mode).toBe('working');
    expect(frame.action).toBe('tea');
  });

  it('activity 缺省退 idle（不泄漏「未知状态」这种信息）', () => {
    expect(buildPresenceFrame({ activity: '' }).mode).toBe('idle');
  });
});

describe('隐私铁律：chat 帧只接用户手打的文字', () => {
  it('正常发言原样带出（截断后）', () => {
    expect(buildChatFrame('今天需求又变了')).toEqual({ t: 'chat', text: '今天需求又变了' });
  });

  it('空/纯空白不出帧（别把空气发出去）', () => {
    expect(buildChatFrame('   ')).toBeNull();
    expect(buildChatFrame('')).toBeNull();
  });

  it('超长截断到 200 字', () => {
    expect(buildChatFrame('说'.repeat(500))?.text).toHaveLength(CHAT_MAX);
  });

  it('只有 t/text 两个字段（不夹带来源/会话 id）', () => {
    expect(Object.keys(buildChatFrame('hi')!).sort()).toEqual(['t', 'text']);
  });
});

describe('角色包指纹格式（PACK_HASH_RE，与服务端一致）', () => {
  it('接受 sha256 前 16 位小写十六进制', () => {
    expect(PACK_HASH_RE.test('ab2042c9fe29136d')).toBe(true);
  });

  it('拒绝大写/超长/非十六进制', () => {
    expect(PACK_HASH_RE.test('AB2042C9FE29136D')).toBe(false);
    expect(PACK_HASH_RE.test('ab2042c9fe29136d00')).toBe(false);
    expect(PACK_HASH_RE.test('not-a-hash-value')).toBe(false);
  });
});

describe('宠上屏布局（layoutRoomPets）', () => {
  it('没人时返回空', () => {
    expect(layoutRoomPets([], 1000, 200, 20)).toEqual([]);
  });

  it('一行装得下：水平居中，都在第一行（bottomOffset 相同）', () => {
    const slots = layoutRoomPets(['a', 'b', 'c', 'd'], 1000, 200, 20);
    // perRow = floor(1020/220) = 4，四个正好一行：整体宽 860，居中留白 (1000-860)/2=70
    expect(slots.map((s) => s.x)).toEqual([70, 290, 510, 730]);
    expect(slots.every((s) => s.bottomOffset === 200)).toBe(true);
  });

  it('超过一行装的数量：换行叠高，第二行 bottomOffset 更大（更靠上）', () => {
    const slots = layoutRoomPets(['a', 'b', 'c', 'd', 'e'], 1000, 200, 20);
    expect(slots[4].bottomOffset).toBeGreaterThan(slots[0].bottomOffset);
    expect(slots[4].bottomOffset).toBe(420); // 第二行只有 1 个，居中于 1000 宽
    expect(slots[4].x).toBe(400);
  });

  it('单人房：整体居中', () => {
    const slots = layoutRoomPets(['solo'], 1000, 200, 20);
    expect(slots).toEqual([{ memberId: 'solo', x: 400, bottomOffset: 200 }]);
  });

  it('极窄工作区（小于一只宽度）：至少一行一个，不整除也不崩', () => {
    const slots = layoutRoomPets(['a', 'b'], 150, 200, 20);
    expect(slots).toHaveLength(2);
    expect(slots[0].bottomOffset).toBe(200);
    expect(slots[1].bottomOffset).toBeGreaterThan(slots[0].bottomOffset); // 挤不下一行，各占一行
  });

  it('memberId 顺序保留（按进房顺序排，不重排）', () => {
    const slots = layoutRoomPets(['z', 'a', 'm'], 1000, 200, 20);
    expect(slots.map((s) => s.memberId)).toEqual(['z', 'a', 'm']);
  });
});

describe('.peer- 缓存 LRU 淘汰（selectPruneTargets）', () => {
  it('不超上限时什么都不删', () => {
    const c = [{ name: 'a', mtime: 1 }, { name: 'b', mtime: 2 }];
    expect(selectPruneTargets(c, 4)).toEqual([]);
  });

  it('超上限按最旧优先删，只删超出的数量', () => {
    const c = [
      { name: 'newest', mtime: 30 },
      { name: 'oldest', mtime: 10 },
      { name: 'middle', mtime: 20 },
    ];
    expect(selectPruneTargets(c, 1)).toEqual(['oldest', 'middle']);
  });

  it('keep 为 0 时全删；候选为空时不删', () => {
    expect(selectPruneTargets([{ name: 'a', mtime: 1 }], 0)).toEqual(['a']);
    expect(selectPruneTargets([], 4)).toEqual([]);
  });

  it('不修改传入的数组（纯函数）', () => {
    const c = [{ name: 'a', mtime: 2 }, { name: 'b', mtime: 1 }];
    const copy = [...c];
    selectPruneTargets(c, 0);
    expect(c).toEqual(copy);
  });
});
