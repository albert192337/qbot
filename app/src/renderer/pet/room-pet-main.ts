/**
 * 公共房间宠上屏入口（?roomPet=1，spec 2026-08-24）：一个窗只服务一个房友，
 * 主进程按窗定向推送（帧里不带 memberId）。复用本地宠 Player + 联机
 * NetworkDriver + Signboard，去掉 1v1 remote-main 里跟对端语义相关的部分。
 *
 * 名牌常驻显示昵称；同步牌面会替代昵称，聊天广播临时顶掉牌面 8s 后回落。
 */
import { NetworkDriver } from './network-driver';
import { Player } from './player';
import { resolveRoomPetSign } from './room-pet-sign';
import { Signboard } from './signboard';

const stage = document.getElementById('stage')!;
const menu = document.getElementById('menu')!;
const signboard = new Signboard('stage');

const player = new Player(stage, () => driver.onVideoEnded());
const driver = new NetworkDriver({
  play: (action, loop) => (loop ? player.playLooping(action) : player.play(action)),
});

/** 牌子优先级：离线 > 传输进度 > 聊天气泡（8s）> 同步牌面 > 常驻昵称牌 */
let nickname = '房友';
let transferText: string | null = null;
let chatClearTimer: ReturnType<typeof setTimeout> | null = null;
let chatText: string | null = null;
let presenceSign: string | null = null;
let gone = false;
const CHAT_BUBBLE_MS = 8_000;
/** 聊天正文超长截断（全文在 lounge 窗；宠头顶的牌子就那么宽） */
const CHAT_BUBBLE_MAX = 60;

function refreshSignboard(): void {
  signboard.setText(resolveRoomPetSign({ nickname, gone, transferText, chatText, presenceSign }));
  signboard.show();
}

window.qbot.roomPet.onHello(({ nickname: n }) => {
  nickname = n;
  refreshSignboard();
});

window.qbot.roomPet.onCharacter((meta) => {
  if (!meta?.manifest) return;
  transferText = null;
  const available = player.load(meta.dirId, meta.manifest);
  driver.setCharacter(available, meta.manifest.agentActions);
  refreshSignboard();
});

window.qbot.roomPet.onProgress(({ received, total }) => {
  transferText = total > 0 ? `${nickname} 走来中… ${Math.floor((received / total) * 100)}%` : `${nickname} 走来中…`;
  refreshSignboard();
});

window.qbot.roomPet.onState((s) => {
  gone = false;
  presenceSign = s.sign?.trim() || null;
  driver.applyState({ mode: s.mode ?? 'idle', action: s.action });
  refreshSignboard();
});

window.qbot.roomPet.onChat(({ text }) => {
  chatText = text.length > CHAT_BUBBLE_MAX ? `${text.slice(0, CHAT_BUBBLE_MAX)}…` : text;
  refreshSignboard();
  if (chatClearTimer) clearTimeout(chatClearTimer);
  chatClearTimer = setTimeout(() => {
    chatClearTimer = null;
    chatText = null;
    refreshSignboard();
  }, CHAT_BUBBLE_MS);
});

window.qbot.roomPet.onPackFailed(() => {
  transferText = `${nickname} 的形象没能传过来`;
  refreshSignboard();
});

window.qbot.roomPet.onLeft(() => {
  gone = true;
  if (chatClearTimer) { clearTimeout(chatClearTimer); chatClearTimer = null; }
  chatText = null;
  refreshSignboard();
  driver.peerLeft();
});

// 兜底自取：did-finish-load 可能早于上面监听注册（同 1v1 remote-main 的竞态兜底）
void window.qbot.roomPet.getCache().then((snap) => {
  if (!snap) return;
  if (snap.hello) nickname = snap.hello.nickname;
  if (snap.character) {
    const available = player.load(snap.character.dirId, snap.character.manifest);
    driver.setCharacter(available, snap.character.manifest.agentActions);
  }
  if (snap.state) {
    presenceSign = snap.state.sign?.trim() || null;
    driver.applyState({ mode: snap.state.mode ?? 'idle', action: snap.state.action });
  }
  refreshSignboard();
});

// ── 拖拽摆放（同 remote-main：screenX/Y 避免抖动，见血泪坑 7） ───
const DRAG_THRESHOLD = 4;
let pointerDown = false;
let dragStarted = false;
let downClientX = 0;
let downClientY = 0;
let offsetX = 0;
let offsetY = 0;
let rafPending = false;
let lastScreenX = 0;
let lastScreenY = 0;

stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  pointerDown = true;
  dragStarted = false;
  downClientX = e.clientX;
  downClientY = e.clientY;
  // 记录窗口的初始位置
  offsetX = e.screenX - window.screenX;
  offsetY = e.screenY - window.screenY;
  stage.setPointerCapture(e.pointerId);
  hideMenu();
});

stage.addEventListener('pointermove', (e) => {
  if (!pointerDown) return;
  if (!dragStarted) {
    const dx = e.clientX - downClientX;
    const dy = e.clientY - downClientY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
    dragStarted = true;
    signboard.onDragStart();
    driver.dragStart();
  }
  lastScreenX = e.screenX;
  lastScreenY = e.screenY;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (dragStarted) {
        // 移动当前远程角色窗口
        window.moveTo(
          Math.round(lastScreenX - offsetX),
          Math.round(lastScreenY - offsetY)
        );
      }
    });
  }
});

stage.addEventListener('pointerup', (e) => {
  if (e.button !== 0 || !pointerDown) return;
  pointerDown = false;
  stage.releasePointerCapture(e.pointerId);
  if (dragStarted) {
    dragStarted = false;
    driver.dragEnd();
    signboard.onDragEnd();
  }
});

// ── 右键菜单：打招呼 / 退出房间 ──────────────────────────────
function hideMenu(): void {
  menu.style.display = 'none';
}

function addMenuItem(label: string, onClick: () => void): void {
  const item = document.createElement('div');
  item.className = 'menu-item';
  item.textContent = label;
  item.addEventListener('click', () => {
    hideMenu();
    onClick();
  });
  menu.appendChild(item);
}

stage.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  menu.replaceChildren();
  addMenuItem('打招呼', () => window.qbot.roomPet.wave());
  addMenuItem('退出房间', () => window.qbot.roomPet.leaveRoom());
  menu.style.display = 'block';
  const mw = 120;
  menu.style.left = `${Math.min(e.clientX, window.innerWidth - mw - 4)}px`;
  menu.style.top = `${Math.min(e.clientY, window.innerHeight - 74)}px`;
});

document.addEventListener('click', (e) => {
  if (!menu.contains(e.target as Node)) hideMenu();
});
