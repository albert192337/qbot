/**
 * 联机远端宠入口（?remote=1，spec §二.3）：本地 AI 全关——
 * 无状态机 / speaker / 串门 / agent / music 订阅 / 调试面板，
 * 只有 Player + NetworkDriver 收帧驱动 + 拖拽摆放 + 精简右键菜单。
 *
 * L1：资产分发已接——主进程收齐对端角色包（或缓存命中）推 link:peerCharacter，
 * 本窗渲染对端真身；传输期举牌进度占位。
 */
import type { LinkPeerCharacter, LinkPeerState } from '../../shared/ipc-types';
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

/** 举牌单一来源：掉线 > 对端手动举牌 > 传输进度 > 曲名 > 报到横幅（5s 自清） */
let helloTimer: ReturnType<typeof setTimeout> | null = null;
let peerName = '好友';
let peerSong: string | null = null;
let peerGone = false;
/** 角色包接收进度文案（就位后清空） */
let transferText: string | null = null;
/** 对端手动举的牌（收牌前一直举着） */
let peerSign: string | null = null;

function refreshSignboard(): void {
  if (peerGone) {
    signboard.setText(`${peerName} 掉线了…`);
    signboard.show();
    return;
  }
  if (peerSign) {
    signboard.setText(peerSign);
    signboard.show();
    return;
  }
  if (transferText) {
    signboard.setText(transferText);
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

// ── 对端真身角色（L1 资产分发）─────────────────────────────
// 缓存命中/传输完成后主进程推 peerCharacter；在此之前窗口留空 + 举牌进度占位。
// （L0 的「本机角色当替身」已废：两只长一样太迷惑）
function applyPeerCharacter(meta: LinkPeerCharacter): void {
  if (!meta?.manifest) return;
  transferText = null;
  const available = player.load(meta.dirId, meta.manifest);
  driver.setCharacter(available, meta.manifest.agentActions);
  refreshSignboard();
}

window.qbot.link.onPeerCharacter(applyPeerCharacter);

window.qbot.link.onAssetProgress(({ received, total }) => {
  transferText =
    total > 0 ? `${peerName} 走来中… ${Math.floor((received / total) * 100)}%` : `${peerName} 走来中…`;
  refreshSignboard();
});

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

function applyPeerState(s: LinkPeerState): void {
  peerGone = false;
  peerSong = s.mode === 'music' && s.song ? s.song : null;
  if (!helloTimer) refreshSignboard();
  driver.applyState(s);
}

window.qbot.link.onPeerState(applyPeerState);

window.qbot.link.onPeerLeft(() => {
  peerGone = true;
  if (helloTimer) { clearTimeout(helloTimer); helloTimer = null; }
  refreshSignboard();
  driver.peerLeft();
});

window.qbot.link.onPeerSign((text) => {
  peerSign = text;
  refreshSignboard();
});

// 兜底自取：pet/main.ts 动态 import 本模块，不阻塞页面 load → 主进程在
// did-finish-load 的 replay 可能早于上面监听注册而丢失（缓存命中时必丢）
void window.qbot.link.getPeerCache().then(({ hello, character, state, sign }) => {
  if (hello) peerName = hello.charName; // 只取名字，不重放报到横幅
  if (character) applyPeerCharacter(character);
  if (sign) {
    peerSign = sign;
    refreshSignboard();
  }
  if (state) applyPeerState(state);
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
