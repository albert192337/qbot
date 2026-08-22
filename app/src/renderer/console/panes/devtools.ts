/**
 * 开发者工具 pane：游戏化数值的注水按钮 + 当前积累状态。
 * 自桌宠调试面板迁入（阶段 6）——那四个 debugGrant* IPC 此前只有面板一个调用点，
 * 面板删掉后这里是唯一入口。
 *
 * 事件日志与桌宠实时状态**没有迁**：它们活在桌宠渲染进程的模块作用域里，
 * 迁移需要新建 pet↔main↔console 双向 relay，成本最高、价值最低（已与用户确认丢弃）。
 */
import type { Progress } from '../../../shared/ipc-types';
import { toast } from './_studio-shared';

let root: HTMLElement | null = null;
let unsubProgress: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  host.innerHTML = `
<div class="studio-body">
  <h2>开发者工具</h2>
  <p class="studio-hint">纯调试用。正常玩法里点数靠敲键盘（1 点/次）和 Claude Code 跑完一轮（10 点）攒，
  箱子靠挂机（15 分钟 1 个），调试时等不起。</p>

  <div class="conn-card">
    <h3>当前积累</h3>
    <div id="dev-progress" class="dev-stats">读取中…</div>
  </div>

  <div class="conn-card">
    <h3>注水</h3>
    <div class="btn-row">
      <button class="btn ghost" data-dev="idle">挂机 +15 分钟</button>
      <button class="btn ghost" data-dev="box">箱子 +1</button>
      <button class="btn ghost" data-dev="points">点数 +500</button>
      <button class="btn ghost" data-dev="furniture">家具 +1</button>
    </div>
    <p class="studio-hint">开箱与合成在小房间的「我的家具」里（开完箱紧接着就要摆，动线不拆开）。</p>
  </div>
</div>`;

  const p = await window.qbot.progress.get();
  renderProgress(p);
  unsubProgress?.();
  unsubProgress = window.qbot.progress.onChanged(renderProgress);

  host.querySelectorAll<HTMLButtonElement>('[data-dev]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void (async () => {
        btn.disabled = true;
        try {
          switch (btn.dataset.dev) {
            case 'idle': {
              const r = await window.qbot.progress.debugAddIdleMs(15 * 60 * 1000);
              renderProgress(r);
              toast(host, `挂机 +15 分钟 → 箱子 ${r.boxes}`);
              break;
            }
            case 'box': {
              const r = await window.qbot.progress.debugGrantBoxes(1);
              renderProgress(r);
              toast(host, `箱子 +1 → ${r.boxes}`);
              break;
            }
            case 'points': {
              const r = await window.qbot.progress.debugGrantPoints(500);
              renderProgress(r);
              toast(host, `点数 +500 → ${r.points}`);
              break;
            }
            case 'furniture': {
              const { stickerId, progress } = await window.qbot.progress.debugGrantFurniture();
              renderProgress(progress);
              toast(host, `家具 +1：${stickerId}`);
              break;
            }
          }
        } finally {
          btn.disabled = false;
        }
      })();
    });
  });
}

export function unmount(): void {
  unsubProgress?.();
  unsubProgress = null;
  root = null;
}

function renderProgress(p: Progress): void {
  const el = root?.querySelector<HTMLElement>('#dev-progress');
  if (!el) return;
  const owned = Object.values(p.inventory).reduce((a, b) => a + b, 0);
  const kinds = Object.keys(p.inventory).length;
  const mins = Math.floor(p.idleMs / 60_000);
  const secs = Math.floor((p.idleMs % 60_000) / 1000);
  el.innerHTML =
    `<div>点数 <b>${p.points}</b> · 箱子 <b>${p.boxes}</b> · 挂机 ${mins}分${String(secs).padStart(2, '0')}秒 / 15分</div>` +
    `<div>家具 ${owned} 件 / ${kinds} 种 · 开箱 ${p.boxesOpened} 次 · 合成 ${p.crafted} 次</div>` +
    `<div>键盘 ${p.keysCounted} 下 · Claude Code 跑完 ${p.runsCounted} 轮</div>`;
}
