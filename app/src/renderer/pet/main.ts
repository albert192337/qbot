/** pet 渲染进程入口：角色加载 + 状态机驱动 + 拖拽 + 自言自语 */
import type { ActionId } from '@qbot/pipeline';
import { Player } from './player';
import { randomDelay, step, type PetState } from './state-machine';
import { DEFAULT_VOICE_SETTINGS, Speaker, type VoiceSettings } from './voice/speak';

const stage = document.getElementById('stage')!;
const rng = { random: () => Math.random() };

let state: PetState = { kind: 'idle' };
let available: ActionId[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const player = new Player(stage, () => dispatch({ type: 'VIDEO_ENDED' }));

const speaker = new Speaker({
  bubble: document.getElementById('bubble')!,
  canSpeak: () => state.kind === 'idle',
  playAction: (action) => dispatch({ type: 'PLAY_ACTION', action }),
  hasAction: (action) => available.includes(action),
});

function voiceSettings(s: {
  voiceEnabled?: boolean;
  voiceVolume?: number;
  talkFrequency?: VoiceSettings['talkFrequency'];
}): VoiceSettings {
  return {
    voiceEnabled: s.voiceEnabled ?? DEFAULT_VOICE_SETTINGS.voiceEnabled,
    voiceVolume: s.voiceVolume ?? DEFAULT_VOICE_SETTINGS.voiceVolume,
    talkFrequency: s.talkFrequency ?? DEFAULT_VOICE_SETTINGS.talkFrequency,
  };
}

void window.qbot.settings.get().then((s) => speaker.setSettings(voiceSettings(s)));
window.qbot.settings.onChanged((s) => speaker.setSettings(voiceSettings(s)));

function scheduleTimer(): void {
  clearTimer();
  timer = setTimeout(() => dispatch({ type: 'TIMER_FIRE' }), randomDelay(rng));
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function dispatch(event: Parameters<typeof step>[1]): void {
  const result = step(state, event, { available, rng });
  state = result.state;
  if (result.play) player.play(result.play);
  if (result.clearTimer) clearTimer();
  if (result.rescheduleTimer) scheduleTimer();
}

// ── 角色加载 ─────────────────────────────────────────────
window.qbot.characters.onActivated((meta) => {
  if (!meta?.manifest) return;
  available = player.load(meta.dirId, meta.manifest);
  state = { kind: 'idle' };
  player.play('idle');
  scheduleTimer();
  speaker.setCharacter(meta.manifest.id, meta.manifest.voice);
});

// 窗口隐藏期间（角色进小房间）Chromium 会自动暂停 <video> 且不派发 ended，
// 状态机会卡死在半路 → 恢复可见时整体重置回 idle 循环。
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || available.length === 0) return;
  speaker.interrupt();
  state = { kind: 'idle' };
  player.play('idle');
  scheduleTimer();
});

// ── 指针交互 ─────────────────────────────────────────────
// 移动 >4px 才算拖拽（否则 pointerdown 会闪一下 drag 动画）；
// 未拖拽的 pointerup = 点击 → 250ms 内第二击算双击（双击 = 立即说一句）。
// 单击 = 角色走进小房间（talk_happy 保留在右键菜单和房间内点角色）。
const DRAG_THRESHOLD = 4;
const DBLCLICK_MS = 250;

let pointerDown = false;
let dragStarted = false;
let downClientX = 0;
let downClientY = 0;
let offsetX = 0;
let offsetY = 0;
let rafPending = false;
let lastScreenX = 0;
let lastScreenY = 0;
let clickTimer: ReturnType<typeof setTimeout> | null = null;

stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return; // 右键走 contextmenu
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
    speaker.interrupt(); // 拖拽瞬间：气泡消失、语音停止
    dispatch({ type: 'POINTER_DOWN' });
  }
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
    dispatch({ type: 'POINTER_UP' });
    return;
  }
  // 点击：等 250ms 判断是否双击
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
    speaker.forceSpeak();
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = null;
      window.qbot.room.open();
    }, DBLCLICK_MS);
  }
});

// ── 右键菜单：指定播放任意动作 ───────────────────────────
const ACTION_LABELS: Partial<Record<ActionId, string>> = {
  sleep: '睡觉',
  tea: '喝茶',
  talk_happy: '聊天·开心',
  talk_annoyed: '聊天·嫌弃',
};
const menu = document.getElementById('menu')!;

function hideMenu(): void {
  menu.style.display = 'none';
}

stage.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  menu.replaceChildren();
  // 固定项：立即说一句（实验/演示语音冒泡）
  const speakItem = document.createElement('div');
  speakItem.className = 'menu-item';
  speakItem.textContent = '说句话';
  speakItem.addEventListener('click', () => {
    hideMenu();
    speaker.forceSpeak();
  });
  menu.appendChild(speakItem);
  for (const id of available) {
    const label = ACTION_LABELS[id];
    if (!label) continue; // idle/drag 不进菜单
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.textContent = label;
    item.addEventListener('click', () => {
      hideMenu();
      dispatch({ type: 'PLAY_ACTION', action: id });
    });
    menu.appendChild(item);
  }
  if (!menu.children.length) return;
  menu.style.display = 'block';
  // 贴着指针弹出，越界收回窗口内
  const mw = 120;
  menu.style.left = `${Math.min(e.clientX, window.innerWidth - mw - 4)}px`;
  menu.style.top = `${Math.min(e.clientY, window.innerHeight - menu.children.length * 34 - 8)}px`;
});

document.addEventListener('click', (e) => {
  if (!menu.contains(e.target as Node)) hideMenu();
});
