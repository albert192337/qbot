/**
 * 背包 / 合成面板（room 窗，右键菜单「我的家具」进入）。
 *
 * 放在 room 窗而不是 studio 窗：studio 是按 dirId 键控的、没有激活角色直接白屏，
 * 而库存是全局的（换角色不清收集品）；而且开箱得到的家具紧接着就要在这个窗里摆。
 *
 * 主进程 `main/progress.ts` 是唯一权威，这里只读 + 发起变更请求：
 * 开箱/合成的一次性结果走 invoke 返回值（要报「开出了什么」），
 * 幂等的数值状态走 progress:changed 广播（节流后最快每秒一条）。
 */
import type { Progress } from '../../shared/ipc-types';
import {
  CRAFT_COST,
  IDLE_MS_PER_BOX,
  POINTS_PER_BOX,
  TIER_COLOR,
  TIER_LABEL,
  TIER_ORDER,
  idsOfTier,
  nextTier,
  type FurnitureTier,
} from '../../shared/furniture';
import { DECOR_BY_ID } from './decor-pack';

/** 结果提示停留时长 */
const TOAST_MS = 4_000;

export class InventoryPanel {
  private root: HTMLElement;
  private headEl: HTMLElement;
  private toastEl: HTMLElement;
  private openBtn: HTMLButtonElement;
  private tiersEl: HTMLElement;
  private progress: Progress | null = null;
  private open = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  /** 忙标志：开箱/合成在飞时禁用按钮，防连点把点数扣两次 */
  private busy = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'invPanel';

    const title = document.createElement('div');
    title.className = 'inv-title';
    title.textContent = '我的家具';
    const closeBtn = document.createElement('div');
    closeBtn.className = 'inv-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.hide());
    title.appendChild(closeBtn);
    this.root.appendChild(title);

    this.headEl = document.createElement('div');
    this.headEl.className = 'inv-head';
    this.root.appendChild(this.headEl);

    this.openBtn = document.createElement('button');
    this.openBtn.className = 'inv-open-btn';
    this.openBtn.addEventListener('click', () => void this.doOpenBox());
    this.root.appendChild(this.openBtn);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'inv-toast';
    this.root.appendChild(this.toastEl);

    this.tiersEl = document.createElement('div');
    this.tiersEl.className = 'inv-tiers';
    this.root.appendChild(this.tiersEl);

    // 面板挂 body（不挂 #stage）：stage 上有「按住空白拖窗」的监听，挂进去点按钮会移窗
    document.body.appendChild(this.root);
  }

  /** room 主逻辑要据此把鼠标穿透关掉（面板在房间轮廓外，不然点不到） */
  isOpen(): boolean {
    return this.open;
  }

  show(): void {
    this.open = true;
    this.root.style.display = 'flex';
    void window.qbot.progress.get().then((p) => this.setProgress(p));
  }

  hide(): void {
    this.open = false;
    this.root.style.display = 'none';
  }

  setProgress(p: Progress): void {
    this.progress = p;
    if (this.open) this.render();
  }

  private render(): void {
    const p = this.progress;
    if (!p) return;

    const mins = Math.floor(p.idleMs / 60_000);
    const secs = Math.floor((p.idleMs % 60_000) / 1000);
    const pct = Math.min(100, Math.round((p.idleMs / IDLE_MS_PER_BOX) * 100));
    this.headEl.innerHTML =
      `<div class="inv-stats"><span>🎁 箱子 <b>${p.boxes}</b></span>` +
      `<span>✨ 点数 <b>${p.points}</b></span></div>` +
      `<div class="inv-idle">下一个箱子 ${mins}:${String(secs).padStart(2, '0')} / 15:00` +
      `<span class="inv-bar"><i style="width:${pct}%"></i></span></div>` +
      `<div class="inv-hint">敲键盘 +1 点 · Claude Code 跑完一轮 +10 点 · 挂机 15 分钟 +1 箱</div>`;

    const enough = p.boxes >= 1 && p.points >= POINTS_PER_BOX;
    this.openBtn.disabled = this.busy || !enough;
    this.openBtn.textContent = enough
      ? `开箱（消耗 1 箱 + ${POINTS_PER_BOX} 点）`
      : p.boxes < 1
        ? '没有箱子，再挂机一会儿'
        : `点数不够（${p.points}/${POINTS_PER_BOX}）`;

    this.renderTiers(p);
  }

  private renderTiers(p: Progress): void {
    this.tiersEl.replaceChildren();
    for (const tier of TIER_ORDER) {
      const ids = idsOfTier(tier);
      const own = ids.reduce((n, id) => n + (p.inventory[id] ?? 0), 0);

      const box = document.createElement('div');
      box.className = 'inv-tier';
      box.style.setProperty('--tier', TIER_COLOR[tier]);

      const head = document.createElement('div');
      head.className = 'inv-tier-head';
      head.innerHTML = `<span class="inv-tier-name">${TIER_LABEL[tier]}</span>` +
        `<span class="inv-tier-count">共 ${own} 件</span>`;

      const up = nextTier(tier);
      if (up) {
        const btn = document.createElement('button');
        btn.className = 'inv-craft-btn';
        const can = own >= CRAFT_COST;
        btn.disabled = this.busy || !can;
        btn.textContent = can
          ? `${CRAFT_COST} 件 → 1 件${TIER_LABEL[up]}`
          : `合成需 ${CRAFT_COST} 件（${own}/${CRAFT_COST}）`;
        btn.addEventListener('click', () => void this.doCraft(tier));
        head.appendChild(btn);
      } else {
        const t = document.createElement('span');
        t.className = 'inv-tier-top';
        t.textContent = '最高品质';
        head.appendChild(t);
      }
      box.appendChild(head);

      const list = document.createElement('div');
      list.className = 'inv-items';
      const owned = ids.filter((id) => (p.inventory[id] ?? 0) > 0);
      if (owned.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'inv-empty';
        empty.textContent = '还没有';
        list.appendChild(empty);
      }
      for (const id of owned) {
        const sticker = DECOR_BY_ID.get(id);
        const cell = document.createElement('div');
        cell.className = 'inv-item';
        cell.title = sticker?.name ?? id;
        if (sticker) {
          const img = document.createElement('img');
          img.src = sticker.image;
          img.draggable = false;
          cell.appendChild(img);
        }
        const n = document.createElement('span');
        n.textContent = `×${p.inventory[id]}`;
        cell.appendChild(n);
        list.appendChild(cell);
      }
      box.appendChild(list);
      this.tiersEl.appendChild(box);
    }
  }

  private async doOpenBox(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render(); // 立刻禁用按钮
    try {
      const r = await window.qbot.progress.openBox();
      if (!r.ok) {
        this.toast(r.error, false);
        return;
      }
      const name = DECOR_BY_ID.get(r.stickerId)?.name ?? r.stickerId;
      this.progress = r.progress;
      this.toast(`开出了「${name}」（${TIER_LABEL[r.tier]}）！去「布置房间」摆上吧`, true, r.tier);
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async doCraft(tier: FurnitureTier): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      const r = await window.qbot.progress.craft(tier);
      if (!r.ok) {
        this.toast(r.error, false);
        return;
      }
      const gained = DECOR_BY_ID.get(r.stickerId)?.name ?? r.stickerId;
      // 烧掉了哪几件要报清楚：主进程按「优先烧大堆」自己挑的，用户没得选
      const burned = Object.entries(r.consumed)
        .map(([id, n]) => `${DECOR_BY_ID.get(id)?.name ?? id}×${n}`)
        .join('、');
      this.progress = r.progress;
      this.toast(`合成成功：${burned} → 「${gained}」（${TIER_LABEL[r.tier]}）`, true, r.tier);
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private toast(text: string, good: boolean, tier?: FurnitureTier): void {
    this.toastEl.textContent = text;
    this.toastEl.className = `inv-toast show ${good ? 'good' : 'bad'}`;
    this.toastEl.style.setProperty('--tier', tier ? TIER_COLOR[tier] : '#c96');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.className = 'inv-toast';
    }, TOAST_MS);
  }
}
