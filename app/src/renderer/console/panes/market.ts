/**
 * 装扮市场 pane（自 renderer/market/main.ts 迁入，阶段 3）。
 *
 * 改造点：
 * - DOM 查询全部以 root 为作用域，不再依赖模块顶层（懒挂载安全）
 * - 通用 id 加 market- 前缀防撞（#status→#market-status、#grid→#market-grid）
 * - 裸 button 换控制台 .btn 语义类（三套页面合并后必须统一按钮语言）
 * 旧窗 renderer/market/ 在阶段 8 前保持原样，两套并存可回退。
 */
import type { MarketSkin } from '../../../shared/ipc-types';
import { icon } from '../icons';
import { confirmBox } from './_studio-shared';

/** 上传昵称：改动即生效（沿用旧实现） */

export async function mount(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div id="market-topbar">
      <h1>装扮市场</h1>
      <input id="market-nickname" placeholder="昵称" maxlength="24" title="上传署名（保存在本机）" />
      <select id="market-upload-select" title="选择要上传的角色"></select>
      <button id="market-upload-btn" class="btn">上传</button>
      <button id="market-refresh-btn" class="btn ghost">刷新</button>
      <button id="market-room-btn" class="btn ghost">公共房间</button>
    </div>
    <div id="market-status"></div>
    <div id="market-grid"></div>
  `;

  const grid = root.querySelector<HTMLElement>('#market-grid')!;
  const statusEl = root.querySelector<HTMLElement>('#market-status')!;
  const nickInput = root.querySelector<HTMLInputElement>('#market-nickname')!;
  const uploadSelect = root.querySelector<HTMLSelectElement>('#market-upload-select')!;
  const uploadBtn = root.querySelector<HTMLButtonElement>('#market-upload-btn')!;
  const refreshBtn = root.querySelector<HTMLButtonElement>('#market-refresh-btn')!;
  const roomBtn = root.querySelector<HTMLButtonElement>('#market-room-btn')!;

  let busy = false;

  function setStatus(text: string, isError = false): void {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', isError);
  }

  function errText(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    // ipcRenderer.invoke 的报错带 "Error invoking remote method ..." 前缀，剥掉留人话
    return msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  }

  function fmtSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  // ── 昵称（本地设置） ────────────────────────────────────────
  const settings = await window.qbot.settings.get();
  nickInput.value = settings.nickname ?? settings.marketNickname ?? '';
  nickInput.addEventListener('change', () => {
    const nickname = nickInput.value.trim();
    void window.qbot.settings.set({ nickname, marketNickname: nickname });
  });

  // ── 上传角色下拉（默认当前激活） ────────────────────────────
  async function refreshUploadOptions(): Promise<void> {
    const [all, active] = await Promise.all([
      window.qbot.characters.list(),
      window.qbot.characters.getActive(),
    ]);
    uploadSelect.replaceChildren();
    for (const c of all.filter((c) => c.manifest)) {
      const opt = document.createElement('option');
      opt.value = c.dirId;
      opt.textContent = c.manifest.name || c.dirId.slice(0, 8);
      if (c.dirId === active?.dirId) opt.selected = true;
      uploadSelect.appendChild(opt);
    }
    uploadBtn.disabled = uploadSelect.options.length === 0;
  }

  // ── 货架渲染 ────────────────────────────────────────────────
  function renderCard(skin: MarketSkin): HTMLElement {
    const card = document.createElement('div');
    card.className = 'card';

    if (skin.previewUrl) {
      const img = document.createElement('img');
      img.className = 'cover';
      img.src = skin.previewUrl;
      img.loading = 'lazy';
      card.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'cover';
      ph.innerHTML = icon('characters');
      card.appendChild(ph);
    }

    const body = document.createElement('div');
    body.className = 'body';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = skin.name;
    name.title = skin.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `by ${skin.uploader} · ${skin.actions} 动作 · ${fmtSize(skin.size)}`;
    const btns = document.createElement('div');
    btns.className = 'btns';

    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn';
    dlBtn.textContent = skin.installed ? '使用' : '下载·使用';
    dlBtn.addEventListener('click', () => void run(async () => {
      setStatus(skin.installed ? `切换到「${skin.name}」…` : `下载「${skin.name}」…`);
      await window.qbot.market.download(skin.hash);
      setStatus(`已换上「${skin.name}」`);
      await refreshShelf();
    }));
    btns.appendChild(dlBtn);

    if (skin.mine) {
      const rmBtn = document.createElement('button');
      rmBtn.className = 'btn danger';
      rmBtn.textContent = '下架';
      rmBtn.addEventListener('click', () => void run(async () => {
        if (!(await confirmBox(root, `把「${skin.name}」从市场下架？`))) return;
        await window.qbot.market.remove(skin.hash);
        setStatus(`已下架「${skin.name}」`);
        await refreshShelf();
      }));
      btns.appendChild(rmBtn);
    }

    body.append(name, meta, btns);
    card.appendChild(body);
    return card;
  }

  async function refreshShelf(): Promise<void> {
    const skins = await window.qbot.market.list();
    grid.replaceChildren();
    if (skins.length === 0) {
      const empty = document.createElement('div');
      empty.id = 'market-empty';
      empty.textContent = '货架空空的——上传第一只角色吧';
      grid.appendChild(empty);
      return;
    }
    for (const s of skins) grid.appendChild(renderCard(s));
  }

  /** 串行化操作：网络中不重入，报错进状态条 */
  async function run(fn: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    uploadBtn.disabled = true;
    try {
      await fn();
    } catch (err) {
      setStatus(errText(err), true);
    } finally {
      busy = false;
      uploadBtn.disabled = uploadSelect.options.length === 0;
    }
  }

  uploadBtn.addEventListener('click', () => void run(async () => {
    const dirId = uploadSelect.value;
    if (!dirId) return;
    const label = uploadSelect.selectedOptions[0]?.textContent ?? dirId;
    setStatus(`打包上传「${label}」…（约 10MB，稍等）`);
    await window.qbot.market.upload(dirId);
    setStatus(`「${label}」已上架 ✓`);
    await refreshShelf();
  }));

  refreshBtn.addEventListener('click', () => void run(refreshShelf));
  roomBtn.addEventListener('click', () => window.qbot.rooms.open());

  // ── 启动 ────────────────────────────────────────────────────
  await run(async () => {
    setStatus('加载货架…');
    await refreshUploadOptions();
    await refreshShelf();
    setStatus('');
  });
}
