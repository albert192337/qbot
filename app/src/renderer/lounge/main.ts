/**
 * 公共房间窗（spec 2026-08-21）：房间市场列表 + 房内在场/聊天。
 *
 * 所有网络请求经主进程（同 market renderer 的分工）；这里只管渲染和交互。
 * 血泪坑 12：renderer 不 value import pipeline —— 房间类型常量在本地重声明。
 */
import type {
  RoomBrief,
  RoomChatMsg,
  RoomKind,
  RoomMember,
  RoomSnapshot,
} from '../../shared/ipc-types';

// 本地重声明（不从主进程侧 rooms-rules 引：那是 main 的模块，会把 node 依赖拖进浏览器包）
const KIND_LABEL: Record<string, string> = {
  idle: '摸鱼房',
  study: '自习室',
  night: '夜猫房',
  coop: '联机房',
};
const MODE_LABEL: Record<string, string> = {
  idle: '摸鱼中',
  thinking: '在思考',
  working: '在敲代码',
  waiting: '等回应',
  done: '刚搞定',
  error: '出错了',
  music: '听歌中',
};
const CHAT_MAX = 200;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const listView = $('list-view');
const roomView = $('room-view');
const listEl = $('list');
const membersEl = $('members');
const chatEl = $('chat');
const statusEl = $('status');
const nickInput = $<HTMLInputElement>('nickname');
const searchInput = $<HTMLInputElement>('search');
const chatInput = $<HTMLInputElement>('chat-input');
const roomTitle = $('room-title');
const settingsBtn = $<HTMLButtonElement>('settings-btn');
const modal = $('modal');
const sheet = $('sheet');

let rooms: RoomBrief[] = [];
let favorites = new Set<string>();
let filterKind: RoomKind | null = null;
let myMemberId = '';
let currentRoom: RoomSnapshot | null = null;
let chatLog: RoomChatMsg[] = [];
/** 本地发言时间戳（预挡限流用，与服务端同规则） */
const sentAt: number[] = [];

// ── 工具 ────────────────────────────────────────────────────

function setStatus(text: string, isError = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

function errText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // invoke 的报错带 "Error invoking remote method ..." 前缀，剥掉留人话
  return msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function fmtTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function closeModal(): void {
  modal.classList.remove('on');
  sheet.replaceChildren();
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// ── 列表视图 ────────────────────────────────────────────────

function renderList(): void {
  const q = searchInput.value.trim().toLowerCase();
  const shown = rooms
    .filter((r) => (!filterKind || r.kind === filterKind) && (!q || r.name.toLowerCase().includes(q)))
    // 收藏置顶 → 在线人多 → 最近活跃（与主进程 sortRooms 同序）
    .sort((a, b) => {
      const fa = favorites.has(a.roomId) ? 1 : 0;
      const fb = favorites.has(b.roomId) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      if (a.online !== b.online) return b.online - a.online;
      return b.lastActiveAt - a.lastActiveAt;
    });

  listEl.replaceChildren();
  if (shown.length === 0) {
    const empty = document.createElement('div');
    empty.id = 'empty';
    empty.textContent = rooms.length === 0
      ? '还没有公共房间\n开一个，等人来串门'
      : '没有符合条件的房间';
    empty.style.whiteSpace = 'pre-line';
    listEl.appendChild(empty);
    return;
  }

  for (const room of shown) {
    const row = document.createElement('div');
    row.className = 'room';

    const fav = document.createElement('span');
    fav.className = `fav${favorites.has(room.roomId) ? ' on' : ''}`;
    fav.textContent = '★';
    fav.title = '收藏（置顶）';
    fav.addEventListener('click', async (e) => {
      e.stopPropagation();
      favorites = new Set(await window.qbot.rooms.toggleFavorite(room.roomId));
      renderList();
    });

    const main = document.createElement('div');
    main.className = 'room-main';
    const name = document.createElement('div');
    name.className = 'room-name';
    name.textContent = room.name;
    name.title = room.name;
    const meta = document.createElement('div');
    meta.className = 'room-meta';
    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = KIND_LABEL[room.kind] ?? room.kind;
    const dot = document.createElement('span');
    dot.className = `dot${room.online > 0 ? '' : ' off'}`;
    meta.append(kind, dot, document.createTextNode(
      `${room.online}/${room.capacity} 在线 · 常客 ${room.members}`,
    ));
    main.append(name, meta);

    const enter = document.createElement('button');
    enter.textContent = '进';
    enter.addEventListener('click', () => void doJoin(room.roomId));

    row.append(fav, main, enter);
    listEl.appendChild(row);
  }
}

async function refreshList(): Promise<void> {
  setStatus('加载中…');
  try {
    rooms = await window.qbot.rooms.list();
    setStatus(`${rooms.length} 个公共房间`);
  } catch (err) {
    setStatus(errText(err), true);
    rooms = [];
  }
  renderList();
}

// ── 房内视图 ────────────────────────────────────────────────

function showRoom(room: RoomSnapshot): void {
  // 换了房就先清屏：history 帧随后到达会填上这间房自己的记录
  if (currentRoom && currentRoom.roomId !== room.roomId) {
    chatLog = [];
    sentAt.length = 0; // 限流计数也是按房重来
  }
  currentRoom = room;
  listView.style.display = 'none';
  roomView.style.display = 'flex';
  roomTitle.textContent = `${room.name} (${room.members.filter((m) => m.online).length}/${room.capacity})`;
  settingsBtn.style.display = room.ownerId === myMemberId ? '' : 'none';
  renderMembers();
  renderChat();
  chatInput.focus();
}

function showList(): void {
  currentRoom = null;
  chatLog = [];
  renderChat(); // 清变量还不够，DOM 也得清——否则退房后残留上一间房的气泡
  roomView.style.display = 'none';
  listView.style.display = 'flex';
  void refreshList();
}

function renderMembers(): void {
  membersEl.replaceChildren();
  if (!currentRoom) return;
  const sorted = [...currentRoom.members].sort(
    (a, b) => Number(b.online) - Number(a.online) || a.joinedAt - b.joinedAt,
  );
  for (const m of sorted) {
    membersEl.appendChild(renderMember(m));
  }
  roomTitle.textContent =
    `${currentRoom.name} (${currentRoom.members.filter((x) => x.online).length}/${currentRoom.capacity})`;
}

function renderMember(m: RoomMember): HTMLElement {
  const el = document.createElement('div');
  el.className = `member${m.online ? '' : ' offline'}`;
  el.dataset.memberId = m.memberId;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = m.nickname.slice(0, 1) || '🐾';

  const box = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'member-name';
  name.textContent = m.memberId === myMemberId ? `${m.nickname}（你）` : m.nickname;
  const mode = document.createElement('div');
  mode.className = 'member-mode';
  mode.textContent = m.online ? (MODE_LABEL[m.mode ?? 'idle'] ?? '在线') : '不在';
  box.append(name, mode);

  el.append(avatar, box);
  if (m.memberId !== myMemberId && m.online) {
    el.title = '点一下打个招呼';
    el.addEventListener('click', () => {
      window.qbot.rooms.wave(m.memberId);
      sysLine(`你跟 ${m.nickname} 打了招呼 👋`);
    });
  }
  // 房主可踢人（右键）
  if (currentRoom?.ownerId === myMemberId && m.memberId !== myMemberId) {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!confirm(`把 ${m.nickname} 移出房间？之后 ta 无法再进入。`)) return;
      void window.qbot.rooms.kick(m.memberId).catch((err) => setStatus(errText(err), true));
    });
  }
  return el;
}

function renderChat(): void {
  chatEl.replaceChildren();
  for (const msg of chatLog) chatEl.appendChild(renderMsg(msg));
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderMsg(msg: RoomChatMsg): HTMLElement {
  const wrap = document.createElement('div');
  const mine = msg.memberId === myMemberId;
  wrap.className = `msg${mine ? ' mine' : ''}`;
  wrap.dataset.msgId = msg.id;

  const who = document.createElement('div');
  who.className = 'msg-who';
  who.textContent = mine ? fmtTime(msg.at) : `${msg.nickname} · ${fmtTime(msg.at)}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = msg.text; // textContent：不解析 markdown/HTML，别人的发言不该有渲染能力

  wrap.append(who, bubble);
  if (mine) {
    const del = document.createElement('div');
    del.className = 'msg-del';
    del.textContent = '撤回';
    del.addEventListener('click', () => window.qbot.rooms.deleteChat(msg.id));
    wrap.appendChild(del);
  }
  return wrap;
}

/** 系统提示行（进出房/打招呼这类，不进聊天记录，只在本地显示） */
function sysLine(text: string): void {
  const el = document.createElement('div');
  el.className = 'sys';
  el.textContent = text;
  chatEl.appendChild(el);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ── 交互：开房 / 进房 / 发言 ───────────────────────────────

async function doJoin(roomId: string): Promise<void> {
  // 首次入房明示（spec §5.3）：发言会离开本机，必须让用户知情后再进
  const settings = await window.qbot.settings.get();
  if (!settings.roomsChatConsent) {
    const agreed = await askConsent();
    if (!agreed) return;
    await window.qbot.settings.set({ roomsChatConsent: true });
  }
  setStatus('进入房间…');
  try {
    const room = await window.qbot.rooms.join(roomId);
    showRoom(room);
    setStatus('');
  } catch (err) {
    setStatus(errText(err), true);
  }
}

function askConsent(): Promise<boolean> {
  return new Promise((resolve) => {
    sheet.replaceChildren();
    const h = document.createElement('h2');
    h.textContent = '进公共房间前';
    const p = document.createElement('div');
    p.className = 'hint';
    p.textContent =
      '公共房间里，你的发言会发送到房间服务器，房内所有人都能看到，' +
      '并且会保留最近 50 条供后来的人查看。\n\n' +
      '桌宠状态（在思考/在敲代码等）也会同步给房友，但只是状态本身——' +
      '具体项目、文件名、AI 对话内容都不会离开你的电脑。';
    p.style.whiteSpace = 'pre-line';
    const row = document.createElement('div');
    row.className = 'row';
    const cancel = document.createElement('button');
    cancel.className = 'ghost';
    cancel.textContent = '再想想';
    cancel.addEventListener('click', () => { closeModal(); resolve(false); });
    const ok = document.createElement('button');
    ok.textContent = '知道了，进房';
    ok.addEventListener('click', () => { closeModal(); resolve(true); });
    row.append(cancel, ok);
    sheet.append(h, p, row);
    modal.classList.add('on');
  });
}

function openCreateSheet(): void {
  sheet.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = '开一个房间';

  const mk = (label: string, node: HTMLElement): HTMLElement => {
    const f = document.createElement('div');
    f.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    f.append(l, node);
    return f;
  };

  const nameIn = document.createElement('input');
  nameIn.placeholder = '房间名';
  nameIn.maxLength = 24;
  const kindSel = document.createElement('select');
  for (const [k, label] of Object.entries(KIND_LABEL)) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = label;
    kindSel.appendChild(o);
  }
  const capSel = document.createElement('select');
  for (let n = 4; n <= 12; n += 2) {
    const o = document.createElement('option');
    o.value = String(n);
    o.textContent = `${n} 人`;
    if (n === 8) o.selected = true;
    capSel.appendChild(o);
  }
  const listedSel = document.createElement('select');
  for (const [v, label] of [['1', '公开（出现在房间列表）'], ['0', '私密（只有拿到房号的人能进）']]) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    listedSel.appendChild(o);
  }

  const row = document.createElement('div');
  row.className = 'row';
  const cancel = document.createElement('button');
  cancel.className = 'ghost';
  cancel.textContent = '取消';
  cancel.addEventListener('click', closeModal);
  const ok = document.createElement('button');
  ok.textContent = '开房';
  ok.addEventListener('click', async () => {
    const name = nameIn.value.trim();
    if (!name) { nameIn.focus(); return; }
    ok.disabled = true;
    try {
      await window.qbot.rooms.create({
        name,
        kind: kindSel.value as RoomKind,
        capacity: Number(capSel.value),
        listed: listedSel.value === '1',
      });
      closeModal();
      // create 会自动进房，房内视图由 status 事件驱动
    } catch (err) {
      setStatus(errText(err), true);
      ok.disabled = false;
    }
  });
  row.append(cancel, ok);

  sheet.append(
    h,
    mk('房间名', nameIn),
    mk('类型', kindSel),
    mk('容量', capSel),
    mk('可见性', listedSel),
    row,
  );
  modal.classList.add('on');
  nameIn.focus();
}

function openSettingsSheet(): void {
  if (!currentRoom) return;
  sheet.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = '房间设置';

  const nameIn = document.createElement('input');
  nameIn.value = currentRoom.name;
  nameIn.maxLength = 24;
  const kindSel = document.createElement('select');
  for (const [k, label] of Object.entries(KIND_LABEL)) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = label;
    if (k === currentRoom.kind) o.selected = true;
    kindSel.appendChild(o);
  }
  const listedSel = document.createElement('select');
  for (const [v, label] of [['1', '公开'], ['0', '私密']]) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    if ((v === '1') === currentRoom.listed) o.selected = true;
    listedSel.appendChild(o);
  }

  const mk = (label: string, node: HTMLElement): HTMLElement => {
    const f = document.createElement('div');
    f.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    f.append(l, node);
    return f;
  };

  const idHint = document.createElement('div');
  idHint.className = 'hint';
  idHint.textContent = `房号 ${currentRoom.roomId}（私密房把房号发给朋友即可进入）`;

  const row = document.createElement('div');
  row.className = 'row';
  const cancel = document.createElement('button');
  cancel.className = 'ghost';
  cancel.textContent = '取消';
  cancel.addEventListener('click', closeModal);
  const ok = document.createElement('button');
  ok.textContent = '保存';
  ok.addEventListener('click', async () => {
    try {
      await window.qbot.rooms.update({
        name: nameIn.value.trim(),
        kind: kindSel.value as RoomKind,
        listed: listedSel.value === '1',
      });
      closeModal();
    } catch (err) {
      setStatus(errText(err), true);
    }
  });
  row.append(cancel, ok);

  sheet.append(h, mk('房间名', nameIn), mk('类型', kindSel), mk('可见性', listedSel), idHint, row);
  modal.classList.add('on');
}

function doSend(): void {
  const text = chatInput.value.trim();
  if (!text) return;
  // 本地预挡（与服务端同规则）：省一次往返，也让提示更快
  const now = Date.now();
  const recent = sentAt.filter((t) => now - t < 60_000);
  const last = sentAt[sentAt.length - 1];
  if (last && now - last < 3000) {
    setStatus(`慢一点，${Math.ceil((3000 - (now - last)) / 1000)} 秒后再说`, true);
    return;
  }
  if (recent.length >= 10) {
    setStatus('说得太快了，缓一分钟', true);
    return;
  }
  window.qbot.rooms.chat(text.slice(0, CHAT_MAX));
  sentAt.push(now);
  chatInput.value = '';
  setStatus('');
}

// ── 事件订阅 ────────────────────────────────────────────────

window.qbot.rooms.onStatus((s) => {
  myMemberId = s.memberId ?? myMemberId;
  if (s.phase === 'in-room' && s.room) {
    // create 自动进房 / 房间设置被改：都从这里回到房内视图
    showRoom(s.room);
  } else if (s.phase === 'online' && currentRoom) {
    showList();
  } else if (s.phase === 'off' && s.error) {
    setStatus(s.error, true);
    if (currentRoom) showList();
  }
});

// 进房历史：**整批替换**——换房时上一间房的记录必须消失（曾漏掉，见截图 bug）
window.qbot.rooms.onHistory((chat) => {
  chatLog = chat;
  renderChat();
});

window.qbot.rooms.onChat((msg) => {
  chatLog = [...chatLog, msg].slice(-50);
  // 贴底时才自动滚（用户翻历史时别把 ta 拽回来）
  const atBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 40;
  chatEl.appendChild(renderMsg(msg));
  if (atBottom) chatEl.scrollTop = chatEl.scrollHeight;
});

window.qbot.rooms.onChatDeleted((id) => {
  chatLog = chatLog.filter((c) => c.id !== id);
  chatEl.querySelector(`[data-msg-id="${id}"]`)?.remove();
});

window.qbot.rooms.onMemberIn((m) => {
  if (!currentRoom) return;
  const i = currentRoom.members.findIndex((x) => x.memberId === m.memberId);
  if (i >= 0) currentRoom.members[i] = m;
  else currentRoom.members.push(m);
  renderMembers();
  sysLine(`${m.nickname} 来了`);
});

window.qbot.rooms.onMemberOut((memberId) => {
  if (!currentRoom) return;
  const m = currentRoom.members.find((x) => x.memberId === memberId);
  if (m) { m.online = false; m.mode = undefined; }
  renderMembers();
  if (m) sysLine(`${m.nickname} 走了`);
});

window.qbot.rooms.onPresence((p) => {
  if (!currentRoom) return;
  const m = currentRoom.members.find((x) => x.memberId === p.memberId);
  if (!m) return;
  m.online = true;
  m.mode = p.mode;
  m.action = p.action;
  renderMembers();
});

window.qbot.rooms.onWave((w) => {
  sysLine(`${w.fromNickname} 跟你打招呼 👋`);
});

window.qbot.rooms.onKicked(() => {
  setStatus('你被移出了这个房间', true);
  showList();
});

window.qbot.rooms.onError((msg) => setStatus(msg, true));

// ── 控件接线 ────────────────────────────────────────────────

$('create-btn').addEventListener('click', openCreateSheet);
$('refresh-btn').addEventListener('click', () => void refreshList());
$('back-btn').addEventListener('click', () => { void window.qbot.rooms.leave(); showList(); });
$('leave-btn').addEventListener('click', () => { void window.qbot.rooms.leave(); showList(); });
settingsBtn.addEventListener('click', openSettingsSheet);
$('send-btn').addEventListener('click', doSend);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSend();
});
searchInput.addEventListener('input', renderList);

for (const tab of document.querySelectorAll<HTMLElement>('.tab')) {
  tab.addEventListener('click', () => {
    for (const t of document.querySelectorAll('.tab')) t.classList.remove('on');
    tab.classList.add('on');
    filterKind = (tab.dataset.kind || null) as RoomKind | null;
    renderList();
  });
}

nickInput.addEventListener('change', () => {
  const nickname = nickInput.value.trim().slice(0, 16);
  // 统一昵称：市场署名和房间身份是同一个名字（spec §6.4）
  void window.qbot.settings.set({ nickname, marketNickname: nickname });
  setStatus('昵称已保存（下次连接生效）');
});

// ── 启动 ────────────────────────────────────────────────────

void (async () => {
  const settings = await window.qbot.settings.get();
  nickInput.value = settings.nickname ?? settings.marketNickname ?? '';
  favorites = new Set(settings.roomsFavorites ?? []);

  // 自取快照：窗口 did-finish-load 可能早于上面的监听注册（同 pet/remote 窗的竞态）
  const cache = await window.qbot.rooms.getCache();
  myMemberId = cache.status.memberId ?? '';
  if (cache.status.phase === 'in-room' && cache.room) {
    chatLog = cache.chat;
    showRoom(cache.room);
  } else {
    await refreshList();
  }
})();
