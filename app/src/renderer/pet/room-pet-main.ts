import { mountPetting } from './petting';
import { choosePairAction } from '../../shared/pair-interaction';
import { createNameplate } from './nameplate';
import { mountPeerControls } from './peer-controls';
import { mountDesktopVisibility, isDesktopQuiet } from './desktop-visibility';
import './room-pet-speech.css';
/**
 * 公共房间宠上屏入口（?roomPet=1，spec 2026-08-24）：一个窗只服务一个房友，
 * 主进程按窗定向推送（帧里不带 memberId）。复用本地宠 Player + 联机
 * NetworkDriver + Signboard，去掉 1v1 remote-main 里跟对端语义相关的部分。
 *
 * 名牌常驻显示昵称；聊天与临时牌面独立，8s 后回落，不替代名字。
 */
import { NetworkDriver } from './network-driver';
import { Player } from './player';
import { resolveRoomPetSign } from './room-pet-sign';
import { Signboard } from './signboard';

const stage = document.getElementById('stage')!;
const menu = document.getElementById('menu')!;
const signboard = new Signboard('stage',()=>{});
const setNameplate = createNameplate(stage);
document.body.classList.add('room-pet');
const speech = document.createElement('div');
speech.className = 'room-pet-speech';
speech.setAttribute('role', 'status');
speech.hidden = true;
const speechText = document.createElement('div');
speechText.className = 'room-pet-speech-text';
speech.append(speechText);
document.body.append(speech);

const player = new Player(stage, () => driver.onVideoEnded());
const driver = new NetworkDriver({
  play: (action, loop) => {if(!isDesktopQuiet())loop ? player.playLooping(action) : player.play(action);},
});

/** 房友提示互斥：离线 > 传输进度 > 独立说话气泡（8s）> 同步牌面。 */
let petManifest: import('@qbot/pipeline').Manifest | null = null;
let nickname = '房友',gardenOwner:string|undefined;
const controls=mountPeerControls(stage,()=>gardenOwner);
let latestState: import('../../shared/ipc-types').LinkPeerState = {mode:'idle'};
let transferText: string | null = null;
let chatClearTimer: ReturnType<typeof setTimeout> | null = null;
let chatText: string | null = null;
let presenceSign: string | null = null;
let gone = false;
const CHAT_BUBBLE_MS = 8_000;
/** 聊天正文超长截断（全文仍保留在聊天窗口） */
const CHAT_BUBBLE_MAX = 60;

function refreshSignboard(): void {
  setNameplate(nickname, gone ? '暂时离开' : '');
  const text = resolveRoomPetSign({ nickname, gone, transferText, chatText, presenceSign });
  speech.hidden = gone || !!transferText || !chatText;
  document.body.classList.toggle('peer-speaking', !speech.hidden);
  speechText.textContent = chatText ?? '';
  if(text) { signboard.setText(text); signboard.show(); } else signboard.hide();
  const hint=!isDesktopQuiet()?(speech.hidden?text:chatText):null;window.qbot.overlays.hint(hint?{kind:'speech',text:hint}:null);
}

window.qbot.roomPet.onHello(({ nickname: n,memberId }) => {
  gardenOwner=memberId;
  void window.qbot.desktop.get().then(s=>{controls.update(s);applyVisibility(s);});
  nickname = n;
  refreshSignboard();
});

window.qbot.roomPet.onCharacter((meta) => {
  if (!meta?.manifest) return;
  petManifest = meta.manifest;
  transferText = null;
  const available = player.load(meta.dirId, meta.manifest);
  driver.setCharacter(available, meta.manifest.agentActions);
  if(!isDesktopQuiet())driver.applyState(latestState);
  refreshSignboard();
});

window.qbot.roomPet.onProgress(({ received, total }) => {
  transferText = total > 0 ? `${nickname} 走来中… ${Math.floor((received / total) * 100)}%` : `${nickname} 走来中…`;
  refreshSignboard();
});

window.qbot.roomPet.onState((s) => {
  gone = false;
  presenceSign = s.sign?.trim() || null;
  latestState = { mode: s.mode ?? 'idle', action: s.action };
  if(!isDesktopQuiet()&&!document.hidden)driver.applyState(latestState);
  refreshSignboard();
});

window.qbot.roomPet.onChat(({ text }) => {
  if(isDesktopQuiet() || document.hidden)return;
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
  if (snap.hello) {nickname = snap.hello.nickname;gardenOwner=snap.hello.memberId;void window.qbot.desktop.get().then(s=>{controls.update(s);applyVisibility(s);});}
  if (snap.character) {
    petManifest=snap.character.manifest;
    const available = player.load(snap.character.dirId, snap.character.manifest);
    driver.setCharacter(available, snap.character.manifest.agentActions);
  }
  if (snap.state) {
    presenceSign = snap.state.sign?.trim() || null;
    latestState = { mode: snap.state.mode ?? 'idle', action: snap.state.action };
    if(!isDesktopQuiet()&&!document.hidden)driver.applyState(latestState);
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
    controls.close();window.qbot.desktop.unpeek();document.body.dataset.peek='';
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
        window.qbot.roomPet.move(
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
    window.qbot.roomPet.move(Math.round(e.screenX-offsetX),Math.round(e.screenY-offsetY));
    void window.qbot.desktop.drop();
  }else if(document.body.dataset.peek)window.qbot.desktop.unpeek();else controls.show();
});

// Native menus can extend beyond the small transparent visitor window.
function hideMenu(): void { menu.style.display = 'none'; }
stage.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.qbot.roomPet.popupMenu();
});
function applyVisibility(s:import('../../shared/desktop-visibility').DesktopVisibility){
  document.body.classList.toggle('member-hidden',s.hiddenMembers.includes(gardenOwner??''));
  window.qbot.overlays.hint(null);
  player.setSuspended(s.hidden||s.hiddenMembers.includes(gardenOwner??''));
  chatText=null;speech.hidden=true;signboard.hide();controls.close();
  if(s.hidden||s.hiddenMembers.includes(gardenOwner??''))document.querySelectorAll('video').forEach(v=>v.pause());
  else if(s.peek)player.playLooping('idle');
  else {driver.dragEnd();driver.applyState(latestState);refreshSignboard();}
}
mountDesktopVisibility(applyVisibility);

mountPetting(stage,()=>!!petManifest&&!gone&&!transferText&&!pointerDown&&latestState.mode==='idle',()=>{
  const action=petManifest&&choosePairAction(petManifest,'happy');
  if(action)player.playLooping(action.id);
  return ()=>{if(!isDesktopQuiet()&&!document.hidden&&!gone&&!pointerDown)driver.dragEnd();};
});
