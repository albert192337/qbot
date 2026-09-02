/**
 * 公共房间的**纯逻辑**：帧校验、聊天限流预挡、列表排序、历史合并。
 *
 * 零 IO 零 Electron，全部纯函数 → 可单测（`app/test/rooms-rules.test.ts`）。
 * 网络/落盘/窗口在 `rooms.ts`，两者边界不要糊在一起（同 progress-rules ↔ progress）。
 *
 * 注意：这里的限流是**客户端预挡**（给用户即时反馈，省一次往返），
 * 服务端 `rooms/server.mjs` 有一份同规则的权威实现。两边参数必须一致，
 * 改一处记得改另一处——服务端不信客户端，客户端也不该比服务端松。
 */
import type { RoomBrief, RoomChatMsg, RoomKind } from '../../shared/ipc-types';

/** 协议版本：与 rooms/server.mjs 的 PROTO_VER 必须一致。v2 = 角色包分发（上屏） */
export const PROTO_VER = 2;

/** 角色包指纹格式（sha256 前 16 位十六进制，同服务端） */
export const PACK_HASH_RE = /^[0-9a-f]{16}$/;

/**
 * `.peer-` 缓存 LRU 淘汰：给定候选目录（已排除在用的）+ 保留上限，
 * 返回该删的目录名（最旧优先）。纯函数，不碰文件系统（room-pets.ts 负责 IO）。
 */
export function selectPruneTargets(
  candidates: readonly { name: string; mtime: number }[],
  keep: number,
): string[] {
  const excess = candidates.length - keep;
  if (excess <= 0) return [];
  return [...candidates].sort((a, b) => a.mtime - b.mtime).slice(0, excess).map((c) => c.name);
}

/** 宠上屏的一个槽位：相对工作区左边缘的 x + 相对**底边缘**的向上偏移 */
export interface RoomPetSlot {
  memberId: string;
  x: number;
  /** 离工作区底边的距离（像素，越大越靠上）；调用方自己换算成绝对 y */
  bottomOffset: number;
}

/**
 * 宠上屏布局：按进房顺序排开，行从屏幕底部往上叠、每行水平居中。
 * 纯函数（不碰 Electron screen API），只 setPosition 用——**永不 setBounds**
 * （血泪坑 4/18：透明窗 resize 有渲染 bug，尺寸恒定，只挪位置）。
 */
export function layoutRoomPets(
  memberIds: readonly string[],
  workAreaWidth: number,
  petSize: number,
  gap: number,
): RoomPetSlot[] {
  if (memberIds.length === 0) return [];
  const perRow = Math.max(1, Math.floor((workAreaWidth + gap) / (petSize + gap)));
  return memberIds.map((memberId, i) => {
    const row = Math.floor(i / perRow);
    const rowStart = row * perRow;
    const inThisRow = Math.min(perRow, memberIds.length - rowStart);
    const rowWidth = inThisRow * petSize + (inThisRow - 1) * gap;
    const rowStartX = (workAreaWidth - rowWidth) / 2;
    const col = i - rowStart;
    return {
      memberId,
      x: rowStartX + col * (petSize + gap),
      bottomOffset: (row + 1) * petSize + row * gap,
    };
  });
}

// ── 上限（与服务端同值）────────────────────────────────────
export const NAME_MAX = 24;
export const NICK_MAX = 16;
export const CHAT_MAX = 200;
export const CAPACITY_MIN = 4;
export const CAPACITY_MAX = 12;
export const CAPACITY_DEFAULT = 8;

// ── 聊天限流（与服务端同值）────────────────────────────────
export const CHAT_COOLDOWN_MS = 3000;
export const CHAT_PER_MIN = 10;
export const CHAT_DUP_LIMIT = 3;

export const ROOM_KINDS: readonly RoomKind[] = ['idle', 'study', 'night', 'coop'];

export const ROOM_KIND_LABEL: Readonly<Record<RoomKind, string>> = {
  idle: '摸鱼房',
  study: '自习室',
  night: '夜猫房',
  coop: '联机房',
};

export function isRoomKind(v: unknown): v is RoomKind {
  return typeof v === 'string' && (ROOM_KINDS as readonly string[]).includes(v);
}

/** 折叠空白 + 截断（同服务端 clampText，避免两边算出不同长度） */
export function clampText(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** 开房参数规整：非法值退默认而不是报错（UI 上限已经挡过一道） */
export function normalizeCreateInput(raw: {
  name?: string;
  kind?: string;
  capacity?: number;
  listed?: boolean;
}): { name: string; kind: RoomKind; capacity: number; listed: boolean } | null {
  const name = clampText(raw.name, NAME_MAX);
  if (!name) return null; // 没名字的房不让开（列表里没法认）
  const capacity = Number.isFinite(raw.capacity)
    ? Math.min(CAPACITY_MAX, Math.max(CAPACITY_MIN, Math.floor(raw.capacity as number)))
    : CAPACITY_DEFAULT;
  return {
    name,
    kind: isRoomKind(raw.kind) ? raw.kind : 'idle',
    capacity,
    listed: raw.listed !== false,
  };
}

/**
 * 聊天预挡：能本地判定的就别发出去（省往返 + 即时反馈）。
 * @returns 拒绝原因文案，null = 放行
 */
export function precheckChat(
  text: string,
  history: { at: number; text: string }[],
  now: number,
): string | null {
  const trimmed = clampText(text, CHAT_MAX);
  if (!trimmed) return '说点什么吧';
  const recent = history.filter((h) => now - h.at < 60_000);
  const last = history[history.length - 1];
  if (last && now - last.at < CHAT_COOLDOWN_MS) {
    const wait = Math.ceil((CHAT_COOLDOWN_MS - (now - last.at)) / 1000);
    return `慢一点，${wait} 秒后再说`;
  }
  if (recent.length >= CHAT_PER_MIN) return '说得太快了，缓一分钟';
  // 连发同内容：末尾连续相同的条数
  let dup = 0;
  for (let i = history.length - 1; i >= 0 && history[i].text === trimmed; i--) dup++;
  if (dup + 1 >= CHAT_DUP_LIMIT) return '别刷屏啦';
  return null;
}

/**
 * 列表排序：收藏置顶 → 在线人多 → 最近活跃。
 * 纯函数（不改入参），收藏集合由调用方给。
 */
export function sortRooms(rooms: RoomBrief[], favorites: ReadonlySet<string>): RoomBrief[] {
  return [...rooms].sort((a, b) => {
    const fa = favorites.has(a.roomId) ? 1 : 0;
    const fb = favorites.has(b.roomId) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    if (a.online !== b.online) return b.online - a.online;
    return b.lastActiveAt - a.lastActiveAt;
  });
}

/** 本地筛选（服务端也筛一道；这里是切 tab 时不重新请求的即时响应） */
export function filterRooms(rooms: RoomBrief[], kind: RoomKind | null, q: string): RoomBrief[] {
  const needle = q.trim().toLowerCase();
  return rooms.filter(
    (r) => (!kind || r.kind === kind) && (!needle || r.name.toLowerCase().includes(needle)),
  );
}

/**
 * 历史合并：进房快照 + 增量广播可能重叠（重连时尤其），按 id 去重后按时间正序。
 * 只留最近 keep 条（与服务端 CHAT_KEEP 对齐，别让客户端无限涨）。
 */
export function mergeChat(
  existing: readonly RoomChatMsg[],
  incoming: readonly RoomChatMsg[],
  keep = 50,
): RoomChatMsg[] {
  const byId = new Map<string, RoomChatMsg>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(-keep);
}

/** 错误码 → 人话（服务端只回 code，文案在客户端） */
export function errorText(code: string): string {
  switch (code) {
    case 'room_not_found': return '房间不存在（可能已被回收）';
    case 'room_full': return '房间满员了';
    case 'banned': return '你已被这个房间移出';
    case 'rate_limited': return '说得太快了，缓一缓';
    case 'not_owner': return '只有房主能做这个操作';
    case 'not_yours': return '只能撤回自己的发言';
    case 'server_full': return '房间服务已满，晚点再试';
    case 'too_many_rooms': return '你开的房太多了（上限 3 个）';
    case 'proto_mismatch': return 'QBot 版本太旧，请升级后再进房';
    case 'not_in_room': return '你不在房间里';
    case 'need_hello': return '连接未就绪，请重试';
    // ── 角色包（上屏）──
    case 'pack:not_found': return '房友的角色包还没就绪';
    case 'pack:busy': return '角色包正在传输中';
    case 'pack:bad': return '角色包校验失败';
    case 'pack:too_big': return '角色包太大，无法在房间展示';
    case 'pack:rate_limited': return '角色包上传太频繁，稍后再试';
    default: return `房间服务出错（${code}）`;
  }
}

// ── 出帧的隐私边界（spec §5.3，有测试守着）────────────────────

/**
 * 本机可见的全部状态（**故意把敏感字段也收进来**）——
 * 这样「哪些字段能出本机」就是这个函数一处说了算，而不是散落在调用点靠自觉。
 */
export interface LocalStateSnapshot {
  activity: string;
  /** 当前桌宠实际显示的牌面文字；公共房间透明同步，空值表示未举牌 */
  signText?: string | null;
  /** 以下字段本机可见，但**绝不出本机**：列在这里是为了让测试能证明它们没被带出去 */
  songTitle?: string;
  bubbleText?: string;
  lastAssistantMessage?: string;
  cwd?: string;
  persona?: string;
  transcriptPath?: string;
}

/** presence 帧允许出现的字段——白名单，新增字段必须先过这里 */
export const PRESENCE_ALLOWED_KEYS = ['t', 'mode', 'action', 'sign'] as const;

/**
 * 构造 presence 帧：状态枚举、动作名，以及桌宠当前实际显示的牌面文字。
 * 牌面之外的 agent 正文、工程路径、人格与 transcript 仍严格禁止出本机。
 */
export function buildPresenceFrame(
  snapshot: LocalStateSnapshot,
  action?: string,
): { t: 'presence'; mode: string; action?: string; sign?: string } {
  const frame: { t: 'presence'; mode: string; action?: string; sign?: string } = {
    t: 'presence',
    mode: snapshot.activity || 'idle',
  };
  if (action) frame.action = clampText(action, 32);
  const sign = clampText(snapshot.signText, 60);
  if (sign) frame.sign = sign;
  return frame;
}

/**
 * 构造 chat 帧：只接**用户手打的文字**。
 *
 * 这是用户文字的唯一出口。任何 agent 内容（气泡正文 / last_assistant_message /
 * transcript / cwd / persona）都不许从这里走，也不许加「一键分享结论到房间」
 * 这类便利入口——那等于给隐私边界开后门。
 */
export function buildChatFrame(userTypedText: string): { t: 'chat'; text: string } | null {
  const text = clampText(userTypedText, CHAT_MAX);
  return text ? { t: 'chat', text } : null;
}
