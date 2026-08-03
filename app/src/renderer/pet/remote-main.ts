/**
 * 联机远端宠入口（?remote=1，spec §二.3）：本地 AI 全关——
 * 无状态机 / speaker / 串门 / agent / music 订阅 / 调试面板，
 * 只有 Player + NetworkDriver 收帧驱动 + 拖拽摆放 + 精简右键菜单。
 *
 * L0：资产分发未做（L1），用本机激活角色当替身渲染对端状态。
 */
import { NetworkDriver } from './network-driver';
import { Player } from './player';
import { Signboard } from './signboard';

const stage = document.getElementById('stage')!;
const menu = document.getElementById('menu')!;
const signboard = new Signboard('stage');

const player = new Player(stage, () => driver.onVideoEnded());
const driver = new NetworkDriver({
  play: (action, loop) => (loop ? player.playLooping(action) : player.play(action)),
});

/** 举牌单一来源：掉线 > 曲名 > 报到横幅（5s 自清） */
let helloTimer: ReturnType<typeof setTimeout> | null = null;
let peerName = '好友';
let peerSong: string | null = null;
let peerGone = false;

function refreshSignboard(): void {
  if (peerGone) {
    signboard.setText(`${peerName} 掉线了…`);
    signboard.show();
    return;
  }
  if (peerSong) {
    signboard.setText(`♪ ${peerSong}`);
    signboard.show();
    return;
  }
  signboard.hide();
}

// ── 替身角色加载 ────────────────────────────────────────────
async function loadStandin(): Promise<void> {
  const meta = await window.qbot.characters.getActive();
  if (!meta?.manifest) return; // 本机还没角色：窗口留空（L1 蛋壳占位一并解决）
  const available = player.load(meta.dirId, meta.manifest);
  driver.setCharacter(available, meta.manifest.agentActions);
}
void loadStandin();

// ── 联机帧订阅 ──────────────────────────────────────────────
window.qbot.link.onPeerHello(({ charName }) => {
  peerName = charName;
  peerGone = false;
  // 报到横幅：5s 后让位（掉线/曲名优先级更高时不展示）
  if (!peerSong) {
    signboard.setText(`${charName} 上线啦`);
    signboard.show();
    if (helloTimer) clearTimeout(helloTimer);
    helloTimer = setTimeout(() => {
      helloTimer = null;
      refreshSignboard();
    }, 5_000);
  }
});

window.qbot.link.onPeerState((s) => {
  peerGone = false;
  peerSong = s.mode === 'music' && s.song ? s.song : null;
  if (!helloTimer) refreshSignboard();
  driver.applyState(s);
});

window.qbot.link.onPeerLeft(() => {
  peerGone = true;
  if (helloTimer) { clearTimeout(helloTimer); helloTimer = null; }
  refreshSignboard();
  driver.peerLeft();
});

// ── 拖拽摆放（自 local-main 精简：无双击/单击语义） ─────────
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
  offsetX = e.clientX;
  offsetY = e.clientY;
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
  // 拖拽移动用 screenX/Y（clientX 会正反馈抖动，见血泪坑 7）
  lastScreenX = e.screenX;
  lastScreenY = e.screenY;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (dragStarted) {
        window.qbot.pet.move(lastScreenX - offsetX, lastScreenY - offsetY);
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

// ── 右键菜单：只有断开联机 ──────────────────────────────────
function hideMenu(): void {
  menu.style.display = 'none';
}

stage.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  menu.replaceChildren();
  const stopItem = document.createElement('div');
  stopItem.className = 'menu-item';
  stopItem.textContent = '断开联机';
  stopItem.addEventListener('click', () => {
    hideMenu();
    window.qbot.link.stop(); // 主进程会随之关掉本窗
  });
  menu.appendChild(stopItem);
  menu.style.display = 'block';
  const mw = 120;
  menu.style.left = `${Math.min(e.clientX, window.innerWidth - mw - 4)}px`;
  menu.style.top = `${Math.min(e.clientY, window.innerHeight - 42)}px`;
});

document.addEventListener('click', (e) => {
  if (!menu.contains(e.target as Node)) hideMenu();
});
