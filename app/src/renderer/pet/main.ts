/** pet 渲染进程入口：角色加载 + 状态机驱动 + 拖拽 */
import type { ActionId } from '@qbot/pipeline';
import { Player } from './player';
import { randomDelay, step, type PetState } from './state-machine';

const stage = document.getElementById('stage')!;
const rng = { random: () => Math.random() };

let state: PetState = { kind: 'idle' };
let available: ActionId[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const player = new Player(stage, () => dispatch({ type: 'VIDEO_ENDED' }));

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
});

// ── 拖拽：screenX/Y（窗口自己在动，clientX 是移动参考系会正反馈抖动）──
let dragging = false;
let offsetX = 0;
let offsetY = 0;
let rafPending = false;
let lastScreenX = 0;
let lastScreenY = 0;

stage.addEventListener('pointerdown', (e) => {
  dragging = true;
  offsetX = e.clientX;
  offsetY = e.clientY;
  stage.setPointerCapture(e.pointerId);
  dispatch({ type: 'POINTER_DOWN' });
});

stage.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  lastScreenX = e.screenX;
  lastScreenY = e.screenY;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (dragging) {
        window.qbot.pet.move(lastScreenX - offsetX, lastScreenY - offsetY);
      }
    });
  }
});

stage.addEventListener('pointerup', (e) => {
  dragging = false;
  stage.releasePointerCapture(e.pointerId);
  dispatch({ type: 'POINTER_UP' });
});
